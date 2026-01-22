import React, { useState, useCallback, useRef } from 'react';
import { Candidate, JobDescription, MatchResult } from '../../types/types';
import MatchResultModal from '../../modals/MatchResultModal';

interface RecruiterToolsPageProps {
    onParseCandidate: (file: File) => Promise<Candidate | null>;
    onParseJd: (file: File) => Promise<Partial<JobDescription> | null>;
    onAnalyzeFit: (candidate: Candidate, jd: Partial<JobDescription>) => Promise<MatchResult | null>;
}

const UploadPanel = ({ title, icon, subtitle, file, parsedData, isLoading, onFileSelect, onClear, type }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div 
            className={`upload-panel ${type}-panel ${isDragOver ? 'is-drag-over' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => !file && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <input type="file" ref={inputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} />
            <div className="panel-content">
                {!file ? (
                    <>
                        <span className="material-symbols-outlined panel-icon">{icon}</span>
                        <h3 className="panel-title">{title}</h3>
                        <p className="panel-subtitle">{subtitle}</p>
                    </>
                ) : isLoading ? (
                    <>
                        <span className="material-symbols-outlined panel-icon spin">autorenew</span>
                        <p className="panel-loading-state">AI is parsing your document...</p>
                    </>
                ) : parsedData ? (
                    <div className="panel-success-state">
                        <span className="material-symbols-outlined">check_circle</span>
                        <p className="file-name">{file.name}</p>
                        <p className="parsed-name">{parsedData.name || parsedData.title}</p>
                        <button className="panel-clear-btn" onClick={(e) => {e.stopPropagation(); onClear();}}>Upload another file</button>
                    </div>
                ) : (
                     <div className="panel-success-state">
                        <span className="material-symbols-outlined" style={{color: '#EF4444'}}>error</span>
                        <p className="file-name">{file.name}</p>
                        <p className="parsed-name" style={{color: '#B91C1C'}}>Parsing Failed</p>
                        <button className="panel-clear-btn" onClick={(e) => {e.stopPropagation(); onClear();}}>Try again</button>
                    </div>
                )}
            </div>
        </div>
    );
}

const RecruiterToolsPage: React.FC<RecruiterToolsPageProps> = ({ onParseCandidate, onParseJd, onAnalyzeFit }) => {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [parsedCandidate, setParsedCandidate] = useState<Candidate | null>(null);
    const [parsedJd, setParsedJd] = useState<Partial<JobDescription> | null>(null);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [isParsingJd, setIsParsingJd] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleResumeSelect = async (file: File) => {
        setResumeFile(file);
        setIsParsingResume(true);
        const result = await onParseCandidate(file);
        setParsedCandidate(result);
        setIsParsingResume(false);
    };

    const handleJdSelect = async (file: File) => {
        setJdFile(file);
        setIsParsingJd(true);
        const result = await onParseJd(file);
        setParsedJd(result);
        setIsParsingJd(false);
    };

    const handleClearResume = () => {
        setResumeFile(null);
        setParsedCandidate(null);
    };

    const handleClearJd = () => {
        setJdFile(null);
        setParsedJd(null);
    };

    const handleAnalyze = async () => {
        if (!parsedCandidate || !parsedJd) return;
        setIsAnalyzing(true);
        const result = await onAnalyzeFit(parsedCandidate, parsedJd);
        setMatchResult(result);
        setIsAnalyzing(false);
        if (result) {
            setIsModalOpen(true);
        }
    };
    
    return (
        <div className="page-content">
            <div className="page-header" style={{textAlign: 'center'}}>
                <h1>Instant ATS Checker</h1>
                <p>Upload a resume and a job description to get an instant AI-powered match analysis.</p>
            </div>
            <div className="instant-ats-checker-page">
                <main className="ats-checker-main">
                    <UploadPanel 
                        title="1. Upload Resume"
                        icon="badge"
                        subtitle="Drag & drop or click to upload a candidate's resume."
                        file={resumeFile}
                        parsedData={parsedCandidate}
                        isLoading={isParsingResume}
                        onFileSelect={handleResumeSelect}
                        onClear={handleClearResume}
                        type="resume"
                    />
                    <UploadPanel 
                        title="2. Upload Job Description"
                        icon="description"
                        subtitle="Drag & drop or click to upload a job description."
                        file={jdFile}
                        parsedData={parsedJd}
                        isLoading={isParsingJd}
                        onFileSelect={handleJdSelect}
                        onClear={handleClearJd}
                        type="jd"
                    />
                </main>
                <footer className="ats-checker-footer">
                    <button 
                        className="btn btn-primary" 
                        style={{padding: '16px 32px', fontSize: '18px'}}
                        disabled={!parsedCandidate || !parsedJd || isAnalyzing}
                        onClick={handleAnalyze}
                    >
                        <span className="material-symbols-outlined">{isAnalyzing ? 'autorenew' : 'bolt'}</span>
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
                    </button>
                </footer>
            </div>
            {isModalOpen && matchResult && (
                <MatchResultModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    result={matchResult}
                />
            )}
        </div>
    );
};

export default RecruiterToolsPage;
