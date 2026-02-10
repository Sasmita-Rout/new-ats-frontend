import React, { useState, useEffect } from 'react';
import { Candidate, JobDescription, CandidateWithScore } from '../../types/types';
import FilterBar from '../candidates/FilterBar';
import { exportToCSV } from '../../utils/helpers';
import CandidateProfileModal from '../../modals/CandidateProfileModal';

const defaultFilters = {
    status: [] as Candidate['status'][],
    skills: '',
    location: '',
    roleCategory: '',
    education: '',
    salaryMin: '',
    salaryMax: '',
    tags: '',
    experience: ''
};

type AnalysisResult = {
    loading: boolean;
    candidates: CandidateWithScore[];
    keywords: string[];
};

const InlineATSAnalysis = ({
    job,
    analysisResult,
    onCandidateSelect,
    onDeleteCandidates,
    onEmailSelected
}: {
    job: JobDescription;
    analysisResult: AnalysisResult;
    onCandidateSelect: (c: Candidate) => void;
    onDeleteCandidates: (ids: number[]) => void;
    onEmailSelected: (ids: number[]) => void;
}) => {

    const [filters, setFilters] = useState(defaultFilters);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

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
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${selectedIds.length} candidates?`)) {
            onDeleteCandidates(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleEmailClick = () => {
        onEmailSelected(selectedIds);
        setSelectedIds([]);
    };

    const handleExportCSV = () => {
        const data = selectedIds.length > 0
            ? initialRankedCandidates.filter(c => selectedIds.includes(c.id))
            : initialRankedCandidates;

        if (!data.length) return alert("No candidates");

        const formatted = data.map(c => ({
            'Candidate Name': c.name,
            'Title': c.title,
            'Overall Match (%)': c.overallScore ?? 0,
            'Experience Match': c.expMatch ? 'Yes' : 'No',
            'Education Match': c.eduMatch ? 'Yes' : 'No',
            'Missing Skills': c.missingSkills?.join('; ') ?? 'N/A',
        }));

        const filename = `${job.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(formatted, filename);
    };

    const allVisibleSelected =
        initialRankedCandidates.length > 0 &&
        selectedIds.length === initialRankedCandidates.length;

    return (
        <div className="inline-ats-analysis">

            {loading ? (
                <div className="loading-indicator">
                    <span className="material-symbols-outlined spin">auto_awesome</span>
                    <span>AI is ranking candidates...</span>
                </div>
            ) : (
                <>
                    <div className="analysis-keywords-header">
                        <strong>Filtered using keywords:</strong>
                        <div className="skills-container">
                            {keywords.map(k => (
                                <span key={k} className="skill-tag-simple">{k}</span>
                            ))}
                        </div>
                    </div>

                    <div className="inline-ats-toolbar">
                        {selectedIds.length > 0 ? (
                            <div className="selection-actions">
                                <span>{selectedIds.length} selected</span>

                                <button className="btn btn-secondary btn-small" onClick={handleEmailClick}>
                                    Email
                                </button>

                                <button className="btn btn-secondary btn-small" onClick={handleExportCSV}>
                                    Export
                                </button>

                                <button className="btn btn-danger btn-small" onClick={handleDeleteSelected}>
                                    Delete
                                </button>
                            </div>
                        ) : (
                            <>
                                <FilterBar filters={filters} onFilterChange={setFilters} onClear={() => setFilters(defaultFilters)} context="inline" />

                                <button className="btn btn-secondary" onClick={handleExportCSV} style={{ marginLeft: 'auto' }}>
                                    Export All
                                </button>
                            </>
                        )}
                    </div>

                    <table className="ats-table">

                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={allVisibleSelected}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Experience</th>
                                <th>Location</th>
                                <th>Score</th>
                                <th>Matched Skills</th>
                                <th>Missing Skills</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {initialRankedCandidates.length ? initialRankedCandidates.map(c => (

                                <tr key={c.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(c.id)}
                                            onChange={() => handleSelectOne(c.id)}
                                        />
                                    </td>

                                    <td>
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            onCandidateSelect(c);
                                        }}>{c.name}</a>
                                    </td>

                                    <td>{c.totalExperienceYears || 'N/A'}</td>

                                    {/* LOCATION */}
                        {/* ✅ LOCATION - Fixed */}
<td>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{c.contact?.location || c.location }</span>
        {c.location_matched === true && (
            <span style={{ color: '#10B981', fontSize: '16px' }} title="Location matches">✓</span>
        )}
        {c.location_matched === false && (
            <span style={{ color: '#EF4444', fontSize: '16px' }} title="Location does not match">✗</span>
        )}
    </div>
</td>

                                    <td>{c.overallScore}</td>

                                    {/* MATCHED */}
                                    <td>
                                        {c.matchingSkills?.length
                                            ? c.matchingSkills.map(s => (
                                                <span key={s} className="skill-tag-simple">{s}</span>
                                            ))
                                            : <span style={{ color: '#9CA3AF' }}>None</span>
                                        }
                                    </td>

                                    {/* MISSING */}
                                    <td>
                                        {c.missingSkills?.length
                                            ? c.missingSkills.slice(0, 5).map(s => (
                                                <span key={s} className="missing-skill-tag">{s}</span>
                                            ))
                                            : <span style={{ color: '#10B981' }}>✓ All matched</span>
                                        }

                                        {c.missingSkills && c.missingSkills.length > 5 &&
                                            <span style={{ color: '#9CA3AF' }}>
                                                +{c.missingSkills.length - 5} more
                                            </span>
                                        }
                                    </td>

                                    <td>
                                        <button onClick={() => setViewingCandidate(c)}>View</button>
                                        <button onClick={() => onDeleteCandidates([c.id])}>Delete</button>
                                    </td>
                                </tr>

                            )) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center' }}>No candidates</td>
                                </tr>
                            )}
                        </tbody>

                    </table>
                </>
            )}

            <CandidateProfileModal
                isOpen={Boolean(viewingCandidate)}
                onClose={() => setViewingCandidate(null)}
                candidate={viewingCandidate}
            />

        </div>
    );
};

export default InlineATSAnalysis;
