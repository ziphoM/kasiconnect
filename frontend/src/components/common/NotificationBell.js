// frontend/src/components/common/NotificationBell.js
import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
    const {
        notifications,
        unreadCount,
        loading,
        showDropdown,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        toggleDropdown,
        closeDropdown,
        fetchNotifications
    } = useNotifications();

    const dropdownRef = useRef(null);
    const bellRef = useRef(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                bellRef.current &&
                !bellRef.current.contains(event.target)
            ) {
                closeDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeDropdown]);

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        
        // Navigate to link if exists
        if (notification.link) {
            window.location.href = notification.link;
        }
        
        closeDropdown();
    };

    // Handle view all
    const handleViewAll = () => {
        window.location.href = '/notifications';
        closeDropdown();
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Get icon based on notification type
    const getIcon = (notification) => {
        if (notification.icon) return notification.icon;
        
        switch (notification.type) {
            case 'new_application': return 'fas fa-file-signature';
            case 'hired': return 'fas fa-handshake';
            case 'rejected': return 'fas fa-times-circle';
            case 'job_completed': return 'fas fa-circle-check';
            case 'pass_purchased': return 'fas fa-ticket-alt';
            case 'package_purchased': return 'fas fa-box-open';
            case 'new_review': return 'fas fa-star';
            default: return 'fas fa-bell';
        }
    };

    return (
        <div className="notification-bell-container">
            <button
                ref={bellRef}
                className={`notification-bell ${showDropdown ? 'active' : ''}`}
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div ref={dropdownRef} className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                            <button 
                                className="mark-all-read"
                                onClick={markAllAsRead}
                                title="Mark all as read"
                            >
                                <i className="fas fa-check-double"></i>
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading && notifications.length === 0 ? (
                            <div className="notification-loading">
                                <div className="spinner-small"></div>
                                <p>Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <i className="fas fa-bell-slash"></i>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.slice(0, 5).map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        <i className={getIcon(notification)}></i>
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">
                                            {notification.title}
                                        </div>
                                        <div className="notification-message">
                                            {notification.message}
                                        </div>
                                        <div className="notification-time">
                                            {formatTime(notification.created_at)}
                                        </div>
                                    </div>
                                    <button
                                        className="notification-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                        title="Delete"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <button onClick={handleViewAll} className="view-all-btn">
                                View All Notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;