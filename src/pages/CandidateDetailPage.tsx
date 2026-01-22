import React, { useState } from 'react';
import { Candidate, Note } from '../types/types';
import SkillTag from '../components/common/SkillTag';
import { getTagColor, getLinkIcon } from '../utils/helpers';
import { downloadOriginalResume, downloadResumeText } from '../utils/fileUtils';


const CandidateDetailPage = ({ candidate, onBack, onUpdateCandidate, onScheduleMeeting }) => {
    const statuses: Candidate['status'][] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
    const [newTag, setNewTag] = useState('');
    const [newTask, setNewTask] = useState('');
    const [newNote, setNewNote] = useState('');

    const handleUpdate = (field, value) => {
        onUpdateCandidate({ ...candidate, [field]: value });
    };

    const handleAddTag = () => {
        if (newTag && !candidate.tags.includes(newTag)) {
            handleUpdate('tags', [...candidate.tags, newTag]);
            setNewTag('');
        }
    };
    
    const handleRemoveTag = (tagToRemove) => {
        handleUpdate('tags', candidate.tags.filter(tag => tag !== tagToRemove));
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        if (newTask) {
            const task = { id: Date.now(), text: newTask, completed: false };
            handleUpdate('tasks', [...candidate.tasks, task]);
            setNewTask('');
        }
    };

    const handleToggleTask = (taskId) => {
        const updatedTasks = candidate.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        handleUpdate('tasks', updatedTasks);
    };
    
    const handleAddNote = (e) => {
        e.preventDefault();
        if (newNote) {
            const note: Note = {
                id: Date.now(),
                text: newNote,
                author: 'Sarah Johnson', // Hardcoded for now
                date: new Date().toISOString()
            };
            handleUpdate('notes', [note, ...candidate.notes]);
            setNewNote('');
        }
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
                     <button className="btn btn-secondary" onClick={() => downloadOriginalResume(candidate)} disabled={!candidate.originalResumeFile}>
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
                                            <strong>Interviewer:</strong> {interview.interviewer}<br/>
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
                                : <p className="placeholder-text" style={{fontSize: '12px'}}>No skills extracted.</p>
                            }
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Soft Skills</h4>
                        <div className="skills-container">
                            {candidate.softSkills && candidate.softSkills.length > 0 
                                ? candidate.softSkills.map(skill => <SkillTag key={skill} tag={skill} />)
                                : <p className="placeholder-text" style={{fontSize: '12px'}}>No soft skills extracted.</p>
                            }
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Languages</h4>
                        <div className="skills-container">
                            {candidate.languages && candidate.languages.length > 0 
                                ? candidate.languages.map(lang => <SkillTag key={lang} tag={lang} />)
                                : <p className="placeholder-text" style={{fontSize: '12px'}}>No languages listed.</p>
                            }
                        </div>
                    </div>
                    <div className="info-card">
                        <h4>Certifications</h4>
                        {candidate.certifications && candidate.certifications.length > 0 ? (
                            <ul className="certifications-list">
                                {candidate.certifications.map((cert, index) => (
                                    <li key={index}>
                                        <span className="material-symbols-outlined">workspace_premium</span>
                                        <span>{cert}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="placeholder-text" style={{fontSize: '12px'}}>No certifications listed.</p>
                        )}
                    </div>
                    <div className="info-card">
                        <h4>Links</h4>
                        {candidate.links && candidate.links.length > 0 ? (
                            <ul className="links-list">
                                {candidate.links.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                                            <span className="material-symbols-outlined">{getLinkIcon(link.url)}</span>
                                            <span>{link.name || link.url}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="placeholder-text" style={{fontSize: '12px'}}>No links provided.</p>
                        )}
                    </div>
                     <div className="info-card interactive-card">
                        <h4>Tags</h4>
                        <div className="tags-container-detail">
                             {candidate.tags.map(tag => {
                                const color = getTagColor(tag);
                                const style = { '--tag-shadow-color': color.shadow } as React.CSSProperties;
                                return (<span key={tag} style={style} className={`skill-tag interactive ${color.bg} ${color.text} ${color.border}`}>{tag}<button onClick={() => handleRemoveTag(tag)}>&times;</button></span>);
                             })}
                        </div>
                        <div className="add-item-form">
                            <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add a tag..." onKeyPress={e => e.key === 'Enter' && handleAddTag()}/>
                            <button onClick={handleAddTag}>Add</button>
                        </div>
                    </div>
                     <div className="info-card interactive-card">
                        <h4>Tasks</h4>
                         <ul className="task-list">
                            {candidate.tasks.map(task => (
                                <li key={task.id} className={task.completed ? 'completed' : ''}>
                                    <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id)} />
                                    <span>{task.text}</span>
                                </li>
                            ))}
                        </ul>
                         <form className="add-item-form" onSubmit={handleAddTask}>
                            <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a new task..." />
                            <button type="submit">Add</button>
                        </form>
                    </div>
                     <div className="info-card interactive-card">
                        <h4>Notes</h4>
                        <form className="add-item-form vertical" onSubmit={handleAddNote}>
                            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..."></textarea>
                            <button type="submit">Save Note</button>
                        </form>
                        <ul className="notes-list">
                            {candidate.notes.map(note => (
                                <li key={note.id}>
                                    <p className="note-text">{note.text}</p>
                                    <small className="note-meta">by {note.author} on {new Date(note.date).toLocaleDateString()}</small>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CandidateDetailPage;