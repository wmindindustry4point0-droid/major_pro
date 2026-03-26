import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Building, Clock, FileText, ChevronRight, Activity } from 'lucide-react';

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

    const getStatusStyles = (status) => {
        switch(status) {
            case 'shortlisted': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            case 'rejected': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            case 'analyzed': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
            default: return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30';
        }
    };

    if (isLoading) {
        return <div className="mt-20 text-center text-slate-500 animate-pulse">Loading Applications...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">My Applications</h2>
                <p className="text-slate-400">Track the status of your submitted job applications and AI recruiter reviews.</p>
            </div>

            {applications.length === 0 ? (
                <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl">
                    <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Applications Yet</h3>
                    <p className="text-slate-500">You have hasn't applied to any roles. Head over to the Browse Jobs tab.</p>
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
                                {applications.map((app) => (
                                    <tr key={app._id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                                    <Briefcase className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <span className="font-bold text-white">{app.jobId?.title || 'Unknown Job'}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-slate-400 flex items-center gap-2">
                                            <Building className="w-4 h-4 text-slate-500" /> {app.jobId?.companyId?.companyName || 'Company'}
                                        </td>
                                        <td className="p-6 text-slate-400">
                                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /> {new Date(app.appliedAt).toLocaleDateString()}</span>
                                        </td>
                                        <td className="p-6">
                                            {app.matchScore ? (
                                                <div className="flex items-center gap-2">
                                                    <Activity className={`w-4 h-4 ${app.matchScore > 75 ? 'text-emerald-400' : 'text-indigo-400'}`} />
                                                    <span className={`font-bold ${app.matchScore > 75 ? 'text-emerald-400' : 'text-white'}`}>{app.matchScore}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-sm">Pending Analysis</span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${getStatusStyles(app.status)}`}>
                                                {app.status || 'applied'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyApplications;
