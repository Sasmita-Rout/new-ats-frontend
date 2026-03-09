import React, { useState, useEffect } from 'react';
import { JobDescription } from '../types/types';

interface JobEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (job: Partial<JobDescription>) => void;
    jobToEdit: JobDescription | null;
}

const EXP_LIMIT = 30;

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

    const parseExperienceString = (exp: string | undefined): [number, number] => {
        if (!exp) return [0, 5];
        const cleaned = exp.toLowerCase().replace(/[^0-9.+-]/g, ' ').trim();
        const numbers = cleaned.split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
        if (exp.includes('-')) return [numbers[0] ?? 0, numbers[1] ?? 5];
        if (exp.includes('up to')) return [0, numbers[0] ?? 5];
        if (exp.includes('+')) return [numbers[0] ?? 0, EXP_LIMIT];
        if (numbers.length === 1) return [numbers[0], EXP_LIMIT];
        return [0, 5];
    };

    useEffect(() => {
        if (isOpen) {
            if (jobToEdit) {
                setFormData(jobToEdit);
                const [parsedMin, parsedMax] = parseExperienceString(jobToEdit.experience);
                setMinExp(parsedMin);
                setMaxExp(parsedMax);
            } else {
                setFormData({ title: '', location: '', experience: '0 - 5 Years', description: '', requiredSkills: [] });
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
            setMinExp(Math.min(val, maxExp));
        } else {
            setMaxExp(Math.max(val, minExp));
        }
    };

    useEffect(() => {
        if (maxExp >= EXP_LIMIT) {
            setFormData(prev => ({ ...prev, experience: `${minExp}+ Years` }));
        } else {
            setFormData(prev => ({ ...prev, experience: `${minExp} - ${maxExp} Years` }));
        }
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

    const minPercent = (minExp / EXP_LIMIT) * 100;
    const maxPercent = (maxExp / EXP_LIMIT) * 100;

    const PRIMARY = '#6366f1';

    return (
        <div className="modal-overlay" onClick={onClose}>

            <style>{`
                .range-input-blue {
                    position: absolute;
                    width: 100%;
                    height: 6px;
                    background: transparent !important;
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    pointer-events: all !important;
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .range-input-blue:focus {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .range-input-blue::-webkit-slider-runnable-track {
                    background: transparent !important;
                    height: 6px;
                }
                .range-input-blue::-webkit-slider-thumb {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    width: 16px !important;
                    height: 16px !important;
                    border-radius: 50% !important;
                    background: #ffffff !important;
                    border: 2.5px solid ${PRIMARY} !important;
                    cursor: pointer !important;
                    pointer-events: all !important;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
                    transition: box-shadow 0.2s;
                    margin-top: -6px !important;
                }
                .range-input-blue::-webkit-slider-thumb:hover {
                    box-shadow: 0 0 0 6px rgba(99,102,241,0.15) !important;
                }
                .range-input-blue:focus::-webkit-slider-thumb {
                    box-shadow: 0 0 0 4px rgba(99,102,241,0.2) !important;
                    outline: none !important;
                }
                .range-input-blue::-moz-range-track {
                    background: transparent !important;
                    height: 6px;
                }
                .range-input-blue::-moz-range-thumb {
                    width: 18px !important;
                    height: 18px !important;
                    border-radius: 50% !important;
                    background: #ffffff !important;
                    border: 2.5px solid ${PRIMARY} !important;
                    cursor: pointer !important;
                    pointer-events: all !important;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
                }
                .range-input-blue::-moz-focus-outer {
                    border: 0 !important;
                }
                .job-editor-top-grid {
                    margin-bottom: 4px !important;
                }
                .job-editor-form .form-group {
                    margin-bottom: 20px !important;
                }
                .job-editor-form .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 0.95rem;
                }
            `}</style>

            <div className="modal-content job-editor-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{jobToEdit ? 'Edit Job' : 'Create New Job'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="job-editor-form">
                    <div className="modal-body" style={{ padding: '24px' }}>

                        {/* Job Title + Location */}
                        <div className="job-editor-top-grid" style={{ marginBottom: '4px' }}>
                            <div className="form-group">
                                <label>Job Title</label>
                                <input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Senior React Developer"
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Remote / New York"
                                />
                            </div>
                        </div>

                        {/* Experience Range */}
                        <div className="form-group" style={{ marginBottom: '20px' }}>

                            {/* Label + pill */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '14px'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Experience Range</span>
                                <span style={{
                                    background: 'rgba(99,102,241,0.08)',
                                    color: PRIMARY,
                                    border: `1.5px solid ${PRIMARY}`,
                                    borderRadius: '20px',
                                    padding: '4px 16px',
                                    fontWeight: 600,
                                    fontSize: '0.88rem'
                                }}>
                                    {minExp} Years - {maxExp >= EXP_LIMIT ? `${EXP_LIMIT}+` : maxExp} Years
                                </span>
                            </div>

                            {/* Slider track */}
                            <div style={{
                                position: 'relative',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                {/* Gray background */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0, right: 0,
                                    height: '6px',
                                    background: '#e2e8f0',
                                    borderRadius: '4px',
                                    zIndex: 1,
                                    pointerEvents: 'none'
                                }} />
                                {/* Colored fill */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${minPercent}%`,
                                    right: `${100 - maxPercent}%`,
                                    height: '6px',
                                    background: PRIMARY,
                                    borderRadius: '4px',
                                    zIndex: 2,
                                    pointerEvents: 'none'
                                }} />
                                {/* Min input */}
                                <input
                                    type="range" min="0" max={EXP_LIMIT} step="0.5"
                                    value={minExp}
                                    onChange={(e) => handleSliderChange(e, 'min')}
                                    className="range-input-blue"
                                    style={{ zIndex: minExp >= maxExp ? 5 : 3, pointerEvents: 'all' }}
                                />
                                {/* Max input */}
                                <input
                                    type="range" min="0" max={EXP_LIMIT} step="0.5"
                                    value={maxExp}
                                    onChange={(e) => handleSliderChange(e, 'max')}
                                    className="range-input-blue"
                                    style={{ zIndex: minExp >= maxExp ? 3 : 4, pointerEvents: 'all' }}
                                />
                            </div>

                            {/* Scale labels */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.78rem',
                                color: '#94a3b8',
                                marginTop: '4px'
                            }}>
                                <span>0 Years</span>
                                <span>{EXP_LIMIT}+ Yrs</span>
                            </div>
                        </div>

                        {/* Job Description */}
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
                                Job Description (JD)
                            </label>
                            <textarea
                                ref={descriptionRef}
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={6}
                                required
                                placeholder="Enter the detailed job description..."
                            />
                        </div>

                        {/* Required Skills */}
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
                                Required Skills
                            </label>
                            <div className="skills-input-row" style={{ marginBottom: '12px' }}>
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
                                        <button
                                            type="button"
                                            className="job-editor-skill-remove"
                                            onClick={() => handleRemoveSkill(index)}
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
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