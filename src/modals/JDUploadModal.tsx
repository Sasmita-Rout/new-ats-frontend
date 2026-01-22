import React from 'react';

const JDUploadModal = ({ isOpen, onClose, onAddFiles }) => {
    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddFiles(e.target.files);
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Job Descriptions to Queue</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="upload-area">
                        <span className="material-symbols-outlined">upload_file</span>
                        <p>Drag & drop files here, or click to select</p>
                        <small>Supported formats: PDF, DOCX, TXT</small>
                        <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" multiple />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JDUploadModal;
