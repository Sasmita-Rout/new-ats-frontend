import React, { useState, useEffect } from 'react';

const CandidateEditorModal = ({ isOpen, onClose, onSave }) => {
    const getInitialState = () => ({
        name: '',
        title: '',
        email: '',
        skills: '',
        summary: '',
    });

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name: formData.name,
            title: formData.title,
            contact: { email: formData.email },
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            summary: formData.summary,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Manually Enter Resume Details</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        <div className="form-grid single-col">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., Jane Doe" />
                            </div>
                            <div className="form-group">
                                <label>Current Job Title</label>
                                <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Senior Software Engineer" />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g., jane.doe@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Skills (comma-separated)</label>
                                <textarea name="skills" value={formData.skills} onChange={handleChange} rows={3} placeholder="e.g., React, Node.js, TypeScript" />
                            </div>
                            <div className="form-group">
                                <label>Summary or Experience</label>
                                <textarea name="summary" value={formData.summary} onChange={handleChange} rows={5} placeholder="Paste a brief summary or key experience highlights." />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Candidate</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CandidateEditorModal;