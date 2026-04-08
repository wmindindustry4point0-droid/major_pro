import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Briefcase, Building, Clock, CheckCircle2, XCircle,
    Loader2, BrainCircuit, ChevronDown, TrendingUp, AlertCircle,
    Calendar, Trophy
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [expanded,     setExpanded]     = useState(null);
    const user  = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const { isDark } = useTheme();

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/applications/candidate/${user._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setApplications(res.data);
            } catch (err) { console.error(err); }
            finally { setIsLoading(false); }
        };
        fetchApps();
    }, []);

    const STATUS_CONFIG = {
        applied:     { label: 'Applied',        icon: <Loader2 className="w-3.5 h-3.5 animate-spin"/>,  cls: isDark ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'  : 'bg-yellow-50 text-yellow-700 border-yellow-200',   row: '' },
        screened:    { label: 'Under Review',   icon: <BrainCircuit className="w-3.5 h-3.5"/>,           cls: isDark ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'        : 'bg-blue-50 text-blue-700 border-blue-200',           row: '' },
        shortlisted: { label: 'Shortlisted',    icon: <CheckCircle2 className="w-3.5 h-3.5"/>,           cls: isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',     row: isDark?'bg-indigo-500/5':'bg-indigo-50/50' },
        interview:   { label: 'Interview',      icon: <Calendar className="w-3.5 h-3.5"/>,               cls: isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'    : 'bg-amber-50 text-amber-700 border-amber-200',         row: isDark?'bg-amber-500/5':'bg-amber-50/50' },
        selected:    { label: 'Selected 🎉',    icon: <Trophy className="w-3.5 h-3.5"/>,                 cls: isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':'bg-emerald-50 text-emerald-700 border-emerald-200', row: isDark?'bg-emerald-500/5':'bg-emerald-50/50' },
        rejected:    { label: 'Rejected',       icon: <XCircle className="w-3.5 h-3.5"/>,                cls: isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'        : 'bg-rose-50 text-rose-700 border-rose-200',           row: isDark?'bg-rose-500/5':'bg-rose-50/50' },
        analyzed:    { label: 'Under Review',   icon: <BrainCircuit className="w-3.5 h-3.5"/>,           cls: isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',     row: '' },
    };

    const cfg = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.applied;

    const scoreColor = (s) => s >= 75 ? (isDark?'text-emerald-400':'text-emerald-600') : s >= 55 ? (isDark?'text-yellow-400':'text-yellow-600') : (isDark?'text-rose-400':'text-rose-600');
    const scoreBg    = (s) => s >= 75 ? 'bg-emerald-500' : s >= 55 ? 'bg-yellow-500' : 'bg-rose-500';
    const score      = (app) => app.finalScore ?? app.matchScore;

    const headingColor = isDark ? 'text-white'      : 'text-slate-900';
    const subColor     = isDark ? 'text-slate-400'  : 'text-slate-500';
    const cardBg       = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const tableHeadBg  = isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400';
    const divColor     = isDark ? 'divide-slate-800/50' : 'divide-slate-100';
    const rowHover     = isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50';

    if (isLoading) return (
        <div className={`mt-20 text-center flex flex-col items-center gap-3 ${subColor}`}>
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
            <p className="animate-pulse text-sm">Loading Applications...</p>
        </div>
    );

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            <div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${headingColor}`}>My Applications</h2>
                <p className={`text-sm ${subColor}`}>Track the status and AI score of your applications.</p>
            </div>

            {applications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${isDark?'bg-slate-800 border-slate-700 text-slate-300':'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>{applications.length} Total</div>
                    {['selected','shortlisted','interview','screened','applied','rejected'].map(s => {
                        const count = applications.filter(a => a.status === s || (s==='screened' && a.status==='analyzed')).length;
                        if (!count) return null;
                        const c = cfg(s);
                        return <div key={s} className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${c.cls}`}>{count} {c.label}</div>;
                    })}
                </div>
            )}

            {applications.length === 0 ? (
                <div className={`text-center py-20 border rounded-3xl ${cardBg}`}>
                    <Briefcase className={`w-14 h-14 mx-auto mb-4 ${isDark?'text-slate-700':'text-slate-300'}`}/>
                    <h3 className={`text-xl font-bold mb-2 ${headingColor}`}>No Applications Yet</h3>
                    <p className={`text-sm ${subColor}`}>Browse Jobs to apply to your first role.</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className={`hidden sm:block border rounded-3xl overflow-hidden ${cardBg}`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-xs uppercase tracking-wider ${tableHeadBg}`}>
                                    <th className="p-6 font-semibold">Job Role</th>
                                    <th className="p-6 font-semibold">Company</th>
                                    <th className="p-6 font-semibold">Applied</th>
                                    <th className="p-6 font-semibold">AI Score</th>
                                    <th className="p-6 font-semibold text-right">Status</th>
                                    <th className="p-6 font-semibold text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${divColor}`}>
                                {applications.map(app => {
                                    const c    = cfg(app.status);
                                    const s    = score(app);
                                    const isEx = expanded === app._id;
                                    const hasBreakdown = app.scoreBreakdown || app.strengths?.length > 0;
                                    return (
                                        <React.Fragment key={app._id}>
                                            <tr className={`transition-colors ${c.row} ${rowHover}`}>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${isDark?'bg-indigo-500/10 border-indigo-500/20':'bg-indigo-50 border-indigo-200'}`}>
                                                            <Briefcase className={`w-5 h-5 ${isDark?'text-indigo-400':'text-indigo-600'}`}/>
                                                        </div>
                                                        <span className={`font-bold ${headingColor}`}>{app.jobId?.title||'Unknown Job'}</span>
                                                    </div>
                                                </td>
                                                <td className={`p-6 text-sm ${subColor}`}>
                                                    <span className="flex items-center gap-2"><Building className="w-4 h-4 opacity-60"/>{app.jobId?.companyId?.companyName||app.jobId?.companyId?.name||'Company'}</span>
                                                </td>
                                                <td className={`p-6 text-sm ${subColor}`}>
                                                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 opacity-60"/>{new Date(app.appliedAt).toLocaleDateString()}</span>
                                                </td>
                                                <td className="p-6">
                                                    {s != null ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark?'bg-slate-800':'bg-slate-200'}`}>
                                                                <div className={`h-full rounded-full ${scoreBg(s)}`} style={{width:`${s}%`}}/>
                                                            </div>
                                                            <span className={`font-bold text-sm ${scoreColor(s)}`}>{s.toFixed(0)}%</span>
                                                        </div>
                                                    ) : <span className={`text-xs ${isDark?'text-slate-600':'text-slate-400'}`}>Pending</span>}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${c.cls}`}>{c.icon}{c.label}</span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {hasBreakdown && (
                                                        <button onClick={() => setExpanded(isEx ? null : app._id)}
                                                            className={`p-1.5 rounded-lg border transition-colors ${isEx?'border-indigo-500/50 text-indigo-400 bg-indigo-500/10':(isDark?'border-slate-700 text-slate-500 hover:bg-slate-800':'border-slate-200 text-slate-400 hover:bg-slate-50')}`}>
                                                            <ChevronDown className={`w-4 h-4 transition-transform ${isEx?'rotate-180':''}`}/>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {isEx && (
                                                <tr>
                                                    <td colSpan={6} className={isDark?'bg-slate-800/30':'bg-slate-50'}>
                                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {app.scoreBreakdown && (
                                                                <div>
                                                                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${subColor}`}>Score Breakdown</h4>
                                                                    <div className="space-y-2.5">
                                                                        {[{key:'skills',label:'Skill Match',w:'35%'},{key:'semantic',label:'Semantic Fit',w:'30%'},{key:'experience',label:'Experience',w:'20%'},{key:'projects',label:'Projects',w:'15%'}].map(({key,label,w}) => {
                                                                            const val = Math.round((app.scoreBreakdown[key]||0)*100);
                                                                            return (
                                                                                <div key={key}>
                                                                                    <div className="flex justify-between text-xs mb-1">
                                                                                        <span className={subColor}>{label} <span className="opacity-50">({w})</span></span>
                                                                                        <span className={scoreColor(val)}>{val}%</span>
                                                                                    </div>
                                                                                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark?'bg-slate-700':'bg-slate-200'}`}>
                                                                                        <div className={`h-full rounded-full ${scoreBg(val)}`} style={{width:`${val}%`}}/>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(app.strengths?.length > 0 || app.weaknesses?.length > 0) && (
                                                                <div>
                                                                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${subColor}`}>AI Feedback</h4>
                                                                    <div className="space-y-2">
                                                                        {(app.strengths||[]).map((s,i) => <div key={i} className="flex gap-2 text-xs"><TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/><span className={isDark?'text-slate-300':'text-slate-600'}>{s}</span></div>)}
                                                                        {(app.weaknesses||[]).map((w,i) => <div key={i} className="flex gap-2 text-xs"><AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5"/><span className={isDark?'text-slate-400':'text-slate-500'}>{w}</span></div>)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                        {applications.map(app => {
                            const c = cfg(app.status);
                            const s = score(app);
                            return (
                                <div key={app._id} className={`border rounded-2xl p-4 ${cardBg} ${c.row}`}>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${isDark?'bg-indigo-500/10 border-indigo-500/20':'bg-indigo-50 border-indigo-200'}`}>
                                                <Briefcase className={`w-4 h-4 ${isDark?'text-indigo-400':'text-indigo-600'}`}/>
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${headingColor}`}>{app.jobId?.title||'Unknown Job'}</p>
                                                <p className={`text-xs truncate ${subColor}`}>{app.jobId?.companyId?.companyName||'Company'}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 border ${c.cls}`}>{c.icon}{c.label}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`flex items-center gap-1 text-xs ${subColor}`}><Clock className="w-3 h-3"/>{new Date(app.appliedAt).toLocaleDateString()}</span>
                                        {s != null ? (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-14 h-1.5 rounded-full overflow-hidden ${isDark?'bg-slate-800':'bg-slate-200'}`}>
                                                    <div className={`h-full rounded-full ${scoreBg(s)}`} style={{width:`${s}%`}}/>
                                                </div>
                                                <span className={`font-bold text-xs ${scoreColor(s)}`}>{s.toFixed(0)}%</span>
                                            </div>
                                        ) : <span className={`text-xs ${isDark?'text-slate-600':'text-slate-400'}`}>Pending</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyApplications;