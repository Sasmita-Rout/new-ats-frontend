import React, { useState, useRef } from 'react';
import { User } from '../../types/types';
import { getInitials } from '../../utils/helpers';

interface ProfilePopoverProps {
    user: User;
    onUpdate: (data: Partial<User>) => void;
}

const ProfilePopover: React.FC<ProfilePopoverProps> = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [avatar, setAvatar] = useState(user.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onUpdate({ name, avatar });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setName(user.name);
        setAvatar(user.avatar);
        setIsEditing(false);
    };

    const AvatarDisplay = ({ src, name, sizeClass = 'large' }) => (
        <div className={`user-avatar ${sizeClass}`} style={{ position: 'relative' }}>
            {src && src.startsWith('data:image') ? (
                <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
                getInitials(name)
            )}
        </div>
    );
    
    return (
        <div className="profile-popover">
            <div className="popover-header">
                {isEditing ? (
                    <div className="avatar-edit-container" onClick={handleAvatarClick} title="Change profile picture">
                        <AvatarDisplay src={avatar} name={name} sizeClass="large" />
                        <div className="avatar-overlay">
                            <span className="material-symbols-outlined">photo_camera</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                ) : (
                    <AvatarDisplay src={user.avatar} name={user.name} sizeClass="large" />
                )}
                
                <div className="user-info">
                    {isEditing ? (
                        <input
                            type="text"
                            className="popover-name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    ) : (
                        <span className="user-name">{user.name}</span>
                    )}
                    <span className="user-email">{user.email}</span>
                </div>
            </div>

            <div className="popover-content">
                {isEditing ? (
                    <div className="popover-actions">
                        <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                    </div>
                ) : (
                     <div className="popover-actions">
                        <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => setIsEditing(true)}>
                             <span className="material-symbols-outlined">edit</span> Edit Profile
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ProfilePopover;
