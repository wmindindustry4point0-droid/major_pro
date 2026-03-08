import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CandidateDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [resume, setResume] = useState(null);
    const [analyzing, setAnalyzing] = useState(null); // Job ID being analyzed
    const [analysisResult, setAnalysisResult] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs`);
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleResumeChange = (e) => {
        setResume(e.target.files[0]);
    };

    const handleAnalyze = async (job) => {
        if (!resume) {
            alert("Please upload a resume first!");
            return;
        }

        setAnalyzing(job._id);
        setAnalysisResult(null);

        // Creates a temporary application record or just hits the analyze endpoint directly?
        // The instructions say: "Candidate analyzes job before applying".
        // So we probably shouldn't create a full 'Application' record yet, or create a temp one.
        // However, the backend route /api/applications/analyze/:id expects an application ID.
        // Let's modify the flow: We'll have a direct analysis endpoint or just create a dummy application.
        // Actually, for simplicity, purely client-side or separate endpoint for "pre-analysis" is better.
        // But since I already made the backend route utilize an existing Application, I might need to adjust.
        // Wait, the backend route `analyze` uses `axios.post('http://127.0.0.1:5001/analyze'`
        // I can just call the Python service directly from here? No, CORS.
        // I should create a new backend route: /api/jobs/analyze-fit that takes resume + job details.

        // To save time, I will just create a "Dry Run" application or just add a new route to server.
        // Adding a new route is cleaner.

        // For now, let's implement the UI and I will add the route in the next step.

        const formData = new FormData();
        formData.append('resume', resume);
        formData.append('jobDescription', job.description);
        formData.append('requiredSkills', JSON.stringify(job.requiredSkills));

        try {
            // Assuming I'll add this route
            const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/jobs/analyze-fit`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setAnalysisResult({ jobId: job._id, ...res.data });
        } catch (err) {
            console.error(err);
            alert("Analysis failed");
        } finally {
            setAnalyzing(null);
        }
    };

    const handleApply = async (jobId) => {
        if (!resume) {
            alert("Please upload a resume to apply!");
            return;
        }

        const formData = new FormData();
        formData.append('candidateId', user._id);
        formData.append('jobId', jobId);
        formData.append('resume', resume);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/apply`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Applied successfully!");
        } catch (err) {
            alert("Application failed");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Available Jobs</h1>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Your Resume (PDF) for Analysis & Application
                    </label>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {jobs.map(job => (
                    <div key={job._id} className="bg-white p-6 rounded-xl shadow-md border hover:shadow-lg transition">
                        <h2 className="text-xl font-bold text-gray-800">{job.title}</h2>
                        <p className="text-gray-600 mb-2">{job.companyId.companyName}</p>
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {job.requiredSkills.map(skill => (
                                <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">{skill}</span>
                            ))}
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{job.experienceLevel}</span>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">{job.location}</span>
                        </div>

                        <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>

                        <div className="flex gap-4 items-center">
                            <button
                                onClick={() => handleAnalyze(job)}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition flex items-center gap-2"
                                disabled={analyzing === job._id}
                            >
                                {analyzing === job._id ? 'Analyzing...' : 'Analyze Fit'}
                            </button>

                            <button
                                onClick={() => handleApply(job._id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            >
                                Apply Now
                            </button>

                            {analysisResult && analysisResult.jobId === job._id && (
                                <div className="ml-auto flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded border border-yellow-200">
                                    <span className="font-bold text-yellow-800">{analysisResult.match_percentage}% Match</span>
                                    <span className="text-sm text-yellow-700">- {analysisResult.feedback}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CandidateDashboard;
