import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { User, Lock, Mail, Save, AlertCircle, Trash2, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CandidateSettings = () => {
    // Bug #17 fix: read localStorage once on mount, not on every render
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; }
        catch { return {}; }
    });

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const token = localStorage.getItem('token');

    const showMsg = useCallback((text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }, []);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Bug #3 fix: actually call PATCH /api/auth/me
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return showMsg('Name cannot be empty.', 'error');
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await axios.patch(
                `${API}/api/auth/me`,
                { name: formData.name.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Update localStorage so Navbar / other components reflect the new name
            const updatedUser = { ...user, name: res.data.name };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            showMsg('Profile updated successfully.', 'success');
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to update profile.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Bug #4 fix: actually call POST /api/auth/change-password
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!formData.currentPassword || !formData.newPassword)
            return showMsg('Both current and new password are required.', 'error');
        if (formData.newPassword.length < 6)
            return showMsg('New password must be at least 6 characters.', 'error');
        setIsChangingPw(true);
        setMessage({ text: '', type: '' });
        try {
            await axios.post(
                `${API}/api/auth/change-password`,
                { currentPassword: formData.currentPassword, newPassword: formData.newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
            showMsg('Password changed successfully.', 'success');
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to change password.', 'error');
        } finally {
            setIsChangingPw(false);
        }
    };

    // Bug #5 fix: Add delete account for candidate (with cascading on backend)
    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);
        try {
            await axios.delete(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            localStorage.clear();
            window.location.href = '/';
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to delete account.', 'error');
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="space-y-8 pb-12 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Account Settings</h2>
                <p className="text-slate-400">Manage your Candidate Portal preferences and security details.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border ${
                    message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    {message.type === 'success'
                        ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    }
                    <p className="font-semibold">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><User className="w-5 h-5 text-indigo-400" /></div>
                        <h3 className="text-xl font-bold text-white">Personal Info</h3>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-5 relative z-10">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Full Name</label>
                            <input
                                type="text" name="name" value={formData.name} onChange={handleChange}
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email" name="email" value={formData.email} disabled
                                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-500 pl-11 pr-4 py-3.5 rounded-xl cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-slate-500 ml-1">Email cannot be changed directly.</p>
                        </div>
                        <button
                            type="submit" disabled={isSaving}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/20"
                        >
                            {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </form>
                </div>

                {/* Password Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-rose-500/20 rounded-lg"><Lock className="w-5 h-5 text-rose-400" /></div>
                        <h3 className="text-xl font-bold text-white">Security</h3>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-5 relative z-10">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Current Password</label>
                            <input
                                type="password" name="currentPassword" value={formData.currentPassword}
                                onChange={handleChange} placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">New Password</label>
                            <input
                                type="password" name="newPassword" value={formData.newPassword}
                                onChange={handleChange} placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit" disabled={isChangingPw}
                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all border border-slate-700 mt-4"
                        >
                            {isChangingPw ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Bug #5 fix: Danger zone — delete account */}
            <div className="bg-slate-900 border border-rose-900/40 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-rose-500/10 rounded-lg"><Trash2 className="w-5 h-5 text-rose-400" /></div>
                    <h3 className="text-xl font-bold text-white">Danger Zone</h3>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Permanently delete your account and all associated data — applications, profile, and history.
                    This action <span className="text-rose-400 font-semibold">cannot be undone</span>.
                </p>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-rose-600/20 hover:bg-rose-600/40 border border-rose-600/40 text-rose-400 font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        Delete My Account
                    </button>
                ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                        <p className="text-rose-400 font-semibold text-sm flex-1">
                            Are you absolutely sure? This will delete all your data permanently.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all"
                            >
                                {isDeletingAccount ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateSettings;
