import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Video, VideoOff, Mic, MicOff, Square, Play, Upload, CheckCircle2,
    Loader2, AlertCircle, BarChart3, RefreshCw, ChevronRight, ChevronLeft, Clock
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VideoInterview({ videoInterview, onComplete }) {
    const { isDark } = useTheme();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [vi, setVi]               = useState(videoInterview);
    const [qIdx, setQIdx]           = useState(0);
    const [recording, setRecording] = useState(false);
    const [recorded, setRecorded]   = useState(false);
    const [transcript, setTranscript] = useState('');
    const [blob, setBlob]           = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitted, setSubmitted] = useState({});  // qIdx -> result
    const [timeLeft, setTimeLeft]   = useState(120); // 2 min per question
    const [timerActive, setTimerActive] = useState(false);
    const [toast, setToast]         = useState(null);

    const videoRef       = useRef(null);
    const mediaRef       = useRef(null);
    const chunksRef      = useRef([]);
    const streamRef      = useRef(null);
    const recognitionRef = useRef(null);
    const timerRef       = useRef(null);
    const previewUrlRef  = useRef(null); // FIX #2: track object URL for cleanup

    const isDone    = vi?.status === 'submitted';
    const responses = vi?.responses || [];
    const questions = vi?.questions || [];

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // FIX #2: Full cleanup on unmount — stop camera, clear timer, revoke blob URLs
    useEffect(() => {
        return () => {
            // Stop recording if still active
            if (mediaRef.current && mediaRef.current.state !== 'inactive') {
                try { mediaRef.current.stop(); } catch (_) {}
            }
            // Release camera/mic tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            // Clear timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            // Stop speech recognition
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
            }
            // Revoke any lingering object URL
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    // Setup speech recognition
    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const r = new SR();
        r.continuous = true; r.interimResults = true; r.lang = 'en-IN';
        let final = '';
        r.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
                else interim += e.results[i][0].transcript;
            }
            setTranscript(final + interim);
        };
        // FIX #11: reset local `final` accumulator when recognition restarts
        r.onstart = () => { final = ''; };
        recognitionRef.current = r;
        return () => {
            try { r.stop(); } catch (_) {}
        };
    }, []);

    const startTimer = () => {
        setTimeLeft(120);
        setTimerActive(true);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timerRef.current); setTimerActive(false); stopRecording(); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(timerRef.current);
        setTimerActive(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }

            chunksRef.current = [];
            setTranscript('');
            const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
            const mr = new MediaRecorder(stream, { mimeType: mime });
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const b = new Blob(chunksRef.current, { type: 'video/webm' });
                setBlob(b);

                // FIX #9: Revoke the previous object URL before creating a new one
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                }
                const url = URL.createObjectURL(b);
                previewUrlRef.current = url;
                setPreviewUrl(url);

                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                    videoRef.current.src = url;
                    videoRef.current.muted = false;
                }
            };
            mr.start(1000);
            mediaRef.current = mr;

            recognitionRef.current?.start();
            startTimer();
            setRecording(true);
            setRecorded(false);
        } catch (err) {
            showToast('Could not access camera/microphone. Please check permissions.', 'error');
            console.error('getUserMedia error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRef.current && mediaRef.current.state !== 'inactive') {
            mediaRef.current.stop();
        }
        // FIX #2: stop all camera/mic tracks immediately so the camera light goes off
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        recognitionRef.current?.stop();
        stopTimer();
        setRecording(false);
        setRecorded(true);
    };

    const submitResponse = async () => {
        if (!blob && !transcript.trim()) return showToast('Please record a response first.', 'error');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('questionIndex', String(qIdx));
            fd.append('transcript', transcript);
            if (blob) fd.append('video', blob, `response_q${qIdx}.webm`);

            const { data } = await axios.post(`${API}/api/video-interviews/${vi._id}/respond`, fd, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });

            setVi(data);
            setSubmitted(prev => ({ ...prev, [qIdx]: data.aiResult }));
            showToast('Response submitted!');

            if (data.status === 'submitted') {
                onComplete?.();
            } else {
                // Advance to next question and reset state
                navigateQuestion(qIdx + 1);
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'Upload failed. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    };

    // FIX #9: Centralised question navigation that always revokes the stale previewUrl
    const navigateQuestion = (newIdx) => {
        // Revoke previous blob URL to free memory
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setQIdx(newIdx);
        setBlob(null);
        setPreviewUrl(null);
        setRecorded(false);
        setTranscript('');
    };

    // Theme tokens
    const head = isDark ? 'text-white'     : 'text-slate-900';
    const sub  = isDark ? 'text-slate-400' : 'text-slate-500';
    const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';

    if (isDone) return (
        <div className={`rounded-2xl border p-8 text-center ${card}`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className={`text-xl font-bold mb-2 ${head}`}>All responses submitted!</h3>
            <p className={`text-sm ${sub}`}>The recruiter will review your video interview and get back to you.</p>
        </div>
    );

    const result = submitted[qIdx];

    return (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
                    toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" />
                    <span className={`font-semibold text-sm ${head}`}>Video Interview</span>
                </div>
                <span className={`text-xs ${sub}`}>{responses.length}/{questions.length} submitted</span>
            </div>

            <div className="p-6 space-y-5">
                {/* Question */}
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-semibold mb-1 ${sub}`}>Question {qIdx + 1} of {questions.length}</p>
                    <p className={`text-sm font-medium leading-relaxed ${head}`}>{questions[qIdx]}</p>
                </div>

                {/* Timer */}
                {timerActive && (
                    <div className={`flex items-center gap-2 text-sm font-medium ${timeLeft <= 30 ? 'text-rose-400' : 'text-amber-400'}`}>
                        <Clock className="w-4 h-4" />
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} remaining
                    </div>
                )}

                {/* Video preview */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    controls={recorded}
                    className="w-full rounded-xl bg-black aspect-video object-cover"
                />

                {/* Live transcript */}
                {transcript && recording && (
                    <div className={`rounded-xl p-3 text-xs leading-relaxed ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <span className="font-medium">Live transcript:</span> {transcript.slice(-200)}
                    </div>
                )}

                {/* Controls */}
                {result ? (
                    <div className={`rounded-xl p-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-semibold text-sm text-emerald-400">Response submitted</span>
                            {result.score != null && (
                                <span className="ml-auto text-sm font-bold text-emerald-400">{result.score}%</span>
                            )}
                        </div>
                        {result.feedback && (
                            <p className={`text-xs leading-relaxed ${sub}`}>{result.feedback}</p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {!recording && !recorded && (
                            <button
                                onClick={startRecording}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                <Video className="w-4 h-4" /> Start Recording
                            </button>
                        )}
                        {recording && (
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition-colors animate-pulse"
                            >
                                <Square className="w-4 h-4" /> Stop Recording
                            </button>
                        )}
                        {recorded && !uploading && (
                            <>
                                <button
                                    onClick={startRecording}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                                >
                                    <RefreshCw className="w-4 h-4" /> Re-record
                                </button>
                                <button
                                    onClick={submitResponse}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Submit Response
                                </button>
                            </>
                        )}
                        {uploading && (
                            <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-400">
                                <Loader2 className="w-4 h-4 animate-spin" /> Uploading & scoring...
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2 border-t border-slate-800/50">
                    {qIdx > 0 && (
                        <button
                            onClick={() => navigateQuestion(qIdx - 1)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                    )}
                    {qIdx < questions.length - 1 && submitted[qIdx] && (
                        <button
                            onClick={() => navigateQuestion(qIdx + 1)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ml-auto ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}