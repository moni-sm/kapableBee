import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api';

const JobContext = createContext();

const PRESETS = {
  sde: {
    title: 'Senior Software Engineer — Platform',
    company: 'Series B fintech startup',
    jd: `We're building next-gen real-time data infrastructure at a Series B fintech (300 people, Sequoia-backed). Need a Senior SDE for our platform team.\n\nYou'll own backend systems processing millions of transactions daily.\n\nWhat you'll do:\n- Design high-throughput, low-latency services (p99 < 50ms at 200K RPS)\n- Own system design with long-term impact\n- Mentor 2–3 junior engineers\n- Partner with product and infra\n\nWhat we need:\n- 6+ years, strong distributed systems\n- High-scale backend (microservices, event streaming)\n- Product company experience preferred\n- Payments/fintech a plus`,
    priorities: 'distributed systems depth, scale experience, product company, mentorship'
  },
  pm: {
    title: 'Senior Product Manager — Growth',
    company: 'Health-tech B2C',
    jd: `Senior PM for Growth at a fast-growing B2C health-tech. Own the user acquisition and activation funnel.\n\n- Define and execute growth roadmap\n- Run rigorous A/B experiments (20+ tests/week)\n- Own metrics: WAU, D7 retention, activation rate\n\n4–8 years PM experience, 2+ in consumer tech. Deeply analytical.`,
    priorities: 'data-driven, consumer product, growth experiments, activation'
  },
  ds: {
    title: 'Data Scientist — Recommendations',
    company: 'E-commerce marketplace',
    jd: `Mid-sized e-commerce marketplace hiring a DS to own recommendation and personalization in a 4-person ML team.\n\n- Product recommendation models (collab filtering, two-tower, sequential)\n- A/B test design and analysis\n- Feature engineering from clickstream data\n- Stakeholder communication\n\nStrong Python and SQL. PyTorch or TensorFlow. MLOps a big plus.`,
    priorities: 'recommendation systems, experimentation rigor, MLOps, business communication'
  },
  ml: {
    title: 'ML Engineer — Production Systems',
    company: 'Series A AI product company',
    jd: `Series A AI product company (80 people) hiring an ML Engineer to take models from research to production.\n\n- Build scalable ML pipelines and serving infra\n- Productionize models with research scientists\n- Own model monitoring, retraining, evaluation\n- Optimize inference for latency and cost\n\n3+ years ML engineering. Strong Python, PyTorch. Model serving experience.`,
    priorities: 'MLOps, production systems, inference optimization, model lifecycle'
  },
  em: {
    title: 'Engineering Manager — Core Platform',
    company: 'SaaS unicorn',
    jd: `SaaS unicorn (Series D) hiring a technical EM for our 8-person core platform team. You'll write code, review designs, and grow engineers.\n\n- Lead 8 backend engineers\n- Drive technical roadmap\n- Hire and mentor team\n- Partner with product and design\n\n5+ years engineering, 2+ years management. Strong distributed systems background.`,
    priorities: 'technical depth, team building, distributed systems, product partnership'
  },
  ai_sr: {
    title: 'Senior AI Engineer — Founding Team',
    company: 'Redrob AI',
    jd: `Redrob AI is hiring a Senior AI Engineer (founding team) to own our core retrieval and ranking intelligence layer — Pune/Noida, India (Hybrid).\n\nWe need someone who has shipped end-to-end semantic search or ranking systems to real users — not just run experiments.\n\nWhat you'll own:\n- Design and maintain embeddings-based retrieval pipelines (dense + hybrid search)\n- Own vector database architecture: Pinecone, Weaviate, Qdrant, Milvus, or Elasticsearch/OpenSearch\n- Build and improve ranking evaluation frameworks (NDCG, MRR, MAP)\n- Run rigorous A/B tests to improve retrieval quality\n- Partner with product to translate search quality wins into user-facing improvements\n\nWhat we need:\n- 5–9 years experience, ideally 6–8\n- Deep hands-on Python; sentence-transformers, FAISS, vector DBs\n- Real production deployments — no pure research backgrounds\n- Strong retrieval intuition; opinions on dense vs hybrid vs sparse search\n\nNice to have: LLM fine-tuning (LoRA/QLoRA/PEFT), learning-to-rank (LTR/XGBoost), HR-tech or recruiting-tech domain experience, open-source contributions.\n\nDisqualifiers: < 12 months total AI experience, career limited to IT services (TCS/Infosys/Wipro/Cognizant), primary domain is CV/speech/robotics with no NLP or IR, no production code in last 18 months.`,
    priorities: 'retrieval systems, vector databases, embeddings, ranking evaluation, production AI, hybrid search'
  }
};

const SAMPLES = [
  {
    name: 'Arjun Mehta',
    title: 'Staff Engineer, Swiggy',
    yoe: '9',
    edu: 'M.Tech CS, IISc Bangalore',
    skills: 'Python, Go, Kafka, Kubernetes, distributed systems, system design, leadership',
    summary: "Led backend architecture for Swiggy's order management system — 2M+ daily orders, scaled 50K→500K RPM. Previously Amazon India. Mentors 6-person team.",
    signals: 'GitHub 1200 stars, AWS re:Invent India speaker, 3 engineering blog posts',
    location: 'Bangalore'
  },
  {
    name: 'Priya Nair',
    title: 'Senior ML Engineer, Ola',
    yoe: '6',
    edu: 'B.Tech CSE, NIT Trichy',
    skills: 'Python, TensorFlow, PyTorch, MLOps, feature engineering, A/B testing, SQL',
    summary: "Built Ola's real-time driver-matching ML model, cut avg wait time 18%. End-to-end ML pipeline ownership. Kaggle grandmaster.",
    signals: 'Kaggle grandmaster, 2 ICML workshop papers, active PyTorch community',
    location: 'Hyderabad'
  },
  {
    name: 'Rohan Gupta',
    title: 'Full Stack Developer, early-stage startup',
    yoe: '3',
    edu: 'B.E. IT, VIT',
    skills: 'React, Node.js, MongoDB, Docker, REST APIs',
    summary: 'Early-stage SaaS startup. 3 features shipped end-to-end. Limited scale experience, fast learner. Strong frontend.',
    signals: 'Leetcode 400 solved, personal tech blog 500 followers',
    location: 'Pune'
  },
  {
    name: 'Kavya Reddy',
    title: 'Engineering Manager, PhonePe',
    yoe: '11',
    edu: 'B.Tech CSE, BITS Pilani; MBA IIM A',
    skills: 'System design, Java, microservices, cross-functional leadership, OKR planning, hiring',
    summary: "EM for PhonePe's payments core (12 engineers). 99.99% uptime for UPI. Built team from 5 to 12.",
    signals: 'StaffEng India speaker, IIM Bangalore guest lecturer, LinkedIn 8K followers',
    location: 'Bangalore'
  },
  {
    name: 'Nikhil Joshi',
    title: 'SDE-2, TCS',
    yoe: '5',
    edu: 'B.E. CS, Pune University',
    skills: 'Java, Spring Boot, MySQL, REST APIs, basic AWS',
    summary: 'Enterprise banking apps at TCS. Solid IT services background, limited product company exposure.',
    signals: 'Internal recognition award',
    location: 'Mumbai'
  },
  {
    name: 'Aisha Khan',
    title: 'Senior SDE, Razorpay',
    yoe: '7',
    edu: 'B.Tech CSE, IIIT Hyderabad',
    skills: 'Go, Python, gRPC, PostgreSQL, Redis, payments infrastructure',
    summary: "Core engineer on Razorpay's payment gateway. Fraud detection microservice cut false positives 35%. Led 3-person pod.",
    signals: 'Contributed to Go stdlib, 2 CVE credits, fintech podcast guest',
    location: 'Bangalore'
  },
  {
    name: 'Siddharth Rao',
    title: 'Principal Engineer, Freshworks',
    yoe: '13',
    edu: 'M.S. CS, UT Austin',
    skills: 'Ruby, Python, multi-tenancy, SaaS architecture, CRM systems, technical vision',
    summary: 'Defines technical strategy for Freshdesk platform. Deep SaaS expertise. Returned from US 3 years ago.',
    signals: '"SaaS engineering at scale" e-book, 5K GitHub followers',
    location: 'Chennai'
  }
];

const getAvailabilityMultiplier = (signals) => {
  if (!signals) return 1.0;
  let multiplier = 1.0;
  
  const lastActive = signals.last_active_days;
  if (lastActive !== undefined && lastActive !== null) {
    if (lastActive > 180) multiplier *= 0.60;
    else if (lastActive > 90) multiplier *= 0.80;
    else if (lastActive > 30) multiplier *= 0.90;
  }
  
  if (signals.open_to_work_flag === false) multiplier *= 0.80;
  
  const rrr = signals.recruiter_response_rate;
  if (rrr !== undefined && rrr !== null) {
    if (rrr < 0.20) multiplier *= 0.70;
    else if (rrr < 0.50) multiplier *= 0.90;
  }
  
  const icr = signals.interview_completion_rate;
  if (icr !== undefined && icr !== null && icr < 0.50) multiplier *= 0.80;
  
  const notice = signals.notice_period_days;
  if (notice !== undefined && notice !== null) {
    if (notice > 90) multiplier *= 0.85;
    else if (notice > 60) multiplier *= 0.92;
  }
  
  return Math.max(0.40, multiplier);
};

const getSignalsScore = (signals, candSignalsText) => {
  if (!signals) {
    let sig = 55;
    if (candSignalsText.includes('github') || candSignalsText.includes('stars')) sig += 15;
    if (candSignalsText.includes('speaker') || candSignalsText.includes('talk') || candSignalsText.includes('conference')) sig += 15;
    if (candSignalsText.includes('contribute') || candSignalsText.includes('open-source')) sig += 10;
    return Math.min(96, sig);
  }
  
  let score = 0;
  
  const githubScore = signals.github_activity_score !== undefined ? signals.github_activity_score : -1;
  if (githubScore > 80) score += 30;
  else if (githubScore > 50) score += 20;
  else if (githubScore > 0) score += 10;
  
  const skillAssessments = signals.skill_assessment_scores;
  if (skillAssessments) {
    const values = Object.values(skillAssessments);
    if (values.length > 0) {
      const avg = values.reduce((sum, v) => sum + parseFloat(v), 0) / values.length;
      score += Math.min(25, avg * 0.25);
    }
  }
  
  const endorsements = signals.endorsements_received || 0;
  if (endorsements > 20) score += 15;
  else if (endorsements > 10) score += 10;
  else if (endorsements > 5) score += 5;
  
  const saved = signals.saved_by_recruiters_30d || 0;
  if (saved > 5) score += 15;
  else if (saved > 2) score += 8;
  
  const completeness = signals.profile_completeness_score || 0;
  if (completeness > 85) score += 10;
  else if (completeness > 60) score += 5;
  
  if (signals.linkedin_connected) score += 5;
  
  return Math.min(100, score);
};

export const JobProvider = ({ children }) => {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [keyPriorities, setKeyPriorities] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [rankingState, setRankingState] = useState('idle'); // 'idle' | 'loading' | 'completed' | 'failed'
  const [rankingError, setRankingError] = useState('');
  const [activeTab, setActiveTab] = useState('jd');
  const [toastMessage, setToastMessage] = useState('');

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

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
    setResults([]);
    setFiles([]);
    showToast('Logged out successfully');
  };

  // Fetch candidates and jobs from Django backend
  const fetchCandidates = async () => {
    try {
      const res = await API.get('candidates/');
      setCandidates(res.data);
      if (res.data.length > 0) {
        setFiles([{ name: 'django_database', size: 'Sync OK', candidatesCount: res.data.length }]);
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

  const loadSampleDataset = async () => {
    if (isAuthenticated) {
      // Save all sample candidates to backend MongoDB
      try {
        const res = await API.post('candidates/bulk/', SAMPLES);
        const newCands = res.data;
        setCandidates(prev => [...prev, ...newCands]);
        setFiles(prev => [...prev, { name: 'sample_dataset', size: '12.4 KB', candidatesCount: SAMPLES.length }]);
        showToast('Sample dataset saved to server MongoDB');
      } catch (e) {
        console.error('Error saving sample candidates:', e);
        showToast('Error syncing sample dataset to server');
      }
    } else {
      setCandidates([...SAMPLES]);
      setFiles([{ name: 'kapablebee_sample.json', size: '12.4 KB', candidatesCount: SAMPLES.length }]);
      setResults([]);
      showToast('Sample dataset loaded (Local Guest Mode)');
    }
  };

  const addManualCandidate = async (c) => {
    if (isAuthenticated) {
      try {
        const res = await API.post('candidates/', c);
        setCandidates((prev) => [...prev, res.data]);
        setResults([]);
        showToast(`Saved ${c.name} to server`);
      } catch (e) {
        console.error('Error saving candidate to server:', e);
        showToast('Error saving candidate to server');
      }
    } else {
      setCandidates((prev) => [...prev, c]);
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
        setResults([]);
        showToast(`Deleted ${cand.name} from server`);
      } catch (e) {
        console.error('Error deleting candidate:', e);
        showToast('Error deleting candidate from server');
      }
    } else {
      setCandidates((prev) => prev.filter((_, i) => i !== index));
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
        try {
          const res = await API.post('candidates/bulk/', newCands);
          const savedCands = res.data;
          setCandidates((prev) => [...prev, ...savedCands]);
          setFiles((prev) => [...prev, { name, size: `${(size / 1024).toFixed(1)} KB`, candidatesCount: savedCands.length }]);
          setResults([]);
          showToast(`Saved ${savedCands.length} candidates from ${name} to server`);
        } catch (e) {
          console.error('Error saving parsed candidates:', e);
          showToast('Error syncing uploaded candidates to server');
        }
      } else {
        setCandidates((prev) => [...prev, ...newCands]);
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

      const overall_score = Math.round(((experienceFit * 0.35) + (skillsMatch * 0.35) + (trajectory * 0.15) + (signalsCulture * 0.15)) * availability);

      return {
        name: name,
        title: title,
        yoe: yoeVal,
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
        rationale: rationale || `Evaluated candidate based on skills (${skills}) and trajectory. Overall score matches general fit.`
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
        loadSampleDataset,
        addManualCandidate,
        removeCandidate,
        parseFile,
        runRanking,
        finalizeRanking,
        
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
