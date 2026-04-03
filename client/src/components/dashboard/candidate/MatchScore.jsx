import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, CheckCircle2, AlertCircle, Cpu, Briefcase, FolderGit2, Star } from 'lucide-react';

const MatchScore = () => {
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const [appsRes, profileRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/candidate/${user._id}`),
                    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/candidate/profile/${user._id}`).catch(() => ({ data: null }))
                ]);

                setApplications(appsRes.data.filter(app => app.matchScore != null));
                setProfile(profileRes.data);
            } catch (error) {
                console.error("Error fetching match scores:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsights();
    }, [user._id]);

    const getScoreColor = (score) => {
        if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20', shadow: 'shadow-emerald-500/20' };
        if (score >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/20', shadow: 'shadow-yellow-500/20' };
        return { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/20', shadow: 'shadow-rose-500/20' };
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

    // Breakdown component config
    const breakdownConfig = {
        semantic:   { label: 'Semantic',   icon: Cpu,         color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20', weight: '40%' },
        skills:     { label: 'Skills',     icon: Star,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20', weight: '25%' },
        experience: { label: 'Experience', icon: Briefcase,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',   weight: '20%' },
        projects:   { label: 'Projects',   icon: FolderGit2,  color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20', weight: '15%' },
    };

    if (isLoading) {
        return <div className="mt-20 text-center text-slate-500 animate-pulse">Running AI Semantic Analysis...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">AI Match Score Insights</h2>
                <p className="text-slate-400">Deep dive into how your profile aligns with the jobs you applied to.</p>
            </div>

            {applications.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No AI Data Available</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Your applications haven't been processed by the AI algorithm yet, or you haven't applied to any roles.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {applications.map(app => {
                        const scoreData = getScoreColor(app.matchScore);
                        const missingSkills = parseMissingSkills(app.aiFeedback);

                        const jobSkills = (app.jobId?.requiredSkills || [])
                            .map(extractSkillString)
                            .filter(Boolean);

                        const candidateSkills = (profile?.extractedSkills || [])
                            .map(extractSkillString)
                            .filter(Boolean);

                        const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());

                        const matchedSkills = jobSkills.filter(s =>
                            candidateSkillsLower.includes(s.toLowerCase())
                        );

                        const breakdown = app.scoreBreakdown || null;

                        return (
                            <div key={app._id} className={`bg-slate-900 border ${scoreData.border} rounded-3xl p-8 relative overflow-hidden transition-all hover:shadow-xl ${scoreData.shadow}`}>
                                <div className={`absolute top-0 right-0 w-64 h-64 ${scoreData.bg} opacity-5 rounded-bl-[150px] mix-blend-screen pointer-events-none`}></div>

                                <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                    <div className="flex-1 w-full">
                                        <h3 className="text-2xl font-bold text-white mb-1">{app.jobId?.title}</h3>
                                        <p className="text-slate-400 mb-6">{app.jobId?.companyId?.companyName}</p>

                                        {/* Skills Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {/* Matched Skills */}
                                            <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-400 mb-3">
                                                    <CheckCircle2 className="w-4 h-4" /> Matched Required Skills
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {matchedSkills.length > 0 ? matchedSkills.map(skill => (
                                                        <span key={skill} className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                                            {skill}
                                                        </span>
                                                    )) : (
                                                        <span className="text-sm text-slate-500 italic">
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
                                            <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-rose-400 mb-3">
                                                    <AlertCircle className="w-4 h-4" /> Detected Skill Gaps
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {missingSkills.length > 0 ? missingSkills.map(skill => (
                                                        <span key={skill} className="px-2.5 py-1 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
                                                            {skill}
                                                        </span>
                                                    )) : (
                                                        <span className="text-sm text-emerald-500 italic flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> No skill gaps found!
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Breakdown — only shown if scoreBreakdown exists */}
                                        {breakdown && (
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
                                                <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Score Breakdown</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {Object.entries(breakdownConfig).map(([key, config]) => {
                                                        const Icon = config.icon;
                                                        const val = breakdown[key] ?? null;
                                                        return (
                                                            <div key={key} className={`${config.bg} border ${config.border} rounded-xl p-3 flex flex-col gap-2`}>
                                                                <div className="flex items-center justify-between">
                                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                                    <span className="text-xs text-slate-500">{config.weight}</span>
                                                                </div>
                                                                <div className={`text-2xl font-bold ${config.color}`}>
                                                                    {val !== null ? `${val}%` : '—'}
                                                                </div>
                                                                <div className="text-xs text-slate-400 font-medium">{config.label}</div>
                                                                {/* Mini progress bar */}
                                                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${config.bg.replace('/10', '')}`}
                                                                        style={{ width: val !== null ? `${val}%` : '0%' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Overall Score Ring */}
                                    <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-center p-8 bg-slate-950/50 border border-slate-800 rounded-2xl shadow-inner">
                                        <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(30,41,59,0.5)" strokeWidth="8" />
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
                                            <div className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${scoreData.text}`}>
                                                {app.matchScore}%
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold uppercase tracking-wider ${scoreData.text}`}>
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