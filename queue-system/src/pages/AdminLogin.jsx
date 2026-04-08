import React, { useState } from 'react';
import { Lock, Scissors, Mail, Eye, EyeOff, ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const C = {
  bg:      '#34271F',
  surface: '#3E2F25',
  border:  'rgba(221,197,162,0.12)',
  tan:     '#DDC5A2',
  cream:   '#EEE2D1',
  muted:   'rgba(238,226,209,0.35)',
  faint:   'rgba(238,226,209,0.06)',
};

const AdminLogin = ({ email, setEmail, password, setPassword, onLogin, onBack, authError, authLoading }) => {
  const [showPassword, setShowPassword]       = useState(false);
  const [mode, setMode]                       = useState('login'); 

  // Registration State
  const [regEmail, setRegEmail]               = useState('');
  const [regPassword, setRegPassword]         = useState('');
  const [regConfirm, setRegConfirm]           = useState('');
  const [regLoading, setRegLoading]           = useState(false);
  const [regError, setRegError]               = useState('');
  const [regSuccess, setRegSuccess]           = useState('');

  // Reset State
  const [resetEmail, setResetEmail]           = useState('');
  const [resetLoading, setResetLoading]       = useState(false);
  const [resetSuccess, setResetSuccess]       = useState('');
  const [resetError, setResetError]           = useState('');

  const inputStyle = {
    backgroundColor: C.faint,
    border: `1px solid ${C.border}`,
    color: C.cream,
  };

  // ─── LOGIN HANDLER ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin(); 
    } catch (err) {
      console.error("Login failed:", err.code);
    }
  };

  // ─── REGISTER HANDLER ───────────────────────────────────────
  const handleRegister = async () => {
    setRegError('');
    setRegSuccess('');

    if (!regEmail.trim() || !regPassword.trim() || regPassword !== regConfirm) {
      setRegError('Check your details or matching passwords.');
      return;
    }

    setRegLoading(true);
    try {
      const creds = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);

      // Create Admin Role in Firestore
      await setDoc(doc(db, 'users', creds.user.uid), {
        email: regEmail.trim(),
        role: 'admin',
        createdAt: new Date()
      });

      setRegSuccess('Staff Access Granted! Syncing...');
      
      // Auto-fill login fields
      setEmail(regEmail.trim());
      setPassword(regPassword);

      // Wait 2 seconds for Firestore to settle before allowing login
      setTimeout(() => {
        setMode('login');
      }, 2000);

    } catch (e) {
      setRegError(e.code === 'auth/email-already-in-use' ? 'Email taken.' : 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  // ─── FORGOT PASSWORD HANDLER ────────────────────────────────
  const handleForgotPassword = async () => {
    setResetError('');
    setResetSuccess('');
    if (!resetEmail.trim()) { setResetError('Email required.'); return; }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess('Reset link sent! Check your email.');
    } catch (e) {
      setResetError('User not found or error occurred.');
    } finally {
      setResetLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setRegError(''); setRegSuccess('');
    setResetError(''); setResetSuccess('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: C.bg }}>
      
      <div className="w-full max-w-sm z-10 p-8 rounded-[2.5rem]" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        
        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: C.tan }}>
                <Scissors className="w-8 h-8" style={{ color: C.bg }} />
              </div>
              <h2 className="text-2xl font-black text-cream" style={{ color: C.cream }}>Staff Portal</h2>
            </div>

            {authError && <p className="text-red-400 text-[10px] text-center mb-4 uppercase font-bold">{authError}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2" size={17} style={{ color: C.muted }} />
                <input type="email" placeholder="Staff Email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full py-4 pl-11 pr-4 rounded-2xl text-sm focus:outline-none" style={inputStyle} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={17} style={{ color: C.muted }} />
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full py-4 pl-11 pr-12 rounded-2xl text-sm focus:outline-none" style={inputStyle} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff size={17} style={{ color: C.muted }} /> : <Eye size={17} style={{ color: C.muted }} />}
                </button>
              </div>
              <div className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] font-bold uppercase" style={{ color: C.muted }}>Forgot Password?</button>
              </div>
              <button type="submit" disabled={authLoading} className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: C.tan, color: C.bg }}>
                {authLoading ? 'CONNECTING...' : <><ShieldCheck size={18} /> UNLOCK SYSTEM</>}
              </button>
            </form>
            <div className="mt-6 text-center">
               <button onClick={() => switchMode('register')} className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.tan }}>New Staff? Register Here</button>
            </div>
          </>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center" style={{ color: C.cream }}>Staff Signup</h2>
            {regError && <p className="text-red-400 text-xs text-center">{regError}</p>}
            {regSuccess && <p className="text-green-400 text-xs text-center">{regSuccess}</p>}
            <input type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full py-3 px-4 rounded-xl" style={inputStyle} />
            <input type="password" placeholder="Password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full py-3 px-4 rounded-xl" style={inputStyle} />
            <input type="password" placeholder="Confirm Password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className="w-full py-3 px-4 rounded-xl" style={inputStyle} />
            <button onClick={handleRegister} disabled={regLoading} className="w-full py-4 rounded-2xl font-bold" style={{ backgroundColor: C.tan, color: C.bg }}>
              {regLoading ? 'SYNCING...' : 'CREATE STAFF ACCOUNT'}
            </button>
            <button onClick={() => switchMode('login')} className="w-full text-xs text-muted flex items-center justify-center gap-2" style={{ color: C.muted }}>
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center" style={{ color: C.cream }}>Recovery</h2>
            {resetError && <p className="text-red-400 text-xs text-center">{resetError}</p>}
            {resetSuccess && <p className="text-green-400 text-xs text-center">{resetSuccess}</p>}
            <input type="email" placeholder="Staff Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full py-3 px-4 rounded-xl" style={inputStyle} />
            <button onClick={handleForgotPassword} disabled={resetLoading} className="w-full py-4 rounded-2xl font-bold" style={{ backgroundColor: C.tan, color: C.bg }}>
              {resetLoading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
            <button onClick={() => switchMode('login')} className="w-full text-xs text-muted flex items-center justify-center gap-2" style={{ color: C.muted }}>
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;