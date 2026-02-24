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
    // Super Admin default view is their own history
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id.toString());
    const isSuperAdmin = (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role.includes('Admin')) && !impersonatedUser;

    // Reset filter when the view context changes (e.g., stops impersonating)
    useEffect(() => {
        if (isSuperAdmin) {
            setSelectedUserId(currentUser.id.toString());
        }
    }, [isSuperAdmin, currentUser.id]);

    const visibleLogs = useMemo(() => {
        let logs = [...historyLog];

        if (isSuperAdmin) {
            if (selectedUserId === currentUser.id.toString()) {
                logs = logs.filter(log => log.userId === currentUser.id);
            } else if (selectedUserId !== 'all') {
                logs = logs.filter(log => log.userId === parseInt(selectedUserId, 10));
            }
        } else {
            logs = logs.filter(log => log.userId === effectiveUser.id);
        }

        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [historyLog, effectiveUser, isSuperAdmin, selectedUserId, currentUser.id]);

    const formatTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    const handleExport = () => {
        if (visibleLogs.length === 0) {
            alert("No history records to export.");
            return;
        }
        const dataToExport = visibleLogs.map(log => ({
            'Timestamp': formatTimestamp(log.timestamp),
            'User': log.userName,
            'Action': log.action,
        }));
        exportToCSV(dataToExport, `history_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const selectableUsers = useMemo(() => {
        const seen = new Map<number, string>();
        historyLog.forEach(log => {
            if (!seen.has(log.userId)) {
                seen.set(log.userId, log.userName);
            }
        });
        return Array.from(seen.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [historyLog]);

    return (
        <div className="page-content">
            <div className="page-header with-action">
                 <div>
                    <h1>History & Audit Trail</h1>
                    <p>{isSuperAdmin ? "Review actions taken by users across the application." : "A complete log of actions you have taken within the application."}</p>
                </div>
                {isSuperAdmin && (
                    <div className="actions-group history-actions-group">
                        <div className="filter-group">
                            <label>Filter by User</label>
                            <select className="history-user-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                                <option value={currentUser.id.toString()}>My History</option>
                                <option value="all">All Users</option>
                                {selectableUsers.filter(u => u.id !== currentUser.id).map(user => (
                                    <option key={user.id} value={user.id.toString()}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn history-export-btn" onClick={handleExport}>
                            <span className="material-symbols-outlined">download</span> Export
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
                                            <strong>{log.userName}</strong>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {log.action}
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
