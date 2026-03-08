import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, User, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthModal = ({ isOpen, onClose, initialView = 'role' }) => {
    // view can be: 'role', 'login', 'register'
    const [view, setView] = useState(initialView);
    // role can be: 'company', 'candidate'
    const [selectedRole, setSelectedRole] = useState(null);

    // Form States
    const [formData, setFormData] = useState({ name: '', email: '', password: '', companyName: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setSelectedRole(null);
            setFormData({ name: '', email: '', password: '', companyName: '' });
            setError('');
        }
    }, [isOpen, initialView]);

    if (!isOpen) return null;

    const handleRoleSelect = (role, nextView) => {
        setSelectedRole(role);
        setView(nextView);
        setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });
            localStorage.setItem('user', JSON.stringify(res.data));
            onClose(); // Close modal immediately
            if (res.data.role === 'company') {
                navigate('/company-dashboard');
            } else {
                navigate('/candidate-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const registerData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: selectedRole,
                companyName: selectedRole === 'company' ? formData.companyName : ''
            };
            await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/register`, registerData);

            // Auto login after registration
            const loginRes = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });

            localStorage.setItem('user', JSON.stringify(loginRes.data));
            onClose();
            if (loginRes.data.role === 'company') {
                navigate('/company-dashboard');
            } else {
                navigate('/candidate-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
            setIsLoading(false);
        }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const slideVariants = {
        initial: { x: 50, opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.3 } },
        exit: { x: -50, opacity: 0, transition: { duration: 0.2 } }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
            >
                <motion.div
                    className="relative w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Ambient Modal Glow */}
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none"></div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 relative z-10">
                        <AnimatePresence mode="wait">

                            {/* ---------- STEP 1: ROLE SELECTION ---------- */}
                            {view === 'role' && (
                                <motion.div key="role" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="text-center mb-8">
                                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">
                                            Welcome to HireMind AI
                                        </h2>
                                        <p className="text-slate-400 mt-2">Select your role to continue</p>
                                    </div>

                                    <div className="grid gap-4">
                                        <button
                                            onClick={() => handleRoleSelect('company', 'login')}
                                            className="flex items-center gap-5 p-5 w-full rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800 hover:border-indigo-500/50 transition-all group text-left"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                                                <Briefcase className="w-7 h-7 text-indigo-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">Recruiter Portal</h3>
                                                <p className="text-sm text-slate-400 leading-snug">Manage job postings, upload resumes, and analyze candidate rankings.</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 ml-auto shrink-0 transition-colors" />
                                        </button>

                                        <button
                                            onClick={() => handleRoleSelect('candidate', 'login')}
                                            className="flex items-center gap-5 p-5 w-full rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800 hover:border-purple-500/50 transition-all group text-left"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:bg-purple-500 transition-colors">
                                                <User className="w-7 h-7 text-purple-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">Candidate Portal</h3>
                                                <p className="text-sm text-slate-400 leading-snug">Upload your resume, view match scores, and explore job opportunities.</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 ml-auto shrink-0 transition-colors" />
                                        </button>
                                    </div>

                                    <p className="text-center text-xs text-slate-500 mt-8">By continuing, you agree to our Terms of Service.</p>
                                </motion.div>
                            )}

                            {/* ---------- STEP 2: LOGIN FORM ---------- */}
                            {view === 'login' && (
                                <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">
                                                {selectedRole === 'company' ? 'Recruiter Login' : 'Candidate Login'}
                                            </h2>
                                            <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
                                        </div>
                                        <button onClick={() => setView('role')} className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
                                            Change Role
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center animate-fade-in">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div>
                                            <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                placeholder="name@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Password</label>
                                            <input
                                                type="password"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-indigo-500 flex items-center justify-center to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-400 hover:to-purple-500 focus:ring-2 mt-4 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                                        </button>
                                    </form>

                                    <p className="mt-6 text-center text-sm text-slate-400">
                                        Don't have an account?{' '}
                                        <button onClick={() => { setView('register'); setError(''); }} className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Sign Up
                                        </button>
                                    </p>
                                </motion.div>
                            )}

                            {/* ---------- STEP 3: SIGNUP FORM ---------- */}
                            {view === 'register' && (
                                <motion.div key="register" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">
                                                Create Account
                                            </h2>
                                            <p className="text-slate-400 text-sm mt-1">
                                                {selectedRole === 'company' ? 'Recruiter' : 'Candidate'} Profile
                                            </p>
                                        </div>
                                        <button onClick={() => setView('role')} className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
                                            Change Role
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center animate-fade-in">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div>
                                            <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                placeholder="John Doe"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        {selectedRole === 'company' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Company Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                    placeholder="Acme Corp"
                                                    value={formData.companyName}
                                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                    required
                                                />
                                            </motion.div>
                                        )}

                                        <div>
                                            <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                placeholder="name@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-300 text-sm font-semibold mb-1.5 ml-1">Password</label>
                                            <input
                                                type="password"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                minLength="6"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-slate-100 flex items-center justify-center text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-white focus:ring-2 mt-4 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                                        </button>
                                    </form>

                                    <p className="mt-6 text-center text-sm text-slate-400">
                                        Already have an account?{' '}
                                        <button onClick={() => { setView('login'); setError(''); }} className="font-semibold text-white hover:text-indigo-400 transition-colors">
                                            Log In
                                        </button>
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthModal;
