import React, { useState, useEffect } from 'react';
import { Candidate, Interview } from '../types/types';

const MeetingSchedulerModal = ({ isOpen, onClose, onSchedule, candidate }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Interview['type']>('Screening');
    const [dateTime, setDateTime] = useState('');
    const [duration, setDuration] = useState(30);
    const [interviewer, setInterviewer] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen && candidate) {
            setTitle(`Interview with ${candidate.name}`);
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            const formattedDateTime = tomorrow.toISOString().slice(0, 16);
            setDateTime(formattedDateTime);

            setDescription(`- Introduction\n- Discuss experience related to the role\n- Candidate questions`);
            
            // Generate a dummy meeting link
            const generateMeetLink = () => {
                const chars = 'abcdefghijklmnopqrstuvwxyz';
                const part1 = Array(3).fill(null).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
                const part2 = Array(4).fill(null).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
                const part3 = Array(3).fill(null).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
                return `https://meet.google.com/lookup/${part1}-${part2}-${part3}`;
            };
            setMeetingLink(generateMeetLink());
            
        }
    }, [isOpen, candidate]);

    if (!isOpen || !candidate) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSchedule({ title, type, dateTime, duration, interviewer, meetingLink, description });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Schedule Interview</h3>
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
                                <label>Interviewer(s)</label>
                                <input type="text" value={interviewer} onChange={e => setInterviewer(e.target.value)} placeholder="e.g. John Doe, jane.doe@email.com" required />
                            </div>
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Duration</label>
                                <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </div>
                        </div>
                         <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label>Meeting Link</label>
                            <input type="text" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="e.g., https://meet.google.com/..." />
                        </div>
                        <div className="form-group">
                            <label>Description / Agenda</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            <span className="material-symbols-outlined">forward_to_inbox</span> Generate & Compose Email
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeetingSchedulerModal;