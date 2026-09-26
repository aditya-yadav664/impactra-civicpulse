import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (title: string, subtitle?: string) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onToast }) => {
  const {
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signInWithSimpleEmail,
  } = useAuth();

  const [emailTab, setEmailTab] = useState<'simple' | 'password'>('simple');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firebaseOperationDisabled, setFirebaseOperationDisabled] = useState(false);

  // Prevent background scrolling and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        onToast?.(
          'Signed in with Google',
          `Welcome, ${loggedUser.displayName || loggedUser.email}`
        );
        onClose();
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const msg = err?.message || '';
      if (!msg.includes('closed') && !msg.includes('dismissed')) {
        setError('Please allow browser popups or check your internet connection to sign in with Google.');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleSimpleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address (e.g., name@gmail.com)');
      return;
    }

    setLoadingEmail(true);
    try {
      const user = await signInWithSimpleEmail(cleanEmail, displayName.trim());
      onToast?.('Signed in with Email', `Welcome, ${user.displayName || user.email}!`);
      onClose();
    } catch (err: any) {
      console.error('Simple email login error:', err);
      setError(err?.message || 'Failed to sign in with email. Please try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handlePasswordAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFirebaseOperationDisabled(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoadingEmail(true);
    try {
      if (authMode === 'signup') {
        const user = await signUpWithEmailPassword(cleanEmail, password, displayName.trim());
        if (user) {
          onToast?.('Account Created', `Welcome to CivicPulse, ${user.displayName || user.email}!`);
          onClose();
        }
      } else {
        const user = await signInWithEmailPassword(cleanEmail, password);
        if (user) {
          onToast?.('Signed In', `Welcome back, ${user.displayName || user.email}!`);
          onClose();
        }
      }
    } catch (err: any) {
      console.warn('Firebase email auth notice:', err);
      const code = err?.code || '';

      if (code === 'auth/operation-not-allowed') {
        setFirebaseOperationDisabled(true);
        setError(
          'Email/Password sign-in method is not enabled in Firebase Console. You can use the "Simple Email ID" tab to sign in immediately without a password!'
        );
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you do not have an account yet, switch to "Create Account".');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please switch to "Sign In".');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const fallbackToSimpleEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setEmailTab('simple');
      return;
    }
    setLoadingEmail(true);
    try {
      const user = await signInWithSimpleEmail(email.trim(), displayName.trim());
      onToast?.('Signed in with Email ID', `Welcome, ${user.displayName || user.email}!`);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not complete sign in');
    } finally {
      setLoadingEmail(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-modalBackdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-modalContent backdrop-blur-2xl ring-1 ring-white/10 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative ambient glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-5 border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/40 via-slate-900/40 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Sign In to CivicPulse
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify your civic identity and track your reports live
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="leading-relaxed">{error}</p>
                {firebaseOperationDisabled && (
                  <button
                    type="button"
                    onClick={fallbackToSimpleEmail}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-[11px] transition-colors shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Sign in with Simple Email ID instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* OPTION 1: GOOGLE SIGN IN (HIGH CONTRAST & CLEAR VISIBILITY) */}
          {/* ========================================================= */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Option 1</span>
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Recommended
                </span>
              </label>
              <span className="text-[11px] text-slate-400">1-Click Fast Verification</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingGoogle || loadingEmail}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl shadow-xl shadow-black/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] border border-slate-200 cursor-pointer disabled:opacity-50"
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12c0 2.02.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* DIVIDER */}
          {/* ========================================================= */}
          <div className="relative flex items-center justify-center my-1">
            <div className="w-full border-t border-slate-800"></div>
            <span className="absolute px-3 bg-slate-900 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              or continue with email
            </span>
          </div>

          {/* ========================================================= */}
          {/* OPTION 2: EMAIL LOGIN (SIMPLE OR PASSWORD) */}
          {/* ========================================================= */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Option 2</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Email ID
                </span>
              </label>
            </div>

            {/* Email Mode Selection Tabs */}
            <div className="flex bg-slate-950/90 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setEmailTab('simple');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  emailTab === 'simple'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simple Email ID</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailTab('password');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  emailTab === 'password'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Email & Password</span>
              </button>
            </div>

            {/* TAB 1: SIMPLE EMAIL ID LOGIN */}
            {emailTab === 'simple' ? (
              <form onSubmit={handleSimpleEmailSubmit} className="space-y-3.5">
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300/90 leading-relaxed">
                  Fast citizen sign-in: Just enter your email ID! No password required. Your email will be attached to all reports and upvotes you submit.
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Your Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      required
                      className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Your Name <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Aditya Yadav"
                      className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingEmail || loadingGoogle}
                  className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-500/50 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-1 cursor-pointer"
                >
                  {loadingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Sign In with Email ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* TAB 2: EMAIL & PASSWORD */
              <form onSubmit={handlePasswordAuthSubmit} className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {authMode === 'signin' ? 'Sign in to account' : 'Register new account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setError(null);
                    }}
                    className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                  >
                    {authMode === 'signin' ? 'Need an account? Sign Up' : 'Already have account? Sign In'}
                  </button>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Aditya Yadav"
                        className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      required
                      className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full h-11 pl-10 pr-10 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingEmail || loadingGoogle}
                  className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-500/50 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-1 cursor-pointer"
                >
                  {loadingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : authMode === 'signup' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create Account & Sign In</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign In with Password</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Encrypted resident authentication • Public reports are verified</span>
        </div>
      </div>
    </div>
  );

  // Render via Portal directly into document.body to ensure true centering and top-level backdrop blur
  return createPortal(modalContent, document.body);
};
