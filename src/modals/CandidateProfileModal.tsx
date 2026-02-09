import React from 'react';
import { Candidate } from '../types/types';
import SkillTag from '../components/common/SkillTag';
import { getInitials } from '../utils/helpers';
import { downloadOriginalResume, downloadResumeText } from '../utils/fileUtils';

const CandidateProfileModal = ({ isOpen, onClose, candidate }) => {
    if (!isOpen || !candidate) return null;

    const totalExp = candidate.totalExperienceYears ?? (candidate as any).experience ?? 0;
    const dob = (candidate as any).dob || 'DOB N/A';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="profile-header-premium" style={{
                    background: 'linear-gradient(135deg, var(--color-surface-solid), var(--color-surface-soft))',
                    padding: '40px 24px 32px',
                    textAlign: 'center'
                }}>
                    <button onClick={onClose} className="close-btn-absolute">
                        <span className="material-symbols-outlined">close</span>
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
                            {totalExp !== undefined ? `${totalExp} Years Exp` : 'Exp N/A'}
                        </div>
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
                            {candidate.contact.email || 'No Email'}
                        </div>
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
                            {candidate.contact.phone || 'No Phone'}
                        </div>
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
                            {candidate.contact.location || 'No Location'}
                        </div>
                    </div>
                </div>

                <div className="modal-body profile-body-premium" style={{ padding: '32px' }}>
                    <div className="premium-card">
                        <div className="jd-card-section">
                            <h5>Technical Expertise</h5>
                            <div className="skills-container">
                                {candidate.skills && candidate.skills.length > 0
                                    ? candidate.skills.map(skill => (
                                        <SkillTag key={skill} tag={skill} />
                                    ))
                                    : <p className="placeholder-text" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No skills listed.</p>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer premium-footer" style={{ justifyContent: 'space-between', padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {(candidate.originalResumeFile || candidate.contact?.email) && (
                            <button type="button" className="btn btn-secondary" onClick={() => downloadOriginalResume(candidate)}>
                                <span className="material-symbols-outlined">download</span> Original Resume
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={() => downloadResumeText(candidate)}>
                            <span className="material-symbols-outlined">description</span> Download Text
                        </button>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default CandidateProfileModal;
