import React, { useState, useEffect, useRef } from 'react';
import { Candidate, JobDescription, User, Notification } from '../../types/types';
import { getInitials } from '../../utils/helpers';
import ProfilePopover from './ProfilePopover';
import NotificationPopover from './NotificationPopover';

const GlobalSearchResults = ({ candidates, jobs, onCandidateSelect, onJobSelect }) => {
    const hasResults = candidates.length > 0 || jobs.length > 0;
    return (
        <div className="global-search-results">
            {hasResults ? (
                <>
                    {candidates.length > 0 && (
                        <div className="search-results-section">
                            <h4 className="search-results-header">Candidates</h4>
                            {candidates.map(c => (
                                <div key={c.id} className="search-result-item" onClick={() => onCandidateSelect(c)}>
                                    <div className="user-avatar small">{getInitials(c.name)}</div>
                                    <div>
                                        <p className="result-title">{c.name}</p>
                                        <p className="result-subtitle">{c.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {jobs.length > 0 && (
                         <div className="search-results-section">
                            <h4 className="search-results-header">Jobs</h4>
                            {jobs.map(j => (
                                 <div key={j.id} className="search-result-item" onClick={() => onJobSelect(j)}>
                                     <span className="material-symbols-outlined icon">work</span>
                                     <div>
                                        <p className="result-title">{j.title}</p>
                                        <p className="result-subtitle">{j.companyName}</p>
                                     </div>
                                 </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="no-results">No results found.</div>
            )}
        </div>
    );
};

const Header = ({ user, impersonatedUser, onStopImpersonation, globalSearchTerm, onSearchChange, candidates, jobs, onCandidateSelect, onJobSelect, onUpdateCurrentUser, onLogout, onNavigate, notifications, onMarkAsRead, onMarkAllAsRead, onNotificationNavigate }) => {
    const [isResultsVisible, setIsResultsVisible] = useState(false);
    const [isProfilePopoverVisible, setProfilePopoverVisible] = useState(false);
    const [isNotificationPopoverVisible, setNotificationPopoverVisible] = useState(false);
    const searchRef = useRef(null);
    const actionsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsResultsVisible(false);
            }
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setProfilePopoverVisible(false);
                setNotificationPopoverVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef, actionsRef]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
        if (e.target.value) {
            setIsResultsVisible(true);
        } else {
            setIsResultsVisible(false);
        }
    };

    const handleCandidateClick = (candidate: Candidate) => {
        onCandidateSelect(candidate);
        setIsResultsVisible(false);
    };
    
    const handleJobClick = (job: JobDescription) => {
        onJobSelect(job);
        setIsResultsVisible(false);
    };

    const handleNotificationBellClick = () => {
        setNotificationPopoverVisible(!isNotificationPopoverVisible);
        setProfilePopoverVisible(false);
    };
    
    const handleProfileClick = () => {
        setProfilePopoverVisible(!isProfilePopoverVisible);
        setNotificationPopoverVisible(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
    <>
        {impersonatedUser && (
            <div className="impersonation-banner">
                <span className="material-symbols-outlined">visibility</span>
                You are viewing as <strong>{impersonatedUser.name}</strong> ({impersonatedUser.role}).
                <button onClick={onStopImpersonation}>Stop Impersonating</button>
            </div>
        )}
        <header className="header">
            <div className="global-search-container" ref={searchRef}>
                <div className="search-bar-wrapper">
                    <span className="material-symbols-outlined">search</span>
                    <input 
                        type="text" 
                        placeholder="Global search for candidates, jobs..." 
                        value={globalSearchTerm}
                        onChange={handleInputChange}
                        onFocus={() => { if (globalSearchTerm) setIsResultsVisible(true); }}
                    />
                </div>
                {isResultsVisible && globalSearchTerm && (
                    <GlobalSearchResults 
                        candidates={candidates}
                        jobs={jobs}
                        onCandidateSelect={handleCandidateClick}
                        onJobSelect={handleJobClick}
                    />
                )}
            </div>
            <div className="header-actions" ref={actionsRef}>
                <div className="notification-bell" onClick={handleNotificationBellClick}>
                    <span className="material-symbols-outlined">notifications</span>
                    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </div>
                {isNotificationPopoverVisible && (
                    <NotificationPopover
                        notifications={notifications}
                        onClose={() => setNotificationPopoverVisible(false)}
                        onMarkAsRead={onMarkAsRead}
                        onMarkAllAsRead={onMarkAllAsRead}
                        onNavigate={onNotificationNavigate}
                    />
                )}
                {user && (
                    <div className="user-profile" onClick={handleProfileClick}>
                        <div className="user-avatar">
                             {user.avatar && user.avatar.startsWith('data:image') ? (
                                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                getInitials(user.name)
                            )}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                    </div>
                )}
                 {isProfilePopoverVisible && user && (
                    <ProfilePopover 
                        user={user}
                        onClose={() => setProfilePopoverVisible(false)}
                        onUpdate={onUpdateCurrentUser}
                        onLogout={onLogout}
                        onNavigate={onNavigate}
                    />
                )}
            </div>
        </header>
    </>
    );
};

export default Header;