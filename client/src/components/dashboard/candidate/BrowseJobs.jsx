import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Briefcase, Clock, Send, CheckCircle2, AlertCircle, Loader2, XCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BrowseJobs = () => {
    const { isDark } = useTheme();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [applyingTo, setApplyingTo] = useState(null);
    const [applyError, setApplyError] = useState('');
    const [expandedSkills, setExpandedSkills] = useState({});

    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    useEffect(() => { fetchData(); }, []);

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

    const hasApplied = (jobId) => applications.some(app => app.jobId._id === jobId || app.jobId === jobId);

    const appMap = applications.reduce((map, app) => {
        const id = app.jobId._id || app.jobId;
        map[id] = app;
        return map;
    }, {});

    // FIX #1: Compute skill match between candidate profile and job
    const getSkillMatch = (job) => {
        if (!profile?.skills?.length) return null;
        const candidateSkills = profile.skills.map(s => s.toLowerCase());
        const required = job.requiredSkills || [];
        if (!required.length) return null;
        const matched = required.filter(s => candidateSkills.includes(s.toLowerCase()));
        return { matched: matched.length, total: required.length, skills: matched };
    };

    const handleApply = async (jobId) => {
        if (!profile || !profile.resumeUrl) {
            alert("Please upload your resume in the 'Resume Profile' tab before applying.");
            return;
        }
        setApplyError('');
        setApplyingTo(jobId);
        try {
            const proxyResponse = await fetch(`${API}/api/candidate/resume-proxy/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!proxyResponse.ok) {
                throw new Error(
                    proxyResponse.status === 404
                        ? "Resume not found. Please re-upload your resume in the Resume Profile tab."
                        : `Failed to fetch resume (${proxyResponse.status}). Please try again.`
                );
            }
            const resumeBlob = await proxyResponse.blob();
            const formData = new FormData();
            formData.append('jobId', jobId);
            formData.append('resume', resumeBlob, 'resume.pdf');
            await axios.post(`${API}/api/applications/apply`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
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

    const renderAppliedState = (app) => {
        if (app.status === 'rejected' && app.finalScore === 0) {
            return (
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-200'}`}>
                        <XCircle className="w-4 h-4" /> Not Qualified
                    </div>
                    {app.aiFeedback && (
                        <span className={`text-xs max-w-[200px] text-right leading-tight ${isDark ? 'text-rose-400/80' : 'text-rose-500'}`}>
                            {app.aiFeedback.replace('Pre-screened: ', '')}
                        </span>
                    )}
                </div>
            );
        }
        if (app.status === 'applied' && app.finalScore == null) {
            return (
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                        <CheckCircle2 className="w-4 h-4" /> Applied
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Loader2 className="w-3 h-3 animate-spin" /> AI analysis in progress...
                    </span>
                </div>
            );
        }
        const score = app.finalScore ?? app.matchScore;
        return (
            <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                    <CheckCircle2 className="w-4 h-4" /> Applied
                </div>
                {score != null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${score >= 75 ? 'bg-emerald-500 text-white' : score >= 50 ? 'bg-yellow-500 text-white' : 'bg-rose-500 text-white'}`}>
                        AI Match: {Math.round(score)}%
                    </span>
                )}
            </div>
        );
    };

    // FIX #1: Skill match badge
    const renderSkillMatchBadge = (job) => {
        const match = getSkillMatch(job);
        if (!match) return null;
        const pct = Math.round((match.matched / match.total) * 100);
        const color = pct >= 70
            ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : pct >= 40
            ? isDark ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            : isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${color}`}>
                <Sparkles className="w-3 h-3" />
                {match.matched}/{match.total} skills match
            </span>
        );
    };

    // FIX #2: theme-aware classes
    const pageBg = isDark ? '' : '';
    const headText = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const searchBg = isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm';
    const cardBg = isDark ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm';
    const skillPillBg = isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200';
    const divider = isDark ? 'border-slate-800' : 'border-slate-100';

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className={`text-3xl font-bold mb-2 ${headText}`}>Internal Job Board</h2>
                    <p className={subText}>Discover and apply to open roles tailored to your semantic skills.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by title or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500/50 outline-none transition ${searchBg}`}
                    />
                </div>
            </div>

            {!profile && (
                <div className={`p-4 rounded-xl flex items-start gap-4 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-500">Resume Required</h4>
                        <p className={`text-sm ${isDark ? 'text-yellow-500/80' : 'text-yellow-600'}`}>You must upload your resume in the Profile tab before you can apply to any jobs.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence>
                    {filteredJobs.map((job) => {
                        const app = appMap[job._id];
                        const skillsToShow = expandedSkills[job._id] ? job.requiredSkills : job.requiredSkills?.slice(0, 5);
                        const hasMore = (job.requiredSkills?.length || 0) > 5;
                        return (
                            <motion.div
                                key={job._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`backdrop-blur-sm border p-6 rounded-2xl transition-all group flex flex-col md:flex-row gap-6 md:items-center justify-between ${cardBg}`}
                            >
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className={`text-xl font-bold group-hover:text-indigo-400 transition-colors ${headText}`}>
                                            {job.title}
                                        </h3>
                                        <p className={`font-medium ${subText}`}>{job.companyId?.companyName || 'Hiring Company'}</p>
                                    </div>

                                    <div className={`flex flex-wrap gap-4 text-sm ${subText}`}>
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</span>
                                        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.experienceLevel || 'Mid Level'}</span>
                                        {job.postedAt && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(job.postedAt).toLocaleDateString()}</span>}
                                    </div>

                                    <div className="flex gap-2 flex-wrap items-center">
                                        {skillsToShow?.map(skill => (
                                            <span key={skill} className={`text-xs font-semibold px-2 py-1 rounded-md border ${skillPillBg}`}>
                                                {skill}
                                            </span>
                                        ))}
                                        {hasMore && (
                                            <button
                                                onClick={() => setExpandedSkills(prev => ({ ...prev, [job._id]: !prev[job._id] }))}
                                                className={`text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 transition ${isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {expandedSkills[job._id] ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> +{job.requiredSkills.length - 5} more</>}
                                            </button>
                                        )}
                                    </div>

                                    {/* FIX #1: Skill match indicator before applying */}
                                    {!hasApplied(job._id) && renderSkillMatchBadge(job)}
                                </div>

                                <div className={`shrink-0 flex flex-col items-end gap-3 justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 ${divider}`}>
                                    {hasApplied(job._id) ? (
                                        renderAppliedState(app)
                                    ) : (
                                        <button
                                            onClick={() => handleApply(job._id)}
                                            disabled={applyingTo === job._id || !profile}
                                            className={`w-full md:w-auto font-bold px-8 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                !profile
                                                    ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                            }`}
                                        >
                                            {applyingTo === job._id ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                            ) : (
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
                    <div className={`text-center py-20 border border-dashed rounded-2xl ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                        {searchTerm ? `No jobs found matching "${searchTerm}".` : 'No jobs available right now.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowseJobs;