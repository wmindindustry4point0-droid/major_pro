import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BrainCircuit, Zap, Target, Filter, Database,
    FileText, CheckCircle, ChevronRight, BarChart
} from 'lucide-react';
import AuthModal from '../components/AuthModal';

const Home = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInitialView, setAuthInitialView] = useState('role');

    const openAuthModal = (view = 'role') => {
        setAuthInitialView(view);
        setIsAuthModalOpen(true);
    };
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };
    const stagger = {
        visible: { transition: { staggerChildren: 0.1 } }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">

            {/* SECTION 1 — NAVIGATION BAR */}
            <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            HireMind AI
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
                        <a href="#home" className="hover:text-white transition-colors">Home</a>
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#engine" className="hover:text-white transition-colors">AI Engine</a>
                        <a href="#workflow" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
                        <a href="#portals" className="hover:text-white transition-colors">Portals</a>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => openAuthModal('login')} className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition-colors">
                            Login
                        </button>
                        <button onClick={() => openAuthModal('register')} className="text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-indigo-500/20">
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* SECTION 2 — HERO SECTION */}
            <section id="home" className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div initial="hidden" animate="visible" variants={stagger} className="z-10 text-center lg:text-left">
                        <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            v1.0 is live
                        </motion.div>
                        <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                            Intelligent Resume Screening & <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500">Talent Intelligence</span>
                        </motion.h1>
                        <motion.p variants={fadeIn} className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0">
                            HireMind AI transforms recruitment by using Artificial Intelligence and Natural Language Processing to analyze resumes and match candidates with job descriptions. The platform leverages BERT-based semantic analysis to understand skills, experience, and context to identify the most suitable candidates automatically.
                        </motion.p>
                        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button onClick={() => openAuthModal('role')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                                Start Screening <ChevronRight className="w-5 h-5" />
                            </button>
                            <a href="#engine" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center transition-all">
                                Explore Platform
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* Hero Illustration */}
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative z-10 hidden lg:block">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-4">
                                <div className="text-sm font-medium text-slate-300">Candidate Ranking Dashboard</div>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[98, 92, 85].map((score, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">Candidate Resume {i + 1}</div>
                                                <div className="text-xs text-slate-400">Analyzed by BERT NLP</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-indigo-400 font-bold text-lg">{score}% Match</div>
                                            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
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

            {/* SECTION 3 — ABOUT THE PLATFORM */}
            <section className="py-24 px-6 bg-slate-800/20 border-y border-slate-800/50 relative">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    {/* About Illustration */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}>
                        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                            <div className="absolute inset-0 bg-grid-slate-800/[0.04] bg-[length:32px_32px] rounded-3xl"></div>
                            <div className="relative z-10 flex flex-col gap-6">
                                <div className="flex items-start gap-4 p-5 bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 shadow-xl">
                                    <BrainCircuit className="w-10 h-10 text-purple-400 shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-white mb-2">Semantic Understanding</h4>
                                        <p className="text-sm text-slate-400 leading-relaxed">System understands that "React JS", "React.js", and "Frontend built with React" represent the same core competency, moving beyond exact keyword matches.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-5 bg-indigo-600/20 backdrop-blur rounded-2xl border border-indigo-500/30 shadow-xl ml-8">
                                    <Target className="w-10 h-10 text-indigo-400 shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-white mb-2">Contextual Relevance</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed">Analyzes the years of experience and context in which skills were applied to determine true proficiency for the matched job description.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
                        <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-bold mb-6">About HireMind AI</motion.h2>
                        <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
                            <motion.p variants={fadeIn}>
                                HireMind AI is an intelligent recruitment platform designed to automate the resume screening process using Artificial Intelligence and Natural Language Processing.
                            </motion.p>
                            <motion.p variants={fadeIn}>
                                Recruiters can upload resumes and job descriptions, and the system automatically extracts candidate skills, analyzes experience, and ranks applicants based on semantic similarity.
                            </motion.p>
                            <motion.p variants={fadeIn} className="p-4 border-l-4 border-purple-500 bg-purple-500/5 rounded-r-lg font-medium text-slate-200">
                                Unlike traditional Applicant Tracking Systems that rely on keyword matching, HireMind AI uses transformer-based models such as BERT to understand the contextual meaning of candidate profiles and job requirements.
                            </motion.p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 4 — WHY HIREMIND AI */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Why HireMind AI</h2>
                        <p className="text-slate-400 text-lg">
                            Traditional recruitment requires HR professionals to manually review hundreds of resumes which is time-consuming and inefficient. HireMind AI solves this problem by automating resume evaluation and providing intelligent candidate ranking.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Zap, title: "Reduce hiring time", desc: "Automate hours of manual screening into seconds of processing.", color: "text-amber-400", bg: "bg-amber-400/10" },
                            { icon: Target, title: "Improve candidate matching", desc: "Find the actual best fit based on deep semantic meaning, not just buzzwords.", color: "text-green-400", bg: "bg-green-400/10" },
                            { icon: Filter, title: "Eliminate manual filtering", desc: "No more ctrl+F. AI reads and understands every line of every resume.", color: "text-pink-400", bg: "bg-pink-400/10" },
                            { icon: BarChart, title: "Data-driven recruitment", desc: "Make decisions backed by quantitative similarity scores and parsed metrics.", color: "text-blue-400", bg: "bg-blue-400/10" }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-slate-800/40 border border-slate-700 p-8 rounded-2xl hover:bg-slate-800 transition-colors"
                            >
                                <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5 — HOW THE SYSTEM WORKS */}
            <section id="workflow" className="py-24 px-6 bg-slate-900/50 border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">AI Resume Screening Workflow</h2>

                    {/* CSS Flowchart Diagram */}
                    <div className="relative py-12">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 hidden lg:block z-0"></div>

                        <div className="grid lg:grid-cols-7 gap-4 relative z-10">
                            {[
                                { step: "1", label: "Upload JD & Resumes", icon: FileText },
                                { step: "2", label: "Extract Text", icon: Filter },
                                { step: "3", label: "NLP Analysis", icon: BrainCircuit },
                                { step: "4", label: "BERT Embeddings", icon: Database },
                                { step: "5", label: "Similarity Engine", icon: Target },
                                { step: "6", label: "Match Scoring", icon: Zap },
                                { step: "7", label: "View Results", icon: CheckCircle },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex flex-col items-center group"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-indigo-500/30 flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors shadow-lg relative">
                                        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-slate-700 text-xs flex items-center justify-center font-bold text-slate-300 border border-slate-600 group-hover:bg-indigo-400 group-hover:text-slate-900 group-hover:border-indigo-400 transition-colors">
                                            {item.step}
                                        </div>
                                        <item.icon className="w-7 h-7 text-indigo-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="text-center font-medium text-sm text-slate-300 w-full">
                                        {item.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6 — AI ENGINE */}
            <section id="engine" className="py-24 px-6 border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                        <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-bold mb-6">AI Resume Intelligence Engine</motion.h2>
                        <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                            <motion.p variants={fadeIn}>
                                The core intelligence of HireMind AI is powered by Natural Language Processing and transformer-based language models.
                            </motion.p>
                            <motion.p variants={fadeIn}>
                                Resumes and job descriptions are converted into semantic embeddings using BERT models. These embeddings allow the system to understand contextual relationships between skills and job requirements.
                            </motion.p>
                            <motion.p variants={fadeIn}>
                                This enables more accurate candidate matching compared to traditional keyword-based screening systems.
                            </motion.p>
                        </div>
                    </motion.div>

                    {/* AI Engine CSS Diagram */}
                    <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex gap-4 w-full justify-center">
                                <div className="bg-slate-700/50 px-6 py-3 rounded-lg border border-slate-600 font-medium text-sm">Resume Input</div>
                                <div className="bg-slate-700/50 px-6 py-3 rounded-lg border border-slate-600 font-medium text-sm">Job Description</div>
                            </div>
                            <div className="w-1 h-6 bg-slate-600"></div>
                            <div className="bg-indigo-500/20 px-12 py-4 rounded-xl border border-indigo-500/40 text-indigo-300 font-bold w-full text-center">
                                Text Processing (NLP)
                            </div>
                            <div className="w-1 h-6 bg-indigo-500/40"></div>
                            <div className="bg-purple-500/20 px-12 py-5 rounded-xl border border-purple-500/40 text-purple-300 font-bold w-full text-center text-xl shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                BERT Contextual Model
                            </div>
                            <div className="w-1 h-6 bg-purple-500/40"></div>
                            <div className="bg-indigo-500/20 px-12 py-4 rounded-xl border border-indigo-500/40 text-indigo-300 font-bold w-full text-center">
                                Embedding Generator (Vectors)
                            </div>
                            <div className="w-1 h-6 bg-indigo-500/40"></div>
                            <div className="bg-emerald-500/20 px-8 py-3 rounded-lg border border-emerald-500/40 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10">
                                Similarity Engine
                            </div>
                            <div className="w-1 h-6 bg-emerald-500/40"></div>
                            <div className="bg-slate-700 px-8 py-3 rounded-lg border border-slate-500 font-bold text-white shadow-xl">
                                Candidate Ranking Output
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 7 — SYSTEM ARCHITECTURE */}
            <section id="architecture" className="py-24 px-6 bg-slate-800/20 border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Platform Architecture</h2>
                        <p className="text-slate-400">A robust, scalable tech stack bridging React, Node, Python, and BERT.</p>
                    </div>

                    {/* Architecture Layered Diagram */}
                    <div className="max-w-3xl mx-auto relative perspective-1000">
                        <div className="flex flex-col gap-6">
                            {/* Frontend */}
                            <motion.div initial={{ x: -50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 p-6 rounded-2xl flex items-center justify-between backdrop-blur shadow-xl">
                                <div>
                                    <h3 className="text-xl font-bold text-blue-300 mb-1">Frontend Layer (React)</h3>
                                    <p className="text-slate-400 text-sm">Recruiter dashboard and resume upload interface.</p>
                                </div>
                                <div className="text-blue-500 opacity-50"><Database className="w-12 h-12" /></div>
                            </motion.div>

                            {/* Backend */}
                            <motion.div initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 p-6 rounded-2xl flex items-center justify-between backdrop-blur shadow-xl ml-4 lg:ml-12">
                                <div>
                                    <h3 className="text-xl font-bold text-emerald-300 mb-1">Backend API Layer (Node/Express)</h3>
                                    <p className="text-slate-400 text-sm">Managing APIs, routing, authentication, and file handling.</p>
                                </div>
                                <div className="text-emerald-500 opacity-50"><Database className="w-12 h-12" /></div>
                            </motion.div>

                            {/* AI Engine */}
                            <motion.div initial={{ x: -50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/30 p-6 rounded-2xl flex items-center justify-between backdrop-blur shadow-xl ml-8 lg:ml-24">
                                <div>
                                    <h3 className="text-xl font-bold text-purple-300 mb-1">AI Service Layer (Python/Flask)</h3>
                                    <p className="text-slate-400 text-sm">BERT-based NLP model for resume parsing, embedding, and semantic matching.</p>
                                </div>
                                <div className="text-purple-500 opacity-50"><BrainCircuit className="w-12 h-12" /></div>
                            </motion.div>

                            {/* Database */}
                            <motion.div initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-6 rounded-2xl flex items-center justify-between backdrop-blur shadow-xl ml-12 lg:ml-36">
                                <div>
                                    <h3 className="text-xl font-bold text-amber-300 mb-1">Database Layer (MongoDB)</h3>
                                    <p className="text-slate-400 text-sm">Storing resumes, parsed text, job descriptions, and user accounts.</p>
                                </div>
                                <div className="text-amber-500 opacity-50"><Database className="w-12 h-12" /></div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 8 — PLATFORM PORTALS */}
            <section id="portals" className="py-24 px-6 border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">Platform Portals</h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Recruiter Portal Card */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-b from-slate-800/50 to-slate-900 border border-slate-700 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform group-hover:scale-150"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                        <Target className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-white">Recruiter Portal</h3>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        "Upload job descriptions (JDs)",
                                        "Upload batch resumes (PDF)",
                                        "View AI candidate rankings",
                                        "Analyze extracted candidate skills",
                                        "Export detailed screening reports",
                                        "Manage active job postings"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300">
                                            <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => openAuthModal('recruiter')} className="inline-block w-full text-center py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white transition-all font-medium text-slate-300">
                                    Create Company Account
                                </button>
                            </div>
                        </motion.div>

                        {/* Candidate Portal Card */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-gradient-to-b from-slate-800/50 to-slate-900 border border-slate-700 rounded-3xl p-8 hover:border-purple-500/50 transition-colors group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform group-hover:scale-150"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                                        <FileText className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-white">Candidate Portal</h3>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        "Upload base profile resume",
                                        "View job match score instantly",
                                        "Track current application status",
                                        "Receive AI skill recommendations",
                                        "Explore relevant job opportunities",
                                        "Understand required missing skills"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300">
                                            <CheckCircle className="w-5 h-5 text-purple-400 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => openAuthModal('candidate')} className="inline-block w-full text-center py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-purple-500 hover:border-purple-500 hover:text-white transition-all font-medium text-slate-300">
                                    Create Candidate Profile
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* SECTION 9 — CALL TO ACTION */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 via-slate-900 to-purple-900/50"></div>
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight">
                        Transform Recruitment with AI
                    </h2>
                    <p className="text-xl text-indigo-200 mb-10 max-w-2xl mx-auto">
                        Use HireMind AI to automate resume screening and identify the best candidates instantly. Stop matching keywords, start matching context.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => openAuthModal('recruiter')} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/25">
                            Access Recruiter Portal
                        </button>
                        <button onClick={() => openAuthModal('candidate')} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-xl transition-all">
                            Access Candidate Portal
                        </button>
                    </div>
                </div>
            </section>

            {/* SECTION 10 — FOOTER */}
            <footer className="bg-slate-950 pt-16 pb-8 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit className="w-6 h-6 text-indigo-400" />
                            <span className="text-lg font-bold">HireMind AI</span>
                        </div>
                        <p className="text-slate-400 text-sm max-w-sm mb-6">
                            AI-Powered Resume Screening Platform utilizing Natural Language Processing for superior recruitment intelligence.
                        </p>
                        <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                            Major Engineering Project
                        </div>
                    </div>
                    <div className="md:text-right">
                        <h4 className="text-white font-semibold mb-4 text-sm mt-2">Academic Affiliation</h4>
                        <p className="text-slate-400 text-sm mb-1">Bachelor of Engineering – Computer Engineering</p>
                        <p className="text-slate-400 text-sm mb-1">Watumull Institute of Engineering</p>
                        <p className="text-slate-400 text-sm mb-4">University of Mumbai</p>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 text-center text-sm text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p>© 2026 HireMind AI Project. Concept and Implementation.</p>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">Algorithm Details</a>
                        <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>

            {/* AUTH MODAL */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialView={authInitialView}
            />
        </div>
    );
};

export default Home;