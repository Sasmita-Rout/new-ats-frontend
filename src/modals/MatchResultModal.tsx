import React from 'react';
import { MatchResult } from '../types/types';
import SkillTag from '../components/common/SkillTag';

interface MatchResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: MatchResult;
    analysisStats?: {
        count: number;
        bestCandidateName: string;
    };
}

const MatchResultModal: React.FC<MatchResultModalProps> = ({ isOpen, onClose, result, analysisStats }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content match-result-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{analysisStats ? 'Best Match Analysis' : 'AI Match Analysis Complete'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body match-result-modal-body">
                    {analysisStats && (
                        <div className="ai-summary" style={{ textAlign: 'center', width: '100%', background: 'var(--hover-color-light)' }}>
                            Showing the best match for <strong>{analysisStats.bestCandidateName}</strong> out of <strong>{analysisStats.count}</strong> resumes analyzed.
                        </div>
                    )}
                    <div className="match-result-score-container">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <defs>
                                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="circle"
                                strokeDasharray={`${result.matchScore}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span className="score-text">{result.matchScore}%</span>
                    </div>

                    <div className="ai-summary">
                        <strong>AI Summary:</strong> {result.summary}
                    </div>

                    <div className="skills-comparison-modal">
                        <div className="skills-column">
                            <h5 className="matching"><span className="material-symbols-outlined">done</span> Matching Skills ({result.matchingSkills.length})</h5>
                            <div className="skills-container">
                                {result.matchingSkills.length > 0 ? (
                                    result.matchingSkills.map(skill => <SkillTag key={skill} tag={skill} className="matching" />)
                                ) : (
                                    <p className="placeholder-text">No direct skill matches found.</p>
                                )}
                            </div>
                        </div>
                        <div className="skills-column">
                            <h5 className="missing"><span className="material-symbols-outlined">close</span> Missing Skills ({result.missingSkills.length})</h5>
                             <div className="skills-container">
                                {result.missingSkills.length > 0 ? (
                                    result.missingSkills.map(skill => <SkillTag key={skill} tag={skill} className="missing" />)
                                ) : (
                                    <p className="placeholder-text">No missing skills. Perfect match!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default MatchResultModal;