import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, CompanyProfile, Invitation, InvitationStatus } from '../types/types';
import { getInitials } from '../utils/helpers';


// --- SUB-COMPONENTS FOR SETTINGS PAGE ---
interface SettingsSidebarButtonProps {
    view: string;
    activeView: string;
    setView: (view: string) => void;
    icon: string;
    children: React.ReactNode;
}
const SettingsSidebarButton = React.memo(({ view, activeView, setView, icon, children }: SettingsSidebarButtonProps) => (
    <button
        onClick={() => setView(view)}
        className={`${activeView === view ? 'active' : ''}`}
    >
        <span className="material-symbols-outlined">{icon}</span>
        {children}
    </button>
));
SettingsSidebarButton.displayName = 'SettingsSidebarButton';

const MyProfileView = ({ effectiveUser, onUpdateUser }) => {
    const [profileData, setProfileData] = useState({
        name: effectiveUser.name,
        email: effectiveUser.email,
        title: 'Senior Recruiter', // Placeholder
        avatar: effectiveUser.avatar,
        newPassword: '',
        confirmPassword: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                avatar: effectiveUser.avatar,
                newPassword: '',
                confirmPassword: '',
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
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };


    const handleSave = () => {
        if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
            alert("New passwords do not match.");
            return;
        }
        
        const userUpdatePayload: Partial<User> = { name: profileData.name, email: profileData.email, avatar: profileData.avatar };
        if (profileData.newPassword) {
            userUpdatePayload.password = profileData.newPassword;
        }

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
            avatar: effectiveUser.avatar,
            newPassword: '',
            confirmPassword: '',
        });
    };

    return (
        <div className="info-card">
             <div className="page-header with-action" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px'}}>
                <div>
                    <h4>My Profile</h4>
                    <p className="subtitle">Update your personal information and password.</p>
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
                        {profileData.avatar && profileData.avatar.startsWith('data:image') ? (
                            <img src={profileData.avatar} alt={profileData.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
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
                            <button type="button" className="btn btn-danger" onClick={() => setProfileData(prev => ({...prev, avatar: ''}))} disabled={!profileData.avatar || !profileData.avatar.startsWith('data:image')}>
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
                        <input type="email" name="email" value={profileData.email} onChange={handleChange} disabled={!isEditing} />
                    </div>
                    {isEditing && (
                        <>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" name="newPassword" value={profileData.newPassword} onChange={handleChange} placeholder="Leave blank to keep current password" />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" name="confirmPassword" value={profileData.confirmPassword} onChange={handleChange} />
                            </div>
                        </>
                    )}
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

const CompanyProfileView = ({ companyProfile, onUpdateCompanyProfile, currentUser }) => {
    const [formData, setFormData] = useState<CompanyProfile | null>(companyProfile);
    const [isEditing, setIsEditing] = useState(false);
    const isAdmin = currentUser?.role.includes('Admin');

    useEffect(() => { setFormData(companyProfile); }, [companyProfile]);
    if (!formData) return <p>Loading...</p>;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || !isAdmin) return;
        onUpdateCompanyProfile(formData);
        setIsEditing(false);
    };

    return (
         <div className="info-card">
            <div className="page-header with-action" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px'}}>
                <div>
                    <h4>Company Profile</h4>
                    <p className="subtitle">Manage your organization's public information.</p>
                </div>
                 {isAdmin && (isEditing ? (
                    <div className="actions-group">
                        <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setFormData(companyProfile); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                    </div>
                 ) : (
                    <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                        Edit Profile
                    </button>
                 ))}
            </div>
            <form onSubmit={handleSave}>
                <div className="company-profile-header">
                     <img src={formData.logo || 'https://via.placeholder.com/100'} alt="Company Logo" className="company-logo" />
                     <div style={{flexGrow: 1}}>
                        {isEditing ? (
                            <>
                                <div className="form-group" style={{marginBottom: '12px'}}><label>Company Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} /></div>
                                <div className="form-group"><label>Industry</label><input type="text" name="industry" value={formData.industry} onChange={handleChange} /></div>
                            </>
                        ) : (
                            <>
                                <h1 style={{fontSize: '24px', margin: 0}}>{formData.name}</h1>
                                <p style={{fontSize: '16px', color: '#555'}}>{formData.industry}</p>
                            </>
                        )}
                     </div>
                </div>
                <div className="form-group" style={{marginBottom: '24px'}}>
                    <label>About Us</label>
                    {isEditing ? (
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={4} />
                    ) : (
                        <p>{formData.description}</p>
                    )}
                </div>
                <div className="company-profile-grid">
                    <div className="form-group">
                        <label>Website</label>
                        {isEditing ? <input type="text" name="website" value={formData.website} onChange={handleChange} /> : <div className="company-info-item"><span className="material-symbols-outlined">public</span><a href={formData.website} target="_blank" rel="noopener noreferrer">{formData.website}</a></div>}
                    </div>
                     <div className="form-group">
                        <label>Contact Email</label>
                        {isEditing ? <input type="email" name="email" value={formData.email} onChange={handleChange} /> : <div className="company-info-item"><span className="material-symbols-outlined">mail</span><a href={`mailto:${formData.email}`}>{formData.email}</a></div>}
                    </div>
                     <div className="form-group">
                        <label>LinkedIn</label>
                        {isEditing ? <input type="text" name="linkedin" value={formData.linkedin} onChange={handleChange} /> : <div className="company-info-item"><span className="material-symbols-outlined">group</span><a href={formData.linkedin} target="_blank" rel="noopener noreferrer">Company Profile</a></div>}
                    </div>
                     <div className="form-group">
                        <label>Address</label>
                        {isEditing ? <input type="text" name="address" value={formData.address} onChange={handleChange} /> : <div className="company-info-item"><span className="material-symbols-outlined">location_on</span><p>{formData.address}</p></div>}
                    </div>
                </div>
            </form>
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

const ContactUsView = ({ companyProfile }) => {
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (isSubmitted) {
        return (
            <div className="info-card">
                <div className="empty-state">
                    <span className="material-symbols-outlined" style={{fontSize: '64px', color: 'var(--primary-color)'}}>check_circle</span>
                    <h3>Message Sent Successfully!</h3>
                    <p>Thank you for reaching out. Our support team has received your inquiry and will get back to you shortly.</p>
                    <button onClick={() => setIsSubmitted(false)} className="btn btn-primary">Send Another Message</button>
                </div>
            </div>
        );
    }

    return (
        <div className="contact-us-container">
            <div className="contact-form-card">
                <div className="page-header">
                    <h4>Get in Touch</h4>
                    <p className="subtitle">Have an issue or a question? Fill out the form below and we'll help you out.</p>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); setIsSubmitted(true); }} className="form-grid single-col">
                    <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div className="form-group">
                            <label>Your Name</label>
                            <input type="text" placeholder="e.g. John Doe" required />
                        </div>
                        <div className="form-group">
                            <label>Your Email</label>
                            <input type="email" placeholder="e.g. john@example.com" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Subject</label>
                        <input type="text" placeholder="How can we help you?" required />
                    </div>
                    <div className="form-group">
                        <label>Message</label>
                        <textarea rows={6} placeholder="Please describe your issue or inquiry in detail..." required></textarea>
                    </div>
                    <div style={{textAlign: 'right', marginTop: '8px'}}>
                        <button type="submit" className="btn btn-primary" style={{padding: '12px 24px'}}>
                            <span className="material-symbols-outlined">send</span> Send Message
                        </button>
                    </div>
                </form>
            </div>

            <div className="contact-info-sidebar">
                <div className="contact-info-card">
                    <h4>Contact Information</h4>
                    
                    <div className="contact-detail-item">
                        <span className="material-symbols-outlined">mail</span>
                        <div className="contact-detail-content">
                            <label>Email</label>
                            <a href={`mailto:${companyProfile.email}`}>{companyProfile.email}</a>
                        </div>
                    </div>

                    <div className="contact-detail-item">
                        <span className="material-symbols-outlined">public</span>
                        <div className="contact-detail-content">
                            <label>Website</label>
                            <a href={companyProfile.website} target="_blank" rel="noopener noreferrer">{companyProfile.website}</a>
                        </div>
                    </div>

                    <div className="contact-detail-item">
                        <span className="material-symbols-outlined">group</span>
                        <div className="contact-detail-content">
                            <label>Social</label>
                            <a href={companyProfile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                        </div>
                    </div>
                </div>

                <div className="faq-card">
                    <h4 style={{marginBottom: '16px', fontSize: '16px'}}>Frequently Asked Questions</h4>
                    <div className="faq-item">
                        <h5>How do I reset my password?</h5>
                        <p>Go to "My Profile" settings and enter a new password in the change password section.</p>
                    </div>
                    <div className="faq-item">
                        <h5>Where can I find user guides?</h5>
                        <p>Check our internal documentation portal or contact support for specific guides.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsPage = ({ effectiveUser, onUpdateUser, onResetAllData, companyProfile, onUpdateCompanyProfile, allUsers, onUpdateAllUsers, onExportData, onImportData, invitations, onInviteUser, onAddUser }) => {
    const [activeTab, setActiveTab] = useState('My Profile');
    
    const isAdmin = effectiveUser.role.includes('Admin');

    const navTabs = [
        { view: 'My Profile', icon: 'person', label: 'My Profile' },
        { view: 'Team Members', icon: 'groups', label: 'Team Members' },
        { view: 'Company Profile', icon: 'apartment', label: 'Company Profile' },
        { view: 'Permissions', icon: 'verified_user', label: 'Permissions' },
        { view: 'Workspace', icon: 'database', label: 'Workspace' },
        { view: 'Contact Us', icon: 'support_agent', label: 'Contact Us' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'My Profile': return <MyProfileView effectiveUser={effectiveUser} onUpdateUser={onUpdateUser} />;
            case 'Company Profile': return <CompanyProfileView companyProfile={companyProfile} onUpdateCompanyProfile={onUpdateCompanyProfile} currentUser={effectiveUser} />;
            case 'Team Members': return <RecruiterTeamView invitations={invitations.filter(i => i.inviterId === effectiveUser.id)} onInviteUser={onInviteUser} allUsers={allUsers} />;
            case 'Permissions': return <PermissionsView users={allUsers} onUpdateAllUsers={onUpdateAllUsers} currentUser={effectiveUser} onAddUser={onAddUser} />;
            case 'Workspace': return <WorkspaceDataView onExportData={onExportData} onImportData={onImportData} onResetAllData={onResetAllData} />;
            case 'Contact Us': return <ContactUsView companyProfile={companyProfile} />;
            default: return <MyProfileView effectiveUser={effectiveUser} onUpdateUser={onUpdateUser} />;
        }
    };

    return (
        <div className="page-content">
            <div className="page-header"><h1>Settings</h1></div>
            <div className="settings-layout">
                <nav className="settings-nav">
                    {navTabs.map(tab => {
                        const isTeamTabForAdmin = tab.view === 'Team Members' && isAdmin;
                        const isAdminOnlyTab = ['Company Profile', 'Permissions', 'Workspace'].includes(tab.view) && !isAdmin;

                        if (isTeamTabForAdmin || isAdminOnlyTab) {
                            return null;
                        }

                        return (
                            <SettingsSidebarButton key={tab.view} view={tab.view} activeView={activeTab} setView={setActiveTab} icon={tab.icon}>
                                {tab.label}
                            </SettingsSidebarButton>
                        );
                    })}
                </nav>
                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
