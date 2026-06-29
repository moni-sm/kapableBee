import React from 'react';
import { useJob } from '../context/JobContext';

const Sidebar = () => {
  const { activeTab, setActiveTab, candidates, files, results } = useJob();

  const navItems = [
    { id: 'jd', label: 'Job description', icon: 'ti-file-description', pip: null },
    { id: 'upload', label: 'Upload dataset', icon: 'ti-cloud-upload', pip: files.length || '0' },
    { id: 'manual', label: 'Add manually', icon: 'ti-user-plus', pip: candidates.length || '0' },
    { id: 'results', label: 'Shortlist', icon: 'ti-list-numbers', pip: results.length > 0 ? results.length : '—', lit: results.length > 0 }
  ];

  return (
    <div className="sidebar" role="navigation" aria-label="Main Navigation">
      <div className="brand">
        <div className="brand-row">
          <svg width="34" height="34" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <ellipse cx="28" cy="34" rx="14" ry="17" fill="#F5A623"/>
            <rect x="15" y="27" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.16"/>
            <rect x="15" y="36" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.16"/>
            <ellipse cx="15" cy="22" rx="9" ry="5.5" fill="#D4EEFF" transform="rotate(-22 15 22)"/>
            <ellipse cx="41" cy="22" rx="9" ry="5.5" fill="#D4EEFF" transform="rotate(22 41 22)"/>
            <ellipse cx="15" cy="22" rx="9" ry="5.5" fill="none" stroke="#378ADD" strokeWidth="1" opacity="0.7" transform="rotate(-22 15 22)"/>
            <ellipse cx="41" cy="22" rx="9" ry="5.5" fill="none" stroke="#378ADD" strokeWidth="1" opacity="0.7" transform="rotate(22 41 22)"/>
            <ellipse cx="28" cy="17" rx="6.5" ry="6" fill="#F5A623"/>
            <circle cx="25" cy="15.5" r="1.4" fill="#1A1A1A" opacity="0.65"/>
            <circle cx="31" cy="15.5" r="1.4" fill="#1A1A1A" opacity="0.65"/>
            <path d="M25 13 Q28 11 31 13" stroke="#1A1A1A" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.35"/>
          </svg>
          <div>
            <div className="wm">Kapable<span>Bee</span></div>
            <div className="wm-sub">Talent intelligence</div>
          </div>
        </div>
      </div>

      <div className="nav-wrap">
        <div className="nlbl">Setup</div>
        {navItems.slice(0, 3).map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`ni ${activeTab === item.id ? 'on' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true"></i>
            {item.label}
            {item.pip !== null && (
              <span className={`pip ${item.lit ? 'lit' : ''}`}>
                {item.pip}
              </span>
            )}
          </button>
        ))}

        <div className="nlbl" style={{ marginTop: '14px' }}>Results</div>
        {navItems.slice(3).map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`ni ${activeTab === item.id ? 'on' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true"></i>
            {item.label}
            {item.pip !== null && (
              <span className={`pip ${item.lit ? 'lit' : ''}`}>
                {item.pip}
              </span>
            )}
          </button>
        ))}

        {/* Recruiter Authentication Section Removed */}
      </div>

      <div className="sfoot">
        <p>
          <span className="hdot"></span>
          Powered by Django & React
          <br />
          india.run challenge
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
