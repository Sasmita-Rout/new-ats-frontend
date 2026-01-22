import React, { useState, useEffect } from 'react';
import { Candidate, JobDescription } from '../types/types';
import FilterBar from '../components/candidates/FilterBar';
import ProcessingQueue from '../components/common/ProcessingQueue';
import SkillTag from '../components/common/SkillTag';
import { exportToCSV } from '../utils/helpers';

const BATCH_SIZE = 10;

const CandidatesPage = ({ candidates, onCandidateSelect, selectedJob, onBack, filters, onFilterChange, onClearFilters, searchTerm, onSearchChange, onUpload, stagedResumes, isProcessing, processingStatus, onProcess, onClear, onDeleteCandidates, onRemoveResume, onEmailSelected, onAnalyzeSelected }) => {
    const [displayLimit, setDisplayLimit] = useState(10);
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [candidates, displayLimit]);

    useEffect(() => {
        setSelectedIds([]);
    }, [candidates, filters, searchTerm]);

    const handleDisplayLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const newLimit = value === 'all' ? Number.MAX_SAFE_INTEGER : Number(value);
        setDisplayLimit(newLimit);
    };
    
    const handleLoadMore = () => {
        setVisibleCount(prev => prev + BATCH_SIZE);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleIds = candidates.slice(0, visibleCount).map(c => c.id);
            setSelectedIds(allVisibleIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected candidates? This action cannot be undone.`)) {
            onDeleteCandidates(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleEmailClick = () => {
        onEmailSelected(selectedIds);
        setSelectedIds([]);
    };
    
    const handleAnalyzeClick = () => {
        onAnalyzeSelected(selectedIds);
    };
    
    const handleExportCSV = () => {
        const dataToExport = selectedIds.length > 0
            ? candidates.filter(c => selectedIds.includes(c.id))
            : candidates;

        if (dataToExport.length === 0) {
            alert("No candidates to export.");
            return;
        }

        const formattedData = dataToExport.map(c => ({
            'Name': c.name,
            'Title': c.title,
            'Category': c.category,
            'Email': c.contact.email,
            'Phone': c.contact.phone,
            'Location': c.contact.location,
            'Status': c.status,
            'Applied Date': c.appliedDate,
            'Salary Expectation': c.salaryExpectation,
            'Skills': c.skills.join('; '),
            ...(selectedJob && { 'Match Score (%)': c.jobSpecificMatchScore }),
        }));
        
        const filename = `candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(formattedData, filename);
    };

    const canLoadMore = visibleCount < candidates.length && visibleCount < displayLimit;
    const visibleCandidates = candidates.slice(0, visibleCount);
    const selectedVisibleCount = visibleCandidates.filter(c => selectedIds.includes(c.id)).length;
    
    return (
        <div className="page-content">
            <div className="page-header">
                {selectedJob ? (
                    <>
                        <h1>Candidates for: {selectedJob.title}</h1>
                        <p>Showing candidates ranked by match score for the selected job.</p>
                         <button onClick={onBack} className="back-button small"><span className="material-symbols-outlined">arrow_back</span> Back to Jobs</button>
                    </>
                ) : (
                     <>
                        <h1>All Candidates</h1>
                        <p>Manage and review all candidate applications in your talent pool.</p>
                    </>
                )}
            </div>
            <div className="toolbar">
                <div className="search-bar-wrapper">
                    <span className="material-symbols-outlined">search</span>
                    <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)} placeholder="Search by name, email, or skills..." />
                </div>
                <div className="actions">
                     {selectedIds.length > 0 ? (
                        <>
                            <span className="selection-count">{selectedIds.length} candidate(s) selected</span>
                             <button className="btn btn-secondary" onClick={handleAnalyzeClick}>
                                <span className="material-symbols-outlined">query_stats</span> Analyze Fit
                            </button>
                             <button className="btn btn-secondary" onClick={handleEmailClick}>
                                <span className="material-symbols-outlined">mail</span> Email Selected
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <span className="material-symbols-outlined">download</span> Export Selected
                            </button>
                            <button className="btn btn-danger" onClick={handleDeleteSelected}>
                                <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="page-size-selector">
                                <label htmlFor="displayLimit">Show up to:</label>
                                <select id="displayLimit" value={displayLimit === Number.MAX_SAFE_INTEGER ? 'all' : displayLimit} onChange={handleDisplayLimitChange}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={'all'}>All</option>
                                </select>
                            </div>
                            <button className="btn btn-secondary" onClick={() => setIsFiltersVisible(!isFiltersVisible)}>
                                <span className="material-symbols-outlined">filter_list</span> {isFiltersVisible ? 'Hide' : 'Show'} Filters
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <span className="material-symbols-outlined">download</span> Export All
                            </button>
                            <button className="btn btn-primary" onClick={onUpload}>
                                <span className="material-symbols-outlined">upload</span> Add Resumes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isFiltersVisible && <FilterBar filters={filters} onFilterChange={onFilterChange} onClear={onClearFilters} context="main" />}
            
            {stagedResumes.length > 0 && <ProcessingQueue stagedFiles={stagedResumes} isProcessing={isProcessing} processingStatus={processingStatus} onProcess={onProcess} onClear={onClear} onRemoveFile={onRemoveResume} itemType="resume" />}

            {candidates.length > 0 ? (
                 <div className="candidates-table-container">
                    <table className="candidates-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={visibleCandidates.length > 0 && selectedVisibleCount === visibleCandidates.length}
                                        ref={el => {
                                            if (el) {
                                                el.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCandidates.length;
                                            }
                                        }}
                                        aria-label="Select all visible candidates"
                                    />
                                </th>
                                <th>Candidate</th>
                                <th>Contact & Location</th>
                                <th>Current Role</th>
                                <th>Skills</th>
                                {selectedJob && <th>Match Score</th>}
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleCandidates.map(candidate => (
                                <tr key={candidate.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(candidate.id)}
                                            onChange={() => handleSelectOne(candidate.id)}
                                            aria-label={`Select ${candidate.name}`}
                                        />
                                    </td>
                                    <td>
                                        <div className="candidate-cell">
                                            <div className="candidate-avatar">{candidate.avatar}</div>
                                            <div>
                                                <a href="#" className="candidate-name" onClick={(e) => { e.preventDefault(); onCandidateSelect(candidate); }}>{candidate.name}</a>
                                                <p className="candidate-title">{candidate.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p>{candidate.contact.email}</p>
                                        <p>{candidate.contact.location}</p>
                                    </td>
                                    <td><p><strong>{candidate.title}</strong></p></td>
                                    <td>
                                        <div className="skills-container">
                                            {candidate.skills.slice(0, 3).map(skill => <SkillTag key={skill} tag={skill} />)}
                                            {candidate.skills.length > 3 && (
                                                <span className="skill-tag bg-gray-200 text-gray-800 border-gray-300">
                                                    +{candidate.skills.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {selectedJob && (
                                        <td><span className={`match-score`}>{(candidate.jobSpecificMatchScore || 0)}%</span></td>
                                    )}
                                    <td><span className={`status-pill ${candidate.status.toLowerCase()}`}>{candidate.status}</span></td>
                                    <td>{candidate.appliedDate}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="icon-btn" title="View Details" onClick={() => onCandidateSelect(candidate)}>
                                                <span className="material-symbols-outlined">visibility</span>
                                            </button>
                                            <button 
                                                className="icon-btn" 
                                                title="Delete Candidate" 
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete ${candidate.name}? This action cannot be undone.`)) {
                                                        onDeleteCandidates([candidate.id]);
                                                    }
                                                }}
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {canLoadMore && (
                        <div className="load-more-container">
                            <button onClick={handleLoadMore} className="btn btn-secondary">
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                stagedResumes.length === 0 && (
                    <div className="empty-state large">
                        <span className="material-symbols-outlined">group_add</span>
                        <h3>Your Candidate Pool is Empty</h3>
                        <p>Ready to see the AI in action? Add resumes to the processing queue to get started.</p>
                        <button className="btn btn-primary" onClick={onUpload}>Add First Resumes</button>
                    </div>
                )
            )}
        </div>
    );
};

export default CandidatesPage;
