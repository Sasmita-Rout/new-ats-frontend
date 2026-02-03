import React, { useState, useEffect, useMemo } from 'react';
import { JobDescription, Candidate, Project, CandidateWithScore, User } from '../types/types';
import JobCard from '../components/jobs/JobCard';
import InlineATSAnalysis from '../components/jobs/InlineATSAnalysis';
import ProcessingQueue from '../components/common/ProcessingQueue';
import { getInitials } from '../utils/helpers';

type AnalysisResult = {
    loading: boolean;
    candidates: CandidateWithScore[];
    keywords: string[];
};

const ProjectDetailPage = ({ project, jobsForProject, onBack, onJobSelect, onJobCreateManually, onJobStatusUpdate, candidates, onCandidateSelect, onUploadJds, stagedJds, isProcessingJds, processingJdsStatus, onProcessJds, onClearJds, onDeleteJobs, onRemoveJd, onDeleteCandidates, onEmailSelected, candidatesForAnalysis, onClearCandidatesForAnalysis, onAnalyzeJobFit, onOpenAIGenerateModal, onAddTeamMember, allUsers }) => {
    const [analyzingJobId, setAnalyzingJobId] = useState<number | null>(null);
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
    const [analysisData, setAnalysisData] = useState<{ [key: number]: AnalysisResult }>({});


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


    const handleAnalyzeFit = async (job: JobDescription) => {
        const jobId = job.id;
        if (analyzingJobId === jobId) {
            setAnalyzingJobId(null);
            return;
        }

        setAnalyzingJobId(jobId);

        if (!analysisData[jobId]) {
            setAnalysisData(prev => ({ ...prev, [jobId]: { loading: true, candidates: [], keywords: [] } }));
            const { rankedCandidates, keywords } = await onAnalyzeJobFit(job);
            setAnalysisData(prev => ({ ...prev, [jobId]: { loading: false, candidates: rankedCandidates, keywords } }));
        }
    };

    const handleReAnalyze = (job: JobDescription) => {
        setAnalysisData(prev => {
            const newState = { ...prev };
            delete newState[job.id];
            return newState;
        });
        handleAnalyzeFit(job);
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

    const handleDeleteSelectedJobs = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedJobIds.length} selected jobs? This action cannot be undone.`)) {
            onDeleteJobs(selectedJobIds);
            setSelectedJobIds([]);
        }
    };

    const handleLocalDeleteCandidates = (ids: number[]) => {
        onDeleteCandidates(ids);
        setAnalysisData(prev => {
            const newData = { ...prev };
            Object.keys(newData).forEach(key => {
                const jobId = Number(key);
                if (newData[jobId]?.candidates) {
                    newData[jobId] = {
                        ...newData[jobId],
                        candidates: newData[jobId].candidates.filter(c => !ids.includes(c.id))
                    };
                }
            });
            return newData;
        });
    };
    
    return (
    <div className="page-content">
         <button onClick={onBack} className="back-button">
            <span className="material-symbols-outlined">arrow_back</span> Back to All Projects
        </button>
        <div className="page-header with-action">
            <div>
                <h1>{project.name}</h1>
                <p>Client / Department: {project.clientOrDepartment}</p>
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
                        <button className="btn btn-danger" onClick={handleDeleteSelectedJobs}>
                            <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={() => onAddTeamMember(project)}>
                            <span className="material-symbols-outlined">person_add</span> Add Member
                        </button>
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
        
        <div className="job-detail-grid" style={{gridTemplateColumns: '1fr', alignItems: 'start'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            {project.description && <p style={{ marginBottom: '12px', color: '#555', fontSize: '14px' }}>{project.description}</p>}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#666' }}>calendar_today</span>
                                    <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#666' }}>attach_money</span>
                                    <span>{project.budget || 'N/A'}</span>
                                </div>
                                <span className={`status-pill ${project.priority?.toLowerCase()}`}>{project.priority} Priority</span>
                                <span className={`status-pill ${project.status.toLowerCase().replace(' ', '-')}`}>{project.status}</span>
                            </div>
                        </div>
                        <div className="recruitment-progress-container" style={{ width: '250px', marginTop: '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                                <span style={{ fontWeight: 600 }}>Progress</span>
                                <span>{filledPositions} / {totalPositions} Filled</span>
                            </div>
                            <div className="progress-bar" style={{ height: '8px' }}>
                                <div className="progress-bar-inner" style={{ width: `${recruitmentProgress}%` }}></div>
                            </div>
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
                                                                    isAnalyzing={analyzingJobId === job.id}
                                                                    isProcessingAnalysis={analysisData[job.id]?.loading || false}
                                                                    onStatusUpdate={onJobStatusUpdate}
                                                                    isSelected={selectedJobIds.includes(job.id)}
                                                                    onSelect={handleSelectJob}
                                                                    onDelete={(jobId) => onDeleteJobs([jobId])}
                                                                 />                                {analyzingJobId === job.id && (
                                     <InlineATSAnalysis
                                        job={job}
                                        analysisResult={analysisData[job.id] || { loading: true, candidates: [], keywords: [] }}
                                        onCandidateSelect={onCandidateSelect}
                                        onDeleteCandidates={handleLocalDeleteCandidates}
                                        onEmailSelected={onEmailSelected}
                                        onReAnalyze={() => handleReAnalyze(job)}
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