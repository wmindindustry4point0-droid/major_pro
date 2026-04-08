import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, Plus, Settings2, FileText, Users, Target, Download,
    UploadCloud, ChevronRight, CheckCircle2, Loader2, X, Eye,
    ThumbsUp, ThumbsDown, Trophy, FileBadge, Menu
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
const ResumeAnalyzer = ({ user }) => {
    const { isDark } = useTheme();
    const [workspace, setWorkspace] = useState(null);
    const [savedWorkspaces, setSavedWorkspaces] = useState([]);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
    const [activeTab, setActiveTab] = useState('description');
    const [mobileTabOpen, setMobileTabOpen] = useState(false);

    const token = localStorage.getItem('token');
    const authHeader = { Authorization: `Bearer ${token}` };

    useEffect(() => { if (user?._id) fetchWorkspaces(); }, [user]);

    const fetchWorkspaces = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/jobs/workspaces/${user._id}`, { headers: authHeader });
            setSavedWorkspaces(res.data);
        } catch (err) { console.error('Error fetching workspaces', err); }
        finally { setIsLoadingWorkspaces(false); }
    };

    const [jobTitle, setJobTitle] = useState('Machine Learning Engineer');
    const [jobDescription, setJobDescription] = useState('We are looking for an ML Engineer to build and deploy generative models...');
    const [skillsInput, setSkillsInput] = useState('Python, TensorFlow, PyTorch');
    const [requiredSkills, setRequiredSkills] = useState(['Python', 'Machine Learning', 'TensorFlow']);
    const [showSkillInput, setShowSkillInput] = useState(false);
    const [skillInput, setSkillInput] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState([]);
    const [error, setError] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const tabs = [
        { id: 'description', label: 'Job Description', icon: FileText },
        { id: 'filters',     label: 'Filters',         icon: Settings2 },
        { id: 'upload',      label: 'Upload',           icon: UploadCloud },
        { id: 'candidates',  label: 'Candidates',       icon: Users },
        { id: 'results',     label: 'AI Results',       icon: Target },
        { id: 'reports',     label: 'Reports',          icon: Download },
    ];

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const bg       = isDark ? 'bg-slate-950'         : 'bg-gray-50';
    const cardBg   = isDark ? 'bg-slate-900'         : 'bg-white';
    const cardBg2  = isDark ? 'bg-slate-800/40'      : 'bg-gray-100/80';
    const border   = isDark ? 'border-slate-700'     : 'border-gray-200';
    const border2  = isDark ? 'border-slate-800'     : 'border-gray-100';
    const heading  = isDark ? 'text-white'           : 'text-gray-900';
    const sub      = isDark ? 'text-slate-400'       : 'text-gray-500';
    const muted    = isDark ? 'text-slate-500'       : 'text-gray-400';
    const inputBg  = isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
    const tagBg    = isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600';
    const tabBar   = isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-100 border-gray-200';
    const tabActive = 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20';
    const tabInact  = isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-gray-500 hover:bg-white hover:text-gray-800';

    const handleCreateWorkspace = async () => {
        try {
            const newWorkspace = {
                companyId: user._id,
                name: `AI Hiring Workspace ${savedWorkspaces.length + 1}`,
                jobTitle: 'Machine Learning Engineer',
                jobDescription: 'We are looking for an ML Engineer to build and deploy generative models...',
                requiredSkills: ['Python', 'Machine Learning', 'TensorFlow'],
                status: 'Draft'
            };
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/jobs/workspaces`, newWorkspace, { headers: authHeader });
            setSavedWorkspaces([res.data, ...savedWorkspaces]);
            loadWorkspace(res.data);
        } catch (err) { console.error('Failed to create workspace', err); }
    };

    const loadWorkspace = (ws) => {
        setWorkspace(ws);
        setJobTitle(ws.jobTitle || '');
        setJobDescription(ws.jobDescription || '');
        setSkillsInput(ws.skillsInput || '');
        setRequiredSkills(ws.requiredSkills || []);
        setAnalysisResults(ws.analysisResults || []);
        setSelectedFiles([]);
        setActiveTab('description');
    };

    const saveWorkspaceState = async (updates) => {
        if (!workspace?._id) return;
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/jobs/workspaces/${workspace._id}`, updates, { headers: authHeader });
            setWorkspace(res.data);
            setSavedWorkspaces(prev => prev.map(w => w._id === res.data._id ? res.data : w));
        } catch (err) { console.error('Failed to save workspace state', err); }
    };

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !requiredSkills.includes(trimmed)) setRequiredSkills([...requiredSkills, trimmed]);
        setSkillInput(''); setShowSkillInput(false);
    };
    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter') handleAddSkill();
        if (e.key === 'Escape') { setShowSkillInput(false); setSkillInput(''); }
    };
    const handleRemoveSkill = (s) => setRequiredSkills(requiredSkills.filter(x => x !== s));

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const runAnalysis = async () => {
        if (!selectedFiles.length) { setError('Please upload at least one PDF resume.'); return; }
        setIsAnalyzing(true); setError('');
        const formData = new FormData();
        formData.append('jobDescription', jobDescription);
        formData.append('requiredSkills', JSON.stringify(requiredSkills));
        selectedFiles.forEach(f => formData.append('resumes', f));
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/jobs/analyze-workspace`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            if (res.data?.analyzed_candidates) {
                setAnalysisResults(res.data.analyzed_candidates);
                setActiveTab('results');
                await saveWorkspaceState({ analysisResults: res.data.analyzed_candidates, status: 'Completed' });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process resumes. Ensure AI service is running.');
        } finally { setIsAnalyzing(false); }
    };

    const handleExportCSV = () => {
        if (!analysisResults.length) return;
        const headers = ['Rank','Candidate Name','Email','Phone','Match Score','Skills Found','Missing Skills','Status'];
        const rows = analysisResults.map(r => [
            r.rank || 'N/A', r.candidateName || 'Unknown', r.email || 'N/A', r.phone || 'N/A',
            r.matchScore ? `${r.matchScore}%` : 'N/A',
            (r.extractedSkills || []).join('; '),
            (r.missingSkills || []).join('; '),
            r.status
        ]);
        const csv = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csv));
        link.setAttribute('download', `hiremind_export_${Date.now()}.csv`);
        document.body.appendChild(link); link.click();
    };

    const handleStatusChange = (candidateId, newStatus) =>
        setAnalysisResults(prev => prev.map(c => c.id === candidateId ? { ...c, candidateStatus: newStatus } : c));

    const openCandidateModal  = (c) => { setSelectedCandidate(c); setIsModalOpen(true); };
    const closeCandidateModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedCandidate(null), 300); };

    const getScoreLabel = (score) => {
        if (score >= 80) return { text: 'Strong Match',   color: 'emerald' };
        if (score >= 50) return { text: 'Moderate Match', color: 'yellow'  };
        return                  { text: 'Weak Match',     color: 'rose'    };
    };
    const getScoreColor = (score, type = 'text') => {
        const c = score >= 75 ? 'emerald' : score >= 50 ? 'yellow' : 'rose';
        return type === 'text' ? `text-${c}-400` : `bg-${c}-500`;
    };

    const getCandidateFileUrl = (fileName) => {
        const f = selectedFiles.find(f => f.name === fileName);
        return f ? URL.createObjectURL(f) : null;
    };

    const fadeProps = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } };

    // ── Sub-views ─────────────────────────────────────────────────────────────

    const renderDescription = () => (
        <div className="space-y-5 w-full max-w-3xl">
            <h3 className={`text-lg sm:text-xl font-bold ${heading}`}>Define Job Description</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                    <label className={`text-sm font-semibold ${sub}`}>Job Title</label>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                        className={`w-full border p-3 sm:p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm ${inputBg}`} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <label className={`text-sm font-semibold ${sub}`}>General Skills Map</label>
                    <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
                        className={`w-full border p-3 sm:p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm ${inputBg}`} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <label className={`text-sm font-semibold ${sub}`}>Detailed Job Description <span className={`text-xs font-normal ${muted}`}>(Used for BERT Embeddings)</span></label>
                    <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={6}
                        className={`w-full border p-3 sm:p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y text-sm ${inputBg}`} />
                    <p className={`text-xs ${muted}`}>The AI will use this entire text to build a contextual vector for candidate comparison.</p>
                </div>
            </div>
            <button onClick={() => { saveWorkspaceState({ jobTitle, jobDescription, skillsInput, requiredSkills }); setActiveTab('filters'); }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                Save & Continue <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );

    const renderFilters = () => (
        <div className="space-y-5 w-full max-w-3xl">
            <h3 className={`text-lg sm:text-xl font-bold ${heading}`}>AI Requirement Filters</h3>
            <div className={`border ${border} p-4 sm:p-6 rounded-2xl space-y-5 ${cardBg}`}>
                <div>
                    <h4 className={`font-semibold text-sm sm:text-base mb-1 ${sub}`}>Must-Have Skills</h4>
                    <p className={`text-xs mb-4 ${muted}`}>The AI will specifically check if these exact skills exist in the candidate's parsed resume.</p>
                    <div className="flex flex-wrap gap-2 items-center">
                        {requiredSkills.map((skill, i) => (
                            <span key={i} className="px-2.5 sm:px-3 py-1.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs sm:text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {skill}
                                <button onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-400"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        {showSkillInput ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                <input autoFocus value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleSkillKeyDown}
                                    placeholder="e.g. React"
                                    className={`px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-28 sm:w-32 ${inputBg}`} />
                                <button onClick={handleAddSkill} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">Add</button>
                                <button onClick={() => { setShowSkillInput(false); setSkillInput(''); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowSkillInput(true)}
                                className={`px-3 py-1.5 border border-dashed rounded-lg text-sm transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500/50' : 'bg-gray-50 border-gray-300 text-gray-400 hover:text-gray-700 hover:border-indigo-300'}`}>
                                + Add Skill
                            </button>
                        )}
                    </div>
                </div>
                <div className={`pt-4 border-t ${border2}`}>
                    <button onClick={() => { saveWorkspaceState({ requiredSkills }); setActiveTab('upload'); }}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                        Apply Filters & Continue <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderUpload = () => (
        <div className="space-y-6 w-full max-w-3xl">
            {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 sm:p-4 rounded-xl text-sm">{error}</div>}
            <label className={`block border-2 border-dashed rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center cursor-pointer group transition-colors ${
                isDark ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10' : 'border-indigo-300/50 bg-indigo-50/30 hover:bg-indigo-50/60'}`}>
                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileSelect} />
                <UploadCloud className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-400 mx-auto mb-3 sm:mb-4 group-hover:-translate-y-1 transition-transform" />
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${heading}`}>Select Resumes</h3>
                <p className={`text-sm ${sub}`}>Upload PDF files to screen (multiple allowed)</p>
                <div className={`mt-6 sm:mt-8 inline-block px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium border text-sm pointer-events-none ${
                    isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-700 border-gray-200 shadow-sm'}`}>
                    Browse Files
                </div>
            </label>

            {selectedFiles.length > 0 && (
                <div className={`border rounded-2xl p-4 sm:p-6 ${cardBg2} ${border}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h4 className={`font-bold text-sm sm:text-base ${heading}`}>{selectedFiles.length} Resume(s) Queued</h4>
                        <button onClick={runAnalysis} disabled={isAnalyzing}
                            className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                                isAnalyzing ? (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-400') + ' cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105'}`}>
                            {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><BrainCircuit className="w-4 h-4" />Start AI Batch Analysis</>}
                        </button>
                    </div>
                    <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {selectedFiles.map((f, i) => (
                            <li key={i} className={`flex justify-between items-center text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                                <span className={`truncate mr-2 ${sub}`}>{f.name}</span>
                                <span className={`shrink-0 ${muted}`}>Pending</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    const renderCandidates = () => {
        if (!analysisResults.length) return <div className={`text-center py-10 sm:py-12 text-sm ${sub}`}>No candidates analyzed yet. Go to 'Upload' and run analysis.</div>;
        return (
            <div className={`border rounded-2xl overflow-hidden ${border} ${isDark ? 'bg-slate-800/40' : 'bg-white shadow-sm'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                        <thead className={`border-b ${border} ${isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 sm:px-6 py-3 sm:py-4">File</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4">Name / Email</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4">Skills</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
                            {analysisResults.map((r, i) => (
                                <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 sm:px-6 py-3 sm:py-4 truncate max-w-[120px] ${sub}`}>{r.fileName}</td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        <div className={`font-bold ${heading}`}>{r.candidateName || 'Unknown'}</div>
                                        <div className={`text-xs ${muted}`}>{r.email || 'N/A'}</div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {r.extractedSkills?.length > 0
                                                ? r.extractedSkills.slice(0, 4).map((s, idx) => <span key={idx} className={`px-1.5 py-0.5 rounded text-xs ${tagBg}`}>{s}</span>)
                                                : <span className={`italic text-xs ${muted}`}>None found</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        {r.status === 'Success'
                                            ? <span className="text-emerald-400 flex items-center gap-1 text-xs font-medium"><CheckCircle2 className="w-3 h-3" />Extracted</span>
                                            : <span className="text-rose-400 text-xs">{r.error || 'Failed'}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        if (!analysisResults.length) return <div className={`text-center py-10 sm:py-12 text-sm ${sub}`}>No rankings yet. Run analysis first.</div>;
        const validResults = [...analysisResults].filter(r => r.status === 'Success').sort((a, b) => b.matchScore - a.matchScore);
        return (
            <div className="space-y-4 sm:space-y-6 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className={`text-lg sm:text-xl font-bold ${heading}`}>AI Candidate Ranking</h3>
                    <div className="text-xs px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 font-medium">
                        Ranked via <b>all-MiniLM-L6-v2</b>
                    </div>
                </div>

                {/* Mobile cards view */}
                <div className="flex flex-col gap-3 sm:hidden">
                    {validResults.map((r, i) => {
                        const scoreInfo = getScoreLabel(r.matchScore);
                        const isTop = i === 0;
                        return (
                            <div key={r.id} className={`rounded-2xl border p-4 relative ${isTop ? (isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : `${cardBg2} ${border}`}`}>
                                {isTop && <div className="absolute top-3 right-3 bg-indigo-500 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Trophy className="w-2.5 h-2.5" />Best</div>}
                                <div className="flex items-start gap-3">
                                    <div className={`text-xl font-black shrink-0 ${isTop ? 'text-indigo-400' : muted}`}>#{i + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm truncate ${heading}`}>{r.candidateName || r.fileName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-lg font-black text-${scoreInfo.color}-400`}>{r.matchScore}%</span>
                                            <span className={`text-xs text-${scoreInfo.color}-400`}>{scoreInfo.text}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                                            <div className={`h-full bg-${scoreInfo.color}-500 rounded-full`} style={{ width: `${r.matchScore}%` }} />
                                        </div>
                                        {r.missingSkills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {r.missingSkills.slice(0, 3).map((s, idx) => <span key={idx} className="px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold">{s}</span>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-current border-opacity-10">
                                    <button onClick={() => openCandidateModal(r)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}><Eye className="w-3.5 h-3.5" />View</button>
                                    <button onClick={() => handleStatusChange(r.id, 'Shortlisted')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><ThumbsUp className="w-3.5 h-3.5" />Shortlist</button>
                                    <button onClick={() => handleStatusChange(r.id, 'Rejected')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400"><ThumbsDown className="w-3.5 h-3.5" />Reject</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop table view */}
                <div className={`hidden sm:block border rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/5 relative ${border} ${isDark ? 'bg-slate-800/40' : 'bg-white shadow-sm'}`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className={`border-b ${border} ${isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                                <tr>
                                    {['Rank','Candidate','Extracted Skills','Missing','BERT Score','Actions'].map(h => (
                                        <th key={h} className={`px-6 py-4 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
                                {validResults.map((r, i) => {
                                    const scoreInfo = getScoreLabel(r.matchScore);
                                    const isTop = i === 0;
                                    return (
                                        <tr key={r.id} className={`transition-colors ${isTop ? (isDark ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500' : 'bg-indigo-50/70 border-l-4 border-l-indigo-400') : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50')}`}>
                                            <td className="px-6 py-4 relative">
                                                {isTop && <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-500/50"><Trophy className="w-3 h-3" />Best</div>}
                                                <div className={`font-black ${isTop ? 'text-indigo-400 text-2xl mt-2' : i < 3 ? 'text-purple-400 text-xl' : `${muted} text-lg`}`}>#{i + 1}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-bold ${heading}`}>{r.candidateName || r.fileName}</div>
                                                {r.candidateStatus === 'Shortlisted' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30 mt-1"><CheckCircle2 className="w-3 h-3" />Shortlisted</span>
                                                ) : r.candidateStatus === 'Rejected' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase border border-rose-500/30 mt-1"><X className="w-3 h-3" />Rejected</span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border mt-1 ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4"><div className={`line-clamp-2 max-w-[200px] text-xs leading-relaxed ${sub}`}>{r.extractedSkills?.join(', ')}</div></td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {r.missingSkills?.length > 0
                                                        ? r.missingSkills.map((s, idx) => <span key={idx} className="px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold">{s}</span>)
                                                        : <span className="text-emerald-400 text-xs">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[130px]">
                                                    <div className="flex items-end justify-between mb-1">
                                                        <span className={`font-black text-xl text-${scoreInfo.color}-400`}>{r.matchScore}%</span>
                                                        <span className={`text-[10px] font-bold text-${scoreInfo.color}-400/80 mb-1`}>{scoreInfo.text}</span>
                                                    </div>
                                                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${r.matchScore}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                                                            className={`h-full bg-${scoreInfo.color}-500`} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openCandidateModal(r)} className={`p-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'}`}><Eye className="w-4 h-4" /></button>
                                                    <button onClick={() => handleStatusChange(r.id, r.candidateStatus !== 'Shortlisted' ? 'Shortlisted' : 'Pending')}
                                                        className={`p-2 rounded-lg border transition-colors ${r.candidateStatus === 'Shortlisted' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 opacity-60' : (isDark ? 'bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 border-slate-700 hover:border-emerald-500/50' : 'bg-gray-100 hover:bg-emerald-50 text-emerald-500 border-gray-200')}`}>
                                                        <ThumbsUp className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleStatusChange(r.id, 'Rejected')}
                                                        className={`p-2 rounded-lg border transition-colors ${r.candidateStatus === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : (isDark ? 'bg-slate-800 hover:bg-rose-500/20 text-rose-400 border-slate-700 hover:border-rose-500/50' : 'bg-gray-100 hover:bg-rose-50 text-rose-400 border-gray-200')}`}>
                                                        <ThumbsDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div onClick={handleExportCSV} className={`border p-6 sm:p-8 rounded-2xl text-center cursor-pointer group transition-colors ${isDark ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
                <Download className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                <h4 className={`font-bold mb-1 sm:mb-2 text-sm sm:text-base ${heading}`}>CSV Pipeline Export</h4>
                <p className={`text-xs sm:text-sm ${sub}`}>Download full candidate dataset including rankings & gaps</p>
            </div>
            <div className={`border p-6 sm:p-8 rounded-2xl text-center transition-colors group relative overflow-hidden ${analysisResults.length > 0 ? `cursor-pointer ${isDark ? 'border-indigo-500/30 bg-slate-800/40 hover:bg-slate-800' : 'border-indigo-200 bg-white hover:bg-indigo-50 shadow-sm'}` : `opacity-50 cursor-not-allowed ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-gray-100 bg-white'}`}`}>
                <Target className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${analysisResults.length > 0 ? 'text-indigo-400 group-hover:scale-110 transition-transform' : muted}`} />
                <h4 className={`font-bold mb-1 sm:mb-2 text-sm sm:text-base ${heading}`}>Export Shortlisted</h4>
                <p className={`text-xs sm:text-sm ${sub}`}>Download top 20% matches</p>
            </div>
        </div>
    );

    // ── Landing page ──────────────────────────────────────────────────────────
    if (!workspace) {
        return (
            <div className="pb-12 sm:pb-20">
                <div className={`flex flex-col items-center justify-center p-8 sm:p-12 border rounded-2xl sm:rounded-3xl mb-8 sm:mb-12 text-center relative overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-indigo-500/10 rounded-bl-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-purple-500/10 rounded-tr-full blur-3xl pointer-events-none" />
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-5 sm:mb-6 relative z-10 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}>
                        <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500" />
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 relative z-10 ${heading}`}>AI Resume Analyzer</h2>
                    <p className={`text-sm sm:text-base text-center max-w-md mb-6 sm:mb-8 mx-auto relative z-10 ${sub}`}>
                        Create a workspace to batch process resumes against a job description using BERT semantic matching.
                    </p>
                    <button onClick={handleCreateWorkspace}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 sm:gap-3 text-sm sm:text-lg group relative z-10">
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" /> Create New AI Workspace
                    </button>
                </div>

                {isLoadingWorkspaces ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-indigo-500 animate-spin" /></div>
                ) : savedWorkspaces.length > 0 && (
                    <div>
                        <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-3 ${heading}`}>
                            <FileBadge className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" /> Recent Workspaces
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {savedWorkspaces.map(ws => (
                                <div key={ws._id} onClick={() => loadWorkspace(ws)}
                                    className={`border rounded-2xl p-4 sm:p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${isDark ? 'bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                                        <h4 className={`text-base sm:text-lg font-bold flex-1 pr-3 line-clamp-1 ${heading}`}>{ws.name}</h4>
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg whitespace-nowrap ${ws.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>{ws.status}</span>
                                    </div>
                                    <div className="space-y-2 mb-4 sm:mb-6">
                                        <p className={`text-xs sm:text-sm flex items-center gap-2 ${sub}`}><Target className="w-3.5 h-3.5 shrink-0" /><span className="line-clamp-1">{ws.jobTitle}</span></p>
                                        <p className={`text-xs sm:text-sm flex items-center gap-2 ${sub}`}><Users className="w-3.5 h-3.5 shrink-0" />{ws.analysisResults?.length || 0} Candidates</p>
                                    </div>
                                    <div className={`flex justify-between items-center pt-3 sm:pt-4 border-t ${border2}`}>
                                        <span className={`text-xs ${muted}`}>{new Date(ws.createdAt).toLocaleDateString()}</span>
                                        <span className="text-xs sm:text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">Resume <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Workspace view ────────────────────────────────────────────────────────
    const activeTabObj = tabs.find(t => t.id === activeTab);
    return (
        <div className="space-y-4 sm:space-y-6 pb-10 sm:pb-12">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-4 sm:p-6 rounded-xl sm:rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider mb-1.5">
                        <BrainCircuit className="w-3.5 h-3.5" /> ACTIVE WORKSPACE
                    </div>
                    <h2 className={`text-xl sm:text-3xl font-bold ${heading}`}>{workspace.name}</h2>
                </div>
                <button onClick={() => setWorkspace(null)} className="text-rose-400 hover:text-rose-300 text-xs sm:text-sm pb-0.5 border-b border-transparent hover:border-rose-400 transition-all flex gap-1.5 items-center">
                    <X className="w-3.5 h-3.5" /> Close Workspace
                </button>
            </div>

            {/* Tab bar — mobile: dropdown, desktop: pill row */}
            <div className="relative">
                {/* Mobile dropdown */}
                <div className="sm:hidden">
                    <button onClick={() => setMobileTabOpen(!mobileTabOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800 shadow-sm'}`}>
                        <span className="flex items-center gap-2">
                            {activeTabObj && <activeTabObj.icon className="w-4 h-4 text-indigo-400" />}
                            {activeTabObj?.label}
                        </span>
                        <Menu className="w-4 h-4 text-gray-400" />
                    </button>
                    {mobileTabOpen && (
                        <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border z-20 overflow-hidden shadow-lg ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileTabOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b last:border-0 ${isDark ? 'border-slate-800' : 'border-gray-100'} ${activeTab === tab.id ? 'bg-indigo-500/10 text-indigo-400' : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800')}`}>
                                    <tab.icon className="w-4 h-4" /> {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop pill tabs */}
                <div className={`hidden sm:flex gap-1.5 p-1.5 rounded-2xl border overflow-x-auto ${tabBar}`}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const hasResults = tab.id === 'results' && analysisResults.length > 0;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap relative ${isActive ? tabActive : tabInact}`}>
                                <tab.icon className="w-4 h-4" /> {tab.label}
                                {hasResults && !isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content */}
            <div className="min-h-[300px] sm:min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} {...fadeProps}>
                        {activeTab === 'description' && renderDescription()}
                        {activeTab === 'filters'     && renderFilters()}
                        {activeTab === 'upload'      && renderUpload()}
                        {activeTab === 'candidates'  && renderCandidates()}
                        {activeTab === 'results'     && renderResults()}
                        {activeTab === 'reports'     && renderReports()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* AI Insights Modal */}
            <AnimatePresence>
                {isModalOpen && selectedCandidate && (
                    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCandidateModal}>
                        <motion.div className={`w-full sm:max-w-6xl h-[92vh] sm:h-[85vh] border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200'}`}
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            {/* Info panel */}
                            <div className={`w-full md:w-1/3 p-4 sm:p-6 overflow-y-auto border-b md:border-b-0 md:border-r flex flex-col ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-4 sm:mb-6">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <h2 className={`text-lg sm:text-2xl font-bold mb-0.5 ${heading}`}>{selectedCandidate.candidateName || 'Unknown'}</h2>
                                        <div className={`text-xs sm:text-sm truncate ${sub}`}>
                                            {selectedCandidate.email !== 'Not Found' ? selectedCandidate.email : ''}
                                        </div>
                                    </div>
                                    <button onClick={closeCandidateModal} className={`p-2 rounded-full shrink-0 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}><X className="w-4 h-4" /></button>
                                </div>
                                <div className="space-y-4 sm:space-y-6 flex-1">
                                    {/* Score card */}
                                    <div className={`border p-4 sm:p-5 rounded-xl sm:rounded-2xl relative overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-${getScoreLabel(selectedCandidate.matchScore).color}-500`} />
                                        <div className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${sub}`}><BrainCircuit className="w-3.5 h-3.5" />AI Match</div>
                                        <div className="flex items-end gap-2">
                                            <span className={`text-3xl sm:text-4xl font-black text-${getScoreLabel(selectedCandidate.matchScore).color}-400`}>{selectedCandidate.matchScore}%</span>
                                            <span className={`text-xs sm:text-sm font-bold pb-1 text-${getScoreLabel(selectedCandidate.matchScore).color}-400/80`}>{getScoreLabel(selectedCandidate.matchScore).text}</span>
                                        </div>
                                    </div>
                                    {/* Matched skills */}
                                    <div>
                                        <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Matched</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedCandidate.extractedSkills?.length > 0
                                                ? selectedCandidate.extractedSkills.map((s, i) => <span key={i} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs sm:text-sm font-medium">{s}</span>)
                                                : <span className={`italic text-xs sm:text-sm ${sub}`}>No specific skills extracted.</span>}
                                        </div>
                                    </div>
                                    {/* Missing skills */}
                                    <div>
                                        <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><X className="w-3.5 h-3.5" />Missing</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedCandidate.missingSkills?.length > 0
                                                ? selectedCandidate.missingSkills.map((s, i) => <span key={i} className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs sm:text-sm font-medium">{s}</span>)
                                                : <span className="text-emerald-400 italic text-xs sm:text-sm">All required skills matched!</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className={`pt-4 sm:pt-6 border-t space-y-2.5 sm:space-y-3 mt-4 sm:mt-6 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                                    {selectedCandidate.candidateStatus !== 'Shortlisted' ? (
                                        <button onClick={() => { handleStatusChange(selectedCandidate.id, 'Shortlisted'); closeCandidateModal(); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-sm transition-all">
                                            <ThumbsUp className="w-4 h-4" />Shortlist Candidate
                                        </button>
                                    ) : (
                                        <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold text-sm opacity-50 cursor-not-allowed">
                                            <CheckCircle2 className="w-4 h-4" />Shortlisted
                                        </button>
                                    )}
                                    <div className="flex gap-2 sm:gap-3">
                                        <button onClick={() => { handleStatusChange(selectedCandidate.id, 'Rejected'); closeCandidateModal(); }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${isDark ? 'bg-slate-800 hover:bg-rose-500/10 border-slate-700 hover:border-rose-500/30 text-slate-300 hover:text-rose-400' : 'bg-gray-100 hover:bg-rose-50 border-gray-200 hover:border-rose-200 text-gray-600 hover:text-rose-500'}`}>
                                            <ThumbsDown className="w-4 h-4" />Reject
                                        </button>
                                        <a href={getCandidateFileUrl(selectedCandidate.fileName)} download={selectedCandidate.fileName}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600'}`}>
                                            <Download className="w-4 h-4" />PDF
                                        </a>
                                    </div>
                                </div>
                            </div>
                            {/* PDF preview */}
                            <div className="hidden md:flex w-full md:w-2/3 bg-[#323639] flex-col">
                                <div className={`p-3 border-b border-slate-700/50 flex items-center gap-2 text-sm font-semibold ${sub}`}>
                                    <FileBadge className="w-4 h-4" />Original Resume Preview
                                </div>
                                {getCandidateFileUrl(selectedCandidate.fileName) ? (
                                    <iframe src={`${getCandidateFileUrl(selectedCandidate.fileName)}#toolbar=0`} className="w-full flex-1 border-none" title="Resume Preview" />
                                ) : (
                                    <div className={`flex-1 flex items-center justify-center text-sm ${muted}`}>Unable to load PDF preview.</div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResumeAnalyzer;