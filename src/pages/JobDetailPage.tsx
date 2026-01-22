import React from 'react';
import { JobDescription } from '../types/types';
import SkillTag from '../components/common/SkillTag';

const JobDetailPage = ({ job, onBack, onMatch, onEdit }) => (
    <div className="page-content">
         <button onClick={onBack} className="back-button">
            <span className="material-symbols-outlined">arrow_back</span> Back to Jobs
        </button>
        <div className="job-detail-header-v2">
            <div className="job-detail-header-v2-main">
                <h1>{job.title}</h1>
                 <p className="job-meta-detail-page">
                    {job.companyName} &bull; {job.location}
                </p>
            </div>
             <div className="job-detail-header-v2-actions">
                <button className="btn btn-secondary" onClick={() => onEdit(job)}>
                    <span className="material-symbols-outlined">edit</span> Edit
                </button>
                <button className="btn btn-secondary"><span className="material-symbols-outlined">bookmark</span> Save Job</button>
                <button className="btn btn-primary" onClick={() => onMatch(job)}>
                    <span className="material-symbols-outlined">person_search</span> Match Candidates
                </button>
            </div>
        </div>
       
        <div className="job-detail-grid">
            <main className="job-detail-main">
                <div className="job-detail-card-v2">
                    <div className="job-detail-section">
                        <h3>Job Highlights</h3>
                        <ul className="styled-list">{job.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
                    </div>
                     <div className="job-detail-section">
                        <h3>Job Description</h3>
                        <p>{job.description}</p>
                    </div>
                    <div className="job-detail-section">
                        <h3>Key Responsibilities</h3>
                        <ul className="styled-list">{job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                    <div className="job-detail-section">
                        <h3>Required Skills and Qualifications</h3>
                        <ul className="styled-list">{job.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul>
                    </div>
                    {job.preferredQualifications.length > 0 && (
                        <div className="job-detail-section">
                            <h3>Preferred Qualifications</h3>
                            <ul className="styled-list">{job.preferredQualifications.map((q, i) => <li key={i}>{q}</li>)}</ul>
                        </div>
                    )}
                </div>
            </main>
            <aside className="job-detail-sidebar">
                 <div className="job-detail-card-v2">
                    <h3>Job Overview</h3>
                    <div className="job-overview-grid">
                         <div><span><span className="material-symbols-outlined">work</span>Experience</span><p>{job.experience}</p></div>
                         <div><span><span className="material-symbols-outlined">group</span>Open Positions</span><p>{job.numberOfPositions}</p></div>
                         <div><span><span className="material-symbols-outlined">paid</span>Salary</span><p>{job.salary}</p></div>
                         <div><span><span className="material-symbols-outlined">apartment</span>Industry</span><p>{job.industry}</p></div>
                         <div><span><span className="material-symbols-outlined">business_center</span>Role Category</span><p>{job.roleCategory}</p></div>
                         <div><span><span className="material-symbols-outlined">corporate_fare</span>Department</span><p>{job.department}</p></div>
                         <div><span><span className="material-symbols-outlined">schedule</span>Job Type</span><p>{job.type}</p></div>
                    </div>
                 </div>
                 <div className="job-detail-card-v2">
                     <h3>Key Skills</h3>
                     <div className="skills-container">
                        {job.requiredSkills.map(skill => <SkillTag key={skill} tag={skill} />)}
                    </div>
                 </div>
            </aside>
        </div>
    </div>
);

export default JobDetailPage;