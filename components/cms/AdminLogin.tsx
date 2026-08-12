'use client';
import { useState } from 'react';

interface AdminLoginProps {
  onSuccess: () => void;
}

type RecoveryMode = 'username' | 'password' | null;
type RecoveryStep = 'request' | 'verify' | 'result';

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(null);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('request');
  const [recoveredValue, setRecoveredValue] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
      else setError(data.message || 'Invalid credentials');
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const action = recoveryMode === 'username' ? 'request-username-otp' : 'request-password-otp';
    const body = recoveryMode === 'username' ? { action, email } : { action, username };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) setRecoveryStep('verify');
      else setError(data.message);
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const action = recoveryMode === 'username' ? 'verify-username-otp' : 'verify-password-otp';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveredValue(data.username || data.password);
        setRecoveryStep('result');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const resetRecovery = () => {
    setRecoveryMode(null);
    setRecoveryStep('request');
    setRecoveredValue('');
    setError('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-md p-8 bg-[#111111] border border-[#333333] flex flex-col gap-6">
        
        {!recoveryMode ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Sign In</h1>
              <p className="text-gray-400 text-sm">Enter your credentials to manage the site</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                required
              />
              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#C5A059] hover:bg-[#af8d4b] transition-colors text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setRecoveryMode('username')} className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-widest transition-colors">Forgot Username?</button>
              <button onClick={() => setRecoveryMode('password')} className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-widest transition-colors">Forgot Password?</button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">
                {recoveryMode === 'username' ? 'Find Username' : 'Reset Password'}
              </h1>
              <p className="text-gray-400 text-xs tracking-wide uppercase">Step {recoveryStep === 'request' ? '1' : recoveryStep === 'verify' ? '2' : '3'}: {
                recoveryStep === 'request' ? 'Identify Account' : recoveryStep === 'verify' ? 'OTP Verification' : 'Success'
              }</p>
            </div>

            {recoveryStep === 'request' && (
              <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">
                  {recoveryMode === 'username' 
                    ? 'Enter the recovery email associated with your account.' 
                    : 'Enter your username to receive an OTP code.'}
                </p>
                <input
                  type={recoveryMode === 'username' ? 'email' : 'text'}
                  placeholder={recoveryMode === 'username' ? 'Recovery Email' : 'Username'}
                  value={recoveryMode === 'username' ? email : username}
                  onChange={(e) => recoveryMode === 'username' ? setEmail(e.target.value) : setUsername(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white focus:border-[#C5A059] focus:outline-none"
                  required
                />
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px]">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {recoveryStep === 'verify' && (
              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <p className="text-gray-400 text-sm">An OTP code has been sent. Please enter it below to verify your identity.</p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white text-center text-xl font-mono tracking-[0.5em] focus:border-[#C5A059] outline-none"
                  required
                  maxLength={6}
                />
                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-[10px]">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {recoveryStep === 'result' && (
              <div className="flex flex-col gap-6 text-center">
                <div className="p-4 bg-gray-900 border border-[#C5A059]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Your {recoveryMode} is</span>
                  <p className="text-2xl text-white font-mono font-bold tracking-tight">{recoveredValue}</p>
                </div>
                <button onClick={resetRecovery} className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-[10px]">Back to Login</button>
              </div>
            )}

            {recoveryStep !== 'result' && (
              <button onClick={resetRecovery} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest self-center transition-colors">Cancel</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
