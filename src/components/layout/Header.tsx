import React, { useState, useEffect, useRef } from 'react';
import { Candidate, JobDescription, User, Notification, Project } from '../../types/types';
import { getInitials } from '../../utils/helpers';
import ProfilePopover from './ProfilePopover';
import NotificationPopover from './NotificationPopover';

const GlobalSearchResults = ({ candidates, jobs, projects, onCandidateSelect, onJobSelect, onProjectSelect }) => {
    const hasResults = candidates.length > 0 || jobs.length > 0 || projects.length > 0;
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
                    {projects.length > 0 && (
                        <div className="search-results-section">
                            <h4 className="search-results-header">Projects</h4>
                            {projects.map(p => (
                                <div key={p.project_id} className="search-result-item" onClick={() => onProjectSelect(p)}>
                                    <span className="material-symbols-outlined icon">folder</span>
                                    <div>
                                        <p className="result-title">{p.project_name}</p>
                                        <p className="result-subtitle">{p.project_id}</p>
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

const Header = ({ currentPage, user, impersonatedUser, onStopImpersonation, globalSearchTerm, onSearchChange, candidates, jobs, projects, onCandidateSelect, onJobSelect, onProjectSelect, onUpdateCurrentUser, onLogout, onNavigate, notifications, onMarkAsRead, onMarkAllAsRead, onNotificationNavigate }) => {
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

    const handleProjectClick = (project: Project) => {
        onProjectSelect(project);
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
    const isContactSupportOpen = currentPage === 'SettingsContactSupport';
    
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
                        placeholder="Global search for candidates, projects, jobs..." 
                        value={globalSearchTerm}
                        onChange={handleInputChange}
                        onFocus={() => { if (globalSearchTerm) setIsResultsVisible(true); }}
                    />
                </div>
                {isResultsVisible && globalSearchTerm && (
                    <GlobalSearchResults 
                        candidates={candidates}
                        jobs={jobs}
                        projects={projects}
                        onCandidateSelect={handleCandidateClick}
                        onJobSelect={handleJobClick}
                        onProjectSelect={handleProjectClick}
                    />
                )}
            </div>
            <div className="header-actions" ref={actionsRef}>
                <button
                    type="button"
                    className="contact-support-button"
                    onClick={() => onNavigate(isContactSupportOpen ? 'Dashboard' : 'SettingsContactSupport')}
                    title="Contact Support"
                    aria-label="Contact support"
                >
                    <span className="material-symbols-outlined">headset</span>
                </button>
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
                        onUpdate={onUpdateCurrentUser}
                    />
                )}
            </div>
        </header>
    </>
    );
};

export default Header;
