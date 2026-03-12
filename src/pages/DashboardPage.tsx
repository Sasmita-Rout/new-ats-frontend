

import React, { useMemo, useState, useEffect } from 'react';
import { Candidate, JobDescription, User, Project } from '../types/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';

const AdminDashboard = ({ candidates, totalCandidatesCount, jobs, projects, pendingInvitationCount, onNavigate, apiRequest }) => {
    const [openPositions, setOpenPositions] = useState<number | null>(null);
    const totalCandidates = typeof totalCandidatesCount === 'number' ? totalCandidatesCount : candidates.length;
    const activeProjects = projects.filter(p => p.status !== 'inactive').length;
    const inactiveProjects = projects.filter(p => p.status === 'inactive').length;
    const [systemActivity, setSystemActivity] = useState([]);
    const [recruiterPerformance, setRecruiterPerformance] = useState([]);
    const [isLoadingCharts, setIsLoadingCharts] = useState(true);
    
    useEffect(() => {
        const fetchJobStats = async () => {
            if (!apiRequest) return;

            // Calculate fallback from currently loaded jobs
            const fallbackCount = jobs.filter(j => j.status === 'Active').length;

            if (!apiRequest) {
                setOpenPositions(fallbackCount);
                return;
            }
            try {
                // This new endpoint will give us the true total count from the database
                const stats = await apiRequest('/job/stats');
                if (stats && typeof stats.active_jobs === 'number') {
                    setOpenPositions(stats.active_jobs);
                } else {
                    setOpenPositions(fallbackCount);
                }
            } catch (error) {
                console.error("Failed to fetch job stats:", error);
                // Fallback to the old method if the API call fails (e.g. 404)
                setOpenPositions(fallbackCount);
            }
        };
        fetchJobStats();

    }, [jobs, apiRequest]);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!apiRequest) {
                setIsLoadingCharts(false);
                return;
            }
            setIsLoadingCharts(true);
            try {
                const [activityData, performanceData] = await Promise.all([
                    apiRequest('/report/system-activity?days=30'),
                    apiRequest('/report/recruiter-performance?days=30&limit=10')
                ]);
                setSystemActivity(Array.isArray(activityData) ? activityData : []);
                setRecruiterPerformance(Array.isArray(performanceData) ? performanceData : []);
            } catch (error) {
                console.error("Failed to fetch dashboard chart data:", error);
            } finally {
                setIsLoadingCharts(false);
            }
        };
        fetchChartData();
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
                    <div className="stat-card-info"><h4>Open Positions</h4><p>{openPositions ?? '...'}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">inventory_2</span></div>
                    <div className="stat-card-info"><h4>Inactive Projects</h4><p>{inactiveProjects}</p></div>
                </div>
            </div>
            <div className="dashboard-grid single-col">
                <div className="chart-card">
                    <h4>System-Wide Activity (Last 30 Days)</h4>
                    {isLoadingCharts ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading Chart...</div>
                    ) : systemActivity.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={systemActivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="searches" stroke="#8884d8" name="Searches" />
                                <Line type="monotone" dataKey="active_users" stroke="#82ca9d" name="Active Users" />
                                <Line type="monotone" dataKey="unique_jobs" stroke="#ffc658" name="Unique Jobs" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No activity data available.</div>
                    )}
                </div>
                <div className="chart-card">
                    <h4>Recruiter Performance (Last 30 Days)</h4>
                    {isLoadingCharts ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading Chart...</div>
                    ) : recruiterPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={recruiterPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis 
                                    dataKey="ta_email" 
                                    type="category" 
                                    width={120}
                                    tickFormatter={(value) => value.split('@')[0]}
                                />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total_searches" name="Total Searches" fill="#8884d8" barSize={15} />
                                <Bar dataKey="unique_jobs" name="Unique Jobs" fill="#82ca9d" barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No performance data available.</div>
                    )}
                </div>
            </div>
        </>
    );
};


// FIX: Removed unused 'interviews' prop from component signature to resolve type error at the call site.
const RecruiterDashboard = ({ candidates, totalCandidatesCount, projects, myProjects, jobs, onProjectSelect, user, apiRequest }) => {
    const myActiveProjectsCount = myProjects.filter(p => p.status !== 'inactive').length;
    const myInactiveProjectsCount = myProjects.filter(p => p.status === 'inactive').length;
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);

    const activeJobsCount = useMemo(() => {
        if (!jobs || !myProjects) return 0;
        
        // Create a set of *active* project IDs for quick lookup.
        const myActiveProjectIds = new Set(
            myProjects.filter(p => p.status !== 'inactive').map(p => String(p.project_id))
        );

        // A job is counted as active only if its own status is 'Active' AND it belongs to an active project.
        return jobs.filter(j => j.status === 'Active' && myActiveProjectIds.has(String(j.projectId))).length;
    }, [jobs, myProjects]);

    useEffect(() => {
        let active = true;
        const loadAssignedProjects = async () => {
            if (!apiRequest || !projects || projects.length === 0 || !user?.email) {
                if (active) setAssignedProjects([]);
                return;
            }

            const userEmail = user.email.trim().toLowerCase();
            const results = await Promise.all(
                projects.map(async (project: Project) => {
                    try {
                        const team = await apiRequest(`/project/${encodeURIComponent(project.project_id)}/team`);
                        const members = Array.isArray(team) ? team : [];
                        const isMember = members.some((m: any) => {
                            const email = (m.user_email || m.email || '').toString().trim().toLowerCase();
                            return email === userEmail;
                        });
                        return isMember ? project : null;
                    } catch {
                        return null;
                    }
                })
            );

            if (!active) return;
            const assigned = results.filter(Boolean) as Project[];
            const filtered = assigned.filter(p => p.uploaded_by !== user.email);
            setAssignedProjects(filtered);
        };

        loadAssignedProjects();
        return () => { active = false; };
    }, [apiRequest, projects, user?.email]);
    
    const ProjectList = ({ title, projectList }) => (
        <div className="chart-card">
            <h4>{title} ({projectList.length})</h4>
            <div className="jobs-list-placeholder">
                {projectList.length > 0 ? (
                    projectList.map(p => (
                        <a
                            href="#"
                            key={p.project_id}
                            onClick={(e) => { e.preventDefault(); onProjectSelect(p); }}
                        >
                            {p.project_name}
                            <span className="muted-inline"> — {p.uploaded_by || 'Owner unknown'}</span>
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
                    <div className="icon"><span className="material-symbols-outlined">work</span></div>
                    <div className="stat-card-info"><h4>Active Jobs</h4><p>{activeJobsCount}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">inventory_2</span></div>
                    <div className="stat-card-info"><h4>Inactive Projects</h4><p>{myInactiveProjectsCount}</p></div>
                </div>
            </div>
            <div className="dashboard-grid equal">
                <ProjectList title="Assigned Projects" projectList={assignedProjects} />
                <ProjectList title="My Projects" projectList={myProjects} />
            </div>
        </>
    );
}


const DashboardPage = ({ effectiveUser, candidates, totalCandidatesCount, jobs, projects, onProjectSelect, pendingInvitationCount, onNavigate, apiRequest }) => {
    const isAdminView = effectiveUser.role.includes('Admin') || effectiveUser.role === 'super_admin' || effectiveUser.role === 'admin' || effectiveUser.role === 'head_dd' || effectiveUser.role === 'pdm';
    
    // Centralized filtering logic for this page.
    // This ensures the correct list of projects is used for either dashboard view.
    const myProjects = useMemo(() => {
        if (isAdminView) {
            return projects; // Admins see all projects passed down.
        }
        // Recruiters see only projects they created.
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
                    projects={projects} 
                    myProjects={myProjects}
                    jobs={jobs}
                    onProjectSelect={onProjectSelect} 
                    user={effectiveUser} 
                    apiRequest={apiRequest}
                />
            )}
        </div>
    );
};

export default DashboardPage;
