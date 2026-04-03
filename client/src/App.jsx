import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CandidateDashboard from './pages/CandidateDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import OAuthCallback from './pages/OAuthCallback'; // ← ADDED

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;
    if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;
    return children;
};

const AppContent = () => {
    const location = useLocation();

    // Hide the default Navbar on landing page and custom layout dashboards
    const hideNavbarRoutes = ['/', '/company-dashboard', '/candidate-dashboard', '/oauth-callback'];
    const showDefaultNavbar = !hideNavbarRoutes.includes(location.pathname);

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {showDefaultNavbar && <Navbar />}
            <div className={showDefaultNavbar ? "container mx-auto p-4" : ""}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/oauth-callback" element={<OAuthCallback />} /> {/* ← ADDED */}

                    <Route path="/candidate-dashboard" element={
                        <ProtectedRoute allowedRole="candidate">
                            <CandidateDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/company-dashboard" element={
                        <ProtectedRoute allowedRole="company">
                            <CompanyDashboard />
                        </ProtectedRoute>
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