import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Table, Users, Download, ExternalLink, Loader2, ArrowLeft, Trash2, ThumbsUp, ThumbsDown, CheckCircle2, X, BrainCircuit } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const JobManagement = ({ user }) => {
    const [activeTab,   setActiveTab]   = useState('view');
    const [jobs,        setJobs]        = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [applicants,  setApplicants]  = useState([]);
    const [isLoading,   setIsLoading]   = useState(false);
    const [analyzingId, setAnalyzingId] = useState(null);
    const [updatingId,  setUpdatingId]  = useState(null);

    const [newJob, setNewJob] = useState({
        title: '', description: '', requiredSkills: '', experienceLevel: '', location: ''
    });

    // FIX: All protected API calls now carry the JWT Authorization header.
    // Without it, requireAuth middleware on the backend returns 401.
    const token = localStorage.getItem('token');
    const authHeader = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (user?._id) fetchJobs();
    }, [user]);

    useEffect(() => {
        if (selectedJob) fetchApplicants(selectedJob._id);
    }, [selectedJob]);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            // Public endpoint — no auth needed for GET /api/jobs
            const res = await axios.get(`${API}/api/jobs`);
            const myJobs = res.data.filter(job => job.companyId._id === user._id || job.companyId === user._id);
            setJobs(myJobs);
        } catch (err) {
            console.error('fetchJobs error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchApplicants = async (jobId) => {
        setIsLoading(true);
        try {
            // FIX: Added auth header — requireRole('company') guards this route
            const res = await axios.get(`${API}/api/applications/job/${jobId}`, {
                headers: authHeader
            });
            setApplicants(res.data);
        } catch (err) {
            console.error('fetchApplicants error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const skillsArray = newJob.requiredSkills.split(',').map(s => s.trim()).filter(Boolean);
            // FIX: Added auth header — requireRole('company') guards POST /api/jobs
            await axios.post(`${API}/api/jobs`, {
                ...newJob,
                requiredSkills: skillsArray,
                companyId: user._id
            }, { headers: authHeader });
            setNewJob({ title: '', description: '', requiredSkills: '', experienceLevel: '', location: '' });
            await fetchJobs();
            setActiveTab('view');
        } catch (err) {
            console.error('handlePostJob error:', err);
            alert(err.response?.data?.error || 'Failed to post job');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteJob = async (jobId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this job and all its applications?')) return;
        try {
            // FIX: Added auth header — requireRole('company') guards DELETE /api/jobs/:id
            await axios.delete(`${API}/api/jobs/${jobId}`, { headers: authHeader });
            fetchJobs();
            if (selectedJob?._id === jobId) setSelectedJob(null);
        } catch (err) {
            console.error('handleDeleteJob error:', err);
            alert(err.response?.data?.error || 'Failed to delete job.');
        }
    };

    const handleAnalyze = async (appId) => {
        setAnalyzingId(appId);
        try {
            // FIX: Added auth header — requireRole('company') guards this route
            const res = await axios.post(`${API}/api/applications/analyze/${appId}`, {}, {
                headers: authHeader
            });
            setApplicants(prev => prev.map(a => a._id === appId ? res.data : a));
        } catch (err) {
            console.error('handleAnalyze error:', err);
            alert('AI analysis failed. Make sure the AI service is running.');
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleStatusChange = async (appId, newStatus) => {
        setUpdatingId(appId);
        try {
            // FIX: Added auth header — requireRole('company') guards this route
            const res = await axios.patch(
                `${API}/api/applications/${appId}/status`,
                { status: newStatus },
                { headers: authHeader }
            );
            setApplicants(prev => prev.map(a => a._id === appId ? { ...a, status: res.data.status } : a));
        } catch (err) {
            console.error('handleStatusChange error:', err);
            alert('Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const getScoreColor = (score) => {
        if (!score && score !== 0) return 'text-slate-500';
        if (score >= 75) return 'text-emerald-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-rose-400';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'shortlisted': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            case 'rejected':    return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            case 'analyzed':    return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
            default:            return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30';
        }
    };

    const fadeProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: -10 }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Job Management</h2>
                    <p className="text-slate-400 text-sm">Post new opportunities and manage candidate applications.</p>
                </div>

                {!selectedJob && (
                    <div className="flex bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('view')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'view' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Table className="w-4 h-4" /> Active Jobs
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Plus className="w-4 h-4" /> Post New Job
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">

                {/* CREATE JOB */}
                {activeTab === 'create' && !selectedJob && (
                    <motion.div key="create" {...fadeProps} className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto shadow-xl">
                        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-700/50">
                            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <Plus className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Post a New Job Opportunity</h3>
                                <p className="text-sm text-slate-400">Fill out the details below to broadcast to candidates.</p>
                            </div>
                        </div>

                        <form onSubmit={handlePostJob} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Job Title</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600" placeholder="e.g. Senior Machine Learning Engineer" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} required />
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Job Description</label>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600 h-32 resize-y" placeholder="Describe the responsibilities and expectations..." value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Required Skills (comma separated)</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600" placeholder="Python, TensorFlow, NLP" value={newJob.requiredSkills} onChange={e => setNewJob({ ...newJob, requiredSkills: e.target.value })} required />
                                    <p className="text-xs text-slate-500 ml-1">These skills are critical for the AI matcher.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Experience Level</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent appearance-none" value={newJob.experienceLevel} onChange={e => setNewJob({ ...newJob, experienceLevel: e.target.value })} required>
                                        <option value="" disabled className="text-slate-600">Select Required Level</option>
                                        <option value="Entry Level">Entry Level</option>
                                        <option value="Mid Level">Mid Level</option>
                                        <option value="Senior Level">Senior Level</option>
                                        <option value="Lead / Principal">Lead / Principal</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Location (optional)</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="e.g. Mumbai, India / Remote" value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                                <button type="submit" disabled={isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</> : <><Plus className="w-5 h-5" /> Post Job</>}
                                </button>
                                <button type="button" onClick={() => setActiveTab('view')} className="px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all font-medium">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* VIEW JOBS */}
                {activeTab === 'view' && !selectedJob && (
                    <motion.div key="view" {...fadeProps} className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl text-slate-500">
                                No jobs posted yet. Click "Post New Job" to get started.
                            </div>
                        ) : jobs.map(job => (
                            <div
                                key={job._id}
                                onClick={() => setSelectedJob(job)}
                                className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{job.title}</h3>
                                        <p className="text-slate-400 text-sm mt-1">{job.location || 'Location not set'} · {job.experienceLevel}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {job.requiredSkills?.slice(0, 4).map(skill => (
                                                <span key={skill} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-md">{skill}</span>
                                            ))}
                                            {(job.requiredSkills?.length || 0) > 4 && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-500 rounded-md">+{job.requiredSkills.length - 4}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                                            <Users className="w-4 h-4" />
                                            <span>View Applicants</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteJob(job._id, e)}
                                            className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            title="Delete job"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* APPLICANTS VIEW */}
                {selectedJob && (
                    <motion.div key="applicants" {...fadeProps} className="space-y-6">
                        <button
                            onClick={() => setSelectedJob(null)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Jobs
                        </button>

                        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-1">{selectedJob.title}</h3>
                            <p className="text-slate-400 text-sm">{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</p>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
                        ) : applicants.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-slate-700 rounded-2xl text-slate-500">
                                No applications yet for this job.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {applicants.map(app => (
                                    <div key={app._id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                                        {app.candidateId?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{app.candidateId?.name || 'Unknown'}</p>
                                                        <p className="text-slate-400 text-xs">{app.candidateId?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    <span className={`text-lg font-bold ${getScoreColor(app.matchScore)}`}>
                                                        {app.matchScore != null ? `${app.matchScore}%` : '—'}
                                                    </span>
                                                    <span className="text-slate-500 text-xs">AI Match</span>
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(app.status)}`}>
                                                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                                    </span>
                                                </div>
                                                {app.aiFeedback && (
                                                    <p className="text-slate-400 text-xs mt-2 line-clamp-2">{app.aiFeedback}</p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                {app.resumeSignedUrl && (
                                                    <a
                                                        href={app.resumeSignedUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> Resume
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleAnalyze(app._id)}
                                                    disabled={analyzingId === app._id}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium transition-colors"
                                                >
                                                    {analyzingId === app._id
                                                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                                                        : <><BrainCircuit className="w-3.5 h-3.5" /> Re-Analyze</>
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(app._id, 'shortlisted')}
                                                    disabled={updatingId === app._id || app.status === 'shortlisted'}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium transition-colors"
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(app._id, 'rejected')}
                                                    disabled={updatingId === app._id || app.status === 'rejected'}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium transition-colors"
                                                >
                                                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobManagement;