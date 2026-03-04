import React, { useEffect, useMemo, useState } from 'react';
import { Candidate, Interview } from '../types/types';
import { toast } from 'react-toastify';

type InterviewEvent = {
    candidate: Candidate;
    interview: Interview;
};

type InterviewUpdatePayload = {
    dateTime: string;
    duration: number;
    interviewer: string;
    notes: string;
};

type InterviewDetailModalProps = {
    isOpen: boolean;
    onClose: () => void;
    event: InterviewEvent | null;
    onViewProfile: (candidate: Candidate) => void;
    onUpdateInterview?: (event: InterviewEvent, payload: InterviewUpdatePayload) => Promise<void> | void;
    onCancelInterview?: (event: InterviewEvent) => Promise<void> | void;
};

const InterviewDetailModal = ({ isOpen, onClose, event, onViewProfile, onUpdateInterview, onCancelInterview }: InterviewDetailModalProps) => {

    const candidate = event?.candidate;
    const interview = event?.interview;
    const type = interview?.type || 'Screening';
    const date = interview?.date || new Date().toISOString();
    const duration = interview?.duration || 30;
    const interviewer = interview?.interviewer || '';
    const meetingLink = interview?.meetingLink || '';
    const notes = interview?.notes || '';
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialDateTime = useMemo(() => {
        const d = new Date(date);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }, [date]);

    const [editDateTime, setEditDateTime] = useState(initialDateTime || '');
    const [editDuration, setEditDuration] = useState(String(duration || 30));
    const [editInterviewer, setEditInterviewer] = useState(interviewer || '');
    const [editNotes, setEditNotes] = useState(notes || '');

    useEffect(() => {
        if (!event) return;
        setIsEditing(false);
        setEditDateTime(initialDateTime);
        setEditDuration(String(duration || 30));
        setEditInterviewer(interviewer || '');
        setEditNotes(notes || '');
    }, [initialDateTime, duration, interviewer, notes, event?.interview?.id]);

    const handleSave = async () => {
        if (!onUpdateInterview) return;
        if (!event) return;
        if (!editDateTime || Number.isNaN(new Date(editDateTime).getTime())) {
            toast.error('Please enter a valid date and time.');
            return;
        }
        try {
            setIsSubmitting(true);
            await onUpdateInterview(event, {
                dateTime: editDateTime,
                duration: Math.max(10, parseInt(editDuration || '30', 10)),
                interviewer: editInterviewer.trim(),
                notes: editNotes,
            });
            setIsEditing(false);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update interview.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelInterview = async () => {
        if (!onCancelInterview) return;
        if (!event) return;
        try {
            setIsSubmitting(true);
            await onCancelInterview(event);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to cancel interview.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !event || !candidate || !interview) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Interview Details</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body interview-detail-modal-body">
                     <p>
                        <span className="material-symbols-outlined">person</span>
                        <strong>Candidate:</strong>
                        <span>{candidate.name} ({candidate.title})</span>
                    </p>
                    <p>
                        <span className="material-symbols-outlined">event_note</span>
                        <strong>Type:</strong>
                        <span>{type} Interview</span>
                    </p>
                    <p>
                        <span className="material-symbols-outlined">calendar_today</span>
                        <strong>Date:</strong>
                        <span>{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </p>
                    <p>
                        <span className="material-symbols-outlined">schedule</span>
                        <strong>Time:</strong>
                        <span>{new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({duration} mins)</span>
                    </p>
                    <p>
                        <span className="material-symbols-outlined">group</span>
                        <strong>Interviewer(s):</strong>
                        <span>{interviewer}</span>
                    </p>
                    <p>
                        <span className="material-symbols-outlined">link</span>
                        <strong>Meeting Link:</strong>
                        {meetingLink ? (
                            <a href={meetingLink} target="_blank" rel="noopener noreferrer">{meetingLink}</a>
                        ) : (
                            <span>Not provided</span>
                        )}
                    </p>
                     <p style={{ alignItems: 'flex-start' }}>
                        <span className="material-symbols-outlined">description</span>
                        <strong>Notes/Agenda:</strong>
                        <span className="meeting-notes">{notes || 'No agenda provided.'}</span>
                    </p>
                    {isEditing && (
                        <div className="interview-edit-panel">
                            <div className="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" value={editDateTime} onChange={(e) => setEditDateTime(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Duration (minutes)</label>
                                <input type="number" min={10} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Interviewer</label>
                                <input type="text" value={editInterviewer} onChange={(e) => setEditInterviewer(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {!isEditing && !!onUpdateInterview && (
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(true)} disabled={isSubmitting}>
                            <span className="material-symbols-outlined">edit</span>
                            Edit
                        </button>
                    )}
                    {isEditing && (
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                            <span className="material-symbols-outlined">save</span>
                            Save
                        </button>
                    )}
                    {isEditing && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setIsEditing(false);
                                setEditDateTime(initialDateTime);
                                setEditDuration(String(duration || 30));
                                setEditInterviewer(interviewer || '');
                                setEditNotes(notes || '');
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    )}
                    {!!onCancelInterview && (
                        <button type="button" className="btn btn-danger" onClick={handleCancelInterview} disabled={isSubmitting}>
                            <span className="material-symbols-outlined">event_busy</span>
                            Cancel Interview
                        </button>
                    )}
                    <button type="button" className="btn btn-primary" onClick={() => onViewProfile(candidate)} disabled={isSubmitting}>
                        <span className="material-symbols-outlined">visibility</span>
                        View Candidate Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewDetailModal;
