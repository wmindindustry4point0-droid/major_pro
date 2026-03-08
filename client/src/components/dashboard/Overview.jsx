import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, FileText, Target, TrendingUp, TrendingDown, BrainCircuit } from 'lucide-react';

const Overview = () => {
    // Mock Data for demonstration
    const stats = [
        { label: "Total Jobs Posted", value: "12", change: "+2", trend: "up", icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { label: "Total Applicants", value: "842", change: "+14%", trend: "up", icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
        { label: "Resumes Analyzed", value: "790", change: "+22%", trend: "up", icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Shortlisted Candidates", value: "48", change: "-5%", trend: "down", icon: Target, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    ];

    const distributionData = [
        { range: "90-100%", count: 15, height: "h-12", color: "bg-indigo-400" },
        { range: "80-89%", count: 45, height: "h-32", color: "bg-indigo-500" },
        { range: "70-79%", count: 120, height: "h-48", color: "bg-purple-500" },
        { range: "60-69%", count: 210, height: "h-64", color: "bg-purple-600" },
        { range: "50-59%", count: 180, height: "h-56", color: "bg-pink-600" },
        { range: "<50%", count: 220, height: "h-72", color: "bg-slate-700" },
    ];

    const topSkills = [
        { skill: "React.js", percentage: 85, color: "from-blue-500 to-indigo-500" },
        { skill: "Python", percentage: 72, color: "from-indigo-500 to-purple-500" },
        { skill: "Machine Learning", percentage: 64, color: "from-purple-500 to-pink-500" },
        { skill: "Node.js", percentage: 58, color: "from-pink-500 to-rose-500" },
        { skill: "TensorFlow", percentage: 41, color: "from-slate-400 to-slate-600" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-slate-400 text-sm">Welcome back to HireMind AI. Here's what's happening today.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} className={`p-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border ${stat.border} hover:bg-slate-800 transition-colors group relative overflow-hidden`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150`}></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${stat.bg} border ${stat.border}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {stat.change}
                                </div>
                            </div>
                            <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
                            <div className="text-3xl font-bold text-white">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution Chart (CSS) */}
                <motion.div variants={itemVariants} className="p-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white">Candidate Match Distribution</h3>
                        <Target className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="h-72 flex items-end justify-between gap-2 pb-6 border-b border-slate-700/50 relative">
                        {/* Y-axis labels mock */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-500 font-medium -ml-2 -mt-2">
                            <span>250</span>
                            <span>125</span>
                            <span>0</span>
                        </div>

                        {distributionData.map((data, i) => (
                            <div key={i} className="flex flex-col items-center flex-1 z-10 group cursor-pointer ml-6">
                                <div className="text-xs text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{data.count}</div>
                                <div className={`w-full max-w-[40px] ${data.height} ${data.color} rounded-t-md group-hover:opacity-80 transition-all group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]`}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 ml-6 pl-2 pr-2">
                        {distributionData.map((data, i) => (
                            <div key={i} className="text-xs font-medium text-slate-400 text-center w-8">{data.range}</div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Skills Chart (CSS Progress Bars) */}
                <motion.div variants={itemVariants} className="p-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white">Top Extracted Skills</h3>
                        <BrainCircuit className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="space-y-6">
                        {topSkills.map((item, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">{item.skill}</span>
                                    <span className="text-xs font-bold text-slate-400">{item.percentage}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.percentage}%` }}
                                        transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                        className={`h-full rounded-full bg-gradient-to-r ${item.color} group-hover:opacity-80 transition-opacity relative`}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/20"></div>
                                    </motion.div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-8 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 hover:text-white transition-all">
                        View Full Skill Analytics
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Overview;
