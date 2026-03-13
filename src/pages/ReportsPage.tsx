import React, { useState, useMemo, useEffect } from 'react';
import { Candidate, JobDescription, User } from '../types/types';
 
type ReportRow = {
  ta_email: string;
  search_count: number; // total searches
  unique_jobs: number;  // distinct job_ids
  month: string;
  year: number;
};
 
type JobStats = {
  total_jobs: number;
  active_jobs: number;
  closed_jobs: number;
  paused_jobs: number;
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
  filterEmail?: string; // if present → user-only view
  showDownload?: boolean;
}) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthInput, setMonthInput] = useState('');
  const [yearInput, setYearInput] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [uniqueJobCountGlobal, setUniqueJobCountGlobal] = useState<number>(0); // global (admin) KPI from backend summary
  const [taCount, setTaCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  const yearOptions = Array.from({ length: 2100 - 2000 + 1 }, (_, i) => 2000 + i);
 
  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let path = `/report?month=${month}&year=${year}`;
      if (filterEmail) {
        path += `&uploaded_by=${encodeURIComponent(filterEmail)}`;
      }
      const responseData = await apiRequest(path);
 
      // Optional /job/stats (does not affect the ATS Search report)
      let statsData = null;
      try {
        statsData = await apiRequest('/job/stats');
      } catch (err) {
        console.warn('Job stats endpoint not available:', err);
      }
 
      if (Array.isArray(responseData)) {
        // Legacy backend: an array of per-user rows only
        const legacyRows = responseData as ReportRow[];
        setRows(legacyRows);
 
        // Global unique jobs unknown from legacy response → 0
        setUniqueJobCountGlobal(0);
 
        // TA count = distinct emails
        const taDistinct = new Set(
          (legacyRows || []).map((r) => (r.ta_email || '').toLowerCase()),
        ).size;
        setTaCount(taDistinct);
      } else {
        // New backend: { summary: {...}, per_user: [...] }
        const rowsFromApi: ReportRow[] = Array.isArray(responseData.per_user)
          ? responseData.per_user
          : Array.isArray(responseData.rows)
          ? responseData.rows
          : [];
        setRows(rowsFromApi);
 
        const uniqueJobsGlobal =
          responseData?.summary?.unique_jobs ??
          responseData?.total_unique_jobs ??
          0;
        setUniqueJobCountGlobal(uniqueJobsGlobal);
 
        const tas =
          responseData?.summary?.ta_count ??
          new Set(
            (rowsFromApi || []).map((r) => (r.ta_email || '').toLowerCase()),
          ).size;
        setTaCount(tas);
      }
 
      setJobStats(statsData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report.');
      setRows([]);
      setUniqueJobCountGlobal(0);
      setTaCount(0);
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleDownload = async (targetEmail?: string) => {
    try {
      let path = `/report/download?month=${month}&year=${year}`;
      const emailToUse = targetEmail || filterEmail;
      if (emailToUse) {
        path += `&uploaded_by=${encodeURIComponent(emailToUse)}`;
      }
      const csvText = await apiRequest(path);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = emailToUse ? `_${emailToUse.split('@')[0]}` : '';
      link.download = `ats_report_${year}_${month}${suffix}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to download report.');
    }
  };

  const handleDownloadDetailed = async (targetEmail?: string) => {
    try {
      let path = `/report/download-detailed?month=${month}&year=${year}`;
      const emailToUse = targetEmail || filterEmail;
      if (emailToUse) {
        path += `&uploaded_by=${encodeURIComponent(emailToUse)}`;
      }
      const csvText = await apiRequest(path);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = emailToUse ? `_${emailToUse.split('@')[0]}` : '';
      link.download = `ats_detailed_history_${year}_${month}${suffix}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to download detailed Reports.');
    }
  };
 
  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    const monthLabel = monthOptions.find(m => m.value === month)?.label || String(month);
    setMonthInput(monthLabel);
  }, [month]);

  useEffect(() => {
    setYearInput(String(year));
  }, [year]);

  const commitMonthInput = () => {
    const raw = monthInput.trim();
    const asNumber = parseInt(raw, 10);
    const byName = monthOptions.find(m => m.label.toLowerCase() === raw.toLowerCase());
    let safeMonth = month;
    if (Number.isFinite(asNumber)) {
      safeMonth = Math.min(12, Math.max(1, asNumber));
    } else if (byName) {
      safeMonth = byName.value;
    }
    setMonth(safeMonth);
    setMonthInput(monthOptions.find(m => m.value === safeMonth)?.label || String(safeMonth));
  };

  const commitYearInput = () => {
    const parsed = parseInt(yearInput, 10);
    const safeYear = Number.isFinite(parsed) ? Math.min(2100, Math.max(2000, parsed)) : year;
    setYear(safeYear);
    setYearInput(String(safeYear));
  };
 
  // Table visibility: Admins → all rows; Users → only their row
  const filteredRows = useMemo(() => {
    if (!filterEmail) return rows; // admin/superadmin
    const email = filterEmail.toLowerCase();
    return rows.filter((r) => String(r.ta_email || '').toLowerCase() === email);
  }, [rows, filterEmail]);
 
  /**
   * KPI: Unique Jobs (role-aware)
   * - Admin/Superadmin (no filterEmail): show GLOBAL unique jobs (from backend summary)
   * - User (filterEmail present): show THAT USER'S unique jobs (from their per_user row)
   */
  const displayUniqueJobs = useMemo(() => {
    if (!filterEmail) {
      // Admin/Superadmin view → global unique jobs
      return uniqueJobCountGlobal;
    }
    // User view → find that user's row (there should be at most 1)
    const email = filterEmail.toLowerCase();
    const myRow = rows.find(
      (r) => String(r.ta_email || '').toLowerCase() === email,
    );
    // If not found, 0; otherwise that user's distinct job count for the period
    return myRow?.unique_jobs ?? 0;
  }, [filterEmail, rows, uniqueJobCountGlobal]);

  return (
    <>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="report-filter-bar" style={{ marginTop: '24px' }}>
        <div className="filter-group">
          <label>Month</label>
          <input
            type="text"
            list="report-month-options"
            value={monthInput}
            onChange={(e) => setMonthInput(e.target.value)}
            onBlur={commitMonthInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitMonthInput();
              }
            }}
            placeholder="Select or type month"
          />
          <datalist id="report-month-options">
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.label} />
            ))}
          </datalist>
        </div>
        <div className="filter-group">
          <label>Year</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            list="report-year-options"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={commitYearInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitYearInput();
              }
            }}
            placeholder="Select or type year"
          />
          <datalist id="report-year-options">
            {yearOptions.map(y => (
              <option key={y} value={String(y)} />
            ))}
          </datalist>
        </div>
        {showDownload && (
          <div className="report-filter-download-group" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary report-filter-download"
              onClick={() => handleDownload()}
              disabled={isLoading}
            >
              Download Summary
            </button>
            <button
              className="btn btn-primary report-filter-download"
              onClick={() => handleDownloadDetailed()}
              disabled={isLoading}
            >
              Download Detailed History
            </button>
          </div>
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
            <h4>
              <span className="material-symbols-outlined">query_stats</span> ATS Search Report
            </h4>
            <div className="report-badges">
              {!filterEmail && <span className="report-badge">TAs: {taCount}</span>}
              <span className="report-badge">Unique Jobs: {displayUniqueJobs}</span>
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
                    <th>Email</th>
                    <th>Search Count</th>
                    {!filterEmail && <th>Unique Jobs</th>}
                    <th>Month</th>
                    <th>Year</th>
                    {showDownload && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={`${row.ta_email}-${idx}`}>
                      <td className="report-email">{row.ta_email}</td>
                      <td>
                        <span className="report-count">{row.search_count}</span>
                      </td>
                      {!filterEmail && (
                        <td>
                          <span className="report-count">{row.unique_jobs}</span>
                        </td>
                      )}
                      <td>{row.month}</td>
                      <td>{row.year}</td>
                      {showDownload && (
                        <td>
                          <button
                            className="btn-icon-only"
                            onClick={() => handleDownloadDetailed(row.ta_email)}
                            title="Download User History"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                          </button>
                        </td>
                      )}
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
 
  const myJobs = useMemo(
    () => jobs.filter((j) => j.ownerId === user.id),
    [jobs, user.id],
  );
 
  const filteredCandidates = useMemo(() => {
    const now = new Date();
    return candidates.filter((c) => {
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const appliedDate = new Date(c.appliedDate);
        const diffDays =
          (now.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === '30d') dateMatch = diffDays <= 30;
        else if (dateFilter === '90d') dateMatch = diffDays <= 90;
      }
      return dateMatch; // In a real app, you'd link candidates to jobs recruiters own
    });
  }, [candidates, dateFilter]);
 
  const reportMetrics = useMemo(() => {
    const hiredCandidates = filteredCandidates.filter((c) => c.status === 'Hired');
    let totalDaysToHire = 0;
    let hiredCount = 0;
 
    const findDate = (history, stage) => history?.find((h) => h.stage === stage)?.date;
 
    hiredCandidates.forEach((c) => {
      const appliedDateStr = c.appliedDate;
      const hiredDateStr = findDate(c.applicationHistory, 'Hired');
      if (appliedDateStr && hiredDateStr) {
        const diff =
          new Date(hiredDateStr).getTime() -
          new Date(appliedDateStr).getTime();
        totalDaysToHire += diff / (1000 * 3600 * 24);
        hiredCount++;
      }
    });
 
    const totalEmailsSent = filteredCandidates.reduce(
      (sum, c) => sum + (c.communicationHistory?.length || 0),
      0,
    );
 
    return {
      avgTimeToHire: hiredCount > 0 ? Math.round(totalDaysToHire / hiredCount) : 'N/A',
      totalEmailsSent,
      conversionRate:
        filteredCandidates.length > 0 && hiredCount > 0
          ? ((hiredCount / filteredCandidates.length) * 100).toFixed(1)
          : '0.0',
    };
  }, [filteredCandidates]);
 
  const MetricCard = ({ title, value, unit = '', icon }) => {
    const iconColorMap = {
      avg_time_to_hire: '#3B82F6',
      conversion_rate: '#10B981',
      emails_sent: '#F59E0B',
    };
    const iconStyle = {
      '--icon-color': iconColorMap[icon] || '#1D4ED8',
    } as React.CSSProperties;
 
    return (
      <div className="metric-card">
        <div className="metric-icon" style={iconStyle}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="metric-info">
          <p className="metric-value">
            {value} <span className="metric-unit">{unit}</span>
          </p>
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
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>
 
      <div className="report-card full-width">
        <h4>
          <span className="material-symbols-outlined">monitoring</span> Your Performance KPIs
        </h4>
        <div className="metric-card-grid">
          <MetricCard
            title="Avg. Time to Hire"
            value={reportMetrics.avgTimeToHire}
            unit="days"
            icon="avg_time_to_hire"
          />
          <MetricCard
            title="Conversion Rate"
            value={reportMetrics.conversionRate}
            unit="%"
            icon="conversion_rate"
          />
          <MetricCard
            title="Emails Sent"
            value={reportMetrics.totalEmailsSent}
            icon="emails_sent"
          />
        </div>
      </div>
 
      <div className="reports-grid">
        <div className="report-card">
          <h4>
            <span className="material-symbols-outlined">donut_small</span> Your Pipeline Conversion
          </h4>
          <div className="chart-placeholder">
            Your candidate conversion funnel will be displayed here.
          </div>
        </div>
        <div className="report-card">
          <h4>
            <span className="material-symbols-outlined">leaderboard</span> Your Activity Overview
          </h4>
          <div className="chart-placeholder">
            Your activity stats (e.g., interviews scheduled) will be shown here.
          </div>
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
  const isAdminView =
    effectiveUser.role.includes('Admin') ||
    effectiveUser.role === 'super_admin' ||
    effectiveUser.role === 'admin' ||
    effectiveUser.role === 'head_dd' ||
    effectiveUser.role === 'pdm';
 
  const safeApiRequest =
    apiRequest ||
    (async (path: string, options: RequestInit = {}) => {
      const response = await fetch(path, options);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        const message =
          typeof data === 'string' ? data : data?.detail || 'Request failed';
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
          showDownload
        />
      )}
    </div>
  );
};
 
export default ReportsPage;
