
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Tool } from "@google/genai";

// Import types
import { Candidate, JobDescription, CandidateWithScore, Interview, User, HistoryEntry, Project, MatchResult, CompanyProfile, Invitation, InvitationStatus, UserPermission, Notification, ProjectTeamMember } from './types/types';

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
import AddTeamMemberModal from './modals/AddTeamMemberModal';


// Import utils
import { getInitials } from './utils/helpers';
import { getTextFromFile } from './utils/fileUtils';
import { calculateTotalExperience, parseJobRequirementsFromText } from './utils/analysisUtils';

const defaultFilters = { status: [] as Candidate['status'][], skills: '', location: '', roleCategory: '', education: '', salaryMin: '', salaryMax: '', tags: '', experience: '' };
const allPermissions: UserPermission[] = ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'];

const App = () => {
    // --- MAIN DATA STATE ---
    const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => JSON.parse(localStorage.getItem('accionTalent_candidates') || '[]'));
    const [allJobDescriptions, setAllJobDescriptions] = useState<JobDescription[]>(() => JSON.parse(localStorage.getItem('accionTalent_jobs') || '[]'));
    const [allProjects, setAllProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('accionTalent_projects') || '[]'));
    const [users, setUsers] = useState<User[]>(() => {
        const savedUsers = localStorage.getItem('accionTalent_users');
        if (savedUsers) return JSON.parse(savedUsers);
        const initialAdmin: User = { id: 1, name: 'Sasmita Rout', email: 'sasmitarout.official@gmail.com', password: 'Suchi@2001', role: 'Main Admin', avatar: getInitials('Sasmita Rout'), permissions: ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'] };
        return [initialAdmin];
    });
    const [historyLog, setHistoryLog] = useState<HistoryEntry[]>(() => JSON.parse(localStorage.getItem('accionTalent_history') || '[]'));
    const [invitations, setInvitations] = useState<Invitation[]>(() => JSON.parse(localStorage.getItem('accionTalent_invitations') || '[]'));
    const [notifications, setNotifications] = useState<Notification[]>(() => JSON.parse(localStorage.getItem('accionTalent_notifications') || '[]'));
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
        const saved = localStorage.getItem('accionTalent_companyProfile');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migration: If name is still AccionTalent, update to AccionLabs
            if (parsed.name === 'AccionTalent') {
                return {
                    ...parsed,
                    name: 'AccionLabs',
                    logo: 'https://mma.prnewswire.com/media/1196052/Accion_Labs_Logo.jpg',
                    industry: 'Technology & Services',
                    description: 'AccionLabs is an intelligent Applicant Tracking System designed to streamline recruitment and unlock human potential. We help companies find the perfect fit, faster.',
                    website: 'https://www.accionlabs.com',
                    email: 'info@accionlabs.com',
                    linkedin: 'https://www.linkedin.com/company/accion-labs/',
                    address: '1225 Washington Pike #401, Bridgeville, PA 15017, United States'
                };
            }
            return parsed;
        }
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
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = sessionStorage.getItem('accionTalent_currentUser');
        if (saved) return JSON.parse(saved);
        const defaultAdmin = users[0];
        if (defaultAdmin) {
            sessionStorage.setItem('accionTalent_currentUser', JSON.stringify(defaultAdmin));
            return defaultAdmin;
        }
        return null;
    });
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
    const [isAddTeamMemberModalOpen, setAddTeamMemberModalOpen] = useState(false);
    const [projectForTeamAdd, setProjectForTeamAdd] = useState<Project | null>(null);
    
    // --- DERIVED STATE ---
    const effectiveUser = impersonatedUser || currentUser;

    // --- DATA PERSISTENCE ---
    useEffect(() => { localStorage.setItem('accionTalent_candidates', JSON.stringify(allCandidates)); }, [allCandidates]);
    useEffect(() => { localStorage.setItem('accionTalent_jobs', JSON.stringify(allJobDescriptions)); }, [allJobDescriptions]);
    useEffect(() => { localStorage.setItem('accionTalent_projects', JSON.stringify(allProjects)); }, [allProjects]);
    useEffect(() => { localStorage.setItem('accionTalent_users', JSON.stringify(users)); }, [users]);
    useEffect(() => { localStorage.setItem('accionTalent_history', JSON.stringify(historyLog)); }, [historyLog]);
    useEffect(() => { localStorage.setItem('accionTalent_invitations', JSON.stringify(invitations)); }, [invitations]);
    useEffect(() => { localStorage.setItem('accionTalent_notifications', JSON.stringify(notifications)); }, [notifications]);
    useEffect(() => { localStorage.setItem('accionTalent_companyProfile', JSON.stringify(companyProfile)); }, [companyProfile]);
    
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
        sessionStorage.removeItem('accionTalent_currentUser');
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
            const project = allProjects.find(p => p.id === id);
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
                sessionStorage.setItem('accionTalent_currentUser', JSON.stringify(updatedCurrentUser));
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
                if (invitation.type === 'ProjectTeam' && invitation.projectId) {
                    setAllProjects(prevProjects => prevProjects.map(p => {
                        if (p.id === invitation.projectId) {
                            const updatedTeam = [...p.team, { userId: newUser.id, role: 'Member' as const }];
                            return { ...p, team: updatedTeam };
                        }
                        return p;
                    }));
                     addNotification(newUser.id, `You've been added to project: ${invitation.projectName}`, { page: 'Dashboard' });
                }
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
        sessionStorage.setItem('accionTalent_currentUser', JSON.stringify(updatedUser));
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

    const handleAddTeamMemberToProject = (email: string) => {
        if (!projectForTeamAdd || !effectiveUser) return;

        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            setAllProjects(prevProjects => prevProjects.map(p => {
                if (p.id === projectForTeamAdd.id) {
                    if (p.team.some(member => member.userId === existingUser.id)) {
                        alert(`${existingUser.name} is already a member of this project.`);
                        return p;
                    }
                    const updatedTeam: ProjectTeamMember[] = [...p.team, { userId: existingUser.id, role: 'Member' }];
                    logAction(`Added ${existingUser.name} to project`, { targetType: 'Project', targetName: p.name, targetId: p.id });
                    addNotification(existingUser.id, `You've been added to project "${p.name}" by ${effectiveUser.name}.`, { page: 'Dashboard' });
                    addNotification(p.ownerId, `${existingUser.name} was added to your project "${p.name}".`, { page: 'Job Matching' });
                    return { ...p, team: updatedTeam };
                }
                return p;
            }));
        } else {
            const newInvitation: Invitation = {
                id: Date.now(),
                inviterId: effectiveUser.id,
                inviterName: effectiveUser.name,
                email,
                status: 'Pending',
                createdAt: new Date().toISOString(),
                type: 'ProjectTeam',
                projectId: projectForTeamAdd.id,
                projectName: projectForTeamAdd.name,
            };
            setInvitations(prev => [newInvitation, ...prev]);
            logAction(`Requested to add new user ${email} to project`, { targetType: 'Project', targetName: projectForTeamAdd.name, targetId: projectForTeamAdd.id });
            
            const admins = users.filter(u => u.role.includes('Admin'));
            admins.forEach(admin => {
                addNotification(admin.id, `${effectiveUser.name} requested to add a new user (${email}) to project "${projectForTeamAdd.name}".`, { page: 'Manage Users' });
            });
        }
        setAddTeamMemberModalOpen(false);
        setProjectForTeamAdd(null);
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
    const handleSaveProject = (projectData: Partial<Project>) => {
        const now = new Date().toISOString();
        if (projectData.id) {
            const updatedProject = { ...projectData, updatedAt: now } as Project;
            setAllProjects(prev => prev.map(p => p.id === projectData.id ? { ...p, ...updatedProject } : p));
            logAction('Updated project', { targetType: 'Project', targetName: projectData.name, targetId: projectData.id });
        } else {
            const newProject: Project = { 
                id: Date.now(), 
                ownerId: effectiveUser.id,
                priority: 'Medium',
                status: 'Active', 
                createdAt: now, 
                updatedAt: now,
                team: [{ userId: effectiveUser.id, role: 'Owner' }],
                ...projectData 
            } as Project;
            setAllProjects(prev => [newProject, ...prev]);
            logAction('Created project', { targetType: 'Project', targetName: newProject.name, targetId: newProject.id });

            // Automatically prompt to create a JD for the new project
            setSelectedProject(newProject);
            setJobToEdit(null);
            setJobEditorModalOpen(true);
        }
    };

    const handleDeleteProject = (projectId: number) => {
        const projectToDelete = allProjects.find(p => p.id === projectId);
        if (!projectToDelete) return;

        if (window.confirm(`Are you sure you want to delete the project "${projectToDelete.name}"? This will also delete all associated jobs.`)) {
            setAllProjects(prev => prev.filter(p => p.id !== projectId));
            setAllJobDescriptions(prev => prev.filter(j => j.projectId !== projectId));
            logAction('Deleted project', { targetType: 'Project', targetName: projectToDelete.name, targetId: projectId });
            if (selectedProject?.id === projectId) {
                setSelectedProject(null);
            }
        }
    };
    
    const handleSaveJob = (jobData: Partial<JobDescription>, projectId: number) => {
        if (jobData.id) {
            setAllJobDescriptions(prev => prev.map(j => j.id === jobData.id ? { ...j, ...jobData } as JobDescription : j));
            logAction('Updated job', { targetType: 'Job', targetName: jobData.title, targetId: jobData.id });
        } else {
            const newJob = { 
                id: Date.now(), 
                projectId, 
                ownerId: effectiveUser.id, 
                status: 'Active' as const, 
                postedDate: new Date().toISOString().split('T')[0], 
                title: 'Untitled Job',
                companyName: '',
                companyLogo: '',
                location: 'N/A',
                experience: 'N/A',
                type: 'Full-time',
                salary: 'N/A',
                applicants: 0,
                matches: 0,
                description: 'No description provided.',
                education: 'N/A',
                department: 'N/A',
                roleCategory: 'N/A',
                industry: 'N/A',
                numberOfPositions: 1,
                requiredSkills: [],
                highlights: [],
                responsibilities: [],
                qualifications: [],
                preferredQualifications: [],
                ...jobData 
            } as JobDescription;
            setAllJobDescriptions(prev => [newJob, ...prev]);
            logAction('Created job', { targetType: 'Job', targetName: newJob.title, targetId: newJob.id });
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
        
        for (let i = 0; i < totalFiles; i++) {
            const file = stagedJds[i];
            setProcessingJdsStatus(`Processing ${file.name} (${i + 1}/${totalFiles})...`);
            
            try {
                // Fix: Re-instantiate AI right before the call.
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const jdSchema = {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        companyName: { type: Type.STRING },
                        location: { type: Type.STRING },
                        experience: { type: Type.STRING },
                        type: { type: Type.STRING },
                        salary: { type: Type.STRING },
                        requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING },
                        highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                        responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                        qualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
                        preferredQualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
                        education: { type: Type.STRING },
                        department: { type: Type.STRING },
                        roleCategory: { type: Type.STRING },
                        industry: { type: Type.STRING },
                        numberOfPositions: { type: Type.INTEGER }
                    },
                };
                
                const jdText = await getTextFromFile(file, ai);
                const prompt = `You are an expert JD parser. Extract structured information from the following job description text. Fill out all fields of the JSON schema as completely as possible. Preserve formatting like bullet points using newline characters (\\n).\n\nJD Text:\n\n${jdText}`;
    
                // Fix: Updated model name to 'gemini-3-flash-preview' for basic parsing tasks.
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: 'application/json', responseSchema: jdSchema }
                });
    
                let jsonString = response.text.trim();
                if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
                const parsedData = JSON.parse(jsonString);
    
                const newJobData: Partial<JobDescription> = {
                    ...parsedData,
                    jdContent: jdText,
                    companyName: parsedData.companyName || selectedProject.clientOrDepartment,
                };
    
                handleSaveJob(newJobData, selectedProject.id);
                successCount++;
    
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
            }
        }
        
        setProcessingJdsStatus(`Processing complete. ${successCount}/${totalFiles} JDs added successfully.`);
        setTimeout(() => {
            setIsProcessingJds(false);
            setStagedJds([]);
        }, 3000);
    };

    const handleDeleteJobs = (ids: number[]) => {
        const jobsToDelete = allJobDescriptions.filter(j => ids.includes(j.id));
        if (window.confirm(`Are you sure you want to delete ${jobsToDelete.length} selected jobs? This action cannot be undone.`)) {
            setAllJobDescriptions(prev => prev.filter(j => !ids.includes(j.id)));
            jobsToDelete.forEach(j => logAction('Deleted job', { targetType: 'Job', targetName: j.title, targetId: j.id }));
            if (selectedJob && ids.includes(selectedJob.id)) setSelectedJob(null);
            if (selectedJobForDetail && ids.includes(selectedJobForDetail.id)) setSelectedJobForDetail(null);
        }
    };

    const handleJobStatusUpdate = (jobId: number, status: JobDescription['status']) => {
        const jobToUpdate = allJobDescriptions.find(j => j.id === jobId);
        setAllJobDescriptions(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
        if(jobToUpdate) logAction(`Updated job status to ${status}`, { targetType: 'Job', targetName: jobToUpdate.title, targetId: jobId });
    };

    const handleGenerateJdWithAI = async (prompt: string, projectId: number) => {
        if (!prompt || !projectId) return;

        setIsGeneratingJD(true);
        setAIGenerateModalOpen(false);

        try {
            // Fix: Re-instantiate AI right before the call.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const jdSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    companyName: { type: Type.STRING },
                    location: { type: Type.STRING },
                    experience: { type: Type.STRING },
                    type: { type: Type.STRING },
                    salary: { type: Type.STRING },
                    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                    highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    qualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
                    preferredQualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
                    education: { type: Type.STRING },
                    department: { type: Type.STRING },
                    roleCategory: { type: Type.STRING },
                    industry: { type: Type.STRING },
                    numberOfPositions: { type: Type.INTEGER }
                },
            };

            const fullPrompt = `You are an expert recruitment consultant. Generate a complete and professional job description based on this user request: "${prompt}". Fill out all fields of the JSON schema as completely as possible.`;

            // Fix: Updated model name to 'gemini-3-flash-preview' for text generation tasks.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: fullPrompt }] },
                config: { responseMimeType: 'application/json', responseSchema: jdSchema }
            });

            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);

            const newJobData: Partial<JobDescription> = {
                projectId,
                title: parsedData.title || 'Untitled Job',
                companyName: parsedData.companyName || '',
                companyLogo: '',
                location: parsedData.location || '',
                status: 'Active',
                experience: parsedData.experience || '',
                type: parsedData.type || 'Full-time',
                salary: parsedData.salary || 'Competitive',
                requiredSkills: parsedData.requiredSkills || [],
                description: parsedData.description || '',
                highlights: parsedData.highlights || [],
                responsibilities: parsedData.responsibilities || [],
                qualifications: parsedData.qualifications || [],
                preferredQualifications: parsedData.preferredQualifications || [],
                education: parsedData.education || '',
                department: parsedData.department || '',
                roleCategory: parsedData.roleCategory || '',
                industry: parsedData.industry || '',
                ownerId: effectiveUser.id,
                numberOfPositions: parsedData.numberOfPositions || 1,
            };

            setJobToEdit(newJobData as JobDescription);
            setJobEditorModalOpen(true);

        } catch (error) {
            console.error("AI JD generation failed:", error);
            alert(`Sorry, the AI failed to generate the job description.`);
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
                // Fix: Re-instantiate AI right before the call.
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    }, [allCandidates, allJobDescriptions]);

    const handleAnalyzeFit = useCallback(async (candidate: Candidate, jd: Partial<JobDescription>): Promise<MatchResult | null> => {
        try {
            // Fix: Re-instantiate AI right before the call.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    }, []);
    
    // --- RESUME & CANDIDATE HANDLERS ---
    const handleUpdateCandidate = (updatedCandidate: Candidate) => {
        const oldCandidate = allCandidates.find(c => c.id === updatedCandidate.id);
        setAllCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
        if (oldCandidate && oldCandidate.status !== updatedCandidate.status) {
            logAction(`Changed candidate status to ${updatedCandidate.status}`, { targetType: 'Candidate', targetName: updatedCandidate.name, targetId: updatedCandidate.id });
        }
    };

    const handleParseFileToCandidate = useCallback(async (file: File, source: string = 'Bulk Upload'): Promise<Candidate | null> => {
        try {
            // Fix: Re-instantiate AI right before the call.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resumeSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING }, title: { type: Type.STRING }, summary: { type: Type.STRING },
                    totalExperienceYears: { type: Type.NUMBER },
                    contact: { type: Type.OBJECT, properties: { email: { type: Type.STRING }, phone: { type: Type.STRING }, location: { type: Type.STRING } } },
                    experience: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, company: { type: Type.STRING }, duration: { type: Type.STRING }, description: { type: Type.STRING } } } },
                    education: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { degree: { type: Type.STRING }, institution: { type: Type.STRING }, duration: { type: Type.STRING } } } },
                    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                    certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
                    links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, url: { type: Type.STRING } } } },
                    category: { type: Type.STRING },
                },
                required: ['name', 'contact', 'skills']
            };
    
            const resumeText = await getTextFromFile(file, ai);
            const prompt = `You are an expert resume parser. Extract structured information from: \n\n${resumeText}`;

            // Fix: Updated model name to 'gemini-3-flash-preview' for extraction tasks.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: 'application/json', responseSchema: resumeSchema }
            });

            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);

            let totalExperience = parsedData.totalExperienceYears || calculateTotalExperience(parsedData.experience || []);
            
            const newCandidate: Candidate = {
                id: Date.now(),
                name: parsedData.name || 'Unknown Candidate',
                title: parsedData.title || 'N/A',
                avatar: getInitials(parsedData.name || 'Unknown'),
                summary: parsedData.summary || '',
                totalExperienceYears: totalExperience,
                contact: parsedData.contact || { email: '', phone: '', location: '' },
                experience: parsedData.experience || [],
                education: parsedData.education || [],
                skills: parsedData.skills || [],
                softSkills: parsedData.softSkills || [],
                languages: parsedData.languages || [],
                certifications: parsedData.certifications || [],
                links: parsedData.links || [],
                status: 'Applied',
                appliedDate: new Date().toISOString().split('T')[0],
                salaryExpectation: null,
                resumeContent: resumeText,
                originalResumeFile: file,
                applicationHistory: [{ stage: 'Applied', date: new Date().toISOString(), notes: `Parsed from ${source}: ${file.name}` }],
                tasks: [],
                notes: [],
                category: parsedData.category || 'Uncategorized',
                tags: ['ai-parsed'],
                source: file.name,
                rejectionReason: null,
                communicationHistory: [],
            };
            
            setAllCandidates(prev => [newCandidate, ...prev]);
            logAction(`Parsed candidate via ${source}`, { targetType: 'Candidate', targetName: newCandidate.name, targetId: newCandidate.id });
            return newCandidate;

        } catch (error) {
            console.error("Failed to parse resume:", error);
            alert(`Failed to parse resume.`);
            return null;
        }
    }, [logAction]);

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

        for (let i = 0; i < totalFiles; i++) {
            if (!processingRef.current) return;
            const file = filesToProcess[i];
            setProcessingStatus(`Processing ${file.name} (${i + 1}/${totalFiles})...`);
            try {
                const newCandidate = await handleParseFileToCandidate(file, 'Bulk Resume Upload');
                if (newCandidate) successCount++;
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
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
        setAllCandidates(prev => prev.filter(c => !ids.includes(c.id)));
        candidatesToDelete.forEach(c => logAction('Deleted candidate', { targetType: 'Candidate', targetName: c.name, targetId: c.id }));
        if (selectedCandidate && ids.includes(selectedCandidate.id)) setSelectedCandidate(null);
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
        if (!effectiveUser) return <div className="loading-indicator">Loading user...</div>;

        switch (currentPage) {
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
                        jobsForProject={allJobDescriptions.filter(j => j.projectId === selectedProject.id)} 
                        onBack={() => setSelectedProject(null)} 
                        onJobSelect={(j) => { setSelectedJobForDetail(j); }}
                        onJobCreateManually={() => { setJobToEdit(null); setJobEditorModalOpen(true); }}
                        onJobStatusUpdate={handleJobStatusUpdate}
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
                        isAnalyzingJobId={isAnalyzingJobId}
                        onOpenAIGenerateModal={() => setAIGenerateModalOpen(true)}
                        onAddTeamMember={(project) => { setProjectForTeamAdd(project); setAddTeamMemberModalOpen(true); }}
                        allUsers={users}
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
                    onDeleteProject={handleDeleteProject}
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
            <ResumeUploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedResumes(prev => [...prev, ...Array.from(files)])} />
            <JDUploadModal isOpen={isJdUploadModalOpen} onClose={() => setJdUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedJds(prev => [...prev, ...Array.from(files)])} />
            <JobEditorModal isOpen={isJobEditorModalOpen} onClose={() => setJobEditorModalOpen(false)} onSave={(jobData) => handleSaveJob(jobData, selectedProject!.id)} jobToEdit={jobToEdit} />
            <MeetingSchedulerModal isOpen={isMeetingModalOpen} onClose={() => setMeetingModalOpen(false)} onSchedule={handleScheduleMeeting} candidate={candidateForMeeting} />
            <UserEditorModal isOpen={isUserEditorModalOpen} onClose={() => setUserEditorModalOpen(false)} onSave={handleSaveUser} userToEdit={userToEdit} />
            <ProjectEditorModal isOpen={isProjectEditorModalOpen} onClose={() => setProjectEditorModalOpen(false)} onSave={handleSaveProject} projectToEdit={projectToEdit} />
            <AIGenerateJDModal isOpen={isAIGenerateModalOpen} onClose={() => setAIGenerateModalOpen(false)} onGenerate={(prompt) => handleGenerateJdWithAI(prompt, selectedProject!.id)} isGenerating={isGeneratingJD} />
            <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onInvite={handleInviteUser} />
            <AddTeamMemberModal isOpen={isAddTeamMemberModalOpen} onClose={() => setAddTeamMemberModalOpen(false)} onAdd={handleAddTeamMemberToProject} />
        </div>
    );
};

export default App;