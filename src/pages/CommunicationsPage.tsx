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
    const [showSampleTemplates, setShowSampleTemplates] = useState(false);
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

    const sampleTemplates = [
        {
            category: 'Interview Schedule',
            title: 'Initial HR Screening',
            subject: 'Interview Invitation - [Job Title]',
            body: `Hi [Candidate Name],

Thank you for your interest in the [Job Title] role.
We would like to schedule an initial HR screening with you.

Please confirm your availability for the proposed interview slot.

Best regards,
Recruitment Team`,
        },
        {
            category: 'Interview Schedule',
            title: 'Technical Interview Invite',
            subject: 'Technical Interview Scheduled - [Job Title]',
            body: `Hi [Candidate Name],

Your technical interview for the [Job Title] role has been scheduled.
Meeting Link: [Meeting Link]

Please join 5 minutes before the scheduled time.

Regards,
Talent Acquisition Team`,
        },
        {
            category: 'Interview Schedule',
            title: 'Final Round Interview',
            subject: 'Final Interview Round - [Job Title]',
            body: `Hi [Candidate Name],

You have been shortlisted for the final interview round for the [Job Title] role.
Meeting Link: [Meeting Link]

Please be available 10 minutes before the interview.

Regards,
Hiring Team`,
        },
        {
            category: 'Interview Schedule',
            title: 'Interview Reschedule Request',
            subject: 'Interview Reschedule - [Job Title]',
            body: `Hi [Candidate Name],

Due to an internal scheduling change, we request to reschedule your interview for the [Job Title] role.

Please share your availability for the next 2-3 business days.

Apologies for the inconvenience.

Regards,
Recruitment Team`,
        },
        {
            category: 'Interview Schedule',
            title: 'Panel Interview Confirmation',
            subject: 'Panel Interview Confirmation - [Job Title]',
            body: `Hi [Candidate Name],

This is to confirm your panel interview for the [Job Title] role.
Meeting Link: [Meeting Link]

Panel members will evaluate technical depth and role fit.

Best regards,
Recruitment Team`,
        },
        {
            category: 'Direct Interview',
            title: 'Walk-in / Direct Interview',
            subject: 'Direct Interview Invitation - [Job Title]',
            body: `Hi [Candidate Name],

You are invited for a direct interview for the [Job Title] position.

Location: [Location]
Please carry an updated resume and valid ID proof.

Regards,
HR Team`,
        },
        {
            category: 'Direct Interview',
            title: 'In-Person Interview Invitation',
            subject: 'In-Person Interview Invite - [Job Title]',
            body: `Hi [Candidate Name],

You are invited for an in-person interview for the [Job Title] role.

Location: [Location]
Please report 15 minutes early at the reception.

Regards,
Talent Acquisition Team`,
        },
        {
            category: 'Direct Interview',
            title: 'Same-Day Interview Invite',
            subject: 'Urgent Interview Opportunity - [Job Title]',
            body: `Hi [Candidate Name],

We have an immediate interview slot open today for the [Job Title] role.

If interested, please confirm your availability at the earliest.

Regards,
Recruitment Team`,
        },
        {
            category: 'Joining / Offer',
            title: 'Offer & Joining Instructions',
            subject: 'Welcome Onboard - Joining Details',
            body: `Hi [Candidate Name],

Congratulations and welcome to the team.
Your joining for the [Job Title] role is confirmed.

Please report to the office as per the joining instructions shared by HR.

Best wishes,
People Operations`,
        },
        {
            category: 'Joining / Offer',
            title: 'Offer Rollout Email',
            subject: 'Offer Released - [Job Title]',
            body: `Hi [Candidate Name],

We are pleased to inform you that your offer for the [Job Title] role has been released.

Kindly review the offer details and confirm your acceptance.

Regards,
HR Team`,
        },
        {
            category: 'Joining / Offer',
            title: 'Pre-Joining Document Request',
            subject: 'Document Submission Before Joining',
            body: `Hi [Candidate Name],

Welcome aboard. To complete your onboarding, please share the required documents before your joining date.

If you need any help, feel free to contact us.

Regards,
People Operations`,
        },
        {
            category: 'Joining / Offer',
            title: 'First Day Office Instructions',
            subject: 'Day 1 Office Instructions - [Job Title]',
            body: `Hi [Candidate Name],

We are excited to welcome you on your first day.

Reporting Location: [Location]
Please carry valid ID proof and required onboarding documents.

Best regards,
HR Operations`,
        },
        {
            category: 'Follow-up',
            title: 'Interview Follow-up',
            subject: 'Follow-up on Your Interview - [Job Title]',
            body: `Hi [Candidate Name],

Thank you for attending the interview for the [Job Title] role.
We appreciate your time and interest.

We will share the next update shortly.

Regards,
Recruitment Team`,
        },
        {
            category: 'Follow-up',
            title: 'Selection Update',
            subject: 'Update on Your Application - [Job Title]',
            body: `Hi [Candidate Name],

Thank you for your patience.
We are pleased to move your profile forward for the [Job Title] role.

Our team will connect with you shortly regarding next steps.

Regards,
Hiring Team`,
        },
        {
            category: 'Follow-up',
            title: 'Regret / Not Selected',
            subject: 'Application Update - [Job Title]',
            body: `Hi [Candidate Name],

Thank you for your interest in the [Job Title] role and for taking time to interview with us.

After careful consideration, we will not be moving forward at this stage.
We wish you all the best in your career.

Regards,
Recruitment Team`,
        },
    ];

    const handleUseSampleTemplate = (template: { subject: string; body: string }) => {
        setSubject(template.subject);
        setBody(template.body);
        setShowSampleTemplates(false);
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
                                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowSampleTemplates(true)}>
                                        <span className="material-symbols-outlined">menu_book</span> Sample Templates
                                    </button>
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
            {showSampleTemplates && (
                <div className="modal-overlay" onClick={() => setShowSampleTemplates(false)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Sample Email Templates</h3>
                            <button onClick={() => setShowSampleTemplates(false)} className="close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-subtitle">Select a template to auto-fill subject and message body.</p>
                            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                                {sampleTemplates.map((template, idx) => (
                                    <div
                                        key={`${template.title}-${idx}`}
                                        style={{
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            padding: '14px',
                                            background: '#fff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{template.category}</div>
                                                <div style={{ fontWeight: 600 }}>{template.title}</div>
                                            </div>
                                            <button type="button" className="btn btn-primary btn-small" onClick={() => handleUseSampleTemplate(template)}>
                                                Use Template
                                            </button>
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#374151' }}>
                                            <strong>Subject:</strong> {template.subject}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowSampleTemplates(false)}>Close</button>
                        </div>
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
