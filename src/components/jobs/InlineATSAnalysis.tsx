import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, JobDescription, CandidateWithScore } from '../../types/types';
import FilterBar from '../candidates/FilterBar';
import { exportToCSV } from '../../utils/helpers';

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
    onEmailSelected,
    onViewCandidate,
    onScheduleMeeting,
    onEmailSelectedCandidates,
    onScheduleBulk
}: {
    job: JobDescription;
    analysisResult: AnalysisResult;
    onCandidateSelect: (c: Candidate) => void;
    onDeleteCandidates: (ids: number[]) => void;
    onEmailSelected: (ids: number[]) => void;
    onViewCandidate: (c: Candidate) => void;
    onScheduleMeeting: (c: Candidate, jobId?: string) => void;
    onEmailSelectedCandidates?: (candidates: Candidate[]) => void;
    onScheduleBulk?: (candidates: Candidate[], jobId?: string) => void;
}) => {

    const [filters, setFilters] = useState(defaultFilters);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedMissingSkillIds, setExpandedMissingSkillIds] = useState<number[]>([]);
    if (!analysisResult) return null;

    const { loading, candidates: initialRankedCandidates, keywords } = analysisResult;

    const filteredCandidates = useMemo(() => {
        const filtered = initialRankedCandidates.filter(c => {
            const locationValue = (c.location || c.contact?.location || c.originalLocation || '').toString();
            const skillsValue = Array.isArray(c.skills) ? c.skills : [];
            const tagsValue = Array.isArray(c.tags) ? c.tags : [];
            const educationValue = Array.isArray(c.education) ? c.education : [];
            const experienceValue = Array.isArray(c.experience) ? c.experience : [];
            const originalSkillsValue = c.originalSkills || '';
            const originalExperienceValue = c.originalExperience || '';
            const matchedSkillsValue = Array.isArray(c.matchingSkills) ? c.matchingSkills : [];

            const statusMatch = filters.status.length === 0 || filters.status.includes(c.status);
            const skillsMatch = !filters.skills || filters.skills.toLowerCase().split(',').every(skill => {
                const term = skill.trim();
                if (!term) return true;
                return (
                    skillsValue.some(cs => cs.toLowerCase().includes(term)) ||
                    matchedSkillsValue.some(ms => ms.toLowerCase().includes(term)) ||
                    originalSkillsValue.toLowerCase().includes(term)
                );
            });
            const locationMatch = !filters.location || locationValue.toLowerCase().includes(filters.location.toLowerCase());
            const categoryMatch = !filters.roleCategory || (c.category || '').toLowerCase().includes(filters.roleCategory.toLowerCase());
            const educationMatch = !filters.education || (educationValue.length > 0 && educationValue.some(edu =>
                edu.degree.toLowerCase().includes(filters.education.toLowerCase()) ||
                edu.institution.toLowerCase().includes(filters.education.toLowerCase())
            ));
            const salaryMin = parseFloat(filters.salaryMin);
            const salaryMax = parseFloat(filters.salaryMax);
            const salaryMatch = (!filters.salaryMin || (c.salaryExpectation && c.salaryExpectation >= salaryMin)) &&
                                (!filters.salaryMax || (c.salaryExpectation && c.salaryExpectation <= salaryMax));
            const tagsMatch = !filters.tags || filters.tags.toLowerCase().split(',').every(tag => {
                const term = tag.trim();
                if (!term) return true;
                return tagsValue.some(ct => ct.toLowerCase().includes(term));
            });
            const experienceMatch = !filters.experience || filters.experience.toLowerCase().split(',').every(expTerm => {
                const term = expTerm.trim();
                if (!term) return true;
                const totalExpText = `${c.totalExperienceYears ?? ''}`.toLowerCase();
                return (
                    totalExpText.includes(term) ||
                    experienceValue.some(exp => `${exp.title} ${exp.company} ${exp.description}`.toLowerCase().includes(term)) ||
                    originalExperienceValue.toLowerCase().includes(term)
                );
            });

            return statusMatch && skillsMatch && locationMatch && categoryMatch && educationMatch && salaryMatch && tagsMatch && experienceMatch;
        });

        const deduped = new Map<string, CandidateWithScore>();
        for (const c of filtered) {
            const emailKey = (c.email || '').trim().toLowerCase();
            const phoneKey = (c.phone || '').replace(/\D/g, '');
            const locationKey = (c.location || c.contact?.location || c.originalLocation || '').toString().trim().toLowerCase();
            const nameKey = (c.name || '').trim().toLowerCase();
            const key = emailKey || (phoneKey ? `phone:${phoneKey}` : `name:${nameKey}|loc:${locationKey}`);

            if (!key) continue;
            const existing = deduped.get(key);
            if (!existing) {
                deduped.set(key, c);
                continue;
            }

            const existingScore = existing.overallScore ?? 0;
            const nextScore = c.overallScore ?? 0;
            const existingLoc = existing.location_matched === true;
            const nextLoc = c.location_matched === true;

            if (nextScore > existingScore || (nextScore === existingScore && nextLoc && !existingLoc)) {
                deduped.set(key, c);
            }
        }

        return Array.from(deduped.values());
    }, [initialRankedCandidates, filters]);

    useEffect(() => {
        setSelectedIds([]);
    }, [filters, filteredCandidates]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredCandidates.map(c => c.id));
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
        if (onEmailSelectedCandidates) {
            const selectedCandidates = filteredCandidates.filter(c => selectedIds.includes(c.id));
            onEmailSelectedCandidates(selectedCandidates);
        } else {
            onEmailSelected(selectedIds);
        }
        setSelectedIds([]);
    };

    const handleScheduleBulk = () => {
        if (!onScheduleBulk) return;
        const selectedCandidates = filteredCandidates.filter(c => selectedIds.includes(c.id));
        const jobId = (job.jobId || job.id || '').toString();
        onScheduleBulk(selectedCandidates, jobId || undefined);
        setSelectedIds([]);
    };

    const handleExportCSV = () => {
        const data = selectedIds.length > 0
            ? filteredCandidates.filter(c => selectedIds.includes(c.id))
            : filteredCandidates;

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
        filteredCandidates.length > 0 &&
        selectedIds.length === filteredCandidates.length;

    const toggleMissingSkillsExpanded = (id: number) => {
        setExpandedMissingSkillIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

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

                                <button className="btn btn-secondary btn-small" onClick={handleScheduleBulk} disabled={!onScheduleBulk}>
                                    Schedule Interview
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
                            {filteredCandidates.length ? filteredCandidates.map(c => (

                                <tr key={c.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(c.id)}
                                            onChange={() => handleSelectOne(c.id)}
                                        />
                                    </td>

                                    <td>{c.name}</td>

                                    <td>{c.totalExperienceYears || 'N/A'}</td>

                                                                        {/* LOCATION */}
                                    <td>
                                        <span>{c.location_matched === true ? 'Yes' : 'No'}</span>
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
                                            ? (expandedMissingSkillIds.includes(c.id) ? c.missingSkills : c.missingSkills.slice(0, 5)).map(s => (
                                                <span key={s} className="missing-skill-tag">{s}</span>
                                            ))
                                            : <span style={{ color: '#10B981' }}>✓ All matched</span>
                                        }

                                        {c.missingSkills && c.missingSkills.length > 5 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleMissingSkillsExpanded(c.id)}
                                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '6px' }}
                                            >
                                                {expandedMissingSkillIds.includes(c.id) ? 'Show less' : `+${c.missingSkills.length - 5} more`}
                                            </button>
                                        )}
                                    </td>

                                    <td>
                                        <button onClick={() => onViewCandidate(c)}>View</button>
                                        <button onClick={() => onScheduleMeeting(c, (job.jobId || job.id || '').toString())} style={{ marginLeft: '8px' }}>
                                            Schedule Interview
                                        </button>
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

        </div>
    );
};

export default InlineATSAnalysis;

