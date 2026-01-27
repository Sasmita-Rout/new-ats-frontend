import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate } from '../types/types';
import { getInitials } from '../utils/helpers';

const CommunicationsPage = ({ emailTargets, onClearTargets, onUpdateTargets, onSendEmail, initialDraft, onClearDraft, onScheduleMeeting }) => {
    const [fromEmail, setFromEmail] = useState('sarah.johnson@acciontalent.com');
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
    const [bulkSendProgress, setBulkSendProgress] = useState({ active: false, index: 0 });
    const [manualEmailInput, setManualEmailInput] = useState('');
    
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
    }, [initialDraft, onClearDraft]);

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

    const addManualEmail = () => {
        if (!manualEmailInput) return;
        
        const email = manualEmailInput.trim();
        if (isValidEmail(email)) {
            // Check if already exists
            if (emailTargets.some(c => c.contact?.email === email)) {
                setManualEmailInput('');
                return;
            }

            const newCandidate: any = {
                id: Date.now(),
                name: email.split('@')[0],
                contact: { email: email, phone: '', location: '' },
                avatar: getInitials(email),
                skills: [],
                tags: [],
                status: 'Applied',
                title: 'External Contact'
            };
            
            onUpdateTargets([...emailTargets, newCandidate]);
            setManualEmailInput('');
        }
    };

    const handleManualEmailKeyDown = (e: React.KeyboardEvent) => {
        if (['Enter', 'Tab', ',', ' '].includes(e.key)) {
            e.preventDefault();
            addManualEmail();
        }
    };

    const handleGenerateEmail = async (e) => {
        e.preventDefault();
        if (!aiPrompt) return;

        setIsGenerating(true);
        setShowAIPrompt(false);
        try {
            // Fix: Re-instantiate AI right before the call to ensure up-to-date config if necessary.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const emailSchema = {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING, description: "A concise and professional subject line for the email." },
                    body: { type: Type.STRING, description: "The full body of the email. Use placeholders like '[Candidate Name]' and '[Job Title]' where appropriate. Use line breaks (\\n) for paragraphs." }
                },
                required: ['subject', 'body']
            };

            const fullPrompt = `You are an expert recruitment coordinator. Generate a professional email to a job candidate based on this prompt: "${aiPrompt}". 
- Use placeholders like [Candidate Name] and [Job Title] where appropriate. 
- Format the body with paragraphs separated by newlines (\\n).
- Ensure the tone is professional and engaging.`;
            
            // Fix: Updated model name to 'gemini-3-flash-preview' for basic text tasks.
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: fullPrompt }] },
                config: { responseMimeType: 'application/json', responseSchema: emailSchema },
            });
            
            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.substring(7).trim();
            }
            if (jsonString.endsWith('```')) {
                jsonString = jsonString.slice(0, -3).trim();
            }
            
            const emailData = JSON.parse(jsonString);
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
        const hasInvalidEmails = emailTargets.some(c => !isValidEmail(c.contact.email));
        if (hasInvalidEmails) {
            alert("You have invalid or missing email addresses in your recipient list. Please remove them before sending.");
            return;
        }
        setShowSendConfirm(true);
    };
    
    const handleSendIndividualEmail = (candidate: Candidate) => {
        if (!isValidEmail(candidate.contact.email)) return;
    
        let mailBody = body;
        if (attachments.length > 0) {
            const attachmentNote = `--- \nPlease manually attach the following files:\n${attachments.map(f => `- ${f.name}`).join('\n')}\n---\n\n`;
            mailBody = attachmentNote + body;
        }
    
        const personalizedBody = mailBody.replace(/\[Candidate Name\]/gi, candidate.name);
        
        const to = candidate.contact.email;
        const mailtoLink = `mailto:${to}` +
                         `?cc=${encodeURIComponent(cc)}` +
                         `&bcc=${encodeURIComponent(bcc)}` +
                         `&subject=${encodeURIComponent(subject)}` +
                         `&body=${encodeURIComponent(personalizedBody)}`;
    
        window.open(mailtoLink, '_blank');
    };
    
    const handleSingleSend = () => {
        onSendEmail(emailTargets.map(c => c.id), subject);
        setShowSendConfirm(false);
        handleSendIndividualEmail(emailTargets[0]);
        setTimeout(() => {
            handleClear();
            onClearTargets();
        }, 500);
    };
    
    const handleStartBulkSend = () => {
        onSendEmail(emailTargets.map(c => c.id), subject);
        setBulkSendProgress({ active: true, index: 0 });
        handleSendIndividualEmail(emailTargets[0]);
    };
    
    const handleBulkSendNext = () => {
        const nextIndex = bulkSendProgress.index + 1;
        if (nextIndex < emailTargets.length) {
            setBulkSendProgress(prev => ({ ...prev, index: nextIndex }));
            handleSendIndividualEmail(emailTargets[nextIndex]);
        }
    };
    
    const handleBulkSendFinish = () => {
        setShowSendConfirm(false);
        setBulkSendProgress({ active: false, index: 0 });
        setTimeout(() => {
            handleClear();
            onClearTargets();
        }, 500);
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
                <p>Compose and send emails to your candidates. Emails are sent via your default mail client.</p>
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
                                    <p className="recipient-email">{candidate.contact.email}</p>
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
                                <div id="to" className="recipient-pills-container" onClick={() => document.getElementById('manual-email-input')?.focus()}>
                                    {emailTargets.map(candidate => (
                                        <div key={candidate.id} className={`recipient-pill ${!isValidEmail(candidate.contact?.email) ? 'invalid' : ''}`}>
                                            <span className="pill-name">{candidate.name}</span>
                                            <span className="pill-email">&lt;{candidate.contact?.email || 'No Email'}&gt;</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveTarget(candidate.id); }} className="remove-recipient-btn" title={`Remove ${candidate.name}`}>&times;</button>
                                        </div>
                                    ))}
                                    <input
                                        id="manual-email-input"
                                        type="text"
                                        value={manualEmailInput}
                                        onChange={(e) => setManualEmailInput(e.target.value)}
                                        onKeyDown={handleManualEmailKeyDown}
                                        onBlur={addManualEmail}
                                        placeholder={emailTargets.length === 0 ? "Enter email addresses..." : ""}
                                        style={{ border: 'none', outline: 'none', flexGrow: 1, minWidth: '150px', background: 'transparent', fontSize: '14px' }}
                                    />
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
                                     <button 
                                        className="btn btn-secondary btn-small" 
                                        onClick={() => onScheduleMeeting(emailTargets[0])} 
                                        disabled={emailTargets.length !== 1}
                                        title={emailTargets.length !== 1 ? "Select exactly one recipient to schedule a meeting" : "Schedule a meeting"}
                                    >
                                        <span className="material-symbols-outlined">event</span> Schedule Interview
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
            {showSendConfirm && (
                <div className="modal-overlay" onClick={() => { if(!bulkSendProgress.active) setShowSendConfirm(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                         <div className="modal-header">
                            <h3>{bulkSendProgress.active ? 'Sending In Progress' : 'Confirm Email'}</h3>
                             <button onClick={() => setShowSendConfirm(false)} className="close-btn" disabled={bulkSendProgress.active}>&times;</button>
                        </div>
                        {!bulkSendProgress.active ? (
                            <>
                                <div className="modal-body confirmation-modal">
                                    <span className="material-symbols-outlined confirmation-icon">forward_to_inbox</span>
                                    {emailTargets.length > 1 ? (
                                        <>
                                            <h3>Send Personalized Emails</h3>
                                            <p>You are about to generate <strong>{emailTargets.length} individual emails</strong>, one for each recipient.</p>
                                            <p>Your email client will open a new draft for each person. You must review and send each one manually.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3>Open Email Client</h3>
                                            <p>This will open your default email application with the email pre-filled.</p>
                                        </>
                                    )}
                                     {attachments.length > 0 && (
                                        <p className="attachment-reminder">
                                            <strong>Don't forget to manually attach your {attachments.length} file(s)!</strong>
                                        </p>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowSendConfirm(false)}>Cancel</button>
                                    {emailTargets.length > 1 ? (
                                        <button type="button" className="btn btn-primary" onClick={handleStartBulkSend}>Start Sending</button>
                                    ) : (
                                        <button type="button" className="btn btn-primary" onClick={handleSingleSend}>Continue to Email</button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="modal-body confirmation-modal">
                                    <div className="bulk-send-progress">
                                        <span className="material-symbols-outlined">outgoing_mail</span>
                                        <h4>Sending in Progress...</h4>
                                        <p className="progress-text">
                                            Email {bulkSendProgress.index + 1} of {emailTargets.length}
                                        </p>
                                        <div className="progress-bar-modal">
                                            <div className="progress-bar-inner-modal" style={{ width: `${((bulkSendProgress.index + 1) / emailTargets.length) * 100}%` }}></div>
                                        </div>
                                        <p>
                                            A draft for <strong>{emailTargets[bulkSendProgress.index].name}</strong> should be open.
                                            <br/>
                                            Please review and send it from your email client.
                                        </p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    {bulkSendProgress.index < emailTargets.length - 1 ? (
                                        <button type="button" className="btn btn-primary" onClick={handleBulkSendNext}>
                                            Next: Email {emailTargets[bulkSendProgress.index + 1].name}
                                            <span className="material-symbols-outlined">arrow_forward</span>
                                        </button>
                                    ) : (
                                        <button type="button" className="btn btn-primary" onClick={handleBulkSendFinish}>
                                            <span className="material-symbols-outlined">done_all</span>
                                            Finish Sending
                                        </button>
                                    )}
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