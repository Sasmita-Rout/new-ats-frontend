import React, { useState } from 'react';

const AIGenerateJDModal = ({ isOpen, onClose, onGenerate, isGenerating }) => {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onGenerate(prompt);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Generate Job Description with AI</h3>
                    <button onClick={onClose} className="close-btn" disabled={isGenerating}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p className="modal-subtitle">Describe the job you want to create, and the AI will draft a complete job description for you to review and edit.</p>
                        <div className="prompt-examples">
                            <strong>Some examples:</strong>
                            <ul>
                                <li>"A senior Java developer with 5+ years of experience in Spring Boot and AWS cloud services."</li>
                                <li>"A junior UI/UX designer skilled in Figma and user research for a mobile app."</li>
                                <li>"Lead data scientist with a PhD and experience in machine learning models for the finance industry."</li>
                            </ul>
                        </div>
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label htmlFor="ai-jd-prompt">Your Prompt</label>
                            <textarea
                                id="ai-jd-prompt"
                                rows={4}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="e.g., A mid-level full-stack developer with experience in React and Node.js..."
                                required
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isGenerating || !prompt}>
                            {isGenerating ? 'Generating...' : 'Generate Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIGenerateJDModal;
