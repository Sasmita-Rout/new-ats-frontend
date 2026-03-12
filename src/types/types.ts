
export type UserRole =
  | 'Main Admin'
  | 'Admin'
  | 'Recruiter'
  | 'super_admin'
  | 'admin'
  | 'head_dd'
  | 'pdm'
  | 'user';

export type UserPermission = 'Dashboard' | 'Job Matching' | 'All Candidates' | 'Calendar' | 'Communications' | 'Reports' | 'Settings' | 'History';

export type User = {
  id: number;
  name: string;
  email: string;
  password?: string; // This should be handled securely on a server
  role: UserRole;
  intranetRole?: string;
  avatar: string;
  permissions: UserPermission[];
};

export type InvitationStatus = 'Pending' | 'Approved' | 'Rejected';

export type Invitation = {
  id: number;
  inviterId: number;
  inviterName: string;
  email: string;
  status: InvitationStatus;
  createdAt: string; // ISO string
  type: 'User' | 'ProjectTeam';
  projectId?: string;
  projectName?: string;
};

export type Notification = {
  id: number;
  userId: number; // The ID of the user who should see this notification
  timestamp: string;
  message: string;
  read: boolean;
  linkTo?: {
    page: string;
    targetId?: number;
  };
};

export type CompanyProfile = {
  name: string;
  logo: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  linkedin: string;
  address: string;
};

export type Project = {
  project_id: string;
  project_name: string;
  project_description?: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  status?: 'active' | 'inactive';
};

export type Experience = {
  title: string;
  company: string;
  duration: string;
  description: string;
};

export type Education = {
  degree: string;
  institution: string;
  duration: string;
};

export type Note = {
    id: number;
    author: string;
    text: string;
    date: string;
};

export type Task = {
    id: number;
    text: string;
    completed: boolean;
};

export type Link = {
    name: string;
    url: string;
};

export type Interview = {
  id: number;
  type: 'Screening' | 'Technical' | 'HR' | 'Final';
  date: string; // ISO string
  duration: number; // in minutes
  interviewer: string;
  status: 'Scheduled' | 'Completed' | 'Canceled';
  meetingLink?: string;
  notes?: string;
  schedulerId: number; // ID of the user who scheduled the interview
};

export type Candidate = {
  id: number;
  name: string;
  title: string;
  avatar: string;
  summary: string;
  // Legacy shape still seen in some API responses
  contact?: {
    email: string;
    phone: string;
    location: string;
  };
  // Current normalized shape used across the app
  email: string;
  phone: string;
  location: string;
  dob?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  softSkills: string[];
  languages: string[];
  certifications: string[];
  links: Link[];
  status: 'Interview' | 'Hired' | 'Screening' | 'Offer' | 'Rejected';
  appliedDate: string;
  salaryExpectation: number | null;
  resumeContent: string;
  originalResumeFile: File | null; 
  applicationHistory: { stage: string; date: string; notes: string }[];
  tasks: Task[];
  notes: Note[];
  category: string;
  tags: string[];
  source: string;
  rejectionReason: string | null;
  jobSpecificMatchScore?: number;
  communicationHistory: { type: 'email' | 'call'; date: string; subject: string }[];
  interviews?: Interview[];
  totalExperienceYears?: number;
  originalSkills?: string;
  originalContact?: string;
  originalLocation?: string;
  originalExperience?: string;
  originalDob?: string;
};

export type JobDescription = {
    id: number;
    jobId?: string;
    projectId: string;
    title: string;
    companyName: string;
    companyLogo: string;
    location: string;
    status: 'Active' | 'Paused' | 'Closed';
    experience: string;
    type: string;
    salary: string;
    postedDate: string;
    applicants: number;
    matches: number;
    requiredSkills: string[];
    description: string;
    highlights: string[];
    responsibilities: string[];
    qualifications: string[];
    preferredQualifications: string[];
    education: string;
    department: string;
    roleCategory: string;
    industry: string;
    ownerId: number;
    numberOfPositions: number;
    uploadedBy?: string;
    analysisKeywords?: string[];
    // Added to store the raw text content of the JD
    jdContent?: string;
    aiFilled?: boolean;
};

export type CandidateWithScore = Candidate & { 
    jobSpecificMatchScore?: number;
    overallScore?: number;
    expMatch?: boolean;
    eduMatch?: boolean;
    matchingSkills?: string[];
    missingSkills?: string[];
    location_matched?: boolean;
     location?: string;   
};

export type JobRequirements = {
    minYearsExperience: number | null;
    requiredDegree: string | null;
};

export type HistoryEntry = {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  userRole?: UserRole;
  impersonatingUserName?: string;
  action: string;
  targetType?: 'Candidate' | 'Job' | 'User' | 'Project';
  targetName?: string;
  targetId?: number;
};

export type ChatMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export type ChatSession = {
  id: number;
  title: string;
  messages: ChatMessage[];
};

export type MatchResult = {
  matchScore: number;
  summary: string;
  matchingSkills: string[];
  missingSkills: string[];
  location_matched?: boolean;
};
