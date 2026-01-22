import React from 'react';
import { getInitials } from '../utils/helpers';

const InterviewDetailModal = ({ isOpen, onClose, event, onViewProfile }) => {
    if (!isOpen || !event) return null;

    const { candidate, interview } = event;
    const { type, date, duration, interviewer, meetingLink, notes } = interview;

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
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer">{meetingLink || 'Not provided'}</a>
                    </p>
                     <p style={{ alignItems: 'flex-start' }}>
                        <span className="material-symbols-outlined">description</span>
                        <strong>Notes/Agenda:</strong>
                        <span className="meeting-notes">{notes || 'No agenda provided.'}</span>
                    </p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button type="button" className="btn btn-primary" onClick={() => onViewProfile(candidate)}>
                        <span className="material-symbols-outlined">visibility</span>
                        View Candidate Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewDetailModal;