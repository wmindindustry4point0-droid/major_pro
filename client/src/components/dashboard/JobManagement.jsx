import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Table, Users, Search, Download, ExternalLink, Loader2, ArrowLeft, Trash2 } from 'lucide-react';

const JobManagement = ({ user }) => {
    const [activeTab, setActiveTab] = useState('view'); // 'view', 'create'
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [newJob, setNewJob] = useState({
        title: '', description: '', requiredSkills: '', experienceLevel: '', location: ''
    });

    useEffect(() => {
        if (user?._id) fetchJobs();
    }, [user]);

    useEffect(() => {
        if (selectedJobId) {
            fetchApplicants(selectedJobId);
        }
    }, [selectedJobId]);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/jobs');
            const myJobs = res.data.filter(job => job.companyId._id === user._id || job.companyId === user._id);
            setJobs(myJobs);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchApplicants = async (jobId) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/applications/job/${jobId}`);
            setApplicants(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const skillsArray = newJob.requiredSkills.split(',').map(s => s.trim());
            await axios.post('http://localhost:5000/api/jobs', {
                ...newJob,
                requiredSkills: skillsArray,
                companyId: user._id
            });
            setNewJob({ title: '', description: '', requiredSkills: '', experienceLevel: '', location: '' });
            await fetchJobs();
            setActiveTab('view');
        } catch (err) {
            console.error(err);
            alert('Failed to post job');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteJob = async (jobId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this job and all its applications?")) return;

        try {
            await axios.delete(`http://localhost:5000/api/jobs/${jobId}`);
            fetchJobs();
        } catch (err) {
            console.error(err);
            alert("Failed to delete job.");
        }
    };

    const fadeProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Job Management</h2>
                    <p className="text-slate-400 text-sm">Post new opportunities and manage candidate applications.</p>
                </div>

                {(!selectedJobId) && (
                    <div className="flex bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('view')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'view' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Table className="w-4 h-4" />
                            Active Jobs
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Plus className="w-4 h-4" />
                            Post New Job
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* ---------- TAB: CREATE JOB ---------- */}
                {activeTab === 'create' && !selectedJobId && (
                    <motion.div key="create" {...fadeProps} className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto shadow-xl">
                        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-700/50">
                            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <Plus className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Post a New Job Opportunity</h3>
                                <p className="text-sm text-slate-400">Fill out the details below to broadcast to candidates.</p>
                            </div>
                        </div>

                        <form onSubmit={handlePostJob} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Job Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600"
                                        placeholder="e.g. Senior Machine Learning Engineer"
                                        value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} required
                                    />
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Job Description</label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600 h-32 resize-y"
                                        placeholder="Describe the responsibilities and expectations..."
                                        value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Required Skills (comma separated)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600"
                                        placeholder="Python, TensorFlow, NLP"
                                        value={newJob.requiredSkills} onChange={e => setNewJob({ ...newJob, requiredSkills: e.target.value })} required
                                    />
                                    <p className="text-xs text-slate-500 ml-1">These skills are critical for the AI matcher.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Experience Level</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent appearance-none"
                                        value={newJob.experienceLevel} onChange={e => setNewJob({ ...newJob, experienceLevel: e.target.value })} required
                                    >
                                        <option value="" disabled className="text-slate-600">Select Required Level</option>
                                        <option value="Entry Level">Entry Level</option>
                                        <option value="Mid Level">Mid Level</option>
                                        <option value="Senior Level">Senior Level</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-600"
                                        placeholder="New York, NY or Remote"
                                        value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} required
                                    />
                                </div>
                            </div>
                            <div className="pt-6">
                                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center disabled:opacity-70">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Job Listing'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* ---------- TAB: VIEW JOBS ---------- */}
                {activeTab === 'view' && !selectedJobId && (
                    <motion.div key="view" {...fadeProps} className="space-y-4">
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden">
                            {isLoading && jobs.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                                    <p>Loading active listings...</p>
                                </div>
                            ) : jobs.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold rounded-tl-xl">Job Title</th>
                                                <th className="px-6 py-4 font-semibold">Location</th>
                                                <th className="px-6 py-4 font-semibold">Posted Date</th>
                                                <th className="px-6 py-4 font-semibold">Required Skills</th>
                                                <th className="px-6 py-4 font-semibold text-right rounded-tr-xl">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {jobs.map(job => (
                                                <tr key={job._id} className="hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => setSelectedJobId(job._id)}>
                                                    <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-300 transition-colors">{job.title}</td>
                                                    <td className="px-6 py-4">{job.location}</td>
                                                    <td className="px-6 py-4 text-slate-400">{new Date(job.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                                                            {job.requiredSkills?.slice(0, 2).map((skill, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded bg-slate-700 text-xs">{skill}</span>
                                                            ))}
                                                            {job.requiredSkills?.length > 2 && <span className="px-2 py-0.5 rounded bg-slate-700 text-xs">+{job.requiredSkills.length - 2}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 font-medium transition-colors flex items-center gap-2"
                                                            >
                                                                <Users className="w-4 h-4" />
                                                                Applicants
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteJob(job._id, e)}
                                                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                                                title="Delete Job"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-16 text-center">
                                    <Table className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No jobs posted yet</h3>
                                    <p className="text-slate-500 text-sm mb-6">Create a job listing to start receiving AI-matched applications.</p>
                                    <button onClick={() => setActiveTab('create')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-block">
                                        Post First Job
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ---------- TAB: VIEW APPLICANTS FOR A SPECIFIC JOB ---------- */}
                {selectedJobId && (
                    <motion.div key="applicants" {...fadeProps} className="space-y-6">
                        <button
                            onClick={() => setSelectedJobId(null)}
                            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-lg border border-slate-700/50 w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Job List
                        </button>

                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Applicant Pipeline</h3>
                                    <p className="text-sm text-slate-400">Manage candidates who have applied for this position.</p>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-indigo-400 font-bold text-lg flex items-center gap-2 shadow-inner">
                                    <Users className="w-5 h-5 text-slate-500" />
                                    {applicants.length} Total
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="p-16 text-center flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                                    <p className="text-slate-400">Loading applicant data...</p>
                                </div>
                            ) : applicants.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">Candidate Name</th>
                                                <th className="px-6 py-4 font-semibold">Email</th>
                                                <th className="px-6 py-4 font-semibold">Applied On</th>
                                                <th className="px-6 py-4 font-semibold text-right">Resume</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {applicants.map(app => (
                                                <tr key={app._id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-white">{app.candidateId?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-indigo-300">{app.candidateId?.email || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <a
                                                            href={`http://localhost:5000/${app.resumePath}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                                                        >
                                                            <ExternalLink className="w-4 h-4" /> View PDF
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-16 text-center">
                                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No applications yet</h3>
                                    <p className="text-slate-500 text-sm">When candidates apply, their resumes will appear here.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobManagement;
