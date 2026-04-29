import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, Zap, Target, Filter, Database,
    FileText, CheckCircle, ChevronRight, BarChart, Menu, X,
    ArrowUpRight, Sparkles, TrendingUp,
    Users, Cpu, GitBranch, LayoutDashboard, Layers
} from 'lucide-react';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

function useCounter(target, duration = 1800, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(ease * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [start, target, duration]);
    return count;
}

function StatItem({ value, suffix, label, started }) {
    const num = useCounter(value, 1800, started);
    return (
        <div className="text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white tabular-nums">
                {num}{suffix}
            </div>
            <div className="text-xs sm:text-sm text-indigo-200 mt-1 font-medium leading-tight">{label}</div>
        </div>
    );
}

const Home = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInitialView, setAuthInitialView] = useState('role');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [statsVisible, setStatsVisible] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const statsRef = useRef(null);
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 400], [0, -50]);
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setActiveFeature(p => (p + 1) % 4), 3500);
        return () => clearInterval(interval);
    }, []);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setMobileMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const openAuthModal = (view = 'role') => {
        setAuthInitialView(view);
        setIsAuthModalOpen(true);
        setMobileMenuOpen(false);
    };

    const navLinks = [
        { label: 'Platform', href: '#features' },
        { label: 'AI Engine', href: '#engine' },
        { label: 'How It Works', href: '#workflow' },
        { label: 'Architecture', href: '#architecture' },
    ];

    const features = [
        { icon: BrainCircuit, title: 'BERT Semantic Matching', accent: 'indigo',
          desc: 'Goes beyond keywords. Understands "React JS", "ReactJS", and "frontend built with React" are the same skill — using transformer-based contextual embeddings.',
          demo: ['Resume uploaded', 'Text extracted', 'BERT encoded', 'Similarity: 94.2%'] },
        { icon: Zap, title: 'Batch Processing at Scale', accent: 'amber',
          desc: 'Process hundreds of resumes simultaneously. Parallel PDF extraction with sequential BERT inference delivers speed without sacrificing accuracy.',
          demo: ['127 resumes queued', 'PDF fetch: parallel', 'BERT: sequential', '✓ Ranked in 43s'] },
        { icon: Filter, title: 'Smart Pre-Filtering', accent: 'emerald',
          desc: 'Hard must-have skill gates eliminate unqualified candidates before expensive AI scoring, saving compute and surfacing only relevant profiles.',
          demo: ['Must-have: Python', 'Must-have: AWS', '89 passed gate', '38 filtered out'] },
        { icon: BarChart, title: 'Quantified Decisions', accent: 'purple',
          desc: 'Every ranking is backed by a breakdown across semantic similarity, skill coverage, experience depth, and project relevance — fully auditable.',
          demo: ['Semantic: 87%', 'Skills: 92%', 'Experience: 78%', 'Final score: 86.4%'] },
    ];

    const ac = {
        indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', dot: 'bg-indigo-500', btn: 'bg-indigo-500 hover:bg-indigo-600' },
        amber:  { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600'  },
        emerald:{ text: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-500',btn: 'bg-emerald-500 hover:bg-emerald-600'},
        purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-500', btn: 'bg-purple-500 hover:bg-purple-600' },
    };

    const workflow = [
        { n: '01', title: 'Define the Role', desc: 'Write or paste your JD and set hard must-have skill gates to filter early.' },
        { n: '02', title: 'Upload Resumes', desc: 'Drop up to 200 PDFs at once. No formatting rules — we handle the parsing.' },
        { n: '03', title: 'AI Runs Analysis', desc: 'BERT encodes every resume and the JD into semantic vectors, then scores all candidates.' },
        { n: '04', title: 'Get Ranked Results', desc: 'Review a ranked shortlist with score breakdowns, skill gaps, and export options.' },
    ];

    const c = {
        bg: isDark ? 'bg-slate-950' : 'bg-[#f8f9fc]',
        card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
        card2: isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200',
        heading: isDark ? 'text-white' : 'text-slate-900',
        sub: isDark ? 'text-slate-400' : 'text-slate-500',
        muted: isDark ? 'text-slate-500' : 'text-slate-400',
        nav: isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/90 border-slate-200',
        divider: isDark ? 'border-slate-800' : 'border-slate-200',
        pill: isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500',
    };

    return (
        <div className={`min-h-screen ${c.bg} ${c.heading} font-sans antialiased overflow-x-hidden`}>

            {/* NAVBAR */}
            <nav className={`fixed w-full top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${c.nav}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
                    <a href="#home" className="flex items-center gap-2 shrink-0 group">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                            <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <span className={`text-sm sm:text-base font-bold tracking-tight ${c.heading}`}>
                            HireMind <span className="text-indigo-500">AI</span>
                        </span>
                    </a>

                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map(l => (
                            <a key={l.label} href={l.href}
                               className={`px-3 xl:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                                {l.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <ThemeToggle />
                        <button onClick={() => openAuthModal('login')}
                                className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                            Sign in
                        </button>
                        <button onClick={() => openAuthModal('register')}
                                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap">
                            Get started <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className={`lg:hidden p-2 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                                aria-label="Toggle menu">
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    className={`lg:hidden border-t overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="px-4 sm:px-6 py-4 space-y-1">
                                {navLinks.map(l => (
                                    <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
                                       className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        {l.label}
                                    </a>
                                ))}
                                <div className={`my-2 border-t ${c.divider}`} />
                                <button onClick={() => openAuthModal('login')}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    Sign in
                                </button>
                                <button onClick={() => openAuthModal('register')}
                                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold">
                                    Get started free
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* HERO */}
            <section id="home" className="relative pt-24 sm:pt-32 md:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none"
                     style={{
                         backgroundImage: isDark
                             ? 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.07) 1px, transparent 0)'
                             : 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.05) 1px, transparent 0)',
                         backgroundSize: '32px 32px'
                     }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,100vw)] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 sm:mb-8"
                                style={{ background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)', color: isDark ? '#a5b4fc' : '#4f46e5' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="hidden xs:inline">AI-Powered Recruitment Intelligence · v1.0</span>
                        <span className="xs:hidden">AI Recruitment · v1.0</span>
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                               className={`text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-5 sm:mb-6 ${c.heading}`}>
                        Screen resumes at{' '}
                        <span className="relative inline-block">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">10× speed</span>
                            <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none">
                                <path d="M2 9 Q75 2 150 7 Q225 12 298 5" stroke="url(#ug)" strokeWidth="3" strokeLinecap="round" fill="none"/>
                                <defs><linearGradient id="ug" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
                            </svg>
                        </span>{' '}
                        with BERT AI
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                              className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2 sm:px-0 ${c.sub}`}>
                        HireMind AI replaces manual resume stacking with transformer-based semantic matching.
                        Upload a job description, drop your resumes, get a ranked shortlist in seconds.
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                                className="flex flex-col xs:flex-row gap-3 justify-center items-center mb-8 sm:mb-10 px-4 xs:px-0">
                        <button onClick={() => openAuthModal('recruiter')}
                                className="group w-full xs:w-auto flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-500/25 text-sm sm:text-base">
                            Start screening free <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={() => openAuthModal('candidate')}
                                className={`w-full xs:w-auto flex items-center justify-center gap-2 font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl border transition-all text-sm sm:text-base ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                            <Users className="w-4 h-4" /> I'm a candidate
                        </button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                className={`flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs font-medium ${c.muted} px-4 sm:px-0`}>
                        {['No credit card required', '200 resumes per batch', 'BERT semantic matching', 'Export to CSV'].map((t, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Dashboard mockup */}
                <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="max-w-4xl mx-auto mt-12 sm:mt-16 md:mt-20 relative z-10">
                    <div className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-2xl ${isDark ? 'shadow-black/40' : 'shadow-slate-300/60'} ${c.card}`}>
                        {/* Browser bar */}
                        <div className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b ${c.divider} ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                            <div className="flex gap-1.5 shrink-0">
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/80" />
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/80" />
                            </div>
                            <div className={`flex-1 min-w-0 text-center text-xs font-mono px-2 sm:px-4 py-1 rounded-md mx-2 sm:mx-8 truncate ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                hiremind.ai/dashboard
                            </div>
                        </div>
                        <div className="p-4 sm:p-5 md:p-7">
                            <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-5 gap-3">
                                <div className="min-w-0">
                                    <div className={`text-xs font-semibold uppercase tracking-widest mb-1 truncate ${c.muted}`}>AI Workspace · Senior ML Engineer</div>
                                    <div className={`text-sm sm:text-base md:text-lg font-bold ${c.heading}`}>Batch Analysis Complete</div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">47 ranked</span>
                                </div>
                            </div>
                            <div className="space-y-2 sm:space-y-2.5">
                                {[
                                    { name: 'Arjun Sharma', score: 94, skills: ['Python', 'PyTorch', 'MLOps'], status: 'Shortlisted', rank: 1 },
                                    { name: 'Priya Mehta', score: 88, skills: ['TensorFlow', 'Kubernetes', 'AWS'], status: 'Shortlisted', rank: 2 },
                                    { name: 'Rohan Desai', score: 81, skills: ['Scikit-learn', 'Python', 'SQL'], status: 'Pending', rank: 3 },
                                    { name: 'Sneha Kulkarni', score: 74, skills: ['Python', 'NLP', 'FastAPI'], status: 'Pending', rank: 4 },
                                ].map((row, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.7 + i * 0.08 }}
                                                className={`flex items-center gap-2 sm:gap-3 md:gap-4 p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/30' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'} transition-colors cursor-pointer`}>
                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? 'bg-amber-400/20 text-amber-400' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                                            #{row.rank}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs sm:text-sm font-semibold truncate ${c.heading}`}>{row.name}</div>
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {row.skills.slice(0, window?.innerWidth < 400 ? 2 : 3).map(s => (
                                                    <span key={s} className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className={`text-xs sm:text-sm font-black ${row.score >= 88 ? 'text-emerald-400' : row.score >= 75 ? 'text-amber-400' : 'text-slate-400'}`}>{row.score}%</div>
                                            <div className={`w-14 sm:w-20 h-1.5 rounded-full mt-1 sm:mt-1.5 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${row.score}%` }} transition={{ delay: 0.9 + i * 0.1, duration: 0.8 }}
                                                            className={`h-full rounded-full ${row.score >= 88 ? 'bg-emerald-400' : row.score >= 75 ? 'bg-amber-400' : 'bg-slate-400'}`} />
                                            </div>
                                        </div>
                                        <div className={`hidden xs:flex shrink-0 text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg ${row.status === 'Shortlisted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                                            {row.status}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* STATS */}
            <div ref={statsRef} className="bg-indigo-500 border-y border-indigo-400/30 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
                    <StatItem value={200} suffix="+" label="Resumes per batch" started={statsVisible} />
                    <StatItem value={94} suffix="%" label="Matching accuracy" started={statsVisible} />
                    <StatItem value={10} suffix="×" label="Faster than manual" started={statsVisible} />
                    <StatItem value={7} suffix=" steps" label="JD to shortlist" started={statsVisible} />
                </div>
            </div>

            {/* FEATURES */}
            <section id="features" className="py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-2xl mb-10 sm:mb-14">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-4 sm:mb-5 ${c.pill}`}>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Platform capabilities
                        </div>
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-3 sm:mb-4 ${c.heading}`}>
                            Everything a recruiter needs.<br/>Nothing they don't.
                        </h2>
                        <p className={`text-sm sm:text-base md:text-lg ${c.sub}`}>Purpose-built for technical hiring. Every feature earns its place.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-5 sm:gap-6 items-start">
                        <div className="space-y-3">
                            {features.map((f, i) => {
                                const a = ac[f.accent];
                                const isActive = activeFeature === i;
                                return (
                                    <motion.div key={i} onClick={() => setActiveFeature(i)} layout
                                                className={`cursor-pointer rounded-xl sm:rounded-2xl border p-4 sm:p-5 md:p-6 transition-all duration-300 ${isActive ? (isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300 shadow-lg') : (isDark ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300')}`}>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${a.bg} ${a.border}`}>
                                                <f.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${a.text}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-sm sm:text-base mb-1 ${c.heading}`}>{f.title}</div>
                                                <AnimatePresence>
                                                    {isActive && (
                                                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                                  exit={{ opacity: 0, height: 0 }} className={`text-xs sm:text-sm leading-relaxed ${c.sub}`}>
                                                            {f.desc}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'rotate-90' : ''} ${c.muted}`} />
                                        </div>
                                        {isActive && (
                                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 3.5 }}
                                                        className={`mt-3 sm:mt-4 h-0.5 rounded-full origin-left opacity-50 ${a.dot}`} />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Feature demo panel — not sticky on mobile */}
                        <div className={`lg:sticky lg:top-24 rounded-xl sm:rounded-2xl border overflow-hidden ${c.card}`}>
                            <div className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b ${c.divider} ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400/60" />
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400/60" />
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400/60" />
                                </div>
                                <span className={`text-xs font-mono ml-1 sm:ml-2 ${c.muted}`}>ai_pipeline.log</span>
                            </div>
                            <div className="p-5 sm:p-6 md:p-8 min-h-[240px] sm:min-h-[280px] flex flex-col justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div key={activeFeature} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                                        <div className={`text-xs font-semibold uppercase tracking-widest mb-4 sm:mb-6 ${ac[features[activeFeature].accent].text}`}>
                                            {features[activeFeature].title}
                                        </div>
                                        <div className="space-y-2 sm:space-y-3">
                                            {features[activeFeature].demo.map((line, i) => (
                                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border ${c.card2}`}>
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${ac[features[activeFeature].accent].dot}`} />
                                                    <span className={`text-xs sm:text-sm font-mono font-medium ${c.heading}`}>{line}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="workflow" className={`py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t ${c.divider} ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-4 sm:mb-5 ${c.pill}`}>
                            <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> How it works
                        </div>
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] ${c.heading}`}>
                            From job description to shortlist in 4 steps
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {workflow.map((step, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                        className={`relative rounded-xl sm:rounded-2xl border p-5 sm:p-6 ${c.card}`}>
                                {i < 3 && (
                                    <div className={`hidden lg:block absolute top-10 -right-3 w-6 h-px z-10 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}>
                                        <div className="absolute right-0 -top-[3px] w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-slate-400" />
                                    </div>
                                )}
                                <div className="text-3xl sm:text-4xl font-black text-indigo-500/15 font-mono mb-3 sm:mb-4 leading-none">{step.n}</div>
                                <h3 className={`text-sm sm:text-base font-bold mb-2 ${c.heading}`}>{step.title}</h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${c.sub}`}>{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI ENGINE */}
            <section id="engine" className={`py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t ${c.divider}`}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
                    <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-5 sm:mb-6 ${c.pill}`}>
                            <Cpu className="w-3.5 h-3.5 text-purple-400" /> AI Engine
                        </div>
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-5 sm:mb-6 ${c.heading}`}>
                            Not keyword matching.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Semantic understanding.</span>
                        </h2>
                        <div className={`space-y-3 sm:space-y-4 text-sm sm:text-base leading-relaxed ${c.sub}`}>
                            <p>Traditional ATS systems search for exact keywords. A candidate who writes "built ML pipelines" won't match a search for "Machine Learning" — even if they're a perfect fit.</p>
                            <p>HireMind uses <strong className={c.heading}>all-MiniLM-L6-v2 BERT</strong> to encode both resumes and JDs into 384-dimensional semantic vectors. Cosine similarity across these captures actual meaning — not character sequences.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-6 sm:mt-8">
                            {[
                                { label: 'Semantic similarity', value: 'BERT cosine' },
                                { label: 'Skill extraction', value: 'NLP + regex' },
                                { label: 'Experience parsing', value: 'Structured NLP' },
                                { label: 'Score weights', value: 'Configurable' },
                            ].map((item, i) => (
                                <div key={i} className={`p-3 sm:p-4 rounded-xl border ${c.card}`}>
                                    <div className={`text-xs mb-1 ${c.muted}`}>{item.label}</div>
                                    <div className={`text-xs sm:text-sm font-bold ${c.heading}`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                                className={`rounded-xl sm:rounded-2xl border p-5 sm:p-6 md:p-8 ${c.card}`}>
                        <div className={`text-xs font-semibold uppercase tracking-widest mb-4 sm:mb-6 ${c.muted}`}>Inference Pipeline</div>
                        <div className="space-y-2">
                            {[
                                { label: 'Resume PDF', sub: 'pdfplumber extraction', color: 'bg-slate-400', indent: 0 },
                                { label: 'Text Preprocessing', sub: 'stopwords · tokenization', color: 'bg-indigo-400', indent: 1 },
                                { label: 'BERT Encoder', sub: 'all-MiniLM-L6-v2 · 384-dim', color: 'bg-purple-400', indent: 2 },
                                { label: 'Cosine Similarity', sub: 'vs. JD embedding vector', color: 'bg-violet-400', indent: 2 },
                                { label: 'Skill Scorer', sub: 'must-have + nice-to-have', color: 'bg-indigo-400', indent: 1 },
                                { label: 'Experience Parser', sub: 'structured section NLP', color: 'bg-indigo-400', indent: 1 },
                                { label: 'Final Score', sub: 'weighted composite · 0–100', color: 'bg-emerald-400', indent: 0 },
                            ].map((node, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                                            className="flex items-center gap-2 sm:gap-3"
                                            /* FIX: cap indent on mobile so nodes don't overflow */
                                            style={{ paddingLeft: `${Math.min(node.indent * 20, node.indent > 0 ? 16 : 0)}px` }}>
                                    {node.indent > 0 && <div className={`w-3 sm:w-4 h-px shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />}
                                    <div className={`flex items-center gap-2 sm:gap-3 flex-1 min-w-0 p-2.5 sm:p-3 rounded-xl border ${c.card2}`}>
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${node.color}`} />
                                        <div className="min-w-0">
                                            <div className={`text-xs sm:text-sm font-semibold truncate ${c.heading}`}>{node.label}</div>
                                            <div className={`text-[10px] sm:text-xs truncate ${c.muted}`}>{node.sub}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ARCHITECTURE */}
            <section id="architecture" className={`py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t ${c.divider} ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-4 sm:mb-5 ${c.pill}`}>
                            <Layers className="w-3.5 h-3.5 text-blue-400" /> Stack
                        </div>
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] ${c.heading}`}>
                            Production-grade architecture
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                        {[
                            { icon: LayoutDashboard, layer: 'Frontend', stack: 'React + Vite', detail: 'Tailwind CSS · Framer Motion · Axios', color: 'indigo' },
                            { icon: Database, layer: 'Backend API', stack: 'Node.js + Express', detail: 'JWT Auth · Multer · AWS S3 · MongoDB', color: 'emerald' },
                            { icon: BrainCircuit, layer: 'AI Service', stack: 'Python + Flask', detail: 'BERT · pdfplumber · scikit-learn · NumPy', color: 'purple' },
                            { icon: Database, layer: 'Database', stack: 'MongoDB Atlas', detail: 'Mongoose ODM · TTL indexes · Aggregations', color: 'amber' },
                        ].map(({ icon: Icon, layer, stack, detail, color }, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                        className={`rounded-xl sm:rounded-2xl border p-5 sm:p-6 ${c.card} hover:border-indigo-500/40 transition-colors`}>
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-4 sm:mb-5 border ${ac[color].bg} ${ac[color].border}`}>
                                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${ac[color].text}`} />
                                </div>
                                <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${c.muted}`}>{layer}</div>
                                <div className={`text-sm sm:text-base font-bold mb-1.5 sm:mb-2 ${c.heading}`}>{stack}</div>
                                <div className={`text-xs leading-relaxed ${c.sub}`}>{detail}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PORTALS */}
            <section id="portals" className={`py-16 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t ${c.divider}`}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10 sm:mb-14">
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] ${c.heading}`}>
                            Two portals. One platform.
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                        {[
                            {
                                role: 'Recruiter', tagline: 'Hire faster with AI-ranked shortlists',
                                icon: Target, color: 'indigo', cta: 'Create company account', view: 'recruiter',
                                perks: ['Batch upload 200 resumes', 'AI ranking & skill gap analysis', 'Shortlist & reject with one click', 'Export shortlisted candidates to CSV', 'Manage active job postings'],
                            },
                            {
                                role: 'Candidate', tagline: 'Know your match score before you apply',
                                icon: FileText, color: 'purple', cta: 'Create candidate profile', view: 'candidate',
                                perks: ['Upload your resume once', 'See your AI match score per job', 'Understand which skills to close', 'Track application status live', 'Get AI-powered skill recommendations'],
                            },
                        ].map(({ role, tagline, icon: Icon, color, cta, view, perks }) => {
                            const a = ac[color];
                            return (
                                <motion.div key={role} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            className={`rounded-xl sm:rounded-2xl border p-6 sm:p-7 md:p-9 flex flex-col ${c.card} relative overflow-hidden group`}>
                                    <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 -mr-12 -mt-12 ${color === 'indigo' ? 'bg-indigo-500/10' : 'bg-purple-500/10'}`} />
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-5 sm:mb-6 border ${a.bg} ${a.border}`}>
                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${a.text}`} />
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${a.text}`}>{role} Portal</div>
                                    <h3 className={`text-lg sm:text-xl md:text-2xl font-black leading-tight mb-5 sm:mb-6 ${c.heading}`}>{tagline}</h3>
                                    <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 flex-1">
                                        {perks.map((p, i) => (
                                            <li key={i} className={`flex items-start sm:items-center gap-2 sm:gap-2.5 text-xs sm:text-sm ${c.sub}`}>
                                                <CheckCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 sm:mt-0 ${a.text}`} /> {p}
                                            </li>
                                        ))}
                                    </ul>
                                    <button onClick={() => openAuthModal(view)}
                                            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all shadow-lg ${color === 'indigo' ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'}`}>
                                        {cta} →
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-indigo-500 p-8 sm:p-10 md:p-16 text-center">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/20 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold text-white/80 mb-5 sm:mb-6">
                                <TrendingUp className="w-3.5 h-3.5" /> Built for modern engineering teams
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4 sm:mb-5">
                                Start hiring smarter today
                            </h2>
                            <p className="text-indigo-100 text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-7 sm:mb-9">
                                No spreadsheets. No manual sorting. Just a ranked list of your best candidates — ready in seconds.
                            </p>
                            <div className="flex flex-col xs:flex-row gap-3 justify-center">
                                <button onClick={() => openAuthModal('recruiter')}
                                        className="w-full xs:w-auto bg-white hover:bg-indigo-50 text-indigo-600 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl transition-all shadow-xl text-sm sm:text-base">
                                    Get started free →
                                </button>
                                <button onClick={() => openAuthModal('candidate')}
                                        className="w-full xs:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl transition-all text-sm sm:text-base">
                                    I'm a candidate
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className={`border-t px-4 sm:px-6 lg:px-8 py-8 sm:py-10 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-900'}`}>
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-8 mb-6 sm:mb-8">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
                                <BrainCircuit className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-white font-bold text-sm">HireMind AI</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">
                            BERT-powered recruitment intelligence for technical hiring teams.
                        </p>
                        <div className="text-slate-600 text-xs leading-relaxed">
                            Major Engineering Project · B.E. Computer Engineering<br />
                            Watumull Institute · University of Mumbai
                        </div>
                    </div>
                    <div className="flex gap-8 sm:gap-10 md:gap-14 text-xs">
                        <div>
                            <div className="text-slate-400 font-semibold mb-3 uppercase tracking-wider">Product</div>
                            {[['Platform', '#features'], ['AI Engine', '#engine'], ['How It Works', '#workflow'], ['Architecture', '#architecture']].map(([l, h]) => (
                                <a key={l} href={h} className="block text-slate-500 hover:text-slate-300 transition-colors mb-2">{l}</a>
                            ))}
                        </div>
                        <div>
                            <div className="text-slate-400 font-semibold mb-3 uppercase tracking-wider">Access</div>
                            {[['Recruiter Portal', 'recruiter'], ['Candidate Portal', 'candidate']].map(([l, v]) => (
                                <button key={l} onClick={() => openAuthModal(v)}
                                        className="block text-slate-500 hover:text-slate-300 transition-colors mb-2">{l}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-5 sm:pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 text-xs text-slate-600 text-center sm:text-left">
                    <span>© 2026 HireMind AI. All rights reserved.</span>
                    <span>Built with BERT · React · Node.js · MongoDB</span>
                </div>
            </footer>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialView={authInitialView} />
        </div>
    );
};

export default Home;