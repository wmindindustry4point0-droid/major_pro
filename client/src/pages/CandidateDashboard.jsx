import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, FileText, Search, Briefcase, Target,
    Settings, LogOut, UserCircle, TrendingUp, Clock,
    Activity, ChevronRight, RefreshCw, Menu, X, BrainCircuit,
} from "lucide-react";

import ResumeProfile from "../components/dashboard/candidate/ResumeProfile";
import BrowseJobs from "../components/dashboard/candidate/BrowseJobs";
import MyApplications from "../components/dashboard/candidate/MyApplications";
import MatchScore from "../components/dashboard/candidate/MatchScore";
import CandidateSettings from "../components/dashboard/candidate/Settings";
import ThemeToggle from "../components/ThemeToggle";
import NotificationBell from "../components/NotificationBell";
import { useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REFRESH_INTERVAL = 30_000;

const statusStyles = {
    shortlisted: "bg-emerald-500/20 text-emerald-400",
    rejected:    "bg-rose-500/20 text-rose-400",
    analyzed:    "bg-indigo-500/20 text-indigo-400",
    applied:     "bg-yellow-500/20 text-yellow-500",
};
const statusLabel = {
    shortlisted: "Accepted",
    rejected:    "Rejected",
    analyzed:    "Under Review",
    applied:     "Applied",
};

const timeAgo = (dateStr) => {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return "Just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

// ── Sidebar nav item ──────────────────────────────────────────────────────────
const SidebarItem = ({ icon: Icon, label, isActive, onClick, isDark }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
            isActive
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
    >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-400" : isDark ? "text-slate-500" : "text-slate-400"}`} />
        <span className="font-medium">{label}</span>
    </button>
);

// ── Overview stat card ────────────────────────────────────────────────────────
const OverviewCard = ({ title, value, icon: Icon, trend, colorClass, isDark }) => (
    <div className={`border p-5 rounded-2xl relative overflow-hidden group transition-all ${
        isDark ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
    }`}>
        <div className={`absolute top-0 right-0 w-28 h-28 bg-${colorClass}-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
        <div className="flex justify-between items-start relative z-10 mb-3">
            <div className={`p-2.5 rounded-xl bg-${colorClass}-500/20 text-${colorClass}-400`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <h3 className={`text-xs font-semibold relative z-10 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{title}</h3>
        <p className={`text-2xl sm:text-3xl font-bold mt-1 relative z-10 ${isDark ? "text-white" : "text-slate-900"}`}>{value}</p>
    </div>
);

// ── Overview page ─────────────────────────────────────────────────────────────
const Overview = ({ user, profile, applications, isLoading, isRefreshing, lastRefreshed, onRefresh, onNavigate, isDark }) => {
    const profileCompletion = profile ? (profile.extractedSkills?.length > 0 ? "100%" : "60%") : "0%";
    const avgMatch = applications.length
        ? Math.round(applications.reduce((a, b) => a + (b.matchScore || 0), 0) / applications.length) + "%"
        : "N/A";

    if (isLoading) return (
        <div className={`text-center mt-20 animate-pulse text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Loading analytics...
        </div>
    );

    const cardBg   = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm";
    const headingC = isDark ? "text-white" : "text-slate-900";
    const subC     = isDark ? "text-slate-400" : "text-slate-500";
    const itemBg   = isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200";
    const emptyBg  = isDark ? "text-slate-500 bg-slate-800/20 border-slate-700" : "text-slate-400 bg-slate-50 border-slate-200";

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
                <OverviewCard title="Jobs Applied"       value={applications.length} icon={Briefcase} colorClass="indigo"  isDark={isDark} />
                <OverviewCard title="Profile Completion" value={profileCompletion}   icon={FileText}  colorClass="purple"                       isDark={isDark} />
                <OverviewCard title="Avg. Match Score"   value={avgMatch}            icon={Target}    colorClass="emerald"                      isDark={isDark} />
                <OverviewCard title="Shortlisted"        value={applications.filter(a => a.status === 'shortlisted').length} icon={Activity}  colorClass="blue"   isDark={isDark} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
                {/* Recent Applications */}
                <div className={`lg:col-span-2 border rounded-2xl p-4 sm:p-6 ${cardBg}`}>
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className={`text-lg sm:text-xl font-bold ${headingC}`}>Recent Applications</h3>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {lastRefreshed && (
                                <span className={`text-xs hidden sm:block ${subC}`}>Updated {timeAgo(lastRefreshed)}</span>
                            )}
                            <button
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className={`p-1.5 rounded-lg transition disabled:opacity-40 ${
                                    isDark ? "text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
                                }`}
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {applications.length === 0 ? (
                        <div className={`text-center py-8 rounded-xl border border-dashed text-sm ${emptyBg}`}>
                            No applications yet.
                        </div>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {applications.slice(0, 5).map((app) => (
                                <div key={app._id} className={`flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-3 sm:p-4 rounded-xl border ${itemBg}`}>
                                    <div className="min-w-0">
                                        <h4 className={`font-bold text-sm sm:text-base truncate ${headingC}`}>{app.jobId?.title}</h4>
                                        <p className={`text-xs sm:text-sm ${subC}`}>{app.jobId?.companyId?.companyName}</p>
                                        <span className={`text-xs flex items-center gap-1 mt-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                            <Clock className="w-3 h-3" />{timeAgo(app.appliedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                                            {app.matchScore}% Match
                                        </span>
                                        <span className={`text-xs px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${statusStyles[app.status]}`}>
                                            {statusLabel[app.status]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Insights */}
                <div className={`border rounded-2xl p-4 sm:p-6 ${
                    isDark ? "bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20" : "bg-gradient-to-br from-indigo-50 to-white border-indigo-200"
                }`}>
                    <h3 className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${headingC}`}>
                        <Target className="w-5 h-5 text-indigo-400" /> AI Insights
                    </h3>
                    {!profile ? (
                        <div className={`text-sm p-4 rounded-xl ${isDark ? "text-slate-400 bg-slate-800/50" : "text-slate-500 bg-slate-100"}`}>
                            Upload your resume to unlock insights.
                        </div>
                    ) : (
                        <>
                            <h4 className={`text-xs font-bold uppercase mb-2 ${subC}`}>Top Skills</h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                                {profile.extractedSkills?.slice(0, 6).map((skill, i) => (
                                    <span key={i} className={`text-xs px-2 py-1 rounded-md border ${
                                        isDark ? "bg-slate-800 text-indigo-300 border-slate-700" : "bg-white text-indigo-600 border-indigo-200"
                                    }`}>{skill}</span>
                                ))}
                            </div>
                            <div className={`p-4 border rounded-xl ${isDark ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}>
                                <h4 className={`font-bold text-sm mb-2 ${headingC}`}>Career Matches</h4>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
const CandidateDashboard = () => {
    const [activeView, setActiveView]   = useState("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const user = JSON.parse(localStorage.getItem("user"));

    const [profile,      setProfile]      = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [lastRefreshed,setLastRefreshed]= useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            const authHeader = { Authorization: `Bearer ${token}` };
            const [profileRes, appRes] = await Promise.all([
                axios.get(`${API}/api/candidate/profile/${user._id}`, { headers: authHeader }).catch(() => ({ data: null })),
                axios.get(`${API}/api/applications/candidate/${user._id}`, { headers: authHeader }),
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

    useEffect(() => { fetchDashboardData(false); }, []);
    useEffect(() => {
        const interval = setInterval(() => fetchDashboardData(true), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    const handleNavClick = (id) => {
        setActiveView(id);
        setSidebarOpen(false);
    };

    const navItems = [
        { id: "overview",      label: "Dashboard Overview", icon: LayoutDashboard },
        { id: "profile",       label: "Resume Profile",     icon: FileText        },
        { id: "browse",        label: "Browse Jobs",        icon: Search          },
        { id: "applications",  label: "My Applications",    icon: Briefcase       },
        { id: "match",         label: "Match Score (AI)",   icon: Target          },
        { id: "settings",      label: "Settings",           icon: Settings        },
    ];

    const renderActiveView = () => {
        switch (activeView) {
            case "overview":     return <Overview user={user} profile={profile} applications={applications} isLoading={isLoading} isRefreshing={isRefreshing} lastRefreshed={lastRefreshed} onRefresh={() => fetchDashboardData(true)} onNavigate={setActiveView} isDark={isDark} />;
            case "profile":      return <ResumeProfile />;
            case "browse":       return <BrowseJobs />;
            case "applications": return <MyApplications />;
            case "match":        return <MatchScore />;
            case "settings":     return <CandidateSettings />;
            default:             return null;
        }
    };

    // Theme tokens
    const mainBg     = isDark ? "bg-slate-950 text-slate-100"       : "bg-slate-50 text-slate-900";
    const sidebarBg  = isDark ? "bg-slate-900/50 border-slate-800/50" : "bg-white border-slate-200";
    const headerBg   = isDark ? "bg-slate-900/30 border-slate-800/50" : "bg-white/80 border-slate-200";
    const dividerCol = isDark ? "border-slate-800"                    : "border-slate-200";

    return (
        <div className={`min-h-screen flex font-sans selection:bg-indigo-500/30 ${mainBg}`}>

            {/* Ambient glow — dark only */}
            {isDark && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl mix-blend-screen transform rotate-12" />
                    <div className="absolute top-1/4 -right-1/4 w-3/4 h-3/4 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl mix-blend-screen" />
                </div>
            )}

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-50 lg:z-10
                w-72 flex flex-col pt-6 pb-4 px-4 h-screen
                border-r backdrop-blur-xl transition-transform duration-300
                ${sidebarBg}
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>
                {/* Logo row */}
                <div className={`flex items-center gap-2 px-2 mb-6 pb-4 border-b ${dividerCol}`}>
                    <BrainCircuit className="w-7 h-7 text-indigo-400" />
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        HireMind AI
                    </span>
                    {/* Close button — mobile only */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`ml-auto lg:hidden p-1.5 rounded-lg transition ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User avatar */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <UserCircle className="w-7 h-7 text-white" />
                    </div>
                    <h2 className={`text-base font-bold text-center ${isDark ? "text-white" : "text-slate-900"}`}>
                        {user?.name || "Candidate Portal"}
                    </h2>
                    <p className="text-xs text-indigo-400 font-semibold mt-1 tracking-wider uppercase">Future Hire</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeView === item.id}
                            onClick={() => handleNavClick(item.id)}
                            isDark={isDark}
                        />
                    ))}
                </nav>

                {/* Bottom — theme toggle + logout */}
                <div className={`mt-4 pt-4 border-t space-y-1 ${dividerCol}`}>
                    <div className="px-2 mb-1">
                        <ThemeToggle className="w-full justify-center" />
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                            isDark ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-500 hover:text-rose-500 hover:bg-rose-50"
                        }`}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative min-w-0">

                {/* Header */}
                <header className={`h-14 sm:h-20 border-b backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shrink-0 z-20 ${headerBg}`}>

                    <div className="flex items-center gap-3">
                        {/* Hamburger — mobile only */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className={`lg:hidden p-2 rounded-lg transition-colors ${
                                isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-1 bg-indigo-500 rounded-full hidden sm:block" />
                        <h1 className={`text-base sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            {navItems.find((item) => item.id === activeView)?.label || "Dashboard"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Logout — mobile header only */}
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className={`lg:hidden p-2 rounded-lg transition-colors ${
                                isDark ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-500 hover:text-rose-500 hover:bg-rose-50"
                            }`}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>

                        {/* Notifications */}
                        <NotificationBell />

                        {/* User pill */}
                        <div className={`flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l ${dividerCol}`}>
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border ${
                                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                            }`}>
                                <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                    {user?.name?.charAt(0) || "C"}
                                </span>
                            </div>
                            <div className="hidden sm:block">
                                <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{user?.name || "Candidate"}</p>
                                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{user?.email || "Active"}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 custom-scrollbar">
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