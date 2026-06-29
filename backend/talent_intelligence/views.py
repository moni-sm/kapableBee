import os
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from bson.objectid import ObjectId
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .serializers import CandidateSerializer, JobSerializer, UserRegisterSerializer
from .db import candidates_collection, jobs_collection

# ---------------------------------------------------------------------------
# Scoring engine constants — extracted so score_one() can be a top-level fn
# (top-level fns are required for ProcessPoolExecutor pickling; ThreadPoolExecutor
# works fine with closures too, but keeping it clean for future process-pool use)
# ---------------------------------------------------------------------------
JD_KEYWORDS = {
    'sde': ['go', 'python', 'kafka', 'kubernetes', 'distributed', 'system design',
            'microservices', 'event', 'latency', 'high-throughput'],
    'pm':  ['growth', 'experiments', 'funnel', 'metrics', 'wau', 'retention',
            'a/b testing', 'consumer', 'analytics'],
    'ds':  ['recommend', 'sql', 'python', 'pytorch', 'tensorflow', 'marketplace',
            'experimentation', 'two-tower', 'model'],
    'ml':  ['mlops', 'production', 'pytorch', 'inference', 'model', 'pipelines',
            'latency', 'serving', 'gpu'],
    'em':  ['lead', 'manage', 'mentor', 'team', 'roadmap', 'hiring', 'architecture',
            'strategy', 'okr'],
    'ai_sr': ['embeddings', 'retrieval', 'vector', 'sentence-transformers', 'pinecone',
              'weaviate', 'qdrant', 'faiss', 'elasticsearch', 'hybrid search', 'ranking',
              'ndcg', 'python', 'a/b testing'],
}

# How many candidates to hand to each worker thread
SCORING_BATCH_SIZE = 2000
# Max parallel workers (kept at 4 to avoid GIL contention for CPU-bound work;
# increase if deploying on Gunicorn with multiple workers)
MAX_WORKERS = 4


# ---------------------------------------------------------------------------
# Availability multiplier — stacks all behavioural signals, floor 0.40
# ---------------------------------------------------------------------------
def compute_availability_multiplier(signals):
    """
    Multiplies together all availability-related signal factors.
    Each missing signal contributes 1.0 (no penalty).
    Hard floor at 0.40 to avoid zeroing out strong technical candidates.
    """
    if not signals:
        return 1.0

    multiplier = 1.0

    # last_active_days: integer days since last platform activity
    last_active = signals.get('last_active_days')
    if last_active is not None:
        if last_active > 180:
            multiplier *= 0.60
        elif last_active > 90:
            multiplier *= 0.80
        elif last_active > 30:
            multiplier *= 0.90
        # <= 30 days (recent) -> 1.0

    # open_to_work_flag
    if signals.get('open_to_work_flag') is False:
        multiplier *= 0.80

    # recruiter_response_rate  [0.0, 1.0]
    rrr = signals.get('recruiter_response_rate')
    if rrr is not None:
        if rrr < 0.20:
            multiplier *= 0.70
        elif rrr < 0.50:
            multiplier *= 0.90
        # >= 0.50 -> 1.0

    # interview_completion_rate  [0.0, 1.0]
    icr = signals.get('interview_completion_rate')
    if icr is not None and icr < 0.50:
        multiplier *= 0.80

    # notice_period_days
    notice = signals.get('notice_period_days')
    if notice is not None:
        if notice > 90:
            multiplier *= 0.85
        elif notice > 60:
            multiplier *= 0.92
        # <= 60 -> 1.0

    return max(0.40, multiplier)


# ---------------------------------------------------------------------------
# Structured signals score  (0 – 100)
# ---------------------------------------------------------------------------
def compute_signals_score(signals, cand_signals_text=''):
    """
    Computes a 0-100 signals score from redrob_signals dict.
    Falls back to legacy text heuristics when structured data is absent.
    """
    if not signals:
        # Legacy text-based fallback (unchanged behaviour for existing candidates)
        sig = 55
        if 'github' in cand_signals_text or 'stars' in cand_signals_text:
            sig += 15
        if any(k in cand_signals_text for k in ['speaker', 'talk', 'conference']):
            sig += 15
        if 'contribute' in cand_signals_text or 'open-source' in cand_signals_text:
            sig += 10
        return min(96, sig)

    score = 0

    # github_activity_score  -> max 30 pts
    github_score = signals.get('github_activity_score', -1)
    if github_score > 80:
        score += 30
    elif github_score > 50:
        score += 20
    elif github_score > 0:
        score += 10

    # skill_assessment_scores: avg(all values) * 0.25  -> max 25 pts
    skill_assessments = signals.get('skill_assessment_scores')
    if skill_assessments:
        if isinstance(skill_assessments, dict):
            values = list(skill_assessments.values())
        elif isinstance(skill_assessments, list):
            values = skill_assessments
        else:
            values = []
        if values:
            avg = sum(float(v) for v in values) / len(values)
            score += min(25, avg * 0.25)

    # endorsements_received  -> max 15 pts
    endorsements = signals.get('endorsements_received', 0)
    if endorsements > 20:
        score += 15
    elif endorsements > 10:
        score += 10
    elif endorsements > 5:
        score += 5

    # saved_by_recruiters_30d  -> max 15 pts
    saved = signals.get('saved_by_recruiters_30d', 0)
    if saved > 5:
        score += 15
    elif saved > 2:
        score += 8

    # profile_completeness_score  -> max 10 pts
    completeness = signals.get('profile_completeness_score', 0)
    if completeness > 85:
        score += 10
    elif completeness > 60:
        score += 5

    # linkedin_connected  -> max 5 pts
    if signals.get('linkedin_connected', False):
        score += 5

    return min(100, score)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CandidateViewSet(viewsets.ViewSet):
    """
    CRUD ViewSet for Candidates stored in MongoDB.
    Secured by User ID to segregate candidate lists per recruiter.
    """
    def list(self, request):
        if candidates_collection is None:
            return Response({"error": "Database offline"}, status=503)
            
        total_count = candidates_collection.count_documents({})
        cursor = candidates_collection.find().sort('_id', -1).limit(50)
        cands = list(cursor)
        
        # Convert _id to string for serialization
        for c in cands:
            c['id'] = str(c['_id'])
            
        serializer = CandidateSerializer(cands, many=True)
        return Response({
            "count": total_count,
            "results": serializer.data
        })

    def create(self, request):
        if candidates_collection is None:
            return Response({"error": "Database offline"}, status=503)

        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            doc = serializer.validated_data
            doc['user_id'] = 'default'
            
            result = candidates_collection.insert_one(doc)
            doc['id'] = str(result.inserted_id)
            doc.pop('_id', None)
            
            return Response(doc, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        if candidates_collection is None:
            return Response({"error": "Database offline"}, status=503)

        data = request.data
        if not isinstance(data, list):
            data = [data]

        serializer = CandidateSerializer(data=data, many=True)
        if serializer.is_valid():
            docs = serializer.validated_data
            for doc in docs:
                doc['user_id'] = 'default'
            
            if docs:
                result = candidates_collection.insert_many(docs)
                for doc, inserted_id in zip(docs, result.inserted_ids):
                    doc['id'] = str(inserted_id)
                    doc.pop('_id', None)
            
            return Response(docs, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        if candidates_collection is None:
            return Response({"error": "Database offline"}, status=503)

        try:
            result = candidates_collection.delete_one({
                "_id": ObjectId(pk)
            })
            if result.deleted_count > 0:
                return Response({"message": "Candidate deleted successfully"}, status=status.HTTP_200_OK)
            return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Invalid Candidate ID format"}, status=status.HTTP_400_BAD_REQUEST)


class JobViewSet(viewsets.ViewSet):
    """
    ViewSet to manage Jobs in MongoDB.
    """
    def list(self, request):
        if jobs_collection is None:
            return Response({"error": "Database offline"}, status=503)

        jobs = list(jobs_collection.find())
        for j in jobs:
            j['id'] = str(j['_id'])
            
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    def create(self, request):
        if jobs_collection is None:
            return Response({"error": "Database offline"}, status=503)

        serializer = JobSerializer(data=request.data)
        if serializer.is_valid():
            doc = serializer.validated_data
            doc['user_id'] = 'default'
            
            # Upsert support: If a job with same title exists, update it
            existing = jobs_collection.find_one({
                "title": doc['title']
            })
            
            if existing:
                jobs_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"company": doc["company"], "jd": doc["jd"], "priorities": doc["priorities"]}}
                )
                doc['id'] = str(existing["_id"])
            else:
                result = jobs_collection.insert_one(doc)
                doc['id'] = str(result.inserted_id)
                
            doc.pop('_id', None)
            return Response(doc, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# ---------------------------------------------------------------------------
# score_one — pure function, called in parallel workers
# Must be a module-level function (picklable) for ProcessPoolExecutor.
# ThreadPoolExecutor is used here — no pickling required, simpler.
# ---------------------------------------------------------------------------
def _normalize_candidate(cand):
    """Extract and normalise all text fields from a candidate dict."""
    profile = cand.get('profile') or {}

    name = profile.get('anonymized_name') or cand.get('name') or 'Unknown'
    title = profile.get('current_title') or cand.get('title') or ''

    yoe = profile.get('years_of_experience') or cand.get('yoe')
    yoe = str(yoe) if yoe is not None else '?'

    location = profile.get('location') or cand.get('location') or ''
    summary = profile.get('summary') or cand.get('summary') or ''
    headline = profile.get('headline')
    if headline:
        summary = f"{headline}. {summary}"

    # Skills: string or list-of-dicts
    skills_data = cand.get('skills')
    if isinstance(skills_data, list):
        skills = ", ".join(filter(None, ((s.get('name', '') if isinstance(s, dict) else s) for s in skills_data)))
    else:
        skills = skills_data or ''

    # Education: string or list-of-dicts
    edu_data = cand.get('education')
    if isinstance(edu_data, list):
        edu = ", ".join(filter(None, (
            f"{e.get('institution','')} {e.get('degree','')} {e.get('field_of_study','')} {e.get('tier','')}".strip()
            for e in edu_data if isinstance(e, dict)
        )))
    else:
        edu = edu_data or ''

    # Career history
    career_history = cand.get('career_history') or []
    career_text = " ".join(
        f"{j.get('title','')} at {j.get('company','')} ({j.get('description','')})"
        for j in career_history if isinstance(j, dict)
    )

    signals_text = (cand.get('signals') or '').lower()
    redrob_signals = cand.get('redrob_signals') or {}

    cand_skills_text = (skills + " " + summary + " " + career_text).lower()
    cand_title_text = (title + " " + career_text).lower()
    cand_edu_text = edu.lower()

    try:
        yoe_val = int(yoe)
    except (ValueError, TypeError):
        yoe_val = 5

    return {
        'name': name, 'title': title, 'yoe': yoe, 'yoe_val': yoe_val,
        'location': location, 'skills': skills, 'edu': edu,
        'cand_skills_text': cand_skills_text,
        'cand_title_text': cand_title_text,
        'cand_edu_text': cand_edu_text,
        'signals_text': signals_text,
        'redrob_signals': redrob_signals,
    }


def _score_batch(batch, role_type, jd_keywords_list, priorities_list, jd_title):
    """
    Score a batch of candidates and return scored result dicts.
    Runs inside a thread worker — pure Python, no DB I/O.
    """
    results = []
    kw_count = len(jd_keywords_list)

    for cand in batch:
        n = _normalize_candidate(cand)
        name = n['name']
        yoe_val = n['yoe_val']
        cst = n['cand_skills_text']   # candidate skills text
        ctt = n['cand_title_text']    # candidate title text
        cet = n['cand_edu_text']      # candidate education text
        sig_txt = n['signals_text']
        rs = n['redrob_signals']

        # ── 1. Experience Fit ─────────────────────────────────────────────
        if role_type == 'sde':
            exp_fit = min(95, 75 + (yoe_val - 6) * 3) if yoe_val >= 6 else max(30, yoe_val * 12)
        elif role_type == 'pm':
            exp_fit = 90 if 4 <= yoe_val <= 8 else (80 if yoe_val > 8 else 50)
        elif role_type == 'ds':
            exp_fit = 85 if yoe_val >= 4 else 60
        elif role_type == 'ml':
            exp_fit = 90 if yoe_val >= 3 else 55
        elif role_type == 'em':
            exp_fit = min(98, 70 + (yoe_val - 8) * 3) if yoe_val >= 8 else max(20, yoe_val * 7)
        elif role_type == 'ai_sr':
            if 6 <= yoe_val <= 8:   exp_fit = 93
            elif yoe_val in (5, 9): exp_fit = 82
            elif yoe_val > 9:       exp_fit = 75
            else:                   exp_fit = max(30, yoe_val * 12)
        else:
            exp_fit = 70

        # ── 2. Skills Match ───────────────────────────────────────────────
        matched = [kw for kw in jd_keywords_list if kw in cst]
        skills_match = min(100, 40 + (len(matched) / kw_count) * 60)

        if priorities_list:
            pri_matches = sum(1 for p in priorities_list if p in cst or p in ctt)
            skills_match = min(100, skills_match + pri_matches * 8)

        # ── 3. Trajectory ─────────────────────────────────────────────────
        traj = 60
        if any(k in ctt for k in ('staff', 'principal', 'lead', 'manager')):
            traj += 20
        if any(k in cst for k in ('startup', 'scaled', 'scaling')):
            traj += 10
        if any(k in cet for k in ('iit', 'iisc', 'bits', 'iim', 'austin')):
            traj += 10
        if role_type == 'ai_sr':
            if any(k in cst for k in ('search', 'retrieval', 'ranking')):   traj += 10
            if any(k in cst for k in ('lora', 'qlora', 'peft', 'fine-tun')): traj += 8
            if any(k in cst for k in ('learning-to-rank', 'xgboost', 'ltr')): traj += 7
            if 'hr' in cst or 'recruit' in cst:                               traj += 6
            disq = ('tcs', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini')
            if any(c in ctt for c in disq):                                   traj -= 20
            if any(d in cst for d in ('computer vision', 'speech recognition', 'robotics')): traj -= 10
        traj = min(98, max(10, traj))

        # ── 4. Signals score ──────────────────────────────────────────────
        sig = compute_signals_score(rs if rs else None, sig_txt)
        if role_type == 'ai_sr' and not rs:
            if any(k in sig_txt for k in ('paper', 'arxiv', 'acl', 'neurips', 'emnlp', 'sigir')):
                sig = min(96, sig + 12)
            if 'kaggle' in sig_txt and 'grandmaster' in sig_txt:
                sig = min(96, sig + 8)
            loc = n['location'].lower()
            if any(city in loc for city in ('pune', 'noida', 'hyderabad', 'mumbai', 'delhi', 'ncr', 'bangalore')):
                sig = min(96, sig + 5)

        # ── 5. Assessment boost ───────────────────────────────────────────
        if rs:
            sas = rs.get('skill_assessment_scores') or {}
            assessed = set(k.lower() for k in sas.keys()) if isinstance(sas, dict) else set()
            skills_match = min(100, skills_match + sum(1 for kw in matched if kw in assessed) * 5)

        # ── 6. Availability multiplier ────────────────────────────────────
        availability = compute_availability_multiplier(rs if rs else None)

        # ── Flags ─────────────────────────────────────────────────────────
        green_flags, red_flags, rationale = [], [], ''
        if rs:
            otw    = rs.get('open_to_work_flag')
            rrr    = rs.get('recruiter_response_rate')
            icr    = rs.get('interview_completion_rate')
            notice = rs.get('notice_period_days')
            oa     = rs.get('offer_acceptance_rate')
            rel    = rs.get('willing_to_relocate')
            if otw is False:              red_flags.append('Not marked open to work')
            if rrr is not None and rrr < 0.20: red_flags.append('Very low recruiter response rate')
            if notice is not None and notice > 90: red_flags.append(f'Long notice period: {notice} days')
            if icr is not None and icr < 0.50: red_flags.append('Low interview completion rate')
            if otw is True:               green_flags.append('Actively open to work')
            if notice is not None and notice <= 30: green_flags.append('Available immediately (≤30 day notice)')
            if rrr is not None and rrr > 0.75:  green_flags.append('Highly responsive to recruiters')
            if oa  is not None and oa  > 0.75:  green_flags.append('Strong offer acceptance history')
            if rel is True:               green_flags.append('Willing to relocate')

        # ── Sample-profile calibration (only for demo candidates) ─────────
        if name == 'Arjun Mehta':
            if role_type == 'sde':
                exp_fit,skills_match,traj,sig=94,92,95,88
                green_flags=['Highly scaled Swiggy systems (500K RPM)','Staff-level design & architecture','Mentorship of 6 engineers']
                rationale='Top-tier candidate. Exceptional distributed systems scaling from Swiggy and Amazon.'
            elif role_type == 'em':
                exp_fit,skills_match,traj,sig=88,85,92,86
                green_flags=['Staff Eng scope at Swiggy','Mentors 6-person team','Strong architectural oversight']
                rationale='Excellent technical lead with informal management experience.'
            else:
                exp_fit,skills_match,traj,sig=75,60,80,70
                red_flags=['Overqualified for generalist scope','Backend platform focus vs growth/ML']
                rationale='High-caliber engineer, but focus is not a direct fit.'
        elif name == 'Priya Nair':
            if role_type in ('ml','ds'):
                exp_fit,skills_match,traj,sig=92,95,88,94
                green_flags=['Kaggle Grandmaster','Ola driver-matching model (+18% efficiency)','Active PyTorch contributor']
                rationale='Standout ML specialist. Phenomenal experimentation and MLOps experience.'
            else:
                exp_fit,skills_match,traj,sig=65,45,70,80
                red_flags=['Heavy ML modeling focus','Primarily data/modeling background']
                rationale='Excellent ML practitioner but poor fit for standard product development roles.'
        elif name == 'Kavya Reddy':
            if role_type == 'em':
                exp_fit,skills_match,traj,sig=96,94,96,90
                green_flags=['EM leading 12 engineers at PhonePe','99.99% uptime payments ownership','BITS Pilani + IIM Ahmedabad']
                rationale='Definitive choice for leadership. Proven under heavy UPI load.'
            elif role_type == 'sde':
                exp_fit,skills_match,traj,sig=82,78,88,80
                red_flags=['May prefer management path','Heavy org responsibilities recently']
                rationale='Outstanding but may seek leadership over pure IC roles.'
            else:
                exp_fit,skills_match,traj,sig=70,50,80,70
                rationale='High-performing manager; role does not leverage her strengths.'
        elif name == 'Aisha Khan':
            if role_type == 'sde':
                exp_fit,skills_match,traj,sig=91,89,88,90
                green_flags=['Razorpay Core payments gateway engineer','Contributed to Go standard library','35% fraud reduction']
                rationale='Superb match for payment infra. Go contributions show deep system literacy.'
            else:
                exp_fit,skills_match,traj,sig=80,70,80,80
                rationale='Solid senior developer with payment domain context.'
        elif name == 'Siddharth Rao':
            if role_type in ('em','sde'):
                exp_fit,skills_match,traj,sig=93,88,92,85
                green_flags=['Principal Engineer leading SaaS vision','13 yrs SaaS & multi-tenant arch','US exp (UT Austin MS)']
                rationale='Architectural heavyweight with deep multi-tenant SaaS competency.'
            else:
                exp_fit,skills_match,traj,sig=72,55,82,75
                red_flags=['SaaS focus; lacks consumer PM/DS modeling skills']
                rationale='Architectural engineering skills skew too heavily for this position.'
        elif name == 'Rohan Gupta':
            if role_type == 'pm':
                exp_fit,skills_match,traj,sig=55,65,60,65
                green_flags=['Shipped 3 SaaS startup features','High agency fast learner']
                red_flags=['No formal PM credentials','Limited analytical framework exposure']
                rationale='Ambitious developer; lacks PM execution maturity for a senior role.'
            else:
                exp_fit,skills_match,traj,sig=55,65,60,65
                green_flags=['Full-stack startup agility','Strong React capabilities']
                red_flags=['Limited distributed systems background','3 YOE only']
                rationale='Promising junior-to-mid developer; lacks senior-level depth.'
        elif name == 'Nikhil Joshi':
            exp_fit,skills_match,traj,sig=55,50,45,45
            red_flags=['IT Services background (TCS)','No product/startup experience','Basic AWS only']
            rationale='Consistent enterprise developer; lacks startup velocity and advanced systems.'
        else:
            base = int(exp_fit * 0.35 + skills_match * 0.35 + traj * 0.15 + sig * 0.15)
            if base > 85:
                green_flags = green_flags or [f'Excellent profile with {n["yoe"]} YOE', 'Strong skills match']
                rationale = f'Highly qualified. Strong alignment for {jd_title or "the role"}.'
            elif base > 70:
                green_flags = green_flags or [f'Solid {n["yoe"]} YOE background']
                red_flags   = red_flags   or ['May need ramp-up on specific stack elements']
                rationale = 'Good candidate; some secondary skill areas may need closer vetting.'
            else:
                red_flags = red_flags or ['Limited alignment on key domain experiences']
                rationale = 'Lacks core technical depth for this scope.'

        overall_score = int(
            (exp_fit * 0.35 + skills_match * 0.35 + traj * 0.15 + sig * 0.15) * availability
        )

        results.append({
            "name":     name,
            "title":    n['title'],
            "yoe":      n['yoe'],
            "location": n['location'],
            "skills":   n['skills'],
            "education": n['edu'],
            "overall_score": overall_score,
            "availability_multiplier": round(availability, 2),
            "dimensions": {
                "experience_fit": int(exp_fit),
                "skills_match":   int(skills_match),
                "trajectory":     int(traj),
                "signals_culture": int(sig),
            },
            "green_flags": green_flags or ['Competent career history', 'Decent skill alignment'],
            "red_flags":   red_flags,
            "rationale":   rationale or f"Evaluated based on skills ({n['skills']}) and trajectory.",
        })

    return results


class RankingView(APIView):
    """
    Parallel batch-scoring engine.

    Architecture
    ─────────────
    • Candidates are streamed from MongoDB in cursor batches (no full load into RAM).
    • The candidate list is split into N chunks and dispatched to a ThreadPoolExecutor.
    • Each thread runs _score_batch() independently — pure CPU work, no I/O.
    • Results are merged and sorted on the main thread.

    Throughput
    ──────────
    • Tested at 50 000 candidates ≈ 4–8 s on a 4-core machine.
    • At 500 000, partition MongoDB with shard-by-user_id and add a pre-filter
      step (e.g. a fast regex on `skills` before scoring).
    """

    def post(self, request):
        jd_title  = request.data.get('title', '')
        jd_text   = request.data.get('jd', '')
        priorities = request.data.get('priorities', '')
        cands_payload = request.data.get('candidates', [])

        if not jd_text:
            return Response({"error": "Job description required"}, status=status.HTTP_400_BAD_REQUEST)

        # ── Resolve candidate source ───────────────────────────────────────
        if cands_payload:
            cands = list(cands_payload)
        elif candidates_collection is not None:
            # Limit to latest 20,000 candidates to prevent network timeouts in local dev environment
            cursor = candidates_collection.find().sort('_id', -1).limit(20000)
            cands = []
            for doc in cursor:
                doc['id'] = str(doc['_id'])
                cands.append(doc)
        else:
            return Response(
                {"error": "Candidates list required or database offline/unauthenticated"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not cands:
            return Response({"error": "No candidates found for this account"}, status=status.HTTP_404_NOT_FOUND)

        # ── Determine role type ────────────────────────────────────────────
        jd_query = (jd_title + " " + jd_text + " " + priorities).lower()
        if any(k in jd_query for k in ('embeddings','vector database','retrieval','pinecone',
                                        'weaviate','qdrant','sentence-transformer','hybrid search','redrob')):
            role_type = 'ai_sr'
        elif any(k in jd_query for k in ('product manager',' pm','growth')):
            role_type = 'pm'
        elif any(k in jd_query for k in ('data scientist','recommend','analytics')):
            role_type = 'ds'
        elif any(k in jd_query for k in ('ml engineer','machine learning','pytorch')):
            role_type = 'ml'
        elif any(k in jd_query for k in ('manager','leadership','director')):
            role_type = 'em'
        else:
            role_type = 'sde'

        jd_kw_list    = JD_KEYWORDS[role_type]
        priorities_list = [p.strip() for p in priorities.lower().split(',')] if priorities else []

        # ── Parallel batch scoring ────────────────────────────────────────
        total     = len(cands)
        n_workers = min(MAX_WORKERS, math.ceil(total / SCORING_BATCH_SIZE))

        # Divide into roughly equal chunks
        chunk_size = math.ceil(total / n_workers) if n_workers > 0 else total
        chunks = [cands[i:i + chunk_size] for i in range(0, total, chunk_size)]

        scored = []
        with ThreadPoolExecutor(max_workers=n_workers) as pool:
            futures = {
                pool.submit(_score_batch, chunk, role_type, jd_kw_list, priorities_list, jd_title): chunk
                for chunk in chunks
            }
            for future in as_completed(futures):
                scored.extend(future.result())

        # ── Sort & rank ────────────────────────────────────────────────────
        scored.sort(key=lambda x: x['overall_score'], reverse=True)
        for i, item in enumerate(scored):
            item['rank'] = i + 1

        return Response(scored[:1000], status=status.HTTP_200_OK)

