import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    UploadCloud, FileText, CheckCircle2,
    Loader2, Mail, Phone, Activity, Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResumeProfile = () => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const { isDark } = useTheme();

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API}/api/candidate/profile/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data);
        } catch (error) {
            console.log('No profile yet or error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('userId', user._id);

        try {
            const res = await axios.post(`${API}/api/candidate/profile`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setProfile(res.data.profile);
            await fetchProfile();
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to analyze resume. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
    };

    const getResumeViewUrl = () => `${API}/api/candidate/resume-proxy/${user._id}`;

    if (isLoading) {
        return (
            <div className="flex justify-center mt-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Theme tokens
    const headingColor = isDark ? 'text-white' : 'text-slate-900';
    const subColor = isDark ? 'text-slate-400' : 'text-slate-500';
    const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const innerBg = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200';
    const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${headingColor}`}>Resume Profile</h2>
                <p className={`text-sm sm:text-base ${subColor}`}>
                    Upload your resume. Our AI will automatically extract your skills and match you to top jobs.
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center transition-all cursor-pointer ${
                    dragActive
                        ? isDark
                            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                            : 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                        : isDark
                            ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}>
                    {isUploading
                        ? <Loader2 className="w-7 h-7 sm:w-10 sm:h-10 text-indigo-400 animate-spin" />
                        : <UploadCloud className={`w-7 h-7 sm:w-10 sm:h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                    }
                </div>

                <h3 className={`text-base sm:text-xl font-bold mb-2 ${headingColor}`}>
                    {isUploading ? 'Analyzing Resume via AI...' : profile ? 'Update Your Resume' : 'Upload Your Resume'}
                </h3>

                <p className={`text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto ${subColor}`}>
                    {isUploading
                        ? 'Extracting semantic metadata and BERT embeddings...'
                        : 'Drag and drop your PDF here, or click to browse. Max size 5MB.'}
                </p>

                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]); }}
                />

                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={isUploading}
                    className={`font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl transition-all shadow-lg text-sm sm:text-base ${
                        isUploading
                            ? isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}
                >
                    {isUploading ? 'Processing...' : 'Browse PDF File'}
                </button>
            </div>

            {/* Extracted Profile Display */}
            {profile && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl sm:rounded-3xl overflow-hidden relative ${cardBg}`}
                >
                    {/* Decorative glow (dark only) */}
                    {isDark && (
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-500/10 rounded-bl-full blur-3xl mix-blend-screen pointer-events-none" />
                    )}

                    {/* Profile header */}
                    <div className={`p-5 sm:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                <FileText className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`text-lg sm:text-2xl font-bold mb-1 truncate ${headingColor}`}>
                                    {profile.extractedName || user.name}
                                </h3>
                                <div className={`flex flex-col xs:flex-row items-start xs:items-center gap-1 xs:gap-4 text-xs sm:text-sm ${subColor}`}>
                                    <span className="flex items-center gap-1 truncate">
                                        <Mail className="w-3.5 h-3.5 shrink-0" />
                                        {profile.extractedEmail || 'Not Extracted'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                        {profile.extractedPhone || 'Not Extracted'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border shrink-0 ${
                            isDark
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            AI Parsed Successfully
                        </span>
                    </div>

                    {/* Profile body */}
                    <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Skills */}
                        <div>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2 ${labelColor}`}>
                                <Activity className="w-4 h-4" /> Semantic Skills Extracted
                            </h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {profile.extractedSkills?.length > 0 ? (
                                    profile.extractedSkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 border rounded-lg text-xs sm:text-sm font-medium ${
                                                isDark
                                                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            }`}
                                        >
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className={`italic text-sm ${subColor}`}>No technical skills detected automatically.</span>
                                )}
                            </div>
                        </div>

                        {/* View Resume */}
                        <div>
                            <h4 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${labelColor}`}>
                                <Briefcase className="w-4 h-4" /> View Original Resume
                            </h4>
                            <div className={`p-4 border rounded-xl ${innerBg}`}>
                                <p className={`text-xs sm:text-sm mb-3 ${subColor}`}>
                                    Your resume is securely stored. Click below to open it in a new tab.
                                </p>
                                {/* Uses proxy endpoint — signed S3 URLs expire, proxy always works */}
                                <a
                                    href={getResumeViewUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.open(`${getResumeViewUrl()}?token=${token}`, '_blank');
                                    }}
                                >
                                    <FileText className="w-4 h-4" /> Open PDF Document
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ResumeProfile;