import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not sign in.');
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
          <h1 className="text-lg font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted mb-5">Sign in to your private account.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="mb-4">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error ? <div className="text-bad text-sm mb-3">{error}</div> : null}
            <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <div className="text-center text-sm text-muted mt-5">
          New here? <Link to="/signup" className="text-accent font-semibold">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
