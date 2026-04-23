import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Calendar, Plus, Trash2, Send, Loader2, CheckCircle2,
    AlertCircle, Clock, Video, Phone, MapPin, RefreshCw, Link
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const statusBadge = {
    pending_confirmation: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    confirmed:            'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rescheduled:          'bg-blue-500/15 text-blue-400 border-blue-500/30',
    completed:            'bg-slate-500/15 text-slate-400 border-slate-500/30',
    cancelled:            'bg-rose-500/15 text-rose-400 border-rose-500/30',
};
const statusLabel = {
    pending_confirmation: '⏳ Pending',
    confirmed:            '✅ Confirmed',
    rescheduled:          '🔄 Reschedule Req.',
    completed:            '🏁 Done',
    cancelled:            '❌ Cancelled',
};

export default function InterviewScheduler() {
    const { isDark } = useTheme();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [scheduling, setScheduling] = useState(null); // applicationId
    const [form, setForm]             = useState({ slots: [{ date: '', time: '', duration: 45 }], meetLink: '', interviewType: 'video', notes: '' });
    const [saving, setSaving]         = useState(false);
    const [toast, setToast]           = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

    const fetchInterviews = async () => {
        try {
            const { data } = await axios.get(`${API}/api/interviews/company/all`, { headers });
            setInterviews(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchInterviews(); }, []);

    const addSlot = () => setForm(f => ({ ...f, slots: [...f.slots, { date: '', time: '', duration: 45 }] }));
    const removeSlot = (i) => setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
    const updateSlot = (i, field, val) => setForm(f => {
        const slots = [...f.slots];
        slots[i] = { ...slots[i], [field]: val };
        return { ...f, slots };
    });

    const handleSchedule = async (applicationId) => {
        const validSlots = form.slots.filter(s => s.date && s.time).map(s => ({
            date: new Date(`${s.date}T${s.time}`).toISOString(),
            duration: parseInt(s.duration, 10) || 45,
        }));
        if (!validSlots.length) return showToast('Add at least one valid slot.', 'error');
        setSaving(true);
        try {
            await axios.post(`${API}/api/interviews`, {
                applicationId,
                proposedSlots: validSlots,
                meetLink: form.meetLink,
                interviewType: form.interviewType,
                notes: form.notes,
            }, { headers });
            showToast('Interview slots sent to candidate!');
            setScheduling(null);
            setForm({ slots: [{ date: '', time: '', duration: 45 }], meetLink: '', interviewType: 'video', notes: '' });
            fetchInterviews();
        } catch (e) {
            showToast(e.response?.data?.error || 'Failed to schedule.', 'error');
        } finally { setSaving(false); }
    };

    const card  = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const sub   = isDark ? 'text-slate-400' : 'text-slate-500';
    const head  = isDark ? 'text-white' : 'text-slate-900';
    const inputC = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';

    if (loading) return (
        <div className={`flex items-center justify-center mt-24 gap-3 ${sub}`}>
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /><span>Loading interviews...</span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-bold ${head}`}>Interview Scheduler</h2>
                    <p className={`text-sm mt-1 ${sub}`}>Manage all scheduled interviews with candidates</p>
                </div>
                <button onClick={fetchInterviews} className={`p-2 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Existing interviews */}
            {interviews.length > 0 && (
                <div className={`border rounded-2xl overflow-hidden ${card}`}>
                    <div className={`px-5 py-3.5 border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                        Scheduled Interviews
                    </div>
                    <div className="divide-y divide-slate-800/30">
                        {interviews.map(iv => (
                            <div key={iv._id} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between hover:bg-slate-800/10 transition`}>
                                <div className="min-w-0">
                                    <p className={`font-semibold text-sm ${head}`}>{iv.candidateId?.name}</p>
                                    <p className={`text-xs mt-0.5 ${sub}`}>{iv.jobId?.title}</p>
                                    {iv.confirmedSlot?.date && (
                                        <p className="text-xs text-emerald-400 mt-1">📅 {fmtDate(iv.confirmedSlot.date)} · {iv.confirmedSlot.duration || 45} min</p>
                                    )}
                                    {iv.status === 'rescheduled' && iv.rescheduleNote && (
                                        <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Reschedule reason: {iv.rescheduleNote}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[iv.status]}`}>
                                        {statusLabel[iv.status]}
                                    </span>
                                    {(iv.status === 'rescheduled' || iv.status === 'pending_confirmation') && (
                                        <button
                                            onClick={() => setScheduling(iv.applicationId)}
                                            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                                        >
                                            {iv.status === 'rescheduled' ? 'Re-Propose' : 'Edit'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Schedule form (shown in JobManagement modal context) */}
            {scheduling && (
                <div className={`border rounded-2xl p-6 space-y-5 ${card}`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`font-bold ${head}`}>Propose Interview Slots</h3>
                        <button onClick={() => setScheduling(null)} className={`text-sm ${sub} hover:text-red-400 transition`}>Cancel</button>
                    </div>

                    {/* Interview type */}
                    <div className="flex gap-2">
                        {[['video', <Video className="w-3.5 h-3.5" />, 'Video'], ['phone', <Phone className="w-3.5 h-3.5" />, 'Phone'], ['in-person', <MapPin className="w-3.5 h-3.5" />, 'In Person']].map(([val, icon, label]) => (
                            <button key={val} onClick={() => setForm(f => ({ ...f, interviewType: val }))}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition font-medium ${form.interviewType === val ? 'bg-indigo-600 border-indigo-600 text-white' : isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                {icon}{label}
                            </button>
                        ))}
                    </div>

                    {/* Slots */}
                    <div className="space-y-3">
                        <p className={`text-sm font-semibold ${head}`}>Time Slots</p>
                        {form.slots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                                <input type="date" value={slot.date} onChange={e => updateSlot(i, 'date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                                    className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputC}`} />
                                <input type="time" value={slot.time} onChange={e => updateSlot(i, 'time', e.target.value)}
                                    className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputC}`} />
                                <select value={slot.duration} onChange={e => updateSlot(i, 'duration', e.target.value)}
                                    className={`px-3 py-2 rounded-lg border text-sm focus:outline-none ${inputC}`}>
                                    {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
                                </select>
                                {form.slots.length > 1 && (
                                    <button onClick={() => removeSlot(i)} className="text-rose-400 hover:text-rose-300 transition p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addSlot} disabled={form.slots.length >= 5}
                            className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} disabled:opacity-40 transition`}>
                            <Plus className="w-4 h-4" /> Add another slot (max 5)
                        </button>
                    </div>

                    {/* Meet link */}
                    <div>
                        <label className={`text-sm font-medium block mb-1.5 ${head}`}>Meet / Zoom Link (optional)</label>
                        <div className="flex items-center gap-2">
                            <Link className={`w-4 h-4 shrink-0 ${sub}`} />
                            <input type="url" value={form.meetLink} onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))}
                                placeholder="https://meet.google.com/..."
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputC}`} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={`text-sm font-medium block mb-1.5 ${head}`}>Note to Candidate (optional)</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="E.g., Please bring your portfolio, 2-3 technical rounds..."
                            rows={2} className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputC}`} />
                    </div>

                    <button onClick={() => handleSchedule(scheduling)} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl transition">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {saving ? 'Sending...' : 'Send Interview Slots to Candidate'}
                    </button>
                </div>
            )}

            {interviews.length === 0 && !scheduling && (
                <div className={`border rounded-2xl p-12 text-center border-dashed ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No interviews scheduled yet.</p>
                    <p className="text-sm mt-1">Go to Job Management → select an applicant in interview stage → click "Schedule Interview".</p>
                </div>
            )}
        </div>
    );
}

// Export a mini schedule button for use inside JobManagement applicant rows
export function ScheduleInterviewButton({ applicationId, isDark, onScheduled }) {
    const [open, setOpen]   = useState(false);
    const [form, setForm]   = useState({ slots: [{ date: '', time: '', duration: 45 }], meetLink: '', interviewType: 'video', notes: '' });
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const addSlot = () => setForm(f => ({ ...f, slots: [...f.slots, { date: '', time: '', duration: 45 }] }));
    const removeSlot = (i) => setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
    const updateSlot = (i, field, val) => setForm(f => { const s = [...f.slots]; s[i] = { ...s[i], [field]: val }; return { ...f, slots: s }; });

    const submit = async () => {
        const validSlots = form.slots.filter(s => s.date && s.time).map(s => ({ date: new Date(`${s.date}T${s.time}`).toISOString(), duration: parseInt(s.duration, 10) || 45 }));
        if (!validSlots.length) return;
        setSaving(true);
        try {
            await axios.post(`${API}/api/interviews`, { applicationId, proposedSlots: validSlots, meetLink: form.meetLink, interviewType: form.interviewType, notes: form.notes }, { headers });
            setOpen(false);
            onScheduled?.();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const inputC = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
    const sub    = isDark ? 'text-slate-400' : 'text-slate-500';
    const head   = isDark ? 'text-white' : 'text-slate-900';

    return (
        <>
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition font-medium">
                <Calendar className="w-3.5 h-3.5" /> Schedule Interview
            </button>
            {open && (
                <div className={`mt-3 p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex gap-1.5 flex-wrap">
                        {[['video','Video'],['phone','Phone'],['in-person','In Person']].map(([v,l]) => (
                            <button key={v} onClick={() => setForm(f => ({...f, interviewType: v}))}
                                className={`px-2.5 py-1 text-xs rounded-lg border transition ${form.interviewType === v ? 'bg-indigo-600 border-indigo-600 text-white' : `${inputC} ${sub}`}`}>{l}</button>
                        ))}
                    </div>
                    {form.slots.map((s, i) => (
                        <div key={i} className="flex flex-wrap gap-1.5 items-center">
                            <input type="date" value={s.date} onChange={e => updateSlot(i, 'date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                                className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputC}`} />
                            <input type="time" value={s.time} onChange={e => updateSlot(i, 'time', e.target.value)}
                                className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputC}`} />
                            <select value={s.duration} onChange={e => updateSlot(i, 'duration', e.target.value)}
                                className={`px-2 py-1.5 rounded-lg border text-xs ${inputC}`}>
                                {[30,45,60,90].map(d => <option key={d} value={d}>{d}m</option>)}
                            </select>
                            {form.slots.length > 1 && <button onClick={() => removeSlot(i)} className="text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                    ))}
                    <button onClick={addSlot} disabled={form.slots.length >= 3} className={`text-xs ${isDark?'text-indigo-400':'text-indigo-600'} flex items-center gap-1 disabled:opacity-40`}><Plus className="w-3 h-3"/> Add slot</button>
                    <input type="url" value={form.meetLink} onChange={e => setForm(f=>({...f,meetLink:e.target.value}))} placeholder="Meet link (optional)"
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputC}`}/>
                    <div className="flex gap-2">
                        <button onClick={submit} disabled={saving}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>} Send Slots
                        </button>
                        <button onClick={() => setOpen(false)} className={`px-3 py-1.5 text-xs border rounded-lg transition ${isDark?'border-slate-700 text-slate-400 hover:bg-slate-700':'border-slate-200 text-slate-500 hover:bg-white'}`}>Cancel</button>
                    </div>
                </div>
            )}
        </>
    );
}