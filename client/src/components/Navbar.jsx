import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className={`p-4 shadow-md transition-colors duration-300 ${isDark ? 'bg-slate-900 border-b border-slate-800 text-slate-100' : 'bg-white border-b border-slate-200 text-slate-900'}`}>
            <div className="container mx-auto flex justify-between items-center gap-4">
                <Link to="/" className="flex items-center gap-2 font-bold text-lg">
                    <BrainCircuit className="w-6 h-6 text-indigo-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">HireMind AI</span>
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {!user ? (
                        <>
                            <Link to="/login" className={`text-sm hover:text-indigo-500 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Login</Link>
                            <Link to="/register" className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors">Register</Link>
                        </>
                    ) : (
                        <>
                            <Link to={user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard'}
                                className={`text-sm hover:text-indigo-500 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Dashboard</Link>
                            <button onClick={handleLogout} className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">Logout</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;