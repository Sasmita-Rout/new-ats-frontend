import React from 'react';
import { Candidate, JobDescription } from '../types/types';
import SkillTag from '../components/common/SkillTag';

const CandidateFitAnalysisPage = ({ candidate, jobResults, onBack, onJobSelect }) => {
    if (!candidate) {
        return (
            <div className="page-content">
                <button onClick={onBack} className="back-button">
                    <span className="material-symbols-outlined">arrow_back</span> Back
                </button>
                <div className="empty-state large">
                    <h3>Error</h3>
                    <p>Candidate information not found. Please try again.</p>
                </div>
            </div>
        );
    }

    const displayResults = jobResults || [];
    
    return (
        <div className="page-content candidate-fit-analysis-page">
            <button onClick={onBack} className="back-button">
                <span className="material-symbols-outlined">arrow_back</span> Back to Recruiter Tools
            </button>
            <div className="card fit-analysis-header">
                <div className="user-avatar large">{candidate.avatar}</div>
                <div className="detail-header-info">
                    <h2>Analysis Results for: {candidate.name}</h2>
                    <p className="candidate-title">{candidate.title}</p>
                    <div className="skills-container" style={{marginTop: '12px'}}>
                        <strong>Key Skills:</strong> 
                        {candidate.skills.slice(0, 5).map(skill => <SkillTag key={skill} tag={skill} />)}
                        {candidate.skills.length > 5 && <span className="skill-tag">+{candidate.skills.length - 5}</span>}
                    </div>
                </div>
            </div>

            <div className="job-results-list">
                <h3>Top Job Matches</h3>
                {displayResults.length > 0 ? displayResults.map(job => (
                    <div key={job.id} className="card job-result-card" onClick={() => onJobSelect(job)}>
                        <div className="job-result-score">
                            <p className="score-value">{job.matchScore}%</p>
                            <p className="score-label">Match</p>
                        </div>
                        <div className="job-result-details">
                            <h4>{job.title}</h4>
                            <p>{job.companyName} &bull; {job.location}</p>
                            <p className="job-result-skills">
                                <strong>Required Skills:</strong> {job.requiredSkills.slice(0, 4).join(', ')}
                                {job.requiredSkills.length > 4 ? ` +${job.requiredSkills.length-4} more` : ''}
                            </p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward_ios</span>
                    </div>
                )) : (
                    <div className="empty-state large">
                        <span className="material-symbols-outlined">search_off</span>
                        <h3>No Matching Jobs Found</h3>
                        <p>We couldn't find any jobs that are a strong match for this candidate's skills. Try adding more job descriptions to the system.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateFitAnalysisPage;
