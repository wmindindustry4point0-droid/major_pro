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

    const videoRef      = useRef(null);
    const mediaRef      = useRef(null);
    const chunksRef     = useRef([]);
    const streamRef     = useRef(null);
    const recognitionRef = useRef(null);
    const timerRef      = useRef(null);

    const isDone = vi?.status === 'submitted';
    const responses = vi?.responses || [];
    const questions = vi?.questions || [];

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

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
        recognitionRef.current = r;
        return () => r.stop();
    }, []);

    const startTimer = () => {
        setTimeLeft(120);
        setTimerActive(true);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timerRef.current); stopRecording(); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    const stopTimer = () => { clearInterval(timerRef.current); setTimerActive(false); };

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
                setPreviewUrl(URL.createObjectURL(b));
                if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = URL.createObjectURL(b); videoRef.current.muted = false; }
            };
            mr.start(1000);
            mediaRef.current = mr;

            recognitionRef.current?.start();
            startTimer();
            setRecording(true);
            setRecorded(false);
        } catch (e) {
            showToast('Camera/microphone access denied. Please allow access in browser settings.', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
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
            if (blob) fd.append('video', new File([blob], `response-q${qIdx}.webm`, { type: 'video/webm' }));
            fd.append('questionIndex', qIdx);
            fd.append('transcript', transcript);

            const { data } = await axios.post(`${API}/api/video-interviews/${vi._id}/respond`, fd, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });

            setVi(data);
            setSubmitted(prev => ({ ...prev, [qIdx]: data.aiResult }));
            showToast('Response submitted!');

            if (data.status === 'submitted') {
                onComplete?.();
            } else if (qIdx < questions.length - 1) {
                setTimeout(() => {
                    setQIdx(qIdx + 1);
                    setBlob(null); setPreviewUrl(null); setRecorded(false); setTranscript('');
                }, 1500);
            }
        } catch (e) {
            showToast(e.response?.data?.error || 'Upload failed.', 'error');
        } finally { setUploading(false); }
    };

    const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const sub  = isDark ? 'text-slate-400' : 'text-slate-500';
    const head = isDark ? 'text-white' : 'text-slate-900';

    if (isDone) return (
        <div className={`border rounded-2xl p-10 text-center ${card}`}>
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h3 className={`text-xl font-bold mb-2 ${head}`}>All responses submitted!</h3>
            <p className={`text-sm ${sub}`}>The company will review your video interview and get back to you.</p>
            {vi.overallScore != null && (
                <div className="mt-5 inline-flex items-center gap-2 bg-indigo-600/20 text-indigo-300 px-5 py-2.5 rounded-xl text-sm font-medium">
                    <BarChart3 className="w-4 h-4" /> AI Score: {vi.overallScore}%
                </div>
            )}
        </div>
    );

    const currentQ = questions[qIdx];
    const alreadySubmitted = responses.some(r => r.questionIndex === qIdx);
    const result = submitted[qIdx];

    return (
        <div className="space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Progress */}
            <div className={`border rounded-2xl p-5 ${card}`}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold ${head}`}>Video Interview · Question {qIdx + 1} of {questions.length}</h3>
                    <span className={`text-xs ${sub}`}>{responses.length}/{questions.length} submitted</span>
                </div>
                <div className="flex gap-1.5">
                    {questions.map((_, i) => (
                        <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
                            responses.some(r => r.questionIndex === i) ? 'bg-emerald-500' : i === qIdx ? 'bg-indigo-500' : isDark ? 'bg-slate-700' : 'bg-slate-200'
                        }`} />
                    ))}
                </div>
            </div>

            {/* Question */}
            <div className={`border rounded-2xl p-5 ${card}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${sub}`}>Question {qIdx + 1}</p>
                <p className={`text-base font-semibold ${head}`}>{currentQ}</p>
                {vi.deadline && (
                    <p className={`text-xs mt-2 flex items-center gap-1.5 ${sub}`}>
                        <Clock className="w-3.5 h-3.5" /> Due: {new Date(vi.deadline).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Video recorder */}
            {!alreadySubmitted ? (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    {/* Video preview */}
                    <div className="relative bg-slate-950 aspect-video">
                        <video
                            ref={videoRef}
                            autoPlay={recording}
                            controls={recorded}
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {!recording && !recorded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="w-16 h-16 text-slate-700" />
                            </div>
                        )}
                        {recording && (
                            <div className="absolute top-3 left-3 flex items-center gap-2 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                REC · {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-4 space-y-3">
                        {transcript && (
                            <div className={`text-xs px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <span className="font-medium">Live transcript:</span> {transcript.slice(-200)}
                            </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                            {!recording && !recorded && (
                                <button onClick={startRecording}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition">
                                    <Video className="w-4 h-4" /> Start Recording
                                </button>
                            )}
                            {recording && (
                                <button onClick={stopRecording}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition animate-pulse">
                                    <Square className="w-4 h-4" /> Stop Recording
                                </button>
                            )}
                            {recorded && (
                                <>
                                    <button onClick={startRecording}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <RefreshCw className="w-4 h-4" /> Re-record
                                    </button>
                                    <button onClick={submitResponse} disabled={uploading}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {uploading ? 'Uploading...' : 'Submit Response'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`border rounded-2xl p-5 ${card}`}>
                    <div className="flex items-center gap-2 mb-3 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">Response submitted</span>
                    </div>
                    {result && (
                        <div className="grid grid-cols-3 gap-3">
                            {[['Overall', result.score], ['Content', result.contentScore], ['Communication', result.commScore]].map(([label, val]) => (
                                <div key={label} className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                    <p className={`text-xs ${sub}`}>{label}</p>
                                    <p className={`text-xl font-bold mt-1 ${val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-yellow-400' : 'text-rose-400'}`}>{val ?? '—'}%</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {result?.feedback && <p className={`text-sm mt-3 ${sub}`}>{result.feedback}</p>}
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
                <button onClick={() => { setQIdx(q => q - 1); setBlob(null); setPreviewUrl(null); setRecorded(false); setTranscript(''); }}
                    disabled={qIdx === 0}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition disabled:opacity-30 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {qIdx < questions.length - 1 && (
                    <button onClick={() => { setQIdx(q => q + 1); setBlob(null); setPreviewUrl(null); setRecorded(false); setTranscript(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}