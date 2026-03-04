import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Candidate, JobDescription, MatchResult, CandidateWithScore } from '../../types/types';
import { GoogleGenAI, Type } from "@google/genai";
import { getInitials, exportToCSV } from '../../utils/helpers';
import SkillTag from '../../components/common/SkillTag';
import JobEditorModal from '../../modals/JobEditorModal';
import AIGenerateJDModal from '../../modals/AIGenerateJDModal';
import CandidateEditorModal from '../../modals/CandidateEditorModal';
import { parseJobRequirementsFromText, calculateTotalExperience } from '../../utils/analysisUtils';
import { toast } from 'react-toastify';


interface ResumeMatcherToolProps {
    onParseCandidate: (file: File) => Promise<Candidate | null>;
    onParseJd: (file: File) => Promise<Partial<JobDescription> | null>;
    onAnalyzeFit: (candidate: Candidate, jd: Partial<JobDescription>) => Promise<MatchResult | null>;
    onManualCandidateCreate: (candidateData: Partial<Candidate>) => Candidate;
    onViewCandidateProfile: (candidate: Candidate) => void;
}

type ResumeUploadStatus = {
    file: File;
    status: 'loading' | 'parsed' | 'error';
    candidate?: Candidate;
};

type AnalysisResultItem = {
    candidate: CandidateWithScore;
    result: MatchResult;
};


// --- Progress Tracker Component ---
const steps = [
    { name: 'Upload Resumes', icon: '📄' },
    { name: 'Upload Job Description', icon: '📝' },
    { name: 'Processing Data', icon: '⚙️' },
    { name: 'Matching Candidates', icon: '🔍' },
    { name: 'Completed', icon: '✅' }
];

const ProgressTracker = ({ activeStepIndex }) => {
    const getStepIcon = (step, index, activeStep) => {
        if (activeStep > index) {
            if (index === 4 && activeStep === 5) return '🎉';
            return '✔️';
        }
        return step.icon;
    };

    return (
        <div className="progress-tracker-container">
            <div className="progress-tracker">
                {steps.map((step, index) => (
                    <React.Fragment key={step.name}>
                        {index > 0 && (
                            <div className={`step-connector ${activeStepIndex > index - 1 ? 'completed' : ''}`}></div>
                        )}
                        <div 
                            className={`step-item ${activeStepIndex > index ? 'completed' : ''} ${activeStepIndex === index ? 'active' : ''} ${activeStepIndex === 2 && index === 2 ? 'processing' : ''}`}
                        >
                            <div className="step-circle">
                                {getStepIcon(step, index, activeStepIndex)}
                            </div>
                            <div className="step-label">{step.name}</div>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const ResumeMatcherTool: React.FC<ResumeMatcherToolProps> = ({ onParseCandidate, onParseJd, onAnalyzeFit, onManualCandidateCreate, onViewCandidateProfile }) => {
    const [resumeStatuses, setResumeStatuses] = useState<ResumeUploadStatus[]>([]);
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [parsedJd, setParsedJd] = useState<Partial<JobDescription> | null>(null);
    const [isParsingJd, setIsParsingJd] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<AnalysisResultItem[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isJobEditorModalOpen, setIsJobEditorModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isCandidateEditorModalOpen, setIsCandidateEditorModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const jdInputRef = useRef<HTMLInputElement>(null);

    const activeStepIndex = useMemo(() => {
        if (analysisResults) return 5; // Final state, all complete
        if (isAnalyzing) {
            if (progress >= 70) return 3; // "Matching Candidates" is active
            return 2; // "Processing Data" is active
        }
        if (parsedJd && resumeStatuses.some(rs => rs.status === 'parsed')) return 2; // Ready to start, "Processing" is next
        if (resumeStatuses.length > 0) return 1; // "Upload JD" is active
        return 0; // "Upload Resumes" is active
    }, [analysisResults, isAnalyzing, progress, parsedJd, resumeStatuses]);

    useEffect(() => {
        setSelectedIds([]);
    }, [analysisResults]);

    const handleResumeFilesSelect = (files: FileList) => {
        const newFiles = Array.from(files);

        const newStatuses: ResumeUploadStatus[] = newFiles.map(file => ({
            file,
            status: 'loading',
        }));
        
        setResumeStatuses(prev => [...prev, ...newStatuses]);
        setProgress(10);
        setProgressMessage('🟦 10% completed – Resumes uploaded successfully');

        newFiles.forEach(file => {
            onParseCandidate(file)
                .then(candidate => {
                    setResumeStatuses(prev => prev.map(rs => 
                        rs.file === file ? { ...rs, status: candidate ? 'parsed' : 'error', candidate: candidate || undefined } : rs
                    ));
                })
                .catch(error => {
                    console.error(`Failed to parse ${file.name}`, error);
                    setResumeStatuses(prev => prev.map(rs => 
                        rs.file === file ? { ...rs, status: 'error' } : rs
                    ));
                });
        });
    };
    
    const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleResumeFilesSelect(e.target.files);
            e.target.value = ''; // Allow re-selecting the same files
        }
    };

    const handleJdSelect = async (file: File) => {
        setJdFile(file);
        setIsParsingJd(true);
        const result = await onParseJd(file);
        setParsedJd(result);
        setIsParsingJd(false);
        setProgress(20);
        setProgressMessage('🟩 20% completed – Job description uploaded');
    };

    const handleJdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleJdSelect(e.target.files[0]);
        }
    };
    
    const handleRemoveResume = (fileToRemove: File) => {
        setResumeStatuses(prev => prev.filter(rs => rs.file !== fileToRemove));
    };

    const handleClearAllResumes = () => {
        setResumeStatuses([]);
        setAnalysisResults(null);
        setIsAnalyzing(false);
        setProgress(0);
        setProgressMessage('');
    };

    const handleClearJd = () => {
        setJdFile(null);
        setParsedJd(null);
        setAnalysisResults(null);
        setIsAnalyzing(false);
        if (resumeStatuses.some(rs => rs.status === 'parsed')) {
            setProgress(10);
            setProgressMessage('🟦 10% completed – Resumes uploaded successfully');
        } else {
            setProgress(0);
            setProgressMessage('');
        }
    };

    const handleClearResults = () => {
        setAnalysisResults(null);
        setIsAnalyzing(false);
        if (resumeStatuses.some(rs => rs.status === 'parsed') && parsedJd) {
             setProgress(20);
             setProgressMessage('🟩 20% completed – Job description uploaded');
        } else if (resumeStatuses.some(rs => rs.status === 'parsed')) {
             setProgress(10);
             setProgressMessage('🟦 10% completed – Resumes uploaded successfully');
        } else {
             setProgress(0);
             setProgressMessage('');
        }
    };

    const handleAnalyze = async () => {
        const parsedCandidates = resumeStatuses
            .filter(rs => rs.status === 'parsed' && rs.candidate)
            .map(rs => rs.candidate!);

        if (parsedCandidates.length === 0 || !parsedJd) return;

        setIsAnalyzing(true);
        setAnalysisResults(null);
        
        setProgress(40);
        setProgressMessage('🟨 40% completed – Analyzing resumes and JD');

        const allResults: AnalysisResultItem[] = [];

        try {
            await new Promise(res => setTimeout(res, 500)); // Artificial delay for UX

            setProgress(70);
            setProgressMessage('🟧 70% completed – Generating match results');
            
            // Ensure safe access to JD properties for utils
            const safeJd = {
                ...parsedJd,
                title: parsedJd.title || '',
                description: parsedJd.description || '',
                experience: parsedJd.experience || '',
                qualifications: parsedJd.qualifications || [],
                preferredQualifications: parsedJd.preferredQualifications || [],
                education: parsedJd.education || '',
                requiredSkills: parsedJd.requiredSkills || [],
            } as JobDescription;

            let jobRequirements;
            try {
                jobRequirements = parseJobRequirementsFromText(safeJd);
            } catch (e) {
                console.warn("Error parsing JD requirements:", e);
                jobRequirements = { minYearsExperience: 0, requiredDegree: '', requiredSkills: [] };
            }

            for (const candidate of parsedCandidates) {
                try {
                    const result = await onAnalyzeFit(candidate, parsedJd);
                    if (result) {
                        const candidateTotalExp = calculateTotalExperience(candidate.experience || []);
                        const expMatch = jobRequirements.minYearsExperience === null || candidateTotalExp >= jobRequirements.minYearsExperience;
                        
                        let eduMatch = true;
                        if (jobRequirements.requiredDegree) {
                            const requiredLower = jobRequirements.requiredDegree.toLowerCase();
                            eduMatch = candidate.education.some(edu => edu.degree.toLowerCase().includes(requiredLower) || requiredLower.includes(edu.degree.toLowerCase()));
                        }

                        // Calculate matched skills locally if not provided by the analyzer
                        const candidateSkillsLower = new Set((candidate.skills || []).map(s => s.toLowerCase()));
                        const matchingSkills = (parsedJd.requiredSkills || []).filter(skill => candidateSkillsLower.has(skill.toLowerCase()));
                        const resultWithSkills = { ...result, matchingSkills: result.matchingSkills || matchingSkills };

                        const candidateWithScore: CandidateWithScore = {
                            ...candidate,
                            overallScore: result.matchScore,
                            expMatch,
                            eduMatch,
                            missingSkills: result.missingSkills,
                            totalExperienceYears: candidateTotalExp // Ensure this is set for the table
                        };
                        
                        allResults.push({ result: resultWithSkills, candidate: candidateWithScore });
                    }
                } catch (err) {
                    console.error(`Skipping candidate ${candidate.name} due to analysis error`, err);
                    // Continue to next candidate instead of failing completely
                }
            }
            
            await new Promise(res => setTimeout(res, 500));

            allResults.sort((a, b) => b.result!.matchScore - a.result!.matchScore);
            setAnalysisResults(allResults);
            
            setProgress(100);
            setProgressMessage('🎉 100% completed – Matching completed successfully!');

        } catch (error) {
            console.error("Analysis failed for batch:", error);
            // Fallback to show any results collected or empty list to prevent error state
            setAnalysisResults(allResults);
            setProgress(0);
            setProgressMessage('');
        } finally {
            setIsAnalyzing(false);
        }
    };

     const handleManualJdSave = (jobData: Partial<JobDescription>) => {
        setJdFile(null);
        setParsedJd({ ...jobData, jdContent: jobData.description });
        setIsJobEditorModalOpen(false);
        setProgress(20);
        setProgressMessage('🟩 20% completed – Job description uploaded');
    };

    const handleManualCandidateSave = (data: Partial<Candidate>) => {
        const newCandidate = onManualCandidateCreate(data);
        if (newCandidate) {
            const manualFile = new File([newCandidate.resumeContent], "Manual Entry", { type: "text/plain" });
            setResumeStatuses(prev => [...prev, {
                file: manualFile,
                status: 'parsed',
                candidate: newCandidate
            }]);
        }
        setIsCandidateEditorModalOpen(false);
        setProgress(10);
        setProgressMessage('🟦 10% completed – Resumes uploaded successfully');
    };

    const handleGenerateJdWithAI = async (prompt: string) => {
        setIsAiModalOpen(false);
        setIsParsingJd(true);
        setJdFile(null);
        setParsedJd(null);

        try {
            // Fix: Instantiate AI right before the call.
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

            const fullPrompt = `You are an expert recruitment consultant. Generate a job description based on this request: "${prompt}". Extract only the job title, a list of required skills, and the main job description.`;

            // Fix: Updated model name to 'gemini-3-flash-preview' for text generation tasks.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: fullPrompt }] },
                config: { responseMimeType: 'application/json', responseSchema: jdSchema }
            });

            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            const parsedData = JSON.parse(jsonString);

            const jdForTool: Partial<JobDescription> = {
                title: parsedData.title,
                requiredSkills: parsedData.requiredSkills,
                description: parsedData.description,
                jdContent: parsedData.description,
            };
            setParsedJd(jdForTool);
            setProgress(20);
            setProgressMessage('🟩 20% completed – Job description uploaded');
        } catch (error) {
            console.error("AI JD generation for tool failed:", error);
            toast.error(`Sorry, AI failed to generate the job description. ${error?.message || ''}`.trim());
        } finally {
            setIsParsingJd(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(analysisResults?.map(r => r.candidate.id) || []);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const handleRemoveFromResults = (idsToRemove: number[]) => {
        setAnalysisResults(prev => prev ? prev.filter(r => !idsToRemove.includes(r.candidate.id)) : null);
        setResumeStatuses(prev => prev.filter(rs => rs.candidate ? !idsToRemove.includes(rs.candidate.id) : true));
        setSelectedIds([]);
    };

    const handleExportSelected = () => {
        if (!analysisResults) return;

        const dataToExport = analysisResults.filter(r => selectedIds.includes(r.candidate.id));
        if (dataToExport.length === 0) {
            toast.info('No candidates selected to export.');
            return;
        }

        const formattedData = dataToExport.map(({ candidate, result }) => ({
            'Candidate Name': candidate.name,
            'Title': candidate.title,
            'Overall Match (%)': result.matchScore,
            'Experience Match': candidate.expMatch ? 'Yes' : 'No',
            'Education Match': candidate.eduMatch ? 'Yes' : 'No',
            'Missing Skills': result.missingSkills?.join('; ') ?? 'N/A',
            'Matching Skills': result.matchingSkills?.join('; ') ?? 'N/A',
        }));
        
        const filename = `${parsedJd?.title?.replace(/\s+/g, '_')}_analysis_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(formattedData, filename);
    };
    
    const isLoadingResumes = resumeStatuses.some(rs => rs.status === 'loading');
    const parsedCandidatesCount = resumeStatuses.filter(rs => rs.status === 'parsed').length;

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-emerald-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-rose-600';
    };

    const allVisibleSelected = analysisResults && analysisResults.length > 0 && selectedIds.length === analysisResults.length;


    return (
        <div className="instant-ats-checker-page">
            <ProgressTracker activeStepIndex={activeStepIndex} />
            <main className="ats-checker-main">
                 <div className={`upload-panel resume-panel ${resumeStatuses.length > 0 ? 'has-file' : ''}`}>
                    <input 
                        ref={resumeInputRef} 
                        type="file" 
                        onChange={handleResumeFileChange} 
                        accept=".pdf,.doc,.docx,.txt,.csv,.json,image/*" 
                        style={{ display: 'none' }} 
                        multiple
                    />
                    <div className="panel-content">
                        {resumeStatuses.length === 0 ? (
                            <>
                                <span className="material-symbols-outlined panel-icon">badge</span>
                                <h3 className="panel-title">1. Provide Resumes</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', width: '80%' }}>
                                    <button className="btn btn-secondary" onClick={() => resumeInputRef.current?.click()}>
                                        <span className="material-symbols-outlined">upload_file</span> Upload Files
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setIsCandidateEditorModalOpen(true)}>
                                        <span className="material-symbols-outlined">edit_document</span> Fill Manually
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="panel-success-state" style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0 }}>Uploaded Resumes ({resumeStatuses.length})</h4>
                                    {isLoadingResumes && <span className="material-symbols-outlined spin">autorenew</span>}
                                </div>
                                <ul className="file-queue-list" style={{width: '100%', flexGrow: 1, margin: 0, maxHeight: 'none', paddingRight: '8px'}}>
                                    {resumeStatuses.map(({ file, status, candidate }) => (
                                       <li key={`${file.name}-${file.lastModified}-${Math.random()}`}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                {status === 'loading' && <span className="material-symbols-outlined spin" style={{fontSize: '18px'}}>autorenew</span>}
                                                {status === 'parsed' && <span className="material-symbols-outlined" style={{fontSize: '18px', color: '#10B981'}}>check_circle</span>}
                                                {status === 'error' && <span className="material-symbols-outlined" style={{fontSize: '18px', color: '#EF4444'}}>error</span>}
                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={file.name}>
                                                    {file.name} {candidate ? `- ${candidate.name}` : (status === 'error' ? '- Error' : '')}
                                                </span>
                                            </span>
                                            <button className="remove-file-btn" onClick={(e) => { e.stopPropagation(); handleRemoveResume(file); }} title={`Remove ${file.name}`}>
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '16px' }}>
                                     <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="btn btn-secondary btn-small" onClick={() => resumeInputRef.current?.click()}>
                                           <span className="material-symbols-outlined">add</span> Add More Files
                                       </button>
                                       <button className="btn btn-secondary btn-small" onClick={() => setIsCandidateEditorModalOpen(true)}>
                                           <span className="material-symbols-outlined">person_add</span> Add Manually
                                       </button>
                                    </div>
                                    <button className="btn btn-danger btn-small" onClick={handleClearAllResumes}>
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                 <div className={`upload-panel jd-panel ${jdFile || parsedJd ? 'has-file' : ''}`}>
                    <input ref={jdInputRef} type="file" onChange={handleJdFileChange} accept=".pdf,.doc,.docx,.txt,image/*" style={{ display: 'none' }} />
                    <div className="panel-content">
                        {!jdFile && !parsedJd ? (
                             <>
                                <span className="material-symbols-outlined panel-icon">description</span>
                                <h3 className="panel-title">2. Provide Job Description</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', width: '80%' }}>
                                    <button className="btn btn-secondary" onClick={() => jdInputRef.current?.click()}>
                                        <span className="material-symbols-outlined">upload_file</span> Upload File
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setIsJobEditorModalOpen(true)}>
                                        <span className="material-symbols-outlined">edit_document</span> Fill Manually
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setIsAiModalOpen(true)}>
                                        <span className="material-symbols-outlined">auto_awesome</span> Create with AI
                                    </button>
                                </div>
                            </>
                        ) : isParsingJd ? (
                            <>
                                <span className="material-symbols-outlined panel-icon spin">autorenew</span>
                                <p className="panel-loading-state">AI is processing your document...</p>
                            </>
                        ) : parsedJd ? (
                            <div className="panel-success-state">
                                <span className="material-symbols-outlined">check_circle</span>
                                <p className="file-name">{jdFile ? jdFile.name : (parsedJd.id ? 'From System' : 'Manually Provided')}</p>
                                <p className="parsed-name">{parsedJd.title}</p>
                                <button className="panel-clear-btn" onClick={(e) => {e.stopPropagation(); handleClearJd();}}>Change Job Description</button>
                            </div>
                        ) : (
                             <div className="panel-success-state">
                                <span className="material-symbols-outlined" style={{color: '#EF4444'}}>error</span>
                                <p className="file-name">{jdFile?.name}</p>
                                <p className="parsed-name" style={{color: '#B91C1C'}}>Parsing Failed</p>
                                <button className="panel-clear-btn" onClick={(e) => {e.stopPropagation(); handleClearJd();}}>Try again</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer className="ats-checker-footer">
                {isAnalyzing ? (
                    <div className="analysis-progress-container">
                        <p className="progress-text">{progressMessage}</p>
                        <div className="progress-bar-modal" style={{ width: '100%' }}>
                            <div className="progress-bar-inner-modal" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {progress > 0 && !analysisResults && (
                            <div className="analysis-progress-container" style={{ paddingBottom: '16px' }}>
                                <p className="progress-text">{progressMessage}</p>
                                <div className="progress-bar-modal" style={{ width: '100%' }}>
                                    <div className="progress-bar-inner-modal" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                        {analysisResults && (
                             <div className="analysis-progress-container">
                                <p className="progress-text">{progressMessage}</p>
                                <div className="progress-bar-modal" style={{ width: '100%' }}>
                                    <div className="progress-bar-inner-modal" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                        {!analysisResults && (
                            <button 
                                className="btn btn-primary" 
                                style={{padding: '16px 32px', fontSize: '18px'}}
                                disabled={parsedCandidatesCount === 0 || !parsedJd || isLoadingResumes}
                                onClick={handleAnalyze}
                            >
                                <span className="material-symbols-outlined">bolt</span>
                                Start Matching
                            </button>
                        )}
                    </>
                )}
            </footer>

            {analysisResults && (
                <div className="analysis-results-container">
                    <div className="analysis-results-header">
                        <h3>Analysis Results ({analysisResults.length})</h3>
                        <button className="btn btn-secondary" onClick={handleClearResults}>
                            <span className="material-symbols-outlined">refresh</span> Start New Analysis
                        </button>
                    </div>

                    {selectedIds.length > 0 && (
                         <div className="inline-ats-toolbar" style={{ justifyContent: 'space-between' }}>
                            <div className="selection-actions">
                                <span className="selection-count">{selectedIds.length} candidate(s) selected</span>
                                <button className="btn btn-secondary btn-small" onClick={handleExportSelected}>
                                    <span className="material-symbols-outlined">download</span> Export Selected
                                </button>
                                <button className="btn btn-danger btn-small" onClick={() => handleRemoveFromResults(selectedIds)}>
                                    <span className="material-symbols-outlined">delete_sweep</span> Remove Selected
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="ats-table-container">
                        <table className="ats-table">
                           <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={allVisibleSelected}
                                            ref={el => { if (el) { el.indeterminate = selectedIds.length > 0 && !allVisibleSelected; }}}
                                            aria-label="Select all candidates in this view"
                                        />
                                    </th>
                                    <th>Candidate Name</th>
                                    <th>Experience</th>
                                    <th>Location</th>
                                    <th>Score</th>
                                    <th>Matched Skills</th>
                                    <th>Missing Skills</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysisResults.map(({ result, candidate }) => (
                                    <tr key={candidate.id}>
                                         <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(candidate.id)}
                                                onChange={() => handleSelectOne(candidate.id)}
                                                aria-label={`Select ${candidate.name}`}
                                            />
                                        </td>
                                        <td>
                                            <div className="candidate-cell">
                                                <div className="user-avatar small">{getInitials(candidate.name)}</div>
                                                <div>
                                                     <a href="#" className="candidate-name" onClick={(e) => { e.preventDefault(); onViewCandidateProfile(candidate); }}>{candidate.name}</a>
                                                    <p className="candidate-title">{candidate.title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{candidate.totalExperienceYears || 0} Years</td>
                                        <td>{candidate.contact?.location || 'N/A'}</td>
                                        <td><span className={`ats-score-pill ${getScoreColor(result.matchScore)}`}>{result.matchScore}%</span></td>
                                        <td>
                                            <div className="missing-skills-container">
                                                {result.matchingSkills && result.matchingSkills.length > 0 ? (
                                                    result.matchingSkills.slice(0, 3).map(skill => <span key={skill} className="skill-tag-simple" style={{background: '#D1FAE5', color: '#065F46', borderColor: '#A7F3D0'}}>{skill}</span>)
                                                ) : (
                                                    <span style={{color: '#888', fontSize: '12px'}}>None</span>
                                                )}
                                                {result.matchingSkills && result.matchingSkills.length > 3 && (
                                                    <span className="skill-tag-simple" style={{fontSize: '11px'}}>+{result.matchingSkills.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                             <div className="missing-skills-container">
                                                {result.missingSkills.length > 0 ? (
                                                    result.missingSkills.map(skill => <span key={skill} className="missing-skill-tag">{skill}</span>)
                                                ) : (
                                                    <span className="perfect-match-text">Perfect Match!</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn btn-secondary btn-small" onClick={() => onViewCandidateProfile(candidate)}>
                                                    <span className="material-symbols-outlined">visibility</span> View
                                                </button>
                                                <button className="btn btn-danger btn-small" onClick={() => handleRemoveFromResults([candidate.id])}>
                                                    <span className="material-symbols-outlined">delete</span> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <JobEditorModal isOpen={isJobEditorModalOpen} onClose={() => setIsJobEditorModalOpen(false)} onSave={handleManualJdSave} jobToEdit={null} />
            <CandidateEditorModal isOpen={isCandidateEditorModalOpen} onClose={() => setIsCandidateEditorModalOpen(false)} onSave={handleManualCandidateSave} />
            <AIGenerateJDModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onGenerate={handleGenerateJdWithAI} isGenerating={isParsingJd} />

        </div>
    );
};

export default ResumeMatcherTool;
