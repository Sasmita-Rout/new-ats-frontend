import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Invitation, InvitationStatus } from '../types/types';
import { getInitials } from '../utils/helpers';


const MyProfileView = ({ effectiveUser, onUpdateUser }) => {
    const [profileData, setProfileData] = useState({
        name: effectiveUser.name,
        email: effectiveUser.email,
        title: 'Senior Recruiter', // Placeholder
        avatar: effectiveUser.avatar
    });
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAvatarImage = (avatar?: string) =>
        !!avatar && /^(data:image\/|https?:\/\/|blob:|\/)/i.test(avatar);

    useEffect(() => {
        // This effect syncs local state with props when editing is not active.
        // It's crucial for resetting state after a save or when props change from parent.
        // Intentionally not including `isEditing` in the dependency array to prevent a race
        // condition where the local state reverts to old props before the parent can update.
        if (!isEditing) {
            setProfileData({
                name: effectiveUser.name,
                email: effectiveUser.email,
                title: 'Senior Recruiter',
                avatar: effectiveUser.avatar
            });
        }
    }, [effectiveUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please upload a valid image file.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [profileData.avatar]);


    const handleSave = () => {
        const userUpdatePayload: Partial<User> = { name: profileData.name, email: profileData.email, avatar: profileData.avatar };

        onUpdateUser(effectiveUser.id, userUpdatePayload);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset form data to original user data from props
        setProfileData({
            name: effectiveUser.name,
            email: effectiveUser.email,
            title: 'Senior Recruiter',
            avatar: effectiveUser.avatar
        });
    };

    return (
        <div className="info-card">
             <div className="page-header with-action" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px'}}>
                <div>
                    <h4>My Profile</h4>
                    <p className="subtitle">Update your personal information and professional profile photo.</p>
                </div>
                 {isEditing ? (
                    <div className="actions-group">
                        <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                    </div>
                 ) : (
                    <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                        <span className="material-symbols-outlined">edit</span>
                        Edit Profile
                    </button>
                 )}
            </div>

            <div style={{marginTop: '24px'}}>
                 <div className="profile-avatar-section">
                    <div className="user-avatar large">
                        {isAvatarImage(profileData.avatar) && !avatarLoadFailed ? (
                            <img
                                src={profileData.avatar}
                                alt={profileData.name}
                                onError={() => setAvatarLoadFailed(true)}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            getInitials(profileData.name)
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

                    {isEditing && (
                        <div className="actions-group" style={{marginTop: '16px'}}>
                            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <span className="material-symbols-outlined">upload</span> Update Profile Picture
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => setProfileData(prev => ({...prev, avatar: ''}))} disabled={!profileData.avatar}>
                                <span className="material-symbols-outlined">delete</span> Remove Profile Picture
                            </button>
                        </div>
                    )}

                    <h3 className="user-name" style={{fontSize: '20px', margin: '16px 0 0 0'}}>{profileData.name}</h3>
                    <p className="user-role" style={{fontSize: '15px'}}>{profileData.title}</p>
                 </div>
                 <div className="form-grid single-col">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="name" value={profileData.name} onChange={handleChange} disabled={!isEditing} />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value={profileData.email} onChange={handleChange} disabled />
                    </div>
                 </div>
                 {showSuccess && !isEditing && (
                    <div style={{textAlign: 'right', marginTop: '24px'}}>
                        <span style={{color: 'var(--primary-color)', fontWeight: 500}}>Changes saved successfully!</span>
                    </div>
                 )}
            </div>
        </div>
    );
};

const RecruiterTeamView = ({ invitations, onInviteUser, allUsers }: { invitations: Invitation[], onInviteUser: () => void, allUsers: User[] }) => {
    // Group invitations by status
    const pending = invitations.filter(i => i.status === 'Pending');
    const approved = invitations.filter(i => i.status === 'Approved');
    const rejected = invitations.filter(i => i.status === 'Rejected');

    return (
        <div className="info-card">
            <div className="page-header with-action">
                <div>
                    <h4>Team Invitations</h4>
                    <p className="subtitle">Invite new members and track the status of your invitations.</p>
                </div>
                 <div className="actions-group">
                    <button className="btn btn-primary" onClick={onInviteUser}>
                        <span className="material-symbols-outlined">person_add</span> Invite Member
                    </button>
                </div>
            </div>

            {invitations.length > 0 ? (
                <div className="form-grid single-col" style={{ marginTop: '24px', gap: '24px' }}>
                    {pending.length > 0 && (
                        <div>
                            <h4 style={{marginBottom: '12px'}}>Pending ({pending.length})</h4>
                            {pending.map(inv => <div key={inv.id} className="workspace-card">{inv.email} - <em style={{color: '#666'}}>Sent on {new Date(inv.createdAt).toLocaleDateString()}</em></div>)}
                        </div>
                    )}
                     {approved.length > 0 && (
                        <div>
                            <h4 style={{marginBottom: '12px'}}>Approved ({approved.length})</h4>
                            {approved.map(inv => <div key={inv.id} className="workspace-card" style={{borderColor: '#A7F3D0', backgroundColor: '#F0FDF4'}}>{inv.email}</div>)}
                        </div>
                    )}
                     {rejected.length > 0 && (
                        <div>
                            <h4 style={{marginBottom: '12px'}}>Rejected ({rejected.length})</h4>
                            {rejected.map(inv => <div key={inv.id} className="workspace-card" style={{borderColor: '#FECACA', backgroundColor: '#FEF2F2'}}>{inv.email}</div>)}
                        </div>
                    )}
                </div>
            ) : (
                <p style={{marginTop: '24px', color: '#555', textAlign: 'center'}}>You haven't sent any invitations yet.</p>
            )}

            <div style={{borderTop: '1px solid var(--border-color)', marginTop: '32px', paddingTop: '24px'}}>
                 <h4>Current Team Members</h4>
                 <div className="permissions-grid" style={{marginTop: '16px'}}>
                    {allUsers.map(user => (
                         <div key={user.id} className="permission-user-card">
                             <div className="user-cell">
                                 <div className="user-avatar">{getInitials(user.name)}</div>
                                 <div>
                                     <strong className="user-name">{user.name}</strong>
                                     <p className="user-role" style={{fontSize: '13px', color: '#555'}}>{user.role}</p>
                                 </div>
                             </div>
                         </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

const PermissionsView = ({ users, onUpdateAllUsers, currentUser, onAddUser }) => {
    const [modifiedUsers, setModifiedUsers] = useState<User[]>(users);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setModifiedUsers(users);
    }, [users]);
    
    const handleRoleChange = (userId: number, role: UserRole) => {
        setModifiedUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    };

    const handleSave = () => {
        onUpdateAllUsers(modifiedUsers);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="info-card">
             <div className="page-header with-action">
                <div>
                    <h4>Roles & Permissions</h4>
                    <p className="subtitle">Quickly adjust roles for all users in the system.</p>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    {showSuccess && <span style={{color: 'var(--primary-color)', fontWeight: 500}}>Changes saved!</span>}
                    <button className="btn btn-secondary" onClick={onAddUser}>
                        <span className="material-symbols-outlined">person_add</span> Add User
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>Save All Changes</button>
                </div>
             </div>
             <div className="candidates-table-container" style={{marginTop: '24px', boxShadow: 'none', border: '1px solid var(--border-color)'}}>
                <table className="candidates-table">
                    <thead>
                        <tr>
                            <th style={{paddingLeft: '24px'}}>User</th>
                            <th>Email Address</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modifiedUsers.map(user => (
                            <tr key={user.id}>
                                <td style={{paddingLeft: '24px'}}>
                                    <div className="candidate-cell">
                                        <div className="user-avatar small">{getInitials(user.name)}</div>
                                        <span className="candidate-name" style={{textDecoration: 'none', cursor: 'default', color: 'var(--text-color-dark)'}}>{user.name}</span>
                                    </div>
                                </td>
                                <td style={{color: '#555'}}>{user.email}</td>
                                <td>
                                    <select 
                                        value={user.role} 
                                        onChange={e => handleRoleChange(user.id, e.target.value as UserRole)} 
                                        disabled={user.id === currentUser.id && user.role === 'Main Admin'}
                                        style={{
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'white',
                                            fontSize: '14px',
                                            color: 'var(--text-color-dark)',
                                            cursor: 'pointer',
                                            minWidth: '140px'
                                        }}
                                    >
                                         <option value="User">User</option>
                                         <option value="Recruiter">Recruiter</option>
                                         <option value="Admin">Admin</option>
                                         {user.role === 'Main Admin' && <option value="Main Admin">Main Admin</option>}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};


const WorkspaceDataView = ({ onExportData, onImportData, onResetAllData }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportData(file);
        }
    };

    return (
        <>
            <div className="page-header">
                <h4>Workspace Management</h4>
                <p className="subtitle">Manage your application's data with import, export, and reset tools.</p>
            </div>
            <div className="workspace-grid">
                <div className="workspace-tool-card">
                    <div className="tool-icon-wrapper" style={{'--tool-color': '#3B82F6', '--tool-bg': '#EFF6FF'} as React.CSSProperties}>
                        <span className="material-symbols-outlined">download</span>
                    </div>
                    <div className="workspace-card-info">
                        <h4>Export Workspace</h4>
                        <p>Download a JSON file of all jobs, candidates, users, and settings for backup purposes.</p>
                    </div>
                    <button onClick={onExportData} className="btn btn-secondary">
                        Export Data
                    </button>
                </div>
                <div className="workspace-tool-card">
                    <div className="tool-icon-wrapper" style={{'--tool-color': '#8B5CF6', '--tool-bg': '#F5F3FF'} as React.CSSProperties}>
                        <span className="material-symbols-outlined">upload</span>
                    </div>
                     <div className="workspace-card-info">
                        <h4>Import Workspace</h4>
                        <p>Import a previously exported JSON file. This will overwrite all current data in the workspace.</p>
                    </div>
                    <input type="file" ref={importInputRef} onChange={handleFileImport} className="hidden" accept=".json" style={{display: 'none'}}/>
                    <button onClick={() => importInputRef.current?.click()} className="btn btn-secondary">
                        Import Data
                    </button>
                </div>
                 <div className="workspace-tool-card danger-zone">
                    <div className="tool-icon-wrapper" style={{'--tool-color': '#EF4444', '--tool-bg': '#FEF2F2'} as React.CSSProperties}>
                        <span className="material-symbols-outlined">delete_forever</span>
                    </div>
                    <div className="workspace-card-info">
                        <h4>Reset All Data</h4>
                        <p>Permanently delete all jobs, candidates, and users. This action cannot be undone.</p>
                    </div>
                    <button className="btn btn-danger" onClick={onResetAllData}>
                        Reset Application
                    </button>
                </div>
            </div>
        </>
    );
};

const ContactSupportView = () => {
    return (
        <div className="info-card">
            <div className="page-header contact-support-header">
                <div>
                    <h4>Contact Support</h4>
                    <p className="subtitle">For reference and doubts, contact any of them below......</p>
                </div>
            </div>
            <div className="contact-support-grid">
                <div className="contact-support-card">
                    <div className="contact-support-icon">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="contact-support-content">
                        <strong>Kokila Umasankar</strong>
                        <a href="mailto:kokila.umasankar@accionlabs.com">kokila.umasankar@accionlabs.com</a>
                    </div>
                </div>
                <div className="contact-support-card">
                    <div className="contact-support-icon">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="contact-support-content">
                        <strong>Sandhiya G</strong>
                        <a href="mailto:sandhiya.g@accionlabs.com">sandhiya.g@accionlabs.com</a>
                    </div>
                </div>
                <div className="contact-support-card">
                    <div className="contact-support-icon">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="contact-support-content">
                        <strong>Sasmita Rout</strong>
                        <a href="mailto:sasmita.rout@accionlabs.com">sasmita.rout@accionlabs.com</a>
                    </div>
                </div>
                <div className="contact-support-card">
                    <div className="contact-support-icon">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="contact-support-content">
                        <strong>Baburaj R</strong>
                        <a href="mailto:baburaj.r@accionlabs.com">baburaj.r@accionlabs.com</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsPage = ({ effectiveUser, onUpdateUser, allUsers, invitations, onInviteUser, activeView = 'My Profile' }) => {
    const renderCentered = (content: React.ReactNode) => (
        <div className="settings-view-wrapper">
            {content}
        </div>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'My Profile': return renderCentered(<MyProfileView effectiveUser={effectiveUser} onUpdateUser={onUpdateUser} />);
            case 'Team Members': return <RecruiterTeamView invitations={invitations.filter(i => i.inviterId === effectiveUser.id)} onInviteUser={onInviteUser} allUsers={allUsers} />;
            case 'Contact Support': return renderCentered(<ContactSupportView />);
            default: return renderCentered(<MyProfileView effectiveUser={effectiveUser} onUpdateUser={onUpdateUser} />);
        }
    };

    return (
        <div className="page-content">
            <div className="settings-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsPage;
