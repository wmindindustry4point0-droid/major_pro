import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, Mail, Save, AlertCircle } from 'lucide-react';

const CandidateSettings = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        
        // This is a mockup for profile saving. 
        // In a real app, this would hit /api/auth/update
        setTimeout(() => {
            setIsSaving(false);
            setMessage({ text: 'Profile preferences updated successfully.', type: 'success' });
        }, 1000);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ text: 'Password reset links have been disabled in the demo environment.', type: 'error' });
    };

    return (
        <div className="space-y-8 pb-12 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Account Settings</h2>
                <p className="text-slate-400">Manage your Candidate Portal preferences and security details.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
                                    type="email" name="email" value={formData.email} onChange={handleChange} disabled
                                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-500 pl-11 pr-4 py-3.5 rounded-xl cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-slate-500 ml-1">Email cannot be changed directly.</p>
                        </div>
                        <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/20">
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
                                type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">New Password</label>
                            <input 
                                type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                            />
                        </div>
                        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all border border-slate-700 mt-4">
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CandidateSettings;
