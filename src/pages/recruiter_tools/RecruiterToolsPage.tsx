import React from 'react';
import ResumeMatcherTool from './ResumeMatcherTool';

const RecruiterToolsPage = (props) => {
    return (
        <div className="page-content recruiter-tools-hub">
            <div className="page-header" style={{textAlign: 'center'}}>
                <h1>Resume & JD Matcher</h1>
                <p>Get an instant AI-powered match analysis by providing a resume and a job description.</p>
            </div>

            <div className="tool-content-container">
                 <ResumeMatcherTool {...props} />
            </div>
        </div>
    );
};

export default RecruiterToolsPage;
