import React from 'react';
import { Candidate } from '../types/types';
import SkillTag from '../components/common/SkillTag';
import { downloadOriginalResume, downloadResumeText } from '../utils/fileUtils';


const CandidateDetailPage = ({ candidate, onBack, onUpdateCandidate, onScheduleMeeting }) => {
    const statuses: Candidate['status'][] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

    const handleUpdate = (field, value) => {
        onUpdateCandidate({ ...candidate, [field]: value });
    };

    return (
        <div className="page-content candidate-detail-v2">
            <div className="page-header">
                <button onClick={onBack} className="back-button">
                    <span className="material-symbols-outlined">arrow_back</span> Back to Candidates
                </button>
            </div>
            <header className="detail-header-card">
                <div className="candidate-avatar large">{candidate.avatar}</div>
                <div className="detail-header-info">
                    <h1>{candidate.name}</h1>
                    <p className="candidate-title">{candidate.title}</p>
                    <div className="contact-info-bar">
                        <span><span className="material-symbols-outlined">mail</span>{candidate.contact.email || 'N/A'}</span>
                        <span><span className="material-symbols-outlined">phone</span>{candidate.contact.phone || 'N/A'}</span>
                        <span><span className="material-symbols-outlined">location_on</span>{candidate.contact.location || 'N/A'}</span>
                    </div>
                </div>
                <div className="detail-header-actions">
                    <div className="status-editor">
                        <select value={candidate.status} onChange={(e) => handleUpdate('status', e.target.value)} className={`status-pill editable ${candidate.status.toLowerCase()}`}>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={() => onScheduleMeeting(candidate)}>
                        <span className="material-symbols-outlined">event</span> Schedule Interview
                    </button>
                    <button className="btn btn-secondary" onClick={() => downloadOriginalResume(candidate)} disabled={!candidate.originalResumeFile && !candidate.contact?.email}>
                        <span className="material-symbols-outlined">description</span> Original
                    </button>
                    <button className="btn btn-secondary" onClick={() => downloadResumeText(candidate)}>
                        <span className="material-symbols-outlined">download</span> Text
                    </button>
                </div>
            </header>

            <div className="detail-body-grid">
                <main className="detail-main-content">
                    <div className="info-card">
                        <h4>Professional Summary</h4>
                        <p>{candidate.summary}</p>
                    </div>
                    <div className="info-card">
                        <h4>Interview History</h4>
                        <div className="timeline vertical">
                            {candidate.interviews && candidate.interviews.length > 0 ? candidate.interviews.map((interview) => (
                                <div key={interview.id} className="timeline-item">
                                    <div className="timeline-icon interview"><span className="material-symbols-outlined">event_available</span></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <span className="timeline-stage">{interview.type} Interview ({interview.status})</span>
                                            <span className="timeline-date">{new Date(interview.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="timeline-notes">
                                            <strong>Interviewer:</strong> {interview.interviewer}<br />
                                            <strong>Time:</strong> {new Date(interview.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )) : <p className="placeholder-text">No interviews scheduled yet.</p>}
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Work Experience</h4>
                        <div className="timeline vertical">
                            {candidate.experience && candidate.experience.length > 0 ? candidate.experience.map((exp, index) => (
                                <div key={index} className="timeline-item">
                                    <div className="timeline-icon work"><span className="material-symbols-outlined">work</span></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <span className="timeline-stage">{exp.title} @ {exp.company}</span>
                                            <span className="timeline-date">{exp.duration}</span>
                                        </div>
                                        <p className="timeline-notes">{exp.description}</p>
                                    </div>
                                </div>
                            )) : <p className="placeholder-text">No work experience information provided.</p>}
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Education</h4>
                        <div className="timeline vertical">
                            {candidate.education && candidate.education.length > 0 ? candidate.education.map((edu, index) => (
                                <div key={index} className="timeline-item">
                                    <div className="timeline-icon education"><span className="material-symbols-outlined">school</span></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <span className="timeline-stage">{edu.degree}</span>
                                            <span className="timeline-date">{edu.duration}</span>
                                        </div>
                                        <p className="timeline-notes">{edu.institution}</p>
                                    </div>
                                </div>
                            )) : <p className="placeholder-text">No education information provided.</p>}
                        </div>
                    </div>
                </main>
                <aside className="detail-sidebar">
                    <div className="info-card">
                        <h4>Experience</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                            {candidate.totalExperienceYears ? `${candidate.totalExperienceYears} years` : 'N/A'}
                        </p>
                    </div>
                    <div className="info-card">
                        <h4>Skills</h4>
                        <div className="skills-container">
                            {candidate.skills && candidate.skills.length > 0
                                ? candidate.skills.map(skill => <SkillTag key={skill} tag={skill} />)
                                : <p className="placeholder-text" style={{ fontSize: '12px' }}>No skills extracted.</p>
                            }
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Soft Skills</h4>
                        <div className="skills-container">
                            {candidate.softSkills && candidate.softSkills.length > 0
                                ? candidate.softSkills.map(skill => <SkillTag key={skill} tag={skill} />)
                                : <p className="placeholder-text" style={{ fontSize: '12px' }}>No soft skills extracted.</p>
                            }
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Languages</h4>
                        <div className="skills-container">
                            {candidate.languages && candidate.languages.length > 0
                                ? candidate.languages.map(lang => <SkillTag key={lang} tag={lang} />)
                                : <p className="placeholder-text" style={{ fontSize: '12px' }}>No languages listed.</p>
                            }
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CandidateDetailPage;
