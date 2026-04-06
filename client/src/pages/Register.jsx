import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { BrainCircuit } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'candidate', companyName: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls = `w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`;
    const labelCls = `block text-sm font-semibold mb-1.5 ml-1 ${isDark ? 'text-gray-200' : 'text-slate-700'}`;

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900' : 'bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50'}`}>
            <div className={`absolute top-0 right-0 w-64 sm:w-[500px] h-64 sm:h-[500px] rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-pulse ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-300/30'}`}></div>
            <div className={`absolute bottom-0 left-0 w-64 sm:w-[500px] h-64 sm:h-[500px] rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-pulse ${isDark ? 'bg-purple-500/20' : 'bg-purple-300/30'}`} style={{ animationDelay: '2s' }}></div>

            <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

            <div className="w-full max-w-sm sm:max-w-md relative z-10 my-8">
                <div className="text-center mb-6">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">HireMind AI</span>
                    </Link>
                </div>

                <div className={`backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl border ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/80 border-slate-200'}`}>
                    <div className="text-center mb-6">
                        <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200' : 'text-slate-800'}`}>
                            Create Account
                        </h2>
                        <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Join us to streamline your hiring process</p>
                    </div>

                    {error && (
                        <div className="mb-5 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center animate-fade-in">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className={labelCls}>Full Name</label><input type="text" className={inputCls} placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label className={labelCls}>Email Address</label><input type="email" className={inputCls} placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                        <div><label className={labelCls}>Password</label><input type="password" className={inputCls} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>

                        <div>
                            <label className={labelCls}>Account Type</label>
                            <div className="relative">
                                <select className={`${inputCls} appearance-none cursor-pointer ${isDark ? '[&>option]:bg-slate-800 [&>option]:text-white' : '[&>option]:bg-white [&>option]:text-slate-900'}`}
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value, companyName: e.target.value === 'candidate' ? '' : formData.companyName })}>
                                    <option value="candidate">Candidate</option>
                                    <option value="company">Company / Recruiter</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        {formData.role === 'company' && (
                            <div className="animate-fade-in">
                                <label className={labelCls}>Company Name</label>
                                <input type="text" className={inputCls} placeholder="Acme Corp" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
                            </div>
                        )}

                        <div className="pt-1">
                            <button type="submit" disabled={isLoading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 text-sm sm:text-base">
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>

                    <p className={`mt-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-1">Log in instead</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;