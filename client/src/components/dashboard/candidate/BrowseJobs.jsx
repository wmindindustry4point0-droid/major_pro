import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Briefcase, Clock, Send, CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BrowseJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [applyingTo, setApplyingTo] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [jobsRes, appsRes, profileRes] = await Promise.all([
                axios.get(`${API}/api/jobs`),
                axios.get(`${API}/api/applications/candidate/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API}/api/candidate/profile/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: null }))
            ]);

            setJobs(jobsRes.data);
            setApplications(appsRes.data);
            setProfile(profileRes.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const hasApplied = (jobId) => {
        return applications.some(app => app.jobId._id === jobId || app.jobId === jobId);
    };

    const appMap = applications.reduce((map, app) => {
        const id = app.jobId._id || app.jobId;
        map[id] = app;
        return map;
    }, {});

    const handleApply = async (jobId) => {
        if (!profile || !profile.resumeUrl) {
            alert("Please upload your resume in the 'Resume Profile' tab before applying.");
            return;
        }

        setApplyingTo(jobId);

        try {
            // Fetch resume through our backend proxy to avoid S3 CORS issues,
            // then re-upload as part of the application so the server has a
            // dedicated copy tied to this application.
            const proxyResponse = await fetch(`${API}/api/candidate/resume-proxy/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!proxyResponse.ok) {
                throw new Error('Failed to fetch resume from server. Please try again.');
            }

            const resumeBlob = await proxyResponse.blob();

            const formData = new FormData();
            formData.append('jobId', jobId);
            formData.append('resume', resumeBlob, 'resume.pdf');

            await axios.post(`${API}/api/applications/apply`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Refresh applications list to show Applied badge
            const appsRes = await axios.get(`${API}/api/applications/candidate/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(appsRes.data);

        } catch (error) {
            console.error('Application failed', error);
            alert(error.response?.data?.error || error.message || 'Application failed. Please try again.');
        } finally {
            setApplyingTo(null);
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Renders the right badge/score after a candidate has applied to a job
    const renderAppliedState = (app) => {
        // Pre-filter auto-rejected — score is explicitly 0 and status is rejected
        if (app.status === 'rejected' && app.finalScore === 0) {
            return (
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 font-bold text-sm">
                        <XCircle className="w-4 h-4" /> Not Qualified
                    </div>
                    {app.aiFeedback && (
                        <span className="text-xs text-rose-400/80 max-w-[200px] text-right leading-tight">
                            {app.aiFeedback.replace('Pre-screened: ', '')}
                        </span>
                    )}
                </div>
            );
        }

        // AI analysis still running (status is still 'applied', no score yet)
        if (app.status === 'applied' && app.finalScore == null) {
            return (
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Applied
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> AI analysis in progress...
                    </span>
                </div>
            );
        }

        // AI analysis failed (status still 'applied' but aiFeedback has an error message)
        if (app.status === 'applied' && app.aiFeedback && app.finalScore == null) {
            return (
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Applied
                    </div>
                    <span className="text-xs text-yellow-400/80">Score unavailable</span>
                </div>
            );
        }

        // Normal: scored successfully
        const score = app.finalScore ?? app.matchScore;
        return (
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Applied
                </div>
                {score != null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        score >= 75 ? 'bg-emerald-700 text-white' :
                        score >= 50 ? 'bg-yellow-600 text-white' :
                        'bg-rose-700 text-white'
                    }`}>
                        AI Match: {Math.round(score)}%
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Internal Job Board</h2>
                    <p className="text-slate-400">Discover and apply to open roles tailored to your semantic skills.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by title or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    />
                </div>
            </div>

            {!profile && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-500">Resume Required</h4>
                        <p className="text-sm text-yellow-500/80">You must upload your resume in the Profile tab before you can apply to any jobs.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence>
                    {filteredJobs.map((job) => {
                        const app = appMap[job._id];
                        return (
                            <motion.div
                                key={job._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-colors group flex flex-col md:flex-row gap-6 md:items-center justify-between"
                            >
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {job.title}
                                        </h3>
                                        <p className="text-slate-400 font-medium">{job.companyId?.companyName || 'Hiring Company'}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</span>
                                        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.experienceLevel || 'Mid Level'}</span>
                                        {job.postedAt && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(job.postedAt).toLocaleDateString()}</span>}
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        {job.requiredSkills?.slice(0, 5).map(skill => (
                                            <span key={skill} className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                                                {skill}
                                            </span>
                                        ))}
                                        {(job.requiredSkills?.length || 0) > 5 && (
                                            <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-500 rounded-md">
                                                +{(job.requiredSkills?.length || 0) - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                    {hasApplied(job._id) ? (
                                        renderAppliedState(app)
                                    ) : (
                                        <button
                                            onClick={() => handleApply(job._id)}
                                            disabled={applyingTo === job._id || !profile}
                                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                        >
                                            {applyingTo === job._id ? 'Submitting...' : (
                                                <>Apply Now <Send className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredJobs.length === 0 && (
                    <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                        No jobs found matching "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowseJobs;