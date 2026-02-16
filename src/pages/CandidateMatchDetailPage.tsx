import React, { useMemo } from 'react';
import { Candidate, JobDescription } from '../types/types';
import SkillTag from '../components/common/SkillTag';

const CandidateMatchDetailPage = ({ candidate, job, onBack, onUpdateCandidate }) => {
    const { matchingSkills, missingSkills } = useMemo(() => {
        const candidateSkillsLower = new Set(candidate.skills.map(s => s.toLowerCase()));
        const requiredSkillsLower = job.requiredSkills.map(s => s.toLowerCase());

        const matching = job.requiredSkills.filter(skill => candidateSkillsLower.has(skill.toLowerCase()));
        const missing = job.requiredSkills.filter(skill => !candidateSkillsLower.has(skill.toLowerCase()));
        
        return { matchingSkills: matching, missingSkills: missing };
    }, [candidate.skills, job.requiredSkills]);

    const statuses: Candidate['status'][] = ['Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
    const handleUpdate = (field, value) => {
        onUpdateCandidate({ ...candidate, [field]: value });
    };

    return (
        <div className="page-content candidate-match-detail-page">
            <div className="page-header">
                <button onClick={onBack} className="back-button">
                    <span className="material-symbols-outlined">arrow_back</span> Back to Matched Candidates
                </button>
            </div>
            <header className="detail-header-card match-detail-header">
                <div className="candidate-avatar large">{candidate.avatar}</div>
                <div className="detail-header-info">
                    <h1>{candidate.name}</h1>
                    <p className="candidate-title">Match for: <strong>{job.title}</strong></p>
                    <div className="contact-info-bar">
                        <span><span className="material-symbols-outlined">mail</span>{candidate.email || 'N/A'}</span>
                        <span><span className="material-symbols-outlined">phone</span>{candidate.phone || 'N/A'}</span>
                        <span><span className="material-symbols-outlined">location_on</span>{candidate.location || 'N/A'}</span>
                    </div>
                </div>
                <div className="match-score-display">
                    <div className="score-circle">
                         <svg viewBox="0 0 36 36" className="circular-chart">
                            <defs>
                                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8B5CF6" />
                                <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="circle"
                                strokeDasharray={`${candidate.jobSpecificMatchScore}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span className="score-text">{candidate.jobSpecificMatchScore}%</span>
                    </div>
                    <span className="score-label">Match Score</span>
                </div>
                <div className="detail-header-actions">
                    <div className="status-editor">
                        <select value={candidate.status} onChange={(e) => handleUpdate('status', e.target.value)} className={`status-pill editable ${candidate.status.toLowerCase()}`}>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <div className="detail-body-grid">
                <main className="detail-main-content">
                    <div className="info-card skills-comparison-card">
                        <h4>Skill Alignment</h4>
                        <div className="skills-comparison-grid">
                            <div className="skills-column">
                                <h5 className="matching"><span className="material-symbols-outlined">done</span> Matching Skills ({matchingSkills.length})</h5>
                                <div className="skills-container">
                                    {matchingSkills.length > 0 ? matchingSkills.map(skill => <SkillTag key={skill} tag={skill} className="matching" />) : <p className="placeholder-text">No matching skills found.</p>}
                                </div>
                            </div>
                            <div className="skills-column">
                                <h5 className="missing"><span className="material-symbols-outlined">close</span> Missing Skills ({missingSkills.length})</h5>
                                 <div className="skills-container">
                                    {missingSkills.length > 0 ? missingSkills.map(skill => <SkillTag key={skill} tag={skill} className="missing" />) : <p className="placeholder-text">No missing skills. Perfect match!</p>}
                                </div>
                            </div>
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
                        <h4>All Skills</h4>
                        <div className="skills-container">
                            {candidate.skills && candidate.skills.length > 0 
                                ? candidate.skills.map(skill => <SkillTag key={skill} tag={skill} />)
                                : <p className="placeholder-text" style={{fontSize: '12px'}}>No skills extracted.</p>
                            }
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CandidateMatchDetailPage;
