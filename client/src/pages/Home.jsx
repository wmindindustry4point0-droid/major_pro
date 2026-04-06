import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BrainCircuit, Zap, Target, Filter, Database,
    FileText, CheckCircle, ChevronRight, BarChart, Menu, X
} from 'lucide-react';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInitialView, setAuthInitialView] = useState('role');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const openAuthModal = (view = 'role') => {
        setAuthInitialView(view);
        setIsAuthModalOpen(true);
        setMobileMenuOpen(false);
    };

    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };
    const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

    // Theme-aware class helpers
    const navBg = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200';
    const sectionAlt = isDark ? 'bg-slate-800/20 border-slate-800/50' : 'bg-slate-100/60 border-slate-200/50';
    const cardBg = isDark ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm';
    const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
    const textMuted = isDark ? 'text-slate-300' : 'text-slate-600';
    const heroBg = isDark ? 'bg-slate-900' : 'bg-white';
    const heroBlobColor = isDark ? 'bg-indigo-600/20' : 'bg-indigo-300/20';
    const heroCardBg = isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-xl';
    const heroInnerCard = isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';
    const aiDiagramBg = isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
    const aiDiagramNode = isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-100 border-slate-300';
    const footerBg = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-700';
    const portalCard = isDark
        ? 'bg-gradient-to-b from-slate-800/50 to-slate-900 border-slate-700 hover:border-indigo-500/50'
        : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-indigo-400 shadow-md';
    const portalCardCandidate = isDark
        ? 'bg-gradient-to-b from-slate-800/50 to-slate-900 border-slate-700 hover:border-purple-500/50'
        : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-purple-400 shadow-md';
    const portalListText = isDark ? 'text-slate-300' : 'text-slate-600';
    const archLayerBg = {
        blue: isDark ? 'from-blue-500/20 to-blue-600/10 border-blue-500/30' : 'from-blue-50 to-blue-100/50 border-blue-300',
        emerald: isDark ? 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' : 'from-emerald-50 to-emerald-100/50 border-emerald-300',
        purple: isDark ? 'from-purple-500/20 to-purple-600/10 border-purple-500/30' : 'from-purple-50 to-purple-100/50 border-purple-300',
        amber: isDark ? 'from-amber-500/20 to-amber-600/10 border-amber-500/30' : 'from-amber-50 to-amber-100/50 border-amber-300',
    };
    const workflowStepBg = isDark ? 'bg-slate-800 border-indigo-500/30 hover:bg-indigo-600' : 'bg-white border-indigo-300 hover:bg-indigo-500 shadow-md';
    const workflowNumBg = isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-600';
    const workflowLine = isDark ? 'bg-slate-800' : 'bg-slate-200';
    const aboutBoxBg = isDark ? 'bg-slate-900/80' : 'bg-white shadow-lg';
    const aboutHighlight = isDark ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200';

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} font-sans selection:bg-indigo-500/30`}>

            {/* NAVBAR */}
            <nav className={`fixed w-full top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${navBg}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <BrainCircuit className="w-7 h-7 text-indigo-400" />
                        <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            HireMind AI
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex gap-6 text-sm font-medium text-slate-400">
                        {['Home','Features','AI Engine','How It Works','Architecture','Portals'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g,'-').replace('ai-engine','engine').replace('how-it-works','workflow').replace('portals','portals')}`}
                               className={`hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>{item}</a>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        <button onClick={() => openAuthModal('login')} className={`hidden sm:block text-sm font-medium px-3 py-1.5 transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Login
                        </button>
                        <button onClick={() => openAuthModal('register')} className="text-xs sm:text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all shadow-lg shadow-indigo-500/20">
                            Get Started
                        </button>
                        {/* Mobile Menu Toggle */}
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`lg:hidden p-1.5 rounded-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className={`lg:hidden border-t px-4 py-4 space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {[
                            { label: 'Home', href: '#home' },
                            { label: 'Features', href: '#features' },
                            { label: 'AI Engine', href: '#engine' },
                            { label: 'How It Works', href: '#workflow' },
                            { label: 'Architecture', href: '#architecture' },
                            { label: 'Portals', href: '#portals' },
                        ].map((item) => (
                            <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}
                               className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} transition-colors`}>
                                {item.label}
                            </a>
                        ))}
                        <button onClick={() => openAuthModal('login')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'} transition-colors`}>
                            Login
                        </button>
                    </div>
                )}
            </nav>

            {/* HERO */}
            <section id="home" className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] ${heroBlobColor} rounded-full blur-[80px] sm:blur-[120px] mix-blend-screen pointer-events-none`}></div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <motion.div initial="hidden" animate="visible" variants={stagger} className="z-10 text-center lg:text-left">
                        <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-medium mb-5 sm:mb-6">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            v1.0 is live
                        </motion.div>
                        <motion.h1 variants={fadeIn} className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6 leading-[1.1] ${textPrimary}`}>
                            Intelligent Resume Screening &{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500">Talent Intelligence</span>
                        </motion.h1>
                        <motion.p variants={fadeIn} className={`text-base sm:text-lg ${textSecondary} mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0`}>
                            HireMind AI transforms recruitment by using AI and NLP to analyze resumes and match candidates with job descriptions using BERT-based semantic analysis.
                        </motion.p>
                        <motion.div variants={fadeIn} className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                            <button onClick={() => openAuthModal('role')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm sm:text-base">
                                Start Screening <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <a href="#engine" className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm'} border text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center transition-all text-sm sm:text-base`}>
                                Explore Platform
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* Hero Illustration */}
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative z-10 hidden md:block">
                        <div className={`backdrop-blur-xl border rounded-2xl p-4 sm:p-6 shadow-2xl ${heroCardBg}`}>
                            <div className={`flex items-center justify-between border-b pb-3 sm:pb-4 mb-3 sm:mb-4 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                                <div className={`text-xs sm:text-sm font-medium ${textMuted}`}>Candidate Ranking Dashboard</div>
                                <div className="flex gap-1.5 sm:gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[98, 92, 85].map((score, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border ${heroInnerCard}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className={`font-semibold text-sm ${textPrimary}`}>Candidate Resume {i + 1}</div>
                                                <div className="text-xs text-slate-400">Analyzed by BERT NLP</div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-indigo-400 font-bold text-sm sm:text-lg">{score}% Match</div>
                                            <div className={`w-16 sm:w-24 h-1.5 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${score}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ABOUT */}
            <section className={`py-16 sm:py-24 px-4 sm:px-6 border-y transition-colors duration-300 ${sectionAlt}`}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeIn}>
                        <div className={`relative p-5 sm:p-8 rounded-3xl border ${isDark ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'}`}>
                            <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
                                <div className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 backdrop-blur rounded-2xl border shadow-xl ${aboutBoxBg} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 shrink-0 mt-1" />
                                    <div>
                                        <h4 className={`font-semibold mb-1 sm:mb-2 ${textPrimary}`}>Semantic Understanding</h4>
                                        <p className={`text-xs sm:text-sm leading-relaxed ${textSecondary}`}>System understands that "React JS", "React.js", and "Frontend built with React" represent the same core competency, moving beyond exact keyword matches.</p>
                                    </div>
                                </div>
                                <div className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 backdrop-blur rounded-2xl border shadow-xl ml-4 sm:ml-8 ${aboutHighlight}`}>
                                    <Target className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 shrink-0 mt-1" />
                                    <div>
                                        <h4 className={`font-semibold mb-1 sm:mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Contextual Relevance</h4>
                                        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Analyzes the years of experience and context in which skills were applied to determine true proficiency for the matched job description.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={stagger}>
                        <motion.h2 variants={fadeIn} className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 ${textPrimary}`}>About HireMind AI</motion.h2>
                        <div className={`space-y-4 sm:space-y-6 text-base sm:text-lg leading-relaxed ${textMuted}`}>
                            <motion.p variants={fadeIn}>HireMind AI is an intelligent recruitment platform designed to automate the resume screening process using Artificial Intelligence and Natural Language Processing.</motion.p>
                            <motion.p variants={fadeIn}>Recruiters can upload resumes and job descriptions, and the system automatically extracts candidate skills, analyzes experience, and ranks applicants based on semantic similarity.</motion.p>
                            <motion.p variants={fadeIn} className={`p-3 sm:p-4 border-l-4 border-purple-500 rounded-r-lg font-medium text-sm sm:text-base ${isDark ? 'bg-purple-500/5 text-slate-200' : 'bg-purple-50 text-slate-700'}`}>
                                Unlike traditional ATS systems that rely on keyword matching, HireMind AI uses transformer-based BERT models to understand the contextual meaning of candidate profiles.
                            </motion.p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
                        <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 ${textPrimary}`}>Why HireMind AI</h2>
                        <p className={`text-base sm:text-lg ${textSecondary}`}>Traditional recruitment requires HR professionals to manually review hundreds of resumes. HireMind AI solves this by automating resume evaluation and providing intelligent candidate ranking.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {[
                            { icon: Zap, title: 'Reduce hiring time', desc: 'Automate hours of manual screening into seconds of processing.', color: 'text-amber-400', bg: 'bg-amber-400/10' },
                            { icon: Target, title: 'Improve candidate matching', desc: 'Find the actual best fit based on deep semantic meaning, not just buzzwords.', color: 'text-green-400', bg: 'bg-green-400/10' },
                            { icon: Filter, title: 'Eliminate manual filtering', desc: 'No more ctrl+F. AI reads and understands every line of every resume.', color: 'text-pink-400', bg: 'bg-pink-400/10' },
                            { icon: BarChart, title: 'Data-driven recruitment', desc: 'Make decisions backed by quantitative similarity scores and parsed metrics.', color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        ].map((feature, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                className={`border p-5 sm:p-8 rounded-2xl transition-colors ${cardBg}`}>
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-4 sm:mb-6`}>
                                    <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.color}`} />
                                </div>
                                <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${textPrimary}`}>{feature.title}</h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${textSecondary}`}>{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WORKFLOW */}
            <section id="workflow" className={`py-16 sm:py-24 px-4 sm:px-6 border-t transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className="max-w-7xl mx-auto">
                    <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-center ${textPrimary}`}>AI Resume Screening Workflow</h2>
                    <div className="relative py-6 sm:py-12">
                        <div className={`absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 hidden lg:block z-0 ${workflowLine}`}></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-4 relative z-10">
                            {[
                                { step: '1', label: 'Upload JD & Resumes', icon: FileText },
                                { step: '2', label: 'Extract Text', icon: Filter },
                                { step: '3', label: 'NLP Analysis', icon: BrainCircuit },
                                { step: '4', label: 'BERT Embeddings', icon: Database },
                                { step: '5', label: 'Similarity Engine', icon: Target },
                                { step: '6', label: 'Match Scoring', icon: Zap },
                                { step: '7', label: 'View Results', icon: CheckCircle },
                            ].map((item, index) => (
                                <motion.div key={index} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                                    className="flex flex-col items-center group">
                                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center mb-2 sm:mb-4 transition-colors shadow-md relative ${workflowStepBg}`}>
                                        <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs flex items-center justify-center font-bold border transition-colors ${workflowNumBg} group-hover:bg-indigo-400 group-hover:text-slate-900 group-hover:border-indigo-400`}>
                                            {item.step}
                                        </div>
                                        <item.icon className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className={`text-center font-medium text-xs sm:text-sm ${textMuted} w-full`}>{item.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* AI ENGINE */}
            <section id="engine" className={`py-16 sm:py-24 px-4 sm:px-6 border-t transition-colors ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                        <motion.h2 variants={fadeIn} className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 ${textPrimary}`}>AI Resume Intelligence Engine</motion.h2>
                        <div className={`space-y-4 sm:space-y-6 text-base sm:text-lg leading-relaxed ${textSecondary}`}>
                            <motion.p variants={fadeIn}>The core intelligence of HireMind AI is powered by Natural Language Processing and transformer-based language models.</motion.p>
                            <motion.p variants={fadeIn}>Resumes and job descriptions are converted into semantic embeddings using BERT models, allowing the system to understand contextual relationships between skills and job requirements.</motion.p>
                            <motion.p variants={fadeIn}>This enables more accurate candidate matching compared to traditional keyword-based screening systems.</motion.p>
                        </div>
                    </motion.div>

                    <div className={`p-6 sm:p-8 rounded-3xl border ${aiDiagramBg}`}>
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                            <div className="flex gap-3 sm:gap-4 w-full justify-center flex-wrap">
                                <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg border font-medium text-xs sm:text-sm ${aiDiagramNode} ${textPrimary}`}>Resume Input</div>
                                <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg border font-medium text-xs sm:text-sm ${aiDiagramNode} ${textPrimary}`}>Job Description</div>
                            </div>
                            <div className={`w-1 h-4 sm:h-6 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                            <div className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl border text-indigo-300 font-bold w-full text-center text-sm sm:text-base ${isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-indigo-50 border-indigo-300 text-indigo-600'}`}>Text Processing (NLP)</div>
                            <div className={`w-1 h-4 sm:h-6 ${isDark ? 'bg-indigo-500/40' : 'bg-indigo-300'}`}></div>
                            <div className={`px-8 sm:px-12 py-4 sm:py-5 rounded-xl border font-bold w-full text-center text-base sm:text-xl shadow-lg ${isDark ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-purple-500/20' : 'bg-purple-50 border-purple-300 text-purple-600'}`}>BERT Contextual Model</div>
                            <div className={`w-1 h-4 sm:h-6 ${isDark ? 'bg-purple-500/40' : 'bg-purple-300'}`}></div>
                            <div className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl border font-bold w-full text-center text-sm sm:text-base ${isDark ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-600'}`}>Embedding Generator (Vectors)</div>
                            <div className={`w-1 h-4 sm:h-6 ${isDark ? 'bg-indigo-500/40' : 'bg-indigo-300'}`}></div>
                            <div className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg border font-bold shadow-lg text-sm sm:text-base ${isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-600'}`}>Similarity Engine</div>
                            <div className={`w-1 h-4 sm:h-6 ${isDark ? 'bg-emerald-500/40' : 'bg-emerald-300'}`}></div>
                            <div className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg border font-bold shadow-xl text-sm sm:text-base ${isDark ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-600 text-white'}`}>Candidate Ranking Output</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ARCHITECTURE */}
            <section id="architecture" className={`py-16 sm:py-24 px-4 sm:px-6 border-t transition-colors ${sectionAlt}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10 sm:mb-16">
                        <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 ${textPrimary}`}>Platform Architecture</h2>
                        <p className={textSecondary}>A robust, scalable tech stack bridging React, Node, Python, and BERT.</p>
                    </div>
                    <div className="max-w-3xl mx-auto">
                        <div className="flex flex-col gap-4 sm:gap-6">
                            {[
                                { color: 'blue', title: 'Frontend Layer (React)', desc: 'Recruiter dashboard and resume upload interface.', textColor: isDark ? 'text-blue-300' : 'text-blue-700', icon: Database },
                                { color: 'emerald', title: 'Backend API Layer (Node/Express)', desc: 'Managing APIs, routing, authentication, and file handling.', textColor: isDark ? 'text-emerald-300' : 'text-emerald-700', icon: Database, indent: 'ml-4 sm:ml-12' },
                                { color: 'purple', title: 'AI Service Layer (Python/Flask)', desc: 'BERT-based NLP model for resume parsing, embedding, and semantic matching.', textColor: isDark ? 'text-purple-300' : 'text-purple-700', icon: BrainCircuit, indent: 'ml-8 sm:ml-24' },
                                { color: 'amber', title: 'Database Layer (MongoDB)', desc: 'Storing resumes, parsed text, job descriptions, and user accounts.', textColor: isDark ? 'text-amber-300' : 'text-amber-700', icon: Database, indent: 'ml-4 sm:ml-36' },
                            ].map(({ color, title, desc, textColor, icon: Icon, indent = '' }, i) => (
                                <motion.div key={i} initial={{ x: i % 2 === 0 ? -50 : 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                    className={`bg-gradient-to-r border p-4 sm:p-6 rounded-2xl flex items-center justify-between backdrop-blur shadow-xl ${indent} ${archLayerBg[color]}`}>
                                    <div>
                                        <h3 className={`text-base sm:text-xl font-bold mb-1 ${textColor}`}>{title}</h3>
                                        <p className={`text-xs sm:text-sm ${textSecondary}`}>{desc}</p>
                                    </div>
                                    <div className={`${textColor} opacity-40 shrink-0 ml-3`}><Icon className="w-8 h-8 sm:w-12 sm:h-12" /></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* PORTALS */}
            <section id="portals" className={`py-16 sm:py-24 px-4 sm:px-6 border-t transition-colors ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                <div className="max-w-7xl mx-auto">
                    <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-center ${textPrimary}`}>Platform Portals</h2>
                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Recruiter Portal */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className={`border rounded-3xl p-6 sm:p-8 transition-colors group overflow-hidden relative ${portalCard}`}>
                            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-16 sm:-mr-32 -mt-16 sm:-mt-32 transition-transform group-hover:scale-150"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                    <div className="p-3 sm:p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                        <Target className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
                                    </div>
                                    <h3 className={`text-xl sm:text-3xl font-bold ${textPrimary}`}>Recruiter Portal</h3>
                                </div>
                                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                                    {['Upload job descriptions (JDs)', 'Upload batch resumes (PDF)', 'View AI candidate rankings', 'Analyze extracted candidate skills', 'Export detailed screening reports', 'Manage active job postings'].map((f, i) => (
                                        <li key={i} className={`flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${portalListText}`}>
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" /><span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => openAuthModal('recruiter')} className={`w-full py-2.5 sm:py-3 rounded-xl border transition-all font-medium text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white text-slate-600'}`}>
                                    Create Company Account
                                </button>
                            </div>
                        </motion.div>

                        {/* Candidate Portal */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                            className={`border rounded-3xl p-6 sm:p-8 transition-colors group overflow-hidden relative ${portalCardCandidate}`}>
                            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500/10 rounded-full blur-[80px] -mr-16 sm:-mr-32 -mt-16 sm:-mt-32 transition-transform group-hover:scale-150"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                    <div className="p-3 sm:p-4 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                                    </div>
                                    <h3 className={`text-xl sm:text-3xl font-bold ${textPrimary}`}>Candidate Portal</h3>
                                </div>
                                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                                    {['Upload base profile resume', 'View job match score instantly', 'Track current application status', 'Receive AI skill recommendations', 'Explore relevant job opportunities', 'Understand required missing skills'].map((f, i) => (
                                        <li key={i} className={`flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${portalListText}`}>
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" /><span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => openAuthModal('candidate')} className={`w-full py-2.5 sm:py-3 rounded-xl border transition-all font-medium text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-purple-500 hover:border-purple-500 hover:text-white text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-purple-500 hover:border-purple-500 hover:text-white text-slate-600'}`}>
                                    Create Candidate Profile
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
                <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-tr from-indigo-900/50 via-slate-900 to-purple-900/50' : 'bg-gradient-to-tr from-indigo-100 via-white to-purple-100'}`}></div>
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <h2 className={`text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight ${textPrimary}`}>Transform Recruitment with AI</h2>
                    <p className={`text-base sm:text-xl mb-6 sm:mb-10 max-w-2xl mx-auto ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>
                        Use HireMind AI to automate resume screening and identify the best candidates instantly.
                    </p>
                    <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center">
                        <button onClick={() => openAuthModal('recruiter')} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/25 text-sm sm:text-base">
                            Access Recruiter Portal
                        </button>
                        <button onClick={() => openAuthModal('candidate')} className={`border font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm'}`}>
                            Access Candidate Portal
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className={`pt-12 sm:pt-16 pb-6 sm:pb-8 px-4 sm:px-6 border-t ${footerBg} text-white`}>
                <div className="max-w-7xl mx-auto grid sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                            <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                            <span className="text-base sm:text-lg font-bold">HireMind AI</span>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-4 sm:mb-6">AI-Powered Resume Screening Platform utilizing Natural Language Processing for superior recruitment intelligence.</p>
                        <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Major Engineering Project</div>
                    </div>
                    <div className="sm:text-right">
                        <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm mt-0 sm:mt-2">Academic Affiliation</h4>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Bachelor of Engineering – Computer Engineering</p>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Watumull Institute of Engineering</p>
                        <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">University of Mumbai</p>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-6 sm:pt-8 border-t border-slate-800 text-center text-xs sm:text-sm text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                    <p>© 2026 HireMind AI Project. Concept and Implementation.</p>
                    <div className="flex gap-3 sm:gap-4">
                        <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">Algorithm Details</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialView={authInitialView} />
        </div>
    );
};

export default Home;