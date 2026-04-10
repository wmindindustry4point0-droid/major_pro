import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import {
    BarChart3, TrendingUp, Users, Briefcase, Target,
    AlertCircle, CheckCircle2, Clock, Award, ChevronUp, ChevronDown, Loader2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Small reusable primitives ─────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon: Icon, accent, isDark }) => (
    <div className={`rounded-2xl border p-5 relative overflow-hidden group transition-all hover:scale-[1.01] ${
        isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
    }`}>
        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-${accent}-500`} />
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-${accent}-500/15`}>
            <Icon className={`w-5 h-5 text-${accent}-400`} />
        </div>
        <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        {sub && <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</p>}
    </div>
);

const SectionTitle = ({ children, isDark }) => (
    <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{children}</h2>
);

// ── Bar chart (pure CSS) ──────────────────────────────────────────────────────
const BarChart = ({ data, isDark }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-2 sm:gap-3 h-36 w-full">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {d.value > 0 ? d.value : ''}
                    </span>
                    <div className="w-full flex items-end" style={{ height: '100px' }}>
                        <div
                            className={`w-full rounded-t-md transition-all duration-700 ${d.color}`}
                            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0)}%` }}
                        />
                    </div>
                    <span className={`text-[10px] text-center leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {d.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Funnel stage ──────────────────────────────────────────────────────────────
const FunnelStage = ({ label, count, total, color, dropPct, isDark, isLast }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-28 sm:w-36 shrink-0">
                <div className="flex justify-between text-xs mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{count}</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
            </div>
            <span className={`text-xs w-10 text-right shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{pct}%</span>
            {!isLast && dropPct != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    dropPct > 60
                        ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-500'
                        : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'
                }`}>
                    ↓{dropPct}% drop
                </span>
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const Analytics = ({ user }) => {
    const { isDark } = useTheme();
    const [jobs, setJobs] = useState([]);
    const [allApps, setAllApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortCol, setSortCol] = useState('applicants');
    const [sortDir, setSortDir] = useState('desc');

    const token = localStorage.getItem('token');
    const authHeader = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!user?._id) return;
        const load = async () => {
            setLoading(true);
            try {
                const jobsRes = await axios.get(`${API}/api/jobs`);
                const myJobs = jobsRes.data.filter(j =>
                    (j.companyId?._id || j.companyId) === user._id
                );
                setJobs(myJobs);

                const appsArrays = await Promise.all(
                    myJobs.map(j =>
                        axios.get(`${API}/api/applications/job/${j._id}`, { headers: authHeader })
                            .then(r => r.data)
                            .catch(() => [])
                    )
                );
                setAllApps(appsArrays.flat());
            } catch (e) {
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?._id]);

    // ── Derived metrics ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total       = allApps.length;
        const screened    = allApps.filter(a => ['screened','shortlisted','interview','selected','rejected'].includes(a.status)).length;
        const shortlisted = allApps.filter(a => ['shortlisted','interview','selected'].includes(a.status)).length;
        const interview   = allApps.filter(a => ['interview','selected'].includes(a.status)).length;
        const selected    = allApps.filter(a => a.status === 'selected').length;
        const rejected    = allApps.filter(a => a.status === 'rejected').length;
        const scored      = allApps.filter(a => a.finalScore != null);
        const avgScore    = scored.length
            ? Math.round(scored.reduce((s, a) => s + a.finalScore, 0) / scored.length)
            : null;

        // Score distribution buckets: 0-20, 20-40, 40-60, 60-80, 80-100
        const buckets = [
            { label: '0–20',  value: 0, color: isDark ? 'bg-rose-600'    : 'bg-rose-400' },
            { label: '20–40', value: 0, color: isDark ? 'bg-orange-500'  : 'bg-orange-400' },
            { label: '40–60', value: 0, color: isDark ? 'bg-amber-500'   : 'bg-amber-400' },
            { label: '60–80', value: 0, color: isDark ? 'bg-indigo-500'  : 'bg-indigo-400' },
            { label: '80+',   value: 0, color: isDark ? 'bg-emerald-500' : 'bg-emerald-500' },
        ];
        scored.forEach(a => {
            const s = a.finalScore;
            if (s < 20) buckets[0].value++;
            else if (s < 40) buckets[1].value++;
            else if (s < 60) buckets[2].value++;
            else if (s < 80) buckets[3].value++;
            else             buckets[4].value++;
        });

        // Weekly volume (last 8 weeks)
        const weeks = Array.from({ length: 8 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (7 * (7 - i)));
            return { label: `W${i + 1}`, start: d, value: 0, color: isDark ? 'bg-indigo-500' : 'bg-indigo-400' };
        });
        allApps.forEach(a => {
            const d = new Date(a.appliedAt);
            weeks.forEach((w, i) => {
                const end = new Date(w.start);
                end.setDate(end.getDate() + 7);
                if (d >= w.start && d < end) w.value++;
            });
        });

        // Top skills matched / missing
        const matchedCount = {}, missingCount = {};
        allApps.forEach(a => {
            (a.skillsMatched || []).forEach(s => { matchedCount[s] = (matchedCount[s] || 0) + 1; });
            (a.skillsMissing || []).forEach(s => { missingCount[s] = (missingCount[s] || 0) + 1; });
        });
        const topMatched = Object.entries(matchedCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const topMissing = Object.entries(missingCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

        // Per-job rows
        const jobRows = jobs.map(j => {
            const apps = allApps.filter(a => {
                const jid = typeof a.jobId === 'object' ? a.jobId?._id : a.jobId;
                return String(jid) === String(j._id);
            });
            const sc = apps.filter(a => a.finalScore != null);
            const avg = sc.length ? Math.round(sc.reduce((s, a) => s + a.finalScore, 0) / sc.length) : null;
            const screenedPct = apps.length ? Math.round(
                apps.filter(a => a.status !== 'applied').length / apps.length * 100
            ) : 0;
            const shortPct = apps.length ? Math.round(
                apps.filter(a => ['shortlisted','interview','selected'].includes(a.status)).length / apps.length * 100
            ) : 0;
            const daysAgo = Math.floor((Date.now() - new Date(j.postedAt || j.createdAt)) / 86400000);
            return {
                _id: j._id, title: j.title, applicants: apps.length,
                avgScore: avg, screenedPct, shortPct, daysAgo
            };
        });

        // Funnel drop %
        const drop = (from, to) => from > 0 ? Math.round((1 - to / from) * 100) : 0;

        return {
            total, screened, shortlisted, interview, selected, rejected,
            avgScore, buckets, weeks, topMatched, topMissing, jobRows,
            funnel: [
                { label: 'Applied',     count: total,       drop: drop(total, screened),    color: 'bg-slate-400'    },
                { label: 'Screened',    count: screened,    drop: drop(screened, shortlisted), color: 'bg-blue-500'  },
                { label: 'Shortlisted', count: shortlisted, drop: drop(shortlisted, interview), color: 'bg-indigo-500' },
                { label: 'Interview',   count: interview,   drop: drop(interview, selected),  color: 'bg-amber-500'  },
                { label: 'Selected',    count: selected,    drop: null,                       color: 'bg-emerald-500' },
            ],
        };
    }, [allApps, jobs, isDark]);

    // ── Sort job table ────────────────────────────────────────────────────────
    const sortedJobs = useMemo(() => {
        return [...stats.jobRows].sort((a, b) => {
            const va = a[sortCol] ?? -1;
            const vb = b[sortCol] ?? -1;
            return sortDir === 'asc' ? va - vb : vb - va;
        });
    }, [stats.jobRows, sortCol, sortDir]);

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('desc'); }
    };

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const card   = isDark ? 'bg-slate-900 border-slate-800'  : 'bg-white border-slate-200 shadow-sm';
    const sub    = isDark ? 'text-slate-400'                  : 'text-slate-500';
    const muted  = isDark ? 'text-slate-600'                  : 'text-slate-400';
    const div    = isDark ? 'divide-slate-800'                : 'divide-slate-100';
    const thBg   = isDark ? 'bg-slate-950/60 text-slate-500'  : 'bg-slate-50 text-slate-400';
    const trHov  = isDark ? 'hover:bg-slate-800/30'           : 'hover:bg-slate-50';
    const head   = isDark ? 'text-white'                      : 'text-slate-900';

    if (loading) return (
        <div className="flex flex-col items-center justify-center mt-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className={`text-sm animate-pulse ${sub}`}>Loading analytics…</p>
        </div>
    );

    if (error) return (
        <div className={`mt-20 text-center flex flex-col items-center gap-2 ${sub}`}>
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p>{error}</p>
        </div>
    );

    if (jobs.length === 0) return (
        <div className={`mt-24 text-center flex flex-col items-center gap-3 ${sub}`}>
            <BarChart3 className="w-12 h-12 opacity-30" />
            <p className={`text-lg font-semibold ${head}`}>No data yet</p>
            <p className="text-sm">Post your first job to start seeing analytics here.</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-14">
            {/* Page header */}
            <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${head}`}>Analytics</h1>
                <p className={`text-sm mt-1 ${sub}`}>
                    Across {jobs.length} job{jobs.length !== 1 ? 's' : ''} · {stats.total} total application{stats.total !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Top stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Applicants" value={stats.total}      icon={Users}       accent="indigo"  isDark={isDark} />
                <StatCard label="Avg. AI Score"    value={stats.avgScore != null ? `${stats.avgScore}%` : '—'} icon={Target} accent="purple" isDark={isDark} />
                <StatCard label="Shortlisted"      value={stats.shortlisted} icon={CheckCircle2} accent="emerald" isDark={isDark}
                    sub={stats.total ? `${Math.round(stats.shortlisted / stats.total * 100)}% of total` : undefined} />
                <StatCard label="Selected"         value={stats.selected}   icon={Award}       accent="amber"   isDark={isDark}
                    sub={stats.total ? `${Math.round(stats.selected / stats.total * 100)}% conversion` : undefined} />
            </div>

            {/* Funnel + Score distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Hiring funnel */}
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <SectionTitle isDark={isDark}>Hiring Funnel</SectionTitle>
                    <div className="space-y-4">
                        {stats.funnel.map((s, i) => (
                            <FunnelStage
                                key={s.label}
                                label={s.label}
                                count={s.count}
                                total={stats.total}
                                color={s.color}
                                dropPct={s.drop}
                                isDark={isDark}
                                isLast={i === stats.funnel.length - 1}
                            />
                        ))}
                    </div>
                    <div className={`mt-5 pt-4 border-t flex items-center justify-between text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <span className={muted}>Rejected</span>
                        <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>{stats.rejected}</span>
                    </div>
                </div>

                {/* AI Score distribution */}
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <SectionTitle isDark={isDark}>AI Score Distribution</SectionTitle>
                    {allApps.filter(a => a.finalScore != null).length === 0 ? (
                        <div className={`text-sm text-center py-12 ${muted}`}>No scored applications yet.</div>
                    ) : (
                        <>
                            <BarChart data={stats.buckets} isDark={isDark} />
                            <p className={`text-xs mt-3 ${muted}`}>
                                Score buckets across {allApps.filter(a => a.finalScore != null).length} scored applications
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Application volume over time */}
            <div className={`rounded-2xl border p-6 ${card}`}>
                <SectionTitle isDark={isDark}>Application Volume (last 8 weeks)</SectionTitle>
                {stats.total === 0 ? (
                    <div className={`text-sm text-center py-10 ${muted}`}>No applications received yet.</div>
                ) : (
                    <BarChart data={stats.weeks} isDark={isDark} />
                )}
            </div>

            {/* Skills matched vs missing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <SectionTitle isDark={isDark}>Top Skills Found in Candidates</SectionTitle>
                    {stats.topMatched.length === 0
                        ? <p className={`text-sm ${muted}`}>No skill data yet.</p>
                        : <div className="space-y-2.5">
                            {stats.topMatched.map(([skill, cnt]) => (
                                <div key={skill} className="flex items-center gap-3">
                                    <div className={`flex-1 h-5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.round((cnt / stats.topMatched[0][1]) * 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs w-28 font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{skill}</span>
                                    <span className={`text-xs w-6 text-right font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{cnt}</span>
                                </div>
                            ))}
                        </div>
                    }
                </div>

                <div className={`rounded-2xl border p-6 ${card}`}>
                    <SectionTitle isDark={isDark}>Skills Candidates Are Missing</SectionTitle>
                    {stats.topMissing.length === 0
                        ? <p className={`text-sm ${muted}`}>No missing skill data yet.</p>
                        : <div className="space-y-2.5">
                            {stats.topMissing.map(([skill, cnt]) => (
                                <div key={skill} className="flex items-center gap-3">
                                    <div className={`flex-1 h-5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                        <div
                                            className="h-full bg-rose-500 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.round((cnt / stats.topMissing[0][1]) * 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs w-28 font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{skill}</span>
                                    <span className={`text-xs w-6 text-right font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{cnt}</span>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            </div>

            {/* Per-job stats table */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
                <div className="p-6 pb-0">
                    <SectionTitle isDark={isDark}>Per-Job Breakdown</SectionTitle>
                </div>
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm divide-y ${div}`}>
                        <thead>
                            <tr className={thBg}>
                                {[
                                    { col: 'title',      label: 'Job Title',      align: 'text-left'   },
                                    { col: 'applicants', label: 'Applicants',     align: 'text-center' },
                                    { col: 'avgScore',   label: 'Avg Score',      align: 'text-center' },
                                    { col: 'screenedPct',label: 'Screened %',     align: 'text-center' },
                                    { col: 'shortPct',   label: 'Shortlisted %',  align: 'text-center' },
                                    { col: 'daysAgo',    label: 'Posted',         align: 'text-right'  },
                                ].map(({ col, label, align }) => (
                                    <th
                                        key={col}
                                        onClick={() => col !== 'title' && toggleSort(col)}
                                        className={`px-4 py-3 font-semibold uppercase tracking-wider text-xs ${align} ${col !== 'title' ? 'cursor-pointer select-none' : ''}`}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {label}
                                            {sortCol === col && (
                                                sortDir === 'desc'
                                                    ? <ChevronDown className="w-3 h-3" />
                                                    : <ChevronUp className="w-3 h-3" />
                                            )}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${div}`}>
                            {sortedJobs.map(row => (
                                <tr key={row._id} className={`transition-colors ${trHov}`}>
                                    <td className={`px-4 py-4 font-medium max-w-[180px] truncate ${head}`}>{row.title}</td>
                                    <td className={`px-4 py-4 text-center font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{row.applicants}</td>
                                    <td className="px-4 py-4 text-center">
                                        {row.avgScore != null
                                            ? <span className={`font-bold ${row.avgScore >= 60 ? 'text-emerald-400' : row.avgScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {row.avgScore}%
                                              </span>
                                            : <span className={muted}>—</span>
                                        }
                                    </td>
                                    <td className={`px-4 py-4 text-center text-sm ${sub}`}>{row.screenedPct}%</td>
                                    <td className={`px-4 py-4 text-center text-sm ${sub}`}>{row.shortPct}%</td>
                                    <td className={`px-4 py-4 text-right text-xs ${muted}`}>
                                        {row.daysAgo === 0 ? 'Today' : `${row.daysAgo}d ago`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;