import React, { useState, useEffect, useRef } from 'react';
import { User, UserPermission, UserRole } from '../types/types';
import { getInitials } from '../utils/helpers';

// Fix: Removed 'Recruiter Tools' as it is not a valid UserPermission according to the type definition.
const allPermissions: UserPermission[] = ['Dashboard', 'Job Matching', 'All Candidates', 'Calendar', 'Communications', 'Reports', 'Settings', 'History'];

const UserEditorModal = ({ isOpen, onClose, onSave, userToEdit }) => {
    const getInitialState = () => ({
        name: '',
        email: '',
        password: '',
        role: 'Recruiter' as UserRole,
        permissions: [] as UserPermission[],
        avatar: '',
        invitationId: undefined,
    });

    const [userData, setUserData] = useState(getInitialState());
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                 setUserData({
                    ...getInitialState(), // Ensure all fields are present
                    ...userToEdit,       // Override with passed data
                    password: '',        // Always clear password field
                });
            } else {
                setUserData(getInitialState());
            }
        }
    }, [isOpen, userToEdit]);

    if (!isOpen) return null;

    const isEditMode = !!userToEdit?.id;
    const isCreatingFromInvite = !isEditMode && userToEdit?.invitationId;


    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePermissionChange = (permission: UserPermission) => {
        setUserData(prev => {
            const newPermissions = prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission];
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(userData, userToEdit?.id);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEditMode ? 'Edit User' : (isCreatingFromInvite ? 'Approve Invitation & Create User' : 'Add New User')}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        <div className="profile-avatar-section" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '24px' }}>
                             <div className="avatar-edit-container">
                                <div className="user-avatar large">
                                    {userData.avatar && userData.avatar.startsWith('data:image') ? (
                                        <img src={userData.avatar} alt={userData.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        getInitials(userData.name)
                                    )}
                                </div>
                                <div className="avatar-overlay">
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'}}>
                                        <button type="button" className="btn btn-small btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                            <span className="material-symbols-outlined">upload</span> Change
                                        </button>
                                        <button type="button" className="btn btn-small btn-danger" onClick={() => setUserData(prev => ({...prev, avatar: ''}))} disabled={!userData.avatar}>
                                            <span className="material-symbols-outlined">delete</span> Remove
                                        </button>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Full Name</label>
                                <input name="name" value={userData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group full-width">
                                <label>Email Address</label>
                                <input type="email" name="email" value={userData.email} onChange={handleChange} required disabled={isCreatingFromInvite} />
                            </div>
                             <div className="form-group full-width">
                                <label>Password</label>
                                <input 
                                    type="password"
                                    name="password" 
                                    value={userData.password} 
                                    onChange={handleChange} 
                                    placeholder={isEditMode ? "Leave blank to keep current password" : "Enter a temporary password"}
                                    required={!isEditMode} 
                                />
                            </div>
                             <div className="form-group full-width">
                                <label>Role</label>
                                <select name="role" value={userData.role} onChange={handleChange}>
                                    <option value="User">User</option>
                                    <option value="Recruiter">Recruiter</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            {userData.role === 'Recruiter' && (
                                <div className="form-group full-width">
                                    <label>Recruiter Permissions</label>
                                    <div className="permissions-list-modal">
                                        {allPermissions.map(permission => (
                                            <div key={permission} className="checkbox-item" onClick={() => handlePermissionChange(permission)}>
                                                <input 
                                                    type="checkbox" 
                                                    id={`perm-${permission}`} 
                                                    checked={userData.permissions.includes(permission)}
                                                    readOnly
                                                />
                                                <label htmlFor={`perm-${permission}`}>{permission}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {isEditMode ? 'Save Changes' : (isCreatingFromInvite ? 'Approve & Send Credentials' : 'Create & Send Credentials')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserEditorModal;