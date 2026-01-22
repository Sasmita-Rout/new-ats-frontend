import React, { useState, useRef, useEffect } from 'react';
import { JobDescription } from '../../types/types';

const JobStatusEditor = ({ status, onStatusChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);
    const jobStatuses: JobDescription['status'][] = ['Active', 'Paused', 'Closed'];

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        onStatusChange(e.target.value as JobDescription['status']);
        setIsEditing(false);
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        setIsEditing(false);
    };
    
    useEffect(() => {
        if (isEditing) {
            selectRef.current?.focus();
        }
    }, [isEditing]);
    
    if (isEditing) {
        return (
             <select
                ref={selectRef}
                value={status}
                onChange={handleChange}
                onBlur={handleBlur}
                onClick={e => e.stopPropagation()}
                className={`status-pill editable ${status.toLowerCase()}`}
            >
                {jobStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        );
    }

    return (
        <span onClick={handleStatusClick} className={`status-pill editable ${status.toLowerCase()}`}>
            {status}
        </span>
    );
};

const JobCard = ({ job, onJobSelect, onAnalyzeFit, isAnalyzing, isProcessingAnalysis, onStatusUpdate, isSelected, onSelect, onDelete }) => (
    <div className={`job-card-wrapper ${isSelected ? 'selected' : ''}`}>
        <input 
            type="checkbox" 
            className="job-card-checkbox" 
            checked={isSelected} 
            onChange={(e) => {
                e.stopPropagation();
                onSelect(job.id);
            }}
            aria-label={`Select job ${job.title}`}
        />
        <div className="job-card" onClick={() => onJobSelect(job)}>
            <div className="job-card-main">
                <h3 className="job-card-title">{job.title}</h3>
                <p className="job-card-company">{job.companyName}</p>
                <div className="job-card-meta">
                    <span><span className="material-symbols-outlined">work</span> {job.experience || 'N/A'}</span>
                    <span><span className="material-symbols-outlined">location_on</span> {job.location}</span>
                    <span><span className="material-symbols-outlined">group</span> {job.numberOfPositions || 1} Position(s)</span>
                </div>
                <p className="job-card-description-snippet">
                    <span className="material-symbols-outlined">notes</span>
                    {(job.qualifications && job.qualifications[0]) || (job.description && job.description.substring(0, 100) + '...')}
                </p>
                <div className="job-card-skills">
                    {job.requiredSkills.slice(0, 5).map(skill => (
                        <span key={skill} className="skill-tag-simple">{skill}</span>
                    ))}
                    {job.requiredSkills.length > 5 && <span className="skill-tag-simple">+{job.requiredSkills.length - 5} more</span>}
                </div>
            </div>
            <div className="job-card-aside">
                <img 
                    src={job.companyLogo || `https://logo.clearbit.com/${job.companyName.toLowerCase().replace(/ /g, '')}.com?size=80`} 
                    alt={`${job.companyName} logo`} 
                    className="job-card-logo" 
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://via.placeholder.com/80'; }}
                />
                <div className="job-status-container">
                     <JobStatusEditor status={job.status} onStatusChange={(newStatus) => onStatusUpdate(job.id, newStatus)} />
                </div>
                 <div className="job-card-actions">
                     <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onAnalyzeFit();}} disabled={isProcessingAnalysis}>
                        {isProcessingAnalysis ? (
                            <span className="material-symbols-outlined spin">autorenew</span>
                        ) : (
                            <span className="material-symbols-outlined">{isAnalyzing ? 'visibility_off' : 'query_stats'}</span>
                        )}
                        {isProcessingAnalysis ? 'Analyzing...' : (isAnalyzing ? 'Hide' : 'Analyze Fit')}
                    </button>
                     <button 
                        className="icon-btn" 
                        title="Delete Job" 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete the job "${job.title}"? This action cannot be undone.`)) {
                                onDelete(job.id);
                            }
                        }}
                    >
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default JobCard;