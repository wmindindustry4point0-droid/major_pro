/**
 * client/src/utils/format.js
 *
 * FIX #12: Centralised formatting utilities previously duplicated across
 * CandidateDashboard.jsx, MyApplications.jsx, NotificationBell.jsx, etc.
 * Import from here instead of redefining in each file.
 */

/**
 * Returns a human-readable relative time string.
 * e.g. "Just now", "5m ago", "3h ago", "2d ago", or a locale date string.
 * @param {string|Date} dateStr
 */
export const timeAgo = (dateStr) => {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

/**
 * Returns a Tailwind colour class string for an AI match score.
 * @param {number} score  0–100
 * @param {'text'|'bg'} variant
 * @param {boolean} isDark
 */
export const scoreColor = (score, variant = 'text', isDark = true) => {
    if (variant === 'bg') {
        return score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-yellow-500' : 'bg-rose-500';
    }
    if (score >= 75) return isDark ? 'text-emerald-400' : 'text-emerald-600';
    if (score >= 55) return isDark ? 'text-yellow-400'  : 'text-yellow-600';
    return isDark ? 'text-rose-400' : 'text-rose-600';
};

/**
 * Returns a display label + Tailwind classes for an application status string.
 * @param {string} status
 * @param {boolean} isDark
 */
export const statusConfig = (status, isDark = true) => {
    const configs = {
        applied:     { label: 'Applied',       cls: isDark ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'   : 'bg-yellow-50 text-yellow-700 border-yellow-200'   },
        screened:    { label: 'Under Review',  cls: isDark ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'         : 'bg-blue-50 text-blue-700 border-blue-200'         },
        shortlisted: { label: 'Shortlisted',   cls: isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'   : 'bg-indigo-50 text-indigo-700 border-indigo-200'   },
        interview:   { label: 'Interview',     cls: isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'      : 'bg-amber-50 text-amber-700 border-amber-200'      },
        selected:    { label: 'Selected 🎉',   cls: isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30': 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        rejected:    { label: 'Rejected',      cls: isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'         : 'bg-rose-50 text-rose-700 border-rose-200'         },
        analyzed:    { label: 'Under Review',  cls: isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'   : 'bg-indigo-50 text-indigo-700 border-indigo-200'   },
    };
    return configs[status] || configs.applied;
};