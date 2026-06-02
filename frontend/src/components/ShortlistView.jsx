import React, { useEffect, useState } from 'react';
import { useJob } from '../context/JobContext';
import { getAvatar } from './AddManuallyView';

const LOADING_MESSAGES = [
  'Analyzing job requirements...',
  'Reading candidate profiles...',
  'Evaluating career trajectories...',
  'Scoring fit dimensions...',
  'Building your shortlist...'
];

const ShortlistView = () => {
  const {
    candidates,
    jobDescription,
    results,
    rankingState,
    finalizeRanking,
    runRanking
  } = useJob();

  const [messageIdx, setMessageIdx] = useState(0);

  // Automatic ranking trigger when view is loaded and no results exist yet
  useEffect(() => {
    if (rankingState === 'idle' && results.length === 0 && candidates.length > 0 && jobDescription.trim()) {
      runRanking();
    }
  }, [rankingState, results.length, candidates.length, jobDescription]);

  // Handle loading message cycling and finalized calculation timing
  useEffect(() => {
    let messageInterval;
    let finalizeTimeout;

    if (rankingState === 'loading') {
      setMessageIdx(0);
      
      messageInterval = setInterval(() => {
        setMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);

      // Finalize ranking after completing one cycle of messages
      finalizeTimeout = setTimeout(() => {
        finalizeRanking();
      }, 7500);
    }

    return () => {
      clearInterval(messageInterval);
      clearTimeout(finalizeTimeout);
    };
  }, [rankingState]);

  if (rankingState === 'idle' && results.length === 0) {
    return (
      <div id="ra" className="view-content animate-fade-in">
        <div className="empty">
          <i className="ti ti-list-search" aria-hidden="true"></i>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
            Your shortlist will appear here
          </div>
          <div style={{ fontSize: '13px' }}>
            Add a Job Description and candidates, then run the ranking algorithm.
          </div>
        </div>
      </div>
    );
  }

  if (rankingState === 'loading') {
    return (
      <div id="ra" className="view-content animate-fade-in">
        <div className="loading">
          <div className="big-spin"></div>
          <div id="rs-m" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
            {LOADING_MESSAGES[messageIdx]}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--theme-blue-subtext)' }}>
            Usually takes 5–10 seconds
          </div>
        </div>
      </div>
    );
  }

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.overall_score, 0) / results.length)
    : 0;
  const bestScore = results[0]?.overall_score || '—';

  return (
    <div id="ra" className="view-content animate-fade-in">
      {results.length > 0 && (
        <>
          <div className="g4" style={{ marginBottom: '20px' }}>
            <div className="stat">
              <div className="stat-l">Ranked</div>
              <div className="stat-v">{results.length}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Top shortlist</div>
              <div className="stat-v">{results.filter((r) => r.rank <= 3).length}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Avg score</div>
              <div className="stat-v">{avgScore}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Best match</div>
              <div className="stat-v" style={{ color: '#F5A623' }}>{bestScore}</div>
            </div>
          </div>

          <div className="results-list">
            {results.map((r, index) => {
              const rk = r.rank;
              const isTop3 = rk <= 3;
              const rcClass = isTop3 ? `r${rk}` : '';
              const rnClass = isTop3 ? `rn${rk}` : 'rno';
              const spClass = isTop3 ? `sp${rk}` : 'spo';
              const barColor = rk === 1 ? '#1D9E75' : rk === 2 ? '#378ADD' : rk === 3 ? '#7F77DD' : '#888780';
              const avData = getAvatar(r.name, index);

              return (
                <div key={rk} className={`rc ${rcClass} animate-fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div className={`rn ${rnClass}`}>{rk}</div>
                    <div
                      className="av"
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '12px',
                        background: avData.bg,
                        color: avData.color
                      }}
                    >
                      {avData.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {r.title}
                      </div>
                    </div>
                    <span className={`sp ${spClass}`}>{r.overall_score}/100</span>
                  </div>

                  <div className="bar-bg">
                    <div className="bar-f" style={{ width: `${r.overall_score}%`, backgroundColor: barColor }}></div>
                  </div>

                  <div className="dim-g">
                    <div className="dim-b">
                      <div className="dim-n">Experience Fit</div>
                      <div className="dim-s">{r.dimensions.experience_fit}</div>
                    </div>
                    <div className="dim-b">
                      <div className="dim-n">Skills Match</div>
                      <div className="dim-s">{r.dimensions.skills_match}</div>
                    </div>
                    <div className="dim-b">
                      <div className="dim-n">Trajectory</div>
                      <div className="dim-s">{r.dimensions.trajectory}</div>
                    </div>
                    <div className="dim-b">
                      <div className="dim-n">Signals & Culture</div>
                      <div className="dim-s">{r.dimensions.signals_culture}</div>
                    </div>
                  </div>

                  {r.green_flags && r.green_flags.length > 0 && (
                    <div style={{ margin: '8px 0 4px' }}>
                      {r.green_flags.map((flag, fIdx) => (
                        <span key={fIdx} className="fl fg">
                          <i className="ti ti-check" aria-hidden="true"></i>
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.red_flags && r.red_flags.length > 0 && (
                    <div style={{ margin: '4px 0' }}>
                      {r.red_flags.map((flag, fIdx) => (
                        <span key={fIdx} className="fl fr">
                          <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="rationale">{r.rationale}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ShortlistView;
