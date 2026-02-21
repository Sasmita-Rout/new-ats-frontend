import React, { useState, useMemo } from 'react';
import { Candidate, JobDescription, User } from '../types/types';

const AdminReportsPage = ({ candidates, jobs, allUsers }) => {
    // Placeholder for more complex admin reports
    return (
         <div className="empty-state large">
            <span className="material-symbols-outlined">query_stats</span>
            <h3>Global Reports & Analytics</h3>
            <p>Deeper insights into the entire organization's recruitment pipeline will be available here soon.</p>
        </div>
    );
};

const RecruiterReportsPage = ({ candidates, jobs, user }) => {
    const [dateFilter, setDateFilter] = useState('all');
    
    const myJobs = useMemo(() => jobs.filter(j => j.ownerId === user.id), [jobs, user.id]);
    
    const filteredCandidates = useMemo(() => {
        const now = new Date();
        return candidates.filter(c => {
            let dateMatch = true;
            if (dateFilter !== 'all') {
                const appliedDate = new Date(c.appliedDate);
                const diffDays = (now.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
                if (dateFilter === '30d') dateMatch = diffDays <= 30;
                else if (dateFilter === '90d') dateMatch = diffDays <= 90;
            }
            return dateMatch; // In a real app, you'd link candidates to jobs recruiters own
        });
    }, [candidates, dateFilter]);

    const reportMetrics = useMemo(() => {
        const hiredCandidates = filteredCandidates.filter(c => c.status === 'Hired');
        let totalDaysToHire = 0;
        let hiredCount = 0;
        
        const findDate = (history, stage) => history?.find(h => h.stage === stage)?.date;

        hiredCandidates.forEach(c => {
            const appliedDateStr = c.appliedDate;
            const hiredDateStr = findDate(c.applicationHistory, 'Hired');
            if(appliedDateStr && hiredDateStr) {
                const diff = new Date(hiredDateStr).getTime() - new Date(appliedDateStr).getTime();
                totalDaysToHire += diff / (1000 * 3600 * 24);
                hiredCount++;
            }
        });
        
        const totalEmailsSent = filteredCandidates.reduce((sum, c) => sum + (c.communicationHistory?.length || 0), 0);

        return {
            avgTimeToHire: hiredCount > 0 ? Math.round(totalDaysToHire / hiredCount) : 'N/A',
            totalEmailsSent,
            conversionRate: filteredCandidates.length > 0 && hiredCount > 0 ? ((hiredCount / filteredCandidates.length) * 100).toFixed(1) : '0.0',
        };
    }, [filteredCandidates]);
    
    const MetricCard = ({ title, value, unit = '', icon }) => {
        const iconColorMap = {
            'avg_time_to_hire': '#8B5CF6',
            'conversion_rate': '#10B981',
            'emails_sent': '#F59E0B'
        };
        const iconStyle = {
            '--icon-color': iconColorMap[icon] || '#6D28D9'
        } as React.CSSProperties;

        return (
            <div className="metric-card">
                <div className="metric-icon" style={iconStyle}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="metric-info">
                    <p className="metric-value">{value} <span className="metric-unit">{unit}</span></p>
                    <h5 className="metric-title">{title}</h5>
                </div>
            </div>
        );
    };
    
    return (
        <>
             <div className="report-filter-bar">
                <div className="filter-group">
                    <label>Date Range (by Applied Date)</label>
                    <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                        <option value="all">All Time</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
            </div>
            
            <div className="report-card full-width">
                <h4><span className="material-symbols-outlined">monitoring</span> Your Performance KPIs</h4>
                <div className="metric-card-grid">
                    <MetricCard title="Avg. Time to Hire" value={reportMetrics.avgTimeToHire} unit="days" icon="avg_time_to_hire" />
                    <MetricCard title="Conversion Rate" value={reportMetrics.conversionRate} unit="%" icon="conversion_rate" />
                    <MetricCard title="Emails Sent" value={reportMetrics.totalEmailsSent} icon="emails_sent" />
                </div>
            </div>
            
            <div className="reports-grid">
                 <div className="report-card">
                     <h4><span className="material-symbols-outlined">donut_small</span> Your Pipeline Conversion</h4>
                     <div className="chart-placeholder">Your candidate conversion funnel will be displayed here.</div>
                 </div>
                 <div className="report-card">
                     <h4><span className="material-symbols-outlined">leaderboard</span> Your Activity Overview</h4>
                     <div className="chart-placeholder">Your activity stats (e.g., interviews scheduled) will be shown here.</div>
                 </div>
            </div>
        </>
    );
};


const ReportsPage = ({ candidates, jobs, effectiveUser, allUsers }: { candidates: Candidate[], jobs: JobDescription[], effectiveUser: User, allUsers: User[] }) => {
    const isAdminView = effectiveUser.role.includes('Admin') || effectiveUser.role === 'super_admin' || effectiveUser.role === 'admin' || effectiveUser.role === 'head_dd' || effectiveUser.role === 'pdm';
    
    return (
        <div className="page-content reports-page">
            <div className="page-header">
                <h1>{isAdminView ? 'Global Reports & Analytics' : 'My Reports'}</h1>
                <p>{isAdminView ? "Gain deeper insights into the entire organization's recruitment pipeline." : "Review your personal recruitment performance and pipeline."}</p>
            </div>
            {isAdminView ? (
                <AdminReportsPage candidates={candidates} jobs={jobs} allUsers={allUsers} />
            ) : (
                <RecruiterReportsPage candidates={candidates} jobs={jobs} user={effectiveUser} />
            )}
        </div>
    );
};

export default ReportsPage;
