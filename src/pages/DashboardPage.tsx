

import React, { useMemo, useState, useEffect } from 'react';
import { Candidate, JobDescription, User } from '../types/types';

const AdminDashboard = ({ candidates, totalCandidatesCount, jobs, projects, pendingInvitationCount, onNavigate, apiRequest }) => {
    const [openPositions, setOpenPositions] = useState<number | null>(null);
    const totalCandidates = typeof totalCandidatesCount === 'number' ? totalCandidatesCount : candidates.length;
    const activeProjects = projects.filter(p => p.status !== 'inactive').length;
    const inactiveProjects = projects.filter(p => p.status === 'inactive').length;
    
    useEffect(() => {
        const fetchJobStats = async () => {
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
                    <h4>System-Wide Activity</h4>
                    <div style={{ height: '300px', background: '#f5f5f5', borderRadius: '8px' }}></div>
                </div>
                <div className="chart-card">
                    <h4>Recruiter Performance</h4>
                    <div style={{ height: '300px', background: '#f5f5f5', borderRadius: '8px' }}></div>
                </div>
            </div>
        </>
    );
};

// FIX: Removed unused 'interviews' prop from component signature to resolve type error at the call site.
const RecruiterDashboard = ({ candidates, totalCandidatesCount, projects, jobs, onProjectSelect, user }) => {
    const myProjects = useMemo(() => projects, [projects]);
    const myActiveProjectsCount = myProjects.filter(p => p.status !== 'inactive').length;
    const myInactiveProjectsCount = myProjects.filter(p => p.status === 'inactive').length;

    const activeJobsCount = useMemo(() => {
        if (!jobs || !myProjects) return 0;
        
        // Create a set of *active* project IDs for quick lookup.
        const myActiveProjectIds = new Set(
            myProjects.filter(p => p.status !== 'inactive').map(p => String(p.project_id))
        );

        // A job is counted as active only if its own status is 'Active' AND it belongs to an active project.
        return jobs.filter(j => j.status === 'Active' && myActiveProjectIds.has(String(j.projectId))).length;
    }, [jobs, myProjects]);

    const statusCounts = useMemo(() => {
        const counts = { Screening: 0, Interview: 0, Offer: 0, Hired: 0 };
        candidates.forEach(c => {
            if (c.status in counts) counts[c.status]++;
        });
        return Object.entries(counts);
    }, [candidates]);
    
    const ProjectList = ({ title, projectList }) => (
        <div className="chart-card">
            <h4>{title} ({projectList.length})</h4>
            <div className="jobs-list-placeholder">
                {projectList.length > 0 ? (
                    projectList.map(p => <a href="#" key={p.project_id} onClick={(e) => {e.preventDefault(); onProjectSelect(p)}}>{p.project_name}</a>)
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
               <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gridTemplateRows: 'auto', gap: '24px' }}>
                    <ProjectList title="My Projects" projectList={myProjects} />
                </div>
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
