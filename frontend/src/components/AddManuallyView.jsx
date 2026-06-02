import React, { useState } from 'react';
import { useJob } from '../context/JobContext';

const AVS = [
  { bg: '#E1F5EE', c: '#085041' },
  { bg: '#D4EEFF', c: '#0C447C' },
  { bg: '#EEEDFE', c: '#3C3489' },
  { bg: '#FFF8EC', c: '#854F0B' },
  { bg: '#FAECE7', c: '#712B13' },
  { bg: '#EAF3DE', c: '#27500A' },
  { bg: '#FBEAF0', c: '#72243E' },
  { bg: '#FCEBEB', c: '#791F1F' }
];

export const getAvatar = (name = '', index = 0) => {
  const cleanName = name.trim();
  const a = AVS[index % AVS.length];
  const parts = cleanName.split(' ');
  const initials = parts.length >= 2 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : cleanName.slice(0, 2).toUpperCase();
  return { initials, bg: a.bg, color: a.c };
};

const AddManuallyView = () => {
  const { candidates, addManualCandidate, removeCandidate, runRanking } = useJob();
  
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [yoe, setYoe] = useState('');
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('');
  const [skills, setSkills] = useState('');
  const [summary, setSummary] = useState('');
  const [signals, setSignals] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !title.trim()) {
      alert('Name and current title/company are required.');
      return;
    }
    
    addManualCandidate({
      name: name.trim(),
      title: title.trim(),
      yoe: yoe.trim() || '?',
      location: location.trim(),
      edu: education.trim(),
      skills: skills.trim() || 'not specified',
      summary: summary.trim(),
      signals: signals.trim()
    });

    handleClear();
  };

  const handleClear = () => {
    setName('');
    setTitle('');
    setYoe('');
    setLocation('');
    setEducation('');
    setSkills('');
    setSummary('');
    setSignals('');
  };

  return (
    <div id="v-manual" className="view-content animate-fade-in">
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="slbl" style={{ marginBottom: '12px' }}>New candidate</div>
        
        <div className="g2">
          <div className="f">
            <label htmlFor="mn">Full name</label>
            <input
              type="text"
              id="mn"
              placeholder="Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="f">
            <label htmlFor="mt">Current title & company</label>
            <input
              type="text"
              id="mt"
              placeholder="Senior Engineer, Flipkart"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="g2">
          <div className="f">
            <label htmlFor="my">Years of experience</label>
            <input
              type="text"
              id="my"
              placeholder="7"
              value={yoe}
              onChange={(e) => setYoe(e.target.value)}
            />
          </div>
          <div className="f">
            <label htmlFor="ml">Location</label>
            <input
              type="text"
              id="ml"
              placeholder="Bangalore, India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="f">
          <label htmlFor="me">Education</label>
          <input
            type="text"
            id="me"
            placeholder="B.Tech CSE, IIT Bombay"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          />
        </div>

        <div className="f">
          <label htmlFor="ms">Skills & technologies</label>
          <input
            type="text"
            id="ms"
            placeholder="Python, Spark, ML, distributed systems, team lead"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>

        <div className="f">
          <label htmlFor="msm">Career summary</label>
          <textarea
            id="msm"
            rows="3"
            placeholder="Key roles, achievements, team size, impact metrics, what they've built..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          ></textarea>
        </div>

        <div className="f">
          <label htmlFor="msi">Platform signals</label>
          <input
            type="text"
            id="msi"
            placeholder="GitHub 800+ stars, 3 conference talks, open-source contributor"
            value={signals}
            onChange={(e) => setSignals(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn ghost" onClick={handleClear}>Clear</button>
          <button className="btn honey" onClick={handleAdd}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add candidate
          </button>
        </div>
      </div>

      <div id="ml-list">
        {candidates.length > 0 && (
          <div className="slbl" style={{ marginBottom: '10px' }}>
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} added
          </div>
        )}
        {candidates.map((c, i) => {
          const avData = getAvatar(c.name, i);
          return (
            <div key={i} className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
              <div
                className="av"
                style={{
                  width: '36px',
                  height: '36px',
                  fontSize: '13px',
                  background: avData.bg,
                  color: avData.color
                }}
              >
                {avData.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {c.title} {c.yoe ? `· ${c.yoe}y` : ''} {c.location ? `· ${c.location}` : ''}
                </div>
                {c.skills && c.skills !== 'not specified' && (
                  <div style={{ marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.skills.split(',').slice(0, 4).map((s, idx) => (
                      <span key={idx} className="tag">{s.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn ghost"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={() => removeCandidate(i)}
                aria-label={`Remove ${c.name}`}
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          );
        })}
      </div>

      {candidates.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button className="btn honey" onClick={runRanking}>
            <i className="ti ti-brain" aria-hidden="true"></i> Rank candidates ↗
          </button>
        </div>
      )}
    </div>
  );
};

export default AddManuallyView;
