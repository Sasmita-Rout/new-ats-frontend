import React, { useState, useEffect } from 'react';
import { Project } from '../types/types';

const ProjectEditorModal = ({ isOpen, onClose, onSave, projectToEdit }) => {
    const getInitialState = (): Partial<Project> => ({
        name: '',
        clientOrDepartment: '',
        status: 'Active',
        description: '',
        priority: 'Medium',
        startDate: '',
        endDate: '',
        budget: '',
    });

    const [projectData, setProjectData] = useState(getInitialState());

    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                 setProjectData({
                    ...projectToEdit,
                    startDate: projectToEdit.startDate ? projectToEdit.startDate.split('T')[0] : '', // Format for date input
                    endDate: projectToEdit.endDate ? projectToEdit.endDate.split('T')[0] : '', // Format for date input
                });
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
                            <input name="name" value={projectData.name} onChange={handleChange} required placeholder="e.g., Q3 Frontend Engineering Hiring" />
                        </div>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label>Project Description</label>
                            <textarea name="description" value={projectData.description} onChange={handleChange} rows={3} placeholder="A short summary of the project goals." />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Client / Department</label>
                                <input name="clientOrDepartment" value={projectData.clientOrDepartment} onChange={handleChange} required placeholder="e.g., Accion Digital" />
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select name="priority" value={projectData.priority} onChange={handleChange}>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                             <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" name="startDate" value={projectData.startDate} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input type="date" name="endDate" value={projectData.endDate} onChange={handleChange} />
                            </div>
                             <div className="form-group">
                                <label>Budget (Optional)</label>
                                <input name="budget" value={projectData.budget} onChange={handleChange} placeholder="e.g., $50,000" />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={projectData.status} onChange={handleChange}>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
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