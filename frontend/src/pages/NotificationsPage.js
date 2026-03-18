// frontend/src/pages/NotificationsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import api from '../services/api';
import './NotificationsPage.css';

const NotificationsPage = () => {
    const { markAsRead, deleteNotification } = useNotifications();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, [filter, page]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/notifications?limit=20&offset=${(page-1)*20}&unreadOnly=${filter === 'unread'}`);
            if (response.data.success) {
                if (page === 1) {
                    setNotifications(response.data.data.notifications);
                } else {
                    setNotifications(prev => [...prev, ...response.data.data.notifications]);
                }
                setHasMore(response.data.data.notifications.length === 20);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notification.id ? { ...n, is_read: 1 } : n
                )
            );
        }
        
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    const handleDelete = async (e, notificationId) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: 1 }))
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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
        <div className="notifications-page">
            <div className="notifications-header">
                <div>
                    <h1>Notifications</h1>
                    <p>Stay updated with all your activity</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="mark-all-read-btn"
                        onClick={handleMarkAllRead}
                        disabled={notifications.every(n => n.is_read)}
                    >
                        <i className="fas fa-check-double"></i>
                        Mark All Read
                    </button>
                </div>
            </div>

            <div className="notifications-filter">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => { setFilter('all'); setPage(1); }}
                >
                    All
                </button>
                <button 
                    className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => { setFilter('unread'); setPage(1); }}
                >
                    Unread
                </button>
            </div>

            <div className="notifications-list">
                {loading && page === 1 ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-bell-slash"></i>
                        <h3>No notifications</h3>
                        <p>You're all caught up! Check back later for updates.</p>
                        <Link to="/" className="btn-primary">
                            Go Home
                        </Link>
                    </div>
                ) : (
                    <>
                        {notifications.map(notification => (
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
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    title="Delete"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))}

                        {hasMore && (
                            <div className="load-more">
                                <button 
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={loading}
                                    className="btn-outline"
                                >
                                    {loading ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;