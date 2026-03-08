import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'candidate', companyName: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Glassmorphic Card */}
            <div className="w-full max-w-md relative z-10 m-auto py-8">
                <div className="backdrop-blur-xl bg-white/10 p-8 sm:p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20">

                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200 tracking-tight">
                            Create Account
                        </h2>
                        <p className="text-gray-300 mt-2 text-sm font-medium">
                            Join us to streamline your hiring process
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center animate-fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        <div>
                            <label className="block text-gray-200 text-sm font-semibold mb-1.5 ml-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-gray-400"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-200 text-sm font-semibold mb-1.5 ml-1">Email Address</label>
                            <input
                                type="email"
                                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-200 text-sm font-semibold mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-gray-400"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-200 text-sm font-semibold mb-1.5 ml-1">Account Type</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all appearance-none [&>option]:bg-slate-800 [&>option]:text-white cursor-pointer"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value, companyName: e.target.value === 'candidate' ? '' : formData.companyName })}
                                >
                                    <option value="candidate">Candidate</option>
                                    <option value="company">Company</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {formData.role === 'company' && (
                            <div className="animate-fade-in transition-all duration-300 origin-top">
                                <label className="block text-gray-200 text-sm font-semibold mb-1.5 ml-1">Company Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder-gray-400"
                                    placeholder="Acme Corp"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                            >
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-indigo-300 hover:text-white transition-colors duration-200 ml-1">
                            Log in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
