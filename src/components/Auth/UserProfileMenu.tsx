import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, CheckCircle2, FileText, ChevronDown, Loader2, LogIn, Mail } from 'lucide-react';
import { SignInModal } from './SignInModal';

interface UserProfileMenuProps {
  onViewMyReports?: () => void;
  myReportsCount?: number;
  onToast?: (title: string, subtitle?: string) => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onViewMyReports,
  myReportsCount = 0,
  onToast,
}) => {
  const { user, isGoogleUser, isEmailUser, signOutUser, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      await signOutUser();
      onToast?.('Signed out', 'You are now browsing as a guest resident');
    } catch (err: any) {
      console.error('Sign-out error:', err);
      onToast?.('Sign-out Failed', err?.message);
    }
  };

  if (loading) {
    return (
      <div className="h-9 px-3 bg-slate-800/60 rounded-xl flex items-center justify-center border border-slate-700/60 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  // Not signed in: show clean "Sign In" option that opens modal with Google and Email options
  if (!user) {
    return (
      <>
        <button
          onClick={() => setSignInModalOpen(true)}
          className="h-9 px-3 sm:px-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-400/40 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Sign in with Google or Email ID to track and verify your civic incident reports"
        >
          <LogIn className="w-4 h-4 shrink-0 text-indigo-200" />
          <span>Sign In</span>
        </button>

        <SignInModal
          isOpen={signInModalOpen}
          onClose={() => setSignInModalOpen(false)}
          onToast={onToast}
        />
      </>
    );
  }

  // Signed in with Google or Email
  const displayName = user.displayName || user.email?.split('@')[0] || 'Citizen';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="h-9 px-2 sm:px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 hover:border-indigo-500/70 rounded-xl text-xs text-white flex items-center gap-2 transition-all shadow-sm"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-400/60"
          />
        ) : (
          <div
            className={`w-6 h-6 rounded-full text-white font-bold text-xs flex items-center justify-center ${
              isGoogleUser
                ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
            }`}
          >
            {initial}
          </div>
        )}

        <div className="flex items-center gap-1 text-left hidden sm:flex">
          <span className="font-semibold text-xs text-slate-100 max-w-[110px] truncate">
            {displayName}
          </span>
          {isGoogleUser ? (
            <span title="Verified Google Account">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </span>
          ) : (
            <span title="Verified Email Citizen">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </span>
          )}
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* User Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn backdrop-blur-md">
          {/* User Info Header */}
          <div className="p-2.5 border-b border-slate-800/80 mb-1 flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center ${
                  isGoogleUser
                    ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                }`}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-white truncate">{displayName}</span>
                {isGoogleUser ? (
                  <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                ) : (
                  <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              <span
                className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                  isGoogleUser
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isGoogleUser ? 'Google Verified Citizen' : 'Email Citizen Reporter'}
              </span>
            </div>
          </div>

          {/* Menu Options */}
          <div className="space-y-1">
            {onViewMyReports && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onViewMyReports();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>My Reported Incidents</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                  {myReportsCount}
                </span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
