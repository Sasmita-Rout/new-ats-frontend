
import React, { useState, useMemo } from 'react';
import { User, UserPermission } from '../../types/types';

const Sidebar = ({ currentPage, onNavigate, effectiveUser, onLogout }) => {
    
    const [expandedSections, setExpandedSections] = useState({ 
        'ATS': true 
    });

    const navConfig = useMemo(() => [
        {
            name: 'ATS',
            icon: 'business_center',
            children: [
                { name: 'Dashboard', icon: 'dashboard', page: 'Dashboard' },
                { name: 'Projects', icon: 'work', page: 'Job Matching' },
                { name: 'All Candidates', icon: 'groups', page: 'Candidates' },
                { name: 'Calendar', icon: 'calendar_month', page: 'Calendar' },
                { name: 'Communications', icon: 'mail', page: 'Communications' },
                { name: 'Reports', icon: 'analytics', page: 'Reports' },
                { name: 'History', icon: 'history', page: 'History' },
            ]
        },
        ...(effectiveUser.role.includes('Admin') ? [{ name: 'Manage Users', icon: 'manage_accounts', page: 'Manage Users' }] : []),
        { name: 'Settings', icon: 'settings', page: 'Settings' },
    ], [effectiveUser.role]);

    const toggleSection = (sectionName: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    };

    const isParentActive = (item) => {
        if (!item.children) return false;
        return item.children.some(child => child.page === currentPage);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="logo">AccionTalent</h1>
                <p className="subtitle">Internal Talent Platform</p>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {navConfig.map(item => (
                        <li key={item.name} className="nav-section">
                            {item.children ? (
                                <>
                                    <div 
                                        className={`nav-item nav-section-header ${isParentActive(item) ? 'active' : ''}`}
                                        onClick={() => toggleSection(item.name)}
                                        aria-expanded={expandedSections[item.name]}
                                        role="button"
                                    >
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                        {item.name}
                                        <span className="material-symbols-outlined expand-icon">chevron_right</span>
                                    </div>
                                    <ul className={`nav-section-children ${expandedSections[item.name] ? 'expanded' : ''}`}>
                                        {item.children.map(child => (
                                            <li key={child.name}>
                                                <div 
                                                    className={`nav-item ${currentPage === child.page ? 'active' : ''}`}
                                                    onClick={() => onNavigate(child.page)}
                                                >
                                                    <span className="material-symbols-outlined">{child.icon}</span>
                                                    {child.name}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <div 
                                    className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
                                    onClick={() => onNavigate(item.page)}
                                >
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                    {item.name}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="sidebar-logout">
                 <button className="btn btn-secondary" style={{width: '100%'}} onClick={onLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    Logout
                </button>
            </div>
        </aside>
    );
};


export default Sidebar;
