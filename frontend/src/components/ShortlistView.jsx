import React, { useEffect, useState, useMemo } from 'react';
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [minYoe, setMinYoe] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [selectedGreenFlag, setSelectedGreenFlag] = useState('');
  const [hideRedFlags, setHideRedFlags] = useState(false);
  const [sortBy, setSortBy] = useState('overall_score');

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

  // Filter and sort computation
  const filteredAndSortedResults = useMemo(() => {
    let list = [...results];

    // Apply Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.skills && r.skills.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.education && r.education.toLowerCase().includes(q)) ||
        (r.rationale && r.rationale.toLowerCase().includes(q))
      );
    }

    // Apply YOE Filter
    if (minYoe > 0) {
      list = list.filter(r => {
        let val = parseInt(r.yoe);
        if (isNaN(val)) val = 0;
        return val >= minYoe;
      });
    }

    // Apply Min Score Filter
    if (minScore > 0) {
      list = list.filter(r => r.overall_score >= minScore);
    }

    // Apply Green Flag Filter
    if (selectedGreenFlag) {
      list = list.filter(r => 
        r.green_flags && r.green_flags.some(flag => flag.toLowerCase().includes(selectedGreenFlag.toLowerCase()))
      );
    }

    // Apply Red Flag Filter
    if (hideRedFlags) {
      list = list.filter(r => !r.red_flags || r.red_flags.length === 0);
    }

    // Apply Sorting
    list.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'overall_score') {
        valA = a.overall_score;
        valB = b.overall_score;
      } else if (sortBy === 'yoe') {
        valA = parseInt(a.yoe) || 0;
        valB = parseInt(b.yoe) || 0;
      } else {
        // dimensions
        valA = a.dimensions?.[sortBy] || 0;
        valB = b.dimensions?.[sortBy] || 0;
      }
      
      // Secondary sort by rank to keep stable ranking order
      if (valB === valA) {
        return (a.rank || 0) - (b.rank || 0);
      }
      return valB - valA; // Descending order
    });

    return list;
  }, [results, searchQuery, minYoe, minScore, selectedGreenFlag, hideRedFlags, sortBy]);

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

  const avgScore = filteredAndSortedResults.length > 0 
    ? Math.round(filteredAndSortedResults.reduce((acc, curr) => acc + curr.overall_score, 0) / filteredAndSortedResults.length)
    : 0;
  const bestScore = filteredAndSortedResults[0]?.overall_score || '—';

  return (
    <div id="ra" className="view-content animate-fade-in">
      {results.length > 0 && (
        <>
          {/* Stats Bar */}
          <div className="g4" style={{ marginBottom: '20px' }}>
            <div className="stat">
              <div className="stat-l">Matches Found</div>
              <div className="stat-v">{filteredAndSortedResults.length}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Top Shortlist (Original)</div>
              <div className="stat-v">{filteredAndSortedResults.filter((r) => r.rank <= 3).length}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Filtered Avg Score</div>
              <div className="stat-v">{avgScore}</div>
            </div>
            <div className="stat">
              <div className="stat-l">Filtered Best Score</div>
              <div className="stat-v" style={{ color: '#F5A623' }}>{bestScore}</div>
            </div>
          </div>

          {/* Interactive Filters and Sorting Panel */}
          <div className="filter-panel animate-fade-in">
            <div className="filter-row">
              <div className="filter-group" style={{ flex: '2 1 280px' }}>
                <label htmlFor="search-input">Search Candidates</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="search-input"
                    type="text"
                    className="filter-input"
                    placeholder="Search name, title, location, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-select">Re-Sort / Rank By</label>
                <select
                  id="sort-select"
                  className="filter-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="overall_score">Overall Fit Score</option>
                  <option value="experience_fit">Experience Fit</option>
                  <option value="skills_match">Skills Match</option>
                  <option value="trajectory">Career Trajectory</option>
                  <option value="signals_culture">Signals & Culture</option>
                  <option value="yoe">Years of Experience</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="green-flag-select">Green Flag Priority</label>
                <select
                  id="green-flag-select"
                  className="filter-input"
                  value={selectedGreenFlag}
                  onChange={(e) => setSelectedGreenFlag(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Any Candidate</option>
                  <option value="open to work">Actively Open to Work</option>
                  <option value="immediately">Available Immediately</option>
                  <option value="responsive">Recruiter Responsive</option>
                  <option value="relocate">Willing to Relocate</option>
                  <option value="acceptance">Strong Acceptance History</option>
                </select>
              </div>
            </div>

            <div className="filter-row" style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '12px', marginTop: '4px' }}>
              <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="yoe-range" style={{ margin: 0, whiteSpace: 'nowrap' }}>Min YOE: <strong style={{ color: 'var(--theme-blue-text)', fontSize: '13px' }}>{minYoe}+ yrs</strong></label>
                  <input
                    id="yoe-range"
                    type="range"
                    min="0"
                    max="15"
                    value={minYoe}
                    onChange={(e) => setMinYoe(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--theme-blue-subtext)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="score-range" style={{ margin: 0, whiteSpace: 'nowrap' }}>Min Score: <strong style={{ color: 'var(--theme-blue-text)', fontSize: '13px' }}>{minScore}+</strong></label>
                  <input
                    id="score-range"
                    type="range"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--theme-blue-subtext)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="filter-group" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                <label className="checkbox-label" htmlFor="hide-red-flags-checkbox">
                  <input
                    id="hide-red-flags-checkbox"
                    type="checkbox"
                    checked={hideRedFlags}
                    onChange={(e) => setHideRedFlags(e.target.checked)}
                  />
                  Hide candidates with Red Flags
                </label>
              </div>
            </div>
          </div>

          {/* Results List */}
          {filteredAndSortedResults.length === 0 ? (
            <div className="empty" style={{ background: 'var(--color-background-secondary)', borderRadius: '12px', padding: '40px 20px' }}>
              <i className="ti ti-filter-off" aria-hidden="true" style={{ fontSize: '32px' }}></i>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                No matching candidates
              </div>
              <div style={{ fontSize: '12px' }}>
                Try relaxing your filter parameters or search queries.
              </div>
            </div>
          ) : (
            <div className="results-list">
              {filteredAndSortedResults.map((r, index) => {
                const rk = r.rank;
                const isTop3 = rk <= 3;
                const rcClass = isTop3 ? `r${rk}` : '';
                const rnClass = isTop3 ? `rn${rk}` : 'rno';
                const spClass = isTop3 ? `sp${rk}` : 'spo';
                const barColor = rk === 1 ? '#1D9E75' : rk === 2 ? '#378ADD' : rk === 3 ? '#7F77DD' : '#888780';
                const avData = getAvatar(r.name, index);

                return (
                  <div key={rk} className={`rc ${rcClass} animate-fade-in`} style={{ animationDelay: `${index * 0.05}s` }}>
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
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.name}</span>
                          {r.yoe && r.yoe !== '?' && (
                            <span style={{ fontSize: '11px', color: 'var(--theme-blue-text)', background: 'var(--theme-blue-light)', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                              {r.yoe} YOE
                            </span>
                          )}
                          {r.location && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              <i className="ti ti-map-pin" style={{ fontSize: '11px', marginRight: '2px' }} aria-hidden="true"></i>
                              {r.location}
                            </span>
                          )}
                        </div>
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

                    {r.skills && (
                      <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Key Skills:</strong> {r.skills}
                      </div>
                    )}

                    <div className="rationale" style={{ marginTop: '8px' }}>{r.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShortlistView;
