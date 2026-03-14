import React, { useMemo } from 'react';
import Chatbot from '../ai/Chatbot';

const Sidebar = ({ currentPage, onNavigate, effectiveUser }) => {

    const navConfig = useMemo(() => [
        { name: 'Dashboard', icon: 'space_dashboard', page: 'Dashboard' },
        { name: 'Projects', icon: 'account_tree', page: 'Job Matching' },
        { name: 'All Candidates', icon: 'person_search', page: 'Candidates' },
        { name: 'Calendar', icon: 'event_upcoming', page: 'Calendar' },
        { name: 'Communications', icon: 'forum', page: 'Communications' },
        { name: 'Reports', icon: 'query_stats', page: 'Reports' },
        { name: 'History', icon: 'timeline', page: 'History' },
    ], []);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
  <h1 style={{ fontSize: "26px", fontWeight: "700", margin: 0 }}>
    <span style={{ color: "#e11d48" }}>Accion</span>Talent
  </h1>

 <p style={{ fontSize: "14px", marginTop: "4px", marginLeft: "4px", color: "#cbd5e1" }}>
  Internal Talent Platform
</p>
</div>
            <nav className="sidebar-nav">
                <ul>
                    {navConfig.map(item => (
                        <li key={item.name}>
                            <div
                                className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
                                onClick={() => onNavigate(item.page)}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.name}
                            </div>
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