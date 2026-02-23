import React, { useState, useMemo, useEffect } from 'react';
import { Candidate, JobDescription, User } from '../types/types';

type ReportRow = {
    ta_email: string;
    search_count: number;
    month: string;
    year: number;
};

const AdminReportsPage = ({
    apiRequest,
    title,
    subtitle,
    filterEmail,
    showDownload,
}: {
    apiRequest: (path: string, options?: RequestInit) => Promise<any>;
    title: string;
    subtitle: string;
    filterEmail?: string;
    showDownload?: boolean;
}) => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiRequest(`/report?month=${month}&year=${year}`);
            setRows(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load report.');
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const csvText = await apiRequest(`/report/download?month=${month}&year=${year}`);
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ats_report_${year}_${month}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setError(e?.message || 'Failed to download report.');
        }
    };

    useEffect(() => {
        loadReport();
    }, [month, year]);

    const filteredRows = useMemo(() => {
        if (!filterEmail) return rows;
        const email = filterEmail.toLowerCase();
        return rows.filter(r => String(r.ta_email || '').toLowerCase() === email);
    }, [rows, filterEmail]);

    const totals = useMemo(() => {
        const taCount = filteredRows.length;
        const uniqueJobs = filteredRows.reduce((sum, r) => sum + (Number(r.search_count) || 0), 0);
        return { taCount, uniqueJobs };
    }, [filteredRows]);

    return (
        <>
            <div className="page-header" style={{ marginBottom: '16px' }}>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            <div className="report-filter-bar">
                <div className="filter-group">
                    <label>Month</label>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value) || 1)}
                    />
                </div>
                <div className="filter-group">
                    <label>Year</label>
                    <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
                    />
                </div>
                <button className="btn btn-secondary" onClick={loadReport} disabled={isLoading}>
                    Refresh
                </button>
                {showDownload && (
                    <button className="btn btn-primary" onClick={handleDownload} disabled={isLoading}>
                        Download CSV
                    </button>
                )}
            </div>

            {error && (
                <div className="empty-state">
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            {!error && (
                <div className="report-card full-width">
                    <div className="report-card-header">
                        <h4><span className="material-symbols-outlined">query_stats</span> ATS Search Report</h4>
                        <div className="report-badges">
                            <span className="report-badge">TAs: {totals.taCount}</span>
                            <span className="report-badge">Unique Jobs: {totals.uniqueJobs}</span>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="chart-placeholder">Loading report...</div>
                    ) : filteredRows.length === 0 ? (
                        <div className="chart-placeholder">No data for the selected month/year.</div>
                    ) : (
                        <div className="report-table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>TA Email</th>
                                        <th>Search Count</th>
                                        <th>Month</th>
                                        <th>Year</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row, idx) => (
                                        <tr key={`${row.ta_email}-${idx}`}>
                                            <td className="report-email">{row.ta_email}</td>
                                            <td><span className="report-count">{row.search_count}</span></td>
                                            <td>{row.month}</td>
                                            <td>{row.year}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
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


const ReportsPage = ({
    candidates,
    jobs,
    effectiveUser,
    allUsers,
    apiRequest,
}: {
    candidates: Candidate[];
    jobs: JobDescription[];
    effectiveUser: User;
    allUsers: User[];
    apiRequest?: (path: string, options?: RequestInit) => Promise<any>;
}) => {
    const isAdminView = effectiveUser.role.includes('Admin') || effectiveUser.role === 'super_admin' || effectiveUser.role === 'admin' || effectiveUser.role === 'head_dd' || effectiveUser.role === 'pdm';
    const safeApiRequest = apiRequest || (async (path: string, options: RequestInit = {}) => {
        const response = await fetch(path, options);
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : await response.text();
        if (!response.ok) {
            const message = typeof data === 'string' ? data : (data?.detail || 'Request failed');
            throw new Error(message);
        }
        return data;
    });
    
    return (
        <div className="page-content reports-page">
            {isAdminView ? (
                <AdminReportsPage
                    apiRequest={safeApiRequest}
                    title="Global Reports & Analytics"
                    subtitle="Gain deeper insights into the entire organization's recruitment pipeline."
                    showDownload
                />
            ) : (
                <AdminReportsPage
                    apiRequest={safeApiRequest}
                    title="My Reports"
                    subtitle="Review your personal recruitment performance and pipeline."
                    filterEmail={effectiveUser.email}
                />
            )}
        </div>
    );
};

export default ReportsPage;
