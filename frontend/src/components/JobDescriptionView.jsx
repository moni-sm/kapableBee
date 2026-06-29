import React from 'react';
import { useJob } from '../context/JobContext';

const JobDescriptionView = () => {
  const {
    jobTitle,
    setJobTitle,
    company,
    setCompany,
    jobDescription,
    setJobDescription,
    keyPriorities,
    setKeyPriorities,
    applyPreset,
    setActiveTab
  } = useJob();

  const handleNext = () => {
    if (!jobDescription.trim()) {
      alert('Please fill out the Job description field before moving on.');
      return;
    }
    setActiveTab('upload');
  };

  return (
    <div id="v-jd" className="view-content">
      <div className="f animate-fade-in">
        <div className="slbl">Quick presets</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="pchip" id="preset-sde" onClick={() => applyPreset('sde')}>Senior SDE</button>
          <button className="pchip" id="preset-pm" onClick={() => applyPreset('pm')}>Product Manager</button>
          <button className="pchip" id="preset-ds" onClick={() => applyPreset('ds')}>Data Scientist</button>
          <button className="pchip" id="preset-ml" onClick={() => applyPreset('ml')}>ML Engineer</button>
          <button className="pchip" id="preset-em" onClick={() => applyPreset('em')}>Eng Manager</button>
          <button className="pchip" id="preset-ai-sr" onClick={() => applyPreset('ai_sr')} style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #0e2340 100%)', borderColor: '#378ADD', color: '#D4EEFF' }}>🤖 Senior AI Eng</button>
        </div>
      </div>

      <div className="g2">
        <div className="f">
          <label htmlFor="jt">Job title</label>
          <input
            type="text"
            id="jt"
            placeholder="Senior Software Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
        <div className="f">
          <label htmlFor="jc">Company / team</label>
          <input
            type="text"
            id="jc"
            placeholder="Series B fintech, Payments team"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
      </div>

      <div className="f">
        <label htmlFor="jd-textarea">Job description</label>
        <textarea
          id="jd-textarea"
          rows="10"
          placeholder="Paste the full JD — responsibilities, required skills, experience level, team context, culture signals. More detail = smarter ranking."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        ></textarea>
      </div>

      <div className="f">
        <label htmlFor="jp">
          Key priorities <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
        </label>
        <input
          type="text"
          id="jp"
          placeholder="e.g. distributed systems depth, startup experience, people management"
          value={keyPriorities}
          onChange={(e) => setKeyPriorities(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button className="btn honey" onClick={handleNext}>
          Next: add candidates <i className="ti ti-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
};

export default JobDescriptionView;
