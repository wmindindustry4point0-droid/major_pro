import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, PlusSquare, BrainCircuit,
    Settings, BarChart3, LogOut, ChevronRight, Menu, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Overview from '../components/dashboard/Overview';
import JobManagement from '../components/dashboard/JobManagement';
import ResumeAnalyzer from '../components/dashboard/ResumeAnalyzer';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import { useTheme } from '../context/ThemeContext';

const CompanyDashboard = () => {
    const [activeView,  setActiveView]  = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { isDark } = useTheme();

    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) {}

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const handleNavClick = (id) => {
        setActiveView(id);
        setSidebarOpen(false);
    };

    const navItems = [
        { id: 'overview',  label: 'Dashboard Overview', icon: LayoutDashboard                  },
        { id: 'manage',    label: 'Job Management',     icon: PlusSquare                       },
        { id: 'analyzer',  label: 'Resume Analyzer',    icon: BrainCircuit, highlight: true    },
        { id: 'analytics', label: 'Analytics',          icon: BarChart3                        },
        { id: 'settings',  label: 'Settings',           icon: Settings                         },
    ];

    const renderSecondaryView = () => {
        switch (activeView) {
            case 'overview':  return <Overview />;
            case 'manage':    return <JobManagement user={user} />;
            case 'analyzer':  return <ResumeAnalyzer user={user} />;
            case 'analytics': return <div className={`text-center mt-20 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Analytics module coming soon...</div>;
            case 'settings':  return <div className={`text-center mt-20 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Settings module coming soon...</div>;
            default:          return <Overview />;
        }
    };

    // Theme tokens
    const mainBg    = isDark ? 'bg-slate-950 text-slate-100'        : 'bg-slate-50 text-slate-900';
    const sidebarBg = isDark ? 'bg-slate-900/80 border-slate-800'   : 'bg-white border-slate-200';
    const headerBg  = isDark ? 'bg-slate-900/30 border-slate-800/50' : 'bg-white/80 border-slate-200';
    const divCol    = isDark ? 'border-slate-800'                    : 'border-slate-200';

    return (
        <div className={`flex h-screen font-sans overflow-hidden ${mainBg}`}>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-50 lg:z-20
                w-72 flex flex-col shrink-0 h-screen
                border-r backdrop-blur-xl transition-transform duration-300
                ${sidebarBg}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`h-14 sm:h-20 flex items-center px-4 sm:px-6 border-b ${divCol}`}>
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400" />
                        <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            HireMind AI
                        </span>
                    </div>
                    {/* Close — mobile only */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`ml-auto lg:hidden p-1.5 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav items */}
                <div className="flex-1 overflow-y-auto py-4 sm:py-6 px-3 sm:px-4 space-y-1 custom-scrollbar">
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Main Menu
                    </div>
                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 group text-sm ${
                                    isActive
                                        ? item.highlight
                                            ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 text-white'
                                            : isDark ? 'bg-slate-800 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : isDark
                                            ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 shrink-0 ${
                                    isActive
                                        ? item.highlight ? 'text-indigo-400' : isDark ? 'text-white' : 'text-indigo-600'
                                        : isDark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-700'
                                }`} />
                                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                {item.highlight && !isActive && (
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 ml-auto animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom — user card + theme + logout */}
                <div className={`p-3 sm:p-4 border-t space-y-2 ${divCol}`}>
                    <div className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border ${isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0 text-sm">
                            {user?.companyName?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="overflow-hidden">
                            <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {user?.companyName || user?.name || 'Company Profile'}
                            </div>
                            <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {user?.email || 'admin@company.com'}
                            </div>
                        </div>
                    </div>
                    <ThemeToggle className="w-full justify-center" />
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl transition-colors ${
                            isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10' : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                    >
                        <LogOut className="w-4 h-4" /> Log out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
                {isDark && (
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
                )}

                {/* Header */}
                <header className={`h-14 sm:h-20 border-b backdrop-blur-sm flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        {/* Hamburger — mobile only */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className={`lg:hidden p-2 rounded-lg transition-colors ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="hidden sm:inline">Recruiter Portal</span>
                            <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:inline" />
                            <span className="text-indigo-400 font-semibold">
                                {navItems.find(i => i.id === activeView)?.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Logout — mobile header only */}
                        <button
                            onClick={handleLogout}
                            title="Log out"
                            className={`lg:hidden p-2 rounded-lg transition-colors ${
                                isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'
                            }`}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>

                        {/* Notifications */}
                        <NotificationBell />

                        {/* System online badge — hidden on small screens */}
                        <div className="hidden sm:flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            System Online
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
                            {renderSecondaryView()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default CompanyDashboard;