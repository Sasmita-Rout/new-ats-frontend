import React from 'react';
import { User, Invitation } from '../types/types';
import { getInitials } from '../utils/helpers';

interface UserCardProps {
    user: User;
    currentUser: User;
    onEdit: (user: User) => void;
    onDelete: (id: number) => void;
    onImpersonate: (user: User) => void;
}

const UserCard = React.memo(({ user, currentUser, onEdit, onDelete, onImpersonate }: UserCardProps) => (
    <div className="card user-card">
        <div className="user-avatar large">{user.avatar}</div>
        <h3 className="user-name">{user.name}</h3>
        <p className="user-email">{user.email}</p>
        <span className={`role-pill ${user.role.toLowerCase().replace(' ', '-')}`}>
            {user.role}
        </span>
        <div className="user-card-actions">
             <button 
                className="btn btn-secondary btn-small" 
                onClick={() => onImpersonate(user)}
                disabled={user.role === 'Admin' || user.role === 'Main Admin' || user.id === currentUser.id}
                title={user.role.includes('Admin') ? "Cannot impersonate other admins" : `View as ${user.name}`}
            >
                <span className="material-symbols-outlined">visibility</span> Impersonate
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => onEdit(user)}>
                <span className="material-symbols-outlined">edit</span> Edit
            </button>
            <button 
                className="btn btn-danger btn-small" 
                onClick={() => onDelete(user.id)}
                disabled={user.id === currentUser.id || user.role === 'Main Admin'}
                title={user.role === 'Main Admin' ? "Main Admin cannot be deleted" : "Delete user"}
            >
                <span className="material-symbols-outlined">delete</span>
            </button>
        </div>
    </div>
));

UserCard.displayName = 'UserCard';

const ManageUsersPage = ({ users, currentUser, onAddUser, onEditUser, onDeleteUser, onImpersonateUser, invitations, onUpdateInvitationStatus }) => {
    const pendingInvitations = invitations.filter(i => i.status === 'Pending');

    const handleApprove = (invitation: Invitation) => {
        // Pre-fill the user editor modal with invitation data
        onEditUser({ email: invitation.email, invitationId: invitation.id });
    };

    return (
        <div className="page-content">
            <div className="page-header with-action">
                <div>
                    <h1>User Management</h1>
                    <p>Approve invitations, create new users, and manage existing accounts.</p>
                </div>
                <div className="actions-group">
                    <button className="btn btn-primary" onClick={onAddUser}>
                        <span className="material-symbols-outlined">add</span> Add User Manually
                    </button>
                </div>
            </div>

            {pendingInvitations.length > 0 && (
                <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'var(--hover-color-light)' }}>
                    <h3 style={{ marginBottom: '16px' }}>Pending Invitations ({pendingInvitations.length})</h3>
                    <div className="permissions-grid">
                        {pendingInvitations.map(inv => (
                            <div key={inv.id} className="permission-user-card" style={{ background: 'white' }}>
                                <p style={{ fontWeight: '600', marginBottom: '4px', wordBreak: 'break-all' }}>{inv.email}</p>
                                <p style={{ fontSize: '13px', color: '#555' }}>
                                    Invited by {inv.inviterName} on {new Date(inv.createdAt).toLocaleDateString()}
                                    {inv.type === 'ProjectTeam' && inv.projectName && <><br />for project: <strong>{inv.projectName}</strong></>}
                                </p>
                                <div className="user-card-actions" style={{ marginTop: '12px' }}>
                                    <button className="btn btn-secondary btn-small" onClick={() => onUpdateInvitationStatus(inv.id, 'Rejected')}>Reject</button>
                                    <button className="btn btn-primary btn-small" onClick={() => handleApprove(inv)}>Review & Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>All Users ({users.length})</h3>
                <div className="users-grid">
                    {users.map(user => (
                        <UserCard 
                            key={user.id} 
                            user={user} 
                            currentUser={currentUser}
                            onEdit={onEditUser} 
                            onDelete={(userId) => {
                                const userToDelete = users.find(u => u.id === userId);
                                if (window.confirm(`Are you sure you want to delete user "${userToDelete?.name}"?`)) {
                                    onDeleteUser(userId);
                                }
                            }}
                            onImpersonate={onImpersonateUser}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManageUsersPage;