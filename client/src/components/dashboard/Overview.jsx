import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Briefcase, Target, FileText, TrendingUp, ChevronRight, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OverviewCard = ({ title, value, icon: Icon, trend, colorClass, isDark }) => (
    <div className={`border p-6 rounded-2xl relative overflow-hidden group transition-all ${
        isDark
            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
    }`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
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
        <h3 className={`text-sm font-semibold relative z-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
        <p className={`text-3xl font-bold mt-1 relative z-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
);

const CandidateOverview = () => {
    const { isDark } = useTheme();
    const [profile,      setProfile]      = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading,    setIsLoading]    = useState(true);

    // FIX #3 & #15: Read user/token once, stably
    const { user, token } = useMemo(() => {
        try {
            return {
                user:  JSON.parse(localStorage.getItem('user')),
                token: localStorage.getItem('token'),
            };
        } catch {
            return { user: null, token: null };
        }
    }, []);

    // FIX #3: All API calls now include Authorization header.
    // Without it, requireAuth middleware returns 401 and all data silently fails to load.
    const authHeaders = useMemo(() => (
        token ? { Authorization: `Bearer ${token}` } : {}
    ), [token]);

    useEffect(() => {
        if (!user?._id) { setIsLoading(false); return; }

        const fetchDashboardData = async () => {
            try {
                const [profileRes, appRes] = await Promise.all([
                    axios.get(`${API}/api/candidate/profile/${user._id}`, { headers: authHeaders })
                        .catch(() => ({ data: null })),
                    axios.get(`${API}/api/applications/candidate/${user._id}`, { headers: authHeaders })
                ]);

                setProfile(profileRes.data);
                setApplications(appRes.data);
            } catch (error) {
                console.error('Error fetching overview data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user?._id, authHeaders]);

    const profileCompletion = profile
        ? (profile.extractedSkills?.length > 0 ? '100%' : '60%')
        : '0%';

    const averageMatchScore = applications.length > 0
        ? Math.round(applications.reduce((acc, app) => acc + (app.matchScore || 0), 0) / applications.length) + '%'
        : 'N/A';

    // Theme tokens
    const cardBg    = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const headColor = isDark ? 'text-white'      : 'text-slate-900';
    const subColor  = isDark ? 'text-slate-400'  : 'text-slate-500';
    const rowBg     = isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300';

    if (isLoading) {
        return (
            <div className={`text-center mt-20 animate-pulse text-sm ${subColor}`}>
                Loading Analytics...
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OverviewCard title="Jobs Applied"       value={applications.length} icon={Briefcase} colorClass="indigo"  trend="+2 this week" isDark={isDark} />
                <OverviewCard title="Profile Completion" value={profileCompletion}   icon={FileText}  colorClass="purple"                       isDark={isDark} />
                <OverviewCard title="Avg. Match Score"   value={averageMatchScore}   icon={Target}    colorClass="emerald"                      isDark={isDark} />
                <OverviewCard title="Profile Views"      value="4"                  icon={Activity}  colorClass="blue"   trend="+1"             isDark={isDark} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Applications */}
                <div className={`lg:col-span-2 border rounded-2xl p-6 ${cardBg}`}>
                    <h3 className={`text-xl font-bold mb-6 ${headColor}`}>Recent Applications</h3>
                    {applications.length === 0 ? (
                        <div className={`text-center py-8 rounded-xl border border-dashed text-sm ${
                            isDark ? 'bg-slate-800/20 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-400'
                        }`}>
                            You haven't applied to any jobs yet. Browse jobs to get started!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {applications.slice(0, 5).map(app => (
                                <div key={app._id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${rowBg}`}>
                                    <div className="flex flex-col">
                                        <h4 className={`font-bold ${headColor}`}>{app.jobId?.title || 'Unknown Job'}</h4>
                                        <p className={`text-sm ${subColor}`}>{app.jobId?.companyId?.companyName || 'Company'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {app.matchScore != null && (
                                            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                                                {app.matchScore}% Match
                                            </span>
                                        )}
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                                            app.status === 'shortlisted' ? 'bg-emerald-500/20 text-emerald-400' :
                                            app.status === 'selected'    ? 'bg-yellow-500/20 text-yellow-400'   :
                                            app.status === 'rejected'    ? 'bg-rose-500/20 text-rose-400'       :
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
                <div className={`border rounded-2xl p-6 relative overflow-hidden ${
                    isDark
                        ? 'bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20'
                        : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200'
                }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl pointer-events-none" />
                    <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${headColor}`}>
                        <Target className="w-5 h-5 text-indigo-400" /> AI Insights
                    </h3>

                    {!profile ? (
                        <div className={`text-sm p-4 rounded-xl ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            Upload your resume in the Profile tab to unlock personalized AI career insights and top job matches.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${subColor}`}>Top Extracted Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.extractedSkills?.slice(0, 6).map((skill, i) => (
                                        <span key={i} className={`text-xs px-2 py-1 rounded-md border ${
                                            isDark ? 'bg-slate-800 text-indigo-300 border-slate-700' : 'bg-white text-indigo-600 border-indigo-200'
                                        }`}>
                                            {skill}
                                        </span>
                                    ))}
                                    {(profile.extractedSkills?.length || 0) > 6 && (
                                        <span className={`text-xs px-2 py-1 rounded-md border ${
                                            isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-200'
                                        }`}>
                                            +{(profile.extractedSkills.length - 6)} more
                                        </span>
                                    )}
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

export default CandidateOverview;