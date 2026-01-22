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
        experience: '0 - 2 Years',
        description: '',
        requiredSkills: []
    });
    const [skillInput, setSkillInput] = useState('');
    const [minExp, setMinExp] = useState(0);
    const [maxExp, setMaxExp] = useState(2);

    useEffect(() => {
        if (isOpen) {
            if (jobToEdit) {
                setFormData(jobToEdit);
                // Try to parse experience range "min - max"
                const expParts = jobToEdit.experience?.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
                if (expParts) {
                    setMinExp(parseFloat(expParts[1]));
                    setMaxExp(parseFloat(expParts[3]));
                } else {
                    const single = parseFloat(jobToEdit.experience || '0');
                    if (!isNaN(single)) {
                        setMinExp(single);
                        setMaxExp(single + 2);
                    } else {
                        setMinExp(0);
                        setMaxExp(2);
                    }
                }
            } else {
                setFormData({
                    title: '',
                    location: '',
                    experience: '0 - 2 Years',
                    description: '',
                    requiredSkills: []
                });
                setMinExp(0);
                setMaxExp(2);
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
            const newMin = Math.min(val, maxExp - 0.5);
            setMinExp(newMin);
        } else {
            const newMax = Math.max(val, minExp + 0.5);
            setMaxExp(newMax);
        }
    };

    useEffect(() => {
        setFormData(prev => ({ ...prev, experience: `${minExp} - ${maxExp} Years` }));
    }, [minExp, maxExp]);

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
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{jobToEdit ? 'Edit Job' : 'Create New Job'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Job Title</label>
                            <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Senior Java Developer" />
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. New York, Remote" />
                        </div>

                        <div className="form-group">
                            <label style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span>Experience Range</span>
                                <span style={{fontWeight: 'bold', color: 'var(--primary-color)'}}>{minExp} - {maxExp} Years</span>
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
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888'}}>
                                <span>0 Yrs</span>
                                <span>30 Yrs</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Job Description (JD)</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={6} required placeholder="Enter the detailed job description..." />
                        </div>

                        <div className="form-group">
                            <label>Required Skills</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input 
                                    value={skillInput} 
                                    onChange={e => setSkillInput(e.target.value)} 
                                    placeholder="Type a skill and press Enter or Add"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                />
                                <button type="button" className="btn btn-secondary" onClick={handleAddSkill}>Add</button>
                            </div>
                            <div className="skills-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.requiredSkills?.map((skill, index) => (
                                    <span key={index} className="skill-tag" style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {skill}
                                        <button type="button" onClick={() => handleRemoveSkill(index)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1D4ED8', padding: 0, display: 'flex' }}>
                                            <span className="material-symbols-outlined" style={{fontSize: '16px'}}>close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobEditorModal;