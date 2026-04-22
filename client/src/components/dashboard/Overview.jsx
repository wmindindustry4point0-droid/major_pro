import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    Briefcase, Target, FileText, TrendingUp, ChevronRight,
    Activity, Users, CheckSquare, Clock, BarChart2, Sparkles,
    ArrowUpRight, Building2, Zap, Award, AlertCircle, Eye,
    BrainCircuit, CircleDot, RefreshCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Reusable stat card ────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, trend, accent, isDark, sub }) => (
    <div className={`relative overflow-hidden rounded-2xl border p-5 group transition-all hover:-translate-y-0.5 ${
        isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
    }`}>
        {/* Decorative glow blob */}
        <div className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity bg-${accent}-500`} />

        <div className="relative z-10 flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${accent}-500/15`}>
                <Icon className={`w-5 h-5 text-${accent}-400`} />
            </div>
            {trend && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                    isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>

        <p className={`text-2xl sm:text-3xl font-bold relative z-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <p className={`text-xs sm:text-sm font-medium mt-0.5 relative z-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
        {sub && <p className={`text-xs mt-1 relative z-10 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</p>}
    </div>
);

// ── Thin progress bar ─────────────────────────────────────────────────────────
const MiniBar = ({ value, max, color, isDark }) => (
    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }}
        />
    </div>
);

// ── Stage badge ───────────────────────────────────────────────────────────────
const stageCfg = {
    applied:     { label: 'Applied',     cls: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
    screened:    { label: 'Screened',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    shortlisted: { label: 'Shortlisted', cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
    interview:   { label: 'Interview',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    selected:    { label: 'Selected',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    rejected:    { label: 'Rejected',    cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
};

const StageBadge = ({ status }) => {
    const cfg = stageCfg[status] || stageCfg.applied;
    return (
        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
};

// ── Skeleton pulse block ──────────────────────────────────────────────────────
const Bone = ({ className, isDark }) => (
    <div className={`animate-pulse rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'} ${className}`} />
);

// ────────────────────────────────────────────────────────────────────────────
// CANDIDATE OVERVIEW
// ────────────────────────────────────────────────────────────────────────────
export const CandidateOverview = () => {
    const { isDark } = useTheme();
    const [profile, setProfile]           = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading]       = useState(true);

    const { user, token } = useMemo(() => {
        try { return { user: JSON.parse(localStorage.getItem('user')), token: localStorage.getItem('token') }; }
        catch { return { user: null, token: null }; }
    }, []);

    const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!user?._id) { setIsLoading(false); return; }
        const fetchDashboardData = async () => {
            try {
                const [profileRes, appRes] = await Promise.all([
                    axios.get(`${API}/api/candidate/profile/${user._id}`, { headers: authHeaders }).catch(() => ({ data: null })),
                    axios.get(`${API}/api/applications/candidate/${user._id}`, { headers: authHeaders })
                ]);
                setProfile(profileRes.data);
                setApplications(appRes.data);
            } catch (error) { console.error(error); }
            finally { setIsLoading(false); }
        };
        fetchDashboardData();
    }, [user?._id, authHeaders]);

    const profileCompletion = profile ? (profile.extractedSkills?.length > 0 ? '100%' : '60%') : '0%';
    const averageMatchScore = applications.length > 0
        ? Math.round(applications.reduce((acc, app) => acc + (app.matchScore || 0), 0) / applications.length) + '%'
        : 'N/A';

    const cardBg    = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const headColor = isDark ? 'text-white'     : 'text-slate-900';
    const subColor  = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowBg     = isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300';

    if (isLoading) return (
        <div className="space-y-6 pb-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Bone key={i} className="h-32" isDark={isDark} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Bone className="lg:col-span-2 h-72" isDark={isDark} />
                <Bone className="h-72" isDark={isDark} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatCard title="Jobs Applied"       value={applications.length} icon={Briefcase} accent="indigo"  trend="+2 this week" isDark={isDark} />
                <StatCard title="Profile Completion" value={profileCompletion}   icon={FileText}  accent="purple"                       isDark={isDark} />
                <StatCard title="Avg. Match Score"   value={averageMatchScore}   icon={Target}    accent="emerald"                      isDark={isDark} />
                <StatCard title="Profile Views"      value="4"                  icon={Activity}  accent="blue"   trend="+1"             isDark={isDark} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 border rounded-2xl p-5 sm:p-6 ${cardBg}`}>
                    <h3 className={`text-lg sm:text-xl font-bold mb-5 ${headColor}`}>Recent Applications</h3>
                    {applications.length === 0 ? (
                        <div className={`text-center py-8 rounded-xl border border-dashed text-sm ${isDark ? 'bg-slate-800/20 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-400'}`}>
                            Browse jobs to get started!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {applications.slice(0, 5).map(app => (
                                <div key={app._id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${rowBg}`}>
                                    <div className="flex flex-col min-w-0">
                                        <h4 className={`font-bold text-sm truncate ${headColor}`}>{app.jobId?.title || 'Unknown Job'}</h4>
                                        <p className={`text-xs ${subColor}`}>{app.jobId?.companyId?.companyName || 'Company'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
                                        {app.matchScore != null && (
                                            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                                {app.matchScore}%
                                            </span>
                                        )}
                                        <StageBadge status={app.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`border rounded-2xl p-5 sm:p-6 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl pointer-events-none" />
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${headColor}`}>
                        <Target className="w-5 h-5 text-indigo-400" /> AI Insights
                    </h3>
                    {!profile ? (
                        <div className={`text-sm p-4 rounded-xl ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            Upload your resume in the Profile tab to unlock AI career insights.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${subColor}`}>Top Skills</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.extractedSkills?.slice(0, 6).map((skill, i) => (
                                        <span key={i} className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'bg-slate-800 text-indigo-300 border-slate-700' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                                <h4 className={`font-bold text-sm mb-1 ${headColor}`}>Career Trajectory Matches</h4>
                                <p className={`text-xs mb-3 ${subColor}`}>Based on your semantic vector profile.</p>
                                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                    View Recommended Jobs <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// COMPANY OVERVIEW  —  completely redesigned
// ────────────────────────────────────────────────────────────────────────────
export const CompanyOverview = () => {
    const { isDark } = useTheme();
    const [jobs,         setJobs]         = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);

    const { user, token } = useMemo(() => {
        try { return { user: JSON.parse(localStorage.getItem('user')), token: localStorage.getItem('token') }; }
        catch { return { user: null, token: null }; }
    }, []);

    const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setRefreshing(true);
        try {
            const jobsRes = await axios.get(`${API}/api/jobs`, { headers: authHeaders });
            const myJobs  = (jobsRes.data || []).filter(j =>
                (j.companyId?._id || j.companyId)?.toString() === user?._id?.toString()
            );
            setJobs(myJobs);
            if (myJobs.length > 0) {
                const appResults = await Promise.all(
                    myJobs.map(j =>
                        axios.get(`${API}/api/applications/job/${j._id}`, { headers: authHeaders })
                            .then(r => r.data).catch(() => [])
                    )
                );
                setApplications(appResults.flat());
            }
        } catch (err) { console.error('Company overview fetch error:', err); }
        finally { setIsLoading(false); setRefreshing(false); }
    };

    useEffect(() => { if (user?._id) fetchData(); else setIsLoading(false); }, [user?._id]);

    // ── Derived metrics ───────────────────────────────────────────────────────
    const totalApplicants = applications.length;
    const shortlisted     = applications.filter(a => ['shortlisted', 'interview', 'selected'].includes(a.status)).length;
    const pending         = applications.filter(a => ['applied', 'screened'].includes(a.status)).length;
    const selected        = applications.filter(a => a.status === 'selected').length;
    const avgScore        = applications.length > 0
        ? Math.round(applications.reduce((s, a) => s + (a.finalScore || a.matchScore || 0), 0) / applications.length)
        : null;
    const conversionRate  = totalApplicants > 0 ? Math.round((selected / totalApplicants) * 100) : 0;

    const jobAppMap = useMemo(() => {
        return jobs.map(j => ({
            ...j,
            count: applications.filter(a => {
                const id = typeof a.jobId === 'object' ? a.jobId?._id : a.jobId;
                return id?.toString() === j._id?.toString();
            }).length
        })).sort((a, b) => b.count - a.count);
    }, [jobs, applications]);

    const recentApps = useMemo(() =>
        [...applications]
            .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
            .slice(0, 6),
        [applications]
    );

    const topJob = jobAppMap[0];

    // Pipeline funnel
    const funnelStages = useMemo(() => {
        const total = totalApplicants || 1;
        return [
            { label: 'Applied',     count: totalApplicants, color: 'bg-slate-400',    pct: 100 },
            { label: 'Screened',    count: applications.filter(a => ['screened','shortlisted','interview','selected'].includes(a.status)).length, color: 'bg-blue-500', pct: 0 },
            { label: 'Shortlisted', count: applications.filter(a => ['shortlisted','interview','selected'].includes(a.status)).length, color: 'bg-indigo-500', pct: 0 },
            { label: 'Interview',   count: applications.filter(a => ['interview','selected'].includes(a.status)).length, color: 'bg-amber-500', pct: 0 },
            { label: 'Selected',    count: selected, color: 'bg-emerald-500', pct: 0 },
        ].map(s => ({ ...s, pct: Math.round((s.count / total) * 100) }));
    }, [applications, totalApplicants, selected]);

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const card    = isDark ? 'bg-slate-900 border-slate-800'    : 'bg-white border-slate-200 shadow-sm';
    const cardAlt = isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200';
    const head    = isDark ? 'text-white'                       : 'text-slate-900';
    const sub     = isDark ? 'text-slate-400'                   : 'text-slate-500';
    const muted   = isDark ? 'text-slate-600'                   : 'text-slate-400';
    const div     = isDark ? 'border-slate-800'                 : 'border-slate-100';
    const rowHov  = isDark ? 'hover:bg-slate-800/40'            : 'hover:bg-slate-50';

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Bone className="h-7 w-52" isDark={isDark} />
                    <Bone className="h-4 w-36" isDark={isDark} />
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {[...Array(4)].map((_, i) => <Bone key={i} className="h-28 sm:h-32" isDark={isDark} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Bone className="lg:col-span-2 h-80" isDark={isDark} />
                <Bone className="h-80" isDark={isDark} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Bone className="h-56" isDark={isDark} />
                <Bone className="h-56" isDark={isDark} />
            </div>
        </div>
    );

    const companyInitial = (user?.companyName || user?.name || 'C').charAt(0).toUpperCase();
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    return (
        <div className="space-y-5 sm:space-y-7 pb-14">

            {/* ── Hero header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/25 shrink-0">
                        {companyInitial}
                    </div>
                    <div>
                        <p className={`text-xs font-medium mb-0.5 ${sub}`}>{greeting} 👋</p>
                        <h1 className={`text-xl sm:text-2xl font-bold leading-tight ${head}`}>
                            {user?.companyName || user?.name || 'Your Dashboard'}
                        </h1>
                        <p className={`text-xs mt-0.5 ${muted}`}>
                            {jobs.length} active job{jobs.length !== 1 ? 's' : ''} · {totalApplicants} total applicant{totalApplicants !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className={`self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition ${
                        isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <StatCard title="Jobs Posted"      value={jobs.length}     icon={Briefcase}   accent="indigo"  isDark={isDark} />
                <StatCard title="Total Applicants" value={totalApplicants} icon={Users}       accent="purple"  isDark={isDark}
                    sub={pending > 0 ? `${pending} need review` : undefined} />
                <StatCard title="Shortlisted"      value={shortlisted}     icon={CheckSquare} accent="emerald" isDark={isDark}
                    sub={totalApplicants > 0 ? `${Math.round((shortlisted/totalApplicants)*100)}% rate` : undefined} />
                <StatCard title="Avg AI Score"     value={avgScore != null ? `${avgScore}%` : '—'} icon={BrainCircuit} accent="amber" isDark={isDark}
                    sub={selected > 0 ? `${selected} selected` : undefined} />
            </div>

            {/* ── Main two-column row ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Recent applicants table */}
                <div className={`lg:col-span-3 border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between ${div}`}>
                        <div>
                            <h3 className={`font-bold text-base sm:text-lg ${head}`}>Recent Applicants</h3>
                            <p className={`text-xs mt-0.5 ${sub}`}>Latest candidates across all your jobs</p>
                        </div>
                        {recentApps.length > 0 && (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                {recentApps.length} shown
                            </span>
                        )}
                    </div>

                    {recentApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <Users className={`w-7 h-7 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                            </div>
                            <p className={`font-semibold text-sm ${head}`}>No applicants yet</p>
                            <p className={`text-xs mt-1 ${sub}`}>Post a job to start receiving candidates.</p>
                        </div>
                    ) : (
                        <div className="divide-y overflow-hidden" style={{ borderColor: isDark ? 'rgb(30,41,59)' : 'rgb(241,245,249)' }}>
                            {recentApps.map((app, idx) => {
                                const score = app.finalScore ?? app.matchScore;
                                return (
                                    <div key={app._id} className={`flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 transition-colors ${rowHov}`}>
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-sm">
                                                {app.candidateId?.name?.charAt(0) || '?'}
                                            </div>
                                        </div>
                                        {/* Name + job */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm truncate ${head}`}>{app.candidateId?.name || 'Candidate'}</p>
                                            <p className={`text-xs truncate ${sub}`}>{typeof app.jobId === 'object' ? app.jobId?.title : 'Job'}</p>
                                        </div>
                                        {/* Score pill */}
                                        {score != null && (
                                            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md ${
                                                score >= 75 ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                                : score >= 50 ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                                                : isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                {score}%
                                            </span>
                                        )}
                                        {/* Stage badge */}
                                        <div className="shrink-0 hidden xs:block">
                                            <StageBadge status={app.status} />
                                        </div>
                                        {/* Date */}
                                        <span className={`shrink-0 text-xs hidden sm:block ${muted}`}>
                                            {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right column: pipeline funnel + top job */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* Hiring funnel */}
                    <div className={`border rounded-2xl p-5 ${card}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`font-bold text-sm sm:text-base ${head}`}>Hiring Funnel</h3>
                            {conversionRate > 0 && (
                                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {conversionRate}% conversion
                                </span>
                            )}
                        </div>
                        {totalApplicants === 0 ? (
                            <p className={`text-sm ${sub} text-center py-6`}>No data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {funnelStages.map((stage) => (
                                    <div key={stage.label}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs ${sub}`}>{stage.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${head}`}>{stage.count}</span>
                                                <span className={`text-xs ${muted}`}>{stage.pct}%</span>
                                            </div>
                                        </div>
                                        <MiniBar value={stage.count} max={totalApplicants} color={stage.color} isDark={isDark} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top job spotlight */}
                    {topJob ? (
                        <div className={`border rounded-2xl p-5 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-900/30 to-slate-900 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200'}`}>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                                <div>
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Top Job</span>
                                    <h4 className={`font-bold text-sm sm:text-base mt-0.5 line-clamp-2 ${head}`}>{topJob.title}</h4>
                                </div>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                    <Award className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>
                                    <Users className="w-3.5 h-3.5" /> {topJob.count} applicant{topJob.count !== 1 ? 's' : ''}
                                </div>
                                {topJob.location && (
                                    <span className={`text-xs ${sub}`}>{topJob.location}</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={`border rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 ${cardAlt}`}>
                            <Briefcase className={`w-8 h-8 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                            <p className={`text-sm font-medium ${sub}`}>No jobs posted yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom row: Jobs performance + quick actions ─────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Jobs by applicants */}
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-5 py-4 border-b ${div} flex items-center justify-between`}>
                        <h3 className={`font-bold text-sm sm:text-base ${head}`}>Jobs by Applicants</h3>
                        <BarChart2 className={`w-4 h-4 ${muted}`} />
                    </div>
                    {jobAppMap.length === 0 ? (
                        <div className={`py-10 text-center text-sm ${sub}`}>No jobs yet.</div>
                    ) : (
                        <div className="p-5 space-y-3">
                            {jobAppMap.slice(0, 5).map((j, i) => {
                                const maxCount = jobAppMap[0]?.count || 1;
                                return (
                                    <div key={j._id}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-xs font-medium truncate max-w-[60%] ${head}`}>{j.title}</span>
                                            <span className={`text-xs font-bold shrink-0 ml-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{j.count}</span>
                                        </div>
                                        <MiniBar value={j.count} max={maxCount} color="bg-indigo-500" isDark={isDark} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick actions / highlights */}
                <div className={`border rounded-2xl p-5 ${card}`}>
                    <h3 className={`font-bold text-sm sm:text-base mb-4 ${head}`}>Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Briefcase,   label: 'Post a Job',        color: 'indigo',  desc: 'Open a new role' },
                            { icon: BrainCircuit, label: 'Resume Analyzer',  color: 'purple',  desc: 'AI-powered screening' },
                            { icon: BarChart2,   label: 'View Analytics',    color: 'emerald', desc: 'Pipeline insights' },
                            { icon: Users,       label: 'Review Candidates', color: 'amber',   desc: `${pending} awaiting review` },
                        ].map(({ icon: Icon, label, color, desc }) => (
                            <div key={label} className={`p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 ${
                                isDark ? `bg-${color}-500/5 border-${color}-500/20 hover:bg-${color}-500/10` : `bg-${color}-50 border-${color}-100 hover:border-${color}-200`
                            }`}>
                                <Icon className={`w-5 h-5 mb-2 text-${color}-${isDark?'400':'500'}`} />
                                <p className={`text-xs font-bold ${head}`}>{label}</p>
                                <p className={`text-xs mt-0.5 ${sub}`}>{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* AI score highlight */}
                    {avgScore != null && (
                        <div className={`mt-4 flex items-center gap-4 p-4 rounded-xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className="text-center shrink-0">
                                <p className={`text-2xl font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{avgScore}%</p>
                                <p className={`text-xs ${sub}`}>Avg AI Score</p>
                            </div>
                            <div>
                                <p className={`text-xs font-semibold ${head}`}>Candidate Quality</p>
                                <p className={`text-xs ${sub} mt-0.5`}>
                                    {avgScore >= 70 ? 'Strong applicant pool 🎯' : avgScore >= 50 ? 'Moderate match rate' : 'Consider broadening criteria'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default CandidateOverview;
