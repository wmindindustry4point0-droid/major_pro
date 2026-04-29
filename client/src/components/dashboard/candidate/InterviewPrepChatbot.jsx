import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrainCircuit, Send, RefreshCw, Loader2, ChevronDown, Mic, MicOff } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// NOTE: /prep_chat is proxied through the Node backend (/api/ai/prep_chat)
// so the browser never needs a direct connection to the AI service.

export default function InterviewPrepChatbot({ applicationId, jobTitle, jobDescription, candidateSkills }) {
    const { isDark } = useTheme();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [history,  setHistory]  = useState([]);          // [{role, content}]
    const [input,    setInput]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [started,  setStarted]  = useState(false);
    const [listening, setListening] = useState(false);
    const bottomRef = useRef(null);
    const recognitionRef = useRef(null);

    // Auto-scroll to bottom on new message
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

    // Web Speech API setup
    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const r = new SR();
        r.continuous = false;
        r.interimResults = false;
        r.lang = 'en-IN';
        r.onresult = (e) => { setInput(prev => prev + ' ' + e.results[0][0].transcript); };
        r.onend = () => setListening(false);
        r.onerror = () => setListening(false);
        recognitionRef.current = r;
    }, []);

    const toggleListen = () => {
        if (!recognitionRef.current) return;
        if (listening) { recognitionRef.current.stop(); setListening(false); }
        else { recognitionRef.current.start(); setListening(true); }
    };

    const startSession = async () => {
        setStarted(true);
        await sendMessage('Hello! I am ready to start the mock interview.', []);
    };

    const sendMessage = async (text, currentHistory) => {
        const msg = (text || input).trim();
        if (!msg) return;
        setInput('');
        const newHistory = [...currentHistory, { role: 'user', content: msg }];
        setHistory(newHistory);
        setLoading(true);

        try {
            const { data } = await axios.post(`${API}/api/ai/prep_chat`, {
                job_title:        jobTitle || 'the role',
                job_description:  jobDescription || '',
                candidate_skills: candidateSkills || [],
                history:          currentHistory,
                user_message:     msg,
            });
            const reply = data.reply || 'Sorry, I could not generate a response.';
            setHistory([...newHistory, { role: 'assistant', content: reply }]);
        } catch (e) {
            setHistory([...newHistory, { role: 'assistant', content: 'Connection error. Please check the AI service is running.' }]);
        } finally { setLoading(false); }
    };

    const handleSend = () => sendMessage(input, history);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const resetSession = () => { setHistory([]); setStarted(false); setInput(''); };

    const card  = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const sub   = isDark ? 'text-slate-400' : 'text-slate-500';
    const head  = isDark ? 'text-white' : 'text-slate-900';
    const msgBg = isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800';
    const inputC = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

    return (
        <div className={`border rounded-2xl flex flex-col overflow-hidden ${card}`} style={{ height: '580px' }}>
            {/* Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                        <BrainCircuit className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${head}`}>AI Interview Coach</h3>
                        <p className={`text-xs ${sub}`}>{jobTitle || 'Mock Interview Session'}</p>
                    </div>
                </div>
                {started && (
                    <button onClick={resetSession} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <RefreshCw className="w-3 h-3" /> Restart
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {!started ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
                            <BrainCircuit className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold mb-1 ${head}`}>Mock Interview Practice</h3>
                            <p className={`text-sm leading-relaxed max-w-xs ${sub}`}>
                                I'll simulate a real interview for <strong>{jobTitle || 'this role'}</strong>, ask questions tailored to the JD, and give instant feedback on your answers.
                            </p>
                        </div>
                        <button
                            onClick={startSession}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition text-sm flex items-center gap-2"
                        >
                            <BrainCircuit className="w-4 h-4" /> Start Mock Interview
                        </button>
                    </div>
                ) : (
                    <>
                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                                        <BrainCircuit className="w-4 h-4 text-indigo-400" />
                                    </div>
                                )}
                                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : `${msgBg} rounded-bl-sm`
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${msgBg}`}>
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Input */}
            {started && (
                <div className={`px-4 py-3 border-t shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex gap-2 items-end">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder="Type your answer… (Enter to send)"
                            disabled={loading}
                            className={`flex-1 px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 ${inputC}`}
                            style={{ maxHeight: '100px', overflowY: 'auto' }}
                        />
                        {recognitionRef.current && (
                            <button onClick={toggleListen} title="Speak your answer"
                                className={`p-2.5 rounded-xl border transition shrink-0 ${
                                    listening
                                        ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
                                        : isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}>
                                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className={`text-xs mt-1.5 text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        Practice mode — your responses are not saved or shared
                    </p>
                </div>
            )}
        </div>
    );
}