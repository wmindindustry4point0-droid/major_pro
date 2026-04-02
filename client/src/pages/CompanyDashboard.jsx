import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, PlusSquare,
    BrainCircuit, Settings, BarChart3, LogOut, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import View Components
import Overview from '../components/dashboard/Overview';
import JobManagement from '../components/dashboard/JobManagement';
import ResumeAnalyzer from '../components/dashboard/ResumeAnalyzer';

const CompanyDashboard = () => {
    const [activeView, setActiveView] = useState('overview');
    const navigate = useNavigate();

    // Parse user safely
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.error("No valid user in storage.");
    }

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const navItems = [
        { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'manage', label: 'Job Management', icon: PlusSquare },
        { id: 'analyzer', label: 'Resume Analyzer', icon: BrainCircuit, highlight: true },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const renderSecondaryView = () => {
        switch (activeView) {
            case 'overview': return <Overview />;
            case 'manage': return <JobManagement user={user} />;
            case 'analyzer': return <ResumeAnalyzer user={user} />;
            case 'analytics': return <div className="text-slate-400">Analytics module coming soon...</div>;
            case 'settings': return <div className="text-slate-400">Settings module coming soon...</div>;
            default: return <Overview />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

            {/* LEFT SIDEBAR */}
            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                className="w-72 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0 z-20"
            >
                {/* Brand / Logo */}
                <div className="h-20 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            HireMind AI
                        </span>
                    </div>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-2">Main Menu</div>

                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? item.highlight
                                            ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 text-white'
                                            : 'bg-slate-800 text-white'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? (item.highlight ? 'text-indigo-400' : 'text-white') : 'text-slate-500 group-hover:text-slate-300'}`} />
                                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                {item.highlight && !isActive && (
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 ml-auto animate-pulse"></div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl mb-3 border border-slate-800/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
                            {user?.companyName?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate">{user?.companyName || user?.name || 'Company Profile'}</div>
                            <div className="text-xs text-slate-400 truncate">{user?.email || 'admin@company.com'}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </motion.aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Subtle Background Glow */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

                {/* Header Strip */}
                <header className="h-20 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-10">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                        <span>Recruiter Portal</span>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                        <span className="text-indigo-300">{navItems.find(i => i.id === activeView)?.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            System Online
                        </div>
                    </div>
                </header>

                {/* Dynamic View Content */}
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
                            {renderSecondaryView()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default CompanyDashboard;