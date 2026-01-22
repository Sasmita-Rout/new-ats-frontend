import React, { useMemo, useState, useEffect } from 'react';
import { HistoryEntry, User } from '../types/types';
import { exportToCSV } from '../utils/helpers';

const HistoryPage = ({ 
    historyLog, 
    effectiveUser, 
    onNavigateTo,
    currentUser,
    impersonatedUser,
    allUsers,
}: { 
    historyLog: HistoryEntry[], 
    effectiveUser: User,
    onNavigateTo: (type: any, id: number) => void,
    currentUser: User,
    impersonatedUser: User | null,
    allUsers: User[],
}) => {
    // Admin's default view is their own history
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id.toString());
    const isAdminView = currentUser.role.includes('Admin') && !impersonatedUser;

    // Reset filter when the view context changes (e.g., stops impersonating)
    useEffect(() => {
        if (isAdminView) {
            setSelectedUserId(currentUser.id.toString());
        }
    }, [isAdminView, currentUser.id]);

    const visibleLogs = useMemo(() => {
        let logs = [...historyLog];

        if (isAdminView) {
            if (selectedUserId === currentUser.id.toString()) {
                // Admin viewing their own history
                logs = logs.filter(log => log.userId === currentUser.id);
            } else if (selectedUserId !== 'all') {
                // Admin viewing a specific user's history
                logs = logs.filter(log => log.userId === parseInt(selectedUserId, 10));
            }
            // If 'all', no filtering is needed
        } else {
            // This covers Recruiters and impersonating Admins
            logs = logs.filter(log => log.userId === effectiveUser.id);
        }

        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [historyLog, effectiveUser, isAdminView, selectedUserId, currentUser.id]);

    const formatTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    const handleExport = () => {
        // 1. Use a flexible filter to find any login or logout related events, ignoring case and whitespace.
        const loginLogoutEvents = historyLog.filter(log =>
            log?.action?.toLowerCase().includes('logged in') || 
            log?.action?.toLowerCase().includes('logged out')
        );
    
        if (loginLogoutEvents.length === 0) {
            alert("No login or logout events found in the history log.");
            return;
        }
    
        // 2. Group events by user.
        const eventsByUser = new Map<number, HistoryEntry[]>();
        loginLogoutEvents.forEach(log => {
            if (!eventsByUser.has(log.userId)) {
                eventsByUser.set(log.userId, []);
            }
            eventsByUser.get(log.userId)!.push(log);
        });
    
        const sessions: { username: string, loginTime: string, logoutTime: string | null }[] = [];
    
        // 3. Process each user's events to construct sessions.
        eventsByUser.forEach((userEvents) => {
            // Separate logins from logouts using the same flexible matching.
            const logins = userEvents
                .filter(e => e.action.toLowerCase().includes('logged in'))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
            const logouts = userEvents
                .filter(e => e.action.toLowerCase().includes('logged out'))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
            // For each login, find the next available logout that occurred after it.
            logins.forEach(login => {
                const correspondingLogoutIndex = logouts.findIndex(logout => 
                    new Date(logout.timestamp).getTime() > new Date(login.timestamp).getTime()
                );
    
                if (correspondingLogoutIndex !== -1) {
                    // A matching logout is found. Create the session pair.
                    const logout = logouts[correspondingLogoutIndex];
                    sessions.push({
                        username: login.userName,
                        loginTime: login.timestamp,
                        logoutTime: logout.timestamp,
                    });
                    // Remove the used logout so it's not matched again.
                    logouts.splice(correspondingLogoutIndex, 1);
                } else {
                    // No matching logout found, this is an active session.
                    sessions.push({
                        username: login.userName,
                        loginTime: login.timestamp,
                        logoutTime: null,
                    });
                }
            });
        });
    
        if (sessions.length === 0) {
            // This alert now means that even with flexible matching, no "logged in" events were found to start sessions.
            alert("Could not construct any user sessions from the available log data. No 'logged in' events were found.");
            return;
        }
    
        // Sort all sessions and format for export.
        sessions.sort((a, b) => new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime());
    
        const dataToExport = sessions.map(s => ({
            'Username': s.username,
            'Login Time': formatTimestamp(s.loginTime),
            'Logout Time': s.logoutTime ? formatTimestamp(s.logoutTime) : 'Still active',
        }));
    
        exportToCSV(dataToExport, `login_logout_history_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="page-content">
            <div className="page-header with-action">
                 <div>
                    <h1>History & Audit Trail</h1>
                    <p>{isAdminView ? "Review actions taken by users across the application." : "A complete log of actions you have taken within the application."}</p>
                </div>
                {isAdminView && (
                    <div className="actions-group">
                        <div className="filter-group">
                            <label>Filter by User</label>
                            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
                                <option value={currentUser.id.toString()}>My History</option>
                                <option value="all">All Users</option>
                                {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                                    <option key={user.id} value={user.id.toString()}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={handleExport}>
                            <span className="material-symbols-outlined">download</span> Export Login/Logout
                        </button>
                    </div>
                )}
            </div>
            <div className="candidates-table-container">
                 <table className="history-table">
                     <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action Details</th>
                        </tr>
                     </thead>
                     <tbody>
                        {visibleLogs.length > 0 ? visibleLogs.map(log => (
                            <tr key={log.id}>
                                <td>{formatTimestamp(log.timestamp)}</td>
                                <td>
                                    <div className="user-cell">
                                        <div>
                                            <strong>{log.userName}</strong> <span>({log.userRole})</span>
                                            {log.impersonatingUserName && (
                                                <div className="impersonation-indicator">
                                                    <span className="material-symbols-outlined">visibility</span>
                                                    by {log.impersonatingUserName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {log.action}
                                    {log.targetName && (
                                        <>
                                            {' '}
                                            <a href="#" className="target-link" onClick={(e) => {
                                                e.preventDefault();
                                                if (log.targetType && log.targetId) {
                                                    onNavigateTo(log.targetType, log.targetId);
                                                }
                                            }}>
                                                ({log.targetType}: {log.targetName})
                                            </a>
                                        </>
                                    )}
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={3}>
                                    <div className="empty-state" style={{padding: '24px'}}>
                                        <h3>No History Found</h3>
                                        <p>No actions have been recorded for the selected filter.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                     </tbody>
                 </table>
            </div>
        </div>
    );
};

export default HistoryPage;