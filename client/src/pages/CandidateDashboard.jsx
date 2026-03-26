import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    FileText, 
    Search, 
    Briefcase, 
    Target, 
    Settings, 
    LogOut,
    Bell,
    UserCircle
} from 'lucide-react';

// Import Views
import Overview from '../components/dashboard/candidate/Overview';
import ResumeProfile from '../components/dashboard/candidate/ResumeProfile';
import BrowseJobs from '../components/dashboard/candidate/BrowseJobs';
import MyApplications from '../components/dashboard/candidate/MyApplications';
import MatchScore from '../components/dashboard/candidate/MatchScore';
import CandidateSettings from '../components/dashboard/candidate/Settings';

const SidebarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive 
            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
    >
        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
        <span className="font-medium text-sm">{label}</span>
    </button>
);

const CandidateDashboard = () => {
    const [activeView, setActiveView] = useState('overview');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const navItems = [
        { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'profile', label: 'Resume Profile', icon: FileText },
        { id: 'browse', label: 'Browse Jobs', icon: Search },
        { id: 'applications', label: 'My Applications', icon: Briefcase },
        { id: 'match', label: 'Match Score (AI)', icon: Target },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const renderActiveView = () => {
        switch (activeView) {
            case 'overview': return <Overview />;
            case 'profile': return <ResumeProfile />;
            case 'browse': return <BrowseJobs />;
            case 'applications': return <MyApplications />;
            case 'match': return <MatchScore />;
            case 'settings': return <CandidateSettings />;
            default: return <Overview />;
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
                        {user?.name || 'Candidate Portal'}
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
                            {navItems.find(item => item.id === activeView)?.label || 'Dashboard'}
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
                                    {user?.name?.charAt(0) || 'C'}
                                </span>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-semibold text-white">{user?.name || 'Candidate'}</p>
                                <p className="text-xs text-slate-500">{user?.email || 'Active'}</p>
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
