import React, { useState } from 'react';

const AddTeamMemberModal = ({ isOpen, onClose, onAdd }) => {
    const [email, setEmail] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(email);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Team Member to Project</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        <p className="modal-subtitle">Enter the email of the recruiter you want to add. If they don't have an account, an invitation will be sent for admin approval.</p>
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label>Recruiter's Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="recruiter@example.com"
                                required 
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Member</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTeamMemberModal;