import React, { useState } from 'react';
import { JobDescription } from '../../types/types';

const getInitials = (name: string) => {
    const cleaned = (name || '').trim();
    if (!cleaned) return 'JD';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase() || 'JD';
};

const JobCard = ({ job, onJobSelect, onAnalyzeFit, isAnalyzing, isProcessingAnalysis, onEdit, onChangeJd, isSelected, onSelect, onDelete, showOwner }) => {
    const companyName = (job.companyName || '').trim();
    const companyDomain = companyName
        ? `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        : '';
    const [logoError, setLogoError] = useState(false);
    const logoSrc = job.companyLogo
        || (companyDomain ? `https://logo.clearbit.com/${companyDomain}?size=80` : '');
    const showLogo = !!logoSrc && !logoError;

    return (
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
                    {showOwner && (
                        <span><span className="material-symbols-outlined">person</span> {job.uploadedBy || 'Unknown'}</span>
                    )}
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
                {showLogo ? (
                    <img 
                        src={logoSrc} 
                        alt={`${job.companyName} logo`} 
                        className="job-card-logo" 
                        onError={() => setLogoError(true)}
                    />
                ) : (
                    <div className="job-card-logo-fallback" aria-label={`${job.companyName || 'Company'} logo`}>
                        {getInitials(companyName)}
                    </div>
                )}
                <div className="job-card-actions stack">
                    <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onJobSelect(job);}}>
                        <span className="material-symbols-outlined">visibility</span> View
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onEdit(job);}}>
                        <span className="material-symbols-outlined">edit</span> Edit
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onChangeJd(job);}}>
                        <span className="material-symbols-outlined">description</span> Change JD
                    </button>
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
                            onDelete(job.id);
                        }}
                    >
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
};

export default JobCard;
