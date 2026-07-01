import React, { useCallback } from 'react';
import { useJob } from './context/JobContext';
import Sidebar from './components/Sidebar';
import JobDescriptionView from './components/JobDescriptionView';
import UploadDatasetView from './components/UploadDatasetView';
import AddManuallyView from './components/AddManuallyView';
import ShortlistView from './components/ShortlistView';

const TITLES = {
  jd: 'Job description',
  upload: 'Dataset upload',
  manual: 'Add manually',
  results: 'Shortlist'
};

const SUBS = {
  jd: "Define the role you're hiring for",
  upload: 'Import candidate profiles from files',
  manual: 'Enter candidates one by one',
  results: 'AI-powered talent shortlist'
};

function App() {
  const { activeTab, results, rankingState, runRanking, toastMessage } = useJob();

  const downloadRankedList = useCallback(() => {
    if (!results || results.length === 0) return;

    const headers = ['candidate_id', 'rank', 'score', 'reasoning'];
    const rows = results.map(r => {
      const scoreRatio = r.overall_score != null ? (r.overall_score / 100) : '';
      return [
        `"${(r.candidate_id || r.name || '').replace(/"/g, '""')}"`,
        r.rank ?? '',
        scoreRatio,
        `"${(r.rationale || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ranked_candidates_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'jd':
        return <JobDescriptionView />;
      case 'upload':
        return <UploadDatasetView />;
      case 'manual':
        return <AddManuallyView />;
      case 'results':
        return <ShortlistView />;
      default:
        return <JobDescriptionView />;
    }
  };

  return (
    <div className="shell">
      <Sidebar />

      <main className="main" aria-label="Main Content Area">
        <div className="topbar">
          <div>
            <h1 className="tb-title" id="tb-t">{TITLES[activeTab]}</h1>
            <div className="tb-sub" id="tb-s">{SUBS[activeTab]}</div>
          </div>
          <div className="tb-right" id="tb-a">
            {activeTab === 'results' && results.length > 0 && rankingState !== 'loading' && (
              <>
                <button
                  id="download-ranked-list-btn"
                  className="btn honey"
                  onClick={downloadRankedList}
                  aria-label="Download ranked list as CSV"
                >
                  <i className="ti ti-download" aria-hidden="true"></i> Download
                </button>
                <button className="btn ghost" onClick={runRanking} aria-label="Re-rank candidates">
                  <i className="ti ti-refresh" aria-hidden="true"></i> Re-rank
                </button>
              </>
            )}
          </div>
        </div>

        <div className="view">
          {renderActiveView()}
        </div>
      </main>

      {/* Floating Action/Toast Alert */}
      {toastMessage && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0C1A2E',
            color: '#D4EEFF',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '12.5px',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            border: '0.5px solid #378ADD',
            boxShadow: '0 8px 24px rgba(12, 26, 46, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span style={{ color: '#F5A623', fontSize: '10px' }}>●</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
