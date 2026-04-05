import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, User, ArrowRight, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

const AuthModal = ({ isOpen, onClose, initialView = 'role' }) => {
    const [view, setView] = useState(initialView);
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', companyName: '' });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loginMode, setLoginMode] = useState('password');

    const navigate = useNavigate();

    React.useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setSelectedRole(initialView === 'role' ? null : 'candidate');
            setFormData({ name: '', email: '', password: '', companyName: '' });
            setOtp('');
            setError('');
            setSuccess('');
            setLoginMode('password');
        }
    }, [isOpen, initialView]);

    if (!isOpen) return null;

    const handleRoleSelect = (role, nextView) => {
        setSelectedRole(role);
        setView(nextView);
        setError('');
    };

    // ── Password Login ──────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            onClose();
            navigate(res.data.user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            setIsLoading(false);
        }
    };

    // ── Send OTP for Login ──────────────────────────────────────────────────────
    const handleSendLoginOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${API}/api/auth/send-login-otp`, { email: formData.email });
            setSuccess('OTP sent! Check your inbox.');
            setView('otp-login');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Verify OTP for Login ────────────────────────────────────────────────────
    const handleVerifyLoginOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/api/auth/verify-login-otp`, { email: formData.email, otp });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            onClose();
            navigate(res.data.user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired OTP.');
            setIsLoading(false);
        }
    };

    // ── Send OTP for Registration ───────────────────────────────────────────────
    const handleSendRegisterOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${API}/api/auth/send-otp`, {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: selectedRole,
                companyName: formData.companyName
            });
            setSuccess('OTP sent! Check your inbox.');
            setView('otp-register');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Verify OTP for Registration ─────────────────────────────────────────────
    const handleVerifyRegisterOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${API}/api/auth/verify-register`, {
                email: formData.email,
                otp,
                name: formData.name,
                password: formData.password,
                role: selectedRole,
                companyName: formData.companyName
            });
            // Auto-login after successful registration
            const loginRes = await axios.post(`${API}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });
            localStorage.setItem('token', loginRes.data.token);
            localStorage.setItem('user', JSON.stringify(loginRes.data.user));
            onClose();
            navigate(loginRes.data.user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired OTP.');
            setIsLoading(false);
        }
    };

    // ── Google OAuth ────────────────────────────────────────────────────────────
    const handleGoogleLogin = () => {
        const role = selectedRole || 'candidate';
        window.location.href = `${API}/api/auth/google?role=${role}`;
    };

    const inputCls = "w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-slate-500";
    const labelCls = "block text-slate-300 text-sm font-semibold mb-1.5 ml-1";

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8">
                        <AnimatePresence mode="wait">

                            {/* ── ROLE SELECT ─────────────────────────────────── */}
                            {view === 'role' && (
                                <motion.div key="role" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-white">Welcome to HireMind</h2>
                                        <p className="text-slate-400 mt-2">Select your role to continue</p>
                                    </div>
                                    <div className="grid gap-4">
                                        <button onClick={() => handleRoleSelect('company', 'login')} className="flex items-center gap-5 p-5 w-full rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800 hover:border-indigo-500/50 transition-all group text-left">
                                            <div className="w-14 h-14 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                                                <Briefcase className="w-7 h-7 text-indigo-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">Recruiter Portal</h3>
                                                <p className="text-sm text-slate-400 leading-snug">Manage job postings, upload resumes, and analyze candidate rankings.</p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 ml-auto shrink-0 transition-colors" />
                                        </button>
                                        <button onClick={() => handleRoleSelect('candidate', 'login')} className="flex items-center gap-5 p-5 w-full rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800 hover:border-purple-500/50 transition-all group text-left">
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

                            {/* ── LOGIN ───────────────────────────────────────── */}
                            {view === 'login' && (
                                <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="flex items-center justify-between mb-6">
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

                                    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 px-4 rounded-xl transition-all mb-4">
                                        <GoogleIcon />
                                        Continue with Google
                                    </button>

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-1 h-px bg-slate-700" />
                                        <span className="text-slate-500 text-xs">or</span>
                                        <div className="flex-1 h-px bg-slate-700" />
                                    </div>

                                    <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
                                        <button onClick={() => setLoginMode('password')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${loginMode === 'password' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            Password
                                        </button>
                                        <button onClick={() => setLoginMode('otp')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${loginMode === 'otp' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            Email OTP
                                        </button>
                                    </div>

                                    {error && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">{error}</div>}

                                    {loginMode === 'password' ? (
                                        <form onSubmit={handleLogin} className="space-y-4">
                                            <div>
                                                <label className={labelCls}>Email Address</label>
                                                <input type="email" className={inputCls} placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Password</label>
                                                <input type="password" className={inputCls} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                            </div>
                                            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center mt-4 transition-all disabled:opacity-70">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                                            </button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleSendLoginOtp} className="space-y-4">
                                            <div>
                                                <label className={labelCls}>Email Address</label>
                                                <input type="email" className={inputCls} placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                            </div>
                                            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-70">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Send OTP</>}
                                            </button>
                                        </form>
                                    )}

                                    <p className="mt-6 text-center text-sm text-slate-400">
                                        Don't have an account?{' '}
                                        <button onClick={() => { setView('register'); setError(''); if (!selectedRole) setSelectedRole('candidate'); }} className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Sign Up
                                        </button>
                                    </p>
                                </motion.div>
                            )}

                            {/* ── OTP VERIFY — LOGIN ──────────────────────────── */}
                            {view === 'otp-login' && (
                                <motion.div key="otp-login" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <ShieldCheck className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">Enter OTP</h2>
                                        <p className="text-slate-400 text-sm mt-2">We sent a 6-digit code to<br /><span className="text-indigo-400 font-medium">{formData.email}</span></p>
                                    </div>

                                    {success && <div className="mb-4 bg-green-500/10 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl text-sm text-center">{success}</div>}
                                    {error && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">{error}</div>}

                                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-500 text-center text-3xl font-mono tracking-[0.5em]"
                                            placeholder="······"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            required
                                        />
                                        <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                                        </button>
                                    </form>

                                    <div className="mt-4 text-center">
                                        <button onClick={() => { setView('login'); setOtp(''); setError(''); setSuccess(''); }} className="text-sm text-slate-400 hover:text-white transition-colors">
                                            ← Back to Login
                                        </button>
                                        <span className="text-slate-600 mx-2">·</span>
                                        <button onClick={handleSendLoginOtp} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Resend OTP
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── REGISTER ────────────────────────────────────── */}
                            {view === 'register' && (
                                <motion.div key="register" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Create Account</h2>
                                            <p className="text-slate-400 text-sm mt-1">{selectedRole === 'company' ? 'Recruiter' : 'Candidate'} Profile</p>
                                        </div>
                                        <button onClick={() => setView('role')} className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
                                            Change Role
                                        </button>
                                    </div>

                                    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 px-4 rounded-xl transition-all mb-4">
                                        <GoogleIcon />
                                        Sign up with Google
                                    </button>

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-1 h-px bg-slate-700" />
                                        <span className="text-slate-500 text-xs">or fill in details</span>
                                        <div className="flex-1 h-px bg-slate-700" />
                                    </div>

                                    {error && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">{error}</div>}

                                    <form onSubmit={handleSendRegisterOtp} className="space-y-4">
                                        <div>
                                            <label className={labelCls}>Full Name</label>
                                            <input type="text" className={inputCls} placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>
                                        {selectedRole === 'company' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <label className={labelCls}>Company Name</label>
                                                <input type="text" className={inputCls} placeholder="Acme Corp" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
                                            </motion.div>
                                        )}
                                        <div>
                                            <label className={labelCls}>Email Address</label>
                                            <input type="email" className={inputCls} placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Password</label>
                                            <input type="password" className={inputCls} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                                        </div>
                                        <button type="submit" disabled={isLoading} className="w-full bg-slate-100 flex items-center justify-center gap-2 text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-white mt-4 transition-all disabled:opacity-70">
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Verify with OTP</>}
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

                            {/* ── OTP VERIFY — REGISTER ───────────────────────── */}
                            {view === 'otp-register' && (
                                <motion.div key="otp-register" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <ShieldCheck className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">Verify Email</h2>
                                        <p className="text-slate-400 text-sm mt-2">Enter the 6-digit code sent to<br /><span className="text-indigo-400 font-medium">{formData.email}</span></p>
                                    </div>

                                    {success && <div className="mb-4 bg-green-500/10 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl text-sm text-center">{success}</div>}
                                    {error && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">{error}</div>}

                                    <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-center text-3xl font-mono tracking-[0.5em]"
                                            placeholder="······"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            required
                                        />
                                        <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Create Account'}
                                        </button>
                                    </form>

                                    <div className="mt-4 text-center">
                                        <button onClick={() => { setView('register'); setOtp(''); setError(''); setSuccess(''); }} className="text-sm text-slate-400 hover:text-white transition-colors">
                                            ← Back
                                        </button>
                                        <span className="text-slate-600 mx-2">·</span>
                                        <button onClick={handleSendRegisterOtp} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Resend OTP
                                        </button>
                                    </div>
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