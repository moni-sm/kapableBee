import os, time, math, pymongo
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path("C:/Users/Lenovo/Projects/KapableBee/backend")
load_dotenv(BASE_DIR / '.env')

uri = os.getenv('MONGODB_URI')
client = pymongo.MongoClient(uri)
db = client[os.getenv('MONGODB_DB', 'kapablebee')]
candidates_collection = db['candidates']

def _normalize_candidate(cand):
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
    skills_data = cand.get('skills')
    if isinstance(skills_data, list):
        skills = ", ".join(filter(None, ((s.get('name', '') if isinstance(s, dict) else s) for s in skills_data)))
    else:
        skills = skills_data or ''
    edu_data = cand.get('education')
    if isinstance(edu_data, list):
        edu = ", ".join(filter(None, (
            f"{e.get('institution','')} {e.get('degree','')} {e.get('field_of_study','')} {e.get('tier','')}".strip()
            for e in edu_data if isinstance(e, dict)
        )))
    else:
        edu = edu_data or ''
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
    results = []
    kw_count = len(jd_keywords_list)
    for cand in batch:
        n = _normalize_candidate(cand)
        results.append({
            "name": n['name'],
            "overall_score": 80
        })
    return results

def test_rank():
    print("Connecting to:", uri)
    t0 = time.time()
    cursor = candidates_collection.find(batch_size=5000)
    cands = []
    for doc in cursor:
        doc['id'] = str(doc['_id'])
        cands.append(doc)
    t1 = time.time()
    print(f"Fetched {len(cands)} candidates in {t1 - t0:.2f} seconds")
    
    # run parallel scoring
    total = len(cands)
    n_workers = min(4, math.ceil(total / 2000))
    chunk_size = math.ceil(total / n_workers) if n_workers > 0 else total
    chunks = [cands[i:i + chunk_size] for i in range(0, total, chunk_size)]
    
    t2 = time.time()
    scored = []
    with ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = {
            pool.submit(_score_batch, chunk, 'sde', ['python'], [], 'title'): chunk
            for chunk in chunks
        }
        for future in as_completed(futures):
            scored.extend(future.result())
    t3 = time.time()
    print(f"Scored {len(scored)} candidates in {t3 - t2:.2f} seconds")

if __name__ == "__main__":
    test_rank()
