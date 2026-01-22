import React from 'react';
import { Notification } from '../../types/types';
import { formatTimeAgo } from '../../utils/helpers';

interface NotificationPopoverProps {
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    onNavigate: (notification: Notification) => void;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({
    notifications,
    onClose,
    onMarkAsRead,
    onMarkAllAsRead,
    onNavigate,
}) => {

    const handleNotificationClick = (notification: Notification) => {
        onNavigate(notification);
        onClose();
    };

    const getIcon = (message: string) => {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('invit')) return 'person_add';
        if (lowerMessage.includes('approved')) return 'check_circle';
        if (lowerMessage.includes('rejected')) return 'cancel';
        if (lowerMessage.includes('interview')) return 'event';
        return 'notifications';
    };

    return (
        <div className="notification-popover">
            <div className="notification-header">
                <h4>Notifications</h4>
                <button onClick={onMarkAllAsRead}>Mark all as read</button>
            </div>
            <div className="notification-list">
                {notifications.length > 0 ? (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="notification-icon">
                                <span className="material-symbols-outlined">{getIcon(notification.message)}</span>
                            </div>
                            <div className="notification-content">
                                <p className="notification-message">{notification.message}</p>
                                <p className="notification-time">{formatTimeAgo(notification.timestamp)}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-notifications">
                        <p>You have no new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPopover;