import React, { useState, useMemo, useEffect } from 'react';
 
const AddTeamMemberModal = ({ isOpen, onClose, onAdd, users }) => {
    const [search, setSearch] = useState('');
 
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
        }
    }, [isOpen]);
 
    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return users || [];
        return (users || []).filter(u =>
            (u.email || '').toLowerCase().includes(term) ||
            (u.name || '').toLowerCase().includes(term)
        );
    }, [users, search]);
 
    if (!isOpen) return null;
 
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Team Member to Project</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p className="modal-subtitle">Select a user who already has ATS access.</p>
                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label>Search</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email"
                        />
                    </div>
                    <div className="form-grid single-col" style={{ marginTop: '12px', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <div key={u.email} className="workspace-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div>
                                        <strong>{u.name}</strong>
                                        <div style={{ color: '#555', fontSize: '13px' }}>{u.email}</div>
                                    </div>
                                    <button type="button" className="btn btn-primary btn-small" onClick={() => onAdd(u.email)}>
                                        Add Member
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#555' }}>No ATS users found.</p>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
 
export default AddTeamMemberModal;
 
 