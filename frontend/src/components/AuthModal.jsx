import React, { useState } from 'react';
import { useJob } from '../context/JobContext';

const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useJob();
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      if (isLoginTab) {
        const success = await login(username, password);
        if (success) {
          onClose();
        } else {
          setError('Invalid credentials');
        }
      } else {
        const success = await register(username, password, email);
        if (success) {
          setIsLoginTab(true);
          setUsername('');
          setPassword('');
          setEmail('');
          alert('Registration successful! Please login.');
        } else {
          setError('Registration failed. Username may already exist.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(12, 26, 46, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          background: 'var(--color-background-primary)',
          borderColor: 'var(--color-border-secondary)',
          boxShadow: '0 20px 40px rgba(12, 26, 46, 0.15)',
          borderRadius: '16px',
          margin: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {isLoginTab ? 'Sign In to KapableBee' : 'Create Recruiter Account'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: '18px'
            }}
            aria-label="Close modal"
          >
            <i className="ti ti-x"></i>
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-tertiary)', marginBottom: '18px' }}>
          <button
            onClick={() => { setIsLoginTab(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              color: isLoginTab ? 'var(--theme-blue-subtext)' : 'var(--color-text-secondary)',
              borderBottom: isLoginTab ? '2px solid var(--theme-blue-subtext)' : 'none'
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              color: !isLoginTab ? 'var(--theme-blue-subtext)' : 'var(--color-text-secondary)',
              borderBottom: !isLoginTab ? '2px solid var(--theme-blue-subtext)' : 'none'
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              className="fl fr"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          <div className="f">
            <label htmlFor="auth-username">Username</label>
            <input
              type="text"
              id="auth-username"
              placeholder="recruiter_jane"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!isLoginTab && (
            <div className="f">
              <label htmlFor="auth-email">Email Address <span style={{ opacity: 0.6 }}>(optional)</span></label>
              <input
                type="text"
                id="auth-email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="f">
            <label htmlFor="auth-password">Password</label>
            <input
              type="password"
              id="auth-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13.5px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-background-primary)',
                transition: 'all .15s ease'
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn honey"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
            disabled={loading}
          >
            {loading ? (
              <span className="spin" style={{ width: '14px', height: '14px' }}></span>
            ) : isLoginTab ? (
              <>
                <i className="ti ti-login"></i> Sign In
              </>
            ) : (
              <>
                <i className="ti ti-user-plus"></i> Register
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
