import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Table, Users, ExternalLink, Loader2, ArrowLeft, Trash2,
    BrainCircuit, ChevronDown, Filter, SortAsc, MessageSquare,
    CheckCircle2, XCircle, X, TrendingUp, AlertCircle, Trophy
} from 'lucide-react';

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
            const res = await axios.patch(
                `${API}/api/applications/${appId}/status`,
                { status: newStatus, rejectionReason: reason },
                { headers: authHeader }
            );
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

    const getScoreColor = (s) => s == null ? 'text-slate-500' : s >= 75 ? 'text-emerald-400' : s >= 55 ? 'text-yellow-400' : 'text-rose-400';
    const getScoreBg    = (s) => s == null ? 'bg-slate-700' : s >= 75 ? 'bg-emerald-500' : s >= 55 ? 'bg-yellow-500' : 'bg-rose-500';

    const stageCounts = Object.keys(STAGES).reduce((acc, s) => { acc[s] = applicants.filter(a => a.status === s).length; return acc; }, {});
    const fadeProps   = { initial: { opacity:0, y:10 }, animate: { opacity:1, y:0 }, exit: { opacity:0, y:-10 } };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Job Management</h2>
                    <p className="text-slate-400 text-sm">Post jobs, manage the pipeline, rank candidates by AI score.</p>
                </div>
                {!selectedJob && (
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        {['view','create'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                                {tab === 'view' ? <><Table className="w-4 h-4" />Active Jobs</> : <><Plus className="w-4 h-4" />Post New Job</>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* CREATE */}
                {activeTab === 'create' && !selectedJob && (
                    <motion.div key="create" {...fadeProps} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto">
                        <h3 className="text-xl font-bold text-white mb-6">Post a New Job</h3>
                        <form onSubmit={handlePostJob} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Job Title</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="e.g. Senior Backend Engineer" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Job Description</label>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600 h-28 resize-y" placeholder="Describe responsibilities..." value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Must-Have Skills <span className="text-rose-400">*</span></label>
                                    <input className="w-full bg-slate-900 border border-rose-500/30 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 placeholder-slate-600" placeholder="React, Node.js, MongoDB" value={newJob.mustHaveSkills} onChange={e => setNewJob({...newJob, mustHaveSkills: e.target.value})} required />
                                    <p className="text-xs text-slate-500">Missing these → auto-filtered before AI runs</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Nice-to-Have Skills</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="GraphQL, Redis, Kubernetes" value={newJob.niceToHaveSkills} onChange={e => setNewJob({...newJob, niceToHaveSkills: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Min Experience (years)</label>
                                    <input type="number" min="0" className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="e.g. 3" value={newJob.minExperience} onChange={e => setNewJob({...newJob, minExperience: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Max Experience (years)</label>
                                    <input type="number" min="0" className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="e.g. 8" value={newJob.maxExperience} onChange={e => setNewJob({...newJob, maxExperience: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Experience Level</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none" value={newJob.experienceLevel} onChange={e => setNewJob({...newJob, experienceLevel: e.target.value})} required>
                                        <option value="" disabled>Select Level</option>
                                        <option>Entry Level</option><option>Mid Level</option>
                                        <option>Senior Level</option><option>Lead / Principal</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Location</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600" placeholder="Mumbai / Remote" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                                <button type="submit" disabled={isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin"/>Posting...</> : <><Plus className="w-5 h-5"/>Post Job</>}
                                </button>
                                <button type="button" onClick={() => setActiveTab('view')} className="px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* VIEW JOBS */}
                {activeTab === 'view' && !selectedJob && (
                    <motion.div key="view" {...fadeProps} className="space-y-4">
                        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin"/></div>
                        : jobs.length === 0 ? <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl text-slate-500">No jobs yet. Click "Post New Job".</div>
                        : jobs.map(job => (
                            <div key={job._id} onClick={() => setSelectedJob(job)} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 truncate">{job.title}</h3>
                                        <p className="text-slate-400 text-sm mt-1">{job.location || 'No location'} · {job.experienceLevel}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {(job.mustHaveSkills?.length > 0 ? job.mustHaveSkills : job.requiredSkills)?.slice(0,4).map(s => (
                                                <span key={s} className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-md">{s}</span>
                                            ))}
                                            {job.niceToHaveSkills?.slice(0,2).map(s => (
                                                <span key={s} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-md">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-sm"><Users className="w-4 h-4"/><span>View Pipeline</span></div>
                                        <button onClick={e => handleDeleteJob(job._id, e)} className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* APPLICANTS */}
                {selectedJob && (
                    <motion.div key="applicants" {...fadeProps} className="space-y-6">
                        <button onClick={() => { setSelectedJob(null); setFilterStatus('all'); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium">
                            <ArrowLeft className="w-4 h-4"/>Back to Jobs
                        </button>

                        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedJob.title}</h3>
                                    <p className="text-slate-400 text-sm">{applicants.length} applicants</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(stageCounts).filter(([,c])=>c>0).map(([s,c]) => (
                                        <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${STAGES[s].color}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${STAGES[s].dot}`}/>{c} {STAGES[s].label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <Filter className="w-4 h-4 text-slate-500"/>
                            {['all',...Object.keys(STAGES)].map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus===s ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                    {s==='all'?'All':STAGES[s].label}{s!=='all'&&stageCounts[s]>0&&<span className="ml-1 opacity-70">({stageCounts[s]})</span>}
                                </button>
                            ))}
                            <div className="ml-auto flex items-center gap-2">
                                <SortAsc className="w-4 h-4 text-slate-400"/>
                                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
                                    <option value="finalScore">Sort: AI Score</option>
                                    <option value="appliedAt">Sort: Date Applied</option>
                                </select>
                            </div>
                        </div>

                        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin"/></div>
                        : applicants.length === 0 ? <div className="text-center py-16 border border-dashed border-slate-700 rounded-2xl text-slate-500">No applicants{filterStatus!=='all'?` in "${STAGES[filterStatus]?.label}"`:''} yet.</div>
                        : (
                            <div className="space-y-3">
                                {applicants.map((app, idx) => {
                                    const stage      = STAGES[app.status] || STAGES.applied;
                                    const score      = app.finalScore ?? app.matchScore;
                                    const isExpanded = expandedApp === app._id;
                                    const nextStages = NEXT_TRANSITIONS[app.status] || [];

                                    return (
                                        <div key={app._id} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                                            <div className="p-5">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    {/* Candidate */}
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div className="relative shrink-0">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                                                                {app.candidateId?.name?.charAt(0)||'?'}
                                                            </div>
                                                            {idx===0&&filterStatus==='all'&&sortBy==='finalScore'&&(
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                                                    <Trophy className="w-2.5 h-2.5 text-amber-900"/>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-white font-bold">{app.candidateId?.name||'Unknown'}</p>
                                                            <p className="text-slate-400 text-xs truncate">{app.candidateId?.email}</p>
                                                        </div>
                                                    </div>

                                                    {/* Score + stage */}
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        {score!=null ? (
                                                            <div className="text-center">
                                                                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}%</div>
                                                                <div className="text-xs text-slate-500">AI Score</div>
                                                            </div>
                                                        ) : <div className="text-slate-600 text-sm text-center">Pending<br/><span className="text-xs">AI Score</span></div>}
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${stage.color}`}>
                                                            <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`}/>{stage.label}</span>
                                                        </span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                        {app.resumeSignedUrl && (
                                                            <a href={app.resumeSignedUrl} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium">
                                                                <ExternalLink className="w-3.5 h-3.5"/>Resume
                                                            </a>
                                                        )}
                                                        <button onClick={() => handleAnalyze(app._id)} disabled={analyzingId===app._id}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-medium">
                                                            {analyzingId===app._id ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Analyzing...</> : <><BrainCircuit className="w-3.5 h-3.5"/>Re-Analyze</>}
                                                        </button>
                                                        {nextStages.filter(s=>s!=='rejected').map(s => (
                                                            <button key={s} onClick={() => handleStatusChange(app._id, s, app.status)} disabled={updatingId===app._id}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-medium capitalize">
                                                                <CheckCircle2 className="w-3.5 h-3.5"/>{STAGES[s]?.label}
                                                            </button>
                                                        ))}
                                                        {nextStages.includes('rejected') && (
                                                            <button onClick={() => setRejectModal({ appId: app._id, currentStatus: app.status })} disabled={updatingId===app._id}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium">
                                                                <XCircle className="w-3.5 h-3.5"/>Reject
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setNoteApp(app._id); setNoteText(app.recruiterNotes||''); }}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-400 text-xs">
                                                            <MessageSquare className="w-3.5 h-3.5"/>
                                                        </button>
                                                        <button onClick={() => setExpandedApp(isExpanded ? null : app._id)}
                                                            className={`px-2 py-2 rounded-lg border text-xs transition-colors ${isExpanded ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-slate-700 text-slate-500 hover:bg-slate-700'}`}>
                                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded?'rotate-180':''}`}/>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Skills preview */}
                                                {(app.skillsMatched?.length > 0 || app.skillsMissing?.length > 0) && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {app.skillsMatched?.slice(0,6).map(s => <span key={s} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">{s}</span>)}
                                                        {app.skillsMissing?.slice(0,3).map(s => <span key={s} className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">✗ {s}</span>)}
                                                    </div>
                                                )}
                                                {app.recruiterNotes && <p className="mt-2 text-xs text-slate-500 italic">📝 {app.recruiterNotes}</p>}
                                            </div>

                                            {/* Breakdown panel */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                                                        className="border-t border-slate-700 overflow-hidden">
                                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Score Breakdown</h4>
                                                                {app.scoreBreakdown ? (
                                                                    <div className="space-y-3">
                                                                        {[{key:'skills',label:'Skill Match',weight:'35%'},{key:'semantic',label:'Semantic Fit',weight:'30%'},{key:'experience',label:'Experience',weight:'20%'},{key:'projects',label:'Projects',weight:'15%'}].map(({key,label,weight}) => {
                                                                            const val = Math.round((app.scoreBreakdown[key]||0)*100);
                                                                            return (
                                                                                <div key={key}>
                                                                                    <div className="flex justify-between text-xs mb-1">
                                                                                        <span className="text-slate-400">{label} <span className="text-slate-600">({weight})</span></span>
                                                                                        <span className={getScoreColor(val)}>{val}%</span>
                                                                                    </div>
                                                                                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                                        <div className={`h-full rounded-full ${getScoreBg(val)}`} style={{width:`${val}%`}}/>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : <p className="text-xs text-slate-600">Run AI analysis to see breakdown.</p>}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">AI Insights</h4>
                                                                <div className="space-y-2">
                                                                    {(app.strengths||[]).map((s,i) => <div key={i} className="flex gap-2 text-xs"><TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/><span className="text-slate-300">{s}</span></div>)}
                                                                    {(app.weaknesses||[]).map((w,i) => <div key={i} className="flex gap-2 text-xs"><AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5"/><span className="text-slate-400">{w}</span></div>)}
                                                                    {!app.strengths?.length && !app.weaknesses?.length && <p className="text-xs text-slate-600">Run AI analysis to see insights.</p>}
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
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reject modal */}
            <AnimatePresence>
                {rejectModal && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setRejectModal(null)}>
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold">Reject Application</h3>
                                <button onClick={() => setRejectModal(null)}><X className="w-5 h-5 text-slate-400"/></button>
                            </div>
                            <textarea className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-rose-500/30 placeholder-slate-600"
                                placeholder="Optional reason (shared with candidate)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => handleStatusChange(rejectModal.appId,'rejected',rejectModal.currentStatus,rejectReason)}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl">Confirm Reject</button>
                                <button onClick={() => setRejectModal(null)} className="px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes modal */}
            <AnimatePresence>
                {noteApp && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setNoteApp(null)}>
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold">Recruiter Note</h3>
                                <button onClick={() => setNoteApp(null)}><X className="w-5 h-5 text-slate-400"/></button>
                            </div>
                            <textarea className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-600"
                                placeholder="Private note (only visible to your team)..." value={noteText} onChange={e => setNoteText(e.target.value)}/>
                            <div className="flex gap-3 mt-4">
                                <button onClick={handleSaveNote} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl">Save Note</button>
                                <button onClick={() => setNoteApp(null)} className="px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobManagement;