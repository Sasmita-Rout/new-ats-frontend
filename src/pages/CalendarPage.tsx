import React, { useEffect, useMemo, useState } from 'react';
import { Candidate, Interview } from '../types/types';
import InterviewDetailModal from '../modals/InterviewDetailModal';

type CalendarEvent = {
    date: Date;
    title: string;
    interview: Interview;
    candidate: Candidate;
    eventId?: string;
    jobId?: string;
    projectId?: string;
};

const CalendarView = ({ events, onEventClick, onMoreClick, currentDate }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];
    // Previous month's days
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push({ key: `prev-${i}`, day: null, isOtherMonth: true });
    }
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push({ key: `current-${day}`, day, isOtherMonth: false });
    }
    // Next month's days to fill the grid
    while (calendarDays.length % 7 !== 0) {
        calendarDays.push({ key: `next-${calendarDays.length}`, day: null, isOtherMonth: true });
    }
    const weekCount = calendarDays.length / 7;

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach(event => {
            const dateKey = event.date.toISOString().split('T')[0];
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(event);
        });
        return map;
    }, [events]);

    return (
        <div className="calendar-grid" style={{ gridTemplateRows: `auto repeat(${weekCount}, 1fr)` }}>
            {daysOfWeek.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
            {calendarDays.map(({ key, day, isOtherMonth }) => {
                const dateKey = day ? new Date(year, month, day).toISOString().split('T')[0] : '';
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isToday = day && new Date().toISOString().split('T')[0] === dateKey;

                return (
                    <div key={key} className={`calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                        {day && <span className="day-number">{day}</span>}
                        <div className="day-events">
                            {dayEvents.slice(0, 3).map((event, index) => (
                                <div key={`${event.eventId || event.interview.id}-${index}`} className="event-pill" onClick={() => onEventClick(event)}>
                                    {event.title}
                                </div>
                            ))}
                            {dayEvents.length > 3 && (
                                <button
                                    type="button"
                                    className="event-more-btn"
                                    onClick={() => onMoreClick(new Date(year, month, day), dayEvents)}
                                >
                                    +{dayEvents.length - 3} more
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const CalendarPage = ({ candidates, interviews, onViewCandidate, organizerEmail }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [backendEvents, setBackendEvents] = useState<CalendarEvent[]>([]);
    const [moreEventsModal, setMoreEventsModal] = useState<{ dateLabel: string; events: CalendarEvent[] } | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const API_BASE_URL ='http://localhost:8000';
    //const API_BASE_URL = "https://intranet.accionlabs.com/recruiter-tool";

    const allEvents: CalendarEvent[] = useMemo(() => {
        const events: CalendarEvent[] = [];

        if (backendEvents.length > 0) {
            return backendEvents;
        }

        interviews.forEach(interview => {
            // Find which candidate this interview belongs to
            const relatedCandidate = candidates.find(c => c.interviews?.some(i => i.id === interview.id));
            if (relatedCandidate && interview.status === 'Scheduled') {
                events.push({
                    date: new Date(interview.date),
                    title: `${relatedCandidate.name}`,
                    interview,
                    candidate: relatedCandidate
                });
            }
        });
        return events;
    }, [candidates, interviews, backendEvents]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 0);
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                const params = new URLSearchParams({
                    start_date_time: startOfMonth.toISOString(),
                    end_date_time: endOfMonth.toISOString(),
                    timezone,
                    limit: '500',
                    offset: '0',
                });
                if (organizerEmail) {
                    params.set('interviewer_email', organizerEmail.trim().toLowerCase());
                }
                const response = await fetch(`${API_BASE_URL}/communications/calendar/events-db?${params.toString()}`, {
                    credentials: 'include',
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data?.detail || 'Failed to fetch calendar events');
                }

                const toInterviewType = (subject: string | undefined): Interview['type'] => {
                    const lowered = (subject || '').toLowerCase();
                    if (lowered.includes('technical')) return 'Technical';
                    if (lowered.includes('hr')) return 'HR';
                    if (lowered.includes('final')) return 'Final';
                    return 'Screening';
                };

                const derived: CalendarEvent[] = [];
                for (const event of data?.events || []) {
                    const candidateEmail = (event?.candidate_email || '').toLowerCase();
                    const candidate = candidates.find(c => (c.email || '').toLowerCase() === candidateEmail);
                    if (!candidate) continue;

                    const start = event?.start?.dateTime || event?.start;
                    const end = event?.end?.dateTime || event?.end;
                    const startDate = start ? new Date(start) : null;
                    const endDate = end ? new Date(end) : null;
                    const duration = startDate && endDate ? Math.max(10, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) : 30;

                    const interview: Interview = {
                        id: Math.abs((event?.id || '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)) || Date.now(),
                        type: toInterviewType(event?.subject),
                        date: (startDate || new Date()).toISOString(),
                        duration,
                        interviewer: event?.interviewer_email || organizerEmail,
                        status: 'Scheduled',
                        meetingLink: event?.meeting_link || event?.meetingLink,
                        notes: event?.subject || '',
                        schedulerId: candidate.id,
                    };

                    derived.push({
                        date: startDate || new Date(),
                        title: `${candidate.name}`,
                        interview,
                        candidate,
                        eventId: event?.id ? String(event.id) : undefined,
                        jobId: event?.job_id ? String(event.job_id) : (event?.jobId ? String(event.jobId) : undefined),
                        projectId: event?.project_id ? String(event.project_id) : (event?.projectId ? String(event.projectId) : undefined),
                    });
                }

                setBackendEvents(derived);
            } catch (error) {
                console.error('Calendar fetch failed:', error);
            }
        };
        fetchEvents();
    }, [API_BASE_URL, organizerEmail, currentDate, candidates, reloadToken]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const handleViewProfile = (candidate: Candidate) => {
        setSelectedEvent(null);
        onViewCandidate(candidate);
    };

    const handleMoreClick = (date: Date, events: CalendarEvent[]) => {
        setMoreEventsModal({
            dateLabel: date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            events,
        });
    };

    const matchesCalendarEvent = (a: CalendarEvent, b: CalendarEvent) => {
        if (a.eventId && b.eventId) return a.eventId === b.eventId;
        return a.interview.id === b.interview.id && a.candidate.id === b.candidate.id;
    };

    const requestInterviewMutation = async (
        requests: Array<{ path: string; method?: 'POST' | 'PUT' | 'DELETE'; payload?: Record<string, any> }>
    ) => {
        let lastError = 'Request failed';
        const normalizeError = (value: any): string => {
            if (!value) return 'Request failed';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) return value.map(v => normalizeError(v)).join(', ');
            if (typeof value === 'object') {
                if (typeof value.msg === 'string') return value.msg;
                if (typeof value.detail === 'string') return value.detail;
                try {
                    return JSON.stringify(value);
                } catch {
                    return String(value);
                }
            }
            return String(value);
        };
        for (const req of requests) {
            try {
                const response = await fetch(`${API_BASE_URL}${req.path}`, {
                    method: req.method || 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: req.method === 'DELETE' ? undefined : JSON.stringify(req.payload || {}),
                });
                const data = await response.json().catch(() => ({}));
                if (response.ok) return data;
                lastError = normalizeError(data?.detail || data?.message || `${req.path} failed`);
            } catch (e: any) {
                lastError = normalizeError(e?.message || e || 'Network error');
            }
        }
        throw new Error(lastError);
    };

    const handleUpdateInterview = async (
        targetEvent: CalendarEvent,
        updates: { dateTime: string; duration: number; interviewer: string; notes: string }
    ) => {
        const payload = {
            event_id: targetEvent.eventId,
            candidate_email: (targetEvent.candidate.email || '').trim().toLowerCase(),
            job_id: targetEvent.jobId,
            project_id: targetEvent.projectId,
            date_time: updates.dateTime,
            old_date_time: targetEvent.interview.date,
            duration: updates.duration,
            interviewer: updates.interviewer,
            description: updates.notes,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        };

        await requestInterviewMutation([
            { path: '/communications/interview/update', method: 'POST', payload },
        ]);

        setBackendEvents(prev =>
            prev.map(ev => {
                if (!matchesCalendarEvent(ev, targetEvent)) return ev;
                return {
                    ...ev,
                    date: new Date(updates.dateTime),
                    interview: {
                        ...ev.interview,
                        date: updates.dateTime,
                        duration: updates.duration,
                        interviewer: updates.interviewer,
                        notes: updates.notes,
                    },
                };
            })
        );
        setSelectedEvent(prev => {
            if (!prev || !matchesCalendarEvent(prev, targetEvent)) return prev;
            return {
                ...prev,
                date: new Date(updates.dateTime),
                interview: {
                    ...prev.interview,
                    date: updates.dateTime,
                    duration: updates.duration,
                    interviewer: updates.interviewer,
                    notes: updates.notes,
                },
            };
        });
        setReloadToken(prev => prev + 1);
    };

    const handleCancelInterview = async (targetEvent: CalendarEvent) => {
        const payload = {
            event_id: targetEvent.eventId,
            candidate_email: (targetEvent.candidate.email || '').trim().toLowerCase(),
            job_id: targetEvent.jobId,
            project_id: targetEvent.projectId,
            old_date_time: targetEvent.interview.date,
        };

        await requestInterviewMutation([
            { path: '/communications/interview/cancel', method: 'POST', payload },
        ]);

        setBackendEvents(prev => prev.filter(ev => !matchesCalendarEvent(ev, targetEvent)));
        setSelectedEvent(null);
        setReloadToken(prev => prev + 1);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Interview Calendar</h1>
                <p>An overview of all scheduled interviews across your pipelines.</p>
            </div>
            <div className="calendar-page-container">
                <div className="calendar-header">
                    <div className="calendar-nav">
                        <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
                        <button className="icon-btn" onClick={() => changeMonth(-1)} title="Previous month">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button className="icon-btn" onClick={() => changeMonth(1)} title="Next month">
                             <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                </div>
                <CalendarView 
                    events={allEvents} 
                    currentDate={currentDate} 
                    onEventClick={setSelectedEvent} 
                    onMoreClick={handleMoreClick}
                />
            </div>

            {moreEventsModal && (
                <div className="modal-overlay" onClick={() => setMoreEventsModal(null)}>
                    <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Interviews on {moreEventsModal.dateLabel}</h3>
                            <button className="close-btn" onClick={() => setMoreEventsModal(null)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <ul className="calendar-more-list">
                                {moreEventsModal.events.map((event, index) => (
                                    <li key={`${event.interview.id}-${index}`} className="calendar-more-item">
                                        <button
                                            type="button"
                                            className="calendar-more-link"
                                            onClick={() => {
                                                setMoreEventsModal(null);
                                                setSelectedEvent(event);
                                            }}
                                        >
                                            {event.candidate.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {selectedEvent && (
                <InterviewDetailModal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    onViewProfile={handleViewProfile}
                    onUpdateInterview={handleUpdateInterview}
                    onCancelInterview={handleCancelInterview}
                />
            )}
        </div>
    );
};

export default CalendarPage;
