import React, { useState, useRef } from 'react';
import { useJob } from '../context/JobContext';

const UploadDatasetView = () => {
  const { files, parseFile, loadSampleDataset, runRanking } = useJob();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        parseFile(file.name, e.target.result, file.size);
      };
      reader.readAsText(file);
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div id="v-upload" className="view-content animate-fade-in">
      <div
        className={`up-zone ${dragActive ? 'drag' : ''}`}
        id="dz"
        onClick={triggerFileInput}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <i className="ti ti-cloud-upload uz-i" aria-hidden="true"></i>
        <p className="uz-t">Drop files here or click to browse</p>
        <small className="uz-s">CSV · JSON · TXT — multiple files OK</small>
      </div>
      <input
        type="file"
        id="fi"
        ref={fileInputRef}
        accept=".csv,.json,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ margin: '18px 0 8px' }} className="slbl">Supported formats</div>
      <div className="g3" style={{ marginBottom: '16px' }}>
        <div className="card" style={{ padding: '12px 14px', borderColor: '#D4EEFF' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0C1A2E' }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize: '14px', verticalAlign: '-2px', marginRight: '4px', color: '#F5A623' }} aria-hidden="true"></i>
            CSV
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>name, title, skills, yoe, summary columns</div>
        </div>
        <div className="card" style={{ padding: '12px 14px', borderColor: '#D4EEFF' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0C1A2E' }}>
            <i className="ti ti-braces" style={{ fontSize: '14px', verticalAlign: '-2px', marginRight: '4px', color: '#F5A623' }} aria-hidden="true"></i>
            JSON
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Array of candidate objects</div>
        </div>
        <div className="card" style={{ padding: '12px 14px', borderColor: '#D4EEFF' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0C1A2E' }}>
            <i className="ti ti-file-text" style={{ fontSize: '14px', verticalAlign: '-2px', marginRight: '4px', color: '#F5A623' }} aria-hidden="true"></i>
            TXT
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Free-form, blank-line separated</div>
        </div>
      </div>

      <div id="fl">
        {files.map((file, idx) => (
          <div key={idx} className="fi animate-fade-in">
            <i className="ti ti-file-text" aria-hidden="true"></i>
            <span className="fi-n">{file.name}</span>
            <span className="fi-m">{file.size}</span>
            <span className="fl fg" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', background: '#E1F5EE', color: '#085041' }}>
              <i className="ti ti-check" aria-hidden="true"></i>
              {file.candidatesCount} added
            </span>
          </div>
        ))}
      </div>

      <div style={{ paddingTop: '16px', borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: '8px' }}>
        <div className="slbl">Built-in sample dataset</div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderColor: '#D4EEFF', background: '#EAF5FF' }}>
          <svg width="30" height="30" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
            <ellipse cx="28" cy="34" rx="14" ry="17" fill="#F5A623"/>
            <rect x="15" y="27" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.14"/>
            <rect x="15" y="36" width="26" height="5" rx="2.5" fill="#1A1A1A" opacity="0.14"/>
            <ellipse cx="15" cy="22" rx="9" ry="5.5" fill="#D4EEFF" transform="rotate(-22 15 22)"/>
            <ellipse cx="41" cy="22" rx="9" ry="5.5" fill="#D4EEFF" transform="rotate(22 41 22)"/>
            <ellipse cx="28" cy="17" rx="6.5" ry="6" fill="#F5A623"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0C1A2E' }}>7 Indian tech candidates</div>
            <div style={{ fontSize: '11px', color: '#378ADD', marginTop: '2px' }}>Swiggy · Razorpay · PhonePe · Ola · Freshworks</div>
          </div>
          <button className="btn honey" onClick={loadSampleDataset} style={{ padding: '5px 12px', fontSize: '12px' }}>
            <i className="ti ti-sparkles" aria-hidden="true"></i> Load
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
        <button className="btn honey" onClick={runRanking}>
          <i className="ti ti-brain" aria-hidden="true"></i> Rank candidates ↗
        </button>
      </div>
    </div>
  );
};

export default UploadDatasetView;
