// frontend/src/contexts/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const alert = useAlert();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async (limit = 20) => {
        if (!isAuthenticated) return;
        
        setLoading(true);
        try {
            const response = await api.get(`/notifications?limit=${limit}`);
            if (response.data.success) {
                setNotifications(response.data.data.notifications);
                setUnreadCount(response.data.data.unread_count);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Fetch unread count only (for badge)
    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const response = await api.get('/notifications/unread-count');
            if (response.data.success) {
                setUnreadCount(response.data.data.unread_count);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    }, [isAuthenticated]);

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: 1 } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: 1 }))
            );
            setUnreadCount(0);
            alert.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            // Update unread count if the deleted notification was unread
            const deleted = notifications.find(n => n.id === notificationId);
            if (deleted && !deleted.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            alert.success('Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setShowDropdown(prev => !prev);
    };

    // Close dropdown
    const closeDropdown = () => {
        setShowDropdown(false);
    };

    // Initial fetch on mount and when auth changes
    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
            
            // Set up polling for unread count (every 30 seconds)
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

    // Listen for real-time updates (you could implement WebSocket here later)
    // For now, we'll just refresh when the window gains focus
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated) {
                fetchUnreadCount();
            }
        };
        
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [isAuthenticated, fetchUnreadCount]);

    const value = {
        notifications,
        unreadCount,
        loading,
        showDropdown,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        toggleDropdown,
        closeDropdown
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};