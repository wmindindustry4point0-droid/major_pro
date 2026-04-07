import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Bell, CheckCheck, Briefcase, Star, XCircle, BrainCircuit, Megaphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_INTERVAL = 30_000; // refresh every 30s

const typeConfig = {
    application_received: { icon: Briefcase,   color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    status_shortlisted:   { icon: Star,         color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    status_rejected:      { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
    status_analyzed:      { icon: BrainCircuit, color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
    job_posted:           { icon: Megaphone,    color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
};

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
    const [open,          setOpen]          = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/notifications`);
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (err) {
            console.error('Failed to fetch notifications:', err.message);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setOpen(prev => !prev);
    };

    const markAllRead = async () => {
        try {
            await axios.patch(`${API}/api/notifications/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read:', err.message);
        }
    };

    const markOneRead = async (id) => {
        try {
            await axios.patch(`${API}/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read:', err.message);
        }
    };

    // Theme tokens
    const dropBg     = isDark ? 'bg-slate-900 border-slate-800'  : 'bg-white border-slate-200 shadow-xl';
    const headerBg   = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200';
    const itemHover  = isDark ? 'hover:bg-slate-800/60'           : 'hover:bg-slate-50';
    const unreadBg   = isDark ? 'bg-indigo-500/5'                 : 'bg-indigo-50/60';
    const dividerCol = isDark ? 'border-slate-800'                : 'border-slate-100';
    const titleCol   = isDark ? 'text-white'                      : 'text-slate-900';
    const subCol     = isDark ? 'text-slate-400'                  : 'text-slate-500';
    const timeCol    = isDark ? 'text-slate-500'                  : 'text-slate-400';
    const emptyCol   = isDark ? 'text-slate-500'                  : 'text-slate-400';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className={`relative p-2 rounded-lg transition-colors ${
                    isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
            >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-slate-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className={`
                    absolute right-0 top-full mt-2 w-80 sm:w-96
                    border rounded-2xl overflow-hidden z-50
                    ${dropBg}
                `}>
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${headerBg}`}>
                        <div className="flex items-center gap-2">
                            <Bell className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                            <span className={`font-bold text-sm ${titleCol}`}>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                    isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                                }`}
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className={`text-center py-12 text-sm ${emptyCol}`}>
                                <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                No notifications yet
                            </div>
                        ) : (
                            <div className={`divide-y ${dividerCol}`}>
                                {notifications.map((n) => {
                                    const cfg = typeConfig[n.type] || typeConfig.job_posted;
                                    const Icon = cfg.icon;
                                    return (
                                        <div
                                            key={n._id}
                                            onClick={() => !n.isRead && markOneRead(n._id)}
                                            className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${itemHover} ${!n.isRead ? unreadBg : ''}`}
                                        >
                                            {/* Icon */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                                                <Icon className={`w-4 h-4 ${cfg.color}`} />
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-bold leading-tight ${titleCol}`}>{n.title}</p>
                                                    {!n.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                <p className={`text-xs mt-0.5 leading-relaxed ${subCol}`}>{n.message}</p>
                                                <p className={`text-[11px] mt-1 ${timeCol}`}>{timeAgo(n.createdAt)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;