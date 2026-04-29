import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import {
    User, Lock, Bell, Trash2, Mail, Calendar, Shield,
    CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Reusable primitives ───────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, children, isDark }) => (
    <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Icon className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            </div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Label = ({ children, isDark }) => (
    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {children}
    </label>
);

const Input = ({ isDark, className = '', ...props }) => (
    <input
        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${
            isDark
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-indigo-400/20'
        } ${className}`}
        {...props}
    />
);

const SaveBtn = ({ loading, isDark }) => (
    <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
    >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Saving…' : 'Save Changes'}
    </button>
);

const Toast = ({ msg, type, isDark }) => {
    if (!msg) return null;
    const isErr = type === 'error';
    return (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${
            isErr
                ? isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                : isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
            {isErr ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const Settings = () => {
    const { isDark } = useTheme();
    const navigate    = useNavigate();

    const storedUser  = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return {}; } })();
    const token       = localStorage.getItem('token');
    const authHeader  = { Authorization: `Bearer ${token}` };
    const isGoogle    = Boolean(storedUser?.googleId);

    // ── Profile form ──────────────────────────────────────────────────────────
    const [profile, setProfile]           = useState({ name: storedUser?.name || '', companyName: storedUser?.companyName || '' });
    const [profileLoading, setProfileLoad] = useState(false);
    const [profileMsg, setProfileMsg]     = useState({ text: '', type: '' });

    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (!profile.name.trim()) return setProfileMsg({ text: 'Name cannot be empty.', type: 'error' });
        setProfileLoad(true); setProfileMsg({ text: '', type: '' });
        try {
            const res = await axios.patch(`${API}/api/auth/me`, profile, { headers: authHeader });
            const updated = { ...storedUser, name: res.data.name, companyName: res.data.companyName };
            localStorage.setItem('user', JSON.stringify(updated));
            setProfileMsg({ text: 'Profile updated successfully.', type: 'success' });
        } catch (err) {
            setProfileMsg({ text: err.response?.data?.error || 'Failed to update profile.', type: 'error' });
        } finally {
            setProfileLoad(false);
        }
    };

    // ── Password form ─────────────────────────────────────────────────────────
    const [pw, setPw]                   = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw]           = useState({ current: false, next: false, confirm: false });
    const [pwLoading, setPwLoading]     = useState(false);
    const [pwMsg, setPwMsg]             = useState({ text: '', type: '' });

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (pw.next.length < 6)         return setPwMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
        if (pw.next !== pw.confirm)     return setPwMsg({ text: 'Passwords do not match.', type: 'error' });
        setPwLoading(true); setPwMsg({ text: '', type: '' });
        try {
            await axios.post(`${API}/api/auth/change-password`, { currentPassword: pw.current, newPassword: pw.next }, { headers: authHeader });
            setPwMsg({ text: 'Password changed successfully.', type: 'success' });
            setPw({ current: '', next: '', confirm: '' });
        } catch (err) {
            setPwMsg({ text: err.response?.data?.error || 'Failed to change password.', type: 'error' });
        } finally {
            setPwLoading(false);
        }
    };

    // ── Notification prefs ────────────────────────────────────────────────────
    const [notif, setNotif]             = useState({ application_received: true, status_changes: true });
    const [notifLoading, setNotifLoad]  = useState(false);
    const [notifMsg, setNotifMsg]       = useState({ text: '', type: '' });

    const handleNotifSave = async (e) => {
        e.preventDefault();
        setNotifLoad(true); setNotifMsg({ text: '', type: '' });
        try {
            await axios.patch(`${API}/api/auth/me`, { notificationPrefs: notif }, { headers: authHeader });
            setNotifMsg({ text: 'Notification preferences saved.', type: 'success' });
        } catch (err) {
            setNotifMsg({ text: err.response?.data?.error || 'Failed to save preferences.', type: 'error' });
        } finally {
            setNotifLoad(false);
        }
    };

    // ── Delete account ────────────────────────────────────────────────────────
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteLoading, setDeleteLoad]   = useState(false);
    const [deleteMsg, setDeleteMsg]         = useState({ text: '', type: '' });

    const handleDelete = async () => {
        if (deleteConfirm.trim().toLowerCase() !== 'delete') return;
        setDeleteLoad(true);
        try {
            await axios.delete(`${API}/api/auth/me`, { headers: authHeader });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        } catch (err) {
            setDeleteMsg({ text: err.response?.data?.error || 'Failed to delete account.', type: 'error' });
            setDeleteLoad(false);
        }
    };

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const sub    = isDark ? 'text-slate-400' : 'text-slate-500';
    const muted  = isDark ? 'text-slate-600' : 'text-slate-400';
    const head   = isDark ? 'text-white'     : 'text-slate-900';
    const togBg  = (on) => on
        ? 'bg-indigo-600'
        : isDark ? 'bg-slate-700' : 'bg-slate-300';

    const pwEyeBtn = (field) => (
        <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-indigo-400 transition-colors`}
        >
            {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
    );

    return (
        <div className="space-y-6 pb-14 max-w-2xl">
            {/* Page header */}
            <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${head}`}>Settings</h1>
                <p className={`text-sm mt-1 ${sub}`}>Manage your account, security, and preferences.</p>
            </div>

            {/* ── Account Info (read-only) ── */}
            <Section title="Account Info" icon={Shield} isDark={isDark}>
                <div className="space-y-3">
                    {[
                        { icon: Mail,     label: 'Email',       value: storedUser?.email || '—'                              },
                        { icon: User,     label: 'Role',        value: storedUser?.role === 'company' ? 'Recruiter / Company' : 'Candidate' },
                        { icon: Calendar, label: 'Joined',      value: storedUser?.createdAt ? new Date(storedUser.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                        { icon: Shield,   label: 'Auth method', value: isGoogle ? 'Google OAuth' : 'Email & Password' },
                    ].map(({ icon: Ic, label, value }) => (
                        <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <Ic className={`w-4 h-4 shrink-0 ${muted}`} />
                            <span className={`text-sm w-28 shrink-0 ${sub}`}>{label}</span>
                            <span className={`text-sm font-medium truncate ${head}`}>{value}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Company Profile ── */}
            <Section title="Company Profile" icon={User} isDark={isDark}>
                <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                        <Label isDark={isDark}>Your Name</Label>
                        <Input isDark={isDark} value={profile.name} onChange={e => setProfile(s => ({ ...s, name: e.target.value }))} placeholder="Your full name" />
                    </div>
                    <div>
                        <Label isDark={isDark}>Company Name</Label>
                        <Input isDark={isDark} value={profile.companyName} onChange={e => setProfile(s => ({ ...s, companyName: e.target.value }))} placeholder="Your company name" />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                        <SaveBtn loading={profileLoading} isDark={isDark} />
                        <Toast msg={profileMsg.text} type={profileMsg.type} isDark={isDark} />
                    </div>
                </form>
            </Section>

            {/* ── Change Password (hidden for Google users) ── */}
            {!isGoogle && (
                <Section title="Change Password" icon={Lock} isDark={isDark}>
                    <form onSubmit={handlePasswordSave} className="space-y-4">
                        {[
                            { key: 'current', label: 'Current Password',  placeholder: 'Enter current password' },
                            { key: 'next',    label: 'New Password',       placeholder: 'At least 6 characters'  },
                            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password'  },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <Label isDark={isDark}>{label}</Label>
                                <div className="relative">
                                    <Input
                                        isDark={isDark}
                                        type={showPw[key] ? 'text' : 'password'}
                                        value={pw[key]}
                                        onChange={e => setPw(s => ({ ...s, [key]: e.target.value }))}
                                        placeholder={placeholder}
                                        className="pr-10"
                                    />
                                    {pwEyeBtn(key)}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-4 pt-1">
                            <SaveBtn loading={pwLoading} isDark={isDark} />
                            <Toast msg={pwMsg.text} type={pwMsg.type} isDark={isDark} />
                        </div>
                    </form>
                </Section>
            )}

            {isGoogle && (
                <Section title="Password" icon={Lock} isDark={isDark}>
                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${muted}`} />
                        <p className={`text-sm ${sub}`}>
                            Your account uses Google Sign-In. Password changes are managed through your Google account.
                        </p>
                    </div>
                </Section>
            )}

            {/* ── Notification Preferences ── */}
            <Section title="Notification Preferences" icon={Bell} isDark={isDark}>
                <form onSubmit={handleNotifSave} className="space-y-4">
                    {[
                        { key: 'application_received', label: 'New application received',    desc: 'Get notified when a candidate applies to one of your jobs.' },
                        { key: 'status_changes',       label: 'Application status updates',  desc: 'Alerts when you move a candidate through hiring stages.' },
                    ].map(({ key, label, desc }) => (
                        <div key={key} className={`flex items-start justify-between gap-4 p-4 rounded-xl ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${head}`}>{label}</p>
                                <p className={`text-xs mt-0.5 ${muted}`}>{desc}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotif(s => ({ ...s, [key]: !s[key] }))}
                                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${togBg(notif[key])}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notif[key] ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-4 pt-1">
                        <SaveBtn loading={notifLoading} isDark={isDark} />
                        <Toast msg={notifMsg.text} type={notifMsg.type} isDark={isDark} />
                    </div>
                </form>
            </Section>

            {/* ── Danger Zone ── */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-rose-500/20' : 'border-rose-200'}`}>
                <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-rose-500/15' : 'bg-rose-100'}`}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                    </div>
                    <h2 className="font-semibold text-rose-500">Danger Zone</h2>
                </div>
                <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <p className={`text-sm mb-4 ${sub}`}>
                        Permanently delete your account and all associated data. This action <strong>cannot be undone</strong>.
                    </p>
                    {!deleteModal ? (
                        <button
                            onClick={() => setDeleteModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-sm font-semibold rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Account
                        </button>
                    ) : (
                        <div className={`space-y-3 p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <p className={`text-sm font-medium ${head}`}>
                                Type <span className="font-mono text-rose-400">delete</span> to confirm
                            </p>
                            <Input
                                isDark={isDark}
                                value={deleteConfirm}
                                onChange={e => setDeleteConfirm(e.target.value)}
                                placeholder="Type 'delete' to confirm"
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteConfirm.trim().toLowerCase() !== 'delete' || deleteLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {deleteLoading ? 'Deleting…' : 'Confirm Delete'}
                                </button>
                                <button
                                    onClick={() => { setDeleteModal(false); setDeleteConfirm(''); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                            <Toast msg={deleteMsg.text} type={deleteMsg.type} isDark={isDark} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;