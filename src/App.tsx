import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Tool } from "@google/genai";

// Import types
import { Candidate, JobDescription, CandidateWithScore, Interview, User, HistoryEntry, Project, MatchResult, CompanyProfile, Invitation, InvitationStatus, UserPermission, Notification, ProjectTeamMember, UserRole } from './types/types';

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
import HistoryPage from './pages/HistoryPage';

import CandidateFitAnalysisPage from './pages/CandidateFitAnalysisPage';


// Import components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Chatbot from './components/ai/Chatbot';

// Import modals
import ResumeUploadModal from './modals/ResumeUploadModal';
import JDUploadModal from './modals/JDUploadModal';
import JobEditorModal from './modals/JobEditorModal';
import MeetingSchedulerModal from './modals/MeetingSchedulerModal';
import ProjectEditorModal from './modals/ProjectEditorModal';
import AIGenerateJDModal from './modals/AIGenerateJDModal';
import InviteMemberModal from './modals/InviteMemberModal';
import AddTeamMemberModal from './modals/AddTeamMemberModal';
import { ToastConfirm } from './components/common/ToastConfirm';


// Import utils
import { getInitials } from './utils/helpers';
import { getTextFromFile } from './utils/fileUtils';
import { calculateTotalExperience, parseJobRequirementsFromText } from './utils/analysisUtils';
import authService from './services/authService';
import { atsApiService } from './services/atsApiService';

const defaultFilters = { status: [] as Candidate['status'][], skills: '', location: '', roleCategory: '', education: '', salaryMin: '', salaryMax: '', tags: '', experience: '' };
const allPermissions: UserPermission[] = ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'];

const App = () => {
    // --- MAIN DATA STATE ---
    const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => JSON.parse(localStorage.getItem('accionTalent_candidates') || '[]'));
    const [allJobDescriptions, setAllJobDescriptions] = useState<JobDescription[]>(() => JSON.parse(localStorage.getItem('accionTalent_jobs') || '[]'));
    const [allProjects, setAllProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('accionTalent_projects') || '[]'));
    const [users, setUsers] = useState<User[]>(() => {
        // Load from localStorage as fallback, but will be updated by SSO API call
        const saved = localStorage.getItem('accionTalent_users');
        return saved ? JSON.parse(saved) : [];
    });

    const [historyLog, setHistoryLog] = useState<HistoryEntry[]>(() => JSON.parse(localStorage.getItem('accionTalent_history') || '[]'));
    const [invitations, setInvitations] = useState<Invitation[]>(() => JSON.parse(localStorage.getItem('accionTalent_invitations') || '[]'));
    const [notifications, setNotifications] = useState<Notification[]>(() => JSON.parse(localStorage.getItem('accionTalent_notifications') || '[]'));
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
        const saved = localStorage.getItem('accionTalent_companyProfile');
        if (saved) return JSON.parse(saved);
        return {
            name: 'AccionTalent',
            logo: '',
            industry: 'Technology & Services',
            description: 'AccionTalent is an intelligent Applicant Tracking System designed to streamline recruitment and unlock human potential. We help companies find the perfect fit, faster.',
            website: 'https://www.accionlabs.com',
            email: 'info@accionlabs.com',
            linkedin: 'https://www.linkedin.com/company/accion-labs/',
            address: '1225 Washington Pike #401, Bridgeville, PA 15017, United States'
        };
    });
    
    // --- AUTH STATE ---
   const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Will be set by SSO API call on mount
    const savedUsers = localStorage.getItem('accionTalent_users');
    if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (parsed.length > 0) return parsed[0];
    }
    return null;
});

    // Loading state for SSO initialization
    const [isInitializingSSO, setIsInitializingSSO] = useState(true);

    
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
    const [isProjectEditorModalOpen, setProjectEditorModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAnalyzingJobId, setIsAnalyzingJobId] = useState<number | null>(null);
    const [isAIGenerateModalOpen, setAIGenerateModalOpen] = useState(false);
    const [isGeneratingJD, setIsGeneratingJD] = useState(false);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isAddTeamMemberModalOpen, setAddTeamMemberModalOpen] = useState(false);
    const [projectForTeamAdd, setProjectForTeamAdd] = useState<Project | null>(null);
    
    // Debug: log resume staging and candidates to help trace upload flow
    React.useEffect(() => {
        console.debug('stagedResumes changed:', stagedResumes.map(f => ({ name: f.name, size: f.size })));
    }, [stagedResumes]);

    React.useEffect(() => {
        console.debug('allCandidates count:', allCandidates.length);
    }, [allCandidates]);
    // --- NEW: Candidate Fit Analysis State ---
    const [candidateForFitAnalysis, setCandidateForFitAnalysis] = useState<Candidate | null>(null);
    const [jobFitResults, setJobFitResults] = useState<(JobDescription & { matchScore: number })[] | null>(null);
    
    // --- DERIVED STATE ---
    const effectiveUser = currentUser;

    // --- DATA PERSISTENCE ---
    useEffect(() => { localStorage.setItem('accionTalent_candidates', JSON.stringify(allCandidates)); }, [allCandidates]);
    useEffect(() => { localStorage.setItem('accionTalent_jobs', JSON.stringify(allJobDescriptions)); }, [allJobDescriptions]);
    useEffect(() => { localStorage.setItem('accionTalent_projects', JSON.stringify(allProjects)); }, [allProjects]);
    useEffect(() => { localStorage.setItem('accionTalent_users', JSON.stringify(users)); }, [users]);
    useEffect(() => { localStorage.setItem('accionTalent_history', JSON.stringify(historyLog)); }, [historyLog]);
    useEffect(() => { localStorage.setItem('accionTalent_invitations', JSON.stringify(invitations)); }, [invitations]);
    useEffect(() => { localStorage.setItem('accionTalent_notifications', JSON.stringify(notifications)); }, [notifications]);
    useEffect(() => { localStorage.setItem('accionTalent_companyProfile', JSON.stringify(companyProfile)); }, [companyProfile]);

    // --- INITIALIZE DEFAULT USER IF NONE EXIST ---
    useEffect(() => {
        if (users.length === 0) {
            // Logic moved to useState initializer to prevent flash of empty state
        }
    }, [users.length]);

    // Removed: No longer syncing from localStorage - using SSO API instead

    // --- SSO AUTHENTICATION: Check session status from backend ---
    // This is the ONLY way ATS should get user info - via cookie-based SSO or SSO token
    useEffect(() => {
        let ssoToken: string | null = null;
        let hasCompleted = false;
        
        // Set timeout to prevent infinite loading (2 seconds max - faster response)
        const timeoutId = setTimeout(() => {
            if (!hasCompleted) {
                console.warn('⏱️ SSO check timeout - proceeding with existing user or guest mode');
                setIsInitializingSSO(false);
                hasCompleted = true;
            }
        }, 2000);
        
        // Listen for SSO token from intranet via postMessage
        const handleMessage = (event: MessageEvent) => {
            // Accept messages from intranet origin (adjust as needed)
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const allowedOrigins = isDevelopment 
                ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
                : ['https://intranet.accionlabs.com'];
            
            if (!allowedOrigins.includes(event.origin)) {
                return; // Ignore messages from untrusted origins
            }
            
            // Check if message contains SSO token
            if (event.data && (event.data.sso_token || event.data.type === 'SSO_TOKEN')) {
                ssoToken = event.data.sso_token || event.data.token;
                console.log('📨 Received SSO token from intranet');
                // Trigger session check with token
                checkSSOSession(ssoToken);
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        const checkSSOSession = async (providedToken?: string | null) => {
            try {
                console.log('🔐 Checking SSO session status...');
                
                // Check if sso_token is in URL (passed from intranet)
                const urlParams = new URLSearchParams(window.location.search);
                const urlToken = urlParams.get('sso_token');
                
                // Use provided token, URL token, or try cookie-based
                const tokenToUse = providedToken || urlToken;
                
                // Try API call with token (if available) or cookie-based SSO
                try {
                    console.log('🔑 Using SSO token:', tokenToUse ? 'Yes (from ' + (providedToken ? 'postMessage' : 'URL') + ')' : 'No (cookie-based)');
                    const sessionStatus = await authService.checkSessionStatus(tokenToUse || undefined);
                    
                    console.log('📊 Session status response:', { 
                        authenticated: sessionStatus.authenticated, 
                        hasUser: !!sessionStatus.user 
                    });
                    
                    if (sessionStatus.authenticated && sessionStatus.user) {
                        const userData = sessionStatus.user;
                        console.log('✅ SSO session authenticated:', { 
                            method: tokenToUse ? 'token' : 'cookie',
                            name: userData.name, 
                            email: userData.email, 
                            role: userData.role 
                        });
                        
                        updateUserFromSSO(userData);
                        
                        // Clean up URL token if present
                        if (urlToken) {
                            const newUrl = window.location.pathname;
                            window.history.replaceState({}, '', newUrl);
                        }
                        
                        // Mark as completed and clear loading
                        if (!hasCompleted) {
                            hasCompleted = true;
                            clearTimeout(timeoutId);
                            setIsInitializingSSO(false);
                        }
                        return; // Success, exit early
                    } else {
                        console.warn('⚠️ Session status returned:', { 
                            authenticated: sessionStatus.authenticated, 
                            hasUser: !!sessionStatus.user,
                            reason: !sessionStatus.authenticated ? 'Not authenticated' : 'No user data'
                        });
                    }
                } catch (apiError: any) {
                    console.error('❌ SSO API call failed:', apiError);
                    console.error('Error details:', {
                        message: apiError.message,
                        stack: apiError.stack,
                        name: apiError.name
                    });
                    
                    // If CORS error, provide helpful message
                    if (apiError.message?.includes('CORS') || apiError.message?.includes('Failed to fetch')) {
                        console.error('❌ CORS Error: Backend must allow requests from:', window.location.origin);
                        console.log('💡 Configure backend CORS to allow:', window.location.origin);
                        console.log('💡 API URL being called:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/sso_backend'}/api/auth/session-status`);
                    }
                }
                
                // If we get here, no valid session found
                console.log('⚠️ No active SSO session - user not authenticated');
                // Clear loading state even if no session found
                if (!hasCompleted) {
                    hasCompleted = true;
                    clearTimeout(timeoutId);
                    setIsInitializingSSO(false);
                }
                
            } catch (error) {
                console.error('❌ Error checking SSO session:', error);
                // Clear loading state on error
                if (!hasCompleted) {
                    hasCompleted = true;
                    clearTimeout(timeoutId);
                    setIsInitializingSSO(false);
                }
            }
        };
        
        // Helper function to update user from SSO data
        const updateUserFromSSO = (userData: any) => {
            // Map backend role to ATS role
            const mappedRole: UserRole = userData.is_super_admin 
                ? 'Main Admin' 
                : (userData.role === 'Recruiter' ? 'Recruiter' : 'Admin');
            
            const atsUser: User = {
                id: userData.id || 1,
                name: userData.name,
                email: userData.email,
                password: 'admin123', // Not used in SSO mode
                role: mappedRole,
                avatar: userData.avatar || getInitials(userData.name),
                permissions: allPermissions,
                apps: userData.apps || [],
                is_super_admin: userData.is_super_admin || false,
            };
            
            // Update current user
            setCurrentUser(atsUser);
            
            // Update users list and persist to localStorage
            setUsers(prev => {
                const existingIndex = prev.findIndex(u => u.email === atsUser.email);
                let updatedUsers: User[];
                if (existingIndex !== -1) {
                    updatedUsers = prev.map((u, idx) => idx === existingIndex ? atsUser : u);
                } else {
                    updatedUsers = [atsUser, ...prev];
                }
                // Persist to localStorage
                localStorage.setItem('accionTalent_users', JSON.stringify(updatedUsers));
                return updatedUsers;
            });
        };
        
        // Check session on mount - always clear loading after check
        const runInitialCheck = async () => {
            try {
                await checkSSOSession();
            } catch (error) {
                console.error('SSO check error:', error);
            } finally {
                // ALWAYS clear loading state after check completes
                setTimeout(() => {
                    setIsInitializingSSO(false);
                    clearTimeout(timeoutId);
                }, 100);
            }
        };
        
        runInitialCheck();
        
        // Optionally: Check session periodically (every 5 minutes) - but don't show loading
        const interval = setInterval(() => {
            checkSSOSession().catch(() => {
                // Silent failure for periodic checks
            });
        }, 5 * 60 * 1000);
        
        return () => {
            clearTimeout(timeoutId);
            clearInterval(interval);
            window.removeEventListener('message', handleMessage);
        };
    }, []); // Run only once on mount

    
    // --- CORE HANDLERS ---
    const logAction = useCallback((action: string, details: Partial<HistoryEntry> = {}, directUser: User | null = null) => {
        const userContext = directUser || effectiveUser;
        if (!userContext) return;

        const newLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: userContext.id,
            userName: userContext.name,
            action,
            ...details
        };
        setHistoryLog(prev => [newLog, ...prev]);
    }, [effectiveUser]);

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
            toast.error('Could not find Main Admin to preserve. Aborting reset.');
        }
    };
    
    const handleNavigate = (page: string) => {
        setSelectedCandidate(null);
        setSelectedJob(null);
        setSelectedJobForDetail(null);
        setSelectedProject(null);
        setCandidatesForAnalysis([]);
        setCandidateForFitAnalysis(null);
        setJobFitResults(null);
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
            // User exists, add them to the project
            setAllProjects(prevProjects => prevProjects.map(p => {
                if (p.id === projectForTeamAdd.id) {
                    if (p.team.some(member => member.userId === existingUser.id)) {
                        toast.warning(`${existingUser.name} is already a member of this project.`);
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
            // User does not exist, create an invitation for admin approval
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
        toast(<ToastConfirm 
            message="Are you sure you want to import data? This will overwrite all existing jobs, candidates, users, and settings."
            confirmLabel="Import & Overwrite"
            onConfirm={() => {
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
                            toast.success("Data imported successfully. The application will now reload.");
                            setTimeout(() => window.location.reload(), 2000);
                        } else {
                            throw new Error("Invalid data file structure.");
                        }
                    } catch (error) {
                        console.error("Import failed:", error);
                        toast.error(`Failed to import data: ${error.message}`);
                    }
                };
                reader.readAsText(file);
            }}
        />, { autoClose: false, closeOnClick: false });
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
        }
    };

    const handleDeleteProject = (projectId: number) => {
        const projectToDelete = allProjects.find(p => p.id === projectId);
        if (!projectToDelete) return;

        toast(<ToastConfirm 
            message={`Are you sure you want to delete the project "${projectToDelete.name}"? This will also delete all associated jobs.`}
            confirmLabel="Delete Project"
            onConfirm={() => {
                setAllProjects(prev => prev.filter(p => p.id !== projectId));
                setAllJobDescriptions(prev => prev.filter(j => j.projectId !== projectId));
                logAction('Deleted project', { targetType: 'Project', targetName: projectToDelete.name, targetId: projectId });
                if (selectedProject?.id === projectId) {
                    setSelectedProject(null);
                }
                toast.success("Project deleted successfully.");
            }}
        />, { autoClose: false, closeOnClick: false });
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
                
                // Defaults for fields that might be missing from AI parsing
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
                
                // Crucial defaults for array fields to prevent .map() errors
                requiredSkills: [],
                highlights: [],
                responsibilities: [],
                qualifications: [],
                preferredQualifications: [],

                // Spread the parsed data, which will overwrite defaults if present
                ...jobData 
            } as JobDescription;
            setAllJobDescriptions(prev => [newJob, ...prev]);
            logAction('Created job', { targetType: 'Job', targetName: newJob.title, targetId: newJob.id });
        }
    };

    const handleProcessJds = async () => {
        if (!selectedProject) {
            toast.error("No project selected. Cannot process JDs.");
            return;
        }
        
        setIsProcessingJds(true);
        
        const totalFiles = stagedJds.length;
        let successCount = 0;
        
        for (let i = 0; i < totalFiles; i++) {
            const file = stagedJds[i];
            setProcessingJdsStatus(`Processing ${file.name} (${i + 1}/${totalFiles})...`);
            
            try {
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
    
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: 'application/json', responseSchema: jdSchema }
                });
    
                let jsonString = response.text.trim();
                if (jsonString.startsWith('```json')) {
                    jsonString = jsonString.slice(7, -3).trim();
                }
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
        toast(<ToastConfirm 
            message={`Are you sure you want to delete ${jobsToDelete.length} selected jobs? This action cannot be undone.`}
            confirmLabel="Delete Jobs"
            onConfirm={() => {
                setAllJobDescriptions(prev => prev.filter(j => !ids.includes(j.id)));
                jobsToDelete.forEach(j => logAction('Deleted job', { targetType: 'Job', targetName: j.title, targetId: j.id }));
                if (selectedJob && ids.includes(selectedJob.id)) {
                    setSelectedJob(null);
                }
                if (selectedJobForDetail && ids.includes(selectedJobForDetail.id)) {
                    setSelectedJobForDetail(null);
                }
                toast.success("Jobs deleted successfully.");
            }}
        />, { autoClose: false, closeOnClick: false });
    };

    const handleJobStatusUpdate = (jobId: number, status: JobDescription['status']) => {
        const jobToUpdate = allJobDescriptions.find(j => j.id === jobId);
        setAllJobDescriptions(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
        if(jobToUpdate) {
            logAction(`Updated job status to ${status}`, { targetType: 'Job', targetName: jobToUpdate.title, targetId: jobId });
        }
    };

    const handleGenerateJdWithAI = async (prompt: string, projectId: number) => {
        if (!prompt || !projectId) return;

        setIsGeneratingJD(true);
        setAIGenerateModalOpen(false);

        try {
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

            const fullPrompt = `You are an expert recruitment consultant. Generate a complete and professional job description based on this user request: "${prompt}". Fill out all fields of the JSON schema as completely as possible. If a field like "companyName" isn't specified, you can use a placeholder like "A Leading Tech Company". Make the responsibilities and qualifications detailed and use bullet points (separated by newlines \\n).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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

            setJobEditorModalOpen(false); // Ensure any open editor is closed
            setJobToEdit(newJobData as JobDescription);
            setJobEditorModalOpen(true);

        } catch (error) {
            console.error("AI JD generation failed:", error);
            toast.error(`Sorry, the AI failed to generate the job description. Please try again or create it manually.\nError: ${error.message}`);
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
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const keywordsSchema = {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of relevant job titles and core technology combinations."
                        }
                    },
                    required: ['keywords']
                };
    
                const prompt = `You are an expert technical headhunter. Your goal is to create a list of highly specific keywords that will ONLY find candidates who are a strong fit for a given role. You must prioritize precision over finding every possible candidate. Avoid broad terms that could match irrelevant profiles.

**Job Details:**
*   **Title:** "${job.title}"
*   **Required Skills:** "${(job.requiredSkills || []).join(', ')}"
*   **Description Snippet:** "${(job.description || '').substring(0, 500)}..."

**Instructions:**
1.  **Primary Keywords (Job Titles):** Generate a list of relevant job titles, synonyms, and seniority variations. This is the most important part. Examples: "Frontend Engineer", "UI Developer", "Senior React Developer".
2.  **Secondary Keywords (Role + Tech):** Generate keywords that combine a role with a core technology. Example: "React.js Developer", "Frontend React Engineer".
3.  **Tertiary Keywords (Core Tech):** Generate a maximum of 2-3 of the MOST CRITICAL and DIFFERENTIATING standalone technologies. For a React role, this might be "React" and "Redux". Do NOT include "JavaScript" as it is too broad.
4.  **Strictly Prohibited:** Your output MUST NOT contain any of the following low-signal, generic keywords. This is a non-negotiable rule.
    **Prohibited List:** \`JavaScript\`, \`SQL\`, \`Git\`, \`CI/CD\`, \`Agile\`, \`Jira\`, \`Scrum\`, \`REST\`, \`RESTful\`, \`API\`, \`JSON\`, \`HTML\`, \`HTML5\`, \`CSS\`, \`CSS3\`, \`Unit Testing\`, \`Teamwork\`, \`Communication\`, \`Problem Solving\`, \`Responsive Design\`.

Generate a JSON object with a "keywords" key containing an array of strings.`;
    
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: 'application/json', responseSchema: keywordsSchema }
                });
    
                let jsonString = response.text.trim();
                if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
    
                const { keywords: aiKeywords } = JSON.parse(jsonString);
                keywords = aiKeywords;
    
                setAllJobDescriptions(prevJobs => prevJobs.map(j => 
                    j.id === job.id ? { ...j, analysisKeywords: keywords } : j
                ));
            }
            
            if (!keywords.map(k => k.toLowerCase()).includes(job.title.toLowerCase())) {
                keywords.push(job.title);
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
            toast.error(`An error occurred during AI analysis. Please try again. Error: ${error.message}`);
            return { rankedCandidates: [], keywords: [] };
        } finally {
            setIsAnalyzingJobId(null);
        }
    }, [allCandidates, allJobDescriptions]);
    
    // --- RESUME & CANDIDATE HANDLERS ---
    const handleUpdateCandidate = (updatedCandidate: Candidate) => {
        const oldCandidate = allCandidates.find(c => c.id === updatedCandidate.id);
        setAllCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
        if (oldCandidate && oldCandidate.status !== updatedCandidate.status) {
            logAction(`Changed candidate status to ${updatedCandidate.status}`, { targetType: 'Candidate', targetName: updatedCandidate.name, targetId: updatedCandidate.id });
        }
    };

    const handleParseFileToCandidate = useCallback(async (file: File, source: string = 'Instant ATS Checker'): Promise<Candidate | null> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resumeSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING }, title: { type: Type.STRING }, summary: { type: Type.STRING },
                    totalExperienceYears: { type: Type.NUMBER, description: "The candidate's total years of professional experience, either explicitly stated or calculated from work history dates. Provide a single number." },
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
            const prompt = `You are an expert resume parser. Extract structured information from the following resume text. For 'totalExperienceYears', find an explicit statement (e.g., '5 years of experience') or calculate the total by summing up work durations. If you calculate, be precise. Preserve formatting like bullet points using newline characters (\\n).\n\nResume Text:\n\n${resumeText}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: 'application/json', responseSchema: resumeSchema }
            });

            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);

            // Fallback calculation
            let totalExperience = parsedData.totalExperienceYears;
            if (totalExperience === undefined || totalExperience === null) {
                if (parsedData.experience && parsedData.experience.length > 0) {
                    totalExperience = calculateTotalExperience(parsedData.experience);
                }
            }
            
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
            toast.error(`Failed to parse resume: ${error.message}`);
            return null;
        }
    }, [logAction]);

    // Fetch all resumes from backend to sync frontend with backend storage
    const fetchBackendResumes = useCallback(async () => {
        try {
            const API_BASE_URL = 'https://intranet.accionlabs.com/atsbackend';
            const response = await fetch(`${API_BASE_URL}/list-resumes`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch resumes from backend:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('Backend resumes synced:', data);
            // The data structure is already being handled correctly in CandidatesPage
        } catch (error) {
            console.error('Error fetching backend resumes:', error);
        }
    }, []);

    const handleClearStagedResumes = () => {
        toast(<ToastConfirm
            message="Are you sure you want to clear all resumes from the queue? This will stop any ongoing processing."
            confirmLabel="Clear Queue"
            onConfirm={() => {
                processingRef.current = false;
                setStagedResumes([]);
                setIsProcessing(false);
                setProcessingStatus('');
            }}
        />, { autoClose: false, closeOnClick: false });
    };

    const handleViewResume = async (file: File) => {
        try {
            const blob = await atsApiService.downloadResume(file.name);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download resume:', error);
            toast.error('Failed to download resume');
        }
    };

    const handleDeleteResume = async (file: File) => {
        toast(<ToastConfirm
            message={`Are you sure you want to delete "${file.name}" from cloud storage? This action cannot be undone.`}
            confirmLabel="Delete Resume"
            onConfirm={async () => {
                try {
                    // Backend uses FOLDER_PREFIX + filename as S3 key
                    // From backend code: FOLDER_PREFIX = "ats/"
                    const s3Key = file.name;
                    console.log('Deleting file with S3 key:', s3Key);

                    await atsApiService.deleteResume(s3Key);
                    toast.success('Resume deleted successfully');
                    // Remove from staged resumes if present
                    setStagedResumes(prev => prev.filter(f => f !== file));
                } catch (error) {
                    console.error('Failed to delete resume:', error);
                    toast.error(`Failed to delete resume: ${error.message}`);
                }
            }}
        />, { autoClose: false, closeOnClick: false });
    };

    const handleProcessResumes = async () => {
        setIsProcessing(true);
        processingRef.current = true;
        const addedCandidateIdsInThisBatch: number[] = [];

        const filesToProcess = [...stagedResumes];
        const totalFiles = filesToProcess.length;
        let successCount = 0;

        for (let i = 0; i < totalFiles; i++) {
            if (!processingRef.current) {
                setAllCandidates(prev => prev.filter(c => !addedCandidateIdsInThisBatch.includes(c.id)));
                console.log(`Processing cancelled. Rolled back ${addedCandidateIdsInThisBatch.length} candidates.`);
                return;
            }

            const file = filesToProcess[i];
            setProcessingStatus(`Processing ${file.name} (${i + 1}/${totalFiles})...`);
            try {
                const newCandidate = await handleParseFileToCandidate(file, 'Bulk Resume Upload');
                if (newCandidate) {
                    successCount++;
                    addedCandidateIdsInThisBatch.push(newCandidate.id);
                }
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
            }
        }
        
        if (processingRef.current) {
            setProcessingStatus(`Processing complete. ${successCount}/${totalFiles} resumes added successfully.`);
            logAction(`Bulk processed ${totalFiles} resumes, added ${successCount} new candidates`);

            setTimeout(() => {
                if (processingRef.current) {
                    setStagedResumes([]);
                    setIsProcessing(false);
                    setProcessingStatus('');
                    processingRef.current = false;
                    // Fetch updated resume list from backend
                    fetchBackendResumes();
                }
            }, 3000);
        }
    };

    const handleManualCandidateSave = useCallback((candidateData: Partial<Candidate>): Candidate => {
        const newCandidate: Candidate = {
            id: Date.now(),
            name: candidateData.name || 'Manual Entry',
            avatar: getInitials(candidateData.name || 'ME'),
            title: candidateData.title || '',
            summary: candidateData.summary || '',
            contact: candidateData.contact || { email: '', phone: '', location: '' },
            skills: candidateData.skills || [],
            resumeContent: `Name: ${candidateData.name}\nTitle: ${candidateData.title}\nEmail: ${candidateData.contact?.email}\nSkills: ${candidateData.skills?.join(', ')}\nSummary: ${candidateData.summary}`,
            // fill the rest with defaults
            experience: [],
            education: [],
            softSkills: [],
            languages: [],
            certifications: [],
            links: [],
            status: 'Applied',
            appliedDate: new Date().toISOString().split('T')[0],
            salaryExpectation: null,
            originalResumeFile: null,
            applicationHistory: [{ stage: 'Applied', date: new Date().toISOString(), notes: 'Manually created via Candidates page' }],
            tasks: [],
            notes: [],
            category: 'Manual Entry',
            tags: ['manual-entry'],
            source: 'Manual Entry',
            rejectionReason: null,
            communicationHistory: [],
            interviews: [],
        };
        setAllCandidates(prev => [newCandidate, ...prev]);
        logAction('Manually created candidate', { targetType: 'Candidate', targetName: newCandidate.name, targetId: newCandidate.id });
        return newCandidate;
    }, [logAction]);

    const handleParseFileToJd = useCallback(async (file: File): Promise<Partial<JobDescription> | null> => {
         try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const jdSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING },
                },
                 required: ['title', 'requiredSkills', 'description']
            };
            const jdText = await getTextFromFile(file, ai);
            const prompt = `You are an expert JD parser. Extract the job title, a list of required skills, and the full job description from the following text:\n\n${jdText}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: 'application/json', responseSchema: jdSchema }
            });
            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);
            return { ...parsedData, jdContent: jdText };
        } catch (error) {
            console.error("Failed to parse JD:", error);
            toast.error(`Failed to parse job description: ${error.message}`);
            return null;
        }
    }, []);

    const handleAnalyzeFit = useCallback(async (candidate: Candidate, jd: Partial<JobDescription>): Promise<MatchResult | null> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const matchSchema = {
                type: Type.OBJECT,
                properties: {
                    matchScore: { type: Type.NUMBER, description: "A percentage score from 0 to 100 representing how well the candidate fits the job." },
                    summary: { type: Type.STRING, description: "A 2-3 sentence summary explaining the reason for the score." },
                    matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['matchScore', 'summary', 'matchingSkills', 'missingSkills']
            };

            const prompt = `You are an expert AI recruiter. Analyze the following resume against the job description. Provide a match score, a brief summary, and lists of matching/missing skills.

**Job Description:**
Title: ${jd.title}
Required Skills: ${(jd.requiredSkills || []).join(', ')}
---
${jd.jdContent}
---

**Candidate Resume:**
---
${candidate.resumeContent}
---
`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: 'application/json', responseSchema: matchSchema }
            });
            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);
            logAction('Performed instant ATS match analysis', { targetType: 'Candidate', targetName: candidate.name, targetId: candidate.id });
            return parsedData;
        } catch (error) {
            console.error("Failed to analyze match:", error);
            toast.error(`Failed to analyze match: ${error.message}`);
            return null;
        }
    }, [logAction]);

    const handleDeleteCandidates = (ids: number[]) => {
        const candidatesToDelete = allCandidates.filter(c => ids.includes(c.id));
        setAllCandidates(prev => prev.filter(c => !ids.includes(c.id)));
        candidatesToDelete.forEach(c => logAction('Deleted candidate', { targetType: 'Candidate', targetName: c.name, targetId: c.id }));
        if (selectedCandidate && ids.includes(selectedCandidate.id)) {
            setSelectedCandidate(null);
        }
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
    
    // --- PAGE RENDERING LOGIC ---
    // Modified: removed currentUser check for LoginPage rendering
    
    const renderContent = () => {
        // Show loading only during initial SSO check (with timeout)
        if (isInitializingSSO) {
            return <div className="loading-indicator">Initializing user session...</div>;
        }
        
        // If no user after initialization, create a fallback guest user
        if (!effectiveUser) {
            // Create a fallback guest user if none exists
            if (!currentUser && users.length === 0) {
                const guestUser: User = {
                    id: 1,
                    name: 'Guest User',
                    email: 'guest@acciontalent.com',
                    password: 'admin123',
                    role: 'Admin',
                    avatar: 'GU',
                    permissions: allPermissions,
                    apps: [],
                    is_super_admin: false,
                };
                setCurrentUser(guestUser);
                setUsers([guestUser]);
                // Return loading briefly while setting guest user
                return <div className="loading-indicator">Loading...</div>;
            }
            // If we have users but no currentUser, use the first one
            if (!currentUser && users.length > 0) {
                setCurrentUser(users[0]);
                return <div className="loading-indicator">Loading...</div>;
            }
            return <div className="loading-indicator">Loading user...</div>;
        }

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
                        onOpenAIGenerateModal={() => { setJobEditorModalOpen(false); setAIGenerateModalOpen(true); }}
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
                    setStagedResumes={setStagedResumes}
                    isProcessing={isProcessing}
                    processingStatus={processingStatus}
                    onProcess={handleProcessResumes}
                    onClear={handleClearStagedResumes}
                    onRemoveResume={(fileToRemove: File) => setStagedResumes(prev => prev.filter(f => f !== fileToRemove))}
                    onViewResume={handleViewResume}
                    onDeleteResume={handleDeleteResume}
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
            case 'History':
                 return <HistoryPage
                    historyLog={historyLog}
                    effectiveUser={effectiveUser}
                    onNavigateTo={handleNavigateTo}
                    currentUser={currentUser}
                    allUsers={users}
                />;
            case 'Settings':
                return <SettingsPage
                    effectiveUser={effectiveUser}
                    onUpdateUser={handleUpdateCurrentUser}
                    onResetAllData={handleResetAllData}
                    companyProfile={companyProfile}
                    onUpdateCompanyProfile={handleUpdateCompanyProfile}
                    allUsers={users}
                    onUpdateAllUsers={() => {}}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    invitations={invitations}
                    onInviteUser={() => setInviteModalOpen(true)}
                />;
            default:
                return <div>Page not found</div>;
        }
    };
    
    // Show loading only during initial SSO check
    if (isInitializingSSO) {
        return <div className="loading-indicator">Initializing user session...</div>;
    }
    
    // If no user after initialization, create a fallback guest user
    if (!effectiveUser) {
        // Create a fallback guest user if none exists
        if (!currentUser && users.length === 0) {
            const guestUser: User = {
                id: 1,
                name: 'Guest User',
                email: 'guest@acciontalent.com',
                password: 'admin123',
                role: 'Admin',
                avatar: 'GU',
                permissions: allPermissions,
                apps: [],
                is_super_admin: false,
            };
            setCurrentUser(guestUser);
            setUsers([guestUser]);
            return <div className="loading-indicator">Loading...</div>;
        }
        // If we have users but no currentUser, use the first one
        if (!currentUser && users.length > 0) {
            setCurrentUser(users[0]);
            return <div className="loading-indicator">Loading...</div>;
        }
        return <div className="loading-indicator">Loading user...</div>;
    }

    const hasPermission = (page: UserPermission) => {
        if (!effectiveUser) return false;
        // Admin permissions are handled by checking permissions array
        return effectiveUser.permissions.includes(page);
    };

    const isPageAccessible = (pageName: string): boolean => {
        const permissionMap: { [key: string]: UserPermission } = {
            'Dashboard': 'Dashboard',
            'Job Matching': 'Job Matching',
            'Candidates': 'All Candidates',
            'Calendar': 'Calendar',
            'Communications': 'Communications',
            'Reports': 'Reports',
            'Settings': 'Settings',
            'History': 'History'
        };

        const requiredPermission = permissionMap[pageName];
        if (!requiredPermission) return true; // Pages not in the map are public

        return effectiveUser.permissions.includes(requiredPermission);
    };

    const renderAccessDenied = () => (
        <div className="page-content">
            <div className="empty-state large">
                <span className="material-symbols-outlined" style={{fontSize: '64px', color: '#EF4444'}}>lock</span>
                <h3>Access Denied</h3>
                <p>You do not have permission to view this page. Please contact an administrator if you believe this is an error.</p>
            </div>
        </div>
    );
    

    return (
        <div className="app-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" aria-label="Notifications" />
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} effectiveUser={effectiveUser} />
            <main className="main-content">
                <Header
                    user={effectiveUser}
                    globalSearchTerm={globalSearchTerm}
                    onSearchChange={setGlobalSearchTerm}
                    candidates={globalSearchResults.candidates}
                    jobs={globalSearchResults.jobs}
                    onCandidateSelect={(c) => { setSelectedCandidate(c); setCurrentPage('Candidates'); setGlobalSearchTerm(''); }}
                    onJobSelect={(j) => { setSelectedJobForDetail(j); setCurrentPage('Job Matching'); setGlobalSearchTerm(''); }}
                    onUpdateCurrentUser={handleUpdateCurrentUser}
                    onNavigate={handleNavigate}
                    notifications={notifications.filter(n => n.userId === effectiveUser.id)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onNotificationNavigate={handleNotificationNavigate}
                />
                
                {isPageAccessible(currentPage) ? renderContent() : renderAccessDenied()}

            </main>

            {/* --- GLOBALLY AVAILABLE MODALS --- */}
            <Chatbot jobs={allJobDescriptions} candidates={allCandidates} currentUser={effectiveUser} />
            <ResumeUploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedResumes(prev => [...prev, ...Array.from(files)])} onAddCandidates={(candidates) => setAllCandidates(prev => [...prev, ...candidates])} />
            <JDUploadModal isOpen={isJdUploadModalOpen} onClose={() => setJdUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedJds(prev => [...prev, ...Array.from(files)])} />
            <JobEditorModal isOpen={isJobEditorModalOpen} onClose={() => setJobEditorModalOpen(false)} onSave={(jobData) => handleSaveJob(jobData, selectedProject!.id)} jobToEdit={jobToEdit} />
            <MeetingSchedulerModal isOpen={isMeetingModalOpen} onClose={() => setMeetingModalOpen(false)} onSchedule={handleScheduleMeeting} candidate={candidateForMeeting} />
            <ProjectEditorModal isOpen={isProjectEditorModalOpen} onClose={() => setProjectEditorModalOpen(false)} onSave={handleSaveProject} projectToEdit={projectToEdit} />
            <AIGenerateJDModal isOpen={isAIGenerateModalOpen} onClose={() => setAIGenerateModalOpen(false)} onGenerate={(prompt) => handleGenerateJdWithAI(prompt, selectedProject!.id)} isGenerating={isGeneratingJD} />
            <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onInvite={handleInviteUser} />
            <AddTeamMemberModal isOpen={isAddTeamMemberModalOpen} onClose={() => setAddTeamMemberModalOpen(false)} onAdd={handleAddTeamMemberToProject} />
        </div>
    );
};

export default App;
