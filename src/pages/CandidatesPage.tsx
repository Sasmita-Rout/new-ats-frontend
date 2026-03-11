import React, { useState, useEffect } from 'react';
import { Candidate } from '../types/types';
import FilterBar from '../components/candidates/FilterBar';
import ProcessingQueue from '../components/common/ProcessingQueue';
import SkillTag from '../components/common/SkillTag';
import { exportToCSV } from '../utils/helpers';
import { toast } from 'react-toastify';

const RECENT_CANDIDATE_DAYS = 7;

const CandidatesPage = ({ candidates, totalCandidatesCount, onPageChange, onCandidateSelect, selectedJob, onBack, filters, onFilterChange, onClearFilters, searchTerm, onSearchChange, onUpload, stagedResumes, isProcessing, processingStatus, onProcess, onClear, onDeleteCandidates, onRemoveResume, onEmailSelected, onAnalyzeSelected: _onAnalyzeSelected, onViewCandidate, onScheduleSelected, onScheduleMeeting, canDeleteCandidates = false, confirmActionToast }) => {
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageIndex, setPageIndex] = useState(0);
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedSkillIds, setExpandedSkillIds] = useState<number[]>([]);

    useEffect(() => {
        setPageIndex(0);
    }, [filters, searchTerm, rowsPerPage]);

    useEffect(() => {
        setSelectedIds([]);
    }, [candidates, filters, searchTerm]);

    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const newLimit = value === 'all' ? Number.MAX_SAFE_INTEGER : Number(value);
        setRowsPerPage(newLimit);
        setPageIndex(0);
        if (typeof onPageChange === 'function' && typeof totalCandidatesCount === 'number' && totalCandidatesCount > candidates.length) {
            const effectiveLimit = newLimit === Number.MAX_SAFE_INTEGER ? 200 : newLimit;
            onPageChange(0, effectiveLimit);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleIds = visibleCandidates.map(c => c.id);
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

    const toggleSkillsExpanded = (id: number) => {
        setExpandedSkillIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (!canDeleteCandidates) return;
        const message = `Are you sure you want to delete ${selectedIds.length} selected candidates?`;
        const shouldDelete = confirmActionToast
            ? await confirmActionToast(message, 'Delete', 'Cancel')
            : false;
        if (shouldDelete) {
            onDeleteCandidates(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleBulkEmail = () => {
        if (!onEmailSelected || selectedIds.length === 0) return;
        onEmailSelected(selectedIds);
    };

    const handleBulkSchedule = () => {
        if (!onScheduleSelected || selectedIds.length === 0) return;
        const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
        onScheduleSelected(selectedCandidates);
    };

    const handleExportCSV = () => {
        const dataToExport = selectedIds.length > 0
            ? candidates.filter(c => selectedIds.includes(c.id))
            : candidates;

        if (dataToExport.length === 0) {
            toast.info('No candidates to export.');
            return;
        }

        const formattedData = dataToExport.map(c => ({
            'Name': c.name,
            'Category': c.category,
            'Email': c.email,
            'Phone': c.phone,
            'Location': c.location,
            'Applied Date': c.appliedDate,
            'Salary Expectation': c.salaryExpectation,
            'Skills': c.skills.join('; '),
            ...(selectedJob && { 'Match Score (%)': c.jobSpecificMatchScore }),
        }));
        
        const filename = `candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(formattedData, filename);
    };

    const totalCandidates = candidates.length;
    const totalForLabel = typeof totalCandidatesCount === 'number' ? totalCandidatesCount : totalCandidates;
    const isServerPaged = typeof totalCandidatesCount === 'number' && totalCandidatesCount > totalCandidates;
    const effectiveRowsPerPage = rowsPerPage === Number.MAX_SAFE_INTEGER
        ? (isServerPaged ? 200 : Number.MAX_SAFE_INTEGER)
        : rowsPerPage;
    const pageCount = effectiveRowsPerPage === Number.MAX_SAFE_INTEGER
        ? 1
        : Math.max(1, Math.ceil(totalForLabel / effectiveRowsPerPage));
    const safePageIndex = Math.min(pageIndex, pageCount - 1);
    const pageStart = effectiveRowsPerPage === Number.MAX_SAFE_INTEGER ? 0 : safePageIndex * effectiveRowsPerPage;
    const pageEnd = effectiveRowsPerPage === Number.MAX_SAFE_INTEGER ? totalForLabel : Math.min(pageStart + effectiveRowsPerPage, totalForLabel);
    const visibleCandidates = isServerPaged ? candidates : candidates.slice(pageStart, pageEnd);
    const selectedVisibleCount = visibleCandidates.filter(c => selectedIds.includes(c.id)).length;
    const isPaginationDisabled = totalForLabel === 0 || pageCount === 1;
    const rangeLabel = totalCandidates === 0
        ? `0–0 of ${totalForLabel}`
        : `${pageStart + 1}–${pageEnd} of ${totalForLabel}`;
    const isPrevDisabled = isPaginationDisabled || safePageIndex === 0;
    const isNextDisabled = isPaginationDisabled || safePageIndex >= pageCount - 1;

    const handlePrevPage = () => {
        if (isPrevDisabled) return;
        const nextPage = Math.max(0, safePageIndex - 1);
        setPageIndex(nextPage);
        if (typeof onPageChange === 'function' && isServerPaged) {
            onPageChange(nextPage, effectiveRowsPerPage);
        }
    };

    const handleNextPage = () => {
        if (isNextDisabled) return;
        const nextPage = Math.min(pageCount - 1, safePageIndex + 1);
        setPageIndex(nextPage);
        if (typeof onPageChange === 'function' && isServerPaged) {
            onPageChange(nextPage, effectiveRowsPerPage);
        }
    };

    const isRecentCandidate = (appliedDate: string) => {
        const applied = new Date(appliedDate);
        if (Number.isNaN(applied.getTime())) return false;
        const now = new Date();
        const diffDays = (now.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= RECENT_CANDIDATE_DAYS;
    };
    
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
                <div className={`actions ${selectedIds.length > 0 ? 'bulk-selected-actions' : ''}`}>
                     {selectedIds.length > 0 ? (
                        <>
                            <span className="selection-count">{selectedIds.length} candidate(s) selected</span>
                            <button className="btn btn-secondary" onClick={handleBulkEmail} disabled={!onEmailSelected}>
                                <span className="material-symbols-outlined">mail</span> Email
                            </button>
                            <button className="btn btn-secondary" onClick={handleBulkSchedule} disabled={!onScheduleSelected}>
                                <span className="material-symbols-outlined">event</span> Schedule Interview
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <span className="material-symbols-outlined">download</span> Export Selected
                            </button>
                            {canDeleteCandidates && (
                                <button className="btn btn-danger" onClick={handleDeleteSelected}>
                                    <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="candidates-main-actions-row">
                            <button className="btn btn-secondary" onClick={() => setIsFiltersVisible(!isFiltersVisible)}>
                                <span className="material-symbols-outlined">filter_list</span> {isFiltersVisible ? 'Hide' : 'Show'} Filters
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <span className="material-symbols-outlined">download</span> Export All
                            </button>
                            <button className="btn btn-primary" onClick={onUpload}>
                                <span className="material-symbols-outlined">upload</span> Add Resumes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isFiltersVisible && <FilterBar filters={filters} onFilterChange={onFilterChange} onClear={onClearFilters} context="main" onExport={handleExportCSV} />}
            
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
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Location</th>
                                <th>Skills</th>
                                {selectedJob && <th>Match Score</th>}
                                <th>Applied</th>
                                <th style={{ paddingLeft: '20px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleCandidates.map(candidate => {
                                const isSkillsExpanded = expandedSkillIds.includes(candidate.id);
                                const totalColumns = selectedJob ? 9 : 8;

                                return (
                                <React.Fragment key={candidate.id}>
                                <tr className={isRecentCandidate(candidate.appliedDate) ? 'candidate-row-recent' : 'candidate-row-stale'}>
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
                                            <div>
                                                <a
                                                    href="#"
                                                    className="candidate-name"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (onViewCandidate) {
                                                            onViewCandidate(candidate);
                                                        } else {
                                                            onCandidateSelect(candidate);
                                                        }
                                                    }}
                                                >
                                                    {candidate.name}
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{candidate.email}</td>
                                    <td>{candidate.phone}</td>
                                    <td>{candidate.location}</td>
                                    <td>
                                        <div className="skills-container">
                                            {candidate.skills.slice(0, 3)
                                                .map(skill => <SkillTag key={skill} tag={skill} />)}
                                            {candidate.skills.length > 3 && (
                                                <button
                                                    type="button"
                                                    className="skill-tag bg-gray-200 text-gray-800 border-gray-300"
                                                    onClick={() => toggleSkillsExpanded(candidate.id)}
                                                    aria-label={isSkillsExpanded ? "Show fewer skills" : "Show all skills"}
                                                >
                                                    {`+${candidate.skills.length - 3} more`}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    {selectedJob && (
                                        <td><span className={`match-score`}>{(candidate.jobSpecificMatchScore || 0)}%</span></td>
                                    )}
                                    <td>{candidate.appliedDate}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="icon-btn candidate-action-icon" title="View Details" onClick={() => onViewCandidate ? onViewCandidate(candidate) : onCandidateSelect(candidate)}>
                                                <span className="material-symbols-outlined">visibility</span>
                                            </button>
                                            <button
                                                className="icon-btn candidate-action-icon"
                                                title="Send Email"
                                                onClick={() => onEmailSelected?.([candidate.id])}
                                            >
                                                <span className="material-symbols-outlined">mail</span>
                                            </button>
                                            {canDeleteCandidates && (
                                                <button
                                                    className="icon-btn candidate-action-icon"
                                                    title="Delete Candidate"
                                                    onClick={async () => {
                                                        const message = `Are you sure you want to delete ${candidate.name}? This action cannot be undone.`;
                                                        const shouldDelete = confirmActionToast
                                                            ? await confirmActionToast(message, 'Delete', 'Cancel')
                                                            : false;
                                                        if (shouldDelete) {
                                                            onDeleteCandidates([candidate.id]);
                                                        }
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-small candidate-schedule-btn"
                                                title="Schedule Interview"
                                                onClick={() => {
                                                    if (onScheduleMeeting) {
                                                        onScheduleMeeting(candidate);
                                                        return;
                                                    }
                                                    if (onScheduleSelected) {
                                                        onScheduleSelected([candidate]);
                                                    }
                                                }}
                                            >
                                                <span className="material-symbols-outlined">event</span> Schedule Interview
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {isSkillsExpanded && (
                                    <tr className="candidate-skill-expanded-row">
                                        <td colSpan={totalColumns}>
                                            <div className="candidate-skill-expanded-panel">
                                                <strong>All Skills:</strong>
                                                <div className="skills-container">
                                                    {candidate.skills.map(skill => <SkillTag key={`${candidate.id}-${skill}`} tag={skill} />)}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                    <div className="candidates-pagination">
                        <div className="rows-per-page">
                            <label htmlFor="rowsPerPage">Rows per page:</label>
                            <select id="rowsPerPage" value={rowsPerPage === Number.MAX_SAFE_INTEGER ? 'all' : rowsPerPage} onChange={handleRowsPerPageChange}>
                                <option value={10}>10</option>
                            </select>
                        </div>
                        <div className="pagination-range">{rangeLabel}</div>
                        <div className="pagination-actions">
                            <button
                                type="button"
                                className="icon-btn pagination-icon"
                                onClick={handlePrevPage}
                                disabled={isPrevDisabled}
                                aria-label="Previous page"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button
                                type="button"
                                className="icon-btn pagination-icon"
                                onClick={handleNextPage}
                                disabled={isNextDisabled}
                                aria-label="Next page"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
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
