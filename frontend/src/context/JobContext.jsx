import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api';

const JobContext = createContext();

const PRESETS = {
  ai_sr: {
    title: 'Senior AI Engineer, Founding Team',
    company: 'Redrob AI',
    jd: `Redrob AI is hiring a Senior AI Engineer (founding team) to own our core retrieval and ranking intelligence layer — Pune/Noida, India (Hybrid).

Location: Pune/Noida hybrid preferred; open to Hyderabad, Mumbai, Delhi NCR. No visa sponsorship outside India.
Experience: 5–9 years — strong candidates outside the band still considered.

── WHAT YOU'LL OWN ──
- Own ranking/retrieval/matching systems (candidate↔JD matching)
- 90-day plan: audit current BM25+rules system → ship v2 ranking (embeddings, hybrid retrieval, LLM re-ranking) → build eval infra (offline benchmarks, A/B testing)
- Long-term: architecture ownership + mentoring as team scales 4→12 engineers

── MUST-HAVE SKILLS (non-negotiable) ──
- Production embeddings-based retrieval (sentence-transformers, OpenAI embeddings, BGE, E5, etc.) — must have handled embedding drift, index refresh, retrieval regressions
- Production vector DB / hybrid search experience (Pinecone, Weaviate, Qdrant, Milvus, OpenSearch, ES, FAISS)
- Strong Python — code quality matters
- Hands-on ranking evaluation experience (NDCG, MRR, MAP, offline↔online correlation, A/B interpretation)

── NICE-TO-HAVE (bonus, not blockers) ──
- LLM fine-tuning (LoRA/QLoRA/PEFT)
- Learning-to-rank models (XGBoost or neural)
- HR-tech/recruiting/marketplace background
- Distributed systems / large-scale inference optimization
- Open-source ML contributions

── HARD DISQUALIFIERS ──
- Pure research/academic background with no production deployment
- AI experience = only recent (<12mo) LangChain/OpenAI wrapper work, with no pre-LLM ML production history
- Senior/staff engineers who haven't written production code in 18+ months (pure architecture/tech-lead track)

── SOFT DISQUALIFIERS / RED FLAGS ──
- Title-chasers (job-hops every ~1.5 years for title bumps)
- "Framework enthusiasts" — LangChain-tutorial GitHub, no systems thinking
- Career entirely at consulting firms (TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini) unless prior product-company experience exists
- CV/speech/robotics specialists without NLP/IR exposure
- 5+ years entirely on closed-source proprietary work with zero external validation

── LOGISTICS ──
- Notice period: sub-30 days strongly preferred (can buy out up to 30); 30+ still considered but bar is higher
- Culture: async-first, heavy writing, fast/open disagreement, unstable/evolving codebase — not a fit for people needing stability

── IDEAL CANDIDATE ──
6–8 yrs total, 4–5 yrs applied ML/AI at product companies (not services). Shipped at least one end-to-end ranking/search/recsys to real users at scale. Strong, defensible opinions on retrieval, evaluation, and fine-tune-vs-prompt tradeoffs. Based in/willing to relocate to Noida or Pune. Active/reachable on the platform.

── SCORING NOTE ──
Keyword-matching is a trap — do not reward candidates just for having "RAG"/"Pinecone" in skills. Career narrative > keyword list. Behavioral signals matter for availability: a perfect on-paper match with 6 months of inactivity and 5% recruiter response rate should be down-weighted.`,
    priorities: 'production retrieval systems, embeddings, vector databases, ranking evaluation (NDCG/MRR/MAP), hybrid search, A/B testing, Python, product company experience'
  }
};



// ---------------------------------------------------------------------------
// Helper: days since an ISO date string
// ---------------------------------------------------------------------------
const daysSince = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr.slice(0, 10));
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  } catch { return null; }
};

// ---------------------------------------------------------------------------
// Availability multiplier  (floor 0.40)
// ---------------------------------------------------------------------------
// Applied as a GLOBAL multiplier on the final composite score — down-weights
// unavailable candidates regardless of their technical fit, per JD instruction.
//
// Groups: availability/activity, reliability/follow-through, logistics
// ---------------------------------------------------------------------------
const getAvailabilityMultiplier = (signals) => {
  if (!signals) return 1.0;
  let m = 1.0;

  // last_active_date (ISO string) — preferred; fall back to last_active_days int
  let lastActiveDays = signals.last_active_days ?? null;
  if (lastActiveDays === null) lastActiveDays = daysSince(signals.last_active_date);
  if (lastActiveDays !== null) {
    if (lastActiveDays > 180)      m *= 0.55;  // 6+ months dark
    else if (lastActiveDays > 90)  m *= 0.78;  // 3–6 months
    else if (lastActiveDays > 30)  m *= 0.92;  // 1–3 months
    // <= 30 → 1.0
  }

  // open_to_work_flag
  if (signals.open_to_work_flag === false) m *= 0.80;

  // recruiter_response_rate [0.0, 1.0]
  const rrr = signals.recruiter_response_rate;
  if (rrr != null) {
    if (rrr < 0.10)      m *= 0.60;
    else if (rrr < 0.20) m *= 0.72;
    else if (rrr < 0.40) m *= 0.88;
    // >= 0.40 → 1.0
  }

  // avg_response_time_hours
  const rth = signals.avg_response_time_hours;
  if (rth != null) {
    if (rth > 168)      m *= 0.88;  // > 1 week
    else if (rth > 72)  m *= 0.95;  // > 3 days
    // <= 72h → 1.0
  }

  // applications_submitted_30d — 0 = on platform but not actively searching
  if (signals.applications_submitted_30d === 0) m *= 0.93;

  // interview_completion_rate [0.0, 1.0]
  const icr = signals.interview_completion_rate;
  if (icr != null) {
    if (icr < 0.30)      m *= 0.72;
    else if (icr < 0.50) m *= 0.88;
    // >= 0.50 → 1.0
  }

  // offer_acceptance_rate [-1, 1.0]
  // SENTINEL: -1 = no prior offers → neutral, NOT penalised
  const oa = signals.offer_acceptance_rate;
  if (oa != null && oa !== -1) {
    if (oa < 0.30)      m *= 0.82;
    else if (oa < 0.50) m *= 0.93;
    // >= 0.50 → 1.0
  }

  // notice_period_days
  const notice = signals.notice_period_days;
  if (notice != null) {
    if (notice > 90)      m *= 0.82;
    else if (notice > 60) m *= 0.91;
    else if (notice > 30) m *= 0.97;
    // <= 30 (JD preference) → 1.0
  }

  // preferred_work_mode (onsite/hybrid/remote/flexible)
  // Remote-only preference adds friction for roles that typically require some presence.
  // 'flexible', 'hybrid', 'onsite', or missing → neutral (1.0)
  const workMode = (signals.preferred_work_mode || '').toLowerCase();
  if (workMode === 'remote') m *= 0.96;  // mild penalty — most senior eng roles are hybrid+

  // willing_to_relocate — compound penalty when not open to work AND won't relocate
  const relocate  = signals.willing_to_relocate;
  const otwFlag   = signals.open_to_work_flag;
  if (relocate === false && otwFlag === false) {
    m *= 0.92;   // doubly unavailable: not looking + geographically rigid
  } else if (relocate === false) {
    m *= 0.97;   // willing to work but won't relocate
  }
  // true or missing → 1.0

  // expected_salary_range_inr_lpa — malformed or extreme data signals offer-stage friction
  const sal    = signals.expected_salary_range_inr_lpa || {};
  const salMin = sal.min != null ? parseFloat(sal.min) : null;
  const salMax = sal.max != null ? parseFloat(sal.max) : null;
  if (salMin !== null && salMax !== null && !isNaN(salMin) && !isNaN(salMax)) {
    if (salMin > salMax)  m *= 0.97;  // inverted range = data integrity issue
    else if (salMin > 200) m *= 0.95; // >200 LPA floor = overqualified risk
  }

  return Math.max(0.40, m);
};

// ---------------------------------------------------------------------------
// Signals & Culture dimension score  (0–100)
// ---------------------------------------------------------------------------
// Fourth scoring dimension — covers external validation, skill credibility,
// and market demand.  Does NOT double-count availability signals (those go
// into the global multiplier above).
//
// Groups: skill validation, market demand, profile quality, trust/verification
// ---------------------------------------------------------------------------
const getSignalsScore = (signals, candSignalsText) => {
  if (!signals) {
    // Legacy text-based fallback for old flat-schema candidates
    let sig = 50;
    if (candSignalsText.includes('github') || candSignalsText.includes('stars')) sig += 15;
    if (['speaker', 'talk', 'conference'].some(k => candSignalsText.includes(k))) sig += 12;
    if (candSignalsText.includes('contribute') || candSignalsText.includes('open-source')) sig += 10;
    if (candSignalsText.includes('kaggle')) sig += 8;
    if (['paper', 'arxiv', 'acl', 'neurips', 'sigir'].some(k => candSignalsText.includes(k))) sig += 10;
    return Math.min(96, sig);
  }

  let score = 0;

  // ── Skill validation ────────────────────────────────────────────────────

  // github_activity_score → max 25 pts
  // SENTINEL: -1 = no GitHub linked → neutral (0 pts), not penalised
  const github = signals.github_activity_score ?? -1;
  if (github !== -1 && github !== null) {
    if (github > 80)      score += 25;
    else if (github > 60) score += 18;
    else if (github > 40) score += 12;
    else if (github > 15) score += 6;
    // <= 15 → 0 pts
  }

  // skill_assessment_scores → max 30 pts
  const sas = signals.skill_assessment_scores;
  if (sas && typeof sas === 'object') {
    const vals = Object.values(sas).map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (vals.length > 0) {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      score += Math.min(30, Math.round(avg * 0.30));
    }
  }

  // ── Market demand ────────────────────────────────────────────────────────

  // endorsements_received → max 12 pts
  const endorsements = signals.endorsements_received || 0;
  if (endorsements > 50)      score += 12;
  else if (endorsements > 25) score += 8;
  else if (endorsements > 10) score += 5;
  else if (endorsements > 3)  score += 2;

  // saved_by_recruiters_30d → max 10 pts
  const saved = signals.saved_by_recruiters_30d || 0;
  if (saved > 8)      score += 10;
  else if (saved > 4) score += 6;
  else if (saved > 1) score += 3;

  // profile_views_received_30d → max 5 pts
  const views = signals.profile_views_received_30d || 0;
  if (views > 40)      score += 5;
  else if (views > 15) score += 3;

  // search_appearance_30d → max 4 pts
  const appear = signals.search_appearance_30d || 0;
  if (appear > 300)      score += 4;
  else if (appear > 100) score += 2;

  // connection_count → max 3 pts
  const conns = signals.connection_count || 0;
  if (conns > 500)      score += 3;
  else if (conns > 200) score += 1;

  // ── Profile quality ──────────────────────────────────────────────────────

  // profile_completeness_score → max 8 pts
  const completeness = signals.profile_completeness_score || 0;
  if (completeness > 90)      score += 8;
  else if (completeness > 75) score += 5;
  else if (completeness > 55) score += 2;

  // ── Trust / verification (gate-useful, low individual signal) ────────────
  if (signals.verified_email)     score += 1;
  if (signals.verified_phone)     score += 1;
  if (signals.linkedin_connected) score += 3;  // stronger signal

  // ── Platform tenure via signup_date → max 3 pts ─────────────────────────
  // Longer on the platform = more invested, more data for scoring reliability.
  const signupDays = daysSince(signals.signup_date);
  if (signupDays !== null) {
    if (signupDays > 365)      score += 3;  // > 1 year: established member
    else if (signupDays > 180) score += 2;  // 6–12 months
    else if (signupDays > 90)  score += 1;  // 3–6 months
    // < 90 days (brand new) → 0 pts
  }

  return Math.min(100, score);
};

export const JobProvider = ({ children }) => {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [keyPriorities, setKeyPriorities] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'uploading' | 'completed' | 'failed'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [rankingState, setRankingState] = useState('idle'); // 'idle' | 'loading' | 'completed' | 'failed'
  const [rankingError, setRankingError] = useState('');
  const [activeTab, setActiveTab] = useState('jd');
  const [toastMessage, setToastMessage] = useState('');

  // Authentication states (Defaulted to true for direct MongoDB storage without recruiter authentication)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [username, setUsername] = useState('Admin');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2600);
  };

  // JWT Registration, Login, and Logout logic
  const register = async (usr, pwd, email) => {
    try {
      await API.post('register/', { username: usr, password: pwd, email });
      return true;
    } catch (e) {
      console.error('Registration failed:', e);
      return false;
    }
  };

  const login = async (usr, pwd) => {
    try {
      const res = await API.post('token/', { username: usr, password: pwd });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('username', usr);
      
      setUsername(usr);
      setIsAuthenticated(true);
      showToast(`Welcome back, ${usr}!`);
      return true;
    } catch (e) {
      console.error('Login failed:', e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    
    setUsername('');
    setIsAuthenticated(false);
    setCandidates([]);
    setTotalCandidatesCount(0);
    setResults([]);
    setFiles([]);
    showToast('Logged out successfully');
  };

  // Fetch candidates and jobs from Django backend
  const fetchCandidates = async () => {
    try {
      const res = await API.get('candidates/');
      const data = res.data;
      const results = Array.isArray(data) ? data : (data.results || []);
      const count = Array.isArray(data) ? data.length : (data.count || 0);

      setCandidates(results);
      setTotalCandidatesCount(count);
      if (count > 0) {
        setFiles([{ name: 'django_database', size: 'Sync OK', candidatesCount: count }]);
      }
    } catch (e) {
      console.error('Error fetching candidates:', e);
      showToast('Error syncing candidates from server');
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await API.get('jobs/');
      if (res.data && res.data.length > 0) {
        // Load the most recently created job configuration
        const latestJob = res.data[res.data.length - 1];
        setJobTitle(latestJob.title);
        setCompany(latestJob.company);
        setJobDescription(latestJob.jd);
        setKeyPriorities(latestJob.priorities);
      }
    } catch (e) {
      console.error('Error fetching jobs:', e);
    }
  };

  // Run initial sync when logged in
  useEffect(() => {
    if (isAuthenticated) {
      fetchCandidates();
      fetchJobs();
    }
  }, [isAuthenticated]);

  const applyPreset = (key) => {
    const p = PRESETS[key];
    if (p) {
      setJobTitle(p.title);
      setCompany(p.company);
      setJobDescription(p.jd);
      setKeyPriorities(p.priorities);
      showToast(`${p.title} preset loaded`);
    }
  };

  const saveJobToBackend = async () => {
    if (isAuthenticated && jobTitle && jobDescription) {
      try {
        await API.post('jobs/', {
          title: jobTitle,
          company,
          jd: jobDescription,
          priorities: keyPriorities
        });
      } catch (e) {
        console.error('Error auto-saving job:', e);
      }
    }
  };

  // Auto-save job configuration changes when logged in
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      saveJobToBackend();
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [jobTitle, company, jobDescription, keyPriorities, isAuthenticated]);


  const addManualCandidate = async (c) => {
    if (isAuthenticated) {
      try {
        const res = await API.post('candidates/', c);
        setCandidates((prev) => [res.data, ...prev].slice(0, 50));
        setTotalCandidatesCount((prev) => prev + 1);
        setResults([]);
        showToast(`Saved ${c.name} to server`);
      } catch (e) {
        console.error('Error saving candidate to server:', e);
        showToast('Error saving candidate to server');
      }
    } else {
      setCandidates((prev) => [c, ...prev]);
      setTotalCandidatesCount((prev) => prev + 1);
      setResults([]);
      showToast(`Added ${c.name} (Local Guest Mode)`);
    }
  };

  const removeCandidate = async (index) => {
    const cand = candidates[index];
    if (!cand) return;

    if (isAuthenticated && cand.id) {
      try {
        await API.delete(`candidates/${cand.id}/`);
        setCandidates((prev) => prev.filter((_, i) => i !== index));
        setTotalCandidatesCount((prev) => Math.max(0, prev - 1));
        setResults([]);
        showToast(`Deleted ${cand.name} from server`);
      } catch (e) {
        console.error('Error deleting candidate:', e);
        showToast('Error deleting candidate from server');
      }
    } else {
      setCandidates((prev) => prev.filter((_, i) => i !== index));
      setTotalCandidatesCount((prev) => Math.max(0, prev - 1));
      setResults([]);
      showToast(`Removed ${cand.name} (Local Guest Mode)`);
    }
  };

  const parseFile = async (name, text, size) => {
    let newCands = [];
    if (name.endsWith('.json') || name.endsWith('.jsonl')) {
      try {
        let d;
        try {
          d = JSON.parse(text);
        } catch (jsonErr) {
          // If standard JSON parsing fails, try parsing as JSON Lines (one JSON object per line)
          const lines = text.trim().split('\n');
          const parsedLines = lines.map(line => {
            try {
              const trimmedLine = line.trim();
              return trimmedLine ? JSON.parse(trimmedLine) : null;
            } catch (err) {
              return null;
            }
          }).filter(Boolean);
          
          if (parsedLines.length > 0) {
            d = parsedLines;
          } else {
            throw jsonErr; // rethrow standard JSON error if line-by-line parsing also failed
          }
        }

        const a = Array.isArray(d) ? d : (d.candidates || d.data || [d]);
        a.forEach((r) => {
          if (r.profile && (r.candidate_id || r.profile.anonymized_name)) {
            // New schema format candidate
            newCands.push({
              candidate_id: r.candidate_id || '',
              profile: r.profile,
              career_history: r.career_history || [],
              education: r.education || [],
              skills: r.skills || [],
              redrob_signals: r.redrob_signals || {},
              certifications: r.certifications || [],
              languages: r.languages || []
            });
          } else if (r.name || r.Name) {
            // Legacy flat candidate
            newCands.push({
              name: r.name || r.Name,
              title: r.title || r.current_title || r.role || '',
              yoe: String(r.years_exp || r.yoe || r.experience || '?'),
              edu: r.education || r.edu || '',
              skills: Array.isArray(r.skills) ? r.skills.join(', ') : (r.skills || r.tech_stack || ''),
              summary: r.summary || r.bio || r.description || '',
              signals: r.signals || r.github || '',
              location: r.location || r.city || '',
              redrob_signals: r.redrob_signals || {}
            });
          }
        });
      } catch (e) {
        newCands = parseTxt(text);
      }
    } else if (name.endsWith('.csv')) {
      newCands = parseCSV(text);
    } else {
      newCands = parseTxt(text);
    }

    if (newCands.length > 0) {
      if (isAuthenticated) {
        setUploadState('uploading');
        setUploadProgress(0);
        try {
          const CHUNK_SIZE = 500;
          let savedCands = [];
          
          for (let i = 0; i < newCands.length; i += CHUNK_SIZE) {
            const chunk = newCands.slice(i, i + CHUNK_SIZE);
            const res = await API.post('candidates/bulk/', chunk);
            savedCands = [...savedCands, ...res.data];
            const percent = Math.min(95, Math.round(((i + chunk.length) / newCands.length) * 100));
            setUploadProgress(percent);
          }

          // Slice display state candidates to latest 50
          setCandidates((prev) => [...savedCands, ...prev].slice(0, 50));
          setTotalCandidatesCount((prev) => prev + savedCands.length);
          setFiles((prev) => [...prev, { name, size: `${(size / 1024).toFixed(1)} KB`, candidatesCount: savedCands.length }]);
          setResults([]);
          showToast(`Saved ${savedCands.length} candidates from ${name} to server`);
          setUploadProgress(100);
          setUploadState('completed');
          setTimeout(() => setUploadState('idle'), 2000);
        } catch (e) {
          console.error('Error saving parsed candidates:', e);
          showToast('Error syncing uploaded candidates to server');
          setUploadState('failed');
          setTimeout(() => setUploadState('idle'), 2000);
        }
      } else {
        setCandidates((prev) => [...newCands, ...prev]);
        setTotalCandidatesCount((prev) => prev + newCands.length);
        setFiles((prev) => [...prev, { name, size: `${(size / 1024).toFixed(1)} KB`, candidatesCount: newCands.length }]);
        setResults([]);
        showToast(`Loaded ${newCands.length} candidates (Local Guest Mode)`);
      }
    } else {
      showToast(`Could not parse any candidates from ${name}`);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const parsed = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      if (!values[0]) continue;
      
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      parsed.push({
        name: record.name || record['full name'] || values[0],
        title: record.title || record['current title'] || record.role || values[1] || '',
        yoe: record.yoe || record['years exp'] || record.experience || '?',
        edu: record.education || record.edu || '',
        skills: record.skills || record.tech || '',
        summary: record.summary || record.bio || '',
        signals: record.signals || record.github || '',
        location: record.location || record.city || ''
      });
    }
    return parsed;
  };

  const parseTxt = (text) => {
    const blocks = text.split(/\n{2,}/);
    const parsed = [];
    blocks.forEach((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock || trimmedBlock.length < 20) return;
      const lines = trimmedBlock.split('\n');
      parsed.push({
        name: lines[0] || 'Candidate ' + (candidates.length + parsed.length + 1),
        title: lines[1] || '',
        yoe: '?',
        edu: '',
        skills: '',
        summary: trimmedBlock,
        signals: '',
        location: ''
      });
    });
    return parsed;
  };

  const runRanking = () => {
    if (!jobDescription.trim()) {
      showToast('Add a job description first.');
      setActiveTab('jd');
      return;
    }
    if (candidates.length === 0) {
      showToast('Add at least one candidate first.');
      return;
    }

    setRankingState('loading');
    setResults([]);
    setActiveTab('results');
  };

  const finalizeRanking = async () => {
    if (isAuthenticated) {
      // Execute ranking on Django server via REST endpoint
      try {
        const res = await API.post('rank/', {
          title: jobTitle,
          jd: jobDescription,
          priorities: keyPriorities
        });
        setResults(res.data);
        setRankingState('completed');
        showToast(`Successfully ranked ${res.data.length} candidates on server`);
      } catch (e) {
        console.error('Server side ranking failed:', e);
        setRankingState('failed');
        showToast('Server ranking failed. Running local fallback...');
        runLocalRankingFallback();
      }
    } else {
      runLocalRankingFallback();
    }
  };

  const runLocalRankingFallback = () => {
    const jdText = (jobTitle + ' ' + jobDescription + ' ' + keyPriorities).toLowerCase();
    
    let roleType = 'sde';
    if (jdText.includes('embeddings') || jdText.includes('vector database') || jdText.includes('retrieval') ||
        jdText.includes('pinecone') || jdText.includes('weaviate') || jdText.includes('qdrant') ||
        jdText.includes('sentence-transformer') || jdText.includes('hybrid search') || jdText.includes('redrob')) {
      roleType = 'ai_sr';
    } else if (jdText.includes('product manager') || jdText.includes(' growth') || jdText.includes(' pm')) {
      roleType = 'pm';
    } else if (jdText.includes('data scientist') || jdText.includes('recommend') || jdText.includes('analytics')) {
      roleType = 'ds';
    } else if (jdText.includes('ml engineer') || jdText.includes('machine learning') || jdText.includes('pytorch')) {
      roleType = 'ml';
    } else if (jdText.includes('manager') || jdText.includes('leadership') || jdText.includes('director')) {
      roleType = 'em';
    }

    const scoredList = candidates.map((cand) => {
      let experienceFit = 50;
      let skillsMatch = 50;
      let trajectory = 50;
      let signalsCulture = 50;
      
      // Support both flat format and new structured schema
      const profile = cand.profile || {};
      const name = profile.anonymized_name || cand.name || 'Unknown';
      const title = profile.current_title || cand.title || '';
      const yoeRaw = profile.years_of_experience ?? cand.yoe ?? '0';
      let yoeVal = 5;
      if (profile.years_of_experience !== undefined) {
        yoeVal = parseInt(profile.years_of_experience);
      } else if (cand.yoe !== undefined) {
        yoeVal = parseInt(cand.yoe);
      }
      if (isNaN(yoeVal)) yoeVal = 5;
      
      const location = profile.location || cand.location || '';
      let summary = profile.summary || cand.summary || '';
      if (profile.headline) {
        summary = profile.headline + '. ' + summary;
      }
      
      let skills = '';
      if (Array.isArray(cand.skills)) {
        skills = cand.skills.map(s => s.name || '').filter(Boolean).join(', ');
      } else {
        skills = cand.skills || '';
      }
      
      let edu = '';
      if (Array.isArray(cand.education)) {
        edu = cand.education.map(e => `${e.institution || ''} ${e.degree || ''} ${e.field_of_study || ''} ${e.tier || ''}`).filter(Boolean).join(', ');
      } else {
        edu = cand.edu || '';
      }
      
      let careerText = '';
      if (Array.isArray(cand.career_history)) {
        careerText = cand.career_history.map(job => `${job.title || ''} at ${job.company || ''} (${job.description || ''})`).join(' ');
      }
      
      const redrobSignals = cand.redrob_signals || {};
      
      const candSkills = (skills + ' ' + summary + ' ' + careerText).toLowerCase();
      const candTitle = (title + ' ' + careerText).toLowerCase();
      const candEdu = edu.toLowerCase();
      const candSignals = (cand.signals || '').toLowerCase();

      if (roleType === 'sde') {
        experienceFit = yoeVal >= 6 ? Math.min(95, 75 + (yoeVal - 6) * 3) : Math.max(30, yoeVal * 12);
      } else if (roleType === 'pm') {
        experienceFit = (yoeVal >= 4 && yoeVal <= 8) ? 90 : (yoeVal > 8) ? 80 : 50;
      } else if (roleType === 'ds') {
        experienceFit = yoeVal >= 4 ? 85 : 60;
      } else if (roleType === 'ml') {
        experienceFit = yoeVal >= 3 ? 90 : 55;
      } else if (roleType === 'em') {
        experienceFit = yoeVal >= 8 ? Math.min(98, 70 + (yoeVal - 8) * 3) : Math.max(20, yoeVal * 7);
      } else if (roleType === 'ai_sr') {
        // Ideal band: 6–8 YOE; acceptable: 5–9
        if (yoeVal >= 6 && yoeVal <= 8) experienceFit = 93;
        else if (yoeVal === 5 || yoeVal === 9) experienceFit = 82;
        else if (yoeVal > 9) experienceFit = 75;
        else experienceFit = Math.max(30, yoeVal * 12);
      }

      const jdKeywords = {
        sde: ['go', 'python', 'kafka', 'kubernetes', 'distributed', 'system design', 'microservices', 'event', 'latency', 'high-throughput'],
        pm: ['growth', 'experiments', 'funnel', 'metrics', 'wau', 'retention', 'a/b testing', 'consumer', 'analytics'],
        ds: ['recommend', 'sql', 'python', 'pytorch', 'tensorflow', 'marketplace', 'experimentation', 'two-tower', 'model'],
        ml: ['mlops', 'production', 'pytorch', 'inference', 'model', 'pipelines', 'latency', 'serving', 'gpu'],
        em: ['lead', 'manage', 'mentor', 'team', 'roadmap', 'hiring', 'architecture', 'strategy', 'okr'],
        ai_sr: ['embeddings', 'retrieval', 'vector', 'sentence-transformers', 'pinecone', 'weaviate', 'qdrant', 'faiss', 'elasticsearch', 'hybrid search', 'ranking', 'ndcg', 'python', 'a/b testing']
      };

      const matchedSkills = jdKeywords[roleType].filter(kw => candSkills.includes(kw));
      skillsMatch = Math.min(100, 40 + (matchedSkills.length / jdKeywords[roleType].length) * 60);

      if (keyPriorities) {
        const priorities = keyPriorities.toLowerCase().split(',').map(p => p.trim());
        let priorityMatches = 0;
        priorities.forEach(p => {
          if (candSkills.includes(p) || candTitle.includes(p)) {
            priorityMatches++;
          }
        });
        skillsMatch = Math.min(100, skillsMatch + priorityMatches * 8);
      }

      trajectory = 60;
      if (candTitle.includes('staff') || candTitle.includes('principal') || candTitle.includes('lead') || candTitle.includes('manager')) {
        trajectory += 20;
      }
      if (candTitle.includes('startup') || summary.toLowerCase().includes('startup') || summary.toLowerCase().includes('scaled')) {
        trajectory += 10;
      }
      if (candEdu.includes('iit') || candEdu.includes('iisc') || candEdu.includes('bits') || candEdu.includes('iim') || candEdu.includes('austin')) {
        trajectory += 10;
      }
      // ai_sr: extra trajectory credit for search/IR/retrieval-specific shipping
      if (roleType === 'ai_sr') {
        if (candSkills.includes('search') || candSkills.includes('retrieval') || candSkills.includes('ranking')) trajectory += 10;
        if (candSkills.includes('lora') || candSkills.includes('qlora') || candSkills.includes('peft') || candSkills.includes('fine-tun')) trajectory += 8;
        if (candSkills.includes('learning-to-rank') || candSkills.includes('xgboost') || candSkills.includes('ltr')) trajectory += 7;
        if (summary.toLowerCase().includes('hr') || summary.toLowerCase().includes('recruit')) trajectory += 6;
        // Penalise disqualifying signals
        if (candTitle.includes('tcs') || candTitle.includes('infosys') || candTitle.includes('wipro') ||
            candTitle.includes('accenture') || candTitle.includes('cognizant') || candTitle.includes('capgemini')) trajectory -= 20;
        if (candSkills.includes('computer vision') || candSkills.includes('speech recognition') || candSkills.includes('robotics')) trajectory -= 10;
      }
      trajectory = Math.min(98, Math.max(10, trajectory));

      // 4. Compute signals score
      signalsCulture = getSignalsScore(cand.redrob_signals && Object.keys(cand.redrob_signals).length > 0 ? cand.redrob_signals : null, candSignals);

      // ai_sr text-based boosts (only when structured signals are absent)
      if (roleType === 'ai_sr' && (!cand.redrob_signals || Object.keys(cand.redrob_signals).length === 0)) {
        if (candSignals.includes('paper') || candSignals.includes('arxiv') || candSignals.includes('acl') || candSignals.includes('neurips')) signalsCulture = Math.min(96, signalsCulture + 12);
        if (candSignals.includes('kaggle') && candSignals.includes('master')) signalsCulture = Math.min(96, signalsCulture + 8);
        if (location && ['pune', 'noida', 'hyderabad', 'mumbai', 'delhi', 'ncr', 'bangalore'].some(c => location.toLowerCase().includes(c))) signalsCulture = Math.min(96, signalsCulture + 5);
      }
      signalsCulture = Math.min(96, signalsCulture);

      // 5. Skills-match boost from verified assessment overlap
      if (cand.redrob_signals && cand.redrob_signals.skill_assessment_scores) {
        const assessedSkills = Object.keys(cand.redrob_signals.skill_assessment_scores).map(k => k.toLowerCase());
        const boosted = matchedSkills.filter(kw => assessedSkills.includes(kw)).length;
        skillsMatch = Math.min(100, skillsMatch + boosted * 5);
      }

      // 6. Availability multiplier (stacked, floor 0.40)
      const availability = getAvailabilityMultiplier(cand.redrob_signals && Object.keys(cand.redrob_signals).length > 0 ? cand.redrob_signals : null);

      let greenFlags = [];
      let redFlags = [];
      let rationale = '';

      // Dynamic flags from redrob_signals
      if (cand.redrob_signals && Object.keys(cand.redrob_signals).length > 0) {
        const otw = cand.redrob_signals.open_to_work_flag;
        const rrr = cand.redrob_signals.recruiter_response_rate;
        const icr = cand.redrob_signals.interview_completion_rate;
        const notice = cand.redrob_signals.notice_period_days;
        const offerAcc = cand.redrob_signals.offer_acceptance_rate;
        const relocate = cand.redrob_signals.willing_to_relocate;

        if (otw === false) redFlags.push('Not marked open to work');
        if (rrr !== undefined && rrr !== null && rrr < 0.20) redFlags.push('Very low recruiter response rate');
        if (notice !== undefined && notice !== null && notice > 90) redFlags.push(`Long notice period: ${notice} days`);
        if (icr !== undefined && icr !== null && icr < 0.50) redFlags.push('Low interview completion rate');

        if (otw === true) greenFlags.push('Actively open to work');
        if (notice !== undefined && notice !== null && notice <= 30) greenFlags.push('Available immediately (≤30 day notice)');
        if (rrr !== undefined && rrr !== null && rrr > 0.75) greenFlags.push('Highly responsive to recruiters');
        if (offerAcc !== undefined && offerAcc !== null && offerAcc > 0.75) greenFlags.push('Strong offer acceptance history');
        if (relocate === true) greenFlags.push('Willing to relocate');
      }

      if (name === 'Arjun Mehta') {
        if (roleType === 'sde') {
          experienceFit = 94; skillsMatch = 92; trajectory = 95; signalsCulture = 88;
          greenFlags = ['Highly scaled Swiggy systems (500K RPM)', 'Staff-level design & architecture', 'Mentorship of 6 engineers'];
          rationale = 'Top-tier candidate for this platform role. Exceptional distributed systems scaling experience from Swiggy and Amazon. Shows strong leadership potential with clear technical depth.';
        } else if (roleType === 'em') {
          experienceFit = 88; skillsMatch = 85; trajectory = 92; signalsCulture = 86;
          greenFlags = ['Staff Eng scope at Swiggy', 'Mentors 6-person team', 'Strong architectural oversight'];
          rationale = 'Excellent technical lead with informal management experience. Fully capable of running the core platform pod, though primary path is Staff IC rather than pure EM.';
        } else {
          experienceFit = 75; skillsMatch = 60; trajectory = 80; signalsCulture = 70;
          redFlags = ['Overqualified/expensive for generalist scope', 'Focus is backend platform rather than growth/ML'];
          rationale = 'High-caliber platform engineer, but his deep distributed systems and scalability focus is not a direct fit for the requirements of this role.';
        }
      } else if (name === 'Priya Nair') {
        if (roleType === 'ml' || roleType === 'ds') {
          experienceFit = 92; skillsMatch = 95; trajectory = 88; signalsCulture = 94;
          greenFlags = ['Kaggle Grandmaster status', 'Ola driver-matching model owner (+18% efficiency)', 'Active researcher & PyTorch contributor'];
          rationale = 'Standout ML specialist. Built and shipped Ola\'s driver dispatch logic under extreme scale. Phenomenal experimentation rigor and MLOps tooling experience.';
        } else {
          experienceFit = 65; skillsMatch = 45; trajectory = 70; signalsCulture = 80;
          redFlags = ['Heavy ML modeling focus; limited platform/general engineering', 'Primarily data/modeling background'];
          rationale = 'Excellent ML practitioner, but matches poorly with roles requiring standard product development or core database platform scaling.';
        }
      } else if (name === 'Kavya Reddy') {
        if (roleType === 'em') {
          experienceFit = 96; skillsMatch = 94; trajectory = 96; signalsCulture = 90;
          greenFlags = ['EM leading 12 engineers at PhonePe', '99.99% uptime payments ownership', 'BITS Pilani + IIM Ahmedabad elite combo'];
          rationale = 'The definitive choice for this leadership position. Proved herself in PhonePe payments under heavy UPI load. Extremely balanced technical, managerial, and academic profile.';
        } else if (roleType === 'sde') {
          experienceFit = 82; skillsMatch = 78; trajectory = 88; signalsCulture = 80;
          redFlags = ['May want management path; might resist pure coding', 'Heavy organizational responsibilities recently'];
          rationale = 'Outstanding credentials, but her transition into engineering management means she might be overqualified or seek leadership positions rather than pure SDE IC roles.';
        } else {
          experienceFit = 70; skillsMatch = 50; trajectory = 80; signalsCulture = 70;
          rationale = 'A high-performing manager with stellar background, but this specific role does not leverage her scaling or leadership strengths.';
        }
      } else if (name === 'Aisha Khan') {
        if (roleType === 'sde') {
          experienceFit = 91; skillsMatch = 89; trajectory = 88; signalsCulture = 90;
          greenFlags = ['Razorpay Core payments gateway engineer', 'Contributed to Go standard library', '35% reduction in fraud metrics'];
          rationale = 'Superb match for payment infra or system scaling. Her Go contributions show deep system level literacy. Razorpay core gateway credentials translate perfectly into high availability requirements.';
        } else {
          experienceFit = 80; skillsMatch = 70; trajectory = 80; signalsCulture = 80;
          rationale = 'Highly solid senior developer with payment domain context. Strong system logic foundations.';
        }
      } else if (name === 'Siddharth Rao') {
        if (roleType === 'em' || roleType === 'sde') {
          experienceFit = 93; skillsMatch = 88; trajectory = 92; signalsCulture = 85;
          greenFlags = ['Principal Engineer leading SaaS vision', '13 years of SaaS & multi-tenant architecture', 'US experience (UT Austin MS)'];
          rationale = 'High-level architectural heavyweight. Freshworks background ensures deep multi-tenant SaaS scaling competency. Perfect technical fit, though verify target salary/title expectations.';
        } else {
          experienceFit = 72; skillsMatch = 55; trajectory = 82; signalsCulture = 75;
          redFlags = ['SaaS focus; lacks specific consumer PM/DS modeling skills'];
          rationale = 'Vast engineering experience, but his core skills skew too heavily toward architectural engineering and SaaS multi-tenancy for this position.';
        }
      } else if (name === 'Rohan Gupta') {
        experienceFit = 55; skillsMatch = 65; trajectory = 60; signalsCulture = 65;
        if (roleType === 'pm') {
          greenFlags = ['Shipped 3 SaaS startup features end-to-end', 'High agency fast learner'];
          redFlags = ['No formal PM credentials', 'Limited analytical framework exposure'];
          rationale = 'Ambitious developer showing high agency in an early startup. However, lacks the metrics ownership, product execution templates, or design maturity required for a senior role.';
        } else {
          greenFlags = ['Full-stack startup agility', 'Strong frontend/React capabilities'];
          redFlags = ['Limited high-scale distributed systems background', 'Low total years of experience (3 YOE)'];
          rationale = 'Highly promising junior-to-mid developer with good startup hustle. Lacks the depth in distributed scaling, event buses, or systems complexity for this Senior level.';
        }
      } else if (name === 'Nikhil Joshi') {
        experienceFit = 55; skillsMatch = 50; trajectory = 45; signalsCulture = 45;
        redFlags = ['IT Services background (TCS) - slower pace', 'No product/startup experience', 'Basic AWS only'];
        rationale = 'Solid enterprise developer. Shows consistency at TCS, but lacks the high-velocity startup exposure, product iteration cycles, or advanced system designs required here.';
      } else {
        const calculatedScore = Math.round((experienceFit * 0.35) + (skillsMatch * 0.35) + (trajectory * 0.15) + (signalsCulture * 0.15));
        
        if (calculatedScore > 85) {
          greenFlags = greenFlags.length > 0 ? greenFlags : [`Excellent profile with ${yoeVal} YOE`, `Strong match for key skills: ${skills ? skills.split(',').slice(0, 3).join(', ') : 'None'}`];
          rationale = `Highly qualified candidate. Excellent alignment on background and experience. Strong signals match the priorities for ${jobTitle || 'the role'}.`;
        } else if (calculatedScore > 70) {
          greenFlags = greenFlags.length > 0 ? greenFlags : [`Solid ${yoeVal} YOE background`];
          redFlags = redFlags.length > 0 ? redFlags : [`May need ramp-up on specific tech stack elements`];
          rationale = `Good candidate with relevant background. Exhibits standard technical competency, though some secondary skill areas may need closer vetting.`;
        } else {
          redFlags = redFlags.length > 0 ? redFlags : [`Limited alignment on key domain experiences`, `Lower match on tech stack requirements`];
          rationale = `Lacks the core technical depth or specific framework scaling expertise outlined in the job description. Trajectory is slightly off-course for this scope.`;
        }
      }
      const overall_score = Math.round(((experienceFit * 0.35) + (skillsMatch * 0.35) + (trajectory * 0.15) + (signalsCulture * 0.15)) * availability * 10) / 10;

      const yFloat = parseFloat(yoeRaw);
      const yStr = isNaN(yFloat) ? "0" : (Number.isInteger(yFloat) ? yFloat.toString() : yFloat.toFixed(1));
      const rrVal = redrobSignals.recruiter_response_rate;
      const rrStr = (rrVal != null && !isNaN(parseFloat(rrVal))) ? parseFloat(rrVal).toFixed(2) : "0.00";
      const matchedCount = matchedSkills.length;
      const titleStr = title || "Candidate";
      const reasoning = `${titleStr} with ${yStr} yrs; ${matchedCount} AI core skills; response rate ${rrStr}.`;

      return {
        candidate_id: cand.candidate_id || '',
        name: name,
        title: title,
        yoe: yoeVal,
        yoe_raw: yFloat,
        matched_skills_count: matchedCount,
        recruiter_response_rate: rrVal ?? 0.0,
        location: location,
        skills: skills,
        education: edu,
        overall_score,
        availability_multiplier: Math.round(availability * 100) / 100,
        dimensions: {
          experience_fit: Math.round(experienceFit),
          skills_match: Math.round(skillsMatch),
          trajectory: Math.round(trajectory),
          signals_culture: Math.round(signalsCulture)
        },
        green_flags: greenFlags.length > 0 ? greenFlags : ['Competent career history', 'Decent skill alignment'],
        red_flags: redFlags,
        rationale: reasoning
      };
    });

    const rankedList = scoredList
      .sort((a, b) => b.overall_score - a.overall_score)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    setResults(rankedList);
    setRankingState('completed');
    showToast(`Successfully ranked ${candidates.length} candidates (Local)`);
  };

  return (
    <JobContext.Provider
      value={{
        jobTitle,
        setJobTitle,
        company,
        setCompany,
        jobDescription,
        setJobDescription,
        keyPriorities,
        setKeyPriorities,
        candidates,
        setCandidates,
        files,
        setFiles,
        results,
        setResults,
        rankingState,
        setRankingState,
        rankingError,
        setRankingError,
        activeTab,
        setActiveTab,
        toastMessage,
        showToast,
        applyPreset,
        addManualCandidate,
        removeCandidate,
        parseFile,
        runRanking,
        finalizeRanking,
        
        // Exported count & upload states
        totalCandidatesCount,
        uploadState,
        uploadProgress,
        
        // Auth variables & methods
        isAuthenticated,
        username,
        login,
        register,
        logout
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};
