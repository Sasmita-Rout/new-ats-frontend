
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Tool } from "@google/genai";

// Import types
import { Candidate, JobDescription, CandidateWithScore, Interview, User, HistoryEntry, Project, MatchResult, CompanyProfile, Invitation, InvitationStatus, UserPermission, Notification } from './types/types';

// Import pages
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/JobMatchingPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import CandidateMatchDetailPage from './pages/CandidateMatchDetailPage';
import JobDetailPage from './pages/JobDetailPage';
import CommunicationsPage from './pages/CommunicationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CalendarPage from './pages/CalendarPage';
import ManageUsersPage from './pages/ManageUsersPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';


// Import components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Chatbot from './components/ai/Chatbot';

// Import modals
import ResumeUploadModal from './modals/ResumeUploadModal';
import JDUploadModal from './modals/JDUploadModal';
import JobEditorModal from './modals/JobEditorModal';
import MeetingSchedulerModal from './modals/MeetingSchedulerModal';
import UserEditorModal from './modals/UserEditorModal';
import ProjectEditorModal from './modals/ProjectEditorModal';
import AIGenerateJDModal from './modals/AIGenerateJDModal';
import InviteMemberModal from './modals/InviteMemberModal';


// Import utils
import { getInitials } from './utils/helpers';
import { calculateTotalExperience, parseJobRequirementsFromText } from './utils/analysisUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const RESUME_VAULT_BASE_URL = import.meta.env.VITE_RESUME_VAULT_BASE_URL || 'https://13.233.241.103/resume_vault';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const defaultFilters = { status: [] as Candidate['status'][], skills: '', location: '', roleCategory: '', education: '', salaryMin: '', salaryMax: '', tags: '', experience: '' };
const allPermissions: UserPermission[] = ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'];

const hashStringToInt = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) || 1;
};

const defaultUser: User = {
    id: 1,
    name: 'Default Admin',
    email: 'admin@default.com',
    role: 'Main Admin',
    avatar: getInitials('Default Admin'),
    permissions: allPermissions,
};

const App = () => {
    // --- MAIN DATA STATE ---
    const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
    const [allJobDescriptions, setAllJobDescriptions] = useState<JobDescription[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([defaultUser]);
    const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
        return {
            name: 'AccionLabs',
            logo: 'https://mma.prnewswire.com/media/1196052/Accion_Labs_Logo.jpg',
            industry: 'Technology & Services',
            description: 'AccionLabs is an intelligent Applicant Tracking System designed to streamline recruitment and unlock human potential. We help companies find the perfect fit, faster.',
            website: 'https://www.accionlabs.com',
            email: 'info@accionlabs.com',
            linkedin: 'https://www.linkedin.com/company/accion-labs/',
            address: '1225 Washington Pike #401, Bridgeville, PA 15017, United States'
        };
    });

    // --- AUTH & IMPERSONATION STATE ---
    const [currentUser, setCurrentUser] = useState<User | null>(defaultUser);
    const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

    // --- UI & MODAL STATE ---
    const [currentPage, setCurrentPage] = useState('Dashboard');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobDescription | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [emailTargets, setEmailTargets] = useState<Candidate[]>([]);
    const [stagedResumes, setStagedResumes] = useState<File[]>([]);
    const [stagedJds, setStagedJds] = useState<File[]>([]);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isJdUploadModalOpen, setJdUploadModalOpen] = useState(false);
    const [isJobEditorModalOpen, setJobEditorModalOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState<JobDescription | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const processingRef = useRef(false);
    const initialDataFetchRef = useRef(false);
    const [isProcessingJds, setIsProcessingJds] = useState(false);
    const [processingJdsStatus, setProcessingJdsStatus] = useState('');
    const [mainFilters, setMainFilters] = useState(defaultFilters);
    const [isMeetingModalOpen, setMeetingModalOpen] = useState(false);
    const [candidateForMeeting, setCandidateForMeeting] = useState<Candidate | null>(null);
    const [initialEmailDraft, setInitialEmailDraft] = useState<{subject: string, body: string, cc?: string} | null>(null);
    const [candidatesForAnalysis, setCandidatesForAnalysis] = useState<Candidate[]>([]);
    const [isUserEditorModalOpen, setUserEditorModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Partial<User> | null>(null);
    const [isProjectEditorModalOpen, setProjectEditorModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAnalyzingJobId, setIsAnalyzingJobId] = useState<number | null>(null);
    const [isAIGenerateModalOpen, setAIGenerateModalOpen] = useState(false);
    const [isGeneratingJD, setIsGeneratingJD] = useState(false);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    
    // --- DERIVED STATE ---
    const effectiveUser = impersonatedUser || currentUser;

    // --- DATA PERSISTENCE ---
    // TODO: Data persistence (candidates, jobs, projects, history, invitations, notifications) will be handled via API calls.
    
    // --- CORE HANDLERS ---
    const logAction = useCallback((action: string, details: Partial<HistoryEntry> = {}, directUser: User | null = null) => {
        const userContext = directUser || effectiveUser;
        if (!userContext) return;
    
        const newLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: userContext.id,
            userName: userContext.name,
            userRole: userContext.role,
            impersonatingUserName: (directUser === null && impersonatedUser) ? currentUser?.name : undefined,
            action,
            ...details
        };
        setHistoryLog(prev => [newLog, ...prev]);
    }, [currentUser, impersonatedUser, effectiveUser]);

    // --- NOTIFICATION HANDLERS ---
    const addNotification = useCallback((userId: number, message: string, linkTo?: { page: string; targetId?: number }) => {
        const newNotification: Notification = {
            id: Date.now() + Math.random(), // Add random to avoid collision in fast operations
            userId,
            timestamp: new Date().toISOString(),
            message,
            read: false,
            linkTo,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep max 100 notifications
    }, []);

    const notifySuccess = useCallback((message: string) => {
        toast.success(message);
        const userId = effectiveUser?.id ?? defaultUser.id;
        addNotification(userId, message);
    }, [addNotification, effectiveUser]);

    const notifyError = useCallback((message: string) => {
        toast.error(message);
        const userId = effectiveUser?.id ?? defaultUser.id;
        addNotification(userId, message);
    }, [addNotification, effectiveUser]);

    const notifyInfo = useCallback((message: string) => {
        toast.info(message);
        const userId = effectiveUser?.id ?? defaultUser.id;
        addNotification(userId, message);
    }, [addNotification, effectiveUser]);

    const handleMarkAsRead = (notificationId: number) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    };

    const handleMarkAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
    
    const handleNotificationNavigate = (notification: Notification) => {
        handleMarkAsRead(notification.id);
        if (notification.linkTo) {
            handleNavigate(notification.linkTo.page);
        }
    };

    const handleLogout = () => {
        if (!currentUser) return;

        const newLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            impersonatingUserName: undefined,
            action: 'User logged out',
        };

        if (impersonatedUser) {
            newLog.action = `User logged out while impersonating`;
            newLog.targetType = 'User';
            newLog.targetName = impersonatedUser.name;
            newLog.targetId = impersonatedUser.id;
        }
        
        setHistoryLog(prev => [newLog, ...prev]);
        
        setCurrentUser(null);
        setImpersonatedUser(null);
        // TODO: Logout functionality will interact with an authentication API.
        window.location.reload();
    };

    const handleImpersonate = (userToImpersonate: User) => {
        if (currentUser?.role.includes('Admin')) {
            setImpersonatedUser(userToImpersonate);
            logAction(`Started impersonating`, { targetType: 'User', targetName: userToImpersonate.name, targetId: userToImpersonate.id });

            const impersonationNoticeLog: HistoryEntry = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                userId: userToImpersonate.id,
                userName: userToImpersonate.name,
                userRole: userToImpersonate.role,
                action: `Was impersonated by`,
                targetType: 'User',
                targetName: currentUser.name,
                targetId: currentUser.id,
            };
            setHistoryLog(prev => [impersonationNoticeLog, ...prev]);

            handleNavigate('Dashboard');
        }
    };

    const handleStopImpersonation = () => {
        if (!impersonatedUser || !currentUser) return;

        const adminLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            impersonatingUserName: undefined,
            action: `Stopped impersonating`,
            targetType: 'User',
            targetName: impersonatedUser.name,
            targetId: impersonatedUser.id,
        };
        
        const userNoticeLog: HistoryEntry = {
            id: Date.now() + 1,
            timestamp: new Date().toISOString(),
            userId: impersonatedUser.id,
            userName: impersonatedUser.name,
            userRole: impersonatedUser.role,
            action: `Impersonation session ended by`,
            targetType: 'User',
            targetName: currentUser.name,
            targetId: currentUser.id,
        };
        
        setHistoryLog(prev => [userNoticeLog, adminLog, ...prev]);
        
        setImpersonatedUser(null);
        handleNavigate('Dashboard');
    };
    
    const handleOpenMeetingModal = (candidate: Candidate) => {
        setCandidateForMeeting(candidate);
        setMeetingModalOpen(true);
    };

    const handleScheduleMeeting = (details: { title: string, type: Interview['type'], dateTime: string, duration: number, interviewer: string, meetingLink: string, description: string }) => {
        if (!candidateForMeeting || !effectiveUser) return;
        
        const newInterview: Interview = {
            id: Date.now(),
            type: details.type,
            date: new Date(details.dateTime).toISOString(),
            duration: details.duration,
            interviewer: details.interviewer,
            status: 'Scheduled',
            meetingLink: details.meetingLink,
            notes: details.description,
            schedulerId: effectiveUser.id,
        };
        
        const updatedCandidate = {
            ...candidateForMeeting,
            interviews: [...(candidateForMeeting.interviews || []), newInterview],
            status: 'Interview' as const,
        };

        handleUpdateCandidate(updatedCandidate);
        logAction(`Scheduled ${details.type} interview for candidate`, { targetType: 'Candidate', targetName: candidateForMeeting.name, targetId: candidateForMeeting.id });

        const emailBody = `Hi ${candidateForMeeting.name},\n\nWe would like to invite you for a ${details.type} interview. Please see the details below:\n\nTopic: ${details.title}\nDate & Time: ${new Date(details.dateTime).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}\nDuration: ${details.duration} minutes\nInterviewer(s): ${details.interviewer}\nMeeting Link: ${details.meetingLink}\n\nAgenda:\n${details.description}\n\nPlease let us know if this time works for you.\n\nBest regards,\n${effectiveUser.name}`;
        
        setInitialEmailDraft({
            subject: `Invitation: ${details.type} Interview for ${selectedJob?.title || 'a relevant position'}`,
            body: emailBody,
        });

        setEmailTargets([candidateForMeeting]);
        setMeetingModalOpen(false);
        setCandidateForMeeting(null);
        setCurrentPage('Communications');
    };

    const handleResetAllData = () => {
        const mainAdmin = users.find(u => u.role === 'Main Admin');
        if (mainAdmin) {
            setAllCandidates([]);
            setAllJobDescriptions([]);
            setAllProjects([]);
            setUsers([mainAdmin]);
            setHistoryLog([]);
            logAction('Reset all application data');
        } else {
            alert('Could not find Main Admin to preserve. Aborting reset.');
        }
    };
    
    const handleNavigate = (page: string) => {
        setSelectedCandidate(null);
        setSelectedJob(null);
        setSelectedJobForDetail(null);
        setSelectedProject(null);
        setCandidatesForAnalysis([]);
        if (page !== 'Communications') setEmailTargets([]);
        setCurrentPage(page);
    };
    
    const handleNavigateTo = (type: HistoryEntry['targetType'], id: number) => {
        if (type === 'Candidate') {
            const candidate = allCandidates.find(c => c.id === id);
            if (candidate) {
                setSelectedCandidate(candidate);
                setCurrentPage('Candidates');
            }
        } else if (type === 'Job') {
            const job = allJobDescriptions.find(j => j.id === id);
             if (job) {
                setSelectedJobForDetail(job);
                setCurrentPage('Job Matching');
            }
        } else if (type === 'Project') {
            const project = allProjects.find(p => p.project_id === String(id));
            if (project) {
                setSelectedProject(project);
                setCurrentPage('Job Matching');
            }
        }
    };
    
    // --- USER MANAGEMENT ---
    const handleSaveUser = (userData: Partial<User> & { invitationId?: number }, userId?: number) => {
        if (userId) {
            if (currentUser && currentUser.id === userId) {
                const updatedCurrentUser = { ...currentUser, ...userData, password: userData.password || currentUser.password };
                setCurrentUser(updatedCurrentUser);
                // TODO: User session persistence will be handled via API calls.
            }
            setUsers(users.map(u => u.id === userId ? { ...u, ...userData, password: userData.password || u.password } : u));
            logAction('Updated user', { targetType: 'User', targetName: userData.name, targetId: userId });
        } else {
             const newUser: User = { 
                id: Date.now(), 
                avatar: getInitials(userData.name),
                permissions: userData.role === 'Admin' ? allPermissions : [],
                ...userData 
            } as User;
            setUsers(prev => [newUser, ...prev]);
            
            const invitation = invitations.find(i => i.id === userData.invitationId);
            if (invitation) {
                handleUpdateInvitationStatus(invitation.id, 'Approved');
            } else {
                logAction('Created user manually', { targetType: 'User', targetName: newUser.name, targetId: newUser.id });
            }

            const subject = "Welcome to AccionTalent - Your Account Credentials";
            const body = `Hi ${newUser.name},\n\nAn account has been created for you on the AccionTalent platform.\n\nYour login credentials are:\nUsername: ${newUser.email}\nPassword: ${userData.password}\n\nYou can log in here: ${window.location.href}\n\nWe recommend changing your password in your profile settings after your first login.\n\nBest regards,\nThe AccionTalent Team`;

            const mailtoLink = `mailto:${newUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoLink, '_blank');
        }
    };

    const handleUpdateCurrentUser = (updatedData: Partial<User>) => {
        if (!currentUser) return;

        let newAvatar = updatedData.avatar ?? currentUser.avatar;
        if (updatedData.name && updatedData.name !== currentUser.name && (!newAvatar || !newAvatar.startsWith('data:image'))) {
            newAvatar = getInitials(updatedData.name);
        }

        const updatedUser = { ...currentUser, ...updatedData, avatar: newAvatar };
        
        setCurrentUser(updatedUser);
        // TODO: User session persistence will be handled via API calls.
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
        logAction('Updated own profile');
    };
    
    const handleUpdateAllUsers = (updatedUsers: User[]) => {
        setUsers(updatedUsers);
        logAction('Updated multiple user roles/permissions');
    };

    const handleDeleteUser = (userId: number) => {
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) return;
        if (window.confirm(`Are you sure you want to delete user "${userToDelete.name}"?`)) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            logAction('Deleted user', { targetType: 'User', targetName: userToDelete.name, targetId: userId });
        }
    };
    
    const handleInviteUser = (email: string) => {
        if (!effectiveUser) return;
        const newInvitation: Invitation = {
            id: Date.now(),
            inviterId: effectiveUser.id,
            inviterName: effectiveUser.name,
            email,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            type: 'User',
        };
        setInvitations(prev => [newInvitation, ...prev]);
        logAction(`Sent invitation to ${email}`);
        
        const admins = users.filter(u => u.role.includes('Admin'));
        admins.forEach(admin => {
            addNotification(admin.id, `${effectiveUser.name} has invited a new member: ${email}`, { page: 'Manage Users' });
        });

        setInviteModalOpen(false);
    };

    const handleUpdateInvitationStatus = (invitationId: number, status: InvitationStatus) => {
        const invitation = invitations.find(i => i.id === invitationId);
        if (!invitation) return;

        setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status } : i));
        logAction(`Invitation for ${invitation.email} ${status.toLowerCase()}`);

        addNotification(invitation.inviterId, `Your invitation for ${invitation.email} has been ${status}.`, { page: 'Settings' });
    };

    const handleUpdateCompanyProfile = (newProfile: CompanyProfile) => {
        setCompanyProfile(newProfile);
        logAction('Updated company profile');
    };

    const handleExportData = () => {
        const dataToExport = { allCandidates, allJobDescriptions, allProjects, users, historyLog, companyProfile };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `acciontalent_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logAction('Exported workspace data');
    };
    
    const handleImportData = (file: File) => {
        if (!window.confirm("Are you sure you want to import data? This will overwrite all existing jobs, candidates, users, and settings.")) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result as string);
                if (data.users && data.allCandidates && data.allJobDescriptions && data.allProjects && data.companyProfile) {
                    setAllCandidates(data.allCandidates);
                    setAllJobDescriptions(data.allJobDescriptions);
                    setAllProjects(data.allProjects);
                    setUsers(data.users);
                    setHistoryLog(data.historyLog || []);
                    setCompanyProfile(data.companyProfile);
                    logAction('Imported workspace data');
                    alert("Data imported successfully. The application will now reload.");
                    window.location.reload();
                } else {
                    throw new Error("Invalid data file structure.");
                }
            } catch (error) {
                console.error("Import failed:", error);
                alert(`Failed to import data: ${error.message}`);
            }
        };
        reader.readAsText(file);
    };

    // --- PROJECT & JOB HANDLERS ---
    const handleSaveProject = async (projectData: Partial<Project>) => {
        if (projectData.project_id) {
            try {
                console.info('[Project Update Payload]', {
                    project_id: projectData.project_id,
                    project_name: projectData.project_name,
                    project_description: projectData.project_description,
                    status: projectData.status,
                });
                await apiRequest(`/project/${encodeURIComponent(projectData.project_id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_name: projectData.project_name,
                        project_description: projectData.project_description,
                        status: projectData.status,
                    }),
                });
                await fetchProjects();
                logAction('Updated project', { targetType: 'Project', targetName: projectData.project_name, targetId: Number(projectData.project_id) || 0 });
                notifySuccess(`Project updated: ${projectData.project_name || 'Untitled'}`);
            } catch (error) {
                console.error('Failed to update project:', error);
                notifyError('Project update failed.');
            }
        } else {
            const newProjectId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : Date.now().toString();
            const newProject: Project = {
                project_id: newProjectId,
                uploaded_by: effectiveUser?.email || defaultUser.email,
                project_name: projectData.project_name || 'Untitled Project',
                project_description: projectData.project_description || '',
                status: projectData.status || 'active',
            };
            try {
                console.info('[Project Create Payload]', newProject);
                await apiRequest('/project/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newProject),
                });
                await fetchProjects();
                logAction('Created project', { targetType: 'Project', targetName: newProject.project_name, targetId: Number(newProject.project_id) || 0 });
                notifySuccess(`Project created: ${newProject.project_name}`);

                // Automatically prompt to create a JD for the new project
                setSelectedProject(newProject);
                setJobToEdit(null);
                setJobEditorModalOpen(true);
            } catch (error) {
                console.error('Failed to create project:', error);
                notifyError('Project creation failed.');
            }
        }
    };
    
    const handleSaveJob = async (jobData: Partial<JobDescription>, projectId: string) => {
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        const existing = jobData.jobId
            ? jobData
            : allJobDescriptions.find(j => j.id === jobData.id);
        const { min, max } = parseExperienceRange(jobData.experience);
        const skills = (jobData.requiredSkills && jobData.requiredSkills.length > 0)
            ? jobData.requiredSkills
            : ['General'];
        const title = (jobData.title || '').trim();
        const location = (jobData.location || '').trim();
        const description = (jobData.description || '').trim();
        const validationErrors: string[] = [];
        if (title.length < 3) validationErrors.push('Job title must be at least 3 characters.');
        if (location.length < 2) validationErrors.push('Location must be at least 2 characters.');
        if (description.length < 10) validationErrors.push('Job description must be at least 10 characters.');
        if (validationErrors.length > 0) {
            notifyError(validationErrors.join(' '));
            return;
        }

        if (existing?.jobId) {
            try {
                console.info('[Job Update Payload]', {
                    job_id: existing.jobId,
                    project_id: projectId,
                    job_title: title,
                    job_description: description,
                    job_skills: skills,
                    job_location: location,
                    job_experience_min: min,
                    job_experience_max: max,
                    status: jobData.status?.toLowerCase() === 'closed' ? 'closed' : 'active',
                });
                await apiRequest(`/job/${encodeURIComponent(existing.jobId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job_title: title,
                        job_description: description,
                        job_skills: skills,
                        job_location: location,
                        job_experience_min: min,
                        job_experience_max: max,
                        status: jobData.status?.toLowerCase() === 'closed' ? 'closed' : 'active',
                        project_id: projectId,
                    }),
                });
                await fetchJobs();
                logAction('Updated job', { targetType: 'Job', targetName: jobData.title, targetId: jobData.id || 0 });
                notifySuccess(`Job updated: ${jobData.title || 'Untitled Job'}`);
            } catch (error) {
                console.error('Failed to update job:', error);
                notifyError('Job update failed.');
            }
            return;
        }

        const newJobId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : Date.now().toString();
        try {
            console.info('[Job Create Payload]', {
                job_id: newJobId,
                project_id: projectId,
                uploaded_by: uploadedBy,
                job_title: title || 'Untitled Job',
                job_location: location || 'N/A',
                job_experience_min: min,
                job_experience_max: max,
                job_skills: skills,
                job_description: description || '',
                ai_filled: !!jobData.aiFilled,
            });
            await apiRequest('/job/process-job-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: newJobId,
                    project_id: projectId,
                    uploaded_by: uploadedBy,
                    job_title: title || 'Untitled Job',
                    job_location: location || 'N/A',
                    job_experience_min: min,
                    job_experience_max: max,
                    job_skills: skills,
                    job_description: description || '',
                    ai_filled: !!jobData.aiFilled,
                }),
            });
            await fetchJobs();
            logAction('Created job', { targetType: 'Job', targetName: jobData.title || 'Untitled Job', targetId: 0 });
            notifySuccess(`Job created: ${jobData.title || 'Untitled Job'}`);
        } catch (error) {
            console.error('Failed to create job:', error);
            notifyError('Job creation failed.');
        }
    };

    const handleProcessJds = async () => {
        if (!selectedProject) {
            alert("No project selected. Cannot process JDs.");
            return;
        }
        
        setIsProcessingJds(true);
        const totalFiles = stagedJds.length;
        let successCount = 0;
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        
        for (let i = 0; i < totalFiles; i++) {
            const file = stagedJds[i];
            setProcessingJdsStatus(`Processing ${file.name} (${i + 1}/${totalFiles})...`);
            
            try {
                const formData = new FormData();
                const jobId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : Date.now().toString();
                formData.append('job_id', jobId);
                formData.append('uploaded_by', uploadedBy);
                formData.append('project_id', selectedProject.project_id);
                formData.append('jd_file', file);

                console.info('[JD Upload Payload]', {
                    job_id: jobId,
                    project_id: selectedProject.project_id,
                    uploaded_by: uploadedBy,
                    filename: file.name,
                });
                await apiRequest('/job/process-job-file', {
                    method: 'POST',
                    body: formData,
                });
                successCount++;
    
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                notifyError(`JD upload failed: ${file.name}`);
            }
        }
        
        await fetchJobs();
        setProcessingJdsStatus(`Processing complete. ${successCount}/${totalFiles} JDs added successfully.`);
        if (successCount > 0) notifySuccess(`JD upload complete: ${successCount}/${totalFiles}`);
        setTimeout(() => {
            setIsProcessingJds(false);
            setStagedJds([]);
        }, 3000);
    };

    const handleDeleteJobs = async (ids: number[]) => {
        const jobsToDelete = allJobDescriptions.filter(j => ids.includes(j.id));
        if (window.confirm(`Are you sure you want to delete ${jobsToDelete.length} selected jobs? This action cannot be undone.`)) {
        const results = await Promise.all(jobsToDelete.map(async (job) => {
            if (!job.jobId) return { id: job.id, ok: false };
            try {
                console.info('[Job Delete]', { job_id: job.jobId });
                await apiRequest(`/job/${encodeURIComponent(job.jobId)}`, { method: 'DELETE' });
                return { id: job.id, ok: true };
            } catch (error) {
                console.error('Failed to delete job:', error);
                return { id: job.id, ok: false };
            }
        }));
            const deletedIds = results.filter(r => r.ok).map(r => r.id);
            if (deletedIds.length > 0) {
                setAllJobDescriptions(prev => prev.filter(j => !deletedIds.includes(j.id)));
                jobsToDelete.filter(j => deletedIds.includes(j.id))
                    .forEach(j => logAction('Deleted job', { targetType: 'Job', targetName: j.title, targetId: j.id }));
                notifySuccess(`Deleted ${deletedIds.length} job(s).`);
                if (selectedJob && deletedIds.includes(selectedJob.id)) setSelectedJob(null);
                if (selectedJobForDetail && deletedIds.includes(selectedJobForDetail.id)) setSelectedJobForDetail(null);
            }
        }
    };

    const handleJobStatusUpdate = async (jobId: number, status: JobDescription['status']) => {
        const jobToUpdate = allJobDescriptions.find(j => j.id === jobId);
        setAllJobDescriptions(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
        if (jobToUpdate?.jobId) {
            try {
                await apiRequest(`/job/${encodeURIComponent(jobToUpdate.jobId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: status.toLowerCase() === 'closed' ? 'closed' : 'active' }),
                });
                await fetchJobs();
            } catch (error) {
                console.error('Failed to update job status:', error);
            }
        }
        if(jobToUpdate) logAction(`Updated job status to ${status}`, { targetType: 'Job', targetName: jobToUpdate.title, targetId: jobId });
    };

    const handleGenerateJdWithAI = async (prompt: string, projectId: string) => {
        if (!prompt || !projectId) return;

        setIsGeneratingJD(true);
        setAIGenerateModalOpen(false);

        try {
            console.info('[AI JD Generate Payload]', { prompt, project_id: projectId });
            const data = await apiRequest('/job/generate-with-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const jobData = data?.job || data;

            const newJobData: Partial<JobDescription> = {
                projectId,
                title: jobData.title || 'Untitled Job',
                companyName: jobData.companyName || '',
                companyLogo: '',
                location: jobData.location || '',
                status: 'Active',
                experience: jobData.experience || '',
                type: jobData.type || 'Full-time',
                salary: jobData.salary || 'Competitive',
                requiredSkills: jobData.requiredSkills || [],
                description: jobData.description || '',
                highlights: jobData.highlights || [],
                responsibilities: jobData.responsibilities || [],
                qualifications: jobData.qualifications || [],
                preferredQualifications: jobData.preferredQualifications || [],
                education: jobData.education || '',
                department: jobData.department || '',
                roleCategory: jobData.roleCategory || '',
                industry: jobData.industry || '',
                ownerId: effectiveUser.id,
                numberOfPositions: jobData.numberOfPositions || 1,
                aiFilled: true,
            };

            setJobToEdit(newJobData as JobDescription);
            setJobEditorModalOpen(true);
            notifyInfo('AI JD generated. Please review and save.');

        } catch (error) {
            console.error("AI JD generation failed:", error);
            notifyError('AI JD generation failed.');
        } finally {
            setIsGeneratingJD(false);
        }
    };

    const handleAnalyzeJobFit = useCallback(async (job: JobDescription) => {
        setIsAnalyzingJobId(job.id);
        try {
            let keywords: string[] = [];
            const currentJobState = allJobDescriptions.find(j => j.id === job.id) || job;

            if (currentJobState.analysisKeywords && currentJobState.analysisKeywords.length > 0) {
                keywords = currentJobState.analysisKeywords;
            } else {
                if (!GEMINI_API_KEY) {
                    notifyError('AI analysis is not configured. Set VITE_GEMINI_API_KEY in .env and restart.');
                    return { rankedCandidates: [], keywords: [] };
                }
                // Fix: Re-instantiate AI right before the call.
                const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                const keywordsSchema = {
                    type: Type.OBJECT,
                    properties: {
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['keywords']
                };
    
                const prompt = `You are an expert technical headhunter. Generate a JSON object with a "keywords" key containing highly specific keywords (titles and critical tech) to find strong candidate matches for: "${job.title}". Skills: ${(job.requiredSkills || []).join(', ')}`;
    
                // Fix: Updated model to 'gemini-3-pro-preview' as keyword analysis for matching is a complex task.
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: 'application/json', responseSchema: keywordsSchema }
                });
    
                let jsonString = response.text.trim();
                if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
                const { keywords: aiKeywords } = JSON.parse(jsonString);
                keywords = aiKeywords;
                setAllJobDescriptions(prevJobs => prevJobs.map(j => j.id === job.id ? { ...j, analysisKeywords: keywords } : j));
            }
            
            const keywordsLower = keywords.map(k => k.toLowerCase());
            const relevantCandidates = allCandidates.filter(c =>
                keywordsLower.some(kw =>
                    (c.title && c.title.toLowerCase().includes(kw)) ||
                    (c.category && c.category.toLowerCase().includes(kw)) ||
                    (c.summary && c.summary.toLowerCase().includes(kw)) ||
                    (c.resumeContent && c.resumeContent.toLowerCase().includes(kw))
                )
            );
    
            const jobRequirements = parseJobRequirementsFromText(job);
            const rankedCandidates = relevantCandidates.map(c => {
                const candidateSkillsLower = new Set(c.skills.map(s => s.toLowerCase()));
                const matchCount = job.requiredSkills.filter(skill => candidateSkillsLower.has(skill.toLowerCase())).length;
                const skillScore = job.requiredSkills.length > 0 ? (matchCount / job.requiredSkills.length) * 100 : 100;
                const candidateTotalExp = calculateTotalExperience(c.experience);
                const expMatch = jobRequirements.minYearsExperience === null || candidateTotalExp >= jobRequirements.minYearsExperience;
                const expScore = expMatch ? 100 : 0;
                let eduMatch = true;
                if (jobRequirements.requiredDegree) {
                    const requiredLower = jobRequirements.requiredDegree.toLowerCase();
                    eduMatch = c.education.some(edu => edu.degree.toLowerCase().includes(requiredLower) || requiredLower.includes(edu.degree.toLowerCase()));
                }
                const eduScore = eduMatch ? 100 : 0;
                const overallScore = Math.round((skillScore * 0.6) + (expScore * 0.3) + (eduScore * 0.1));
                const missingSkills = job.requiredSkills.filter(skill => !candidateSkillsLower.has(skill.toLowerCase()));
                return { ...c, overallScore, skillScore, expMatch, eduMatch, missingSkills, candidateTotalExp };
            }).sort((a, b) => b.overallScore - a.overallScore);
    
            return { rankedCandidates, keywords };
        } catch (error) {
            console.error("AI-powered analysis failed:", error);
            alert(`An error occurred during AI analysis.`);
            return { rankedCandidates: [], keywords: [] };
        } finally {
            setIsAnalyzingJobId(null);
        }
    }, [allCandidates, allJobDescriptions, notifyError]);

    const handleAnalyzeFit = useCallback(async (candidate: Candidate, jd: Partial<JobDescription>): Promise<MatchResult | null> => {
        try {
            if (!GEMINI_API_KEY) {
                notifyError('AI analysis is not configured. Set VITE_GEMINI_API_KEY in .env and restart.');
                return null;
            }
            // Fix: Re-instantiate AI right before the call.
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const matchSchema = {
                type: Type.OBJECT,
                properties: {
                    matchScore: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['matchScore', 'summary', 'matchingSkills', 'missingSkills']
            };

            const prompt = `You are an expert recruiter. Analyze how well this candidate matches this job description. Provide a match score from 0-100, a brief summary, list of matching skills, and list of missing skills.

Candidate:
Name: ${candidate.name}
Title: ${candidate.title}
Summary: ${candidate.summary}
Experience: ${candidate.experience.map(e => `${e.title} at ${e.company} (${e.duration})`).join(', ')}
Skills: ${candidate.skills.join(', ')}
Education: ${candidate.education.map(e => `${e.degree} from ${e.institution}`).join(', ')}

Job Description:
Title: ${jd.title}
Description: ${jd.description}
Required Skills: ${jd.requiredSkills?.join(', ') || 'N/A'}
Experience: ${jd.experience}
Qualifications: ${jd.qualifications?.join(', ') || 'N/A'}`;

            // Fix: Updated model to 'gemini-3-flash-preview' for analysis tasks.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: 'application/json', responseSchema: matchSchema }
            });

            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const result = JSON.parse(jsonString) as MatchResult;

            return result;
        } catch (error) {
            console.error("Failed to analyze fit:", error);
            return null;
        }
    }, [notifyError]);
    
    const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : await response.text();
        if (!response.ok) {
            const message = typeof data === 'string' ? data : (data?.detail || 'Request failed');
            throw new Error(message);
        }
        return data;
    }, []);

    const uploadResumeToVault = useCallback(async (file: File, email: string, uploadedBy: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', email);
        formData.append('uploaded_by', uploadedBy);

        const response = await fetch(`${RESUME_VAULT_BASE_URL}/api/v1/resumes/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : await response.text();
            const message = typeof data === 'string' ? data : (data?.detail || 'Resume vault upload failed');
            throw new Error(message);
        }
    }, []);

    const safeArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.filter(Boolean).map(String);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
            } catch {
                return value.split(',').map(v => v.trim()).filter(Boolean);
            }
        }
        return [];
    };

    const safeObjectArray = <T extends object>(value: unknown): T[] => {
        if (Array.isArray(value)) return value.filter(Boolean) as T[];
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? (parsed.filter(Boolean) as T[]) : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const normalizeCandidate = useCallback((raw: any): Candidate => {
        const contact = raw.contact || {};
        const email = raw.email || contact.email || '';
        const phone = raw.phone || contact.phone || '';
        const location = raw.location || contact.location || '';

        const appliedDate = raw.applied_date || raw.appliedDate || raw.file_created || new Date().toISOString().split('T')[0];
        const idSource = [
            raw.id,
            email,
            raw.file_created,
            raw.filenames,
            raw.name,
        ].filter(Boolean).join('|');
        const derivedId = hashStringToInt(String(idSource));

        return {
            id: typeof raw.id === 'number' ? raw.id : derivedId,
            name: raw.name || 'Unknown Candidate',
            title: raw.title || 'N/A',
            avatar: raw.avatar || getInitials(raw.name || 'Unknown'),
            summary: raw.summary || '',
            contact: { email, phone, location },
            experience: safeObjectArray(raw.experience),
            education: safeObjectArray(raw.education),
            skills: safeArray(raw.skills),
            softSkills: safeArray(raw.soft_skills || raw.softSkills),
            languages: safeArray(raw.languages),
            certifications: safeArray(raw.certifications),
            links: safeObjectArray(raw.links),
            status: raw.status || 'Applied',
            appliedDate,
            salaryExpectation: raw.salary_expectation ?? raw.salaryExpectation ?? null,
            resumeContent: raw.resume_content || raw.resumeContent || '',
            originalResumeFile: null,
            applicationHistory: safeObjectArray(raw.application_history || raw.applicationHistory),
            tasks: safeObjectArray(raw.tasks),
            notes: safeObjectArray(raw.notes),
            category: raw.category || 'Uncategorized',
            tags: safeArray(raw.tags),
            source: raw.source || raw.filename || raw.original_filename || '',
            rejectionReason: raw.rejection_reason || raw.rejectionReason || null,
            communicationHistory: safeObjectArray(raw.communication_history || raw.communicationHistory),
            interviews: safeObjectArray(raw.interviews),
            totalExperienceYears: raw.total_experience_years || raw.totalExperienceYears,
        };
    }, []);

    const normalizeJobFromApi = useCallback((raw: any): JobDescription => {
        const jobId = raw.job_id || raw.jobId || raw.id;
        const projectId = raw.project_id || raw.projectId || 'unassigned';
        const rawSkills = raw.job_skills || raw.jobSkills || raw.requiredSkills || [];
        const requiredSkills = Array.isArray(rawSkills)
            ? rawSkills.map((s: any) => String(s).trim()).filter(Boolean)
            : String(rawSkills).split(',').map(s => s.trim()).filter(Boolean);
        const expMin = raw.job_experience_min ?? raw.jobExperienceMin;
        const expMax = raw.job_experience_max ?? raw.jobExperienceMax;
        const experience = (expMin !== undefined || expMax !== undefined)
            ? `${expMin ?? 0} - ${expMax ?? 0} Years`
            : (raw.experience || 'N/A');
        const statusRaw = (raw.status || raw.job_status || 'Active').toString().toLowerCase();
        const status = statusRaw === 'inactive' || statusRaw === 'paused'
            ? 'Paused'
            : statusRaw === 'onhold'
                ? 'Paused'
                : statusRaw === 'closed'
                    ? 'Closed'
                    : 'Active';
        const idSource = jobId || `${projectId}|${raw.job_title || raw.title || ''}|${raw.created_at || ''}`;

        return {
            id: hashStringToInt(String(idSource)),
            jobId: jobId ? String(jobId) : undefined,
            projectId: String(projectId),
            title: raw.job_title || raw.title || 'Untitled Job',
            companyName: raw.companyName || raw.company_name || '',
            companyLogo: raw.companyLogo || raw.company_logo || '',
            location: raw.job_location || raw.location || 'N/A',
            status,
            experience,
            type: raw.type || 'Full-time',
            salary: raw.salary || 'N/A',
            postedDate: raw.postedDate || raw.created_at || new Date().toISOString().split('T')[0],
            applicants: raw.applicants || 0,
            matches: raw.matches || 0,
            requiredSkills,
            description: raw.job_description || raw.description || '',
            highlights: raw.highlights || [],
            responsibilities: raw.responsibilities || [],
            qualifications: raw.qualifications || [],
            preferredQualifications: raw.preferredQualifications || [],
            education: raw.education || '',
            department: raw.department || '',
            roleCategory: raw.roleCategory || '',
            industry: raw.industry || '',
            ownerId: raw.ownerId || 0,
            numberOfPositions: raw.numberOfPositions || 1,
        };
    }, []);

    const parseExperienceRange = (experience?: string): { min: number; max: number } => {
        if (!experience) return { min: 0, max: 0 };
        const match = experience.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
        if (match) {
            return { min: parseFloat(match[1]), max: parseFloat(match[3]) };
        }
        const single = parseFloat(experience);
        if (!isNaN(single)) return { min: single, max: single };
        return { min: 0, max: 0 };
    };

    const extractCandidate = (data: any): any | null => {
        if (!data) return null;
        if (data.candidate) return data.candidate;
        if (data.updated_data) return data.updated_data;
        if (data.data) return data.data;
        if (data.result) return data.result;
        return data;
    };

    const extractCandidates = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.candidates)) return data.candidates;
        if (Array.isArray(data.data)) return data.data;
        return [];
    };

    const extractProjects = (data: any): Project[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.projects)) return data.projects;
        if (Array.isArray(data.data)) return data.data;
        return [];
    };

    const fetchCandidates = useCallback(async () => {
        try {
            const data = await apiRequest('/resume/list-candidates?limit=200&offset=0');
            const candidates = extractCandidates(data).map(normalizeCandidate);
            setAllCandidates(candidates);
        } catch (error) {
            console.error('Failed to load candidates:', error);
        }
    }, [apiRequest, normalizeCandidate]);

    const fetchProjects = useCallback(async () => {
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        try {
            const data = await apiRequest(`/project/list?uploaded_by=${encodeURIComponent(uploadedBy)}&limit=200&offset=0`);
            const projects = extractProjects(data);
            setAllProjects(projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }, [apiRequest, effectiveUser]);

    const fetchJobs = useCallback(async () => {
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        try {
            const data = await apiRequest(`/job/list?uploaded_by=${encodeURIComponent(uploadedBy)}&limit=200&offset=0`);
            const jobs = (Array.isArray(data) ? data : data?.data || []).map(normalizeJobFromApi);
            setAllJobDescriptions(jobs);
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    }, [apiRequest, effectiveUser, normalizeJobFromApi]);

    useEffect(() => {
        if (!effectiveUser?.email) return;
        if (initialDataFetchRef.current) return;
        initialDataFetchRef.current = true;
        fetchCandidates();
        fetchProjects();
        fetchJobs();
    }, [effectiveUser?.email, fetchCandidates, fetchProjects, fetchJobs]);

    // --- RESUME & CANDIDATE HANDLERS ---
    const handleUpdateCandidate = async (updatedCandidate: Candidate) => {
        const oldCandidate = allCandidates.find(c => c.id === updatedCandidate.id);
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        const email = updatedCandidate.contact?.email;

        if (email) {
            try {
                const payload = {
                    email,
                    name: updatedCandidate.name,
                    phone: updatedCandidate.contact.phone,
                    location: updatedCandidate.contact.location,
                    skills: updatedCandidate.skills,
                    experience: updatedCandidate.experience,
                };
                await apiRequest(`/resume/update?uploaded_by=${encodeURIComponent(uploadedBy)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } catch (error) {
                console.error('Failed to update candidate:', error);
                alert('Failed to update candidate.');
            }
        }

        setAllCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
        if (oldCandidate && oldCandidate.status !== updatedCandidate.status) {
            logAction(`Changed candidate status to ${updatedCandidate.status}`, { targetType: 'Candidate', targetName: updatedCandidate.name, targetId: updatedCandidate.id });
        }
    };

    const handleParseFileToCandidate = useCallback(async (file: File, source: string = 'Bulk Upload'): Promise<Candidate | null> => {
        try {
            const jobId = (selectedJob?.jobId || selectedJob?.id || selectedJobForDetail?.jobId || selectedJobForDetail?.id || selectedProject?.project_id || 'unassigned').toString();
            const uploadedBy = effectiveUser?.email || defaultUser.email;
            const formData = new FormData();
            formData.append('file', file);

            const data = await apiRequest(`/resume/process-resume-file?job_id=${encodeURIComponent(jobId)}&uploaded_by=${encodeURIComponent(uploadedBy)}`, {
                method: 'POST',
                body: formData,
            });

            const rawCandidate = extractCandidate(data);
            let candidateEmail = uploadedBy;
            if (rawCandidate) {
                const newCandidate = normalizeCandidate(rawCandidate);
                candidateEmail = newCandidate.contact?.email || uploadedBy;
                setAllCandidates(prev => [newCandidate, ...prev]);
                logAction(`Parsed candidate via ${source}`, { targetType: 'Candidate', targetName: newCandidate.name, targetId: newCandidate.id });
                try {
                    await uploadResumeToVault(file, candidateEmail, uploadedBy);
                } catch (vaultError) {
                    console.error('Failed to upload resume to vault:', vaultError);
                }
                return newCandidate;
            }

            try {
                await uploadResumeToVault(file, candidateEmail, uploadedBy);
            } catch (vaultError) {
                console.error('Failed to upload resume to vault:', vaultError);
            }

            await fetchCandidates();
            return null;

        } catch (error) {
            console.error("Failed to parse resume:", error);
            alert(`Failed to parse resume.`);
            return null;
        }
    }, [apiRequest, effectiveUser, fetchCandidates, logAction, normalizeCandidate, selectedJob, selectedJobForDetail, selectedProject, uploadResumeToVault]);

    const handleClearStagedResumes = () => {
        if (window.confirm("Are you sure you want to clear all resumes from the queue?")) {
            processingRef.current = false; 
            setStagedResumes([]);
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const handleProcessResumes = async () => {
        setIsProcessing(true);
        processingRef.current = true;
        const filesToProcess = [...stagedResumes];
        const totalFiles = filesToProcess.length;
        let successCount = 0;

        if (totalFiles === 1) {
            const file = filesToProcess[0];
            setProcessingStatus(`Processing ${file.name} (1/1)...`);
            try {
                const newCandidate = await handleParseFileToCandidate(file, 'Bulk Resume Upload');
                if (newCandidate) successCount++;
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
            }
        } else if (totalFiles > 1) {
            const jobId = (selectedJob?.jobId || selectedJob?.id || selectedJobForDetail?.jobId || selectedJobForDetail?.id || selectedProject?.project_id || 'unassigned').toString();
            const uploadedBy = effectiveUser?.email || defaultUser.email;
            const formData = new FormData();
            filesToProcess.forEach(file => formData.append('files', file));

            setProcessingStatus(`Processing ${totalFiles} resumes...`);
            try {
                const data = await apiRequest(`/resume/process-resume-files-batch?job_id=${encodeURIComponent(jobId)}&uploaded_by=${encodeURIComponent(uploadedBy)}`, {
                    method: 'POST',
                    body: formData,
                });
                const newCandidates = extractCandidates(data).map(normalizeCandidate);
                if (newCandidates.length > 0) {
                    setAllCandidates(prev => [...newCandidates, ...prev]);
                    successCount = newCandidates.length;
                    await Promise.all(filesToProcess.map(async (file, index) => {
                        const candidate = newCandidates[index];
                        const candidateEmail = candidate?.contact?.email || uploadedBy;
                        try {
                            await uploadResumeToVault(file, candidateEmail, uploadedBy);
                        } catch (vaultError) {
                            console.error(`Failed to upload ${file.name} to vault:`, vaultError);
                        }
                    }));
                } else {
                    await fetchCandidates();
                }
            } catch (error) {
                console.error('Failed to process batch resumes:', error);
            }
        }
        
        if (processingRef.current) {
            setProcessingStatus(`Processing complete. ${successCount}/${totalFiles} resumes added.`);
            logAction(`Bulk processed ${totalFiles} resumes, added ${successCount} new candidates`);
            setTimeout(() => {
                if (processingRef.current) {
                    setStagedResumes([]);
                    setIsProcessing(false);
                    setProcessingStatus('');
                    processingRef.current = false;
                }
            }, 3000);
        }
    };

    const handleDeleteCandidates = (ids: number[]) => {
        const candidatesToDelete = allCandidates.filter(c => ids.includes(c.id));
        const uploadedBy = effectiveUser?.email || defaultUser.email;
        const candidatesMissingEmail = candidatesToDelete.filter(c => !c.contact?.email || !c.contact.email.trim());

        if (candidatesMissingEmail.length > 0) {
            const names = candidatesMissingEmail.map(c => c.name).join(', ');
            alert(`Cannot delete ${candidatesMissingEmail.length} candidate(s) because email is missing: ${names}`);
        }

        Promise.all(candidatesToDelete.map(async (candidate) => {
            if (!candidate.contact?.email || !candidate.contact.email.trim()) {
                return { id: candidate.id, ok: false };
            }
            try {
                await apiRequest(`/resume/delete?uploaded_by=${encodeURIComponent(uploadedBy)}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: candidate.contact.email }),
                });
                return { id: candidate.id, ok: true };
            } catch (error) {
                alert(`Failed to delete ${candidate.name}: ${error instanceof Error ? error.message : String(error)}`);
                console.error('Failed to delete candidate:', error);
                return { id: candidate.id, ok: false };
            }
        })).then((results) => {
            const deletedIds = results.filter(r => r.ok).map(r => r.id);
            if (deletedIds.length === 0) return;
            setAllCandidates(prev => prev.filter(c => !deletedIds.includes(c.id)));
            candidatesToDelete.filter(c => deletedIds.includes(c.id))
                .forEach(c => logAction('Deleted candidate', { targetType: 'Candidate', targetName: c.name, targetId: c.id }));
            if (selectedCandidate && deletedIds.includes(selectedCandidate.id)) setSelectedCandidate(null);
        });
    };

    const handleEmailSelected = (ids: number[]) => {
        const targets = allCandidates.filter(c => ids.includes(c.id));
        setEmailTargets(targets);
        setCurrentPage('Communications');
    };
    
    const handleAnalyzeSelected = (ids: number[]) => {
        const targets = allCandidates.filter(c => ids.includes(c.id));
        setCandidatesForAnalysis(targets);
        setCurrentPage('Job Matching');
    };


    // --- FILTER & SEARCH LOGIC ---
    const filteredCandidates = useMemo(() => {
        let candidates = allCandidates;
        if (selectedJob) {
            candidates = allCandidates.map(c => {
                const candidateSkillsLower = new Set(c.skills.map(s => s.toLowerCase()));
                const matchCount = selectedJob.requiredSkills.filter(skill => candidateSkillsLower.has(skill.toLowerCase())).length;
                const score = selectedJob.requiredSkills.length > 0 ? (matchCount / selectedJob.requiredSkills.length) * 100 : 100;
                return { ...c, jobSpecificMatchScore: Math.round(score) };
            }).sort((a, b) => (b.jobSpecificMatchScore || 0) - (a.jobSpecificMatchScore || 0));
        }

        return candidates.filter(c => {
            const searchMatch = !searchTerm ||
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

            const statusMatch = mainFilters.status.length === 0 || mainFilters.status.includes(c.status);
            const skillsMatch = !mainFilters.skills || mainFilters.skills.toLowerCase().split(',').every(skill => c.skills.some(cs => cs.toLowerCase().includes(skill.trim())));
            const locationMatch = !mainFilters.location || c.contact.location.toLowerCase().includes(mainFilters.location.toLowerCase());
            const categoryMatch = !mainFilters.roleCategory || c.category.toLowerCase().includes(mainFilters.roleCategory.toLowerCase());
            const educationMatch = !mainFilters.education || (c.education && c.education.some(edu => 
                edu.degree.toLowerCase().includes(mainFilters.education.toLowerCase()) || 
                edu.institution.toLowerCase().includes(mainFilters.education.toLowerCase())
            ));
            const salaryMin = parseFloat(mainFilters.salaryMin);
            const salaryMax = parseFloat(mainFilters.salaryMax);
            const salaryMatch = (!mainFilters.salaryMin || (c.salaryExpectation && c.salaryExpectation >= salaryMin)) &&
                                (!mainFilters.salaryMax || (c.salaryExpectation && c.salaryExpectation <= salaryMax));
            const tagsMatch = !mainFilters.tags || mainFilters.tags.toLowerCase().split(',').every(tag => c.tags.some(ct => ct.toLowerCase().includes(tag.trim())));
            const experienceMatch = !mainFilters.experience || mainFilters.experience.toLowerCase().split(',').every(expTerm => 
                c.experience.some(exp => 
                    `${exp.title} ${exp.company} ${exp.description}`.toLowerCase().includes(expTerm.trim())
                )
            );
            
            return searchMatch && statusMatch && skillsMatch && locationMatch && categoryMatch && educationMatch && salaryMatch && tagsMatch && experienceMatch;
        });
    }, [allCandidates, selectedJob, searchTerm, mainFilters]);

    const globalSearchResults = useMemo(() => {
        if (!globalSearchTerm) return { candidates: [], jobs: [] };
        const lowerTerm = globalSearchTerm.toLowerCase();
        
        const candidates = allCandidates.filter(c =>
            c.name.toLowerCase().includes(lowerTerm) ||
            c.title.toLowerCase().includes(lowerTerm) ||
            c.skills.some(s => s.toLowerCase().includes(lowerTerm))
        ).slice(0, 5);
        
        const jobs = allJobDescriptions.filter(j =>
            j.title.toLowerCase().includes(lowerTerm) ||
            j.companyName.toLowerCase().includes(lowerTerm) ||
            j.requiredSkills.some(s => s.toLowerCase().includes(lowerTerm))
        ).slice(0, 5);
        
        return { candidates, jobs };
    }, [globalSearchTerm, allCandidates, allJobDescriptions]);
    
    const renderContent = () => {
        switch (currentPage) {
            case 'Login':
                return <LoginPage onLogin={(user) => { setCurrentUser(user); setCurrentPage('Dashboard'); }} error={null} />;
            case 'Dashboard':
                const pendingCount = invitations.filter(i => i.inviterId === effectiveUser.id && i.status === 'Pending').length;
                return <DashboardPage 
                    effectiveUser={effectiveUser} 
                    candidates={allCandidates} 
                    jobs={allJobDescriptions} 
                    projects={allProjects} 
                    onProjectSelect={(p) => { setSelectedProject(p); setCurrentPage('Job Matching'); }}
                    pendingInvitationCount={pendingCount}
                    onNavigate={handleNavigate}
                />;
            case 'Job Matching':
                if (selectedProject) {
                     return <ProjectDetailPage
                        project={selectedProject}
                        jobsForProject={allJobDescriptions.filter(j => j.projectId === selectedProject.project_id)}
                        onBack={() => setSelectedProject(null)}
                        onJobSelect={(j) => { setSelectedJobForDetail(j); }}
                        onJobEdit={(j) => { setJobToEdit(j); setJobEditorModalOpen(true); }}
                        onJobChangeJd={(j) => { setJobToEdit(j); setJobEditorModalOpen(true); }}
                        onJobCreateManually={() => { setJobToEdit(null); setJobEditorModalOpen(true); }}
                        candidates={allCandidates}
                        onCandidateSelect={(c) => { setSelectedCandidate(c); setCurrentPage('Candidates'); }}
                        onUploadJds={() => setJdUploadModalOpen(true)}
                        stagedJds={stagedJds}
                        isProcessingJds={isProcessingJds}
                        processingJdsStatus={processingJdsStatus}
                        onProcessJds={handleProcessJds}
                        onClearJds={() => setStagedJds([])}
                        onRemoveJd={(file: File) => setStagedJds(prev => prev.filter(f => f !== file))}
                        onDeleteJobs={handleDeleteJobs}
                        onDeleteCandidates={handleDeleteCandidates}
                        onEmailSelected={handleEmailSelected}
                        candidatesForAnalysis={candidatesForAnalysis}
                        onClearCandidatesForAnalysis={() => setCandidatesForAnalysis([])}
                        onAnalyzeJobFit={handleAnalyzeJobFit}
                        onOpenAIGenerateModal={() => setAIGenerateModalOpen(true)}
                    />;
                }
                if (selectedJobForDetail) {
                    return <JobDetailPage 
                        job={selectedJobForDetail} 
                        onBack={() => setSelectedJobForDetail(null)}
                        onMatch={(j) => { setSelectedJob(j); setCurrentPage('Candidates'); }}
                        onEdit={(j) => { setJobToEdit(j); setJobEditorModalOpen(true); }}
                    />;
                }
                 return <ProjectsPage 
                    projects={allProjects} 
                    jobs={allJobDescriptions} 
                    onProjectSelect={(p) => setSelectedProject(p)} 
                    onProjectCreate={() => { setProjectToEdit(null); setProjectEditorModalOpen(true); }}
                    onEditProject={(p) => { setProjectToEdit(p); setProjectEditorModalOpen(true); }}
                    effectiveUser={effectiveUser}
                />;
            case 'Candidates':
                if (selectedCandidate) {
                    if (selectedJob) {
                        return <CandidateMatchDetailPage candidate={selectedCandidate} job={selectedJob} onBack={() => setSelectedCandidate(null)} onUpdateCandidate={handleUpdateCandidate} />;
                    }
                    return <CandidateDetailPage candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} onUpdateCandidate={handleUpdateCandidate} onScheduleMeeting={handleOpenMeetingModal} />;
                }
                return <CandidatesPage
                    candidates={filteredCandidates}
                    onCandidateSelect={setSelectedCandidate}
                    selectedJob={selectedJob}
                    onBack={() => setSelectedJob(null)}
                    filters={mainFilters}
                    onFilterChange={setMainFilters}
                    onClearFilters={() => setMainFilters(defaultFilters)}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onUpload={() => setUploadModalOpen(true)}
                    stagedResumes={stagedResumes}
                    isProcessing={isProcessing}
                    processingStatus={processingStatus}
                    onProcess={handleProcessResumes}
                    onClear={handleClearStagedResumes}
                    onRemoveResume={(fileToRemove: File) => setStagedResumes(prev => prev.filter(f => f !== fileToRemove))}
                    onDeleteCandidates={handleDeleteCandidates}
                    onEmailSelected={handleEmailSelected}
                    onAnalyzeSelected={handleAnalyzeSelected}
                 />;
            case 'Communications':
                return <CommunicationsPage 
                    emailTargets={emailTargets} 
                    onClearTargets={() => setEmailTargets([])}
                    onUpdateTargets={setEmailTargets}
                    onSendEmail={(ids, subject) => logAction(`Sent email with subject "${subject}" to ${ids.length} candidate(s)`)}
                    initialDraft={initialEmailDraft}
                    onClearDraft={() => setInitialEmailDraft(null)}
                    onScheduleMeeting={(c) => c && handleOpenMeetingModal(c)}
                />;
            case 'Reports':
                return <ReportsPage candidates={allCandidates} jobs={allJobDescriptions} effectiveUser={effectiveUser} allUsers={users} />;
            case 'Calendar':
                 const allInterviews = allCandidates.flatMap(c => c.interviews || []).filter(i => i !== undefined);
                 return <CalendarPage candidates={allCandidates} interviews={allInterviews} onCandidateSelect={(c) => {setSelectedCandidate(c); setCurrentPage('Candidates');}} />;
            case 'Manage Users':
                 return <ManageUsersPage 
                    users={users}
                    currentUser={currentUser}
                    onAddUser={() => { setUserToEdit(null); setUserEditorModalOpen(true); }}
                    onEditUser={(u) => { setUserToEdit(u); setUserEditorModalOpen(true); }}
                    onDeleteUser={handleDeleteUser}
                    onImpersonateUser={handleImpersonate}
                    invitations={invitations}
                    onUpdateInvitationStatus={handleUpdateInvitationStatus}
                />;
            case 'History':
                 return <HistoryPage 
                    historyLog={historyLog} 
                    effectiveUser={effectiveUser} 
                    onNavigateTo={handleNavigateTo} 
                    currentUser={currentUser}
                    impersonatedUser={impersonatedUser}
                    allUsers={users}
                />;
            case 'Settings':
                return <SettingsPage 
                    effectiveUser={effectiveUser} 
                    onUpdateUser={handleSaveUser}
                    onResetAllData={handleResetAllData}
                    companyProfile={companyProfile}
                    onUpdateCompanyProfile={handleUpdateCompanyProfile}
                    allUsers={users}
                    onUpdateAllUsers={handleUpdateAllUsers}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    invitations={invitations}
                    onInviteUser={() => setInviteModalOpen(true)}
                    onAddUser={() => { setUserToEdit(null); setUserEditorModalOpen(true); }}
                />;
            default:
                return <div>Page not found</div>;
        }
    };
    
    if (!effectiveUser) return <div className="loading-indicator">Initializing user session...</div>;

    const isPageAccessible = (pageName: string): boolean => {
        const permissionMap: { [key: string]: UserPermission } = {
            'Dashboard': 'Dashboard',
            'Job Matching': 'Job Matching',
            'Candidates': 'All Candidates',
            'Calendar': 'Calendar',
            'Communications': 'Communications',
            'Reports': 'Reports',
            'Settings': 'Settings',
            'History': 'History',
            'Manage Users': 'Settings'
        };
        const requiredPermission = permissionMap[pageName];
        if (!requiredPermission) return true;
        if (effectiveUser.role.includes('Admin')) return true;
        return effectiveUser.permissions.includes(requiredPermission);
    };

    const renderAccessDenied = () => (
        <div className="page-content">
            <div className="empty-state large">
                <span className="material-symbols-outlined" style={{fontSize: '64px', color: '#EF4444'}}>lock</span>
                <h3>Access Denied</h3>
                <p>You do not have permission to view this page.</p>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} effectiveUser={effectiveUser} onLogout={handleLogout} />
            <main className="main-content">
                <Header 
                    user={effectiveUser}
                    impersonatedUser={impersonatedUser} 
                    onStopImpersonation={handleStopImpersonation} 
                    globalSearchTerm={globalSearchTerm}
                    onSearchChange={setGlobalSearchTerm}
                    candidates={globalSearchResults.candidates}
                    jobs={globalSearchResults.jobs}
                    onCandidateSelect={(c) => { setSelectedCandidate(c); setCurrentPage('Candidates'); setGlobalSearchTerm(''); }}
                    onJobSelect={(j) => { setSelectedJobForDetail(j); setCurrentPage('Job Matching'); setGlobalSearchTerm(''); }}
                    onUpdateCurrentUser={handleUpdateCurrentUser}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    notifications={notifications.filter(n => n.userId === effectiveUser.id)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onNotificationNavigate={handleNotificationNavigate}
                />
                {isPageAccessible(currentPage) ? renderContent() : renderAccessDenied()}
            </main>
            <Chatbot jobs={allJobDescriptions} candidates={allCandidates} currentUser={effectiveUser} />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
            <ResumeUploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedResumes(prev => [...prev, ...Array.from(files)])} />
            <JDUploadModal isOpen={isJdUploadModalOpen} onClose={() => setJdUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedJds(prev => [...prev, ...Array.from(files)])} />
            <JobEditorModal isOpen={isJobEditorModalOpen} onClose={() => setJobEditorModalOpen(false)} onSave={(jobData) => handleSaveJob(jobData, selectedProject!.project_id)} jobToEdit={jobToEdit} />
            <MeetingSchedulerModal isOpen={isMeetingModalOpen} onClose={() => setMeetingModalOpen(false)} onSchedule={handleScheduleMeeting} candidate={candidateForMeeting} />
            <UserEditorModal isOpen={isUserEditorModalOpen} onClose={() => setUserEditorModalOpen(false)} onSave={handleSaveUser} userToEdit={userToEdit} />
            <ProjectEditorModal isOpen={isProjectEditorModalOpen} onClose={() => setProjectEditorModalOpen(false)} onSave={handleSaveProject} projectToEdit={projectToEdit} />
            <AIGenerateJDModal isOpen={isAIGenerateModalOpen} onClose={() => setAIGenerateModalOpen(false)} onGenerate={(prompt) => handleGenerateJdWithAI(prompt, selectedProject!.project_id)} isGenerating={isGeneratingJD} />
            <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onInvite={handleInviteUser} />
        </div>
    );
};

export default App;
