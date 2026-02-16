import React, { useState, useRef, useEffect } from 'react';
import { getInitials } from '../utils/helpers';

const CommunicationsPage = ({ emailTargets, onClearTargets, onUpdateTargets, onSendEmail, initialDraft, onClearDraft, senderEmail, onGenerateEmail }) => {
    const [fromEmail, setFromEmail] = useState(senderEmail || '');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        if (initialDraft) {
            setSubject(initialDraft.subject || '');
            setBody(initialDraft.body || '');
            if (initialDraft.cc) {
                setCc(initialDraft.cc);
                setShowCcBcc(true);
            }
            onClearDraft(); 
        }
    }, [initialDraft]);

    useEffect(() => {
        if (senderEmail && senderEmail !== fromEmail) {
            setFromEmail(senderEmail);
        }
    }, [senderEmail, fromEmail]);

    useEffect(() => {
        return () => {
            onClearTargets();
        };
    }, [onClearTargets]); 
    
    const isValidEmail = (email: string) => {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleRemoveTarget = (candidateId: number) => {
        const newTargets = emailTargets.filter(c => c.id !== candidateId);
        onUpdateTargets(newTargets);
    };

    const handleGenerateEmail = async (e) => {
        e.preventDefault();
        if (!aiPrompt) return;

        setIsGenerating(true);
        setShowAIPrompt(false);
        try {
            if (!onGenerateEmail) throw new Error('AI generation is not configured.');
            const emailData = await onGenerateEmail(aiPrompt);
            setSubject(emailData.subject || '');
            setBody(emailData.body || '');
        } catch (error) {
            console.error("AI email generation failed:", error);
            alert(`Sorry, the AI failed to generate an email. This might be a temporary issue. Please check the console for more details.\nError: ${error.message}`);
        } finally {
            setIsGenerating(false);
            setAiPrompt('');
        }
    };

    const handleClear = () => {
        setSubject('');
        setBody('');
        setCc('');
        setBcc('');
        setAttachments([]);
        setShowCcBcc(false);
    };
    
    const handleSendAttempt = () => {
        if (emailTargets.length === 0) {
            alert("Please add recipients before sending.");
            return;
        }
        if (!fromEmail) {
            alert("Please provide a 'From' email address before sending.");
            return;
        }
        if (!subject || !body) {
            alert("Please provide a subject and a message body before sending.");
            return;
        }
        if (attachments.length > 0) {
            alert("File attachments are not supported for API sending yet. Please remove attachments before sending.");
            return;
        }
       
        const hasInvalidEmails = emailTargets.some(c => !isValidEmail(c.email));
        if (hasInvalidEmails) {
            alert("You have invalid or missing email addresses in your recipient list. Please remove them before sending.");
            return;
        }
        setShowSendConfirm(true);
    };
    
    const handleConfirmSend = async () => {
        if (!onSendEmail) return;
        setIsSending(true);
        try {
            await onSendEmail({
                candidates: emailTargets,
                subject,
                body,
                fromEmail,
                cc,
                bcc,
                contentType: 'Text',
                saveToSentItems: true,
            });
            setShowSendConfirm(false);
            handleClear();
            onClearTargets();
        } catch (error) {
            console.error('Failed to send email:', error);
            alert(error instanceof Error ? error.message : 'Failed to send email.');
        } finally {
            setIsSending(false);
        }
    };


    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const handleRemoveAttachment = (fileToRemove: File) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const applyFormat = (format: 'bold' | 'italic' | 'underline' | 'list') => {
        const textarea = bodyTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let newText = '';

        if (format === 'bold') newText = `**${selectedText}**`;
        else if (format === 'italic') newText = `*${selectedText}*`;
        else if (format === 'underline') newText = `__${selectedText}__`;
        else if (format === 'list') {
            const lines = selectedText.split('\n');
            newText = lines.map(line => `- ${line}`).join('\n');
        }

        const updatedBody = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        setBody(updatedBody);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + newText.length, start + newText.length);
        }, 0);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Communications</h1>
                <p>Compose and send emails to your candidates. Emails are sent from your connected account.</p>
            </div>
            <div className="email-composer-container">
                <div className="composer-sidebar">
                    <h4>Recipients</h4>
                    <div className="recipient-summary">
                        <span className="material-symbols-outlined">groups</span>
                        <p>
                            <strong>{emailTargets.length} Candidate(s)</strong>
                            {emailTargets.length === 0 && <small>Select candidates from the 'All Candidates' page to begin.</small>}
                        </p>
                    </div>
                     <div className="recipient-list">
                        {emailTargets.map(candidate => (
                            <div key={candidate.id} className="recipient-item">
                                <div className="candidate-avatar small">{getInitials(candidate.name)}</div>
                                <div>
                                    <p className="recipient-name">{candidate.name}</p>
                                    <p className="recipient-email">{candidate.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="composer-main">
                    <div className="composer-form">
                         <div className="form-grid-2-col">
                            <div className="form-group">
                                <label htmlFor="from">From</label>
                                <input
                                    type="email"
                                    id="from"
                                    value={fromEmail}
                                    onChange={e => setFromEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>
                             <div className="form-group">
                                <label htmlFor="to">To</label>
                                <div id="to" className="recipient-pills-container">
                                    {emailTargets.length > 0 ? (
                                        emailTargets.map(candidate => (
                                            <div key={candidate.id} className={`recipient-pill ${!isValidEmail(candidate.email) ? 'invalid' : ''}`}>
                                                <span className="pill-name">{candidate.name}</span>
                                                <span className="pill-email">&lt;{candidate.email || 'No Email'}&gt;</span>
                                                <button onClick={() => handleRemoveTarget(candidate.id)} className="remove-recipient-btn" title={`Remove ${candidate.name}`}>&times;</button>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="no-recipients-text">No recipients selected</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="subject-line-header">
                                <label htmlFor="subject">Subject</label>
                                <button type="button" className="cc-bcc-toggle" onClick={() => setShowCcBcc(!showCcBcc)}>
                                    {showCcBcc ? 'Hide CC/BCC' : 'CC/BCC'}
                                </button>
                            </div>
                            <input id="subject" type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Invitation to Interview" />
                        </div>

                         {showCcBcc && (
                            <div className="cc-bcc-fields">
                                <div className="form-group" style={{flex: 1}}>
                                    <label htmlFor="cc">CC</label>
                                    <input id="cc" type="text" value={cc} onChange={e => setCc(e.target.value)} placeholder="comma-separated emails" />
                                </div>
                                <div className="form-group" style={{flex: 1}}>
                                    <label htmlFor="bcc">BCC</label>
                                    <input id="bcc" type="text" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="comma-separated emails" />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Message Body</label>
                             <div className="textarea-toolbar">
                                 <div className="formatting-toolbar">
                                    <button title="Bold" onClick={() => applyFormat('bold')}><span className="material-symbols-outlined">format_bold</span></button>
                                    <button title="Italic" onClick={() => applyFormat('italic')}><span className="material-symbols-outlined">format_italic</span></button>
                                    <button title="Underline" onClick={() => applyFormat('underline')}><span className="material-symbols-outlined">format_underlined</span></button>
                                    <button title="Bulleted List" onClick={() => applyFormat('list')}><span className="material-symbols-outlined">format_list_bulleted</span></button>
                                </div>
                                <div className="actions-toolbar">
                                    <button className="btn btn-secondary btn-small" onClick={() => setShowAIPrompt(true)} disabled={isGenerating}>
                                        <span className="material-symbols-outlined">auto_awesome</span> {isGenerating ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </div>
                            </div>
                            <textarea ref={bodyTextareaRef} value={body} onChange={e => setBody(e.target.value)} rows={15} placeholder="Dear [Candidate Name]..."></textarea>
                        </div>

                         <div className="attachments-section">
                            <label htmlFor="file-upload" className="btn btn-secondary btn-small">
                                <span className="material-symbols-outlined">attach_file</span> Attach Files
                            </label>
                            <input id="file-upload" type="file" multiple onChange={handleFileAttach} style={{ display: 'none' }} />
                            <div className="attachments-list">
                                {attachments.map((file, index) => (
                                    <div key={index} className="attachment-tag">
                                        <span className="material-symbols-outlined">draft</span>
                                        <span>{file.name}</span>
                                        <button onClick={() => handleRemoveAttachment(file)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="composer-actions">
                        <button className="btn btn-secondary" onClick={handleClear}>Clear</button>
                        <button className="btn btn-primary" onClick={handleSendAttempt} disabled={emailTargets.length === 0}>
                            <span className="material-symbols-outlined">send</span> Send Email
                        </button>
                    </div>
                </div>
            </div>
            {showAIPrompt && (
                <div className="modal-overlay" onClick={() => setShowAIPrompt(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generate Email with AI</h3>
                            <button onClick={() => setShowAIPrompt(false)} className="close-btn">&times;</button>
                        </div>
                         <form onSubmit={handleGenerateEmail}>
                            <div className="modal-body">
                               <p className="modal-subtitle">Describe the purpose of the email, and the AI will draft a professional subject and body for you.</p>
                               <div className="prompt-examples">
                                   <strong>Some examples:</strong>
                                   <ul>
                                       <li>"An invitation to a first round interview for the Senior React Developer role."</li>
                                       <li>"A polite rejection email for candidates not moving forward."</li>
                                       <li>"An offer letter for the Project Manager position."</li>
                                   </ul>
                               </div>
                               <div className="form-group" style={{marginTop: '16px'}}>
                                   <label htmlFor="ai-prompt">Your Prompt</label>
                                   <textarea 
                                       id="ai-prompt"
                                       rows={4}
                                       value={aiPrompt} 
                                       onChange={e => setAiPrompt(e.target.value)}
                                       placeholder="e.g., A friendly follow-up email after the final interview."
                                   />
                               </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAIPrompt(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isGenerating || !aiPrompt}>Generate</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showSendConfirm && (
                <div className="modal-overlay" onClick={() => { if(!isSending) setShowSendConfirm(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                         <div className="modal-header">
                            <h3>{isSending ? 'Sending...' : 'Confirm Email'}</h3>
                             <button onClick={() => setShowSendConfirm(false)} className="close-btn" disabled={isSending}>&times;</button>
                        </div>
                        {!isSending ? (
                            <>
                                <div className="modal-body confirmation-modal">
                                    <span className="material-symbols-outlined confirmation-icon">forward_to_inbox</span>
                                    {emailTargets.length > 1 ? (
                                        <>
                                            <h3>Send Emails</h3>
                                            <p>You are about to send <strong>{emailTargets.length} emails</strong>, one for each recipient.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3>Send Email</h3>
                                            <p>This will send the email immediately.</p>
                                        </>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowSendConfirm(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleConfirmSend} disabled={isSending}>
                                        Send
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="modal-body confirmation-modal">
                                    <div className="bulk-send-progress">
                                        <span className="material-symbols-outlined">outgoing_mail</span>
                                        <h4>Sending in Progress...</h4>
                                        <p className="progress-text">Please wait while emails are sent.</p>
                                        <div className="progress-bar-modal">
                                            <div className="progress-bar-inner-modal" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" disabled>
                                        Sending...
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunicationsPage;
