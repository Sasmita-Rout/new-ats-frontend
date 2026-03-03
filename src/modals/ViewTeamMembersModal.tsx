import React from 'react';

const ViewTeamMembersModal = ({ isOpen, onClose, members, projectName }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Team Members{projectName ? ` - ${projectName}` : ''}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    {members && members.length > 0 ? (
                        <div className="form-grid single-col" style={{ gap: '12px' }}>
                            {members.map(member => (
                                <div key={`${member.project_id}-${member.user_email}`} className="workspace-card">
                                    <strong>{member.user_email}</strong>
                                    {member.role ? <span style={{ marginLeft: '8px', color: '#555' }}>({member.role})</span> : null}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#555' }}>No team members added yet.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ViewTeamMembersModal;
