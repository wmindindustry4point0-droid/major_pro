import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BrainCircuit } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`,
                formData
            );
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = res.data.user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard';
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100'}`}>
            <div className={`absolute top-0 left-0 w-64 sm:w-96 h-64 sm:h-96 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`}></div>
            <div className={`absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse ${isDark ? 'bg-indigo-500' : 'bg-indigo-300'}`} style={{ animationDelay: '2s' }}></div>

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-sm sm:max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-6">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">HireMind AI</span>
                    </Link>
                </div>

                <div className={`backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl border ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
                    <div className="text-center mb-8">
                        <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200' : 'text-slate-800'}`}>
                            Welcome Back
                        </h2>
                        <p className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div className="mb-5 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ml-1 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>Email Address</label>
                            <input
                                type="email"
                                className={`w-full p-3 sm:p-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm sm:text-base ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ml-1 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>Password</label>
                            <input
                                type="password"
                                className={`w-full p-3 sm:p-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm sm:text-base ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-70 text-sm sm:text-base mt-2">
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className={`mt-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors ml-1">Sign up here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;