import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Video, Phone, MapPin, CheckCircle2, RefreshCw, Loader2, AlertCircle, Link, Timer } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const typeIcon = { video: <Video className="w-4 h-4" />, phone: <Phone className="w-4 h-4" />, 'in-person': <MapPin className="w-4 h-4" /> };
const typeLabel = { video: 'Video Call', phone: 'Phone Call', 'in-person': 'In Person' };

const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });

// FIX #3: Countdown helper
const getCountdown = (dateStr) => {
    const now = new Date();
    const target = new Date(dateStr);
    const diffMs = target - now;
    if (diffMs < 0) return null; // already passed

    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins < 60)  return { label: `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`, urgent: true };
    if (diffHours < 24) return { label: `Today at ${target.toLocaleTimeString('en-IN', { timeStyle: 'short' })}`, urgent: true };
    if (diffDays === 1) return { label: `Tomorrow at ${target.toLocaleTimeString('en-IN', { timeStyle: 'short' })}`, urgent: false };
    if (diffDays <= 7)  return { label: `In ${diffDays} days`, urgent: false };
    return null;
};

const statusBadge = {
    pending_confirmation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    confirmed:            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rescheduled:          'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed:            'bg-slate-500/20 text-slate-400 border-slate-500/30',
    cancelled:            'bg-rose-500/20 text-rose-400 border-rose-500/30',
};
const statusLabel = {
    pending_confirmation: '⏳ Awaiting Confirmation',
    confirmed:            '✅ Confirmed',
    rescheduled:          '🔄 Reschedule Requested',
    completed:            '🏁 Completed',
    cancelled:            '❌ Cancelled',
};

export default function CandidateInterviews() {
    const { isDark } = useTheme();
    const token = localStorage.getItem('token');
    const [interviews, setInterviews]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [confirming, setConfirming]   = useState(null);
    const [rescheduleId, setRescheduleId] = useState(null);
    const [rescheduleNote, setRescheduleNote] = useState('');
    const [submitting, setSubmitting]   = useState(false);
    const [toast, setToast]             = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchInterviews = async () => {
        try {
            const { data } = await axios.get(`${API}/api/interviews/candidate/all`, { headers });
            setInterviews(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchInterviews(); }, []);

    const confirmSlot = async (interviewId, slotIndex) => {
        setConfirming(interviewId + '-' + slotIndex);
        try {
            await axios.patch(`${API}/api/interviews/${interviewId}/confirm`, { slotIndex }, { headers });
            showToast('Interview slot confirmed! The company has been notified.');
            fetchInterviews();
        } catch (e) {
            showToast(e.response?.data?.error || 'Failed to confirm slot.', 'error');
        } finally { setConfirming(null); }
    };

    const requestReschedule = async (interviewId) => {
        setSubmitting(true);
        try {
            await axios.patch(`${API}/api/interviews/${interviewId}/reschedule`, { rescheduleNote }, { headers });
            showToast('Reschedule request sent to the company.');
            setRescheduleId(null);
            setRescheduleNote('');
            fetchInterviews();
        } catch (e) {
            showToast(e.response?.data?.error || 'Failed to request reschedule.', 'error');
        } finally { setSubmitting(false); }
    };

    const card   = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const sub    = isDark ? 'text-slate-400' : 'text-slate-500';
    const head   = isDark ? 'text-white' : 'text-slate-900';
    const inputC = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

    if (loading) return (
        <div className={`flex items-center justify-center mt-24 gap-3 ${sub}`}>
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Loading interviews...</span>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-bold ${head}`}>Interview Schedule</h2>
                    <p className={`text-sm mt-1 ${sub}`}>Confirm or reschedule your upcoming interviews</p>
                </div>
                <button onClick={fetchInterviews} className={`p-2 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {interviews.length === 0 ? (
                <div className={`border rounded-2xl p-12 text-center border-dashed ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No interviews scheduled yet.</p>
                    <p className="text-sm mt-1">When a company moves you to the interview stage, slots will appear here.</p>
                </div>
            ) : (
                interviews.map((iv) => (
                    <div key={iv._id} className={`border rounded-2xl overflow-hidden ${card}`}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex items-start justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                            <div>
                                <h3 className={`font-bold text-lg ${head}`}>{iv.jobId?.title}</h3>
                                <p className={`text-sm ${sub}`}>{iv.companyId?.companyName || iv.companyId?.name}</p>
                            </div>
                            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${statusBadge[iv.status] || statusBadge.pending_confirmation}`}>
                                {statusLabel[iv.status]}
                            </span>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Interview type + meet link */}
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className={`flex items-center gap-1.5 text-sm ${sub}`}>
                                    {typeIcon[iv.interviewType]} {typeLabel[iv.interviewType]}
                                </span>
                                {iv.meetLink && (
                                    <a href={iv.meetLink} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition">
                                        <Link className="w-4 h-4" /> Join Link
                                    </a>
                                )}
                                {iv.notes && (
                                    <span className={`text-sm italic ${sub}`}>Note: {iv.notes}</span>
                                )}
                            </div>

                            {/* FIX #3: Confirmed slot with countdown */}
                            {iv.status === 'confirmed' && iv.confirmedSlot?.date && (() => {
                                const countdown = getCountdown(iv.confirmedSlot.date);
                                return (
                                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className={`font-semibold text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Confirmed Slot</p>
                                            <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmtDate(iv.confirmedSlot.date)} · {iv.confirmedSlot.duration || 45} min</p>
                                            {countdown && (
                                                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                                    countdown.urgent
                                                        ? isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        : isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'
                                                }`}>
                                                    <Timer className="w-3 h-3" />
                                                    {countdown.label}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Proposed slots */}
                            {iv.status === 'pending_confirmation' && (
                                <>
                                    <p className={`text-sm font-semibold ${head}`}>Choose a slot:</p>
                                    <div className="space-y-2">
                                        {iv.proposedSlots.map((slot, i) => {
                                            const isConfirming = confirming === `${iv._id}-${i}`;
                                            const countdown = getCountdown(slot.date);
                                            return (
                                                <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition ${isDark ? 'border-slate-700 bg-slate-800/50 hover:border-indigo-500/50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Clock className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                                                        <div>
                                                            <p className={`text-sm font-medium ${head}`}>{fmtDate(slot.date)}</p>
                                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                                <p className={`text-xs ${sub}`}>{slot.duration || 45} minutes</p>
                                                                {countdown && (
                                                                    <span className={`text-xs font-medium ${countdown.urgent ? 'text-amber-400' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                        · {countdown.label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => confirmSlot(iv._id, i)}
                                                        disabled={isConfirming}
                                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
                                                    >
                                                        {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        Confirm
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* FIX #7: Reschedule note clearly labelled optional */}
                                    {rescheduleId === iv._id ? (
                                        <div className="space-y-2">
                                            <label className={`text-xs font-medium flex items-center gap-1.5 ${sub}`}>
                                                Reason for reschedule
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>(optional)</span>
                                            </label>
                                            <textarea
                                                value={rescheduleNote}
                                                onChange={e => setRescheduleNote(e.target.value)}
                                                placeholder="e.g. I have a conflict on those days..."
                                                rows={2}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputC}`}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => requestReschedule(iv._id)} disabled={submitting}
                                                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                                                    {submitting ? 'Sending...' : 'Send Reschedule Request'}
                                                </button>
                                                <button onClick={() => { setRescheduleId(null); setRescheduleNote(''); }}
                                                    className={`px-4 py-2 text-sm rounded-lg border transition ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setRescheduleId(iv._id)}
                                            className={`text-sm transition flex items-center gap-1.5 ${isDark ? 'text-slate-500 hover:text-amber-400' : 'text-slate-400 hover:text-amber-600'}`}>
                                            <RefreshCw className="w-3.5 h-3.5" /> None of these work? Request reschedule
                                        </button>
                                    )}
                                </>
                            )}

                            {iv.status === 'rescheduled' && (
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <p className="text-sm font-medium">Reschedule requested. Waiting for the company to propose new slots.</p>
                                    {iv.rescheduleNote && <p className="text-xs mt-1 opacity-75">Your note: {iv.rescheduleNote}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}