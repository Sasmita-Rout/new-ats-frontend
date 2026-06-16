import React, { useMemo, useState, useEffect } from 'react';
import { HistoryEntry, User } from '../types/types';
import { exportToCSV } from '../utils/helpers';
import { toast } from 'react-toastify';

const HistoryPage = ({ 
    historyLog, 
    effectiveUser, 
    onNavigateTo,
    currentUser,
    impersonatedUser,
    allUsers,
    onLoadMore,
    hasMore,
    onFilterByUser
}: { 
    historyLog: HistoryEntry[], 
    effectiveUser: User,
    onNavigateTo: (type: any, id: number) => void,
    currentUser: User,
    impersonatedUser: User | null,
    allUsers: User[],
    onLoadMore?: () => void,
    hasMore?: boolean,
    onFilterByUser?: (userId: number | null) => void
}) => {
    const isSuperAdmin = (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role.includes('Admin')) && !impersonatedUser;
    const [selectedUserId, setSelectedUserId] = useState<string>(isSuperAdmin ? 'all' : effectiveUser.id.toString());

    // Reset filter when the view context changes (e.g., stops impersonating)
    useEffect(() => {
        if (!isSuperAdmin) {
            setSelectedUserId(effectiveUser.id.toString());
        }
    }, [isSuperAdmin, effectiveUser.id]);

    const handleUserChange = (userId: string) => {
        setSelectedUserId(userId);
        if (onFilterByUser) {
            onFilterByUser(userId === 'all' ? null : parseInt(userId, 10));
        }
    };

    const visibleLogs = useMemo(() => {
        return [...historyLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [historyLog]);

    const formatTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    const handleExport = () => {
        if (visibleLogs.length === 0) {
            toast.info('No history records to export.');
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
                            <select className="history-user-select" value={selectedUserId} onChange={e => handleUserChange(e.target.value)}>
                                <option value="all">All Users</option>
                                <option value={currentUser.id.toString()}>My History</option>
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
                            <th style={{ padding: '15px 26px' }}>Timestamp</th>
                            <th style={{ padding: '15px 26px' }}>User</th>
                            <th style={{ padding: '15px 26px' }}>Action Details</th>
                        </tr>
                     </thead>
                     <tbody>
                        {visibleLogs.length > 0 ? visibleLogs.map(log => (
                            <tr key={log.id}>
                                <td style={{ whiteSpace: 'nowrap', padding: '12px 24px' }}>{formatTimestamp(log.timestamp)}</td>
                                <td style={{ padding: '12px 24px' }}>
                                    <div className="user-cell">
                                        <div>
                                            <strong>{log.userName}</strong>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
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
                 {hasMore && (
                     <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                         <button className="btn btn-secondary" onClick={onLoadMore}>
                             Load More
                         </button>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default HistoryPage;
