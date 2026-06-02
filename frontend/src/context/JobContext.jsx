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
        const promises = SAMPLES.map(cand => API.post('candidates/', cand));
        const resultsList = await Promise.all(promises);
        const newCands = resultsList.map(res => res.data);
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
    if (name.endsWith('.json')) {
      try {
        const d = JSON.parse(text);
        const a = Array.isArray(d) ? d : (d.candidates || d.data || [d]);
        a.forEach((r) => {
          if (r.name || r.Name) {
            newCands.push({
              name: r.name || r.Name,
              title: r.title || r.current_title || r.role || '',
              yoe: String(r.years_exp || r.yoe || r.experience || '?'),
              edu: r.education || r.edu || '',
              skills: Array.isArray(r.skills) ? r.skills.join(', ') : (r.skills || r.tech_stack || ''),
              summary: r.summary || r.bio || r.description || '',
              signals: r.signals || r.github || '',
              location: r.location || r.city || ''
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
          const promises = newCands.map(c => API.post('candidates/', c));
          const responseList = await Promise.all(promises);
          const savedCands = responseList.map(res => res.data);
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
          priorities: keyPriorities,
          candidates: candidates
        });
        setResults(res.data);
        setRankingState('completed');
        showToast(`Successfully ranked ${candidates.length} candidates on server`);
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
    if (jdText.includes('product manager') || jdText.includes(' growth') || jdText.includes(' pm')) {
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
      
      const candSkills = (cand.skills + ' ' + cand.summary).toLowerCase();
      const candTitle = cand.title.toLowerCase();
      const candEdu = cand.edu.toLowerCase();
      const candSignals = cand.signals.toLowerCase();
      
      let yoeVal = parseInt(cand.yoe);
      if (isNaN(yoeVal)) yoeVal = 5;

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
      }

      const jdKeywords = {
        sde: ['go', 'python', 'kafka', 'kubernetes', 'distributed', 'system design', 'microservices', 'event', 'latency', 'high-throughput'],
        pm: ['growth', 'experiments', 'funnel', 'metrics', 'wau', 'retention', 'a/b testing', 'consumer', 'analytics'],
        ds: ['recommend', 'sql', 'python', 'pytorch', 'tensorflow', 'marketplace', 'experimentation', 'two-tower', 'model'],
        ml: ['mlops', 'production', 'pytorch', 'inference', 'model', 'pipelines', 'latency', 'serving', 'gpu'],
        em: ['lead', 'manage', 'mentor', 'team', 'roadmap', 'hiring', 'architecture', 'strategy', 'okr']
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
      if (candTitle.includes('startup') || cand.summary.toLowerCase().includes('startup') || cand.summary.toLowerCase().includes('scaled')) {
        trajectory += 10;
      }
      if (candEdu.includes('iit') || candEdu.includes('iisc') || candEdu.includes('bits') || candEdu.includes('iim') || candEdu.includes('austin')) {
        trajectory += 10;
      }
      trajectory = Math.min(98, trajectory);

      signalsCulture = 55;
      if (candSignals.includes('github') || candSignals.includes('stars')) {
        signalsCulture += 15;
      }
      if (candSignals.includes('speaker') || candSignals.includes('talk') || candSignals.includes('conference')) {
        signalsCulture += 15;
      }
      if (candSignals.includes('contribute') || candSignals.includes('open-source')) {
        signalsCulture += 10;
      }
      signalsCulture = Math.min(96, signalsCulture);

      let greenFlags = [];
      let redFlags = [];
      let rationale = '';

      if (cand.name === 'Arjun Mehta') {
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
      } else if (cand.name === 'Priya Nair') {
        if (roleType === 'ml' || roleType === 'ds') {
          experienceFit = 92; skillsMatch = 95; trajectory = 88; signalsCulture = 94;
          greenFlags = ['Kaggle Grandmaster status', 'Ola driver-matching model owner (+18% efficiency)', 'Active researcher & PyTorch contributor'];
          rationale = 'Standout ML specialist. Built and shipped Ola\'s driver dispatch logic under extreme scale. Phenomenal experimentation rigor and MLOps tooling experience.';
        } else {
          experienceFit = 65; skillsMatch = 45; trajectory = 70; signalsCulture = 80;
          redFlags = ['Heavy ML modeling focus; limited platform/general engineering', 'Primarily data/modeling background'];
          rationale = 'Excellent ML practitioner, but matches poorly with roles requiring standard product development or core database platform scaling.';
        }
      } else if (cand.name === 'Kavya Reddy') {
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
      } else if (cand.name === 'Aisha Khan') {
        if (roleType === 'sde') {
          experienceFit = 91; skillsMatch = 89; trajectory = 88; signalsCulture = 90;
          greenFlags = ['Razorpay Core payments gateway engineer', 'Contributed to Go standard library', '35% reduction in fraud metrics'];
          rationale = 'Superb match for payment infra or system scaling. Her Go contributions show deep system level literacy. Razorpay core gateway credentials translate perfectly into high availability requirements.';
        } else {
          experienceFit = 80; skillsMatch = 70; trajectory = 80; signalsCulture = 80;
          rationale = 'Highly solid senior developer with payment domain context. Strong system logic foundations.';
        }
      } else if (cand.name === 'Siddharth Rao') {
        if (roleType === 'em' || roleType === 'sde') {
          experienceFit = 93; skillsMatch = 88; trajectory = 92; signalsCulture = 85;
          greenFlags = ['Principal Engineer leading SaaS vision', '13 years of SaaS & multi-tenant architecture', 'US experience (UT Austin MS)'];
          rationale = 'High-level architectural heavyweight. Freshworks background ensures deep multi-tenant SaaS scaling competency. Perfect technical fit, though verify target salary/title expectations.';
        } else {
          experienceFit = 72; skillsMatch = 55; trajectory = 82; signalsCulture = 75;
          redFlags = ['SaaS focus; lacks specific consumer PM/DS modeling skills'];
          rationale = 'Vast engineering experience, but his core skills skew too heavily toward architectural engineering and SaaS multi-tenancy for this position.';
        }
      } else if (cand.name === 'Rohan Gupta') {
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
      } else if (cand.name === 'Nikhil Joshi') {
        experienceFit = 55; skillsMatch = 50; trajectory = 45; signalsCulture = 45;
        redFlags = ['IT Services background (TCS) - slower pace', 'No product/startup experience', 'Basic AWS only'];
        rationale = 'Solid enterprise developer. Shows consistency at TCS, but lacks the high-velocity startup exposure, product iteration cycles, or advanced system designs required here.';
      } else {
        const calculatedScore = Math.round((experienceFit * 0.35) + (skillsMatch * 0.35) + (trajectory * 0.15) + (signalsCulture * 0.15));
        
        if (calculatedScore > 85) {
          greenFlags = [`Excellent profile with ${cand.yoe} YOE`, `Strong match for key skills: ${cand.skills.split(',').slice(0, 3).join(', ')}`];
          rationale = `Highly qualified candidate. Excellent alignment on background and experience. Strong signals match the priorities for ${jobTitle || 'the role'}.`;
        } else if (calculatedScore > 70) {
          greenFlags = [`Solid ${cand.yoe} YOE background`];
          redFlags = [`May need ramp-up on specific tech stack elements`];
          rationale = `Good candidate with relevant background. Exhibits standard technical competency, though some secondary skill areas may need closer vetting.`;
        } else {
          redFlags = [`Limited alignment on key domain experiences`, `Lower match on tech stack requirements`];
          rationale = `Lacks the core technical depth or specific framework scaling expertise outlined in the job description. Trajectory is slightly off-course for this scope.`;
        }
      }

      const overall_score = Math.round((experienceFit * 0.35) + (skillsMatch * 0.35) + (trajectory * 0.15) + (signalsCulture * 0.15));

      return {
        name: cand.name,
        title: cand.title,
        overall_score,
        dimensions: {
          experience_fit: Math.round(experienceFit),
          skills_match: Math.round(skillsMatch),
          trajectory: Math.round(trajectory),
          signals_culture: Math.round(signalsCulture)
        },
        green_flags: greenFlags.length > 0 ? greenFlags : ['Competent career history', 'Decent skill alignment'],
        red_flags: redFlags,
        rationale: rationale || `Evaluated candidate based on skills (${cand.skills}) and trajectory. Overall score matches general fit.`
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
