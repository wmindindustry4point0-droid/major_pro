import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Briefcase, Target, FileText, TrendingUp, ChevronRight, Activity } from 'lucide-react';

const OverviewCard = ({ title, value, icon: Icon, trend, colorClass }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
        <div className="flex justify-between items-start relative z-10 mb-4">
            <div className={`p-3 rounded-xl bg-${colorClass}-500/20 text-${colorClass}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <h3 className="text-slate-400 text-sm font-semibold relative z-10">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1 relative z-10">{value}</p>
    </div>
);

const CandidateOverview = () => {
    const [profile, setProfile] = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [profileRes, appRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/candidate/profile/${user._id}`).catch(() => ({ data: null })),
                    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/candidate/${user._id}`)
                ]);
                
                setProfile(profileRes.data);
                setApplications(appRes.data);
            } catch (error) {
                console.error("Error fetching overview data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user._id]);

    const profileCompletion = profile ? (profile.extractedSkills?.length > 0 ? '100%' : '60%') : '0%';
    const averageMatchScore = applications.length > 0
        ? Math.round(applications.reduce((acc, app) => acc + (app.matchScore || 0), 0) / applications.length) + '%'
        : 'N/A';

    if (isLoading) {
        return <div className="text-center text-slate-500 mt-20 animate-pulse">Loading Analytics...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OverviewCard title="Jobs Applied" value={applications.length} icon={Briefcase} colorClass="indigo" trend="+2 this week" />
                <OverviewCard title="Profile Completion" value={profileCompletion} icon={FileText} colorClass="purple" />
                <OverviewCard title="Avg. Match Score" value={averageMatchScore} icon={Target} colorClass="emerald" />
                <OverviewCard title="Profile Views" value="4" icon={Activity} colorClass="blue" trend="+1" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Applications */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Applications</h3>
                    {applications.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                            You haven't applied to any jobs yet. Browse jobs to get started!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {applications.slice(0, 5).map(app => (
                                <div key={app._id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                    <div className="flex flex-col">
                                        <h4 className="font-bold text-white">{app.jobId?.title || 'Unknown Job'}</h4>
                                        <p className="text-sm text-slate-400">{app.jobId?.companyId?.companyName || 'Company'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {app.matchScore && (
                                            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                                                {app.matchScore}% Match
                                            </span>
                                        )}
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                                            app.status === 'shortlisted' ? 'bg-emerald-500/20 text-emerald-400' :
                                            app.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' :
                                            'bg-yellow-500/20 text-yellow-500'
                                        }`}>
                                            {app.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Insights Panel */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl"></div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" /> AI Insights
                    </h3>
                    
                    {!profile ? (
                        <div className="text-sm text-slate-400 bg-slate-800/50 p-4 rounded-xl">
                            Upload your resume in the Profile tab to unlock personalized AI career insights and top job matches.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Top Extracted Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.extractedSkills?.slice(0, 6).map((skill, i) => (
                                        <span key={i} className="text-xs bg-slate-800 text-indigo-300 px-2 py-1 rounded-md border border-slate-700">
                                            {skill}
                                        </span>
                                    ))}
                                    {(profile.extractedSkills?.length || 0) > 6 && (
                                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700">
                                            +{(profile.extractedSkills?.length || 0) - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                <h4 className="font-bold text-white text-sm mb-1">Career Trajectory Matches</h4>
                                <p className="text-xs text-indigo-200/70 mb-3">Based on your semantic vector profile.</p>
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

export default CandidateOverview;
