
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserPermission } from '../../types/types';
import Chatbot from '../ai/Chatbot';

const Sidebar = ({ currentPage, onNavigate, effectiveUser }) => {
    
    const [expandedSections, setExpandedSections] = useState({ 
        'ATS': true 
    });

    const navConfig = useMemo(() => [
        {
            name: 'ATS',
            icon: 'rocket_launch',
            children: [
                { name: 'Dashboard', icon: 'space_dashboard', page: 'Dashboard' },
                { name: 'Projects', icon: 'account_tree', page: 'Job Matching' },
                { name: 'All Candidates', icon: 'person_search', page: 'Candidates' },
                { name: 'Calendar', icon: 'event_upcoming', page: 'Calendar' },
                { name: 'Communications', icon: 'forum', page: 'Communications' },
                { name: 'Reports', icon: 'query_stats', page: 'Reports' },
                { name: 'History', icon: 'timeline', page: 'History' },
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
            <div className="sidebar-chatbot-slot">
                <Chatbot currentUser={effectiveUser} launcherVariant="sidebar" />
            </div>
        </aside>
    );
};


export default Sidebar;
