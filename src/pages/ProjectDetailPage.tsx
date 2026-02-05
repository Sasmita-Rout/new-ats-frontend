import React, { useState, useEffect, useMemo } from 'react';
import { JobDescription, Candidate, Project, CandidateWithScore } from '../types/types';
import JobCard from '../components/jobs/JobCard';
import InlineATSAnalysis from '../components/jobs/InlineATSAnalysis';
import ProcessingQueue from '../components/common/ProcessingQueue';

type AnalysisResult = {
    loading: boolean;
    candidates: CandidateWithScore[];
    keywords: string[];
};

const ProjectDetailPage = ({ project, jobsForProject, onBack, onJobSelect, onJobEdit, onJobChangeJd, onJobCreateManually, candidates, onCandidateSelect, onUploadJds, stagedJds, isProcessingJds, processingJdsStatus, onProcessJds, onClearJds, onDeleteJobs, onRemoveJd, onDeleteCandidates, onEmailSelected, candidatesForAnalysis, onClearCandidatesForAnalysis, onAnalyzeJobFit, onOpenAIGenerateModal }) => {
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
                        <button className="btn btn-danger" onClick={handleDeleteSelectedJobs}>
                            <span className="material-symbols-outlined">delete_sweep</span> Delete Selected
                        </button>
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
                                                                    isAnalyzing={analyzingJobId === job.id}
                                                                    isProcessingAnalysis={analysisData[job.id]?.loading || false}
                                                                    onEdit={onJobEdit}
                                                                    onChangeJd={onJobChangeJd}
                                                                    isSelected={selectedJobIds.includes(job.id)}
                                                                    onSelect={handleSelectJob}
                                                                    onDelete={(jobId) => onDeleteJobs([jobId])}
                                                                 />                                {analyzingJobId === job.id && (
                                     <InlineATSAnalysis
                                        job={job}
                                        analysisResult={analysisData[job.id]}
                                        onCandidateSelect={onCandidateSelect}
                                        onDeleteCandidates={onDeleteCandidates}
                                        onEmailSelected={onEmailSelected}
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
