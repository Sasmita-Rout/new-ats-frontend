

import React, { useMemo, useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
} from 'recharts';
import { Candidate, JobDescription, User, Project } from '../types/types';

type SystemActivityRow = {
    day: string;
    searches: number;
    active_users: number;
    unique_jobs: number;
};

type RecruiterPerformanceRow = {
    ta_email: string;
    total_searches: number;
    unique_jobs: number;
    first_search: string;
    last_search: string;
};

const AdminDashboard = ({ candidates, totalCandidatesCount, jobs, projects, pendingInvitationCount, onNavigate, apiRequest }) => {
    const totalCandidates = typeof totalCandidatesCount === 'number' ? totalCandidatesCount : candidates.length;
    const activeProjects = projects.filter(p => p.status !== 'inactive').length;
    const openPositions = jobs.filter(j => String(j.status || '').toLowerCase() === 'active').length;
    const inactiveProjects = projects.filter(p => p.status === 'inactive').length;
    const [activity, setActivity] = useState<SystemActivityRow[]>([]);
    const [performance, setPerformance] = useState<RecruiterPerformanceRow[]>([]);
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);
    const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [performanceError, setPerformanceError] = useState<string | null>(null);
    
    const formatEmailLabel = (email: string) => {
        if (!email) return '';
        const [name] = email.split('@');
        return name.length > 18 ? `${name.slice(0, 18)}…` : name;
    };

    useEffect(() => {
        const loadActivity = async () => {
            if (!apiRequest) return;
            setIsLoadingActivity(true);
            setActivityError(null);
            try {
                const data = await apiRequest('/report/system-activity?days=30');
                setActivity(Array.isArray(data) ? data : []);
            } catch (e: any) {
                setActivityError(e?.message || 'Failed to load system activity.');
                setActivity([]);
            } finally {
                setIsLoadingActivity(false);
            }
        };
        const loadPerformance = async () => {
            if (!apiRequest) return;
            setIsLoadingPerformance(true);
            setPerformanceError(null);
            try {
                const data = await apiRequest('/report/recruiter-performance?days=30&limit=10');
                setPerformance(Array.isArray(data) ? data : []);
            } catch (e: any) {
                setPerformanceError(e?.message || 'Failed to load recruiter performance.');
                setPerformance([]);
            } finally {
                setIsLoadingPerformance(false);
            }
        };
        loadActivity();
        loadPerformance();
    }, [apiRequest]);
    
    return (
        <>
            <div className="page-header">
                <h1>System Dashboard</h1>
                <p>A high-level analytical overview of the entire recruitment application.</p>
            </div>
             {pendingInvitationCount > 0 && (
                 <div 
                    className="card" 
                    style={{
                        padding: '16px', 
                        marginBottom: '24px', 
                        background: 'var(--hover-color-light)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: '1px solid var(--primary-color)'
                    }}
                    onClick={() => onNavigate('Settings')}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <span className="material-symbols-outlined" style={{color: 'var(--primary-color)'}}>mark_email_unread</span>
                        <p style={{fontWeight: 600}}>You have {pendingInvitationCount} pending member invitation(s) to review.</p>
                    </div>
                    <button className="btn btn-secondary btn-small">Review Now</button>
                </div>
            )}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">groups</span></div>
                    <div className="stat-card-info"><h4>Total Candidates</h4><p>{totalCandidates}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">workspaces</span></div>
                    <div className="stat-card-info"><h4>Active Projects</h4><p>{activeProjects}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">folder_open</span></div>
                    <div className="stat-card-info"><h4>Open Positions</h4><p>{openPositions}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">pause_circle</span></div>
                    <div className="stat-card-info"><h4>Inactive Projects</h4><p>{inactiveProjects}</p></div>
                </div>
            </div>
            <div className="dashboard-grid single-col">
                <div className="chart-card">
                    <h4>System-Wide Activity</h4>
                    {isLoadingActivity ? (
                        <div className="chart-placeholder">Loading activity...</div>
                    ) : activityError ? (
                        <div className="chart-placeholder">{activityError}</div>
                    ) : activity.length === 0 ? (
                        <div className="chart-placeholder">No activity data for the last 30 days.</div>
                    ) : (
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer>
                                <LineChart data={activity} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="searches" stroke="#4F46E5" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="active_users" stroke="#10B981" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="unique_jobs" stroke="#F59E0B" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
                 <div className="chart-card">
                    <h4>Recruiter Performance</h4>
                    {isLoadingPerformance ? (
                        <div className="chart-placeholder">Loading performance...</div>
                    ) : performanceError ? (
                        <div className="chart-placeholder">{performanceError}</div>
                    ) : performance.length === 0 ? (
                        <div className="chart-placeholder">No recruiter activity for the last 30 days.</div>
                    ) : (
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={performance}
                                    layout="vertical"
                                    barCategoryGap="30%"
                                    barGap={6}
                                    margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="ta_email"
                                        tick={{ fontSize: 12 }}
                                        width={140}
                                        tickFormatter={formatEmailLabel}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB' }}
                                        labelFormatter={(label: string) => label}
                                    />
                                    <Bar dataKey="unique_jobs" name="Unique Jobs" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={12} />
                                    <Bar dataKey="total_searches" name="Total Searches" fill="#93C5FD" radius={[0, 6, 6, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// FIX: Removed unused 'interviews' prop from component signature to resolve type error at the call site.
const RecruiterDashboard = ({ candidates, totalCandidatesCount, projects, jobs, onProjectSelect, user }) => {
    const myProjects = useMemo(() => projects, [projects]);
    const myActiveProjectsCount = myProjects.filter(p => String(p.status || '').toLowerCase() !== 'inactive').length;
    const myInactiveProjectsCount = myProjects.filter(p => String(p.status || '').toLowerCase() === 'inactive').length;
    
    const activeJobsCount = useMemo(() => {
        const userEmail = (user?.email || '').toLowerCase();
        return jobs.filter(j =>
            String(j.uploadedBy || '').toLowerCase() === userEmail &&
            String(j.status || '').toLowerCase() === 'active'
        ).length;
    }, [jobs, user?.email]);

    const statusCounts = useMemo(() => {
        const counts = { Screening: 0, Interview: 0, Offer: 0, Hired: 0 };
        candidates.forEach(c => {
            if (c.status in counts) counts[c.status]++;
        });
        return Object.entries(counts);
    }, [candidates]);
    
    const ProjectList = ({ title, projectList }) => (
        <div className="chart-card" style={{ height: '100%' }}>
            <h4>{title} ({projectList.length})</h4>
            <div className="jobs-list-placeholder">
                {projectList.length > 0 ? (
                    projectList.map(p => (
                        <a href="#" key={p.project_id} onClick={(e) => {e.preventDefault(); onProjectSelect(p)}}>
                            {p.project_name}{p.status === 'inactive' ? ' (Inactive)' : ''}
                        </a>
                    ))
                ) : (
                    <p className="placeholder-text">No projects in this category.</p>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, {user.name}. Here's a live overview of your recruitment pipeline.</p>
            </div>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">groups</span></div>
                    <div className="stat-card-info"><h4>Total Candidates</h4><p>{typeof totalCandidatesCount === 'number' ? totalCandidatesCount : candidates.length}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">workspaces</span></div>
                    <div className="stat-card-info"><h4>Your Active Projects</h4><p>{myActiveProjectsCount}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">pause_circle</span></div>
                    <div className="stat-card-info"><h4>Your Inactive Projects</h4><p>{myInactiveProjectsCount}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">work</span></div>
                    <div className="stat-card-info"><h4>Your Active Jobs</h4><p>{activeJobsCount}</p></div>
                </div>
            </div>
            <div className="dashboard-grid">
               <div className="chart-card">
                  <h4>Candidate Pipeline</h4>
                  <div className="pipeline-chart">
                      {statusCounts.map(([status, count]) => (
                         <div key={status} className="pipeline-bar">
                            <span className="pipeline-bar-label">{status}</span>
                            <div className="pipeline-bar-progress">
                               <div className="pipeline-bar-fill" style={{width: `${candidates.length > 0 ? (count / candidates.length) * 100 : 0}%`}}>{count}</div>
                            </div>
                         </div>
                      ))}
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <ProjectList title="My Projects" projectList={myProjects} />
               </div>
            </div>
        </>
    );
}

const DashboardPage = ({ effectiveUser, candidates, totalCandidatesCount, jobs, projects, onProjectSelect, pendingInvitationCount, onNavigate, apiRequest }: {
    effectiveUser: User;
    candidates: Candidate[];
    totalCandidatesCount: number;
    jobs: JobDescription[];
    projects: Project[];
    onProjectSelect: (p: Project) => void;
    pendingInvitationCount: number;
    onNavigate: (page: string) => void;
    apiRequest?: (path: string, options?: RequestInit) => Promise<any>;
}) => {
    const isAdminView = effectiveUser.role.includes('Admin') || effectiveUser.role === 'super_admin' || effectiveUser.role === 'admin' || effectiveUser.role === 'head_dd' || effectiveUser.role === 'pdm';
    
    // Centralized filtering logic for this page.
    // This ensures the correct list of projects is used for either dashboard view.
    const myProjects = useMemo(() => {
        if (isAdminView) {
            return projects; // Admins need full list for active/inactive counts.
        }
        // Recruiters see only active projects they created.
        return projects.filter(p => p.uploaded_by === effectiveUser.email);
    }, [projects, effectiveUser, isAdminView]);
    
    return (
        <div className="page-content">
            {isAdminView ? (
                <AdminDashboard 
                    candidates={candidates} 
                    totalCandidatesCount={totalCandidatesCount}
                    jobs={jobs} 
                    projects={myProjects}
                    pendingInvitationCount={pendingInvitationCount}
                    onNavigate={onNavigate}
                    apiRequest={apiRequest}
                />
            ) : (
                <RecruiterDashboard 
                    candidates={candidates} 
                    totalCandidatesCount={totalCandidatesCount}
                    projects={myProjects} 
                    jobs={jobs}
                    onProjectSelect={onProjectSelect} 
                    user={effectiveUser} 
                />
            )}
        </div>
    );
};

export default DashboardPage;
