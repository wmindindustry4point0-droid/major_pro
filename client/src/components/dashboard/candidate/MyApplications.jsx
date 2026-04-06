import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Briefcase, Building, Clock, CheckCircle2,
    XCircle, Loader2, BrainCircuit
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));
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
            } catch (error) {
                console.error('Error fetching applications:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApps();
    }, [user._id]);

    const getStatusConfig = (status) => {
        switch (status) {
            case 'shortlisted': return {
                label: 'Accepted',
                icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
                className: isDark
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                rowClass: isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/50',
            };
            case 'rejected': return {
                label: 'Rejected',
                icon: <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
                className: isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-700 border border-rose-200',
                rowClass: isDark ? 'bg-rose-500/5' : 'bg-rose-50/50',
            };
            case 'analyzed': return {
                label: 'Under Review',
                icon: <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
                className: isDark
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                rowClass: '',
            };
            default: return {
                label: 'Applied',
                icon: <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
                className: isDark
                    ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                rowClass: '',
            };
        }
    };

    const getScoreColor = (score) => {
        if (score >= 75) return isDark ? 'text-emerald-400' : 'text-emerald-600';
        if (score >= 50) return isDark ? 'text-yellow-400' : 'text-yellow-600';
        return isDark ? 'text-rose-400' : 'text-rose-600';
    };

    const getScoreBarColor = (score) => {
        if (score >= 75) return 'bg-emerald-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-rose-500';
    };

    if (isLoading) {
        return (
            <div className={`mt-20 text-center flex flex-col items-center gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="animate-pulse text-sm">Loading Applications...</p>
            </div>
        );
    }

    // Theme tokens
    const headingColor = isDark ? 'text-white' : 'text-slate-900';
    const subColor = isDark ? 'text-slate-400' : 'text-slate-500';
    const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const tableHeadBg = isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400';
    const dividerColor = isDark ? 'divide-slate-800/50' : 'divide-slate-100';
    const rowHover = isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50';

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${headingColor}`}>My Applications</h2>
                <p className={`text-sm sm:text-base ${subColor}`}>
                    Track the status of your submitted job applications and recruiter decisions.
                </p>
            </div>

            {/* Summary chips */}
            {applications.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
                        {applications.length} Total
                    </div>
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        {applications.filter(a => a.status === 'shortlisted').length} Accepted
                    </div>
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium ${isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        {applications.filter(a => a.status === 'rejected').length} Rejected
                    </div>
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium ${isDark ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                        {applications.filter(a => a.status === 'applied' || a.status === 'analyzed').length} Pending
                    </div>
                </div>
            )}

            {applications.length === 0 ? (
                <div className={`text-center py-16 sm:py-20 border rounded-2xl sm:rounded-3xl ${cardBg}`}>
                    <Briefcase className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                    <h3 className={`text-lg sm:text-xl font-bold mb-2 ${headingColor}`}>No Applications Yet</h3>
                    <p className={`text-sm ${subColor}`}>You haven't applied to any roles yet. Head over to the Browse Jobs tab.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table — hidden on mobile */}
                    <div className={`hidden sm:block border rounded-2xl sm:rounded-3xl overflow-hidden ${cardBg}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b text-xs uppercase tracking-wider ${tableHeadBg}`}>
                                        <th className="p-4 sm:p-6 font-semibold">Job Role</th>
                                        <th className="p-4 sm:p-6 font-semibold">Company</th>
                                        <th className="p-4 sm:p-6 font-semibold">Applied On</th>
                                        <th className="p-4 sm:p-6 font-semibold">AI Match</th>
                                        <th className="p-4 sm:p-6 font-semibold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${dividerColor}`}>
                                    {applications.map((app) => {
                                        const statusConfig = getStatusConfig(app.status);
                                        return (
                                            <tr key={app._id} className={`transition-colors group ${statusConfig.rowClass} ${rowHover}`}>
                                                <td className="p-4 sm:p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shrink-0 group-hover:scale-110 transition-transform ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                                                            <Briefcase className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                                        </div>
                                                        <span className={`font-bold text-sm sm:text-base ${headingColor}`}>
                                                            {app.jobId?.title || 'Unknown Job'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`p-4 sm:p-6 text-sm ${subColor}`}>
                                                    <span className="flex items-center gap-2">
                                                        <Building className="w-4 h-4 shrink-0 opacity-60" />
                                                        {app.jobId?.companyId?.companyName || app.jobId?.companyId?.name || 'Company'}
                                                    </span>
                                                </td>
                                                <td className={`p-4 sm:p-6 text-sm ${subColor}`}>
                                                    <span className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 shrink-0 opacity-60" />
                                                        {new Date(app.appliedAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="p-4 sm:p-6">
                                                    {app.matchScore != null ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-14 sm:w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                                                <div
                                                                    className={`h-full rounded-full ${getScoreBarColor(app.matchScore)}`}
                                                                    style={{ width: `${app.matchScore}%` }}
                                                                />
                                                            </div>
                                                            <span className={`font-bold text-sm ${getScoreColor(app.matchScore)}`}>
                                                                {app.matchScore}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Pending</span>
                                                    )}
                                                </td>
                                                <td className="p-4 sm:p-6 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold ${statusConfig.className}`}>
                                                        {statusConfig.icon}
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards — shown only on small screens */}
                    <div className="sm:hidden space-y-3">
                        {applications.map((app) => {
                            const statusConfig = getStatusConfig(app.status);
                            return (
                                <div key={app._id} className={`border rounded-2xl p-4 ${cardBg} ${statusConfig.rowClass}`}>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                                                <Briefcase className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${headingColor}`}>{app.jobId?.title || 'Unknown Job'}</p>
                                                <p className={`text-xs truncate ${subColor}`}>{app.jobId?.companyId?.companyName || 'Company'}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${statusConfig.className}`}>
                                            {statusConfig.icon}
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`flex items-center gap-1 text-xs ${subColor}`}>
                                            <Clock className="w-3 h-3" />
                                            {new Date(app.appliedAt).toLocaleDateString()}
                                        </span>
                                        {app.matchScore != null ? (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-14 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                                    <div className={`h-full rounded-full ${getScoreBarColor(app.matchScore)}`} style={{ width: `${app.matchScore}%` }} />
                                                </div>
                                                <span className={`font-bold text-xs ${getScoreColor(app.matchScore)}`}>{app.matchScore}%</span>
                                            </div>
                                        ) : (
                                            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Pending analysis</span>
                                        )}
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