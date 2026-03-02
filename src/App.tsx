
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Tool } from "@google/genai";

// Import types
import { Candidate, JobDescription, CandidateWithScore, Interview, User, HistoryEntry, Project, MatchResult, CompanyProfile, Invitation, InvitationStatus, UserPermission, UserRole, Notification, Experience, Education, Link, Task, Note } from './types/types';

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
import LoginPage from './pages/LoginPage';


// Import components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Import modals
import ResumeUploadModal from './modals/ResumeUploadModal';
import JDUploadModal from './modals/JDUploadModal';
import JobEditorModal from './modals/JobEditorModal';
import MeetingSchedulerModal from './modals/MeetingSchedulerModal';
import BulkMeetingSchedulerModal from './modals/BulkMeetingSchedulerModal';
import UserEditorModal from './modals/UserEditorModal';
import ProjectEditorModal from './modals/ProjectEditorModal';
import AIGenerateJDModal from './modals/AIGenerateJDModal';
import InviteMemberModal from './modals/InviteMemberModal';
import CandidateProfileModal from './modals/CandidateProfileModal';


// Import utils
import { getInitials } from './utils/helpers';
import { calculateTotalExperience, parseJobRequirementsFromText } from './utils/analysisUtils';

const API_BASE_URL =  'http://localhost:8000';
const SSO_API_URL =  'http://localhost:8001';
const ATS_SSO_APP_NAME = ('accion_talent_search').toLowerCase();
//const RESUME_VAULT_BASE_URL = import.meta.env.VITE_RESUME_VAULT_BASE_URL || 'https://13.233.241.103/resume_vault';
const RESUME_VAULT_BASE_URL =  'http://localhost:8002/resume_vault';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

//const API_BASE_URL = "https://intranet.accionlabs.com/recruiter-tool";
//const SSO_API_URL = "https://intranet.accionlabs.com";
//const RESUME_VAULT_BASE_URL = "https://intranet.accionlabs.com/resume_vault";

const defaultFilters = { status: [] as Candidate['status'][], skills: '', location: '', roleCategory: '', education: '', salaryMin: '', salaryMax: '', tags: '', experience: '', name: '', email: '' };
const allPermissions: UserPermission[] = ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'];

const hashStringToInt = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) || 1;
};

const deriveAtsRoleFromIntranet = (intranetRole?: string, isSuperAdmin?: boolean, accessLevel?: string): UserRole => {
    if (isSuperAdmin) return 'super_admin';
    const role = (intranetRole || '').toLowerCase();
    if (role === 'admin' || role === 'head_dd' || role === 'pdm') return role as UserRole;
    if ((accessLevel || '').toLowerCase() === 'admin') return 'admin';
    if (role === 'user') return 'user';
    return 'user';
};

const derivePermissionsFromRole = (role: UserRole): UserPermission[] => {
    const privileged = role === 'super_admin' || role === 'admin' || role === 'head_dd' || role === 'pdm' || role === 'Main Admin' || role === 'Admin';
    return privileged ? allPermissions : allPermissions;
};

const createUserFromSession = (session: { email: string; name?: string; role?: string; isSuperAdmin?: boolean; accessLevel?: string; }): User => {
    const safeEmail = session.email.trim().toLowerCase();
    const namePart = safeEmail.split('@')[0] || 'User';
    const displayName = session.name || namePart
        .split(/[._-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    const intranetRole = deriveAtsRoleFromIntranet(session.role, session.isSuperAdmin, session.accessLevel);

    return {
        id: hashStringToInt(safeEmail),
        name: displayName || safeEmail,
        email: safeEmail,
        role: intranetRole,
        intranetRole: session.role,
        avatar: getInitials(displayName || safeEmail),
        permissions: derivePermissionsFromRole(intranetRole),
    };
};

async function getCurrentUserSession(): Promise<{ email: string; name?: string; role?: string; isSuperAdmin?: boolean; accessLevel?: string; }> {
    try {
        const response = await fetch(`${SSO_API_URL}/api/auth/session-status`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.email) {
                const apps = Array.isArray(data.apps) ? data.apps : [];
                const atsApp = apps.find((app: any) => {
                    const name = String(app?.app_name || '').toLowerCase();
                    return name === ATS_SSO_APP_NAME;
                });
                const role = atsApp?.role || undefined;
                localStorage.setItem('userEmail', data.email);
                return {
                    email: data.email,
                    name: data.name,
                    role,
                    isSuperAdmin: data.is_super_admin,
                    accessLevel: atsApp?.access_level,
                };
            }
        }
    } catch (error) {
        console.warn('SSO session check failed; falling back to local storage.', error);
    }

    const localEmail = localStorage.getItem('userEmail');
    if (localEmail) return { email: localEmail };

    throw new Error('User not identified. Please log in via Main SSO.');
}

const App = () => {
    // --- MAIN DATA STATE ---
    const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
    const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
    const [allJobDescriptions, setAllJobDescriptions] = useState<JobDescription[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
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
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // --- UI & MODAL STATE ---
    const [currentPage, setCurrentPage] = useState('Dashboard');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobDescription | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [emailTargets, setEmailTargets] = useState<Candidate[]>([]);
    const [emailJobIdOverride, setEmailJobIdOverride] = useState<string | null>(null);
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
    const [meetingJobId, setMeetingJobId] = useState<string | null>(null);
    const [isBulkMeetingModalOpen, setBulkMeetingModalOpen] = useState(false);
    const [candidatesForBulkMeeting, setCandidatesForBulkMeeting] = useState<Candidate[]>([]);
    const [bulkMeetingJobId, setBulkMeetingJobId] = useState<string | null>(null);
    const [isBulkMeetingSubmitting, setBulkMeetingSubmitting] = useState(false);
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
    const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
    const [candidateBackPage, setCandidateBackPage] = useState<string | null>(null);

    const upsertCandidatesByEmail = useCallback((prev: Candidate[], incoming: Candidate[]) => {
        const next = [...prev];
        const indexByEmail = new Map<string, number>();
        next.forEach((c, i) => {
            const email = (c.email || '').trim().toLowerCase();
            if (email) indexByEmail.set(email, i);
        });

        const additions: Candidate[] = [];
        incoming.forEach((c) => {
            const email = (c.email || '').trim().toLowerCase();
            if (!email) {
                additions.push(c);
                return;
            }
            const idx = indexByEmail.get(email);
            if (idx === undefined) {
                additions.push(c);
            } else {
                next.splice(idx, 1);
                // Ensure replaced candidates float to the top.
                additions.push(c);
                // Rebuild indices after removal to avoid stale positions.
                indexByEmail.clear();
                next.forEach((nc, ni) => {
                    const em = (nc.email || '').trim().toLowerCase();
                    if (em) indexByEmail.set(em, ni);
                });
            }
        });

        return additions.length ? [...additions, ...next] : next;
    }, []);

    const confirmReplaceToast = useCallback((message: string) => {
        return new Promise<boolean>((resolve) => {
            toast.info(
                ({ closeToast }) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>{message}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => {
                                    if (closeToast) closeToast();
                                    resolve(true);
                                }}
                            >
                                Yes, replace
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => {
                                    if (closeToast) closeToast();
                                    resolve(false);
                                }}
                            >
                                No
                            </button>
                        </div>
                    </div>
                ),
                { autoClose: false, closeOnClick: false }
            );
        });
    }, []);

    const confirmActionToast = useCallback((message: string, yesLabel: string, noLabel: string) => {
        return new Promise<boolean>((resolve) => {
            toast.info(
                ({ closeToast }) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>{message}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => {
                                    if (closeToast) closeToast();
                                    resolve(true);
                                }}
                            >
                                {yesLabel}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => {
                                    if (closeToast) closeToast();
                                    resolve(false);
                                }}
                            >
                                {noLabel}
                            </button>
                        </div>
                    </div>
                ),
                { autoClose: false, closeOnClick: false }
            );
        });
    }, []);
    
    // --- DERIVED STATE ---
    const effectiveUser = impersonatedUser || currentUser;

    const getUploadedBy = useCallback(async () => {
        try {
            const session = await getCurrentUserSession();
            return session.email;
        } catch (error) {
            console.warn('Using local user email for uploaded_by.', error);
            if (effectiveUser?.email) return effectiveUser.email;
            throw error;
        }
    }, [effectiveUser?.email]);

    const resolveJobId = useCallback((preferred?: string | null) => {
        const fallback =
            preferred ||
            selectedJob?.jobId ||
            selectedJob?.id ||
            selectedJobForDetail?.jobId ||
            selectedJobForDetail?.id ||
            selectedProject?.project_id ||
            'unassigned';
        return String(fallback);
    }, [selectedJob, selectedJobForDetail, selectedProject]);

    const applyEmailTemplate = useCallback((template: string, candidate: Candidate, jobTitle?: string) => {
        const safeTemplate = template || '';
        const latestInterview = (candidate.interviews || []).slice().reverse().find(i => i.status === 'Scheduled');
        const meetingLink = latestInterview?.meetingLink || '';
        const currentCompany = candidate.experience?.[0]?.company || '';
        const replacements: Array<[RegExp, string]> = [
            [/\[Candidate Name\]|\{\{candidate_name\}\}/gi, candidate.name || 'Candidate'],
            [/\[Candidate Email\]|\{\{candidate_email\}\}/gi, candidate.email || ''],
            [/\[Job Title\]|\{\{job_title\}\}/gi, jobTitle || ''],
            [/\[Meeting Link\]|\{\{meeting_link\}\}/gi, meetingLink],
            [/\[Current Role\]|\{\{current_role\}\}/gi, candidate.title || ''],
            [/\[Current Company\]|\{\{current_company\}\}/gi, currentCompany],
            [/\[Location\]|\{\{location\}\}/gi, candidate.location || ''],
            [/\[Status\]|\{\{status\}\}/gi, candidate.status || ''],
        ];

        let rendered = safeTemplate;
        replacements.forEach(([pattern, value]) => {
            rendered = rendered.replace(pattern, value);
        });

        const hasNameToken = /\[Candidate Name\]|\{\{candidate_name\}\}/i.test(safeTemplate);
        if (!hasNameToken) {
            rendered = `Hi ${candidate.name || 'Candidate'},\n\n${rendered}`;
        }

        return rendered;
    }, []);

    const enrichBulkEmailBody = useCallback((baseBody: string, candidate: Candidate, index: number) => {
        const variants = [
            `Based on your profile as ${candidate.title || 'a professional'}, we believe this discussion will be highly relevant to your experience.`,
            `Your background${candidate.location ? ` in ${candidate.location}` : ''} makes you a strong fit, and we are looking forward to speaking with you.`,
            `We reviewed your recent experience and would like to explore how your skills align with the role expectations.`,
            `This round will focus on your practical strengths and project experience relevant to the open position.`,
            `We are keen to understand your approach to real-world scenarios and how your expertise can contribute to the team.`,
            `Your application stood out in the shortlist, and this interaction will help us discuss next-step alignment in detail.`,
        ];

        const roleLine = candidate.title
            ? `Current Role: ${candidate.title}${candidate.location ? ` | Location: ${candidate.location}` : ''}`
            : candidate.location
                ? `Location: ${candidate.location}`
                : '';

        const variantLine = variants[index % variants.length];
        const extraBlock = roleLine
            ? `\n\n${variantLine}\n${roleLine}`
            : `\n\n${variantLine}`;

        return `${baseBody}${extraBlock}`;
    }, []);


    const extractEmails = useCallback((input: string) => {
        if (!input) return [];
        const matches = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
        return Array.from(new Set(matches.map(m => m.toLowerCase())));
    }, []);

    const formatInterviewerName = useCallback((input: string) => {
        const name = (input || '').split('(')[0].trim();
        return name || 'Interviewer';
    }, []);

    const deriveInterviewerRole = useCallback((interviewer: string, interviewType?: string) => {
        const raw = (interviewer || '').toLowerCase();
        const type = (interviewType || '').toLowerCase();
        if (raw.includes('hr') || type.includes('hr')) return 'HR';
        if (raw.includes('manager') || type.includes('final')) return 'Managerial';
        return 'Technical';
    }, []);


    const sendInterviewerEmail = useCallback(async (params: {
        candidate: Candidate;
        jobTitle: string;
        roleLabel?: string;
        interviewer: string;
        interviewDate: string;
        interviewTime?: string;
        timeZone?: string;
        duration: number;
        locationText?: string;
        meetingLink: string;
        interviewMode?: string;
        jobId: string;
        uploadedBy: string;
        fromEmail: string;
        interviewType?: string;
        customMessage?: string;
        customEvaluationInstructions?: string;
    }) => {
        const interviewerEmails = extractEmails(params.interviewer || '');
        if (!interviewerEmails.length) return;

        const interviewerName = (params.interviewer || '').split('(')[0].trim() || 'Interviewer';
        const meetingLinkText = params.meetingLink || 'TBD';
        const interviewerRole = deriveInterviewerRole(params.interviewer, params.interviewType);
        const evaluationInstructions = (params.customEvaluationInstructions || '').trim() || (
            interviewerRole === 'HR'
                ? 'Assess communication, culture fit, and role alignment.'
                : interviewerRole === 'Managerial'
                    ? 'Assess leadership, ownership, and stakeholder management.'
                    : 'Assess technical depth, problem-solving, and implementation quality.'
        );
        const modeText = params.interviewMode || 'Online';
        const roleText = params.roleLabel || params.jobTitle || 'N/A';
        let attachments: Array<{ name: string; content_type: string; content_bytes: string }> = [];
        if (params.candidate.email) {
            try {
                const resumeUrl = `${RESUME_VAULT_BASE_URL}/api/v1/resumes/download/${encodeURIComponent(params.candidate.email)}`;
                const resumeResponse = await fetch(resumeUrl);
                if (resumeResponse.ok) {
                    const blob = await resumeResponse.blob();
                    const contentType = blob.type || 'application/octet-stream';
                    const contentDisposition = resumeResponse.headers.get('content-disposition') || '';
                    const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
                    const filename = match?.[1] || `${(params.candidate.name || 'candidate').replace(/\s+/g, '_')}_resume`;
                    const contentBytes = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = String(reader.result || '');
                            resolve(result.split(',')[1] || '');
                        };
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                    if (contentBytes) {
                        attachments = [{ name: filename, content_type: contentType, content_bytes: contentBytes }];
                    }
                }
            } catch {
                attachments = [];
            }
        }

        const interviewerBodyTemplate = `Dear ${interviewerName},

You are part of the interview panel for the ${params.jobTitle || '[Job Title]'} position.

Candidate: [Candidate Name]
Date & Time: ${params.interviewDate}${params.interviewTime ? ` | ${params.interviewTime}` : ''}
Your Role: ${interviewerRole}
Focus Area: ${evaluationInstructions}
Mode: ${modeText}
Location / Meeting Link: ${params.locationText || meetingLinkText}

Please review the candidate profile before the interview.

${params.customMessage || ''}

Best regards,
${effectiveUser?.name || '[Recruiter Name]'}
${companyProfile?.name || '[Company Name]'}`;
        const interviewerSubject = applyEmailTemplate('Interview Scheduled – Interviewer | [Job Title] | [Candidate Name]', params.candidate, params.jobTitle);
        const interviewerBody = applyEmailTemplate(interviewerBodyTemplate, params.candidate, params.jobTitle);

        await Promise.all(interviewerEmails.map(interviewerEmail => {
            const interviewerPayload = {
                job_id: params.jobId,
                candidate_id: params.candidate.id,
                uploaded_by: params.uploadedBy,
                from_email: params.fromEmail,
                to: [interviewerEmail],
                subject: interviewerSubject,
                body: interviewerBody,
                cc: [],
                bcc: [],
                content_type: 'Text',
                save_to_sent_items: true,
                attachments,
            };
            return apiRequest('/communications/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewerPayload),
            });
        }));
    }, [applyEmailTemplate, companyProfile?.name, deriveInterviewerRole, extractEmails, effectiveUser?.name]);


    useEffect(() => {
        let isMounted = true;
        const initAuth = async () => {
            try {
                const session = await getCurrentUserSession();
                if (!isMounted) return;
                const user = createUserFromSession(session);
                setCurrentUser(user);
                setUsers(prev => (prev.some(u => u.email === user.email) ? prev : [user, ...prev]));
            } catch (error) {
                console.warn('SSO auth not available yet.', error);
            } finally {
                if (isMounted) setIsAuthLoading(false);
            }
        };
        initAuth();
        return () => { isMounted = false; };
    }, []);

    // --- DATA PERSISTENCE ---
    // TODO: Data persistence (candidates, jobs, projects, history, invitations, notifications) will be handled via API calls.
    
    // --- CORE HANDLERS ---
    const persistHistoryEntry = useCallback(async (entry: HistoryEntry) => {
        const { id, ...payload } = entry;
        try {
            const response = await fetch(`${API_BASE_URL}/history/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const data = contentType.includes('application/json') ? await response.json() : await response.text();
                const message = typeof data === 'string' ? data : (data?.detail || 'History persistence failed');
                console.warn('History log failed:', message);
            }
        } catch (error) {
            console.warn('History log failed:', error);
        }
    }, []);

    const logAction = useCallback((action: string, details: Partial<HistoryEntry> = {}, directUser: User | null = null) => {
        const userContext = directUser || effectiveUser;
        if (!userContext) return;
    
        const newLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: userContext.id,
            userName: userContext.name,
            action,
        };
        setHistoryLog(prev => [newLog, ...prev]);
        persistHistoryEntry(newLog);
    }, [currentUser, impersonatedUser, effectiveUser, persistHistoryEntry]);

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
        if (!effectiveUser?.id) return;
        addNotification(effectiveUser.id, message);
    }, [addNotification, effectiveUser?.id]);

    const notifyError = useCallback((message: string) => {
        toast.error(message);
        if (!effectiveUser?.id) return;
        addNotification(effectiveUser.id, message);
    }, [addNotification, effectiveUser?.id]);

    const notifyInfo = useCallback((message: string) => {
        toast.info(message);
        if (!effectiveUser?.id) return;
        addNotification(effectiveUser.id, message);
    }, [addNotification, effectiveUser?.id]);

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
            action: 'User logged out',
        };

        if (impersonatedUser) {
            newLog.action = `User logged out while impersonating`;
        }
        
        setHistoryLog(prev => [newLog, ...prev]);
        persistHistoryEntry(newLog);
        
        setCurrentUser(null);
        setImpersonatedUser(null);
        // TODO: Logout functionality will interact with an authentication API.
        window.location.reload();
    };

    const handleStopImpersonation = () => {
        if (!impersonatedUser || !currentUser) return;

        const adminLog: HistoryEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            action: `Stopped impersonating`,
        };
        
        const userNoticeLog: HistoryEntry = {
            id: Date.now() + 1,
            timestamp: new Date().toISOString(),
            userId: impersonatedUser.id,
            userName: impersonatedUser.name,
            action: `Impersonation session ended by`,
        };
        
        setHistoryLog(prev => [userNoticeLog, adminLog, ...prev]);
        persistHistoryEntry(adminLog);
        persistHistoryEntry(userNoticeLog);
        
        setImpersonatedUser(null);
        handleNavigate('Dashboard');
    };
    
    const handleOpenMeetingModal = (candidate: Candidate, jobId?: string) => {
        setCandidateForMeeting(candidate);
        setMeetingJobId(jobId || null);
        setMeetingModalOpen(true);
    };

    const handleOpenBulkMeetingModal = (candidates: Candidate[], jobId?: string) => {
        if (!candidates.length) return;
        const withEmail = candidates.filter(c => !!c.email);
        if (withEmail.length === 0) {
            notifyError('No selected candidates have an email address.');
            return;
        }
        if (withEmail.length < candidates.length) {
            notifyInfo(`${candidates.length - withEmail.length} candidate(s) were skipped due to missing email.`);
        }
        setCandidatesForBulkMeeting(withEmail);
        setBulkMeetingJobId(jobId || null);
        setBulkMeetingModalOpen(true);
    };

    const handleScheduleMeeting = async (details: { title: string, type: Interview['type'], dateTime: string, duration: number, interviewer: string, description: string }) => {
        if (!candidateForMeeting || !effectiveUser) return;
        if (!candidateForMeeting.email) {
            notifyError('Candidate email is missing. Cannot schedule interview.');
            return;
        }

        try {
            const uploadedBy = await getUploadedBy();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
            const jobId = resolveJobId(meetingJobId);
            const existsData = await apiRequest(
                `/communications/interview/exists?candidate_email=${encodeURIComponent(candidateForMeeting.email.trim().toLowerCase())}&job_id=${encodeURIComponent(jobId)}`
            );
            if (existsData?.exists) {
                const shouldSchedule = await confirmActionToast(
                    `Interview already scheduled for ${candidateForMeeting.name}. Schedule again?`,
                    'Schedule again',
                    'Cancel'
                );
                if (!shouldSchedule) return;
            }
            const jobRecord = allJobDescriptions.find(j => String(j.jobId || j.id) === String(jobId));
            const fallbackTitle = (details.title || '').trim();
            const resolvedJobTitle =
                selectedJob?.title ||
                selectedJobForDetail?.title ||
                jobRecord?.title ||
                (fallbackTitle && fallbackTitle.toLowerCase() !== 'interview' ? fallbackTitle : '') ||
                'N/A';
            const resolvedRole = selectedJob?.roleCategory || selectedJobForDetail?.roleCategory || resolvedJobTitle;

            const payload = {
                job_id: jobId,
                candidate_id: candidateForMeeting.id,
                uploaded_by: uploadedBy,
                organizer_email: uploadedBy.trim().toLowerCase(),
                candidate_email: candidateForMeeting.email.trim().toLowerCase(),
                candidate_name: candidateForMeeting.name,
                title: resolvedJobTitle,
                interview_type: details.type,
                date_time: details.dateTime,
                duration: details.duration,
                interviewer: details.interviewer,
                description: details.description,
                timezone,
            };

            const data = await apiRequest('/communications/interview/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const meetingLink = data?.meeting_link || data?.web_link || '';

            const interviewDate = new Date(details.dateTime).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
            const interviewDateOnly = new Date(details.dateTime).toLocaleDateString([], { dateStyle: 'full' });
            const interviewTimeOnly = new Date(details.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
            const interviewMode = meetingLink ? 'Online' : 'In-person';
            const locationOrLink = meetingLink || selectedJob?.location || selectedJobForDetail?.location || 'To be shared by recruiter';

            await sendInterviewerEmail({
                candidate: candidateForMeeting,
                jobTitle: resolvedJobTitle,
                roleLabel: resolvedRole,
                interviewer: details.interviewer,
                interviewDate,
                interviewTime: interviewTimeOnly,
                timeZone,
                duration: details.duration,
                meetingLink,
                locationText: locationOrLink,
                interviewMode,
                jobId,
                uploadedBy,
                fromEmail: uploadedBy.trim().toLowerCase(),
                interviewType: details.type,
                customMessage: details.description,
            });


            const newInterview: Interview = {
                id: Date.now(),
                type: details.type,
                date: new Date(details.dateTime).toISOString(),
                duration: details.duration,
                interviewer: details.interviewer,
                status: 'Scheduled',
                meetingLink,
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

            const emailBody = `Dear ${candidateForMeeting.name},

We are pleased to inform you that your interview for the position of ${resolvedJobTitle} at ${companyProfile?.name || 'our company'} has been scheduled.

Interview Details:

Date: ${interviewDateOnly}

Time: ${interviewTimeOnly} (${timeZone})

Mode: ${interviewMode}

Interviewer(s): ${formatInterviewerName(details.interviewer)}

Location / Meeting Link: ${locationOrLink}

Please ensure you are available at the scheduled time. If you face any difficulty or need to reschedule, kindly inform us in advance.

We look forward to speaking with you.

Best regards,
${effectiveUser.name}`;

            setInitialEmailDraft({
                subject: `Interview Scheduled - Candidate | ${resolvedJobTitle}`,
                body: emailBody,
            });

            setEmailTargets([candidateForMeeting]);
            setEmailJobIdOverride(jobId);
            setMeetingModalOpen(false);
            setCandidateForMeeting(null);
            setMeetingJobId(null);
            setCurrentPage('Communications');
            notifySuccess('Interview scheduled and meeting link generated.');
        } catch (error) {
            console.error('Failed to schedule interview:', error);
            notifyError(error instanceof Error ? error.message : 'Failed to schedule interview.');
        }
    };

    const handleScheduleBulkMeetings = async (details: { title: string, type: Interview['type'], dateTime: string, duration: number, description: string, interviewerById: Record<number, string>, defaultInterviewer: string, sendEmailAfter: boolean }) => {
        if (!candidatesForBulkMeeting.length || !effectiveUser) return;
        if (isBulkMeetingSubmitting) return;

        const jobId = resolveJobId(bulkMeetingJobId);
        try {
            setBulkMeetingSubmitting(true);
            const uploadedBy = await getUploadedBy();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
            const existsList = await Promise.all(
                candidatesForBulkMeeting.map(async candidate => {
                    if (!candidate.email) return false;
                    const data = await apiRequest(
                        `/communications/interview/exists?candidate_email=${encodeURIComponent(candidate.email.trim().toLowerCase())}&job_id=${encodeURIComponent(jobId)}`
                    );
                    return !!data?.exists;
                })
            );
            const alreadyScheduled = candidatesForBulkMeeting.filter((_, index) => existsList[index]);
            let candidatesToSchedule = candidatesForBulkMeeting;
            if (alreadyScheduled.length > 0) {
                const shouldSchedule = await confirmActionToast(
                    `${alreadyScheduled.length} candidate(s) already have scheduled interviews. Schedule again for all?`,
                    'Schedule again',
                    'Skip duplicates'
                );
                if (!shouldSchedule) {
                    candidatesToSchedule = candidatesForBulkMeeting.filter((_, index) => !existsList[index]);
                }
            }

            const results = await Promise.allSettled(
                candidatesToSchedule.map(async candidate => {
                    if (!candidate.email) {
                        throw new Error(`Missing email for ${candidate.name}`);
                    }
                    const interviewer = (details.interviewerById[candidate.id] || details.defaultInterviewer || '').trim();
                    if (!interviewer) {
                        throw new Error(`Missing interviewer for ${candidate.name}`);
                    }
                    const jobRecord = allJobDescriptions.find(j => String(j.jobId || j.id) === String(jobId));
                    const fallbackTitle = (details.title || '').trim();
                    const resolvedJobTitle =
                        selectedJob?.title ||
                        selectedJobForDetail?.title ||
                        jobRecord?.title ||
                        (fallbackTitle && fallbackTitle.toLowerCase() !== 'interview' ? fallbackTitle : '') ||
                        'N/A';

                    const payload = {
                        job_id: jobId,
                        candidate_id: candidate.id,
                        uploaded_by: uploadedBy,
                        organizer_email: uploadedBy.trim().toLowerCase(),
                        candidate_email: candidate.email.trim().toLowerCase(),
                        candidate_name: candidate.name,
                        title: resolvedJobTitle,
                        interview_type: details.type,
                        date_time: details.dateTime,
                        duration: details.duration,
                        interviewer,
                        description: details.description,
                        timezone,
                    };
                    const data = await apiRequest('/communications/interview/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    return { candidate, meetingLink: data?.meeting_link || data?.web_link || '' };
                })
            );

            const successful = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<{ candidate: Candidate; meetingLink: string }>).value);

            if (successful.length) {
                await Promise.allSettled(successful.map(s => {
                    const interviewer = (details.interviewerById[s.candidate.id] || details.defaultInterviewer || '').trim();
                    const meetingDateObj = new Date(details.dateTime);
                    const meetingDateLabel = meetingDateObj.toLocaleDateString([], { dateStyle: 'full' });
                    const meetingTimeLabel = meetingDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                    const jobRecord = allJobDescriptions.find(j => String(j.jobId || j.id) === String(jobId));
                    const fallbackTitle = (details.title || '').trim();
                    const resolvedJobTitle =
                        selectedJob?.title ||
                        selectedJobForDetail?.title ||
                        jobRecord?.title ||
                        (fallbackTitle && fallbackTitle.toLowerCase() !== 'interview' ? fallbackTitle : '') ||
                        'N/A';
                    const resolvedRole = selectedJob?.roleCategory || selectedJobForDetail?.roleCategory || resolvedJobTitle;
                    const meetingLink = s.meetingLink || '';
                    return sendInterviewerEmail({
                        candidate: s.candidate,
                        jobTitle: resolvedJobTitle,
                        roleLabel: resolvedRole,
                        interviewer,
                        interviewDate: meetingDateLabel,
                        interviewTime: meetingTimeLabel,
                        timeZone,
                        duration: details.duration,
                        meetingLink,
                        locationText: meetingLink || selectedJob?.location || selectedJobForDetail?.location || 'To be shared by recruiter',
                        interviewMode: meetingLink ? 'Online' : 'In-person',
                        jobId,
                        uploadedBy,
                        fromEmail: uploadedBy.trim().toLowerCase(),
                        interviewType: details.type,
                        customMessage: details.description,
                        customEvaluationInstructions: details.description,
                    });
                }));
                setAllCandidates(prev => prev.map(c => {
                    const match = successful.find(s => s.candidate.id === c.id);
                    if (!match) return c;
                    const newInterview: Interview = {
                        id: Date.now() + Math.floor(Math.random() * 10000),
                        type: details.type,
                        date: new Date(details.dateTime).toISOString(),
                        duration: details.duration,
                        interviewer: (details.interviewerById[c.id] || details.defaultInterviewer || '').trim(),
                        status: 'Scheduled',
                        meetingLink: match.meetingLink,
                        notes: details.description,
                        schedulerId: effectiveUser.id,
                    };
                    return {
                        ...c,
                        interviews: [...(c.interviews || []), newInterview],
                        status: 'Interview' as const,
                    };
                }));
            }

            const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
            if (failed.length) {
                notifyError(`Scheduled ${successful.length} interview(s), ${failed.length} failed.`);
            } else {
                notifySuccess(`Scheduled ${successful.length} interview(s).`);
            }

            if (details.sendEmailAfter && successful.length > 0) {
                const jobRecord = allJobDescriptions.find(j => String(j.jobId || j.id) === String(jobId));
                const fallbackTitle = (details.title || '').trim();
                const jobTitle =
                    selectedJob?.title ||
                    selectedJobForDetail?.title ||
                    jobRecord?.title ||
                    (fallbackTitle && fallbackTitle.toLowerCase() !== 'interview' ? fallbackTitle : '') ||
                    'N/A';
                const meetingDateObj = new Date(details.dateTime);
                const meetingDate = meetingDateObj.toLocaleDateString([], { dateStyle: 'full' });
                const meetingTime = meetingDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                const emailBodyTemplate = `Dear [Candidate Name],

We are pleased to inform you that your interview for the position of ${jobTitle} at ${companyProfile?.name || 'our company'} has been scheduled.

Interview Details:

Date: ${meetingDate}

Time: ${meetingTime} (${timeZone})

Mode: Online

Interviewer(s): ${formatInterviewerName(details.defaultInterviewer || '')}

Location / Meeting Link: [Meeting Link]

Please ensure you are available at the scheduled time. If you face any difficulty or need to reschedule, kindly inform us in advance.

We look forward to speaking with you.

Best regards,
${effectiveUser.name}`;

                setInitialEmailDraft({
                    subject: `Interview Scheduled - Candidate | ${jobTitle}`,
                    body: emailBodyTemplate,
                });
                setEmailTargets(successful.map(s => s.candidate));
                setEmailJobIdOverride(jobId);
                setCurrentPage('Communications');
            }

            setBulkMeetingModalOpen(false);
            setCandidatesForBulkMeeting([]);
            setBulkMeetingJobId(null);
        } catch (error) {
            console.error('Failed to schedule bulk interviews:', error);
            notifyError(error instanceof Error ? error.message : 'Failed to schedule interviews.');
        } finally {
            setBulkMeetingSubmitting(false);
        }
    };

    const handleResetAllData = () => {
        const userToKeep = users.find(u => u.role === 'Main Admin') || effectiveUser;
        setAllCandidates([]);
        setAllJobDescriptions([]);
        setAllProjects([]);
        setHistoryLog([]);
        setUsers(userToKeep ? [userToKeep] : []);
        logAction('Reset all application data');
    };
    
    const handleNavigate = (page: string) => {
        const targetPage = page === 'Settings' ? 'SettingsMyProfile' : page;
        setSelectedCandidate(null);
        setSelectedJob(null);
        setSelectedJobForDetail(null);
        setSelectedProject(null);
        setCandidatesForAnalysis([]);
        if (targetPage !== 'Communications') {
            setEmailTargets([]);
            setEmailJobIdOverride(null);
        }
        setCurrentPage(targetPage);
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
            addNotification(admin.id, `${effectiveUser.name} has invited a new member: ${email}`, { page: 'Settings' });
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

                // Cascade status to jobs (Two-way sync)
                // Check if status changed to avoid resetting jobs when editing other fields
                const existingProject = allProjects.find(p => p.project_id === projectData.project_id);
                const statusChanged = existingProject && existingProject.status !== projectData.status;

                if (statusChanged && (projectData.status === 'inactive' || projectData.status === 'active')) {
                    const newStatus = projectData.status === 'inactive' ? 'Closed' : 'Active';
                    const apiStatus = projectData.status === 'inactive' ? 'inactive' : 'active';

                    const projectJobs = allJobDescriptions.filter(j => String(j.projectId) === String(projectData.project_id));
                    
                    // Optimistic update
                    setAllJobDescriptions(prev => prev.map(j => 
                        String(j.projectId) === String(projectData.project_id) ? { ...j, status: newStatus } : j
                    ));

                    // API updates
                    await Promise.all(projectJobs.map(job => {
                        if (job.jobId) {
                            const { min, max } = parseExperienceRange(job.experience);
                            const payload = {
                                job_title: job.title,
                                job_description: job.description,
                                job_skills: job.requiredSkills,
                                job_location: job.location,
                                job_experience_min: min,
                                job_experience_max: max,
                                status: apiStatus,
                                project_id: job.projectId,
                            };
                            return apiRequest(`/job/${encodeURIComponent(job.jobId)}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            }).catch(e => console.error(`Failed to update job '${job.title}' (${job.id}):`, e));
                        }
                        return Promise.resolve();
                    }));
                }

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
            const uploadedBy = await getUploadedBy();
            const newProject: Project = {
                project_id: newProjectId,
                uploaded_by: uploadedBy,
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
        const uploadedBy = await getUploadedBy();
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
                    status: jobData.status?.toLowerCase() === 'closed' ? 'inactive' : 'active',
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
                        status: jobData.status?.toLowerCase() === 'closed' ? 'inactive' : 'active',
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
        const uploadedBy = await getUploadedBy();
        
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
    };

    const handleJobStatusUpdate = async (jobId: number, status: JobDescription['status']) => {
        const jobToUpdate = allJobDescriptions.find(j => j.id === jobId);
        setAllJobDescriptions(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
        if (jobToUpdate?.jobId) {
            try {
                await apiRequest(`/job/${encodeURIComponent(jobToUpdate.jobId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: status.toLowerCase() === 'closed' ? 'inactive' : 'active' }),
                });
                await fetchJobs();
            } catch (error) {
                console.error('Failed to update job status:', error);
            }
        }
        if(jobToUpdate) logAction(`Updated job status to ${status}`, { targetType: 'Job', targetName: jobToUpdate.title, targetId: jobId });
    };

    const handleGenerateJdWithAI = async (prompt: string, projectId: string) => {
        if (!prompt || !projectId) return false;

        setIsGeneratingJD(true);

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
                ownerId: effectiveUser?.id ?? 0,
                numberOfPositions: jobData.numberOfPositions || 1,
                aiFilled: true,
            };

            // Ensure the editor modal always mounts with the latest AI payload on first attempt.
            setJobEditorModalOpen(false);
            setJobToEdit(null);
            await Promise.resolve();
            setJobToEdit(newJobData as JobDescription);
            setJobEditorModalOpen(true);
            setAIGenerateModalOpen(false);
            notifyInfo('AI JD generated. Please review and save.');
            return true;

        } catch (error) {
            console.error("AI JD generation failed:", error);
            notifyError('AI JD generation failed.');
            return false;
        } finally {
            setIsGeneratingJD(false);
        }
    };

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

    const handleAnalyzeJobFit = useCallback(async (job: JobDescription) => {
        setIsAnalyzingJobId(job.id);
        try {
            const uploadedBy = await getUploadedBy();
            const jobId = job.jobId || String(job.id);

            const data = await apiRequest('/matching/search-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    uploaded_by: uploadedBy,
                    limit: 200,
                    offset: 0,
                    use_ai: true,
                }),
            });

            const results = Array.isArray(data?.results) ? data.results : [];
            const byEmail = new Map<string, Candidate>();
            allCandidates.forEach(c => {
                const email = c.email?.toLowerCase();
                if (email) byEmail.set(email, c);
            });

            /*const rankedCandidates: CandidateWithScore[] = results.map((r: any) => {
                const email = String(r.email || '').toLowerCase();
                const existing = byEmail.get(email);
                const overallScore = typeof r.match_score === 'number'
                    ? Math.round(r.match_score)
                    : Math.round(Number(r.match_score) || 0);
                const matchingSkills = Array.isArray(r.matching_skills) ? r.matching_skills : [];
                const missingSkills = Array.isArray(r.missing_skills) ? r.missing_skills : [];

                const apiSkills = Array.isArray(r.skills)
                    ? r.skills
                    : String(r.skills || '').split(',').map(s => s.trim()).filter(Boolean);
                const candidateSkillsSource = (existing?.skills && existing.skills.length > 0)
                    ? existing.skills
                    : apiSkills;
                const candidateSkillsLower = new Set(candidateSkillsSource.map(s => s.toLowerCase()));
                const jdSkillsSource = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
                const fallbackMatchingSkills = jdSkillsSource.filter(skill => candidateSkillsLower.has(String(skill).toLowerCase()));
                const finalMatchingSkills = matchingSkills.length > 0 ? matchingSkills : fallbackMatchingSkills;

                if (existing) {
                    const mergedContact = {
                        ...existing.contact,
                        phone: existing.contact?.phone || r.phone || '',
                        location: existing.contact?.location || r.location || '',
                    };
                    const mergedSkills = (existing.skills && existing.skills.length > 0) ? existing.skills : apiSkills;
                    return {
                        ...existing,
                        contact: mergedContact,
                        skills: mergedSkills,
                        overallScore,
                        matchingSkills: finalMatchingSkills,
                        missingSkills,
                        totalExperienceYears: existing.totalExperienceYears ?? r.experience_years,
                    };
                }

                const name = r.candidate_name || r.name || 'Unknown Candidate';
                const idSource = email || name || `${jobId}|${Math.random()}`;
                const derivedId = hashStringToInt(String(idSource));
                return {
                    id: derivedId,
                    name,
                    title: r.title || 'N/A',
                    avatar: getInitials(name),
                    summary: '',
                    contact: { email: email || '', phone: r.phone || '', location: r.location || '' },
                    experience: [],
                    education: [],
                    skills: Array.isArray(r.skills)
                        ? r.skills
                        : String(r.skills || '').split(',').map(s => s.trim()).filter(Boolean),
                    softSkills: [],
                    languages: [],
                    certifications: [],
                    links: [],
                    status: 'Screening',
                    appliedDate: new Date().toISOString().split('T')[0],
                    salaryExpectation: null,
                    resumeContent: '',
                    originalResumeFile: null,
                    applicationHistory: [],
                    tasks: [],
                    notes: [],
                    category: 'Uncategorized',
                    tags: [],
                    source: '',
                    rejectionReason: null,
                    communicationHistory: [],
                    totalExperienceYears: r.experience_years,
                    overallScore,
                    matchingSkills: finalMatchingSkills,
                    missingSkills,
                };
            });*/
            const rankedCandidates: CandidateWithScore[] = results.map((r: any) => {
    const apiDataNormalized = normalizeCandidate(r);
    const email = (apiDataNormalized.email || String(r.email || '')).toLowerCase();
    let existing = email ? byEmail.get(email) : undefined;

    if (!existing && apiDataNormalized.name) {
        const nameLower = apiDataNormalized.name.toLowerCase();
        const nameMatches = allCandidates.filter(c => c.name?.toLowerCase() === nameLower);
        if (nameMatches.length === 1) {
            existing = nameMatches[0];
        } else if (nameMatches.length > 1) {
            const apiPhone = (apiDataNormalized.phone || '').replace(/\D/g, '');
            if (apiPhone.length >= 5) {
                const phoneMatch = nameMatches.find(c => (c.phone || '').replace(/\D/g, '') === apiPhone);
                if (phoneMatch) existing = phoneMatch;
            }
            if (!existing && apiDataNormalized.location) {
                const locLower = apiDataNormalized.location.toLowerCase();
                const locMatch = nameMatches.find(c => (c.location || '').toLowerCase() === locLower);
                if (locMatch) existing = locMatch;
            }
        }
    }
    const overallScore = typeof r.match_score === 'number'
        ? Math.round(r.match_score)
        : Math.round(Number(r.match_score) || 0);
    
    // FIX: Properly handle matching_skills and missing_skills arrays
    const matchingSkills = Array.isArray(r.matching_skills) 
        ? r.matching_skills 
        : (typeof r.matching_skills === 'string' && r.matching_skills)
            ? r.matching_skills.split(',').map(s => s.trim()).filter(Boolean)
            : [];
    
    const missingSkills = Array.isArray(r.missing_skills)
        ? r.missing_skills
        : (typeof r.missing_skills === 'string' && r.missing_skills)
            ? r.missing_skills.split(',').map(s => s.trim()).filter(Boolean)
            : [];

    const apiSkills = Array.isArray(r.skills)
        ? r.skills
        : String(r.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    
    const candidateSkillsSource = (existing?.skills && existing.skills.length > 0)
        ? existing.skills
        : apiSkills;
    
    const candidateSkillsLower = new Set(candidateSkillsSource.map(s => s.toLowerCase()));
    const jdSkillsSource = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
    const fallbackMatchingSkills = jdSkillsSource.filter(skill => candidateSkillsLower.has(String(skill).toLowerCase()));
    const finalMatchingSkills = matchingSkills.length > 0 ? matchingSkills : fallbackMatchingSkills;

    if (existing) {
        return {
            ...existing,
            // Only update fields on the existing candidate if they are empty or 'N/A'
            phone: existing.phone || apiDataNormalized.phone,
            location: existing.location || apiDataNormalized.location,
            dob: (existing.dob && existing.dob !== 'N/A') ? existing.dob : apiDataNormalized.dob,
            skills: (existing.skills && existing.skills.length > 0) ? existing.skills : apiDataNormalized.skills,
            totalExperienceYears: existing.totalExperienceYears || apiDataNormalized.totalExperienceYears,
            // Add scoring info
            overallScore,
            matchingSkills: finalMatchingSkills,
            missingSkills,
            location_matched: r.location_matched ?? false,
        };
    }

    // For a new candidate, just use the normalized API result and add scores
    const newCandidate = apiDataNormalized;
    return {
        ...newCandidate,
        overallScore,
        matchingSkills: finalMatchingSkills,
        missingSkills,
        location_matched: r.location_matched ?? false,
    };
});
            const keywords = job.requiredSkills || [];
            return { rankedCandidates, keywords };
        } catch (error) {
            console.error("AI-powered analysis failed:", error);
            console.error("AI-powered analysis failed:", error);
            alert(`An error occurred during AI analysis.`);
            return { rankedCandidates: [], keywords: [] };
        } finally {
            setIsAnalyzingJobId(null);
        }
    }, [allCandidates, apiRequest, getUploadedBy]);

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

    const checkResumeExistsInVault = useCallback(async (email: string): Promise<boolean> => {
        if (!email) return false;
        const response = await fetch(
            `${RESUME_VAULT_BASE_URL}/api/v1/resumes/metadata/${encodeURIComponent(email)}`
        );
        if (response.ok) return true;
        if (response.status === 404) return false;
        const message = await response.text().catch(() => '');
        throw new Error(message || `Resume vault check failed (${response.status})`);
    }, []);

    const uploadResumeToVault = useCallback(async (
        file: File,
        email: string,
        uploadedBy: string,
        name?: string,
        phone?: string
    ) => {
        const exists = await checkResumeExistsInVault(email);
        const formData = new FormData();
        formData.append('file', file);

        let url = `${RESUME_VAULT_BASE_URL}/api/v1/resumes/upload`;
        let method: 'POST' | 'PUT' = 'POST';

        if (exists) {
            method = 'PUT';
            url = `${RESUME_VAULT_BASE_URL}/api/v1/resumes/${encodeURIComponent(email)}`;
            if (name) {
                formData.append('name', name);
            }
            if (phone) {
                formData.append('phone', phone);
            }
        } else {
            formData.append('email', email);
            formData.append('name', name || email.split('@')[0] || 'Unknown Candidate');
            if (phone) {
                formData.append('phone', phone);
            }
            formData.append('uploaded_by', uploadedBy);
        }

        const response = await fetch(url, {
            method,
            body: formData,
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : await response.text();
            const message = typeof data === 'string' ? data : (data?.detail || 'Resume vault upload failed');
            throw new Error(message);
        }
    }, [checkResumeExistsInVault]);

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
        const email = raw.email || '';

        // Standardize contact info from different API response shapes
        // `list-candidates` uses `contact` for phone. `search-db` uses `phone`.
        // Relaxed validation: Accept if it has at least 5 digits, even if it has text
        const phone = raw.phone 
            || (typeof raw.contact === 'string' && (raw.contact.match(/\d/g) || []).length >= 5 ? raw.contact : '') 
            || raw.contact_no 
            || raw.mobile 
            || '';
        const location = raw.location || raw.address || '';

        const appliedDate = raw.applied_date || raw.appliedDate || raw.file_created || new Date().toISOString().split('T')[0];
        
        // Use email as the primary source for a stable ID. Fallback to other fields if email is missing.
        const idSource = email.toLowerCase() || [
            raw.name || raw.candidate_name,
            raw.filenames,
            raw.file_created
        ].filter(Boolean).join('|') || Date.now().toString();

        const derivedId = hashStringToInt(String(idSource));

        const experience = safeObjectArray<Experience>(raw.experience);
        // Handle experience from `search-db` (experience_years) or `list-candidates` (experience: "2.0")
        let totalExperienceYears = raw.total_experience_years || raw.totalExperienceYears || raw.experience_years || raw.experience;
        if (typeof totalExperienceYears === 'string') {
            const parsed = parseFloat(totalExperienceYears);
            totalExperienceYears = isNaN(parsed) ? 0 : parsed;
        }
        if (!totalExperienceYears && experience.length > 0) {
            totalExperienceYears = calculateTotalExperience(experience);
        }

        return {
            id: typeof raw.id === 'number' ? raw.id : derivedId,
            name: raw.name || raw.candidate_name || 'Unknown Candidate',
            title: raw.title || raw.candidate_title || 'N/A',
            avatar: raw.avatar || getInitials(raw.name || raw.candidate_name || 'Unknown Candidate'),
            summary: raw.summary || '',
            email,
            phone,
            location,
            dob: raw.dob || raw.date_of_birth || raw.dateOfBirth || 'N/A',
            experience: experience,
            education: safeObjectArray<Education>(raw.education),
            skills: safeArray(raw.skills),
            softSkills: safeArray(raw.soft_skills || raw.softSkills),
            languages: safeArray(raw.languages),
            certifications: safeArray(raw.certifications),
            links: safeObjectArray<Link>(raw.links),
            status: raw.status || 'Screening',
            appliedDate,
            salaryExpectation: raw.salary_expectation ?? raw.salaryExpectation ?? null,
            resumeContent: raw.resume_content || raw.resumeContent || '',
            originalResumeFile: null,
            applicationHistory: safeObjectArray<{ stage: string; date: string; notes: string }>(raw.application_history || raw.applicationHistory),
            tasks: safeObjectArray<Task>(raw.tasks),
            notes: safeObjectArray<Note>(raw.notes),
            category: raw.category || 'Uncategorized',
            tags: safeArray(raw.tags),
            source: raw.source || raw.filename || raw.original_filename || '',
            rejectionReason: raw.rejection_reason || raw.rejectionReason || null,
            communicationHistory: safeObjectArray<{ type: 'email' | 'call'; date: string; subject: string }>(raw.communication_history || raw.communicationHistory),
            interviews: safeObjectArray<Interview>(raw.interviews),
            totalExperienceYears: totalExperienceYears || 0,
        };
    }, []);

    const normalizeJobFromApi = useCallback((raw: any): JobDescription => {
        const jobId = raw.job_id || raw.jobId || raw.id;
        const projectId = raw.project_id || raw.projectId || 'unassigned';
        const rawSkills = raw.job_skills || raw.jobSkills || raw.requiredSkills || [];
        const requiredSkills = Array.isArray(rawSkills)
            ? rawSkills.map((s: any) => String(s).trim()).filter(Boolean)
            : String(rawSkills).split(',').map(s => s.trim()).filter(Boolean);
        const expMinRaw = raw.job_experience_min ?? raw.jobExperienceMin;
        const expMaxRaw = raw.job_experience_max ?? raw.jobExperienceMax;
        const expMinParsed = expMinRaw !== undefined && expMinRaw !== null ? Number(expMinRaw) : null;
        const expMaxParsed = expMaxRaw !== undefined && expMaxRaw !== null ? Number(expMaxRaw) : null;
        // Keep ATS experience range anchored from 0 years in all views.
        const expMin = 0;
        const expMax = Number.isFinite(expMaxParsed)
            ? Math.max(expMaxParsed as number, 0)
            : Number.isFinite(expMinParsed)
                ? Math.max(expMinParsed as number, 0)
                : 0;
        const experience = (expMinRaw !== undefined || expMaxRaw !== undefined)
            ? `${expMin} - ${expMax} Years`
            : (raw.experience || 'N/A');
        const statusRaw = (raw.status || raw.job_status || 'Active').toString().toLowerCase();
        const status = (statusRaw === 'inactive' || statusRaw === 'closed')
            ? 'Closed'
            : (statusRaw === 'onhold' || statusRaw === 'paused')
                ? 'Paused'
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
            uploadedBy: raw.uploaded_by || raw.uploadedBy || '',
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
        if (data.parsed_data) return data.parsed_data;
        if (data.updated_data) return data.updated_data;
        if (data.data) return data.data;
        if (data.result) return data.result;
        return data;
    };

    const extractCandidates = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.candidates)) return data.candidates;
        if (Array.isArray(data.parsed_candidates)) return data.parsed_candidates;
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
            const total = typeof data?.total === 'number' ? data.total : candidates.length;
            setTotalCandidatesCount(total);
        } catch (error) {
            console.error('Failed to load candidates:', error);
        }
    }, [apiRequest, normalizeCandidate]);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await apiRequest('/history/list?limit=200&offset=0');
            const logs = Array.isArray(data?.history) ? data.history : [];
            setHistoryLog(logs);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }, [apiRequest]);

    const fetchProjects = useCallback(async () => {
        const uploadedBy = await getUploadedBy();
        try {
            const role = effectiveUser?.role || '';
            const isFullAccess = role === 'super_admin' || role === 'admin' || role.includes('Admin');
            const listUrl = isFullAccess
                ? `/project/list?limit=200&offset=0`
                : `/project/list?uploaded_by=${encodeURIComponent(uploadedBy)}&limit=200&offset=0`;
            const data = await apiRequest(listUrl);
            const projects = extractProjects(data);
            setAllProjects(projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }, [apiRequest, getUploadedBy, effectiveUser?.role]);

    const fetchJobs = useCallback(async () => {
        const uploadedBy = await getUploadedBy();
        try {
            const role = effectiveUser?.role || '';
            const isFullAccess = role === 'super_admin' || role === 'admin' || role.includes('Admin');
            const listUrl = isFullAccess
                ? `/job/list?limit=200&offset=0`
                : `/job/list?uploaded_by=${encodeURIComponent(uploadedBy)}&limit=200&offset=0`;
            const data = await apiRequest(listUrl);
            const jobs = (Array.isArray(data) ? data : data?.data || []).map(normalizeJobFromApi);
            setAllJobDescriptions(jobs);
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    }, [apiRequest, getUploadedBy, normalizeJobFromApi, effectiveUser?.role]);

    // --- SMART VIEW HANDLER ---
    // This ensures we show the FULL candidate profile (from allCandidates) 
    // even if the current view (like Analyze Fit) only has partial data.
    const isProfileComplete = (c: Candidate) => {
        const hasPhone = !!c.phone && c.phone !== 'No Phone';
        const hasLocation = !!c.location && c.location !== 'No Location';
        const hasDob = !!c.dob && c.dob !== 'N/A';
        const hasSkills = Array.isArray(c.skills) && c.skills.length > 0;
        return hasPhone && hasLocation && hasDob && hasSkills;
    };

    const fetchCandidateByEmail = useCallback(async (email: string): Promise<Candidate | null> => {
        try {
            const data = await apiRequest(`/resume/by-email?email=${encodeURIComponent(email)}`);
            return normalizeCandidate(data);
        } catch (error) {
            console.error('Failed to fetch candidate by email:', error);
            return null;
        }
    }, [apiRequest, normalizeCandidate]);

    const handleSelectCandidateFromAnalysis = async (candidate: Candidate) => {
        // Prefer full record for detail view (Analyze Fit often has partial data)
        const fullCandidate = allCandidates.find(c =>
            (c.email && candidate.email && c.email.toLowerCase() === candidate.email.toLowerCase()) ||
            c.id === candidate.id
        );

        if (fullCandidate && isProfileComplete(fullCandidate)) {
            setSelectedCandidate(fullCandidate);
            setCandidateBackPage('Job Matching');
            setCurrentPage('Candidates');
            return;
        }

        if (candidate.email) {
            const freshCandidate = await fetchCandidateByEmail(candidate.email);
            if (freshCandidate) {
                setAllCandidates(prev => {
                    const idx = prev.findIndex(c => c.email?.toLowerCase() === freshCandidate.email?.toLowerCase());
                    if (idx === -1) return [freshCandidate, ...prev];
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...freshCandidate };
                    return next;
                });
                setSelectedCandidate(freshCandidate);
                setCandidateBackPage('Job Matching');
                setCurrentPage('Candidates');
                return;
            }
        }

        setSelectedCandidate(fullCandidate || candidate);
        setCandidateBackPage('Job Matching');
        setCurrentPage('Candidates');
    };

    const handleViewCandidate = async (candidate: Candidate) => {
        // Try to find the full record in our main list by email or ID
        const fullCandidate = allCandidates.find(c => 
            (c.email && candidate.email && c.email.toLowerCase() === candidate.email.toLowerCase()) || 
            c.id === candidate.id
        );

        if (fullCandidate && isProfileComplete(fullCandidate)) {
            setPreviewCandidate(fullCandidate);
            return;
        }

        if (candidate.email) {
            const freshCandidate = await fetchCandidateByEmail(candidate.email);
            if (freshCandidate) {
                setAllCandidates(prev => {
                    const idx = prev.findIndex(c => c.email?.toLowerCase() === freshCandidate.email?.toLowerCase());
                    if (idx === -1) return [freshCandidate, ...prev];
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...freshCandidate };
                    return next;
                });
                setPreviewCandidate(freshCandidate);
                return;
            }
        }

        setPreviewCandidate(fullCandidate || candidate);
    };

    const handleCandidateBack = () => {
        if (candidateBackPage === 'Job Matching') {
            setSelectedCandidate(null);
            setCandidateBackPage(null);
            setCurrentPage('Job Matching');
            return;
        }
        setSelectedCandidate(null);
    };

    useEffect(() => {
        if (!effectiveUser?.email) return;
        if (initialDataFetchRef.current) return;
        initialDataFetchRef.current = true;
        fetchCandidates();
        fetchProjects();
        fetchJobs();
        fetchHistory();
    }, [effectiveUser?.email, fetchCandidates, fetchProjects, fetchJobs, fetchHistory]);

    // --- RESUME & CANDIDATE HANDLERS ---
    const handleUpdateCandidate = async (updatedCandidate: Candidate) => {
        const oldCandidate = allCandidates.find(c => c.id === updatedCandidate.id);
        const uploadedBy = await getUploadedBy();
        const email = updatedCandidate.email;

        if (email) {
            try {
                const payload = {
                    email,
                    name: updatedCandidate.name,
                    phone: updatedCandidate.phone,
                    location: updatedCandidate.location,
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

        if (email) {
            try {
                const formData = new FormData();
                if (updatedCandidate.name) formData.append('name', updatedCandidate.name);
                if (updatedCandidate.phone) formData.append('phone', updatedCandidate.phone);
                await fetch(`${RESUME_VAULT_BASE_URL}/api/v1/resumes/${encodeURIComponent(email)}`, {
                    method: 'PUT',
                    body: formData,
                });
            } catch (error) {
                console.error('Failed to update resume vault metadata:', error);
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
            const uploadedBy = await getUploadedBy();
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
                candidateEmail = newCandidate.email || uploadedBy;
                const existing = allCandidates.find(c => (c.email || '').trim().toLowerCase() === candidateEmail.trim().toLowerCase());
                if (existing) {
                    const shouldReplace = await confirmReplaceToast(
                        `This email already exists (${candidateEmail}). Do you want to replace it?`
                    );
                    if (!shouldReplace) {
                        return null;
                    }
                }
                setAllCandidates(prev => upsertCandidatesByEmail(prev, [newCandidate]));
                try {
                    await uploadResumeToVault(file, candidateEmail, uploadedBy, newCandidate.name, newCandidate.phone);
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
    }, [apiRequest, allCandidates, confirmReplaceToast, fetchCandidates, getUploadedBy, logAction, normalizeCandidate, selectedJob, selectedJobForDetail, selectedProject, uploadResumeToVault, upsertCandidatesByEmail]);

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
            const uploadedBy = await getUploadedBy();
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
                    const existingEmails = new Set(
                        allCandidates.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean)
                    );
                    const duplicates = newCandidates.filter(c => {
                        const email = (c.email || '').trim().toLowerCase();
                        return email && existingEmails.has(email);
                    });
                    const fileCandidatePairs = filesToProcess.map((file, index) => ({
                        file,
                        candidate: newCandidates[index],
                    }));
                    let pairsForVault = fileCandidatePairs;
                    if (duplicates.length > 0) {
                        const shouldReplace = await confirmReplaceToast(
                            `${duplicates.length} email(s) already exist. Replace all duplicates?`
                        );
                        if (shouldReplace) {
                            setAllCandidates(prev => upsertCandidatesByEmail(prev, newCandidates));
                            successCount = newCandidates.length;
                        } else {
                            const uniqueNew = newCandidates.filter(c => {
                                const email = (c.email || '').trim().toLowerCase();
                                return !email || !existingEmails.has(email);
                            });
                            if (uniqueNew.length > 0) {
                                setAllCandidates(prev => upsertCandidatesByEmail(prev, uniqueNew));
                            }
                            successCount = uniqueNew.length;
                            pairsForVault = fileCandidatePairs.filter(pair => {
                                const email = (pair.candidate?.email || '').trim().toLowerCase();
                                return !email || !existingEmails.has(email);
                            });
                        }
                    } else {
                        setAllCandidates(prev => upsertCandidatesByEmail(prev, newCandidates));
                        successCount = newCandidates.length;
                    }
                    await Promise.all(pairsForVault.map(async ({ file, candidate }) => {
                        if (!candidate) return;
                        const candidateEmail = candidate.email || uploadedBy;
                        try {
                            await uploadResumeToVault(file, candidateEmail, uploadedBy, candidate?.name, candidate?.phone);
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

    const handleDeleteCandidates = async (ids: number[]) => {
        const candidatesToDelete = allCandidates.filter(c => ids.includes(c.id));
        const uploadedBy = await getUploadedBy();
        const candidatesMissingEmail = candidatesToDelete.filter(c => !c.email || !c.email.trim());

        if (candidatesMissingEmail.length > 0) {
            const names = candidatesMissingEmail.map(c => c.name).join(', ');
            notifyError(`Cannot delete ${candidatesMissingEmail.length} candidate(s) because email is missing: ${names}`);
        }

        Promise.all(candidatesToDelete.map(async (candidate) => {
            const normalizedEmail = candidate.email?.trim().toLowerCase();
            if (!normalizedEmail) {
                return { id: candidate.id, ok: false };
            }
            try {
                await apiRequest(`/resume/delete?uploaded_by=${encodeURIComponent(uploadedBy)}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: normalizedEmail }),
                });
                try {
                    await fetch(`${RESUME_VAULT_BASE_URL}/api/v1/resumes/${encodeURIComponent(normalizedEmail)}`, {
                        method: 'DELETE',
                    });
                } catch (vaultError) {
                    console.error('Failed to delete resume from vault:', vaultError);
                }
                return { id: candidate.id, ok: true };
            } catch (error) {
                notifyError(`Failed to delete ${candidate.name}: ${error instanceof Error ? error.message : String(error)}`);
                console.error('Failed to delete candidate:', error);
                return { id: candidate.id, ok: false };
            }
        })).then((results) => {
            const deletedIds = results.filter(r => r.ok).map(r => r.id);
            const failedCount = results.length - deletedIds.length;
            if (deletedIds.length === 0) {
                if (failedCount > 0) notifyError(`Failed to delete ${failedCount} candidate(s).`);
                return;
            }
            setAllCandidates(prev => prev.filter(c => !deletedIds.includes(c.id)));
            candidatesToDelete.filter(c => deletedIds.includes(c.id))
                .forEach(c => logAction('Deleted candidate', { targetType: 'Candidate', targetName: c.name, targetId: c.id }));
            if (selectedCandidate && deletedIds.includes(selectedCandidate.id)) setSelectedCandidate(null);
            notifySuccess(`Deleted ${deletedIds.length} candidate(s).`);
            if (failedCount > 0) notifyError(`Failed to delete ${failedCount} candidate(s).`);
        });
    };

    const handleEmailSelected = (ids: number[]) => {
        const targets = allCandidates.filter(c => ids.includes(c.id));
        setEmailTargets(targets);
        setEmailJobIdOverride(null);
        setCurrentPage('Communications');
    };

    const handleEmailSelectedCandidates = (candidates: Candidate[], jobId?: string | null) => {
        const targets = candidates.filter(c => c.email && c.email.trim());
        setEmailTargets(targets);
        setEmailJobIdOverride(jobId ? String(jobId) : null);
        setCurrentPage('Communications');
    };

    const handleContactSupportEmailSelected = (contacts: Array<{ name: string; email: string }>) => {
        const baseId = Date.now();
        const targets: Candidate[] = contacts
            .filter(c => c.email && c.email.trim())
            .map((contact, idx) => ({
                id: baseId + idx + 1,
                name: contact.name || contact.email,
                title: 'Support',
                avatar: '',
                summary: '',
                email: contact.email.trim().toLowerCase(),
                phone: '',
                location: '',
                experience: [],
                education: [],
                skills: [],
                softSkills: [],
                languages: [],
                certifications: [],
                links: [],
                status: 'Screening',
                appliedDate: new Date().toISOString(),
                salaryExpectation: null,
                resumeContent: '',
                originalResumeFile: null,
                applicationHistory: [],
                tasks: [],
                notes: [],
                category: 'Support',
                tags: ['Support'],
                source: 'Contact Support',
                rejectionReason: null,
                communicationHistory: [],
                interviews: [],
            }));

        setEmailTargets(targets);
        setEmailJobIdOverride(null);
        setCurrentPage('Communications');
    };

    const clearEmailTargets = useCallback(() => {
        setEmailTargets([]);
        setEmailJobIdOverride(null);
    }, []);

    const handleSendEmail = async (options: { candidates: Candidate[]; subject: string; body: string; fromEmail: string; cc: string; bcc: string; contentType: 'Text' | 'HTML'; saveToSentItems: boolean; }) => {
        if (!options.candidates.length) return;
        const uploadedBy = await getUploadedBy();
        const isSupportCompose = options.candidates.every(
            c => (c.source || '').toLowerCase() === 'contact support' || (c.category || '').toLowerCase() === 'support'
        );
        const jobId = isSupportCompose ? null : (emailJobIdOverride || resolveJobId(null));
        const jobTitle = selectedJob?.title || selectedJobForDetail?.title || '';
        const ccList = options.cc ? options.cc.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];
        const bccList = options.bcc ? options.bcc.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];

        let candidatesToSend = options.candidates;
        if (!isSupportCompose) {
            const emailExistsList = await Promise.all(
                options.candidates.map(async (candidate) => {
                    if (!candidate.email) return false;
                    const existsPath = jobId
                        ? `/communications/email/exists?candidate_email=${encodeURIComponent(candidate.email.trim().toLowerCase())}&job_id=${encodeURIComponent(jobId)}`
                        : `/communications/email/exists?candidate_email=${encodeURIComponent(candidate.email.trim().toLowerCase())}`;
                    const data = await apiRequest(existsPath);
                    return !!data?.exists;
                })
            );
            const alreadySent = options.candidates.filter((_, index) => emailExistsList[index]);
            if (alreadySent.length > 0) {
                const shouldSend = await confirmActionToast(
                    `${alreadySent.length} candidate(s) already received an email. Send again to all?`,
                    'Send again',
                    'Skip duplicates'
                );
                if (!shouldSend) {
                    candidatesToSend = options.candidates.filter((_, index) => !emailExistsList[index]);
                    if (!candidatesToSend.length) {
                        notifyInfo('No emails sent.');
                        return;
                    }
                }
            }
        }

        const fromEmail = options.fromEmail.trim().toLowerCase();
        const results = await Promise.allSettled(
            candidatesToSend.map(async (candidate, index) => {
                if (!candidate.email) {
                    throw new Error(`Missing email for ${candidate.name}`);
                }
                const personalizedSubject = applyEmailTemplate(options.subject, candidate, jobTitle);

                const personalizedBodyBase = applyEmailTemplate(options.body, candidate, jobTitle);
                const personalizedBody = personalizedBodyBase;
                const payload = {
                    job_id: jobId,
                    candidate_id: candidate.id,
                    uploaded_by: uploadedBy,
                    from_email: fromEmail,
                    to: [candidate.email.trim().toLowerCase()],
                    subject: personalizedSubject,
                    body: personalizedBody,
                    cc: ccList,
                    bcc: bccList,
                    content_type: options.contentType,
                    save_to_sent_items: options.saveToSentItems,
                };
                await apiRequest('/communications/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                return candidate.id;
            })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        if (failureCount > 0) {
            notifyError(`Email sent to ${successCount} candidate(s). ${failureCount} failed.`);
        } else {
            notifySuccess(isSupportCompose ? 'Email sent successfully.' : `Email sent to ${successCount} candidate(s).`);
        }

        if (successCount > 0) {
            logAction(`Sent email with subject "${options.subject}" to ${successCount} candidate(s)`);
        }
        setEmailJobIdOverride(null);
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
            const locationValue = (c.location && c.location !== 'No Location' ? c.location : '') || c.originalLocation || '';
            const skillsValue = Array.isArray(c.skills) ? c.skills : [];
            const tagsValue = Array.isArray(c.tags) ? c.tags : [];
            const educationValue = Array.isArray(c.education) ? c.education : [];
            const experienceValue = Array.isArray(c.experience) ? c.experience : [];
            const originalSkillsValue = c.originalSkills || '';
            const originalExperienceValue = c.originalExperience || '';

            const searchMatch = !searchTerm ||
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                skillsValue.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
                originalSkillsValue.toLowerCase().includes(searchTerm.toLowerCase());

            const statusMatch = mainFilters.status.length === 0 || mainFilters.status.includes(c.status);
            const skillsMatch = !mainFilters.skills || mainFilters.skills.toLowerCase().split(',').every(skill => {
                const term = skill.trim();
                if (!term) return true;
                return skillsValue.some(cs => cs.toLowerCase().includes(term)) || originalSkillsValue.toLowerCase().includes(term);
            });
            const nameMatch = !mainFilters.name || (c.name || '').toLowerCase().includes(mainFilters.name.toLowerCase());
            const emailMatch = !mainFilters.email || (c.email || '').toLowerCase().includes(mainFilters.email.toLowerCase());
            const locationMatch = !mainFilters.location || locationValue.toLowerCase().includes(mainFilters.location.toLowerCase());
            const categoryMatch = !mainFilters.roleCategory || c.category.toLowerCase().includes(mainFilters.roleCategory.toLowerCase());
            const educationMatch = !mainFilters.education || (educationValue.length > 0 && educationValue.some(edu => 
                edu.degree.toLowerCase().includes(mainFilters.education.toLowerCase()) || 
                edu.institution.toLowerCase().includes(mainFilters.education.toLowerCase())
            ));
            const salaryMin = parseFloat(mainFilters.salaryMin);
            const salaryMax = parseFloat(mainFilters.salaryMax);
            const salaryMatch = (!mainFilters.salaryMin || (c.salaryExpectation && c.salaryExpectation >= salaryMin)) &&
                                (!mainFilters.salaryMax || (c.salaryExpectation && c.salaryExpectation <= salaryMax));
            const tagsMatch = !mainFilters.tags || mainFilters.tags.toLowerCase().split(',').every(tag => {
                const term = tag.trim();
                if (!term) return true;
                return tagsValue.some(ct => ct.toLowerCase().includes(term));
            });
            const experienceMatch = !mainFilters.experience || mainFilters.experience.toLowerCase().split(',').every(expTerm => {
                const term = expTerm.trim();
                if (!term) return true;
                return experienceValue.some(exp => 
                    `${exp.title} ${exp.company} ${exp.description}`.toLowerCase().includes(term)
                ) || originalExperienceValue.toLowerCase().includes(term);
            });
            
            return searchMatch && statusMatch && skillsMatch && nameMatch && emailMatch && locationMatch && categoryMatch && educationMatch && salaryMatch && tagsMatch && experienceMatch;
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
                    totalCandidatesCount={totalCandidatesCount}
                    jobs={allJobDescriptions} 
                    projects={allProjects} 
                    onProjectSelect={(p) => { setSelectedProject(p); setCurrentPage('Job Matching'); }}
                    pendingInvitationCount={pendingCount}
                    onNavigate={handleNavigate}
                    apiRequest={apiRequest}
                />;
            case 'Job Matching':
                if (selectedProject) {
                    return <ProjectDetailPage
                        project={selectedProject}
                        jobsForProject={allJobDescriptions.filter(j => String(j.projectId) === String(selectedProject.project_id))}
                        onBack={() => setSelectedProject(null)}
                        onJobSelect={(j) => { setSelectedProject(null); setSelectedJobForDetail(j); }}
                        onJobEdit={(j) => { setJobToEdit(j); setJobEditorModalOpen(true); }}
                        onJobChangeJd={(j) => { setJobToEdit(j); setJobEditorModalOpen(true); }}
                        onJobCreateManually={() => { setJobToEdit(null); setJobEditorModalOpen(true); }}
                        candidates={allCandidates}
                        onCandidateSelect={handleSelectCandidateFromAnalysis}
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
                        onViewCandidate={handleViewCandidate}
                        onScheduleMeeting={handleOpenMeetingModal}
                        onScheduleBulk={handleOpenBulkMeetingModal}
                        onEmailSelectedCandidates={handleEmailSelectedCandidates}
                        organizerEmail={effectiveUser?.email || ''}
                        apiRequest={apiRequest}
                        showOwner={(effectiveUser?.role || '') === 'super_admin' || (effectiveUser?.role || '') === 'admin' || (effectiveUser?.role || '').includes('Admin')}
                        confirmActionToast={confirmActionToast}
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
                        return <CandidateMatchDetailPage candidate={selectedCandidate} job={selectedJob} onBack={handleCandidateBack} onUpdateCandidate={handleUpdateCandidate} />;
                    }
                    return <CandidateDetailPage candidate={selectedCandidate} onBack={handleCandidateBack} onUpdateCandidate={handleUpdateCandidate} onScheduleMeeting={handleOpenMeetingModal} />;
                }
                return <CandidatesPage
                    candidates={filteredCandidates}
                    onCandidateSelect={(c) => { setCandidateBackPage(null); setSelectedCandidate(c); }}
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
                    onViewCandidate={handleViewCandidate}
                    onScheduleMeeting={handleOpenMeetingModal}
                    onScheduleSelected={handleOpenBulkMeetingModal}
                    canDeleteCandidates={
                        (effectiveUser?.role || '') === 'super_admin' ||
                        (effectiveUser?.role || '') === 'admin' ||
                        (effectiveUser?.role || '').includes('Admin')
                    }
                    confirmActionToast={confirmActionToast}
                 />;
            case 'Communications':
                return <CommunicationsPage 
                    emailTargets={emailTargets} 
                    onClearTargets={clearEmailTargets}
                    onUpdateTargets={setEmailTargets}
                    onSendEmail={handleSendEmail}
                    initialDraft={initialEmailDraft}
                    onClearDraft={() => setInitialEmailDraft(null)}
                    senderEmail={effectiveUser?.email || ''}
                    onGenerateEmail={async (prompt: string) => {
                        const data = await apiRequest('/communications/email/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt }),
                        });
                        return data;
                    }}
                />;
            case 'Reports':
                return <ReportsPage candidates={allCandidates} jobs={allJobDescriptions} effectiveUser={effectiveUser} allUsers={users} apiRequest={apiRequest} />;
            case 'Calendar':
                 const allInterviews = allCandidates.flatMap(c => c.interviews || []).filter(i => i !== undefined);
                 const role = effectiveUser?.role || '';
                 const calendarEmail = (role === 'super_admin' || role === 'admin' || role.includes('Admin'))
                    ? ''
                    : (effectiveUser?.email || '');
                 return <CalendarPage candidates={allCandidates} interviews={allInterviews} organizerEmail={calendarEmail} onViewCandidate={handleViewCandidate} />;
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
            case 'SettingsMyProfile':
                return <SettingsPage 
                    effectiveUser={effectiveUser} 
                    onUpdateUser={handleSaveUser}
                    allUsers={users}
                    invitations={invitations}
                    onInviteUser={() => setInviteModalOpen(true)}
                    activeView="My Profile"
                    onComposeSupportEmail={handleContactSupportEmailSelected}
                />;
            case 'SettingsContactSupport':
                return <SettingsPage 
                    effectiveUser={effectiveUser} 
                    onUpdateUser={handleSaveUser}
                    allUsers={users}
                    invitations={invitations}
                    onInviteUser={() => setInviteModalOpen(true)}
                    activeView="Contact Support"
                    onComposeSupportEmail={handleContactSupportEmailSelected}
                />;
            default:
                return <div>Page not found</div>;
        }
    };
    
    if (isAuthLoading) return <div className="loading-indicator">Checking SSO session...</div>;
    if (!effectiveUser) return <div className="loading-indicator">Please log in via the intranet application.</div>;

    const isPageAccessible = (pageName: string): boolean => {
        const permissionMap: { [key: string]: UserPermission } = {
            'Dashboard': 'Dashboard',
            'Job Matching': 'Job Matching',
            'Candidates': 'All Candidates',
            'Calendar': 'Calendar',
            'Communications': 'Communications',
            'Reports': 'Reports',
            'Settings': 'Settings',
            'SettingsMyProfile': 'Settings',
            'SettingsContactSupport': 'Settings',
            'History': 'History',
        };
        const requiredPermission = permissionMap[pageName];
        if (!requiredPermission) return true;
        const role = effectiveUser.role;
        const isAdminRole = role === 'super_admin' || role === 'admin' || role === 'head_dd' || role === 'pdm' || role === 'Main Admin' || role === 'Admin';
        if (isAdminRole) return true;
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
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} effectiveUser={effectiveUser} />
            <main className="main-content">
                <Header 
                    currentPage={currentPage}
                    user={effectiveUser}
                    impersonatedUser={impersonatedUser} 
                    onStopImpersonation={handleStopImpersonation} 
                    globalSearchTerm={globalSearchTerm}
                    onSearchChange={setGlobalSearchTerm}
                    candidates={globalSearchResults.candidates}
                    jobs={globalSearchResults.jobs}
                    onCandidateSelect={(c) => {
                        setCandidateBackPage(null);
                        setGlobalSearchTerm('');
                        handleViewCandidate(c);
                    }}
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
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                style={{ width: '560px' }}
                toastStyle={{ fontSize: '1.25rem', lineHeight: 1.4, padding: '20px 24px', minHeight: '88px' }}
            />
            <ResumeUploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedResumes(prev => [...prev, ...Array.from(files)])} />
            <JDUploadModal isOpen={isJdUploadModalOpen} onClose={() => setJdUploadModalOpen(false)} onAddFiles={(files: FileList) => setStagedJds(prev => [...prev, ...Array.from(files)])} />
            <JobEditorModal isOpen={isJobEditorModalOpen} onClose={() => setJobEditorModalOpen(false)} onSave={(jobData) => handleSaveJob(jobData, selectedProject!.project_id)} jobToEdit={jobToEdit} />
            <MeetingSchedulerModal isOpen={isMeetingModalOpen} onClose={() => setMeetingModalOpen(false)} onSchedule={handleScheduleMeeting} candidate={candidateForMeeting} />
            <BulkMeetingSchedulerModal
                isOpen={isBulkMeetingModalOpen}
                onClose={() => setBulkMeetingModalOpen(false)}
                onSchedule={handleScheduleBulkMeetings}
                candidates={candidatesForBulkMeeting}
                defaultInterviewer={
                    effectiveUser?.name && effectiveUser?.email
                        ? `${effectiveUser.name} (${effectiveUser.email})`
                        : (effectiveUser?.email || effectiveUser?.name || '')
                }
                isSubmitting={isBulkMeetingSubmitting}
            />
            <UserEditorModal isOpen={isUserEditorModalOpen} onClose={() => setUserEditorModalOpen(false)} onSave={handleSaveUser} userToEdit={userToEdit} />
            <ProjectEditorModal isOpen={isProjectEditorModalOpen} onClose={() => setProjectEditorModalOpen(false)} onSave={handleSaveProject} projectToEdit={projectToEdit} />
            <AIGenerateJDModal isOpen={isAIGenerateModalOpen} onClose={() => setAIGenerateModalOpen(false)} onGenerate={(prompt) => handleGenerateJdWithAI(prompt, selectedProject!.project_id)} isGenerating={isGeneratingJD} />
            <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onInvite={handleInviteUser} />
            <CandidateProfileModal isOpen={!!previewCandidate} onClose={() => setPreviewCandidate(null)} candidate={previewCandidate} />
        </div>
    );
};

export default App;
