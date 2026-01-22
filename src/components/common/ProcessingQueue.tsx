import React from 'react';

export const ProcessingQueue = ({ stagedFiles, isProcessing, processingStatus, onProcess, onClear, onRemoveFile, itemType = 'resume' }) => {
    const total = stagedFiles.length;
    const current = parseInt(processingStatus.match(/\((\d+)\//)?.[1] || "0");
    const progress = total > 0 ? (current / total) * 100 : 0;
    const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);

    return (
        <div className="processing-queue-card">
            <div className="processing-queue-header">
                <span className="material-symbols-outlined">pending_actions</span>
                <h4>Processing Queue</h4>
            </div>
            {!isProcessing ? (
                <>
                    <p>You have <strong>{total}</strong> {itemType}(s) ready for AI processing.</p>
                    <ul className="file-queue-list">
                        {stagedFiles.slice(0, 5).map(file => (
                           <li key={`${file.name}-${file.size}`}>
                                <span>{file.name}</span>
                                <button className="remove-file-btn" onClick={() => onRemoveFile(file)} title={`Remove ${file.name}`}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </li>
                        ))}
                        {total > 5 && <li className="more-files-indicator">...and {total - 5} more</li>}
                    </ul>
                    <div className="processing-queue-actions">
                        <button className="btn btn-secondary" onClick={onClear}>Clear Queue</button>
                        <button className="btn btn-primary" onClick={onProcess}>Process {capitalizedItemType}s</button>
                    </div>
                </>
            ) : (
                <div className="processing-status-view">
                    <p>{processingStatus || "Initializing processing..."}</p>
                    <div className="progress-bar">
                        <div className="progress-bar-inner" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="processing-queue-actions" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-danger" onClick={onClear}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessingQueue;
