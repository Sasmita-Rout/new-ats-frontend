

import React, { useMemo } from 'react';
import { Candidate, JobDescription, User } from '../types/types';

const AdminDashboard = ({ candidates, totalCandidatesCount, jobs, projects, pendingInvitationCount, onNavigate }) => {
    const totalCandidates = typeof totalCandidatesCount === 'number' ? totalCandidatesCount : candidates.length;
    const activeProjects = projects.length;
    const openPositions = jobs.length;
    
    const avgTimeToHire = useMemo(() => {
        const hiredCandidates = candidates.filter(c => c.status === 'Hired');
        if (hiredCandidates.length === 0) return 0;
        const totalDays = hiredCandidates.reduce((acc, c) => {
            const applied = new Date(c.appliedDate);
            const hiredHistory = c.applicationHistory.find(h => h.stage === 'Hired');
            if (hiredHistory) {
                const hired = new Date(hiredHistory.date);
                return acc + (hired.getTime() - applied.getTime()) / (1000 * 3600 * 24);
            }
            return acc;
        }, 0);
        return Math.round(totalDays / hiredCandidates.length);
    }, [candidates]);
    
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
                    <div className="icon"><span className="material-symbols-outlined">schedule</span></div>
                    <div className="stat-card-info"><h4>Avg. Time to Hire</h4><p>{avgTimeToHire}d</p></div>
                </div>
            </div>
            <div className="dashboard-grid single-col">
                <div className="chart-card">
                    <h4>System-Wide Activity</h4>
                    <div className="chart-placeholder">Live system-wide activity graph will be displayed here.</div>
                </div>
                 <div className="chart-card">
                    <h4>Recruiter Performance</h4>
                     <div className="chart-placeholder">Recruiter performance metrics will be displayed here.</div>
                </div>
            </div>
        </>
    );
};

// FIX: Removed unused 'interviews' prop from component signature to resolve type error at the call site.
const RecruiterDashboard = ({ candidates, totalCandidatesCount, projects, onProjectSelect, user }) => {
    const myProjects = useMemo(() => projects, [projects]);
    const myActiveProjectsCount = myProjects.length;
    
    const pendingReviews = candidates.filter(c => ['Screening'].includes(c.status)).length;
    const hired = candidates.filter(c => c.status === 'Hired').length;

    const statusCounts = useMemo(() => {
        const counts = { Screening: 0, Interview: 0, Offer: 0, Hired: 0 };
        candidates.forEach(c => {
            if (c.status in counts) counts[c.status]++;
        });
        return Object.entries(counts);
    }, [candidates]);
    
    const upcomingInterviews = useMemo(() => {
        const today = new Date();
        const upcoming: { candidate: Candidate, interview: any }[] = [];
        candidates.forEach(candidate => {
            candidate.interviews?.forEach(interview => {
                if (interview.schedulerId === user.id && new Date(interview.date) >= today && interview.status === 'Scheduled') {
                    upcoming.push({ candidate, interview });
                }
            });
        });
        return upcoming.sort((a, b) => new Date(a.interview.date).getTime() - new Date(b.interview.date).getTime()).slice(0, 5);
    }, [candidates, user.id]);

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
                    <div className="icon"><span className="material-symbols-outlined">pending_actions</span></div>
                    <div className="stat-card-info"><h4>Pending Reviews</h4><p>{pendingReviews}</p></div>
                </div>
                <div className="stat-card">
                    <div className="icon"><span className="material-symbols-outlined">thumb_up</span></div>
                    <div className="stat-card-info"><h4>Candidates Hired</h4><p>{hired}</p></div>
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
               <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gridTemplateRows: 'auto auto auto', gap: '24px' }}>
                    <ProjectList title="My Projects" projectList={myProjects} />
                     <div className="chart-card">
                        <h4>Upcoming Interviews</h4>
                        {upcomingInterviews.length > 0 ? (
                            <div className="upcoming-interviews-list">
                                {upcomingInterviews.map(({ candidate, interview }) => (
                                    <div key={interview.id} className="upcoming-interview-item">
                                        <span className="material-symbols-outlined icon">event</span>
                                        <div className="interview-item-details">
                                            <p className="name">{candidate.name} - {interview.type}</p>
                                            <p className="date">{new Date(interview.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="placeholder-text">No upcoming interviews scheduled.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

const DashboardPage = ({ effectiveUser, candidates, totalCandidatesCount, jobs, projects, onProjectSelect, pendingInvitationCount, onNavigate }) => {
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
                />
            ) : (
                <RecruiterDashboard 
                    candidates={candidates} 
                    totalCandidatesCount={totalCandidatesCount}
                    projects={myProjects} 
                    onProjectSelect={onProjectSelect} 
                    user={effectiveUser} 
                />
            )}
        </div>
    );
};

export default DashboardPage;
