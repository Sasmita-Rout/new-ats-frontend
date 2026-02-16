import React, { useEffect, useMemo, useState } from 'react';
import { Candidate, Interview } from '../types/types';

type BulkScheduleDetails = {
    title: string;
    type: Interview['type'];
    dateTime: string;
    duration: number;
    description: string;
    interviewerById: Record<number, string>;
    defaultInterviewer: string;
    sendEmailAfter: boolean;
};

const BulkMeetingSchedulerModal = ({
    isOpen,
    onClose,
    onSchedule,
    candidates,
    defaultInterviewer,
    isSubmitting,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (details: BulkScheduleDetails) => void;
    candidates: Candidate[];
    defaultInterviewer?: string;
    isSubmitting?: boolean;
}) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Interview['type']>('Screening');
    const [dateTime, setDateTime] = useState('');
    const [duration, setDuration] = useState(30);
    const [description, setDescription] = useState('');
    const [bulkInterviewer, setBulkInterviewer] = useState('');
    const [interviewerById, setInterviewerById] = useState<Record<number, string>>({});
    const [sendEmailAfter, setSendEmailAfter] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setDateTime(tomorrow.toISOString().slice(0, 16));
        setTitle(`Interview with ${candidates.length} candidate${candidates.length === 1 ? '' : 's'}`);
        setDescription(`- Introduction\n- Discuss experience related to the role\n- Candidate questions`);
        setSendEmailAfter(true);
        const defaultValue = (defaultInterviewer || '').trim();
        setBulkInterviewer(defaultValue);
        const initial: Record<number, string> = {};
        candidates.forEach(c => {
            initial[c.id] = defaultValue;
        });
        setInterviewerById(initial);
    }, [isOpen, candidates, defaultInterviewer]);

    const canSubmit = useMemo(() => {
        if (!title || !dateTime || !duration) return false;
        if (!candidates.length) return false;
        return candidates.every(c => (interviewerById[c.id] || '').trim().length > 0);
    }, [title, dateTime, duration, candidates, interviewerById]);

    if (!isOpen) return null;

    const handleApplyToAll = () => {
        const value = bulkInterviewer.trim();
        if (!value) return;
        setInterviewerById(prev => {
            const next = { ...prev };
            candidates.forEach(c => {
                next[c.id] = value;
            });
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        onSchedule({
            title,
            type,
            dateTime,
            duration,
            description,
            interviewerById,
            defaultInterviewer: bulkInterviewer.trim(),
            sendEmailAfter,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Schedule Interview (Bulk)</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="job-creation-form" style={{ background: 'var(--background-color)' }}>
                    <div className="modal-body">
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label>Meeting Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="form-grid" style={{ marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Interview Type</label>
                                <select value={type} onChange={e => setType(e.target.value as Interview['type'])}>
                                    <option value="Screening">Screening</option>
                                    <option value="Technical">Technical</option>
                                    <option value="HR">HR</option>
                                    <option value="Final">Final</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Default Interviewer(s)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={bulkInterviewer}
                                        onChange={e => setBulkInterviewer(e.target.value)}
                                        placeholder="e.g. John Doe, jane.doe@email.com"
                                        disabled={!!isSubmitting}
                                    />
                                    <button type="button" className="btn btn-secondary btn-small" onClick={handleApplyToAll} disabled={!!isSubmitting}>
                                        Apply to all
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required disabled={!!isSubmitting} />
                            </div>
                            <div className="form-group">
                                <label>Duration</label>
                                <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={!!isSubmitting}>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Description / Agenda</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={!!isSubmitting}></textarea>
                        </div>
                        <div className="form-group" style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={sendEmailAfter}
                                    onChange={e => setSendEmailAfter(e.target.checked)}
                                    disabled={!!isSubmitting}
                                />
                                Generate & compose email after scheduling
                            </label>
                        </div>

                        <div className="form-group" style={{ marginTop: '12px' }}>
                            <label>Candidate Interviewers</label>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ats-table" style={{ marginTop: '8px' }}>
                                    <thead>
                                        <tr>
                                            <th>Candidate</th>
                                            <th>Email</th>
                                            <th>Interviewer(s)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map(candidate => (
                                            <tr key={candidate.id}>
                                                <td>{candidate.name}</td>
                                                <td>{candidate.email || 'No Email'}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={interviewerById[candidate.id] || ''}
                                                        onChange={e => setInterviewerById(prev => ({ ...prev, [candidate.id]: e.target.value }))}
                                                        placeholder="e.g. John Doe"
                                                        required
                                                        disabled={!!isSubmitting}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={!!isSubmitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={!canSubmit || !!isSubmitting}>
                            <span className="material-symbols-outlined">event_available</span> {isSubmitting ? 'Scheduling...' : 'Schedule Interviews'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkMeetingSchedulerModal;
