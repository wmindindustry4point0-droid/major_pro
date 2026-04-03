import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Building, Clock, Activity, CheckCircle2, XCircle, Loader2, BrainCircuit } from 'lucide-react';

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/candidate/${user._id}`);
                setApplications(res.data);
            } catch (error) {
                console.error("Error fetching applications:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchApps();
    }, [user._id]);

    const getStatusConfig = (status) => {
        switch (status) {
            case 'shortlisted':
                return {
                    label: 'Accepted',
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                    rowClass: 'bg-emerald-500/5',
                };
            case 'rejected':
                return {
                    label: 'Rejected',
                    icon: <XCircle className="w-4 h-4" />,
                    className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                    rowClass: 'bg-rose-500/5',
                };
            case 'analyzed':
                return {
                    label: 'Under Review',
                    icon: <BrainCircuit className="w-4 h-4" />,
                    className: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
                    rowClass: '',
                };
            default:
                return {
                    label: 'Applied',
                    icon: <Loader2 className="w-4 h-4" />,
                    className: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30',
                    rowClass: '',
                };
        }
    };

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-emerald-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-rose-400';
    };

    if (isLoading) {
        return (
            <div className="mt-20 text-center text-slate-500 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="animate-pulse">Loading Applications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">My Applications</h2>
                <p className="text-slate-400">Track the status of your submitted job applications and recruiter decisions.</p>
            </div>

            {/* Summary chips */}
            {applications.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium">
                        {applications.length} Total
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                        {applications.filter(a => a.status === 'shortlisted').length} Accepted
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium">
                        {applications.filter(a => a.status === 'rejected').length} Rejected
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm font-medium">
                        {applications.filter(a => a.status === 'applied' || a.status === 'analyzed').length} Pending
                    </div>
                </div>
            )}

            {applications.length === 0 ? (
                <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl">
                    <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Applications Yet</h3>
                    <p className="text-slate-500">You haven't applied to any roles yet. Head over to the Browse Jobs tab.</p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="p-6 font-semibold">Job Role</th>
                                    <th className="p-6 font-semibold">Company</th>
                                    <th className="p-6 font-semibold">Applied On</th>
                                    <th className="p-6 font-semibold">AI Match Score</th>
                                    <th className="p-6 font-semibold text-right">Application Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {applications.map((app) => {
                                    const statusConfig = getStatusConfig(app.status);
                                    return (
                                        <tr key={app._id} className={`transition-colors group ${statusConfig.rowClass} hover:bg-slate-800/20`}>
                                            {/* Job Role */}
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform shrink-0">
                                                        <Briefcase className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <span className="font-bold text-white">{app.jobId?.title || 'Unknown Job'}</span>
                                                </div>
                                            </td>

                                            {/* Company */}
                                            <td className="p-6 text-slate-400">
                                                <span className="flex items-center gap-2">
                                                    <Building className="w-4 h-4 text-slate-500 shrink-0" />
                                                    {app.jobId?.companyId?.companyName || app.jobId?.companyId?.name || 'Company'}
                                                </span>
                                            </td>

                                            {/* Applied On */}
                                            <td className="p-6 text-slate-400">
                                                <span className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                                                    {new Date(app.appliedAt).toLocaleDateString()}
                                                </span>
                                            </td>

                                            {/* AI Match Score */}
                                            <td className="p-6">
                                                {app.matchScore != null ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${app.matchScore >= 75 ? 'bg-emerald-500' : app.matchScore >= 50 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                                                                style={{ width: `${app.matchScore}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold text-sm ${getScoreColor(app.matchScore)}`}>
                                                            {app.matchScore}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">Pending Analysis</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-6 text-right">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${statusConfig.className}`}>
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
            )}
        </div>
    );
};

export default MyApplications;