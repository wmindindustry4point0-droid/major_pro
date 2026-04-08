import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Table, Users, ExternalLink, Loader2, ArrowLeft, Trash2,
    BrainCircuit, ChevronDown, Filter, SortAsc, MessageSquare,
    CheckCircle2, XCircle, X, TrendingUp, AlertCircle, Trophy
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STAGES = {
    applied:     { label: 'Applied',     color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       dot: 'bg-slate-400' },
    screened:    { label: 'Screened',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',          dot: 'bg-blue-400' },
    shortlisted: { label: 'Shortlisted', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',    dot: 'bg-indigo-400' },
    interview:   { label: 'Interview',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400' },
    selected:    { label: 'Selected',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    rejected:    { label: 'Rejected',    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',          dot: 'bg-rose-400' },
};

const NEXT_TRANSITIONS = {
    applied:     ['screened', 'rejected'],
    screened:    ['shortlisted', 'rejected'],
    shortlisted: ['interview', 'rejected'],
    interview:   ['selected', 'rejected'],
    selected:    [],
    rejected:    [],
};

const JobManagement = ({ user }) => {
    const { isDark } = useTheme();

    const [activeTab,    setActiveTab]    = useState('view');
    const [jobs,         setJobs]         = useState([]);
    const [selectedJob,  setSelectedJob]  = useState(null);
    const [applicants,   setApplicants]   = useState([]);
    const [isLoading,    setIsLoading]    = useState(false);
    const [analyzingId,  setAnalyzingId]  = useState(null);
    const [updatingId,   setUpdatingId]   = useState(null);
    const [expandedApp,  setExpandedApp]  = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy,       setSortBy]       = useState('finalScore');
    const [noteApp,      setNoteApp]      = useState(null);
    const [noteText,     setNoteText]     = useState('');
    const [rejectModal,  setRejectModal]  = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const [newJob, setNewJob] = useState({
        title: '', description: '', mustHaveSkills: '', niceToHaveSkills: '',
        minExperience: '', maxExperience: '', experienceLevel: '', location: ''
    });

    const token      = localStorage.getItem('token');
    const authHeader = { Authorization: `Bearer ${token}` };

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const bg      = isDark ? 'bg-slate-950'     : 'bg-gray-50';
    const cardBg  = isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm';
    const cardBg2 = isDark ? 'bg-slate-900 border-slate-800'    : 'bg-gray-50 border-gray-200';
    const innerBg = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-gray-50 border-gray-200';
    const heading = isDark ? 'text-white'        : 'text-gray-900';
    const sub     = isDark ? 'text-slate-400'    : 'text-gray-500';
    const muted   = isDark ? 'text-slate-500'    : 'text-gray-400';
    const divider = isDark ? 'border-slate-700'  : 'border-gray-200';
    const inputBg = isDark
        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:ring-indigo-500/50'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-indigo-400/40';

    useEffect(() => { if (user?._id) fetchJobs(); }, [user]);
    useEffect(() => { if (selectedJob) fetchApplicants(selectedJob._id); }, [selectedJob, filterStatus, sortBy]);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API}/api/jobs`);
            setJobs(res.data.filter(j => j.companyId._id === user._id || j.companyId === user._id));
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const fetchApplicants = async (jobId) => {
        setIsLoading(true);
        try {
            const params = { sort: sortBy };
            if (filterStatus !== 'all') params.status = filterStatus;
            const res = await axios.get(`${API}/api/applications/job/${jobId}`, { headers: authHeader, params });
            setApplicants(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const p = (s) => s.split(',').map(x => x.trim()).filter(Boolean);
            await axios.post(`${API}/api/jobs`, {
                title: newJob.title, description: newJob.description,
                mustHaveSkills:   p(newJob.mustHaveSkills),
                niceToHaveSkills: p(newJob.niceToHaveSkills),
                requiredSkills:   p(newJob.mustHaveSkills),
                minExperience:    Number(newJob.minExperience) || 0,
                maxExperience:    Number(newJob.maxExperience) || 99,
                experienceLevel:  newJob.experienceLevel,
                location:         newJob.location,
            }, { headers: authHeader });
            setNewJob({ title:'', description:'', mustHaveSkills:'', niceToHaveSkills:'', minExperience:'', maxExperience:'', experienceLevel:'', location:'' });
            await fetchJobs();
            setActiveTab('view');
        } catch (err) { alert(err.response?.data?.error || 'Failed to post job'); }
        finally { setIsLoading(false); }
    };

    const handleDeleteJob = async (jobId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this job?')) return;
        try {
            await axios.delete(`${API}/api/jobs/${jobId}`, { headers: authHeader });
            fetchJobs();
            if (selectedJob?._id === jobId) setSelectedJob(null);
        } catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
    };

    const handleAnalyze = async (appId) => {
        setAnalyzingId(appId);
        try {
            const res = await axios.post(`${API}/api/applications/analyze/${appId}`, {}, { headers: authHeader });
            setApplicants(prev => prev.map(a => a._id === appId ? { ...a, ...res.data } : a));
        } catch { alert('AI analysis failed. Ensure the AI service is running.'); }
        finally { setAnalyzingId(null); }
    };

    const handleStatusChange = async (appId, newStatus, currentStatus, reason = '') => {
        const allowed = NEXT_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(newStatus)) { alert(`Cannot move from "${currentStatus}" to "${newStatus}".`); return; }
        setUpdatingId(appId);
        try {
            const res = await axios.patch(`${API}/api/applications/${appId}/status`, { status: newStatus, rejectionReason: reason }, { headers: authHeader });
            setApplicants(prev => prev.map(a => a._id === appId ? { ...a, status: res.data.status } : a));
            setRejectModal(null); setRejectReason('');
        } catch (err) { alert(err.response?.data?.error || 'Failed to update status.'); }
        finally { setUpdatingId(null); }
    };

    const handleSaveNote = async () => {
        if (!noteApp) return;
        try {
            await axios.patch(`${API}/api/applications/${noteApp}/notes`, { recruiterNotes: noteText }, { headers: authHeader });
            setApplicants(prev => prev.map(a => a._id === noteApp ? { ...a, recruiterNotes: noteText } : a));
            setNoteApp(null); setNoteText('');
        } catch { alert('Failed to save note.'); }
    };

    const getScoreColor = (s) => s == null ? muted : s >= 75 ? 'text-emerald-400' : s >= 55 ? 'text-yellow-400' : 'text-rose-400';
    const getScoreBg    = (s) => s == null ? (isDark ? 'bg-slate-700' : 'bg-gray-200') : s >= 75 ? 'bg-emerald-500' : s >= 55 ? 'bg-yellow-500' : 'bg-rose-500';

    const stageCounts = Object.keys(STAGES).reduce((acc, s) => { acc[s] = applicants.filter(a => a.status === s).length; return acc; }, {});
    const fadeProps   = { initial: { opacity:0, y:10 }, animate: { opacity:1, y:0 }, exit: { opacity:0, y:-10 } };

    // Shared input class
    const inp = `w-full border p-3 sm:p-3.5 rounded-xl focus:outline-none focus:ring-2 text-sm ${inputBg}`;

    return (
        <div className="space-y-4 sm:space-y-6 pb-10 sm:pb-12">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h2 className={`text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 ${heading}`}>Job Management</h2>
                    <p className={`text-xs sm:text-sm ${sub}`}>Post jobs, manage the pipeline, rank candidates by AI score.</p>
                </div>
                {!selectedJob && (
                    <div className={`flex p-1 rounded-xl border self-start sm:self-auto ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-100 border-gray-200'}`}>
                        {['view','create'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === tab ? 'bg-indigo-500 text-white' : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')}`}>
                                {tab === 'view' ? <><Table className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Active Jobs</> : <><Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Post New Job</>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* CREATE */}
                {activeTab === 'create' && !selectedJob && (
                    <motion.div key="create" {...fadeProps} className={`border rounded-2xl p-5 sm:p-8 max-w-4xl mx-auto ${cardBg}`}>
                        <h3 className={`text-lg sm:text-xl font-bold mb-5 sm:mb-6 ${heading}`}>Post a New Job</h3>
                        <form onSubmit={handlePostJob} className="space-y-4 sm:space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Job Title</label>
                                    <input className={inp} placeholder="e.g. Senior Backend Engineer" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Job Description</label>
                                    <textarea className={`${inp} h-24 sm:h-28 resize-y`} placeholder="Describe responsibilities..." value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Must-Have Skills <span className="text-rose-400">*</span></label>
                                    <input className={`${inp} border-rose-500/30 focus:ring-rose-500/30`} placeholder="React, Node.js, MongoDB" value={newJob.mustHaveSkills} onChange={e => setNewJob({...newJob, mustHaveSkills: e.target.value})} required />
                                    <p className={`text-xs ${muted}`}>Missing these → auto-filtered before AI runs</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Nice-to-Have Skills</label>
                                    <input className={inp} placeholder="GraphQL, Redis, Kubernetes" value={newJob.niceToHaveSkills} onChange={e => setNewJob({...newJob, niceToHaveSkills: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Min Experience (yrs)</label>
                                    <input type="number" min="0" className={inp} placeholder="e.g. 3" value={newJob.minExperience} onChange={e => setNewJob({...newJob, minExperience: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Max Experience (yrs)</label>
                                    <input type="number" min="0" className={inp} placeholder="e.g. 8" value={newJob.maxExperience} onChange={e => setNewJob({...newJob, maxExperience: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Experience Level</label>
                                    <select className={`${inp} appearance-none`} value={newJob.experienceLevel} onChange={e => setNewJob({...newJob, experienceLevel: e.target.value})} required>
                                        <option value="" disabled>Select Level</option>
                                        <option>Entry Level</option><option>Mid Level</option>
                                        <option>Senior Level</option><option>Lead / Principal</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-xs sm:text-sm font-semibold ${sub}`}>Location</label>
                                    <input className={inp} placeholder="Mumbai / Remote" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} />
                                </div>
                            </div>
                            <div className={`flex flex-col sm:flex-row gap-3 pt-4 border-t ${divider}`}>
                                <button type="submit" disabled={isLoading}
                                    className={`flex-1 font-bold py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base text-white transition-colors ${isLoading ? (isDark ? 'bg-slate-700' : 'bg-gray-300') + ' cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Posting...</> : <><Plus className="w-4 h-4" />Post Job</>}
                                </button>
                                <button type="button" onClick={() => setActiveTab('view')}
                                    className={`px-5 sm:px-6 py-3 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* VIEW JOBS */}
                {activeTab === 'view' && !selectedJob && (
                    <motion.div key="view" {...fadeProps} className="space-y-3">
                        {isLoading
                            ? <div className="flex justify-center py-16 sm:py-20"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
                            : jobs.length === 0
                                ? <div className={`text-center py-16 sm:py-20 border border-dashed rounded-2xl text-sm ${isDark ? 'border-slate-700 text-slate-500' : 'border-gray-300 text-gray-400'}`}>No jobs yet. Click "Post New Job".</div>
                                : jobs.map(job => (
                                    <div key={job._id} onClick={() => setSelectedJob(job)}
                                        className={`border rounded-2xl p-4 sm:p-6 cursor-pointer transition-all group ${isDark ? 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/60' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md shadow-sm'}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`text-base sm:text-lg font-bold group-hover:text-indigo-400 truncate transition-colors ${heading}`}>{job.title}</h3>
                                                <p className={`text-xs sm:text-sm mt-0.5 ${sub}`}>{job.location || 'No location'} · {job.experienceLevel}</p>
                                                <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                                                    {(job.mustHaveSkills?.length > 0 ? job.mustHaveSkills : job.requiredSkills)?.slice(0,4).map(s => (
                                                        <span key={s} className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">{s}</span>
                                                    ))}
                                                    {job.niceToHaveSkills?.slice(0,2).map(s => (
                                                        <span key={s} className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${sub}`}><Users className="w-4 h-4" />View Pipeline</div>
                                                <button onClick={e => handleDeleteJob(job._id, e)}
                                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        }
                    </motion.div>
                )}

                {/* APPLICANTS */}
                {selectedJob && (
                    <motion.div key="applicants" {...fadeProps} className="space-y-4 sm:space-y-6">
                        <button onClick={() => { setSelectedJob(null); setFilterStatus('all'); }}
                            className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                            <ArrowLeft className="w-4 h-4" />Back to Jobs
                        </button>

                        {/* Job summary card */}
                        <div className={`border rounded-2xl p-4 sm:p-6 ${cardBg}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                <div>
                                    <h3 className={`text-lg sm:text-xl font-bold ${heading}`}>{selectedJob.title}</h3>
                                    <p className={`text-xs sm:text-sm ${sub}`}>{applicants.length} applicants</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {Object.entries(stageCounts).filter(([,c]) => c > 0).map(([s,c]) => (
                                        <div key={s} className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold border ${STAGES[s].color}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${STAGES[s].dot}`} />{c} {STAGES[s].label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Filters — scrollable on mobile */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                            <Filter className={`w-4 h-4 shrink-0 ${muted}`} />
                            <div className="flex gap-1.5 sm:gap-2 shrink-0">
                                {['all',...Object.keys(STAGES)].map(s => (
                                    <button key={s} onClick={() => setFilterStatus(s)}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filterStatus===s ? 'bg-indigo-500 text-white border-indigo-500' : (isDark ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-400')}`}>
                                        {s==='all'?'All':STAGES[s].label}{s!=='all'&&stageCounts[s]>0&&<span className="ml-1 opacity-70">({stageCounts[s]})</span>}
                                    </button>
                                ))}
                            </div>
                            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <SortAsc className={`w-4 h-4 ${sub}`} />
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                    className={`border text-xs rounded-lg px-2.5 sm:px-3 py-1.5 focus:outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                                    <option value="finalScore">AI Score</option>
                                    <option value="appliedAt">Date Applied</option>
                                </select>
                            </div>
                        </div>

                        {isLoading
                            ? <div className="flex justify-center py-10 sm:py-12"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
                            : applicants.length === 0
                                ? <div className={`text-center py-12 sm:py-16 border border-dashed rounded-2xl text-sm ${isDark ? 'border-slate-700 text-slate-500' : 'border-gray-300 text-gray-400'}`}>
                                    No applicants{filterStatus!=='all'?` in "${STAGES[filterStatus]?.label}"`:''} yet.
                                  </div>
                                : (
                                    <div className="space-y-3">
                                        {applicants.map((app, idx) => {
                                            const stage      = STAGES[app.status] || STAGES.applied;
                                            const score      = app.finalScore ?? app.matchScore;
                                            const isExpanded = expandedApp === app._id;
                                            const nextStages = NEXT_TRANSITIONS[app.status] || [];

                                            return (
                                                <div key={app._id} className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                    <div className="p-4 sm:p-5">
                                                        {/* Top row */}
                                                        <div className="flex flex-col gap-3 sm:gap-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                {/* Avatar + name */}
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="relative shrink-0">
                                                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                                                                            {app.candidateId?.name?.charAt(0) || '?'}
                                                                        </div>
                                                                        {idx===0&&filterStatus==='all'&&sortBy==='finalScore'&&(
                                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                                                                <Trophy className="w-2.5 h-2.5 text-amber-900" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className={`font-bold text-sm sm:text-base truncate ${heading}`}>{app.candidateId?.name || 'Unknown'}</p>
                                                                        <p className={`text-xs truncate ${muted}`}>{app.candidateId?.email}</p>
                                                                    </div>
                                                                </div>
                                                                {/* Score + badge */}
                                                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                                    {score != null
                                                                        ? <div className="text-center"><div className={`text-xl sm:text-2xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}%</div><div className={`text-xs ${muted}`}>AI Score</div></div>
                                                                        : <div className={`text-xs text-center ${muted}`}>Pending<br />AI Score</div>
                                                                    }
                                                                    <span className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold border ${stage.color}`}>
                                                                        <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />{stage.label}</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Actions — wrappable */}
                                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                {app.resumeSignedUrl && (
                                                                    <a href={app.resumeSignedUrl} target="_blank" rel="noopener noreferrer"
                                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                                                                        <ExternalLink className="w-3.5 h-3.5" />Resume
                                                                    </a>
                                                                )}
                                                                <button onClick={() => handleAnalyze(app._id)} disabled={analyzingId===app._id}
                                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${analyzingId===app._id ? (isDark ? 'bg-slate-700' : 'bg-gray-300 text-gray-500') + ' cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                                                    {analyzingId===app._id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</> : <><BrainCircuit className="w-3.5 h-3.5" />Re-Analyze</>}
                                                                </button>
                                                                {nextStages.filter(s => s !== 'rejected').map(s => (
                                                                    <button key={s} onClick={() => handleStatusChange(app._id, s, app.status)} disabled={updatingId===app._id}
                                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white capitalize ${updatingId===app._id ? (isDark ? 'bg-slate-700' : 'bg-gray-300') + ' cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />{STAGES[s]?.label}
                                                                    </button>
                                                                ))}
                                                                {nextStages.includes('rejected') && (
                                                                    <button onClick={() => setRejectModal({ appId: app._id, currentStatus: app.status })} disabled={updatingId===app._id}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium">
                                                                        <XCircle className="w-3.5 h-3.5" />Reject
                                                                    </button>
                                                                )}
                                                                <button onClick={() => { setNoteApp(app._id); setNoteText(app.recruiterNotes || ''); }}
                                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-400' : 'border-gray-200 hover:bg-gray-100 text-gray-500'}`}>
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => setExpandedApp(isExpanded ? null : app._id)}
                                                                    className={`px-2 py-1.5 rounded-lg border text-xs transition-colors ${isExpanded ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : (isDark ? 'border-slate-700 text-slate-500 hover:bg-slate-700' : 'border-gray-200 text-gray-400 hover:bg-gray-100')}`}>
                                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Skills preview */}
                                                        {(app.skillsMatched?.length > 0 || app.skillsMissing?.length > 0) && (
                                                            <div className="mt-3 flex flex-wrap gap-1">
                                                                {app.skillsMatched?.slice(0,6).map(s => <span key={s} className="text-xs px-1.5 sm:px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">{s}</span>)}
                                                                {app.skillsMissing?.slice(0,3).map(s => <span key={s} className="text-xs px-1.5 sm:px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">✗ {s}</span>)}
                                                            </div>
                                                        )}
                                                        {app.recruiterNotes && <p className={`mt-2 text-xs italic ${muted}`}>📝 {app.recruiterNotes}</p>}
                                                    </div>

                                                    {/* Expanded breakdown */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                                                                className={`border-t overflow-hidden ${divider}`}>
                                                                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                                                                    <div>
                                                                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4 ${muted}`}>Score Breakdown</h4>
                                                                        {app.scoreBreakdown ? (
                                                                            <div className="space-y-2.5 sm:space-y-3">
                                                                                {[{key:'skills',label:'Skill Match',weight:'35%'},{key:'semantic',label:'Semantic Fit',weight:'30%'},{key:'experience',label:'Experience',weight:'20%'},{key:'projects',label:'Projects',weight:'15%'}].map(({key,label,weight}) => {
                                                                                    const val = Math.round((app.scoreBreakdown[key]||0)*100);
                                                                                    return (
                                                                                        <div key={key}>
                                                                                            <div className="flex justify-between text-xs mb-1">
                                                                                                <span className={sub}>{label} <span className={muted}>({weight})</span></span>
                                                                                                <span className={getScoreColor(val)}>{val}%</span>
                                                                                            </div>
                                                                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                                                                                <div className={`h-full rounded-full ${getScoreBg(val)}`} style={{width:`${val}%`}} />
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : <p className={`text-xs ${muted}`}>Run AI analysis to see breakdown.</p>}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4 ${muted}`}>AI Insights</h4>
                                                                        <div className="space-y-2">
                                                                            {(app.strengths||[]).map((s,i) => <div key={i} className="flex gap-2 text-xs"><TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/><span className={sub}>{s}</span></div>)}
                                                                            {(app.weaknesses||[]).map((w,i) => <div key={i} className="flex gap-2 text-xs"><AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5"/><span className={muted}>{w}</span></div>)}
                                                                            {!app.strengths?.length && !app.weaknesses?.length && <p className={`text-xs ${muted}`}>Run AI analysis to see insights.</p>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                        }
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reject modal */}
            <AnimatePresence>
                {rejectModal && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setRejectModal(null)}>
                        <motion.div initial={{y:40,scale:0.97}} animate={{y:0,scale:1}} exit={{y:40,scale:0.97}}
                            className={`w-full sm:max-w-md border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold ${heading}`}>Reject Application</h3>
                                <button onClick={() => setRejectModal(null)}><X className={`w-5 h-5 ${sub}`} /></button>
                            </div>
                            <textarea className={`${inp} resize-none h-24`} placeholder="Optional reason (shared with candidate)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => handleStatusChange(rejectModal.appId,'rejected',rejectModal.currentStatus,rejectReason)}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 sm:py-3 rounded-xl text-sm">Confirm Reject</button>
                                <button onClick={() => setRejectModal(null)}
                                    className={`px-4 sm:px-5 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes modal */}
            <AnimatePresence>
                {noteApp && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setNoteApp(null)}>
                        <motion.div initial={{y:40,scale:0.97}} animate={{y:0,scale:1}} exit={{y:40,scale:0.97}}
                            className={`w-full sm:max-w-md border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold ${heading}`}>Recruiter Note</h3>
                                <button onClick={() => setNoteApp(null)}><X className={`w-5 h-5 ${sub}`} /></button>
                            </div>
                            <textarea className={`${inp} resize-none h-28`} placeholder="Private note (only visible to your team)..." value={noteText} onChange={e => setNoteText(e.target.value)} />
                            <div className="flex gap-3 mt-4">
                                <button onClick={handleSaveNote} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 sm:py-3 rounded-xl text-sm">Save Note</button>
                                <button onClick={() => setNoteApp(null)}
                                    className={`px-4 sm:px-5 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobManagement;