import React, { useMemo } from 'react';
import { Project, JobDescription } from '../types/types';

interface ProjectCardProps {
    project: Project;
    jobs: JobDescription[];
    onSelect: (project: Project) => void;
    onEdit: (project: Project) => void;
    onAddTeamMember: (project: Project) => void;
    canManageTeamMembers: boolean;
    onViewTeamMembers: (project: Project) => void;
    showOwner?: boolean;
}

const ProjectCard = React.memo(({ project, jobs, onSelect, onEdit, onAddTeamMember, canManageTeamMembers, onViewTeamMembers, showOwner }: ProjectCardProps) => {
    const projectJobs = jobs.filter(j => j.projectId === project.project_id);
    const jobCount = projectJobs.length;
    const activeJobs = projectJobs.filter(j => j.status === 'Active').length;
    const statusLabel = project.status === 'inactive' ? 'Inactive' : 'Active';

    return (
        <div className="card job-card project-card" onClick={() => onSelect(project)}>
            <div className="job-card-main">
                 <h3 className="job-card-title">{project.project_name}</h3>
                <div className="job-card-meta">
                    <span><span className="material-symbols-outlined">folder_open</span> {jobCount} Job(s)</span>
                    <span><span className="material-symbols-outlined">fact_check</span> {activeJobs} Active</span>
                    <span><span className="material-symbols-outlined">toggle_on</span> {statusLabel}</span>
                    {showOwner && (
                        <span><span className="material-symbols-outlined">person</span> {project.uploaded_by || 'Unknown'}</span>
                    )}
                </div>
                 <p className="job-card-description-snippet">
                    <span className="material-symbols-outlined">notes</span>
                    {project.project_description ? `${project.project_description.substring(0, 100)}...` : 'No description provided.'}
                </p>
            </div>
            <div className="job-card-aside project-card-aside">
                 <div className="job-card-actions stack project-card-actions">
                     <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onEdit(project);}}>
                        <span className="material-symbols-outlined">edit</span> Edit
                    </button>
                    {canManageTeamMembers && (
                        <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onAddTeamMember(project);}}>
                            <span className="material-symbols-outlined">group_add</span>
                            <span className="project-card-btn-label">Add Team Member</span>
                        </button>
                    )}
                    <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); onViewTeamMembers(project);}}>
                        <span className="material-symbols-outlined">groups</span>
                        <span className="project-card-btn-label">View Team</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

ProjectCard.displayName = 'ProjectCard';


const ProjectsPage = ({ projects, jobs, onProjectSelect, onProjectCreate, onEditProject, onAddTeamMember, onViewTeamMembers, effectiveUser }) => {
    
    // Filter projects locally within the component to ensure correct visibility.
    const myProjects = useMemo(() => {
        if (!effectiveUser) return [];
        return projects;
    }, [projects, effectiveUser]);

    const role = effectiveUser?.role || '';
    const showOwner = role === 'super_admin' || role === 'admin' || role.includes('Admin');
    const canManageTeamMembers = role === 'super_admin' || role === 'admin' || role.includes('Admin');

    return (
    <div className="page-content">
        <div className="page-header with-action">
            <div>
                <h1>Projects</h1>
                <p>Manage all your recruitment projects and their associated jobs.</p>
            </div>
             <div className="actions-group">
                <button className="btn btn-primary" onClick={onProjectCreate}>
                    <span className="material-symbols-outlined">add</span> Create New Project
                </button>
            </div>
        </div>

        {myProjects.length > 0 ? (
            <div className="job-list-container">
                {myProjects.map(project => (
                    <ProjectCard
                        key={project.project_id}
                        project={project}
                        jobs={jobs}
                        onSelect={onProjectSelect}
                        onEdit={onEditProject}
                        onAddTeamMember={onAddTeamMember}
                        canManageTeamMembers={canManageTeamMembers}
                        onViewTeamMembers={onViewTeamMembers}
                        showOwner={showOwner}
                    />
                ))}
            </div>
        ) : (
            <div className="empty-state large">
                <span className="material-symbols-outlined">workspaces</span>
                <h3>No Projects Yet</h3>
                <p>Create your first project to start adding jobs and matching candidates.</p>
                <button className="btn btn-primary" onClick={onProjectCreate}>Create Project</button>
            </div>
        )}
    </div>
    )
};

export default ProjectsPage;
