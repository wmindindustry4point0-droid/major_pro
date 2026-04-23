import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Bell, CheckCheck, Briefcase, Star, XCircle, BrainCircuit, Megaphone, Calendar, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Reduced polling interval — 60s is a good balance between responsiveness and server load
const POLL_INTERVAL = 60_000;

// FIX #4: Added missing notification types that were not in the typeConfig map.
// job_deleted and status_interview were fired by the backend but rendered as blank tiles.
const typeConfig = {
    application_received:   { icon: Briefcase,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
    status_shortlisted:     { icon: Star,          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    status_rejected:        { icon: XCircle,       color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
    status_analyzed:        { icon: BrainCircuit,  color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
    status_selected:        { icon: Star,          color: 'text-yellow-400',  bg: 'bg-yellow-500/10'  },
    job_posted:             { icon: Megaphone,     color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
    job_deleted:            { icon: XCircle,       color: 'text-rose-400',    bg: 'bg-rose-500/10'    }, // FIX #4
    status_interview:       { icon: Calendar,      color: 'text-blue-400',    bg: 'bg-blue-500/10'    }, // FIX #4
    interview_scheduled:    { icon: Calendar,      color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    video_interview_assigned:{ icon: BrainCircuit, color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
};

// Fallback config for any unknown type that might appear
const DEFAULT_CONFIG = { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/10' };

const timeAgo = (dateStr) => {
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

const NotificationBell = () => {
    const { isDark } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount,   setUnreadCount]   = useState(0);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/notifications`, {
                headers: getAuthHeader()
            });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (err) {
            if (err.response?.status !== 401) {
                console.error('Failed to fetch notifications:', err.message);
            }
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = async () => {
        try {
            await axios.patch(`${API}/api/notifications/read-all`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read:', err.message);
        }
    };

    const markOneRead = async (id) => {
        try {
            await axios.patch(`${API}/api/notifications/${id}/read`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read:', err.message);
        }
    };

    // FIX #13 (frontend): Call the new DELETE /clear endpoint to let users clear notifications
    const clearAll = async () => {
        try {
            await axios.delete(`${API}/api/notifications/clear`, {
                headers: getAuthHeader()
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to clear notifications:', err.message);
        }
    };

    const bg      = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const itemBg  = isDark ? 'hover:bg-slate-800'            : 'hover:bg-slate-50';
    const unreadBg= isDark ? 'bg-slate-800/60'               : 'bg-indigo-50/50';
    const textCol = isDark ? 'text-slate-200'                : 'text-slate-800';
    const subCol  = isDark ? 'text-slate-400'                : 'text-slate-500';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => { setOpen(prev => !prev); if (!open) fetchNotifications(); }}
                className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                aria-label="Notifications"
            >
                <Bell className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden ${bg}`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <span className={`font-semibold text-sm ${textCol}`}>
                            Notifications {unreadCount > 0 && <span className="text-indigo-400">({unreadCount})</span>}
                        </span>
                        <div className="flex gap-2">
                            {notifications.length > 0 && (
                                <>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" /> Read all
                                        </button>
                                    )}
                                    <button
                                        onClick={clearAll}
                                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                                        title="Clear all notifications"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Clear
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className={`px-4 py-10 text-center text-sm ${subCol}`}>
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(n => {
                                // FIX #4: fall back to DEFAULT_CONFIG for unknown types
                                const cfg = typeConfig[n.type] || DEFAULT_CONFIG;
                                const Icon = cfg.icon;
                                return (
                                    <div
                                        key={n._id}
                                        onClick={() => !n.isRead && markOneRead(n._id)}
                                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${itemBg} ${!n.isRead ? unreadBg : ''}`}
                                    >
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${cfg.bg}`}>
                                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-semibold leading-tight ${textCol}`}>{n.title}</p>
                                            <p className={`text-xs mt-0.5 leading-snug ${subCol}`}>{n.message}</p>
                                            <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {!n.isRead && (
                                            <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;