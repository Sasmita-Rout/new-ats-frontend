import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { JobDescription, Candidate, Project, CandidateWithScore, AnalysisResult } from '../types/types';
import JobCard from '../components/jobs/JobCard';
import InlineATSAnalysis from '../components/jobs/InlineATSAnalysis';
import ProcessingQueue from '../components/common/ProcessingQueue';
import { toast } from 'react-toastify';

type ProjectDetailPageProps = {
    project: Project;
    jobsForProject: JobDescription[];
    onBack: () => void;
    onJobSelect: (job: JobDescription) => void;
    onJobEdit: (job: JobDescription) => void;
    onJobChangeJd: (job: JobDescription) => void;
    onJobCreateManually: () => void;
    candidates: Candidate[];
    onCandidateSelect: (candidate: Candidate) => void;
    onUploadJds: () => void;
    stagedJds: File[];
    isProcessingJds: boolean;
    processingJdsStatus: string;
    onProcessJds: () => void;
    onClearJds: () => void;
    onDeleteJobs: (jobIds: number[]) => void;
    onRemoveJd: (file: File) => void;
    onDeleteCandidates: (candidateIds: number[]) => void;
    onEmailSelected: (ids: number[]) => void;
    onEmailSelectedCandidates: (candidates: Candidate[], jobId?: string | null) => void;
    candidatesForAnalysis: CandidateWithScore[];
    onClearCandidatesForAnalysis: () => void;
    onAnalyzeJobFit: (job: JobDescription) => Promise<{ rankedCandidates: CandidateWithScore[]; keywords: string[] }>;
    onCancelAnalyzeJobFit: (jobId: number) => void;
    onOpenAIGenerateModal: () => void;
    onViewCandidate: (candidate: Candidate) => void;
    onScheduleMeeting: (candidate: Candidate, jobId?: string | null) => void;
    onScheduleBulk: (candidates: Candidate[], jobId?: string | null) => void;
    organizerEmail: string;
    apiRequest: (path: string, options?: RequestInit) => Promise<any>;
    showOwner?: boolean;
    confirmActionToast?: (message: string, yesLabel: string, noLabel: string) => Promise<boolean>;
    autoAnalyzeJobId?: number | null;
    onAutoAnalyzeHandled?: () => void;
    globalAnalysisData: { [key: number]: AnalysisResult };
    onUpdateAnalysisData: (jobId: number, data: Partial<AnalysisResult> | null) => void;
};

const ProjectDetailPage = ({ project, jobsForProject, onBack, onJobSelect, onJobEdit, onJobChangeJd, onJobCreateManually, candidates, onCandidateSelect, onUploadJds, stagedJds, isProcessingJds, processingJdsStatus, onProcessJds, onClearJds, onDeleteJobs, onRemoveJd, onDeleteCandidates, onEmailSelected, onEmailSelectedCandidates, candidatesForAnalysis, onClearCandidatesForAnalysis, onAnalyzeJobFit, onCancelAnalyzeJobFit, onOpenAIGenerateModal, onViewCandidate, onScheduleMeeting, onScheduleBulk, organizerEmail, apiRequest, showOwner = false, confirmActionToast, autoAnalyzeJobId = null, onAutoAnalyzeHandled, globalAnalysisData, onUpdateAnalysisData }: ProjectDetailPageProps) => {
    const confirmAction = useMemo(() => {
        if (confirmActionToast) return confirmActionToast;
        return async (message: string) => {
            toast.info(message);
            return false;
        };
    }, [confirmActionToast]);
    const [analyzingJobId, setAnalyzingJobId] = useState<number | null>(() => {
        // Restore active analysis if one is already in progress or has results in global state
        const activeJobId = Object.keys(globalAnalysisData).find(id => {
            const data = globalAnalysisData[Number(id)];
            return data && (data.loading || data.candidates.length > 0);
        });
        return activeJobId ? Number(activeJobId) : null;
    });
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);

    useEffect(() => {
        setSelectedJobIds([]);
    }, [jobsForProject]);
    
    const { totalPositions, filledPositions } = useMemo(() => {
        const total = jobsForProject.reduce((sum, job) => sum + (job.numberOfPositions || 1), 0);
        const filled = jobsForProject
            .filter(job => job.status === 'Closed')
            .reduce((sum, job) => sum + (job.numberOfPositions || 1), 0);
        return { totalPositions: total, filledPositions: filled };
    }, [jobsForProject]);

    const recruitmentProgress = totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;


    const clearAnalysisState = useCallback((jobId: number) => {
        setAnalyzingJobId(prev => (prev === jobId ? null : prev));
        onUpdateAnalysisData(jobId, null);
    }, [onUpdateAnalysisData]);

    const handleAnalyzeFit = async (job: JobDescription) => {
        const jobId = job.id;
        if (analyzingJobId === jobId) {
            onCancelAnalyzeJobFit(jobId);
            clearAnalysisState(jobId);
            return;
        }

        setAnalyzingJobId(jobId);

        if (!globalAnalysisData[jobId]) {
            onUpdateAnalysisData(jobId, { loading: true, candidates: [], keywords: [] });
            try {
                const { rankedCandidates, keywords } = await onAnalyzeJobFit(job);
                onUpdateAnalysisData(jobId, { loading: false, candidates: rankedCandidates, keywords });
            } catch (error: any) {
                if (error?.name === 'AbortError' || `${error?.message || ''}`.toLowerCase().includes('aborted')) {
                    clearAnalysisState(jobId);
                    return;
                }
                console.error('Analyze fit failed:', error);
                toast.error('Analyze fit failed. Please try again.');
                onUpdateAnalysisData(jobId, { loading: false, candidates: [], keywords: [] });
            }
        }
    };

    const handleSelectJob = (jobId: number) => {
        setSelectedJobIds(prev =>
            prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
        );
    };

    const handleSelectAllJobs = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedJobIds(jobsForProject.map(j => j.id));
        } else {
            setSelectedJobIds([]);
        }
    };

    const handleDeleteSelectedJobs = async () => {
        if (!selectedJobIds.length) return;
        const shouldDelete = await confirmAction(
            `Are you sure you want to delete ${selectedJobIds.length} selected jobs? This action cannot be undone.`,
            'Delete',
            'Cancel'
        );
        if (!shouldDelete) return;
        onDeleteJobs(selectedJobIds);
        setSelectedJobIds([]);
    };

    const handleDeleteJob = async (jobId: number) => {
        const job = jobsForProject.find(j => j.id === jobId);
        const shouldDelete = await confirmAction(
            `Are you sure you want to delete the job "${job?.title || 'this job'}"? This action cannot be undone.`,
            'Delete',
            'Cancel'
        );
        if (!shouldDelete) return;
        onDeleteJobs([jobId]);
    };

    useEffect(() => {
        if (!autoAnalyzeJobId) return;
        const targetJob = jobsForProject.find(j => j.id === autoAnalyzeJobId);
        if (!targetJob) return;
        setAnalyzingJobId(targetJob.id);
        if (!globalAnalysisData[targetJob.id]) {
            onUpdateAnalysisData(targetJob.id, { loading: true, candidates: [], keywords: [] });
            onAnalyzeJobFit(targetJob)
                .then(({ rankedCandidates, keywords }) => {
                    onUpdateAnalysisData(targetJob.id, { loading: false, candidates: rankedCandidates, keywords });
                })
                .catch((error: any) => {
                    if (error?.name === 'AbortError' || `${error?.message || ''}`.toLowerCase().includes('aborted')) {
                        clearAnalysisState(targetJob.id);
                        return;
                    }
                    console.error('Analyze fit failed:', error);
                    toast.error('Analyze fit failed. Please try again.');
                    onUpdateAnalysisData(targetJob.id, { loading: false, candidates: [], keywords: [] });
                });
        }
        onAutoAnalyzeHandled?.();
    }, [autoAnalyzeJobId, jobsForProject, globalAnalysisData, onAnalyzeJobFit, onAutoAnalyzeHandled, clearAnalysisState, onUpdateAnalysisData]);
    
    return (
    <div className="page-content">
         <button onClick={onBack} className="back-button">
            <span className="material-symbols-outlined">arrow_back</span> Back to All Projects
        </button>
        <div className="page-header with-action">
            <div>
                <h1>{project.project_name}</h1>
            </div>
             <div className="actions-group">
                {selectedJobIds.length > 0 ? (
                    <>
                        <div className="selection-info">
                            <input
                                type="checkbox"
                                onChange={handleSelectAllJobs}
                                checked={jobsForProject.length > 0 && selectedJobIds.length === jobsForProject.length}
                                ref={el => { if (el) { el.indeterminate = selectedJobIds.length > 0 && selectedJobIds.length < jobsForProject.length; }}}
                                title="Select all jobs in this project"
                                id="select-all-jobs-checkbox"
                            />
                            <label htmlFor="select-all-jobs-checkbox">{selectedJobIds.length} job(s) selected</label>
                        </div>
                        {showOwner && (
                            <button className="btn btn-danger" onClick={handleDeleteSelectedJobs}>
                                <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={onUploadJds}>
                            <span className="material-symbols-outlined">upload</span> Upload JDs
                        </button>
                         <button className="btn btn-secondary" onClick={onOpenAIGenerateModal}>
                            <span className="material-symbols-outlined">auto_awesome</span> Generate with AI
                        </button>
                        <button className="btn btn-primary" onClick={onJobCreateManually}>
                            <span className="material-symbols-outlined">add</span> Create Manually
                        </button>
                    </>
                )}
            </div>
        </div>
        
        <div className="job-detail-grid" style={{gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <div className="card" style={{ padding: '24px' }}>
                     <div className="project-details-grid">
                        <div style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> <p>{project.project_description || 'N/A'}</p></div>
                    </div>
                    <div className="recruitment-progress-container" style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600 }}>Recruitment Progress</span>
                            <span style={{ fontWeight: 600 }}>{filledPositions} / {totalPositions} Positions Filled</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-inner" style={{ width: `${recruitmentProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                {candidatesForAnalysis && candidatesForAnalysis.length > 0 && (
                    <div className="analysis-toolbar-card">
                        <p>
                            Analyzing <strong>{candidatesForAnalysis.length} selected candidate(s)</strong>.
                            Click 'Analyze Fit' on any job below to see the results.
                        </p>
                        <div className="analysis-candidate-list">
                            {candidatesForAnalysis.slice(0, 5).map(c => (
                                <div key={c.id} className="user-avatar small" title={c.name}>{c.avatar}</div>
                            ))}
                            {candidatesForAnalysis.length > 5 && <div className="user-avatar small">+{candidatesForAnalysis.length - 5}</div>}
                        </div>
                        <button className="btn btn-secondary" onClick={onClearCandidatesForAnalysis}>
                            <span className="material-symbols-outlined">close</span> Clear Selection
                        </button>
                    </div>
                )}

                {stagedJds.length > 0 && <ProcessingQueue stagedFiles={stagedJds} isProcessing={isProcessingJds} processingStatus={processingJdsStatus} onProcess={onProcessJds} onClear={onClearJds} onRemoveFile={onRemoveJd} itemType="job description" />}
                
                {jobsForProject.length > 0 ? (
                    <div className="job-list-container">
                        {jobsForProject.map(job => (
                            <React.Fragment key={job.id}>
                                                                 <JobCard 
                                                                    job={job} 
                                                                    onJobSelect={onJobSelect} 
                                                                    onAnalyzeFit={() => handleAnalyzeFit(job)}
                                                                    onCancelAnalyzeFit={() => {
                                                                        onCancelAnalyzeJobFit(job.id);
                                                                        clearAnalysisState(job.id);
                                                                    }}
                                                                    isAnalyzing={analyzingJobId === job.id}
                                                                    isProcessingAnalysis={globalAnalysisData[job.id]?.loading || false}
                                                                    onEdit={onJobEdit}
                                                                    onChangeJd={onJobChangeJd}
                                                                    isSelected={selectedJobIds.includes(job.id)}
                                                                    onSelect={handleSelectJob}
                                                                    onDelete={handleDeleteJob}
                                                                    showOwner={showOwner}
                                                                    canDelete={showOwner}
                                                                 />                                {analyzingJobId === job.id && (
                                    <InlineATSAnalysis
                                        job={job}
                                        analysisResult={globalAnalysisData[job.id]}
                                        onCandidateSelect={onCandidateSelect}
                                        onDeleteCandidates={onDeleteCandidates}
                                        onEmailSelected={onEmailSelected}
                                        onEmailSelectedCandidates={onEmailSelectedCandidates}
                                        onViewCandidate={onViewCandidate}
                                        onScheduleMeeting={onScheduleMeeting}
                                        onScheduleBulk={onScheduleBulk}
                                        organizerEmail={organizerEmail}
                                        apiRequest={apiRequest}
                                        confirmActionToast={confirmActionToast}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    stagedJds.length === 0 && (
                        <div className="empty-state large">
                            <span className="material-symbols-outlined">work_outline</span>
                            <h3>No Job Descriptions in this Project Yet</h3>
                            <p>Create your first job description to start matching candidates.</p>
                            <button className="btn btn-primary" onClick={onJobCreateManually}>Create Job Description</button>
                        </div>
                    )
                )}
            </div>
        </div>
    </div>
    )
};

export default ProjectDetailPage;
