import React, { useState, useEffect } from 'react';

const ViewTeamMembersModal = ({ isOpen, onClose, members, projectName, canManage, onUpdateEmail, onDelete }) => {
    const [editingEmail, setEditingEmail] = useState('');
    const [draftEmail, setDraftEmail] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setEditingEmail('');
        setDraftEmail('');
    }, [isOpen, members]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content view-team-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Team Members{projectName ? ` - ${projectName}` : ''}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    {members && members.length > 0 ? (
                        <div className="view-team-list">
                            {members.map(member => (
                                <div key={`${member.project_id}-${member.user_email}`} className="view-team-member-row">
                                    <div className="view-team-member-email">
                                        <strong>{member.user_email}</strong>
                                    </div>
                                    {canManage && (
                                        <div className={`view-team-member-actions ${editingEmail === member.user_email ? 'editing' : 'idle'}`}>
                                            {editingEmail === member.user_email ? (
                                                <div className="view-team-member-edit-group">
                                                    <input
                                                        type="email"
                                                        value={draftEmail}
                                                        onChange={e => setDraftEmail(e.target.value)}
                                                        placeholder="New email"
                                                        className="view-team-edit-input"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-small"
                                                        onClick={() => {
                                                            onUpdateEmail(member.user_email, draftEmail);
                                                            setEditingEmail('');
                                                            setDraftEmail('');
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-small"
                                                        onClick={() => {
                                                            setEditingEmail('');
                                                            setDraftEmail('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-small"
                                                    onClick={() => {
                                                        setEditingEmail(member.user_email);
                                                        setDraftEmail(member.user_email);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-small"
                                                onClick={() => onDelete(member.user_email)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
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
