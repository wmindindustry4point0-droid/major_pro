import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

import {
    LayoutDashboard,
    FileText,
    Search,
    Briefcase,
    Target,
    Settings,
    LogOut,
    Bell,
    UserCircle,
    TrendingUp,
    Clock,
    Activity,
    ChevronRight,
    RefreshCw,
} from "lucide-react";

// Import Views
import ResumeProfile from "../components/dashboard/candidate/ResumeProfile";
import BrowseJobs from "../components/dashboard/candidate/BrowseJobs";
import MyApplications from "../components/dashboard/candidate/MyApplications";
import MatchScore from "../components/dashboard/candidate/MatchScore";
import CandidateSettings from "../components/dashboard/candidate/Settings";

// API Base
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REFRESH_INTERVAL = 30_000;

// -------------------------------
// Sidebar Item Component
// -------------------------------
const SidebarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
        }`}
    >
        <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
        <span className="font-medium text-sm">{label}</span>
    </button>
);

// -------------------------------
// Overview Card Component
// -------------------------------
const OverviewCard = ({ title, value, icon: Icon, trend, colorClass }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div
            className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`}
        ></div>

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

// -------------------------------
// Status UI Logic
// -------------------------------
const statusStyles = {
    shortlisted: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-rose-500/20 text-rose-400",
    analyzed: "bg-indigo-500/20 text-indigo-400",
    applied: "bg-yellow-500/20 text-yellow-500",
};

const statusLabel = {
    shortlisted: "Accepted",
    rejected: "Rejected",
    analyzed: "Under Review",
    applied: "Applied",
};

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

// -------------------------------
// Overview Page Component
// -------------------------------
const Overview = ({ user, profile, applications, isLoading, isRefreshing, lastRefreshed, onRefresh, onNavigate }) => {
    const profileCompletion = profile ? (profile.extractedSkills?.length > 0 ? "100%" : "60%") : "0%";
    const avgMatch = applications.length
        ? Math.round(applications.reduce((a, b) => a + (b.matchScore || 0), 0) / applications.length) + "%"
        : "N/A";

    if (isLoading) {
        return (
            <div className="text-center text-slate-500 mt-20 animate-pulse">
                Loading analytics...
            </div>
        );
    }

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <OverviewCard title="Jobs Applied" value={applications.length} icon={Briefcase} colorClass="indigo" trend="+2 this week" />
                <OverviewCard title="Profile Completion" value={profileCompletion} icon={FileText} colorClass="purple" />
                <OverviewCard title="Avg. Match Score" value={avgMatch} icon={Target} colorClass="emerald" />
                <OverviewCard title="Profile Views" value="4" icon={Activity} colorClass="blue" trend="+1" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Applications */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Recent Applications</h3>
                        <div className="flex items-center gap-3">
                            {lastRefreshed && (
                                <span className="text-xs text-slate-500">
                                    Updated {timeAgo(lastRefreshed)}
                                </span>
                            )}
                            <button
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition disabled:opacity-40"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {applications.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                            No applications yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {applications.slice(0, 5).map((app) => (
                                <div key={app._id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <div>
                                        <h4 className="font-bold text-white">{app.jobId?.title}</h4>
                                        <p className="text-sm text-slate-400">{app.jobId?.companyId?.companyName}</p>
                                        <span className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(app.appliedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
                                            {app.matchScore}% Match
                                        </span>
                                        <span className={`text-xs px-3 py-1 rounded-full ${statusStyles[app.status]}`}>
                                            {statusLabel[app.status]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Insights */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" /> AI Insights
                    </h3>

                    {!profile ? (
                        <div className="text-sm text-slate-400 bg-slate-800/50 p-4 rounded-xl">
                            Upload your resume to unlock insights.
                        </div>
                    ) : (
                        <>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Top Skills</h4>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {profile.extractedSkills?.slice(0, 6).map((skill, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-indigo-300 px-2 py-1 rounded-md border border-slate-700">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                <h4 className="font-bold text-white text-sm mb-2">Career Matches</h4>
                                <button
                                    onClick={() => onNavigate("browse")}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    View Recommended Jobs <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

// ==========================================================================================
//  MAIN DASHBOARD
// ==========================================================================================
const CandidateDashboard = () => {
    const [activeView, setActiveView] = useState("overview");
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    // Overview States
    const [profile, setProfile] = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch Dashboard Data
    const fetchDashboardData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const [profileRes, appRes] = await Promise.all([
                axios.get(`${API}/api/candidate/profile/${user._id}`).catch(() => ({ data: null })),
                axios.get(`${API}/api/applications/candidate/${user._id}`),
            ]);

            setProfile(profileRes.data);
            const sorted = [...appRes.data].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
            setApplications(sorted);
            setLastRefreshed(new Date());
        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user._id]);

    useEffect(() => {
        fetchDashboardData(false);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => fetchDashboardData(true), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    const navItems = [
        { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
        { id: "profile", label: "Resume Profile", icon: FileText },
        { id: "browse", label: "Browse Jobs", icon: Search },
        { id: "applications", label: "My Applications", icon: Briefcase },
        { id: "match", label: "Match Score (AI)", icon: Target },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    const renderActiveView = () => {
        switch (activeView) {
            case "overview":
                return (
                    <Overview
                        user={user}
                        profile={profile}
                        applications={applications}
                        isLoading={isLoading}
                        isRefreshing={isRefreshing}
                        lastRefreshed={lastRefreshed}
                        onRefresh={() => fetchDashboardData(true)}
                        onNavigate={setActiveView}
                    />
                );
            case "profile":
                return <ResumeProfile />;
            case "browse":
                return <BrowseJobs />;
            case "applications":
                return <MyApplications />;
            case "match":
                return <MatchScore />;
            case "settings":
                return <CandidateSettings />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl mix-blend-screen transform rotate-12"></div>
                <div className="absolute top-1/4 -right-1/4 w-3/4 h-3/4 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl mix-blend-screen"></div>
            </div>

            {/* Left Sidebar */}
            <aside className="w-72 bg-slate-900/50 border-r border-slate-800/50 backdrop-blur-xl flex flex-col pt-8 pb-6 px-4 z-10 sticky top-0 h-screen">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <UserCircle className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {user?.name || "Candidate Portal"}
                    </h2>
                    <p className="text-xs text-indigo-400 font-semibold mt-1 tracking-wider uppercase">Future Hire</p>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeView === item.id}
                            onClick={() => setActiveView(item.id)}
                        />
                    ))}
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
                {/* Top Header */}
                <header className="h-20 bg-slate-900/30 border-b border-slate-800/50 backdrop-blur-md flex items-center justify-between px-8 z-20">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {navItems.find((item) => item.id === activeView)?.label || "Dashboard"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-slate-900"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                <span className="text-sm font-bold text-slate-300">
                                    {user?.name?.charAt(0) || "C"}
                                </span>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-semibold text-white">{user?.name || "Candidate"}</p>
                                <p className="text-xs text-slate-500">{user?.email || "Active"}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dynamic View Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-6xl mx-auto"
                        >
                            {renderActiveView()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default CandidateDashboard;