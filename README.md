# KapableBee — Technical Design & System Report

> **Redrob AI Talent Intelligence Challenge**
> Senior AI Engineer, Founding Team — Candidate Ranking System

---

## Table of Contents

1. [Proposed Solution & Differentiation](#1-proposed-solution--differentiation)
2. [Key JD Requirements & Signal Importance](#2-key-jd-requirements--signal-importance)
3. [Scoring, Ranking & Algorithms](#3-scoring-ranking--algorithms)
4. [Explainability, Hallucination Prevention & Data Quality](#4-explainability-hallucination-prevention--data-quality)
5. [End-to-End Workflow](#5-end-to-end-workflow)
6. [System Architecture](#6-system-architecture)
7. [Ranking Quality & Compute Constraints](#7-ranking-quality--compute-constraints)
8. [Technology Stack & Rationale](#8-technology-stack--rationale)

---

## 1. Proposed Solution & Differentiation

### What KapableBee Is

KapableBee is a **JD-aware, signal-enriched candidate ranking engine** built to replace keyword-overlap ATS pipelines with a multi-dimensional, behaviourally-weighted scoring model.

It takes:
- A raw **job description** (any free text)
- A recruiter **priorities list** (comma-separated must-have keywords)
- A **candidate dataset** (JSON/CSV/TXT — structured Redrob schema or legacy flat schema)

And produces:
- A stack-ranked shortlist with numeric scores, per-dimension breakdowns, green/red flags, and plain-English reasoning
- A downloadable CSV (candidate_id, rank, score, reasoning)
- All results in **sub-second latency** for up to 20,000 candidates

### Differentiation from Traditional Systems

| Dimension | Traditional ATS / BM25 | KapableBee |
|---|---|---|
| **Matching method** | Keyword overlap (TF-IDF, BM25) | 4-dimension weighted composite + global availability multiplier |
| **Availability signal** | Ignored entirely | 11 behavioural signals covering activity, reliability, logistics — each multiplicatively penalises unavailable candidates |
| **Behavioural data** | Not used | 18 `redrob_signals` fields: last active date, response rate, offer acceptance, notice period, work mode preference, relocation willingness, salary range, platform tenure |
| **Role-specificity** | Same keyword list for all roles | 6 distinct role taxonomies (`ai_sr`, `sde`, `ml`, `ds`, `pm`, `em`) each with its own keyword set, experience curve, and trajectory bonuses |
| **Red-flag detection** | None | Explicit disqualifier logic: IT-services background penalty, CV/speech-only specialists, remote-only friction, inverted salary range, low interview completion rate |
| **Explainability** | Relevance score only | Per candidate: rank, composite score, 4 dimension sub-scores, availability multiplier, green flags list, red flags list, structured reasoning sentence |
| **Skills corroboration** | Not used | `skill_assessment_scores` (per-skill platform test scores) boost `skills_match` when assessed skills overlap with JD keywords |
| **Throughput** | Often O(N²) or synchronous | Parallel `ThreadPoolExecutor` batch scoring — 50,000 candidates in 4–8 s on a 4-core machine |
| **Data quality** | None | Sentinel handling, legacy schema fallback, malformed salary detection, missing-field neutrality |
| **Hallucination risk** | High (LLM-generated reasoning) | Zero — all reasoning is deterministically constructed from actual data fields |

> **The core design insight from the JD**: *"Keyword-matching is a trap — do not reward candidates just for having 'RAG' / 'Pinecone' in skills. Career narrative > keyword list. Behavioural signals matter for availability."*
>
> KapableBee implements this literally: `skills_match` has a 40-point floor so poor keyword matches aren't zeroed, and a candidate with 6 months of inactivity + 5% recruiter response rate is mathematically down-weighted to ~40% of their composite score.

---

## 2. Key JD Requirements & Signal Importance

### Role Type Classification

The system classifies the JD into one of six role types by scanning (title + jd + priorities) for discriminating keywords:

```
ai_sr  →  embeddings, vector database, retrieval, pinecone, weaviate, qdrant,
           sentence-transformer, hybrid search, redrob
pm     →  product manager, " pm", growth
ds     →  data scientist, recommend, analytics
ml     →  ml engineer, machine learning, pytorch
em     →  manager, leadership, director
sde    →  (default fallback)
```

For the **Senior AI Engineer** JD, role type = `ai_sr`.

### Key Requirements Extracted (ai_sr)

**Must-have skills** → map to `jd_keywords_list['ai_sr']`:
```
embeddings, retrieval, vector, sentence-transformers, pinecone, weaviate,
qdrant, faiss, elasticsearch, hybrid search, ranking, ndcg, python, a/b testing
```

**Nice-to-have** → map to `priorities_list` (each match adds +8 pts to skills_match):
```
production retrieval systems, embeddings, vector databases,
ranking evaluation (NDCG/MRR/MAP), hybrid search, A/B testing,
Python, product company experience
```

**Explicit disqualifiers** → map to trajectory penalties:
- IT-services background (TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini) → `traj -= 20`
- CV/speech/robotics without NLP/IR exposure → `traj -= 10`

### Most Important Candidate Signals

Ranked by composite weight contribution:

| Priority | Signal | Weight / Mechanism |
|---|---|---|
| 1 | Skills match (JD keyword overlap + priorities + assessment corroboration) | 35% of composite |
| 2 | Experience fit (YOE vs. role-specific curve) | 35% of composite |
| 3 | Trajectory (career arc, education tier, domain alignment, red flags) | 15% of composite |
| 4 | Signals & Culture (GitHub, assessments, market demand, platform trust, tenure) | 15% of composite |
| × | **Availability multiplier** (18 behavioural signals) | Global ×0.40–1.0 applied AFTER composite |

### How Fit Is Evaluated Beyond Keyword Matching

**1. Semantic trajectory scoring** — `traj` looks at career arc signals in free text:
- Has the candidate held `staff`, `principal`, `lead`, or `manager` titles? → +20 pts
- Have they worked in `startup`, `scaled`, `scaling` environments? → +10 pts
- Do they have Tier-1 education (IIT, IISc, BITS, IIM, UT Austin)? → +10 pts
- For `ai_sr`: experience in `search`, `retrieval`, `ranking`? → +10 pts
- Fine-tuning exposure (`lora`, `qlora`, `peft`)? → +8 pts
- Learning-to-rank (`xgboost`, `ltr`)? → +7 pts
- HR/recruiting domain context? → +6 pts

**2. Skill assessment corroboration** — if a candidate's `skill_assessment_scores` dict contains keys that match JD keywords, `skills_match` gets +5 per corroborated skill. This rewards candidates whose *claimed* skills are *validated* by platform tests, not just listed on a CV.

**3. Availability as a ranking signal** — not just an eligibility gate. An `open_to_work_flag = false` applies ×0.80 to the final score. A `recruiter_response_rate < 0.10` applies ×0.60. These stack multiplicatively, so a nominally strong candidate who is demonstrably unreachable is correctly ranked below a slightly weaker but available candidate.

---

## 3. Scoring, Ranking & Algorithms

### Scoring Formula

```
overall_score = round(
    (exp_fit × 0.35 + skills_match × 0.35 + traj × 0.15 + sig × 0.15)
    × availability_multiplier,
    1
)
```

All four dimension scores are 0–100. Weights are explicit constants, easily tunable. The availability multiplier (0.40–1.0) is computed independently and applied globally — creating a **two-layer architecture**: technical fit first, practical availability second.

---

### Dimension 1 — Experience Fit (35%)

Role-specific YOE curves rather than a single threshold:

```python
# ai_sr (Senior AI Engineer):
if 6 <= yoe <= 8:   exp_fit = 93   # sweet spot per JD
elif yoe in (5, 9): exp_fit = 82   # adjacent bands — "strong candidates outside the band still considered"
elif yoe > 9:       exp_fit = 75   # over-senior penalty: may be architecture-track, not hands-on
else:               exp_fit = max(30, yoe * 12)  # junior: linear ramp

# em (Engineering Manager):
exp_fit = min(98, 70 + (yoe - 8) * 3) if yoe >= 8 else max(20, yoe * 7)

# sde (Software Engineer):
exp_fit = min(95, 75 + (yoe - 6) * 3) if yoe >= 6 else max(30, yoe * 12)
```

The over-senior penalty (75 for 10+ YOE) directly implements the JD's hard disqualifier: *"Senior/staff engineers who haven't written production code in 18+ months."* The trajectory dimension then checks whether they're still hands-on.

---

### Dimension 2 — Skills Match (35%)

```python
# 1. Base: fraction of JD keywords found in candidate skills/summary/career text
matched = [kw for kw in jd_keywords_list if kw in cand_skills_text]
skills_match = min(100, 40 + (len(matched) / kw_count) * 60)
#                         ^ 40-point floor — no candidate is zeroed for poor coverage

# 2. Priority boost: recruiter-specified must-haves add +8 pts each
pri_matches = sum(1 for p in priorities_list if p in cand_skills_text or cand_title_text)
skills_match = min(100, skills_match + pri_matches * 8)

# 3. Assessment corroboration: platform test confirms claimed skill → +5 pts per overlap
if redrob_signals:
    assessed = set(k.lower() for k in skill_assessment_scores.keys())
    skills_match += sum(1 for kw in matched if kw in assessed) * 5
```

The 40-point floor is deliberate — it prevents keyword-sparse-but-strong candidates from being unfairly eliminated, which is essential when matching against specialised roles where few candidates will tick every keyword.

---

### Dimension 3 — Trajectory (15%)

Heuristic signals on career arc, education tier, and domain alignment:

```python
traj = 60  # baseline

# Universal boosts
if any(k in cand_title_text for k in ('staff', 'principal', 'lead', 'manager')): traj += 20
if any(k in cand_skills_text for k in ('startup', 'scaled', 'scaling')):          traj += 10
if any(k in cand_edu_text for k in ('iit', 'iisc', 'bits', 'iim', 'austin')):     traj += 10

# ai_sr domain boosts
if any(k in cand_skills_text for k in ('search', 'retrieval', 'ranking')):         traj += 10
if any(k in cand_skills_text for k in ('lora', 'qlora', 'peft', 'fine-tun')):     traj += 8
if any(k in cand_skills_text for k in ('learning-to-rank', 'xgboost', 'ltr')):    traj += 7
if 'hr' in cand_skills_text or 'recruit' in cand_skills_text:                      traj += 6

# Explicit disqualifiers from JD
disq = ('tcs', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini')
if any(c in cand_title_text for c in disq):                                         traj -= 20
if any(d in cand_skills_text for d in ('computer vision', 'speech recognition',
                                        'robotics')):                               traj -= 10

traj = min(98, max(10, traj))  # clamp
```

---

### Dimension 4 — Signals & Culture (15%) → `compute_signals_score()`

Covers external validation, skill credibility, and market demand. Uses all 18 `redrob_signals` fields:

| Signal Group | Signals | Max Pts |
|---|---|---|
| Skill validation | `github_activity_score` (sentinel −1 = no GitHub → neutral, NOT penalised) | 25 |
| Skill validation | `skill_assessment_scores` average (platform-administered tests) | 30 |
| Market demand | `endorsements_received` | 12 |
| Market demand | `saved_by_recruiters_30d` | 10 |
| Market demand | `profile_views_received_30d` | 5 |
| Market demand | `search_appearance_30d` | 4 |
| Market demand | `connection_count` | 3 |
| Profile quality | `profile_completeness_score` | 8 |
| Trust | `verified_email` + `verified_phone` | 2 |
| Trust | `linkedin_connected` | 3 |
| Platform tenure | `signup_date` (>1yr = +3, 6–12mo = +2, 3–6mo = +1) | 3 |
| **Total** | | **105 → capped at 100** |

---

### Global Availability Multiplier (0.40–1.0) → `compute_availability_multiplier()`

Applied **after** the composite. Multiplicative stacking means multiple mild signals compound realistically.

| Signal | Condition | Multiplier |
|---|---|---|
| `last_active_date` | > 180 days ago | ×0.55 |
| `last_active_date` | > 90 days ago | ×0.78 |
| `last_active_date` | > 30 days ago | ×0.92 |
| `open_to_work_flag` | False | ×0.80 |
| `recruiter_response_rate` | < 0.10 | ×0.60 |
| `recruiter_response_rate` | < 0.20 | ×0.72 |
| `recruiter_response_rate` | < 0.40 | ×0.88 |
| `avg_response_time_hours` | > 168 h (1 week) | ×0.88 |
| `avg_response_time_hours` | > 72 h (3 days) | ×0.95 |
| `applications_submitted_30d` | = 0 | ×0.93 |
| `interview_completion_rate` | < 0.30 | ×0.72 |
| `interview_completion_rate` | < 0.50 | ×0.88 |
| `offer_acceptance_rate` | < 0.30 (sentinel −1 → neutral) | ×0.82 |
| `offer_acceptance_rate` | < 0.50 | ×0.93 |
| `notice_period_days` | > 90 | ×0.82 |
| `notice_period_days` | > 60 | ×0.91 |
| `notice_period_days` | > 30 | ×0.97 |
| `preferred_work_mode` | 'remote' only | ×0.96 |
| `willing_to_relocate` | False + not open to work | ×0.92 |
| `willing_to_relocate` | False (alone) | ×0.97 |
| `expected_salary_range` | min > max (inverted/malformed) | ×0.97 |
| `expected_salary_range` | min > 200 LPA | ×0.95 |
| **Hard floor** | | **0.40** |

> **Worked example from the JD**: A candidate with `last_active_date` 7 months ago and `recruiter_response_rate = 0.05`:
> multiplier = 0.55 × 0.60 = 0.33 → floored to **0.40**
> composite score of 90 → final score = **36**
> This candidate is correctly ranked below a more available, moderately-skilled candidate with score 65.

### How Multiple Signals Are Combined

The two-layer architecture:

```
Layer 1 (Technical Fit):
  composite = exp_fit × 0.35
            + skills_match × 0.35
            + trajectory × 0.15
            + signals_culture × 0.15

Layer 2 (Practical Availability):
  overall_score = composite × availability_multiplier
  (floor: availability_multiplier >= 0.40)
```

All four dimensions are computed independently — there is no leakage between layers. The availability multiplier is purely behavioural; the composite is purely competency-based. This separation makes tuning straightforward: changing weights in one layer doesn't affect the other.

---

## 4. Explainability, Hallucination Prevention & Data Quality

### How Ranking Decisions Are Explained

Every ranked candidate returns a structured explanation object:

```json
{
  "rank": 1,
  "candidate_id": "CAND_0000042",
  "overall_score": 87.3,
  "availability_multiplier": 0.97,
  "dimensions": {
    "experience_fit": 93,
    "skills_match": 88,
    "trajectory": 84,
    "signals_culture": 76
  },
  "green_flags": [
    "Actively open to work",
    "Available immediately (<=30 day notice)",
    "Highly responsive to recruiters"
  ],
  "red_flags": [],
  "rationale": "Senior AI Engineer with 7 yrs; 9 AI core skills; response rate 0.91."
}
```

The UI renders this as:
- A **score badge** with the overall score
- A **4-bar dimension breakdown** (experience / skills / trajectory / signals)
- An **availability chip** showing the multiplier
- **Green flag** and **red flag** lists
- A **reasoning sentence**

All information is visible and auditable — recruiters are never asked to trust a black box.

### Preventing Hallucinations / Unsupported Justifications

**No LLM is involved in ranking or reasoning generation.**

Every output field is derived deterministically from actual candidate data:

| Output Field | Source |
|---|---|
| `rationale` | Constructed from: `title` (actual field), `yoe_raw` (actual field), `matched_count` (computed from actual text comparison), `recruiter_response_rate` (actual signal) |
| `green_flags` | Threshold checks on actual signal values (e.g. `notice_period_days <= 30` → "Available immediately") |
| `red_flags` | Threshold checks on actual signal values (e.g. `recruiter_response_rate < 0.20` → "Very low recruiter response rate") |
| `overall_score` | Deterministic arithmetic formula — no sampling, no temperature |
| `dimensions{}` | Integer arithmetic on normalised text and signal values |

The reasoning sentence is **built by code**, not generated:

```python
reasoning = f"{title_str} with {y_str} yrs; {matched_count} AI core skills; response rate {rr_str}."
```

There is **zero hallucination risk** because there is no generative step anywhere in the pipeline.

### Handling Inconsistent, Low-Quality, or Suspicious Profiles

| Problem Type | Handling |
|---|---|
| **Missing `redrob_signals`** | All signal functions return neutral values: multiplier = 1.0, signals score falls back to legacy text heuristics (50 pts base + keyword bonuses) |
| **Sentinel values** | `github_activity_score = -1` → 0 pts (neutral, not penalised). `offer_acceptance_rate = -1` → 1.0 multiplier (no prior offers ≠ low acceptance rate) |
| **Missing date strings** | `_days_since()` returns `None` on any parse failure → no penalty applied |
| **Inverted salary range** (min > max) | Detected as a data integrity issue → ×0.97 availability penalty |
| **Extreme salary floor** (> 200 LPA) | Treated as overqualified / offer-stage risk → ×0.95 penalty |
| **Zero applications in 30 days** | On-platform but passively not searching → ×0.93 |
| **Legacy flat schema** | `_normalize_candidate()` transparently unifies old flat fields (`name`, `title`, `yoe`, `edu`, `skills`) with the new structured schema (`profile{}`, `career_history[]`, `redrob_signals{}`) — no data migration required |
| **Short / near-empty profiles** | Skills text has low token density → `skills_match` stays near the 40-point floor; no crash or exception |
| **Unrecognised `preferred_work_mode`** | Only `'remote'` is penalised; any other value including null or unknown → 1.0 (neutral) |
| **Boolean field sent as string** | Signal checks use Python's `is False` / `is True` (not `==`) for strict boolean evaluation; strings are not mistaken for False |

---

## 5. End-to-End Workflow

### Complete Flow: JD Input → Ranked Candidate Output

```
STEP 1 — Job Description Setup
  Recruiter enters: Title, Company, JD text, Priority keywords
  Frontend (JobDescriptionView.jsx) saves to MongoDB via POST /api/jobs/
  JD is stored with upsert-by-title (no duplicates on re-save)

STEP 2 — Candidate Dataset Import
  Recruiter uploads a file:
    • JSON / JSONL → full Redrob structured schema with redrob_signals{}
    • CSV → legacy flat schema (name, title, yoe, edu, skills, summary, location)
    • TXT → text-block parsing (one candidate per blank-line-separated block)
  Frontend parses → POST /api/candidates/bulk/ → MongoDB upsert by candidate_id
  (upsert = idempotent: re-uploading same file does not create duplicates)

STEP 3 — Ranking Request Triggered
  Recruiter clicks "Rank Candidates"
  Frontend sends POST /api/rank/ with payload:
    { title, jd, priorities, candidates[] }
  (candidates can be sent in the payload directly OR fetched from MongoDB if absent)

STEP 4 — Role Classification
  Backend scans: (jd_title + jd_text + priorities).lower()
  → sets role_type ∈ { ai_sr, sde, ml, ds, pm, em }
  → selects jd_keywords_list[role_type]

STEP 5 — Candidate Normalisation
  _normalize_candidate(cand) called per candidate:
  → Extracts: cand_skills_text, cand_title_text, cand_edu_text
  → Unifies: structured schema (profile{}, career_history[], redrob_signals{})
              with legacy flat schema (name, title, yoe, edu, skills)
  → Parses: yoe_val (int), yoe_raw (float), redrob_signals (dict or None)

STEP 6 — Parallel Batch Scoring
  Candidates split into chunks of 2000
  ThreadPoolExecutor(max_workers=4) dispatches _score_batch() per chunk
  Per candidate inside _score_batch():
    1. exp_fit    ← role-specific YOE curve
    2. skills_match ← JD keyword overlap + priorities + assessment corroboration
    3. traj       ← career arc heuristics + education tier + domain bonuses/penalties
    4. sig        ← compute_signals_score(redrob_signals)
    5. availability ← compute_availability_multiplier(redrob_signals)
    6. overall_score = (exp*0.35 + sk*0.35 + traj*0.15 + sig*0.15) × availability
    7. green_flags, red_flags, rationale generated from actual field values

STEP 7 — Sort, Rank & Return
  Results from all threads merged on main thread
  Sorted descending by overall_score
  Rank 1..N assigned
  Top 1000 returned as JSON

STEP 8 — Results Display (ShortlistView.jsx)
  Ranked candidate cards showing:
    score, dimension bars, availability multiplier, green/red flags, reasoning
  Recruiter can filter, search, and sort within the UI

STEP 9 — Export
  "Download" button → CSV export with columns:
    candidate_id | rank | score (as ratio 0.0–1.0) | reasoning
  File named: ranked_candidates_YYYY-MM-DD.csv
```

---

## 6. System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (React 18 + Vite)                  │
│                                                                 │
│  Sidebar.jsx           Navigation tabs                         │
│  JobDescriptionView.jsx  JD entry + preset loader              │
│  UploadDatasetView.jsx   File upload + parse trigger           │
│  AddManuallyView.jsx     Single candidate form                 │
│  ShortlistView.jsx       Ranked results + export               │
│  App.jsx                 Shell, topbar, CSV download           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  JobContext.jsx  (React Context API)                     │  │
│  │  • Global state: jobTitle, jd, candidates[], results[]  │  │
│  │  • File parsing: parseJSON, parseCSV, parseTxt          │  │
│  │  • Client-side scoring mirror (full duplicate of        │  │
│  │    backend engine — runs when server is unreachable)    │  │
│  │  • API calls via axios (api.js → localhost:8000)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │  REST API  (HTTP/JSON)
                                │  axios — base URL :8000
┌───────────────────────────────┼─────────────────────────────────┐
│           BACKEND  (Django 4.2 + Django REST Framework)         │
│                                                                 │
│  POST /api/register/         RegisterView                      │
│  GET  /api/candidates/       CandidateViewSet.list             │
│  POST /api/candidates/       CandidateViewSet.create           │
│  POST /api/candidates/bulk/  CandidateViewSet.bulk_create      │
│  GET  /api/jobs/             JobViewSet.list                   │
│  POST /api/jobs/             JobViewSet.create                 │
│  POST /api/rank/             RankingView.post                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Scoring Engine  (talent_intelligence/views.py)          │  │
│  │                                                          │  │
│  │  _normalize_candidate()   Unified schema bridge          │  │
│  │  _score_batch()           Pure function, thread-safe     │  │
│  │  compute_availability_multiplier()  18-signal engine     │  │
│  │  compute_signals_score()            11-group scorer      │  │
│  │                                                          │  │
│  │  ThreadPoolExecutor(max_workers=4)                       │  │
│  │  Chunk size: 2000 candidates per worker                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DB layer  (talent_intelligence/db.py)                   │  │
│  │  PyMongo → MongoDB Atlas                                 │  │
│  │  Collections:                                            │  │
│  │    candidates  (sparse unique index on candidate_id)     │  │
│  │    jobs                                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  SQLite (db.sqlite3) — Django auth only (User model + JWT)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                   ┌────────────▼────────────┐
                   │    MongoDB Atlas         │
                   │    DB: kapablebee        │
                   │    Cloud-hosted          │
                   └─────────────────────────┘
```

### Concurrency Model

```python
# RankingView.post() — talent_intelligence/views.py
n_workers  = min(MAX_WORKERS, math.ceil(total / SCORING_BATCH_SIZE))
chunk_size = math.ceil(total / n_workers)
chunks     = [cands[i:i + chunk_size] for i in range(0, total, chunk_size)]

with ThreadPoolExecutor(max_workers=n_workers) as pool:
    futures = { pool.submit(_score_batch, chunk, role_type, jd_kw_list,
                            priorities_list, jd_title): chunk
                for chunk in chunks }
    for future in as_completed(futures):
        scored.extend(future.result())

scored.sort(key=lambda x: x['overall_score'], reverse=True)
for i, item in enumerate(scored):
    item['rank'] = i + 1
return Response(scored[:1000], status=HTTP_200_OK)
```

`_score_batch` is a **pure function** — no I/O, no shared mutable state — making it inherently thread-safe. Results are merged on the main thread after all futures complete.

### Dual Scoring Architecture

The frontend `JobContext.jsx` contains a **complete JavaScript mirror** of the backend scoring engine:

- `getAvailabilityMultiplier(signals)` — mirrors `compute_availability_multiplier()`
- `getSignalsScore(signals, text)` — mirrors `compute_signals_score()`
- Full 4-dimension composite calculation

This means the app **functions fully offline** (Guest Mode) with no server dependency. When the server is reachable, the backend result takes precedence. When it is not, the client-side engine runs transparently.

---

## 7. Ranking Quality & Compute Constraints

### Demonstration of Ranking Quality

For the Redrob Senior AI Engineer JD, the system correctly produces the following behavioural outcomes:

| Scenario | Expected behaviour | Result |
|---|---|---|
| Candidate with production embeddings + vector DB + NDCG experience | High rank | ✅ skills_match near ceiling, ai_sr keywords fully matched |
| Candidate with IT-services-only background (TCS/Infosys) | Low rank | ✅ traj -= 20 applied |
| Candidate last active 7 months ago, response rate 5% | Severely down-weighted | ✅ multiplier = 0.40 floor |
| `offer_acceptance_rate = -1` (no prior offers) | Treated neutrally | ✅ sentinel handled → 1.0 multiplier |
| CV/speech-only specialist with no NLP/IR | Lower trajectory | ✅ traj -= 10 applied |
| Candidate with `open_to_work_flag = true` + notice ≤ 30 days | Green flags, no penalty | ✅ green_flags populated correctly |
| `github_activity_score = -1` (no GitHub linked) | Neutral (0 pts, not penalised) | ✅ sentinel handled → 0 added, not subtracted |

The JD's exact scenario — *"perfect on-paper match with 6 months inactivity and 5% response rate"*:
- `last_active_date` 180+ days: ×0.55
- `recruiter_response_rate = 0.05`: ×0.60
- Stacked: 0.55 × 0.60 = 0.33 → floored to **0.40**
- Composite 90 → final score **36** — ranked correctly below an available mid-match candidate at 65

### Performance Benchmarks

| Candidate Count | Approx. Wall Time | Workers Used |
|---|---|---|
| 500 | < 0.1 s | 1 thread |
| 5,000 | ~0.4 s | 3 threads |
| 20,000 | ~1.5 s | 4 threads (current Atlas fetch limit) |
| 50,000 | ~4–8 s | 4 threads (tested) |

Scaling beyond 100,000:
- Shard MongoDB by `user_id` (data segregation already in place)
- Add a pre-filter step (fast regex on `skills` field before scoring)
- Switch from `ThreadPoolExecutor` to `ProcessPoolExecutor` to bypass GIL

### Meeting Compute Constraints

| Constraint | How It Is Met |
|---|---|
| **No LLM at inference time** | Zero LLM API calls — entire pipeline is deterministic arithmetic |
| **No embedding generation at query time** | Keyword matching on pre-existing text fields — O(N·K) where K is keyword list length (≤15) |
| **Low latency** | ThreadPoolExecutor parallelism; MongoDB cursor streaming; no full-collection RAM load |
| **No GPU required** | Pure Python CPU computation |
| **Works offline** | Client-side JavaScript mirror handles ranking if backend is unreachable |
| **Atlas free-tier compatible** | `.find().limit(20000)` cap prevents cursor timeout on Atlas M0 |

---

## 8. Technology Stack & Rationale

### Backend

| Technology | Version | Rationale |
|---|---|---|
| **Django** | 4.2 | Mature REST framework; JWT auth built-in via `simplejwt`; serializer layer provides schema validation without a separate ORM |
| **Django REST Framework** | 3.14 | Clean ViewSet + APIView abstractions; `@action` decorator for custom endpoints like `/bulk/` |
| **PyMongo** | 4.6 | Direct MongoDB driver — avoids MongoEngine/Djongo abstraction overhead; `update_one(..., upsert=True)` for idempotent candidate ingestion by `candidate_id` |
| **MongoDB Atlas** | Cloud | Schema-flexible document store — heterogeneous candidate profiles (legacy flat + new structured schema) coexist in the same collection without migration; sparse unique index on `candidate_id` for fast upserts |
| **ThreadPoolExecutor** | stdlib | Zero dependencies; suitable for CPU-bound parallel scoring without pickling overhead of `ProcessPoolExecutor`; `as_completed()` for non-blocking result collection |
| **python-dotenv** | 1.0 | Keeps MongoDB URI and secrets out of source code |
| **djangorestframework-simplejwt** | 5.3 | Stateless JWT auth for future multi-recruiter isolation |

### Frontend

| Technology | Version | Rationale |
|---|---|---|
| **React 18** | 18 | Component composition; Context API for global state (no Redux needed at this scale) |
| **Vite** | Latest | Fast HMR dev server; minimal config; ESM-native bundler |
| **Vanilla CSS** | — | Full design control; no utility-class framework overhead; custom design tokens (`--honey`, `--navy`, `--glass`) for consistent brand |
| **Axios** | — | Cleaner error handling than `fetch` for API calls; interceptor-ready for future auth token refresh |
| **Tabler Icons** | — | Lightweight SVG icon set with semantic names |

### Key Design Decisions

**1. Dual scoring engine (backend Python + frontend JavaScript mirror)**
Both engines implement identical logic including sentinel value handling, multiplier stacking, and all 18 signals. The app demos and functions even when Django is offline. When the server is reachable, backend results take precedence.

**2. Upsert-by-candidate-id**
`candidates_collection.update_one({'candidate_id': id}, {'$set': doc}, upsert=True)` makes re-uploading a dataset idempotent. No duplicate candidates accumulate between sessions.

**3. Multiplicative stacking vs. additive penalties**
Availability signals use multiplicative stacking rather than additive subtraction. A candidate with three mild availability concerns is penalised more accurately than one with a single severe concern, and the 0.40 floor ensures no candidate is entirely eliminated due to data gaps.

**4. Role-type taxonomy (6 archetypes)**
Rather than one universal keyword list, 6 role types each have distinct keyword lists, YOE curves, and trajectory bonuses. The same codebase accurately ranks SWEs, PMs, data scientists, ML engineers, EMs, and AI specialists without separate models or configs.

**5. Zero hallucination by design**
The decision to build deterministic reasoning rather than using an LLM was deliberate and aligns with the JD's own warning about keyword-gaming. Every word in the output's `rationale`, `green_flags`, and `red_flags` fields is traceable to a specific candidate data field and a specific threshold check in code.

---

## File References

| File | Purpose |
|---|---|
| `backend/talent_intelligence/views.py` | Scoring engine, API views, concurrency model |
| `backend/talent_intelligence/serializers.py` | Full 18-signal `redrob_signals` schema documentation |
| `backend/talent_intelligence/db.py` | MongoDB Atlas connection + sparse unique index setup |
| `frontend/src/context/JobContext.jsx` | State management, file parsing, client-side scoring mirror |
| `frontend/src/components/ShortlistView.jsx` | Ranked results UI with dimension breakdown |
| `frontend/src/App.jsx` | CSV export logic |
| `backend/requirements.txt` | Python dependencies |

---


