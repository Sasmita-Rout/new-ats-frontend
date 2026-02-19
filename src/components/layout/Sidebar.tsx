
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserPermission } from '../../types/types';

const Sidebar = ({ currentPage, onNavigate, effectiveUser }) => {
    
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
        {
            name: 'Settings',
            icon: 'settings',
            children: [
                { name: 'My Profile', icon: 'person', page: 'SettingsMyProfile' },
                { name: 'Contact Support', icon: 'support_agent', page: 'SettingsContactSupport' },
            ]
        },
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

    useEffect(() => {
        const activeParents = navConfig
            .filter(item => item.children && item.children.some(child => child.page === currentPage))
            .map(item => item.name);

        if (activeParents.length > 0) {
            setExpandedSections(prev => {
                const next = { ...prev };
                activeParents.forEach(name => {
                    next[name] = true;
                });
                return next;
            });
        }
    }, [currentPage, navConfig]);

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
        </aside>
    );
};


export default Sidebar;
