import React, { useState, useEffect } from 'react';
import { CivicIssue, IssueStatus } from '../../types/issue';
import { getCategoryMeta, getPriorityBadgeColor, getStatusMeta } from '../../utils/priority';
import { formatDate, formatPreciseTimestamp } from '../../utils/formatDate';
import { upvoteIssue, updateIssueStatus, hasUserVoted } from '../../firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { X, ThumbsUp, MapPin, Building, Clock, CheckCircle2, AlertTriangle, ShieldAlert, ChevronRight, User } from 'lucide-react';
import confetti from 'canvas-confetti';

interface IssueDetailsModalProps {
  issue: CivicIssue;
  onClose: () => void;
  onIssueUpdated?: () => void;
}

export const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({
  issue,
  onClose,
}) => {
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [showAdminStatusPanel, setShowAdminStatusPanel] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeImageEnlarged, setActiveImageEnlarged] = useState(false);

  const catMeta = getCategoryMeta(issue.category);
  const prioMeta = getPriorityBadgeColor(issue.priorityLevel);
  const statusMeta = getStatusMeta(issue.status);

  useEffect(() => {
    let isMounted = true;
    hasUserVoted(issue.id).then((voted) => {
      if (isMounted) setHasVoted(voted);
    });
    return () => {
      isMounted = false;
    };
  }, [issue.id]);

  const handleUpvote = async () => {
    if (hasVoted || voting) return;
    setVoting(true);
    try {
      const success = await upvoteIssue(issue.id);
      if (success) {
        setHasVoted(true);
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#a855f7', '#38bdf8'],
        });
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    } finally {
      setVoting(false);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (updatingStatus || newStatus === issue.status) return;
    setUpdatingStatus(true);
    try {
      await updateIssueStatus(issue.id, newStatus);
      setShowAdminStatusPanel(false);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const timelineSteps: { status: IssueStatus; label: string }[] = [
    { status: 'reported', label: 'Reported' },
    { status: 'verified', label: 'Verified' },
    { status: 'in_progress', label: 'Work Started' },
    { status: 'resolved', label: 'Resolved' },
  ];

  const currentStepIndex = timelineSteps.findIndex((s) => s.status === issue.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-1.5 bg-slate-800 rounded-xl">{catMeta.icon}</span>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                {catMeta.label}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {statusMeta.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${prioMeta.bg} ${prioMeta.text} ${prioMeta.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prioMeta.dot}`} />
                  Priority: {issue.priorityLevel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
          {/* Issue Photo */}
          {issue.photoUrl && (
            <div className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-950 max-h-56">
              <img
                src={issue.photoUrl}
                alt={issue.title}
                className="w-full h-48 sm:h-56 object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                onClick={() => setActiveImageEnlarged(!activeImageEnlarged)}
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-slate-300 font-medium">
                Tap to inspect
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
              {issue.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {issue.description || 'No detailed description provided by the resident.'}
            </p>
          </div>

          {/* Location details card */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Location: </span>
                <span>{issue.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-400 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                <span>{issue.ward}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Reported {formatDate(issue.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                {issue.reporterPhotoUrl ? (
                  <img
                    src={issue.reporterPhotoUrl}
                    alt={issue.reporterName || 'Citizen'}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-[10px] shrink-0">
                    {issue.reporterName?.charAt(0).toUpperCase() || 'C'}
                  </div>
                )}
                <span className="text-slate-300 font-medium">
                  Reported by {issue.reporterName || 'Community Citizen'}
                </span>
                {issue.isGoogleVerified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                    Verified
                  </span>
                )}
              </div>
              {user && issue.reportedBy === user.uid && (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Your Report
                </span>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2.5">
              Issue Lifecycle Progress
            </h3>
            <div className="relative flex items-center justify-between py-2 px-1">
              {/* Connecting line */}
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0" />
              
              {timelineSteps.map((step, idx) => {
                const isPassedOrCurrent = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.status} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-500/20 shadow-lg'
                          : isPassedOrCurrent
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      {isPassedOrCurrent ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                        isCurrent ? 'text-indigo-400 font-bold' : isPassedOrCurrent ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Notes if available */}
            {issue.timeline && issue.timeline.length > 0 && (
              <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Activity Log ({issue.timeline.length} events)
                </span>
                {issue.timeline.map((event, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span className="text-slate-200 capitalize">{event.status.replace('_', ' ')}</span>
                      {event.note && <span className="text-slate-400">— {event.note}</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatPreciseTimestamp(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin / Civic Official Status Update Toggle */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => setShowAdminStatusPanel(!showAdminStatusPanel)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{showAdminStatusPanel ? 'Hide Municipal Status Panel' : 'Civic Official / Municipal Action (Update Status)'}</span>
            </button>

            {showAdminStatusPanel && (
              <div className="mt-2.5 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl space-y-2">
                <p className="text-[11px] text-indigo-300">
                  Select official status to notify mapped residents and update live dashboard:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(['reported', 'verified', 'in_progress', 'resolved'] as IssueStatus[]).map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus || issue.status === st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        issue.status === st
                          ? 'bg-indigo-600/30 border-indigo-400 text-white cursor-default'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white'
                      }`}
                    >
                      Mark {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span className="text-white font-bold text-sm mr-1">{issue.upvotes || 0}</span>
            <span>community members corroborated this</span>
          </div>

          <button
            onClick={handleUpvote}
            disabled={hasVoted || voting}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all ${
              hasVoted
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'text-emerald-400' : ''}`} />
            <span>{hasVoted ? 'Upvoted ✓' : '▲ Upvote Issue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
