import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { user, signup, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-bold text-bg text-lg">₹</div>
          <div className="font-bold text-lg">Money Rescue</div>
        </div>
        <div className="card">
          <h1 className="text-lg font-bold mb-1">Create your account</h1>
          <p className="text-sm text-muted mb-5">Each family member should sign up separately — your data stays private to your own account.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="field-label">Name</label>
              <input className="field-input" type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="mb-3">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              <div className="text-xs text-muted2 mt-1">At least 8 characters.</div>
            </div>
            {error ? <div className="text-bad text-sm mb-3">{error}</div> : null}
            <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <div className="text-center text-sm text-muted mt-5">
          Already have an account? <Link to="/login" className="text-accent font-semibold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
