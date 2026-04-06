import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const MatchScore = () => {
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const { isDark } = useTheme();

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const [appsRes, profileRes] = await Promise.all([
                    axios.get(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/applications/candidate/${user._id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                    axios.get(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/candidate/profile/${user._id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ).catch(() => ({ data: null }))
                ]);
                setApplications(appsRes.data.filter(app => app.matchScore != null));
                setProfile(profileRes.data);
            } catch (error) {
                console.error('Error fetching match scores:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsights();
    }, [user._id]);

    const getScoreColor = (score) => {
        if (score >= 80) return {
            bg: 'bg-emerald-500',
            text: isDark ? 'text-emerald-400' : 'text-emerald-600',
            border: isDark ? 'border-emerald-500/20' : 'border-emerald-300',
            shadow: isDark ? 'shadow-emerald-500/10' : 'shadow-emerald-100',
            pill: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
        if (score >= 50) return {
            bg: 'bg-yellow-500',
            text: isDark ? 'text-yellow-400' : 'text-yellow-600',
            border: isDark ? 'border-yellow-500/20' : 'border-yellow-300',
            shadow: isDark ? 'shadow-yellow-500/10' : 'shadow-yellow-100',
            pill: isDark ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
        };
        return {
            bg: 'bg-rose-500',
            text: isDark ? 'text-rose-400' : 'text-rose-600',
            border: isDark ? 'border-rose-500/20' : 'border-rose-300',
            shadow: isDark ? 'shadow-rose-500/10' : 'shadow-rose-100',
            pill: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
        };
    };

    const parseMissingSkills = (feedbackStr) => {
        if (!feedbackStr) return [];
        const match = feedbackStr.match(/Missing skills:\s*(.*)/i);
        if (match && match[1]) {
            let str = match[1].replace('None.', '').replace('.', '').trim();
            if (str === 'None' || str === '') return [];
            return str.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [];
    };

    const extractSkillString = (skill) => {
        if (!skill) return '';
        if (typeof skill === 'string') return skill.trim();
        if (typeof skill === 'object') {
            return (skill.name || skill.skill || skill.label || Object.values(skill)[0] || '').toString().trim();
        }
        return String(skill).trim();
    };

    if (isLoading) {
        return (
            <div className={`mt-20 text-center animate-pulse text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Running AI Semantic Analysis...
            </div>
        );
    }

    // Theme tokens
    const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const innerBg = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200';
    const headingColor = isDark ? 'text-white' : 'text-slate-900';
    const subColor = isDark ? 'text-slate-400' : 'text-slate-500';
    const companyColor = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${headingColor}`}>
                    AI Match Score Insights
                </h2>
                <p className={`text-sm sm:text-base ${subColor}`}>
                    Deep dive into how your semantic vector aligns with the jobs you applied to.
                </p>
            </div>

            {applications.length === 0 ? (
                <div className={`border rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center ${cardBg}`}>
                    <Target className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                    <h3 className={`text-lg sm:text-xl font-bold mb-2 ${headingColor}`}>No AI Data Available</h3>
                    <p className={`max-w-md mx-auto text-sm sm:text-base ${subColor}`}>
                        Your applications haven't been processed by the AI algorithm yet, or you haven't applied to any roles.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {applications.map(app => {
                        const scoreData = getScoreColor(app.matchScore);
                        const missingSkills = parseMissingSkills(app.aiFeedback);

                        const jobSkills = (app.jobId?.requiredSkills || []).map(extractSkillString).filter(Boolean);
                        const candidateSkills = (profile?.extractedSkills || []).map(extractSkillString).filter(Boolean);
                        const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
                        const matchedSkills = jobSkills.filter(s => candidateSkillsLower.includes(s.toLowerCase()));

                        return (
                            <div
                                key={app._id}
                                className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden transition-all hover:shadow-lg ${cardBg} ${scoreData.border} ${scoreData.shadow}`}
                            >
                                {/* Decorative glow */}
                                <div className={`absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 ${scoreData.bg} opacity-5 rounded-bl-[120px] sm:rounded-bl-[150px] pointer-events-none`} />

                                <div className="flex flex-col xl:flex-row justify-between items-start gap-6 sm:gap-8 relative z-10">
                                    {/* Left — job info + skills */}
                                    <div className="flex-1 w-full">
                                        <h3 className={`text-lg sm:text-2xl font-bold mb-0.5 ${headingColor}`}>
                                            {app.jobId?.title}
                                        </h3>
                                        <p className={`text-sm sm:text-base mb-4 sm:mb-6 ${companyColor}`}>
                                            {app.jobId?.companyId?.companyName}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                                            {/* Matched Skills */}
                                            <div className={`border p-4 sm:p-5 rounded-xl sm:rounded-2xl ${innerBg}`}>
                                                <h4 className={`flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                                    Matched Required Skills
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {matchedSkills.length > 0 ? matchedSkills.map(skill => (
                                                        <span
                                                            key={skill}
                                                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-bold border rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                                                        >
                                                            {skill}
                                                        </span>
                                                    )) : (
                                                        <span className={`text-xs sm:text-sm italic ${subColor}`}>
                                                            {jobSkills.length === 0
                                                                ? 'No required skills listed for this job.'
                                                                : candidateSkills.length === 0
                                                                    ? 'No skills found in your profile.'
                                                                    : 'No exact skill matches detected.'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Missing Skills */}
                                            <div className={`border p-4 sm:p-5 rounded-xl sm:rounded-2xl ${innerBg}`}>
                                                <h4 className={`flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                                    Detected Skill Gaps
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {missingSkills.length > 0 ? missingSkills.map(skill => (
                                                        <span
                                                            key={skill}
                                                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-bold border rounded-lg ${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                                                        >
                                                            {skill}
                                                        </span>
                                                    )) : (
                                                        <span className={`text-xs sm:text-sm italic flex items-center gap-1 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                                            <CheckCircle2 className="w-3 h-3" /> No skill gaps found!
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — score ring */}
                                    <div className={`w-full xl:w-56 shrink-0 flex flex-row xl:flex-col items-center justify-center gap-4 xl:gap-0 p-5 sm:p-8 border rounded-xl sm:rounded-2xl ${innerBg}`}>
                                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center xl:mb-4">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="40" fill="transparent"
                                                    stroke={isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)'}
                                                    strokeWidth="8" />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    fill="transparent"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    strokeDasharray="251.2"
                                                    strokeDashoffset={251.2 - (251.2 * app.matchScore) / 100}
                                                    strokeLinecap="round"
                                                    className={`${scoreData.text} transition-all duration-1000 ease-out`}
                                                />
                                            </svg>
                                            <div className={`absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold ${scoreData.text}`}>
                                                {app.matchScore}%
                                            </div>
                                        </div>
                                        <div className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${scoreData.text}`}>
                                            {app.matchScore >= 80 ? 'Strong Match' : app.matchScore >= 50 ? 'Moderate Match' : 'Weak Match'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MatchScore;