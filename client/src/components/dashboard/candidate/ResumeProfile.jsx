import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    UploadCloud, FileText, CheckCircle2,
    Loader2, Mail, Phone, Activity, Briefcase,
    GraduationCap, FolderGit2, Clock, Calendar,
    Building2, Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StatCard = ({ icon: Icon, label, value, accent, isDark }) => (
    <div className={`flex flex-col gap-1 p-4 rounded-xl border ${
        isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
    }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${accent}`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
        <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
    </div>
);

const SectionHeader = ({ icon: Icon, title, count, isDark }) => (
    <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icon className="w-4 h-4" /> {title}
        </h4>
        {count !== undefined && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
            }`}>{count}</span>
        )}
    </div>
);

const EmptyState = ({ message, isDark }) => (
    <p className={`text-sm italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{message}</p>
);

const ResumeProfile = () => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef(null);
    const user  = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const { isDark } = useTheme();

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API}/api/candidate/profile/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data);
        } catch (error) {
            console.log('No profile yet or error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('userId', user._id);
        try {
            const res = await axios.post(`${API}/api/candidate/profile`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            setProfile(res.data.profile);
            await fetchProfile();
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to analyze resume. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
    };

    const getResumeViewUrl = () => `${API}/api/candidate/resume-proxy/${user._id}`;

    if (isLoading) {
        return (
            <div className="flex justify-center mt-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Theme tokens
    const headingColor = isDark ? 'text-white' : 'text-slate-900';
    const subColor     = isDark ? 'text-slate-400' : 'text-slate-500';
    const cardBg       = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const innerBg      = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200';
    const divider      = isDark ? 'border-slate-800' : 'border-slate-200';

    // All field names now match the Mongoose schema (camelCase)
    const expCount   = profile?.experience?.length      || 0;
    const eduCount   = profile?.education?.length       || 0;
    const projCount  = profile?.projects?.length        || 0;
    const skillCount = profile?.extractedSkills?.length || 0;
    const totalExp   = profile?.totalExperienceYears    || 0;

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${headingColor}`}>Resume Profile</h2>
                <p className={`text-sm sm:text-base ${subColor}`}>
                    Upload your resume. Our AI will automatically extract your skills and match you to top jobs.
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center transition-all cursor-pointer ${
                    dragActive
                        ? isDark ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                        : isDark ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}>
                    {isUploading
                        ? <Loader2 className="w-7 h-7 sm:w-10 sm:h-10 text-indigo-400 animate-spin" />
                        : <UploadCloud className={`w-7 h-7 sm:w-10 sm:h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                    }
                </div>
                <h3 className={`text-base sm:text-xl font-bold mb-2 ${headingColor}`}>
                    {isUploading ? 'Analyzing Resume via AI...' : profile ? 'Update Your Resume' : 'Upload Your Resume'}
                </h3>
                <p className={`text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto ${subColor}`}>
                    {isUploading
                        ? 'Extracting semantic metadata and BERT embeddings...'
                        : 'Drag and drop your PDF here, or click to browse. Max size 5MB.'}
                </p>
                <input
                    type="file" accept=".pdf" className="hidden" ref={fileInputRef}
                    onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]); }}
                />
                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={isUploading}
                    className={`font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl transition-all shadow-lg text-sm sm:text-base ${
                        isUploading
                            ? isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}
                >
                    {isUploading ? 'Processing...' : 'Browse PDF File'}
                </button>
            </div>

            {/* Extracted Profile Display */}
            <AnimatePresence>
            {profile && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl sm:rounded-3xl overflow-hidden relative ${cardBg}`}
                >
                    {isDark && (
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-500/10 rounded-bl-full blur-3xl mix-blend-screen pointer-events-none" />
                    )}

                    {/* ── Profile Header ── */}
                    <div className={`p-5 sm:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${divider}`}>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                <FileText className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`text-lg sm:text-2xl font-bold mb-1 truncate ${headingColor}`}>
                                    {profile.extractedName || user.name}
                                </h3>
                                <div className={`flex flex-col xs:flex-row items-start xs:items-center gap-1 xs:gap-4 text-xs sm:text-sm ${subColor}`}>
                                    <span className="flex items-center gap-1 truncate">
                                        <Mail className="w-3.5 h-3.5 shrink-0" />
                                        {profile.extractedEmail || 'Not Extracted'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                        {profile.extractedPhone || 'Not Extracted'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border shrink-0 ${
                            isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            AI Parsed Successfully
                        </span>
                    </div>

                    {/* ── Stats Row ── */}
                    <div className={`px-5 sm:px-8 py-4 sm:py-5 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 ${divider}`}>
                        <StatCard icon={Clock}      label="Years Experience" value={totalExp}    accent="bg-indigo-500"  isDark={isDark} />
                        <StatCard icon={Briefcase}  label="Roles Found"      value={expCount}   accent="bg-violet-500"  isDark={isDark} />
                        <StatCard icon={FolderGit2} label="Projects"         value={projCount}  accent="bg-blue-500"    isDark={isDark} />
                        <StatCard icon={Activity}   label="Skills Detected"  value={skillCount} accent="bg-emerald-500" isDark={isDark} />
                    </div>

                    {/* ── Body ── */}
                    <div className="p-5 sm:p-8 space-y-8">

                        {/* Skills */}
                        <div>
                            <SectionHeader icon={Activity} title="Technical Skills Extracted" count={skillCount} isDark={isDark} />
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {skillCount > 0 ? (
                                    profile.extractedSkills.map((skill, i) => (
                                        <span key={i} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 border rounded-lg text-xs sm:text-sm font-medium ${
                                            isDark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        }`}>{skill}</span>
                                    ))
                                ) : (
                                    <EmptyState message="No technical skills detected automatically." isDark={isDark} />
                                )}
                            </div>
                        </div>

                        {/* Experience */}
                        <div>
                            <SectionHeader icon={Briefcase} title="Work Experience" count={expCount} isDark={isDark} />
                            {expCount > 0 ? (
                                <div className="space-y-3">
                                    {profile.experience.map((exp, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${innerBg}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                <span className={`font-semibold text-sm sm:text-base ${headingColor}`}>
                                                    {exp.title || 'Position'}
                                                </span>
                                                {/* camelCase fields from Mongoose ✓ */}
                                                {(exp.startDate || exp.endDate) && (
                                                    <span className={`flex items-center gap-1 text-xs shrink-0 ${subColor}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {exp.startDate} – {exp.endDate}
                                                        {exp.durationMonths > 0 && ` · ${exp.durationMonths}mo`}
                                                    </span>
                                                )}
                                            </div>
                                            {exp.company && (
                                                <span className={`flex items-center gap-1 text-xs sm:text-sm mb-2 ${subColor}`}>
                                                    <Building2 className="w-3 h-3" /> {exp.company}
                                                </span>
                                            )}
                                            {exp.description && (
                                                <p className={`text-xs sm:text-sm leading-relaxed ${subColor}`}>{exp.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`p-4 rounded-xl border text-center ${innerBg}`}>
                                    <Briefcase className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>0 years experience</p>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No work experience found in resume</p>
                                </div>
                            )}
                        </div>

                        {/* Education */}
                        <div>
                            <SectionHeader icon={GraduationCap} title="Education" count={eduCount} isDark={isDark} />
                            {eduCount > 0 ? (
                                <div className="space-y-3">
                                    {profile.education.map((edu, i) => (
                                        <div key={i} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${innerBg}`}>
                                            <div className="min-w-0">
                                                <p className={`font-semibold text-sm sm:text-base truncate ${headingColor}`}>
                                                    {edu.degree || 'Degree'}
                                                </p>
                                                {edu.institution && (
                                                    <p className={`text-xs sm:text-sm truncate ${subColor}`}>
                                                        {edu.institution}
                                                    </p>
                                                )}
                                                {edu.grade && (
                                                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                        {edu.grade}
                                                    </p>
                                                )}
                                            </div>
                                            {edu.year && (
                                                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${
                                                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <Calendar className="w-3 h-3" /> {edu.year}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`p-4 rounded-xl border text-center ${innerBg}`}>
                                    <GraduationCap className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                                    <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No education details found in resume</p>
                                </div>
                            )}
                        </div>

                        {/* Projects */}
                        <div>
                            <SectionHeader icon={FolderGit2} title="Projects" count={projCount} isDark={isDark} />
                            {projCount > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {profile.projects.map((proj, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${innerBg}`}>
                                            <p className={`font-semibold text-sm sm:text-base mb-1.5 ${headingColor}`}>{proj.name}</p>
                                            {proj.description && (
                                                <p className={`text-xs sm:text-sm leading-relaxed mb-3 ${subColor}`}>{proj.description}</p>
                                            )}
                                            {/* techStack — camelCase matches Mongoose schema ✓ */}
                                            {proj.techStack?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {proj.techStack.map((t, j) => (
                                                        <span key={j} className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                                        }`}>{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`p-4 rounded-xl border text-center ${innerBg}`}>
                                    <FolderGit2 className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                                    <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No projects found in resume</p>
                                </div>
                            )}
                        </div>

                        {/* View Resume */}
                        <div>
                            <SectionHeader icon={Code2} title="Original Resume" isDark={isDark} />
                            <div className={`p-4 border rounded-xl ${innerBg}`}>
                                <p className={`text-xs sm:text-sm mb-3 ${subColor}`}>
                                    Your resume is securely stored on AWS S3. Click below to open it in a new tab.
                                </p>
                                <button
                                    onClick={() => window.open(`${getResumeViewUrl()}?token=${token}`, '_blank')}
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
                                >
                                    <FileText className="w-4 h-4" /> Open PDF Document
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default ResumeProfile;