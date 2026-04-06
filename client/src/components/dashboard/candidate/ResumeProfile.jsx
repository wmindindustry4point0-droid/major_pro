import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle2, Loader2, Mail, Phone, Activity, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResumeProfile = () => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchProfile();
    }, []);

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
            // Re-fetch to get fresh signed URL
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    // FIX: Use the backend proxy endpoint to view the resume.
    // profile.resumeUrl is a signed S3 URL that expires and can cause Access Denied.
    // The proxy endpoint fetches from S3 server-side and streams it back — always works.
    const getResumeViewUrl = () => {
        return `${API}/api/candidate/resume-proxy/${user._id}`;
    };

    if (isLoading) {
        return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Resume Profile</h2>
                <p className="text-slate-400">Upload your resume. Our AI will automatically extract your skills and match you to top jobs.</p>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                    dragActive ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
            >
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    {isUploading ? (
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    ) : (
                        <UploadCloud className="w-10 h-10 text-indigo-400" />
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                    {isUploading ? 'Analyzing Resume via AI...' : (profile ? 'Update Your Resume' : 'Upload Your Resume')}
                </h3>

                <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                    {isUploading ? 'Processing...' : 'Browse PDF File'}
                </button>
            </div>

            {/* Extracted Profile Display */}
            {profile && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full blur-3xl mix-blend-screen pointer-events-none"></div>

                    <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <FileText className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">{profile.extractedName || user.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {profile.extractedEmail || 'Not Extracted'}</span>
                                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {profile.extractedPhone || 'Not Extracted'}</span>
                                </div>
                            </div>
                        </div>
                        <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-5 h-5" /> AI Parsed Successfully
                        </span>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Semantic Skills Extracted
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.extractedSkills && profile.extractedSkills.length > 0 ? (
                                    profile.extractedSkills.map((skill, index) => (
                                        <span key={index} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-500 italic">No technical skills detected automatically.</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <Briefcase className="w-4 h-4" /> View Original Resume
                                </h4>
                                {/* FIX: Use proxy endpoint instead of raw/signed S3 URL.
                                    Raw S3 URLs get Access Denied. Signed URLs expire.
                                    The proxy fetches from S3 server-side and streams it back safely. */}
                                <a
                                    href={getResumeViewUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                                    onClick={(e) => {
                                        // Add token to the URL as query param since <a> tags can't send headers
                                        e.preventDefault();
                                        const url = `${getResumeViewUrl()}?token=${token}`;
                                        window.open(url, '_blank');
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