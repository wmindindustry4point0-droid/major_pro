import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Briefcase, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BrowseJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [applyingTo, setApplyingTo] = useState(null);
    
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [jobsRes, appsRes, profileRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs`),
                axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/candidate/${user._id}`),
                axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/candidate/profile/${user._id}`).catch(() => ({ data: null }))
            ]);

            setJobs(jobsRes.data);
            setApplications(appsRes.data);
            setProfile(profileRes.data);
        } catch (error) {
            console.error("Error fetching jobs:", error);
        }
    };

    const hasApplied = (jobId) => {
        return applications.some(app => app.jobId._id === jobId || app.jobId === jobId);
    };

    const handleApply = async (jobId) => {
        if (!profile || !profile.resumeUrl) {
            alert("Please upload your resume in the 'Resume Profile' tab before applying.");
            return;
        }

        setApplyingTo(jobId);

        try {
            // Note: Our apply route currently expects a FormData with 'resume' file.
            // Since the resume is already on the server in CandidateProfile, 
            // the server route `POST /api/applications/apply` needs to be updated or we
            // handle it here. Wait, `appRoutes.js` apply endpoint takes `upload.single('resume')`.
            // Let's create a specialized 'apply-saved' route in candidateRoutes or 
            // just send a POST to a new endpoint we will add: `/api/candidate/apply`.
            // We shouldn't upload a new file. We just pass the existing resume path.
            
            await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/candidate/apply`, {
                candidateId: user._id,
                jobId: jobId,
                resumePath: profile.resumeUrl // Pass the resolved URL locally
            });

            // Refetch apps
            const appsRes = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/candidate/${user._id}`);
            setApplications(appsRes.data);
            
        } catch (error) {
            console.error("Application failed", error);
            alert("Application failed. Please try again.");
        } finally {
            setApplyingTo(null);
        }
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        job.companyId?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Internal Job Board</h2>
                    <p className="text-slate-400">Discover and apply to open roles tailored to your semantic skills.</p>
                </div>
                
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search by title or company..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    />
                </div>
            </div>

            {!profile && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-500">Resume Required</h4>
                        <p className="text-sm text-yellow-500/80">You must upload your resume in the Profile tab before you can apply to any jobs.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence>
                    {filteredJobs.map((job) => (
                        <motion.div 
                            key={job._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-colors group flex flex-col md:flex-row gap-6 md:items-center justify-between"
                        >
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {job.title}
                                    </h3>
                                    <p className="text-slate-400 font-medium">{job.companyId?.companyName || 'Hiring Company'}</p>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</span>
                                    <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.experienceLevel || 'Mid Level'}</span>
                                    {job.postedAt && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(job.postedAt).toLocaleDateString()}</span>}
                                </div>
                                
                                <div className="flex gap-2 flex-wrap">
                                    {job.requiredSkills?.slice(0, 5).map(skill => (
                                        <span key={skill} className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                                            {skill}
                                        </span>
                                    ))}
                                    {(job.requiredSkills?.length || 0) > 5 && (
                                        <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-500 rounded-md">
                                            +{(job.requiredSkills?.length || 0) - 5}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="shrink-0 flex flex-col items-end gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                {hasApplied(job._id) ? (
                                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-6 py-3 rounded-xl border border-emerald-500/20 font-bold">
                                        <CheckCircle2 className="w-5 h-5" /> Applied
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleApply(job._id)}
                                        disabled={applyingTo === job._id || !profile}
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                    >
                                        {applyingTo === job._id ? 'Submitting...' : (
                                            <>Apply Now <Send className="w-4 h-4" /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                {filteredJobs.length === 0 && (
                    <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                        No jobs found matching "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowseJobs;
