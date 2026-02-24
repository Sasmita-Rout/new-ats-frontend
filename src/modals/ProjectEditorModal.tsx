import React, { useState, useEffect } from 'react';
import { Project } from '../types/types';

const ProjectEditorModal = ({ isOpen, onClose, onSave, projectToEdit }) => {
    const getInitialState = (): Partial<Project> => ({
        project_name: '',
        project_description: '',
        status: 'active',
    });

    const [projectData, setProjectData] = useState(getInitialState());

    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                setProjectData({ ...projectToEdit });
            } else {
                setProjectData(getInitialState());
            }
        }
    }, [isOpen, projectToEdit]);

    if (!isOpen) return null;

    const isEditMode = !!projectToEdit;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(projectData);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEditMode ? 'Edit Project' : 'Create New Project'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                         <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label>Project Name</label>
                            <input name="project_name" value={projectData.project_name || ''} onChange={handleChange} required placeholder="e.g., Q3 Frontend Engineering Hiring" />
                        </div>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label>Project Description</label>
                            <textarea name="project_description" value={projectData.project_description || ''} onChange={handleChange} rows={3} placeholder="A short summary of the project goals." />
                        </div>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label>Status</label>
                            <select name="status" value={projectData.status || 'active'} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Create Project'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectEditorModal;
