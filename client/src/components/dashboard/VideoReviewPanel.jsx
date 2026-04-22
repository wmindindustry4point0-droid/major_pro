import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Play, Pause, BarChart3, MessageSquare, ChevronLeft,
    ChevronRight, Loader2, CheckCircle2, AlertCircle,
    Mic, TrendingUp, TrendingDown, Clock, X, Eye
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const scoreColor = (s) => s == null ? 'text-slate-400' : s >= 70 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-rose-400';
const scoreBg    = (s) => s == null ? 'bg-slate-600' : s >= 70 ? 'bg-emerald-500' : s >= 50 ? 'bg-yellow-500' : 'bg-rose-500';
const statusBadge = {
    pending:     { label: '⏳ Pending',      cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    in_progress: { label: '🔄 In Progress',  cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    submitted:   { label: '✅ Submitted',    cls: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    reviewed:    { label: '👁 Reviewed',     cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export default function VideoReviewPanel({ videoInterviewId, candidateName, onClose }) {
    const { isDark } = useTheme();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [vi, setVi]                 = useState(null);
    const [loading, setLoading]       = useState(true);
    const [marking, setMarking]       = useState(false);
    const [qIdx, setQIdx]             = useState(0);
    const [tab, setTab]               = useState('score');
    const videoRef                    = useRef(null);

    const load = async () => {
        try {
            const { data } = await axios.get(`${API}/api/video-interviews/${videoInterviewId}`, { headers });
            setVi(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [videoInterviewId]);

    // FIX #8: Mark as reviewed action
    const markReviewed = async () => {
        setMarking(true);
        try {
            await axios.patch(`${API}/api/video-interviews/${videoInterviewId}/status`, { status: 'reviewed' }, { headers });
            setVi(prev => ({ ...prev, status: 'reviewed' }));
        } catch (e) {
            console.error('Failed to mark reviewed:', e);
        } finally {
            setMarking(false);
        }
    };

    const card  = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const sub   = isDark ? 'text-slate-400' : 'text-slate-500';
    const head  = isDark ? 'text-white' : 'text-slate-900';
    const inner = isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200';

    if (loading) return (
        <div className={`border rounded-2xl p-12 text-center ${card}`}>
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className={`text-sm ${sub}`}>Loading results...</p>
        </div>
    );

    if (!vi) return (
        <div className={`border rounded-2xl p-12 text-center ${card}`}>
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <p className={`text-sm ${sub}`}>Could not load video interview.</p>
        </div>
    );

    const responses = vi.responses || [];
    const questions = vi.questions || [];
    const response  = responses.find(r => r.questionIndex === qIdx);
    const badge     = statusBadge[vi.status] || statusBadge.pending;
    const sm        = response?.speechMetrics || {};
    const hasAssemblyAI = sm && Object.keys(sm).length > 0;

    return (
        <div className={`border rounded-2xl overflow-hidden ${card}`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100'}`}>
                <div>
                    <h3 className={`font-bold text-lg ${head}`}>{candidateName || vi.candidateId?.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <p className={`text-sm ${sub}`}>{vi.jobId?.title}</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badge.cls}`}>{badge.label}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {vi.overallScore != null && (
                        <div className="text-center">
                            <p className={`text-3xl font-bold ${scoreColor(vi.overallScore)}`}>{vi.overallScore}%</p>
                            <p className={`text-xs ${sub}`}>Overall</p>
                        </div>
                    )}
                    {/* FIX #8: Mark as Reviewed button — only shown when status is 'submitted' */}
                    {vi.status === 'submitted' && (
                        <button
                            onClick={markReviewed}
                            disabled={marking}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white transition"
                        >
                            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            {marking ? 'Marking...' : 'Mark Reviewed'}
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className={`p-2 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* Question progress bar */}
                <div className="flex gap-1.5">
                    {questions.map((_, i) => {
                        const r = responses.find(r => r.questionIndex === i);
                        return (
                            <button key={i} onClick={() => setQIdx(i)}
                                className={`flex-1 h-8 rounded-lg border text-xs font-medium transition ${
                                    i === qIdx
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : r
                                            ? `border-transparent ${scoreBg(r.aiScore)} text-white opacity-80 hover:opacity-100`
                                            : isDark ? 'border-slate-700 text-slate-500 hover:bg-slate-800' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                                }`}>
                                Q{i + 1}{r ? ` · ${r.aiScore ?? '—'}%` : ''}
                            </button>
                        );
                    })}
                </div>

                {/* Current question */}
                <div className={`p-4 rounded-xl border ${inner}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${sub}`}>Question {qIdx + 1}</p>
                    <p className={`text-sm font-medium ${head}`}>{questions[qIdx]}</p>
                </div>

                {!response ? (
                    <div className={`p-8 rounded-xl border text-center border-dashed ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Candidate hasn't submitted this response yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Video player */}
                        {response.videoUrl ? (
                            <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video">
                                <video ref={videoRef} src={response.videoUrl} controls className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className={`rounded-xl p-6 text-center border ${inner}`}>
                                <p className={`text-sm ${sub}`}>Video not available (no recording uploaded)</p>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-2">
                            {[['score', 'AI Scores', BarChart3], ['transcript', 'Transcript', MessageSquare], ['speech', 'Speech Analysis', Mic]].map(([id, label, Icon]) => (
                                <button key={id} onClick={() => setTab(id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                        tab === id
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}>
                                    <Icon className="w-3.5 h-3.5" />{label}
                                </button>
                            ))}
                        </div>

                        {/* Tab: AI Scores */}
                        {tab === 'score' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    {[['Overall', response.aiScore], ['Content', response.contentScore], ['Communication', response.commScore]].map(([label, val]) => (
                                        <div key={label} className={`rounded-xl p-4 text-center border ${inner}`}>
                                            <p className={`text-xs ${sub} mb-1`}>{label}</p>
                                            <p className={`text-2xl font-bold ${scoreColor(val)}`}>{val ?? '—'}%</p>
                                            {val != null && (
                                                <div className={`mt-2 w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                    <div className={`h-full rounded-full ${scoreBg(val)}`} style={{ width: `${val}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {response.feedback && (
                                    <div className={`p-4 rounded-xl border-l-4 border-indigo-500 ${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                                        <p className="text-xs font-bold uppercase tracking-wider mb-1.5 text-indigo-400">AI Feedback</p>
                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{response.feedback}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    {response.strengths?.length > 0 && (
                                        <div className={`p-3.5 rounded-xl border ${inner}`}>
                                            <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Strengths</p>
                                            {response.strengths.map((s, i) => <p key={i} className={`text-xs ${sub} leading-relaxed`}>• {s}</p>)}
                                        </div>
                                    )}
                                    {response.improvements?.length > 0 && (
                                        <div className={`p-3.5 rounded-xl border ${inner}`}>
                                            <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Improve</p>
                                            {response.improvements.map((s, i) => <p key={i} className={`text-xs ${sub} leading-relaxed`}>• {s}</p>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab: Transcript */}
                        {tab === 'transcript' && (
                            <div className={`p-4 rounded-xl border max-h-64 overflow-y-auto ${inner}`}>
                                {response.transcript ? (
                                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{response.transcript}</p>
                                ) : (
                                    <p className={`text-sm text-center ${sub}`}>No transcript available.</p>
                                )}
                            </div>
                        )}

                        {/* Tab: Speech Analysis */}
                        {tab === 'speech' && (
                            <div className="space-y-3">
                                {!hasAssemblyAI ? (
                                    <div className={`p-5 rounded-xl border text-center border-dashed ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                                        <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm font-medium">AssemblyAI not configured</p>
                                        <p className="text-xs mt-1">Add ASSEMBLYAI_API_KEY to ai-service .env for speech metrics</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                ['Words Per Minute', sm.words_per_minute, 'Ideal: 120–160 WPM', sm.words_per_minute >= 120 && sm.words_per_minute <= 160],
                                                ['Total Words', sm.total_words, `${sm.audio_duration_s}s duration`, true],
                                                ['Filler Words', sm.filler_word_count, 'um, uh, like, etc.', sm.filler_word_count <= 5],
                                                ['Confidence', `${sm.avg_confidence}%`, 'Speech clarity score', sm.avg_confidence >= 70],
                                            ].map(([label, val, hint, good]) => (
                                                <div key={label} className={`p-3.5 rounded-xl border ${inner}`}>
                                                    <p className={`text-xs ${sub} mb-1`}>{label}</p>
                                                    <p className={`text-xl font-bold ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{val ?? '—'}</p>
                                                    <p className={`text-xs mt-1 ${sub}`}>{hint}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`p-4 rounded-xl border ${inner}`}>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${sub}`}>Sentiment Breakdown</p>
                                            <div className="space-y-2">
                                                {[['Positive', sm.positive_pct, 'bg-emerald-500'], ['Neutral', sm.neutral_pct, 'bg-slate-500'], ['Negative', sm.negative_pct, 'bg-rose-500']].map(([label, val, color]) => (
                                                    <div key={label}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className={sub}>{label}</span>
                                                            <span className={head}>{val ?? 0}%</span>
                                                        </div>
                                                        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                            <div className={`h-full rounded-full ${color}`} style={{ width: `${val ?? 0}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex justify-between pt-1">
                            <button onClick={() => setQIdx(q => q - 1)} disabled={qIdx === 0}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition disabled:opacity-30 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>
                            <button onClick={() => setQIdx(q => q + 1)} disabled={qIdx >= questions.length - 1}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition disabled:opacity-30 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}