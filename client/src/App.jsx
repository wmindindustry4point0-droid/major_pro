import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CandidateDashboard from './pages/CandidateDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import OAuthCallback from './pages/OAuthCallback';
import { useTheme } from './context/ThemeContext';

const ProtectedRoute = ({ children, allowedRole }) => {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    })();
    const token = localStorage.getItem('token');
    if (!user || !token) return <Navigate to="/" />;
    if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;
    return children;
};

const AppContent = () => {
    const location = useLocation();
    const { theme } = useTheme();
    const hideNavbarRoutes = ['/', '/company-dashboard', '/candidate-dashboard', '/oauth-callback'];
    const showDefaultNavbar = !hideNavbarRoutes.includes(location.pathname);

    return (
        <div className={`min-h-screen w-full font-sans transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}>
            {showDefaultNavbar && <Navbar />}
            <div className={showDefaultNavbar ? 'container mx-auto p-4' : ''}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/oauth-callback" element={<OAuthCallback />} />
                    <Route path="/candidate-dashboard" element={
                        <ProtectedRoute allowedRole="candidate"><CandidateDashboard /></ProtectedRoute>
                    } />
                    <Route path="/company-dashboard" element={
                        <ProtectedRoute allowedRole="company"><CompanyDashboard /></ProtectedRoute>
                    } />
                </Routes>
            </div>
        </div>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;