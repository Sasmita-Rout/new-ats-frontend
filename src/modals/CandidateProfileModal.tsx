import React from 'react';
import { Candidate } from '../types/types';
import SkillTag from '../components/common/SkillTag';
import { getInitials } from '../utils/helpers';
import { downloadOriginalResume, downloadResumeText } from '../utils/fileUtils';

const CandidateProfileModal = ({ isOpen, onClose, candidate }) => {
    if (!isOpen || !candidate) return null;

    // Robustly get data from the candidate object, providing sensible fallbacks.
    const totalExp = candidate.totalExperienceYears || 0;
    const dob = candidate.dob || 'N/A';
    const email = candidate.email || 'No Email';
    const phone = candidate.phone || 'No Phone';
    const location = candidate.location || 'No Location';
    const hasSummary = Boolean(candidate.summary && candidate.summary.trim());
    const hasOriginalDetails = Boolean(
        (candidate.originalSkills && candidate.originalSkills.trim()) ||
        (candidate.originalContact && candidate.originalContact.trim()) ||
        (candidate.originalLocation && candidate.originalLocation.trim()) ||
        (candidate.originalExperience && candidate.originalExperience.trim()) ||
        (candidate.originalDob && candidate.originalDob.trim())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content premium-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-body" style={{ padding: '40px 24px 32px', textAlign: 'center' }}>
                    <button onClick={onClose} className="close-btn" style={{ top: '16px', right: '16px' }}>
                        &times;
                    </button>

                    <div className="user-avatar premium-avatar" style={{
                        width: '100px',
                        height: '100px',
                        fontSize: '42px',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 20px var(--brand-primary-glow)',
                        border: '4px solid var(--color-surface)'
                    }}>
                        {getInitials(candidate.name)}
                    </div>

                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        marginBottom: '8px',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.5px'
                    }}>
                        {candidate.name}
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '16px'
                    }}>
                        {/* Experience */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            background: 'var(--color-surface)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>work_history</span>
                            {totalExp ? `${totalExp} years` : 'Exp N/A'}
                        </div>
                        {/* DOB */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            background: 'var(--color-surface)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>calendar_month</span>
                            {dob}
                        </div>
                        {/* Email */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            background: 'var(--color-surface)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>mail</span>
                            {email}
                        </div>
                        {/* Phone */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            background: 'var(--color-surface)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>phone</span>
                            {phone}
                        </div>
                        {/* Location */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            background: 'var(--color-surface)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>location_on</span>
                            {location}
                        </div>
                    </div>
                </div>

                <div className="modal-body" style={{ padding: '0 32px 24px', textAlign: 'left' }}>
                    <div className="info-card" style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: '12px' }}>
                        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                            <h5>Technical Expertise</h5>
                            <div className="skills-container">
                                {candidate.skills && candidate.skills.length > 0
                                    ? candidate.skills.map((skill: string) => (
                                        <SkillTag key={skill} tag={skill} />
                                    ))
                                    : <p className="placeholder-text" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No skills listed.</p>
                                }
                            </div>
                        </div>
                        {hasSummary && (
                            <div>
                                <h5>Professional Summary</h5>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    {candidate.summary}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {hasOriginalDetails && (
                    <div className="modal-body" style={{ padding: '0 32px 24px', textAlign: 'left' }}>
                        <div className="info-card" style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: '12px' }}>
                            <h5>Original Resume Details</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {candidate.originalSkills && candidate.originalSkills.trim() && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Skills:</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {candidate.originalSkills}
                                        </span>
                                    </div>
                                )}
                                {candidate.originalContact && candidate.originalContact.trim() && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Contact:</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {candidate.originalContact}
                                        </span>
                                    </div>
                                )}
                                {candidate.originalLocation && candidate.originalLocation.trim() && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Location:</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {candidate.originalLocation}
                                        </span>
                                    </div>
                                )}
                                {candidate.originalExperience && candidate.originalExperience.trim() && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Experience:</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {candidate.originalExperience}
                                        </span>
                                    </div>
                                )}
                                {candidate.originalDob && candidate.originalDob.trim() && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Date of Birth:</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {candidate.originalDob}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-footer premium-footer" style={{ justifyContent: 'space-between', padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {(candidate.originalResumeFile || (email && email !== 'No Email')) && (
                            <button type="button" className="btn btn-secondary" onClick={() => downloadOriginalResume(candidate)}>
                                <span className="material-symbols-outlined">download</span> Original Resume
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={() => downloadResumeText(candidate)}>
                            <span className="material-symbols-outlined">description</span> Download Text
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateProfileModal;
