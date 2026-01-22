import React, { useState, useMemo } from 'react';
import { Candidate, Interview } from '../types/types';
import InterviewDetailModal from '../modals/InterviewDetailModal';

type CalendarEvent = {
    date: Date;
    title: string;
    interview: Interview;
    candidate: Candidate;
};

const CalendarView = ({ events, onEventClick, currentDate }) => {
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
        <div className="calendar-grid">
            {daysOfWeek.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
            {calendarDays.map(({ key, day, isOtherMonth }) => {
                const dateKey = day ? new Date(year, month, day).toISOString().split('T')[0] : '';
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isToday = day && new Date().toISOString().split('T')[0] === dateKey;

                return (
                    <div key={key} className={`calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                        {day && <span className="day-number">{day}</span>}
                        <div className="day-events">
                            {dayEvents.map(event => (
                                <div key={event.interview.id} className="event-pill" onClick={() => onEventClick(event)}>
                                    {event.title}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const CalendarPage = ({ candidates, interviews, onCandidateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const allEvents: CalendarEvent[] = useMemo(() => {
        const events: CalendarEvent[] = [];
        const candidateMap = new Map(candidates.map(c => [c.id, c]));

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
    }, [candidates, interviews]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const handleViewProfile = (candidate: Candidate) => {
        setSelectedEvent(null);
        onCandidateSelect(candidate);
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
                />
            </div>

            {selectedEvent && (
                <InterviewDetailModal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    onViewProfile={handleViewProfile}
                />
            )}
        </div>
    );
};

export default CalendarPage;