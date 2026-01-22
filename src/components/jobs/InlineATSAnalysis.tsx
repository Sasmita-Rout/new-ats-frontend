import React, { useState, useMemo, useEffect } from 'react';
import { Candidate, JobDescription, CandidateWithScore } from '../../types/types';
import FilterBar from '../candidates/FilterBar';
import { exportToCSV } from '../../utils/helpers';

const defaultFilters = { status: [] as Candidate['status'][], skills: '', location: '', roleCategory: '', education: '', salaryMin: '', salaryMax: '', tags: '', experience: '' };

type AnalysisResult = {
    loading: boolean;
    candidates: CandidateWithScore[];
    keywords: string[];
};

const InlineATSAnalysis = ({ job, analysisResult, onCandidateSelect, onDeleteCandidates, onEmailSelected }: { job: JobDescription, analysisResult: AnalysisResult, onCandidateSelect: (c: Candidate) => void, onDeleteCandidates: (ids: number[]) => void, onEmailSelected: (ids: number[]) => void }) => {
    const [filters, setFilters] = useState(defaultFilters);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    if (!analysisResult) return null;
    const { loading, candidates: initialRankedCandidates, keywords } = analysisResult;
    
    useEffect(() => {
        setSelectedIds([]);
    }, [filters, initialRankedCandidates]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(initialRankedCandidates.map(c => c.id));
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

    const handleExportCSV = () => {
        const dataToExport = selectedIds.length > 0
            ? initialRankedCandidates.filter(c => selectedIds.includes(c.id))
            : initialRankedCandidates;

        if (dataToExport.length === 0) {
            alert("No candidates to export.");
            return;
        }

        const formattedData = dataToExport.map(c => ({
            'Candidate Name': c.name,
            'Title': c.title,
            'Overall Match (%)': c.overallScore ?? 0,
            'Experience Match': c.expMatch ? 'Yes' : 'No',
            'Education Match': c.eduMatch ? 'Yes' : 'No',
            'Missing Skills': c.missingSkills?.join('; ') ?? 'N/A',
        }));
        
        const filename = `${job.title.replace(/\s+/g, '_')}_candidates_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(formattedData, filename);
    };

    const allVisibleSelected = initialRankedCandidates.length > 0 && selectedIds.length === initialRankedCandidates.length;

    return (
        <div className="inline-ats-analysis">
            {loading ? (
                <div className="loading-indicator">
                    <span className="material-symbols-outlined spin">auto_awesome</span>
                    <span>AI is finding and ranking relevant candidates...</span>
                </div>
            ) : (
                <>
                    <div className="analysis-keywords-header">
                        <strong>Filtered using keywords:</strong>
                        <div className="skills-container">
                            {keywords.map(kw => <span key={kw} className="skill-tag-simple">{kw}</span>)}
                        </div>
                    </div>

                    <div className="inline-ats-toolbar">
                        {selectedIds.length > 0 ? (
                            <div className="selection-actions">
                                <span className="selection-count">{selectedIds.length} candidate(s) selected</span>
                                <button className="btn btn-secondary btn-small" onClick={handleEmailClick}>
                                    <span className="material-symbols-outlined">mail</span> Email Selected
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={handleExportCSV}>
                                    <span className="material-symbols-outlined">download</span> Export Selected
                                </button>
                                <button className="btn btn-danger btn-small" onClick={handleDeleteSelected}>
                                    <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                                </button>
                            </div>
                        ) : (
                            <>
                                <FilterBar filters={filters} onFilterChange={setFilters} onClear={() => setFilters(defaultFilters)} context="inline" />
                                <button className="btn btn-secondary" onClick={handleExportCSV} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                    <span className="material-symbols-outlined">download</span> Export All
                                </button>
                            </>
                        )}
                    </div>
                    <div className="ats-table-container inline">
                        <table className="ats-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={allVisibleSelected}
                                            ref={el => { if (el) { el.indeterminate = selectedIds.length > 0 && !allVisibleSelected; }}}
                                            aria-label="Select all candidates in this view"
                                        />
                                    </th>
                                    <th>Candidate Name</th>
                                    <th>Experience</th>
                                    <th>Location</th>
                                    <th>Score</th>
                                    <th>Matched Skills</th>
                                    <th>Missing Skills</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialRankedCandidates.length > 0 ? initialRankedCandidates.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(c.id)}
                                                onChange={() => handleSelectOne(c.id)}
                                                aria-label={`Select ${c.name}`}
                                            />
                                        </td>
                                        <td>
                                            <div className="candidate-cell">
                                                <div className="user-avatar small">{c.avatar}</div>
                                                <div>
                                                    <a href="#" className="candidate-name" onClick={(e) => { e.preventDefault(); onCandidateSelect(c); }}>{c.name}</a>
                                                    <p className="candidate-title">{c.title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{c.totalExperienceYears}</td>
                                        <td>{c.contact.location}</td>
                                        <td>{c.overallScore}</td>
                                        <td>
                                            <div className="skills-container">
                                                {c.skills.map(skill => <span key={skill} className="skill-tag-simple">{skill}</span>)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="missing-skills-container">
                                                {c.missingSkills && c.missingSkills.length > 0
                                                    ? c.missingSkills.map(skill => <span key={skill} className="missing-skill-tag">{skill}</span>)
                                                    : <span className="perfect-match-text">Perfect Match!</span>
                                                }
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn btn-secondary btn-small" onClick={() => onCandidateSelect(c)}>
                                                View
                                            </button>
                                            <button className="btn btn-danger btn-small" onClick={() => onDeleteCandidates([c.id])}>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={8} style={{textAlign: 'center', padding: '32px', color: '#666'}}>No candidates match the current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default InlineATSAnalysis;