import React, { useState, useEffect } from 'react';
import { JobDescription } from '../types/types';

interface JobEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (job: Partial<JobDescription>) => void;
    jobToEdit: JobDescription | null;
}

const JobEditorModal: React.FC<JobEditorModalProps> = ({ isOpen, onClose, onSave, jobToEdit }) => {
    const [formData, setFormData] = useState<Partial<JobDescription>>({
        title: '',
        location: '',
        experience: '0 - 5 Years',
        description: '',
        requiredSkills: []
    });
    const [skillInput, setSkillInput] = useState('');
    const [minExp, setMinExp] = useState(0);
    const [maxExp, setMaxExp] = useState(5);
    const descriptionRef = React.useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (jobToEdit) {
                setFormData(jobToEdit);
                // Try to parse experience range "min - max"
                const expParts = jobToEdit.experience?.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
                if (expParts) {
                    const parsedMax = parseFloat(expParts[3]);
                    setMinExp(0);
                    setMaxExp(Number.isFinite(parsedMax) ? Math.max(parsedMax, 0) : 5);
                } else {
                    const single = parseFloat(jobToEdit.experience || '0');
                    if (!isNaN(single)) {
                        setMinExp(0);
                        setMaxExp(Math.max(single, 5));
                    } else {
                        setMinExp(0);
                        setMaxExp(5);
                    }
                }
            } else {
                setFormData({
                    title: '',
                    location: '',
                    experience: '0 - 5 Years',
                    description: '',
                    requiredSkills: []
                });
                setMinExp(0);
                setMaxExp(5);
            }
        }
    }, [isOpen, jobToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
        const val = parseFloat(e.target.value);
        if (type === 'min') {
            const newMin = Math.min(val, maxExp);
            setMinExp(newMin);
        } else {
            const newMax = Math.max(val, minExp);
            setMaxExp(newMax);
        }
    };

    useEffect(() => {
        setFormData(prev => ({ ...prev, experience: `${minExp} - ${maxExp} Years` }));
    }, [minExp, maxExp]);

    useEffect(() => {
        if (!descriptionRef.current) return;
        descriptionRef.current.style.height = 'auto';
        descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }, [formData.description, isOpen]);

    const handleAddSkill = () => {
        if (skillInput.trim()) {
            setFormData(prev => ({
                ...prev,
                requiredSkills: [...(prev.requiredSkills || []), skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (index: number) => {
        setFormData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills?.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    const minPercent = (minExp / 30) * 100;
    const maxPercent = (maxExp / 30) * 100;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content job-editor-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{jobToEdit ? 'Edit Job' : 'Create New Job'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="job-editor-form">
                    <div className="modal-body">
                        <div className="job-editor-top-grid">
                            <div className="form-group">
                                <label>Job Title</label>
                                <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Senior React Developer" />
                            </div>

                            <div className="form-group">
                                <label>Location</label>
                                <input name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Remote / New York" />
                            </div>
                        </div>

                        <div className="form-group experience-range-group">
                            <label className="experience-range-label">
                                <span>Experience Range</span>
                                <span className="experience-range-pill">{minExp} Years - {maxExp} Years</span>
                            </label>
                            <div className="dual-range-slider-container">
                                <div className="slider-track-bg"></div>
                                <div 
                                    className="slider-track-fill" 
                                    style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                                ></div>
                                <input type="range" min="0" max="30" step="0.5" value={minExp} onChange={(e) => handleSliderChange(e, 'min')} className="range-input" />
                                <input type="range" min="0" max="30" step="0.5" value={maxExp} onChange={(e) => handleSliderChange(e, 'max')} className="range-input" />
                            </div>
                            <div className="experience-range-scale">
                                <span>0 Years</span>
                                <span>30+ Yrs</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Job Description (JD)</label>
                            <textarea ref={descriptionRef} name="description" value={formData.description} onChange={handleChange} rows={6} required placeholder="Enter the detailed job description..." />
                        </div>

                        <div className="form-group">
                            <label>Required Skills</label>
                            <div className="skills-input-row">
                                <input 
                                    value={skillInput} 
                                    onChange={e => setSkillInput(e.target.value)} 
                                    placeholder="Type a skill and press Enter or Add"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                />
                                <button type="button" className="btn btn-primary" onClick={handleAddSkill}>Add</button>
                            </div>
                            <div className="skills-container job-editor-skills">
                                {formData.requiredSkills?.map((skill, index) => (
                                    <span key={index} className="job-editor-skill-chip">
                                        {skill}
                                        <button type="button" className="job-editor-skill-remove" onClick={() => handleRemoveSkill(index)}>
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <div className="job-editor-footer-right">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobEditorModal;
