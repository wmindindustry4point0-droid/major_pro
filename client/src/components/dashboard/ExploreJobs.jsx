import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, DollarSign, Briefcase, Search, Filter } from 'lucide-react';

const ExploreJobs = () => {
    const [searchQuery, setSearchQuery] = useState('');

    // Mock Jobs Data
    const mockJobs = [
        { id: 1, title: 'Senior Machine Learning Engineer', company: 'TechNova', location: 'San Francisco, CA', type: 'Full-time', salary: '$160k - $200k', posted: '2 days ago', skills: ['Python', 'TensorFlow', 'PyTorch'], isHot: true },
        { id: 2, title: 'Frontend Developer (React)', company: 'Creative Solutions', location: 'Remote', type: 'Contract', salary: '$90k - $120k', posted: '5 hours ago', skills: ['React', 'TypeScript', 'Tailwind'], isHot: false },
        { id: 3, title: 'Data Scientist II', company: 'GlobalData Tech', location: 'New York, NY', type: 'Full-time', salary: '$130k - $160k', posted: '1 week ago', skills: ['SQL', 'R', 'Machine Learning'], isHot: false },
        { id: 4, title: 'Backend Software Engineer', company: 'FinServe', location: 'Chicago, IL', type: 'Full-time', salary: '$140k - $175k', posted: '3 days ago', skills: ['Node.js', 'Express', 'MongoDB'], isHot: true },
        { id: 5, title: 'DevOps Engineer', company: 'CloudFirst', location: 'Remote', type: 'Full-time', salary: '$135k - $165k', posted: '4 days ago', skills: ['AWS', 'Docker', 'Kubernetes'], isHot: false },
        { id: 6, title: 'AI Research Scientist', company: 'HireMind Labs', location: 'Boston, MA', type: 'Full-time', salary: '$180k - $240k', posted: 'Just now', skills: ['NLP', 'Transformers', 'Deep Learning'], isHot: true },
    ];

    const filteredJobs = mockJobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Explore Opportunities</h2>
                    <p className="text-slate-400 text-sm">Discover top jobs matched accurately by semantic AI analysis.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search jobs or companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-slate-800 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder-slate-500 text-sm"
                        />
                    </div>
                    <button className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition-colors shrink-0">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                    <motion.div
                        key={job.id}
                        variants={itemVariants}
                        className="bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:bg-slate-800 hover:border-indigo-500/30 transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden"
                    >
                        {job.isHot && (
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500/20 to-transparent w-32 h-32 rounded-bl-full -mr-8 -mt-8 pointer-events-none blur-xl"></div>
                        )}

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center font-bold text-lg text-slate-200 shadow-lg">
                                {job.company.charAt(0)}
                            </div>
                            {job.isHot && (
                                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                    High Match
                                </span>
                            )}
                        </div>

                        <div className="mb-4 flex-1 relative z-10">
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{job.title}</h3>
                            <p className="text-slate-400 text-sm">{job.company}</p>
                        </div>

                        <div className="space-y-2.5 mb-6 relative z-10">
                            <div className="flex items-center text-slate-400 text-xs gap-2">
                                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="truncate">{job.location}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-xs">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span>{job.type}</span>
                                </div>
                                <div className="flex items-center gap-2 font-medium text-slate-300">
                                    <DollarSign className="w-4 h-4 text-emerald-500/70 shrink-0" />
                                    <span>{job.salary}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto relative z-10">
                            <div className="flex flex-wrap gap-2 mb-6">
                                {job.skills.map((skill, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/50 text-slate-300 text-xs font-medium">
                                        {skill}
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button className="flex-1 bg-slate-700 hover:bg-white hover:text-slate-900 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">
                                    View Details
                                </button>
                                <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm">
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 text-center border border-dashed border-slate-700 rounded-2xl">
                        <Search className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-slate-300">No jobs found</h3>
                        <p className="text-slate-500 text-sm">Try adjusting your search criteria.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ExploreJobs;
