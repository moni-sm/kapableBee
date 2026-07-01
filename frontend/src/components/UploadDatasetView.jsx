import React, { useState, useRef } from 'react';
import { useJob } from '../context/JobContext';

const UploadDatasetView = () => {
  const { files, parseFile, runRanking, uploadState, uploadProgress } = useJob();
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
      {uploadState !== 'idle' ? (
        <div className="card upload-progress-card animate-fade-in" style={{
          padding: '30px 24px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid #D4EEFF',
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '20px',
          boxShadow: '0 8px 32px 0 rgba(12, 26, 46, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
            {uploadState === 'uploading' && (
              <span className="spin" style={{ width: '18px', height: '18px', borderTopColor: 'var(--theme-amber)' }}></span>
            )}
            {uploadState === 'completed' && <i className="ti ti-circle-check" style={{ color: '#085041', fontSize: '22px' }}></i>}
            {uploadState === 'failed' && <i className="ti ti-circle-x" style={{ color: '#791F1F', fontSize: '22px' }}></i>}
            
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#0C1A2E' }}>
              {uploadState === 'uploading' && 'Uploading Candidate Dataset...'}
              {uploadState === 'completed' && 'Upload Completed Successfully!'}
              {uploadState === 'failed' && 'Upload Failed. Please try again.'}
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '8px',
            background: '#EAF5FF',
            borderRadius: '100px',
            overflow: 'hidden',
            marginBottom: '10px'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              background: uploadState === 'failed' ? '#791F1F' : 'linear-gradient(90deg, #F5A623 0%, #FFAE33 100%)',
              transition: 'width 0.4s ease-in-out',
              borderRadius: '100px'
            }}></div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>{uploadProgress}% processed</span>
            <span>Please do not close this window</span>
          </div>
        </div>
      ) : (
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
      )}
      <input
        type="file"
        id="fi"
        ref={fileInputRef}
        accept=".csv,.json,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={uploadState !== 'idle'}
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


      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
        <button className="btn honey" onClick={runRanking} disabled={uploadState !== 'idle'}>
          <i className="ti ti-brain" aria-hidden="true"></i> Rank candidates ↗
        </button>
      </div>
    </div>
  );
};

export default UploadDatasetView;
