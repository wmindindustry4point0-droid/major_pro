import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Plus, Settings2, FileText, Users, Target, Download, UploadCloud, ChevronRight, CheckCircle2, Loader2, X, Eye, ThumbsUp, ThumbsDown, Trophy, FileBadge } from 'lucide-react';
import axios from 'axios';

const ResumeAnalyzer = ({ user }) => {
    const [workspace, setWorkspace] = useState(null); // null means landing
    const [savedWorkspaces, setSavedWorkspaces] = useState([]);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
    const [activeTab, setActiveTab] = useState('description');

    useEffect(() => {
        if (user && user._id) {
            fetchWorkspaces();
        }
    }, [user]);

    const fetchWorkspaces = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs/workspaces/${user._id}`);
            setSavedWorkspaces(res.data);
        } catch (err) {
            console.error("Error fetching workspaces", err);
        } finally {
            setIsLoadingWorkspaces(false);
        }
    };

    // Form States
    const [jobTitle, setJobTitle] = useState('Machine Learning Engineer');
    const [jobDescription, setJobDescription] = useState('We are looking for an ML Engineer to build and deploy generative models...');
    const [skillsInput, setSkillsInput] = useState('Python, TensorFlow, PyTorch');
    const [requiredSkills, setRequiredSkills] = useState(['Python', 'Machine Learning', 'TensorFlow']);

    // Upload & Analysis States
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState([]); // from API
    const [error, setError] = useState('');

    // Modal & Actions State
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const tabs = [
        { id: 'description', label: 'Job Description', icon: FileText },
        { id: 'filters', label: 'Requirement Filters', icon: Settings2 },
        { id: 'upload', label: 'Upload Resumes', icon: UploadCloud },
        { id: 'candidates', label: 'View Candidates', icon: Users },
        { id: 'results', label: 'AI Results', icon: Target },
        { id: 'reports', label: 'Reports', icon: Download },
    ];

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
            const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs/workspaces`, newWorkspace);
            setSavedWorkspaces([res.data, ...savedWorkspaces]);
            loadWorkspace(res.data);
        } catch (err) {
            console.error("Failed to create workspace", err);
        }
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
        if (!workspace || !workspace._id) return;
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs/workspaces/${workspace._id}`, updates);
            setWorkspace(res.data);
            setSavedWorkspaces(prev => prev.map(w => w._id === res.data._id ? res.data : w));
        } catch (err) {
            console.error("Failed to save workspace state", err);
        }
    };

    const handleAddSkill = () => {
        const input = window.prompt("Enter a strictly required skill:");
        if (input && !requiredSkills.includes(input.trim())) {
            setRequiredSkills([...requiredSkills, input.trim()]);
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setRequiredSkills(requiredSkills.filter(s => s !== skillToRemove));
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
        setSelectedFiles([...selectedFiles, ...validFiles]);
    };

    const runAnalysis = async () => {
        if (selectedFiles.length === 0) {
            setError('Please upload at least one PDF resume.');
            return;
        }

        setIsAnalyzing(true);
        setError('');

        const formData = new FormData();
        formData.append('jobDescription', jobDescription);
        formData.append('requiredSkills', JSON.stringify(requiredSkills));

        selectedFiles.forEach(file => {
            formData.append('resumes', file);
        });

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs/analyze-workspace`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.analyzed_candidates) {
                setAnalysisResults(response.data.analyzed_candidates);
                setActiveTab('results'); // Auto-jump to results
                await saveWorkspaceState({
                    analysisResults: response.data.analyzed_candidates,
                    status: 'Completed'
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to process resumes. Ensure AI service is running.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportCSV = () => {
        if (analysisResults.length === 0) return;

        const headers = ["Rank", "Candidate Name", "Email", "Phone", "Match Score", "Skills Found", "Missing Skills", "Status"];
        const rows = analysisResults.map(r => [
            r.rank || 'N/A',
            r.candidateName || 'Unknown',
            r.email || 'N/A',
            r.phone || 'N/A',
            r.matchScore ? `${r.matchScore}%` : 'N/A',
            (r.extractedSkills || []).join('; '),
            (r.missingSkills || []).join('; '),
            r.status
        ]);

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `hiremind_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handleStatusChange = (candidateId, newStatus) => {
        setAnalysisResults(prev => prev.map(c =>
            c.id === candidateId ? { ...c, candidateStatus: newStatus } : c
        ));
    };

    const openCandidateModal = (candidate) => {
        setSelectedCandidate(candidate);
        setIsModalOpen(true);
    };

    const closeCandidateModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedCandidate(null), 300); // clear after animation
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return { text: 'Strong Match', color: 'emerald' };
        if (score >= 50) return { text: 'Moderate Match', color: 'yellow' };
        return { text: 'Weak Match', color: 'rose' };
    };

    const fadeProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.2 }
    };

    const getCandidateFileUrl = (fileName) => {
        const file = selectedFiles.find(f => f.name === fileName);
        return file ? URL.createObjectURL(file) : null;
    };

    // --- SUB-VIEWS ---

    const renderDescription = () => (
        <div className="space-y-6 max-w-4xl">
            <h3 className="text-xl font-bold text-white mb-6">Define Job Description</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 ml-1">Job Title</label>
                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300 ml-1">General Skills Map</label>
                    <input type="text" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300 ml-1">Detailed Job Description (Used for BERT Embeddings)</label>
                    <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl h-48 focus:ring-2 focus:ring-indigo-500/50" />
                    <p className="text-xs text-slate-500 mt-1">The AI will use this entire text to build a contextual vector for candidate comparison.</p>
                </div>
            </div>
            <button onClick={() => { saveWorkspaceState({ jobTitle, jobDescription, skillsInput, requiredSkills }); setActiveTab('filters'); }} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                Save & Continue <ChevronRight className="w-4 h-4" />
            </button>
        </div >
    );

    const renderFilters = () => (
        <div className="space-y-6 max-w-4xl">
            <h3 className="text-xl font-bold text-white mb-6">AI Requirement Filters</h3>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl space-y-6">
                <div>
                    <h4 className="text-slate-300 font-semibold mb-3">Must-Have Skills (Used for Gap Analysis)</h4>
                    <p className="text-xs text-slate-500 mb-4">The AI will specifically check if these exact skills exist in the candidate's parsed resume.</p>
                    <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {skill}</span>
                                <button onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-400"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        <button onClick={handleAddSkill} className="px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-sm hover:text-white transition-colors border-dashed">
                            + Add Skill
                        </button>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                    <button onClick={() => { saveWorkspaceState({ requiredSkills }); setActiveTab('upload'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                        Apply Filters & Continue <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderUpload = () => (
        <div className="space-y-8 max-w-4xl">
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <label className="block border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-16 text-center hover:bg-indigo-500/10 transition-colors cursor-pointer group">
                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileSelect} />
                <UploadCloud className="w-16 h-16 text-indigo-400 mx-auto mb-4 group-hover:-translate-y-2 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">Select Resumes</h3>
                <p className="text-slate-400">Upload PDF files to screen (multiple allowed)</p>
                <div className="mt-8 inline-block bg-slate-800 text-white px-6 py-3 rounded-xl font-medium border border-slate-700 transition-colors pointer-events-none">
                    Browse Files
                </div>
            </label>

            {selectedFiles.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-white font-bold">{selectedFiles.length} Resume(s) Queued</h4>
                        <button
                            onClick={runAnalysis}
                            disabled={isAnalyzing}
                            className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105'}`}
                        >
                            {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing via BERT...</> : <><BrainCircuit className="w-5 h-5" /> Start AI Batch Analysis</>}
                        </button>
                    </div>
                    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {selectedFiles.map((f, i) => (
                            <li key={i} className="flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                <span className="text-slate-300 truncate">{f.name}</span>
                                <span className="text-slate-500 text-xs">Pending</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    const renderCandidates = () => {
        if (analysisResults.length === 0) {
            return <div className="text-slate-400 text-center py-12">No candidates analyzed yet. Go to 'Upload' and run analysis.</div>;
        }

        return (
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Candidate File</th>
                            <th className="px-6 py-4">Extracted Name / Email</th>
                            <th className="px-6 py-4">Parsed Tech Skills</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {analysisResults.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 text-slate-400 truncate max-w-[150px]">{r.fileName}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">{r.candidateName || 'Unknown'}</div>
                                    <div className="text-xs text-slate-500">{r.email || 'N/A'} • {r.phone || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                                        {r.extractedSkills?.length > 0 ? r.extractedSkills.map((s, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{s}</span>
                                        )) : <span className="text-slate-500 italic text-xs">None matched from Dict</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {r.status === 'Success'
                                        ? <span className="text-emerald-400 flex items-center gap-1 text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Extracted</span>
                                        : <span className="text-rose-400 text-xs">{r.error || 'Failed'}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderResults = () => {
        if (analysisResults.length === 0) {
            return <div className="text-slate-400 text-center py-12">No rankings available yet. Run analysis first.</div>;
        }

        // Filter successes and sort by matchScore DESC
        const validResults = [...analysisResults].filter(r => r.status === 'Success').sort((a, b) => b.matchScore - a.matchScore);

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">AI Candidate Ranking</h3>
                    <div className="px-4 py-2 bg-indigo-500/10 text-indigo-300 rounded-lg text-sm border border-indigo-500/20">
                        Ranked via <b>all-MiniLM-L6-v2</b> Contextual Similarity
                    </div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Candidate</th>
                                <th className="px-6 py-4">Extracted Skills</th>
                                <th className="px-6 py-4">Missing Requirements</th>
                                <th className="px-6 py-4">BERT Match Score</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {validResults.map((r, i) => {
                                const scoreInfo = getScoreLabel(r.matchScore);
                                const isTop = i === 0;

                                return (
                                    <tr key={r.id} className={`transition-colors ${isTop ? "bg-indigo-500/10 border-l-4 border-l-indigo-500 shadow-[inset_0_0_20px_rgba(99,102,241,0.15)]" : "hover:bg-slate-800/50"}`}>
                                        <td className="px-6 py-4 relative">
                                            {isTop && (
                                                <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-500/50">
                                                    <Trophy className="w-3 h-3" /> Best Match
                                                </div>
                                            )}
                                            <div className={`font-black ${isTop ? 'text-indigo-400 text-2xl mt-2' : i < 3 ? 'text-purple-400 text-xl' : 'text-slate-500 text-lg'}`}>
                                                #{i + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white mb-1">
                                                {r.candidateName || r.fileName}
                                            </div>
                                            {/* Status Badge */}
                                            {r.candidateStatus === 'Shortlisted' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                                                    <CheckCircle2 className="w-3 h-3" /> Shortlisted
                                                </span>
                                            ) : r.candidateStatus === 'Rejected' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase border border-rose-500/30">
                                                    <X className="w-3 h-3" /> Rejected
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border border-slate-700">
                                                    Pending Review
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="line-clamp-2 max-w-[200px] text-xs leading-relaxed text-slate-400">
                                                {r.extractedSkills?.join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {r.missingSkills?.length > 0 ? r.missingSkills.map((s, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[10px] uppercase font-bold">{s}</span>
                                                )) : <span className="text-emerald-400 text-xs">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 max-w-[140px]">
                                                <div className="flex items-end justify-between">
                                                    <span className={`font-black text-xl text-${scoreInfo.color}-400`}>
                                                        {r.matchScore}%
                                                    </span>
                                                    <span className={`text-[10px] font-bold text-${scoreInfo.color}-400/80 mb-1`}>
                                                        {scoreInfo.text}
                                                    </span>
                                                </div>
                                                {/* Colored Progress Bar */}
                                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${r.matchScore}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }}
                                                        className={`h-full bg-${scoreInfo.color}-500 shadow-[0_0_10px_currentColor]`}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openCandidateModal(r)}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 tooltip"
                                                    title="View Resume & AI Insights"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {r.candidateStatus !== 'Shortlisted' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(r.id, 'Shortlisted')}
                                                        className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-slate-700 hover:border-emerald-500/50 tooltip"
                                                        title="Shortlist"
                                                    >
                                                        <ThumbsUp className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/50 opacity-50 cursor-not-allowed"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleStatusChange(r.id, 'Rejected')}
                                                    className={`p-2 rounded-lg transition-colors border ${r.candidateStatus === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : 'bg-slate-800 hover:bg-rose-500/20 text-rose-400 border-slate-700 hover:border-rose-500/50'}`}
                                                    title="Reject"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div onClick={handleExportCSV} className="bg-slate-800/40 border border-slate-700 p-8 rounded-2xl text-center hover:bg-slate-800 transition-colors cursor-pointer group">
                <Download className="w-12 h-12 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-white font-bold mb-2">CSV Pipeline Export</h4>
                <p className="text-slate-400 text-sm">Download full candidate dataset including rankings & gaps</p>
            </div>
            <div className={`bg-slate-800/40 border p-8 rounded-2xl text-center transition-colors group relative overflow-hidden ${analysisResults.length > 0 ? 'border-indigo-500/30 hover:bg-slate-800 cursor-pointer' : 'border-slate-800 opacity-50 cursor-not-allowed'}`}>
                {analysisResults.length > 0 && <div className="absolute inset-0 bg-indigo-500/5"></div>}
                <div className="relative z-10">
                    <Target className={`w-12 h-12 mx-auto mb-4 transition-transform ${analysisResults.length > 0 ? 'text-indigo-400 group-hover:scale-110' : 'text-slate-600'}`} />
                    <h4 className="text-white font-bold mb-2">Export Shortlisted</h4>
                    <p className="text-slate-400 text-sm">Download top 20% matches</p>
                </div>
            </div>
        </div>
    );

    // --- MAIN RENDER ---

    if (!workspace) {
        return (
            <div className="h-full pt-10 pb-20">
                {/* Hero Create Section */}
                <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-3xl mb-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-tr-full blur-3xl"></div>

                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 relative z-10">
                        <BrainCircuit className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 relative z-10">AI Resume Analyzer</h2>
                    <p className="text-slate-400 text-center max-w-lg mb-8 mx-auto relative z-10">
                        Create a dedicated workspace to batch process resumes against a specific job description. Our BERT semantic engine extracts metadata and ranks candidates based on deep contextual similarity.
                    </p>
                    <button
                        onClick={handleCreateWorkspace}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-3 text-lg group mx-auto relative z-10"
                    >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" /> Create New AI Workspace
                    </button>
                </div>

                {/* Saved Workspaces Grid */}
                {isLoadingWorkspaces ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : savedWorkspaces.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <FileBadge className="w-6 h-6 text-indigo-400" /> Recent Workspaces
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedWorkspaces.map(ws => (
                                <div key={ws._id} onClick={() => loadWorkspace(ws)} className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 p-6 rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden relative shadow-lg">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <h4 className="text-lg font-bold text-white flex-1 pr-4 line-clamp-1">{ws.name}</h4>
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${ws.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                            {ws.status}
                                        </span>
                                    </div>
                                    <div className="space-y-3 mb-6 relative z-10">
                                        <p className="text-sm text-slate-400 flex items-center gap-3"><Target className="w-4 h-4 text-slate-500" /> <span className="line-clamp-1">{ws.jobTitle}</span></p>
                                        <p className="text-sm text-slate-400 flex items-center gap-3"><Users className="w-4 h-4 text-slate-500" /> {ws.analysisResults?.length || 0} Candidates</p>
                                    </div>
                                    <div className="flex justify-between items-center relative z-10 pt-4 border-t border-slate-800">
                                        <span className="text-xs text-slate-500">{new Date(ws.createdAt).toLocaleDateString()}</span>
                                        <span className="text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 transition-colors">Resume <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Workspace Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold tracking-wider mb-2">
                        <BrainCircuit className="w-4 h-4" /> ACTIVE WORKSPACE
                    </div>
                    <h2 className="text-3xl font-bold text-white">{workspace.name}</h2>
                </div>
                <button onClick={() => setWorkspace(null)} className="text-rose-400 hover:text-rose-300 text-sm pb-1 border-b border-transparent hover:border-rose-400 transition-all flex gap-2 items-center">
                    <X className="w-4 h-4" /> Close Workspace
                </button>
            </div>

            {/* Internal Navigation Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const hasResults = tab.id === 'results' && analysisResults.length > 0;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap relative ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {hasResults && !isActive && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/20 p-2 min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} {...fadeProps}>
                        {activeTab === 'description' && renderDescription()}
                        {activeTab === 'filters' && renderFilters()}
                        {activeTab === 'upload' && renderUpload()}
                        {activeTab === 'candidates' && renderCandidates()}
                        {activeTab === 'results' && renderResults()}
                        {activeTab === 'reports' && renderReports()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* AI Insights & Resume Preview Modal */}
            <AnimatePresence>
                {isModalOpen && selectedCandidate && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCandidateModal}
                    >
                        <motion.div
                            className="w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: -20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Left Panel: Explainable AI Insights */}
                            <div className="w-full md:w-1/3 bg-slate-800/30 p-6 overflow-y-auto border-r border-slate-700/50 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">{selectedCandidate.candidateName || 'Unknown Candidate'}</h2>
                                        <div className="text-sm text-slate-400">
                                            {selectedCandidate.email !== 'Not Found' ? selectedCandidate.email : ''}
                                            {selectedCandidate.phone !== 'Not Found' ? ` • ${selectedCandidate.phone}` : ''}
                                        </div>
                                    </div>
                                    <button onClick={closeCandidateModal} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6 flex-1">
                                    {/* Score Card */}
                                    <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-${getScoreLabel(selectedCandidate.matchScore).color}-500`}></div>
                                        <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4" /> AI Match Analysis
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <span className={`text-4xl font-black text-${getScoreLabel(selectedCandidate.matchScore).color}-400`}>
                                                {selectedCandidate.matchScore}%
                                            </span>
                                            <span className={`text-sm font-bold pb-1 text-${getScoreLabel(selectedCandidate.matchScore).color}-400/80`}>
                                                {getScoreLabel(selectedCandidate.matchScore).text}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Matched Skills */}
                                    <div>
                                        <h4 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Matched Requirements
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCandidate.extractedSkills?.length > 0 ? selectedCandidate.extractedSkills.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
                                                    {s}
                                                </span>
                                            )) : <span className="text-slate-500 italic text-sm">No specific tech skills extracted.</span>}
                                        </div>
                                    </div>

                                    {/* Missing Skills */}
                                    <div>
                                        <h4 className="text-rose-400 text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <X className="w-4 h-4" /> Missing Expectations
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCandidate.missingSkills?.length > 0 ? selectedCandidate.missingSkills.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm font-medium">
                                                    {s}
                                                </span>
                                            )) : <span className="text-emerald-400 italic text-sm">All strictly required skills matched!</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Base */}
                                <div className="pt-6 border-t border-slate-700/50 space-y-3 mt-6">
                                    {selectedCandidate.candidateStatus !== 'Shortlisted' ? (
                                        <button
                                            onClick={() => { handleStatusChange(selectedCandidate.id, 'Shortlisted'); closeCandidateModal(); }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-all"
                                        >
                                            <ThumbsUp className="w-5 h-5" /> Shortlist Candidate
                                        </button>
                                    ) : (
                                        <button disabled className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold opacity-50 cursor-not-allowed">
                                            <CheckCircle2 className="w-5 h-5" /> Shortlisted
                                        </button>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { handleStatusChange(selectedCandidate.id, 'Rejected'); closeCandidateModal(); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 rounded-xl font-bold transition-all"
                                        >
                                            <ThumbsDown className="w-5 h-5" /> Reject
                                        </button>
                                        <a
                                            href={getCandidateFileUrl(selectedCandidate.fileName)}
                                            download={selectedCandidate.fileName}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                                        >
                                            <Download className="w-5 h-5" /> PDF
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Resume Preview */}
                            <div className="w-full md:w-2/3 bg-[#323639] relative flex flex-col">
                                <div className="p-3 bg-slate-900 border-b border-slate-700/50 flex items-center gap-2 text-slate-400 text-sm font-semibold">
                                    <FileBadge className="w-4 h-4" /> Original Resume Preview
                                </div>
                                {getCandidateFileUrl(selectedCandidate.fileName) ? (
                                    <iframe
                                        src={`${getCandidateFileUrl(selectedCandidate.fileName)}#toolbar=0`}
                                        className="w-full flex-1 border-none"
                                        title="Resume Preview"
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-slate-500">
                                        Unable to load PDF preview from local memory.
                                    </div>
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
