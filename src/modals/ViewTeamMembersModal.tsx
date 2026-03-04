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
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        <div>
                                            <strong>{member.user_email}</strong>
                                        </div>
                                        {canManage && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {editingEmail === member.user_email ? (
                                                    <>
                                                        <input
                                                            type="email"
                                                            value={draftEmail}
                                                            onChange={e => setDraftEmail(e.target.value)}
                                                            placeholder="New email"
                                                            style={{ maxWidth: '220px' }}
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
                                                    </>
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
