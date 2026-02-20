import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, JobDescription, CandidateWithScore, Interview } from '../../types/types';
import FilterBar from '../candidates/FilterBar';
import { exportToCSV } from '../../utils/helpers';
import InterviewDetailModal from '../../modals/InterviewDetailModal';

const defaultFilters = {
    skills: '',
    name: '',
    expMin: '',
    expMax: '',
    score: ''
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
    onScheduleBulk,
    organizerEmail,
    apiRequest,
}: {
    job: JobDescription;
    analysisResult: AnalysisResult;
    onCandidateSelect: (c: Candidate) => void;
    onDeleteCandidates: (ids: number[]) => void;
    onEmailSelected: (ids: number[]) => void;
    onViewCandidate: (c: Candidate) => void;
    onScheduleMeeting: (c: Candidate, jobId?: string) => void;
    onEmailSelectedCandidates?: (candidates: Candidate[], jobId?: string) => void;
    onScheduleBulk?: (candidates: Candidate[], jobId?: string) => void;
    organizerEmail?: string;
    apiRequest: (url: string, options?: RequestInit) => Promise<any>;
}) => {

    const [filters, setFilters] = useState(defaultFilters);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedMissingSkillIds, setExpandedMissingSkillIds] = useState<number[]>([]);
    const [emailSentMap, setEmailSentMap] = useState<Record<string, boolean>>({});
    const [interviewScheduledMap, setInterviewScheduledMap] = useState<Record<string, boolean>>({});
    const [isInterviewDetailOpen, setIsInterviewDetailOpen] = useState(false);
    const [selectedInterviewEvent, setSelectedInterviewEvent] = useState<{ candidate: Candidate; interview: Candidate['interviews'][number] } | null>(null);
    if (!analysisResult) return null;

    const { loading, candidates: initialRankedCandidates, keywords } = analysisResult;

    const filteredCandidates = useMemo(() => {
        const filtered = initialRankedCandidates.filter(c => {
            const skillsValue = Array.isArray(c.skills) ? c.skills : [];
            const originalSkillsValue = c.originalSkills || '';
            const matchedSkillsValue = Array.isArray(c.matchingSkills) ? c.matchingSkills : [];

            const skillsMatch = !filters.skills || filters.skills.toLowerCase().split(',').every(skill => {
                const term = skill.trim();
                if (!term) return true;
                return (
                    skillsValue.some(cs => cs.toLowerCase().includes(term)) ||
                    matchedSkillsValue.some(ms => ms.toLowerCase().includes(term)) ||
                    originalSkillsValue.toLowerCase().includes(term)
                );
            });
            const nameMatch = !filters.name || (c.name || '').toLowerCase().includes(filters.name.toLowerCase());
            const expMin = filters.expMin !== '' ? parseFloat(filters.expMin) : null;
            const expMax = filters.expMax !== '' ? parseFloat(filters.expMax) : null;
            const expValueRaw = c.totalExperienceYears;
            const expValue = typeof expValueRaw === 'number' ? expValueRaw : parseFloat(String(expValueRaw ?? ''));
            const experienceMatch =
                expMin === null && expMax === null
                    ? true
                    : Number.isFinite(expValue) &&
                      (expMin === null || expValue >= expMin) &&
                      (expMax === null || expValue <= expMax);

            const scoreRaw = c.overallScore;
            const scoreValue = typeof scoreRaw === 'number' ? scoreRaw : parseFloat(String(scoreRaw ?? ''));
            const scoreFilter = filters.score;
            let scoreMatch = true;
            if (scoreFilter) {
                if (!Number.isFinite(scoreValue)) {
                    scoreMatch = false;
                } else if (scoreFilter.startsWith('>=')) {
                    const threshold = parseFloat(scoreFilter.slice(2));
                    scoreMatch = Number.isFinite(threshold) ? scoreValue >= threshold : true;
                } else if (scoreFilter.startsWith('<=')) {
                    const threshold = parseFloat(scoreFilter.slice(2));
                    scoreMatch = Number.isFinite(threshold) ? scoreValue <= threshold : true;
                }
            }

            return skillsMatch && nameMatch && experienceMatch && scoreMatch;
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

    useEffect(() => {
        let active = true;
        const jobId = (job.jobId || job.id || '').toString();
        const emails = filteredCandidates
            .map(c => (c.email || '').trim().toLowerCase())
            .filter(Boolean);

        if (!emails.length) {
            setEmailSentMap({});
            setInterviewScheduledMap({});
            return;
        }

        const run = async () => {
            try {
                const emailResults = await Promise.all(
                    emails.map(email =>
                        apiRequest(`/communications/email/exists?candidate_email=${encodeURIComponent(email)}&job_id=${encodeURIComponent(jobId)}`)
                            .then(data => !!data?.exists)
                            .catch(() => false)
                    )
                );
                let interviewMap: Record<string, boolean> = {};
                if (organizerEmail) {
                    try {
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                        const now = new Date();
                        const start = new Date(now);
                        start.setMonth(start.getMonth() - 3);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(now);
                        end.setMonth(end.getMonth() + 3);
                        end.setHours(23, 59, 59, 0);
                        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                        const response = await fetch(`${API_BASE_URL}/communications/calendar/events`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                organizer_email: organizerEmail.trim().toLowerCase(),
                                start_date_time: start.toISOString(),
                                end_date_time: end.toISOString(),
                                timezone,
                                top: 500,
                            }),
                        });
                        const data = await response.json();
                        if (response.ok && data?.events) {
                            const parseAttendeeEmails = (event: any) => {
                                const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
                                return attendees
                                    .map((a: any) => a?.emailAddress?.address || a?.address || a?.email)
                                    .filter((email: string) => !!email)
                                    .map((email: string) => email.toLowerCase());
                            };
                            const eventEmails = new Set<string>();
                            (data.events as any[]).forEach(ev => {
                                parseAttendeeEmails(ev).forEach((em: string) => eventEmails.add(em));
                            });
                            interviewMap = emails.reduce((acc, email) => {
                                acc[email] = eventEmails.has(email);
                                return acc;
                            }, {} as Record<string, boolean>);
                        }
                    } catch {
                        interviewMap = {};
                    }
                }

                if (!active) return;
                const emailMap: Record<string, boolean> = {};
                emails.forEach((email, index) => {
                    emailMap[email] = emailResults[index];
                    if (!(email in interviewMap)) {
                        interviewMap[email] = false;
                    }
                });
                setEmailSentMap(emailMap);
                setInterviewScheduledMap(interviewMap);
            } catch {
                if (!active) return;
                setEmailSentMap({});
                setInterviewScheduledMap({});
            }
        };

        run();
        return () => { active = false; };
    }, [apiRequest, filteredCandidates, job]);

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

    const handleOpenInterviewDetails = async (candidate: Candidate) => {
        let sourceCandidate = candidate;
        let interviews = sourceCandidate.interviews || [];
        if (!interviews.length && candidate.email) {
            try {
                const full = await apiRequest(`/resume/by-email?email=${encodeURIComponent(candidate.email)}`);
                if (full && typeof full === 'object') {
                    sourceCandidate = { ...candidate, ...full };
                    interviews = sourceCandidate.interviews || [];
                }
            } catch {
                // Fall back to the current candidate data
            }
        }

        let interview = interviews.slice().reverse().find(i => i.status === 'Scheduled') || interviews.slice().reverse()[0];
        if (!interview && organizerEmail && candidate.email) {
            try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                const now = new Date();
                const start = new Date(now);
                start.setMonth(start.getMonth() - 3);
                start.setHours(0, 0, 0, 0);
                const end = new Date(now);
                end.setMonth(end.getMonth() + 3);
                end.setHours(23, 59, 59, 0);
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                const response = await fetch(`${API_BASE_URL}/communications/calendar/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizer_email: organizerEmail.trim().toLowerCase(),
                        start_date_time: start.toISOString(),
                        end_date_time: end.toISOString(),
                        timezone,
                        top: 500,
                    }),
                });
                const data = await response.json();
                if (response.ok && data?.events) {
                    const toInterviewType = (subject: string | undefined): Interview['type'] => {
                        const lowered = (subject || '').toLowerCase();
                        if (lowered.includes('technical')) return 'Technical';
                        if (lowered.includes('hr')) return 'HR';
                        if (lowered.includes('final')) return 'Final';
                        return 'Screening';
                    };
                    const parseAttendeeEmails = (event: any) => {
                        const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
                        return attendees
                            .map((a: any) => a?.emailAddress?.address || a?.address || a?.email)
                            .filter((email: string) => !!email)
                            .map((email: string) => email.toLowerCase());
                    };
                    const candidateEmail = candidate.email.trim().toLowerCase();
                    const matchingEvent = (data.events as any[]).find(ev => {
                        const attendees = parseAttendeeEmails(ev);
                        return attendees.includes(candidateEmail);
                    });
                    if (matchingEvent) {
                        const startTime = matchingEvent?.start?.dateTime || matchingEvent?.start?.date_time || matchingEvent?.start;
                        const endTime = matchingEvent?.end?.dateTime || matchingEvent?.end?.date_time || matchingEvent?.end;
                        const startDate = startTime ? new Date(startTime) : new Date();
                        const endDate = endTime ? new Date(endTime) : null;
                        const duration = endDate ? Math.max(10, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) : 30;
                        interview = {
                            id: Math.abs((matchingEvent?.id || '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)) || Date.now(),
                            type: toInterviewType(matchingEvent?.subject),
                            date: startDate.toISOString(),
                            duration,
                            interviewer: matchingEvent?.interviewer_email || matchingEvent?.organizer?.emailAddress?.address || organizerEmail,
                            status: 'Scheduled',
                            meetingLink: matchingEvent?.meeting_link || matchingEvent?.meetingLink || matchingEvent?.onlineMeeting?.joinUrl,
                            notes: matchingEvent?.subject || '',
                            schedulerId: sourceCandidate.id,
                        };
                    }
                }
            } catch {
                // Ignore calendar lookup failures
            }
        }
        if (!interview) {
            onViewCandidate(sourceCandidate);
            return;
        }
        setSelectedInterviewEvent({ candidate: sourceCandidate, interview });
        setIsInterviewDetailOpen(true);
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
            const jobId = (job.jobId || job.id || '').toString();
            onEmailSelectedCandidates(selectedCandidates, jobId);
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

                    <div className="inline-ats-table-scroll">
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
                                <th>Status</th>
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
                                    <td>
                                        <div className="status-badges">
                                            {emailSentMap[(c.email || '').trim().toLowerCase()] && (
                                                <span className="status-badge status-badge-email">Email Sent</span>
                                            )}
                                            {interviewScheduledMap[(c.email || '').trim().toLowerCase()] && (
                                                <span
                                                    className="status-badge status-badge-interview"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleOpenInterviewDetails(c)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleOpenInterviewDetails(c);
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    Interview Scheduled
                                                </span>
                                            )}
                                            {!emailSentMap[(c.email || '').trim().toLowerCase()] &&
                                                !interviewScheduledMap[(c.email || '').trim().toLowerCase()] && (
                                                    <span style={{ color: '#9CA3AF' }}>—</span>
                                                )}
                                        </div>
                                    </td>

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
                                        <div className="ats-row-actions">
                                            <button
                                                type="button"
                                                className="ats-action-btn secondary"
                                                onClick={() => {
                                                    const jobId = (job.jobId || job.id || '').toString();
                                                    if (onEmailSelectedCandidates) {
                                                        onEmailSelectedCandidates([c], jobId);
                                                    } else {
                                                        onEmailSelected([c.id]);
                                                    }
                                                }}
                                            >
                                                <span className="material-symbols-outlined">mail</span>
                                                Email
                                            </button>
                                            <button
                                                type="button"
                                                className="ats-action-btn secondary"
                                                onClick={() => onViewCandidate(c)}
                                            >
                                                <span className="material-symbols-outlined">visibility</span>
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                className="ats-action-btn primary"
                                                onClick={() => onScheduleMeeting(c, (job.jobId || job.id || '').toString())}
                                            >
                                                <span className="material-symbols-outlined">calendar_month</span>
                                                Schedule Interview
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                            )) : (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center' }}>No candidates</td>
                                </tr>
                            )}
                        </tbody>

                    </table>
                    </div>
                </>
            )}

            <InterviewDetailModal
                isOpen={isInterviewDetailOpen}
                onClose={() => setIsInterviewDetailOpen(false)}
                event={selectedInterviewEvent}
                onViewProfile={onViewCandidate}
            />
        </div>
    );
};

export default InlineATSAnalysis;

