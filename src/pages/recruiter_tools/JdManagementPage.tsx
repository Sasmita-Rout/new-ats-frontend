import React from 'react';

const JdManagementPage = () => {
    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Job Description (JD) Management</h1>
                <p>Create, upload, and manage all your job descriptions from one place.</p>
            </div>
            <div className="empty-state large">
                <span className="material-symbols-outlined">description</span>
                <h3>JD Management Coming Soon</h3>
                <p>This section will allow you to upload JDs from templates, create them manually, or use an AI assistant for faster setup. For now, please manage JDs within a specific project.</p>
            </div>
        </div>
    );
};

export default JdManagementPage;
