// frontend/src/contexts/AlertContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        duration: 3000
    });

    const showAlert = (options) => {
        setAlert({
            show: true,
            type: options.type || 'info',
            title: options.title || '',
            message: options.message || '',
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            duration: options.duration || 3000
        });
    };

    const hideAlert = () => {
        setAlert(prev => ({ ...prev, show: false }));
    };

    const success = (message, title = 'Success', duration = 3000) => {
        showAlert({
            type: 'success',
            title,
            message,
            duration
        });
    };

    const error = (message, title = 'Error', duration = 4000) => {
        showAlert({
            type: 'error',
            title,
            message,
            duration
        });
    };

    const warning = (message, title = 'Warning', duration = 3500) => {
        showAlert({
            type: 'warning',
            title,
            message,
            duration
        });
    };

    const info = (message, title = 'Info', duration = 3000) => {
        showAlert({
            type: 'info',
            title,
            message,
            duration
        });
    };

    const confirm = (message, onConfirm, onCancel, title = 'Confirm', confirmText = 'Yes', cancelText = 'No') => {
        showAlert({
            type: 'confirm',
            title,
            message,
            onConfirm,
            onCancel,
            confirmText,
            cancelText,
            duration: null
        });
    };

    return (
        <AlertContext.Provider value={{
            alert,
            showAlert,
            hideAlert,
            success,
            error,
            warning,
            info,
            confirm
        }}>
            {children}
            <CustomAlert />
        </AlertContext.Provider>
    );
};

// Custom Alert Component
const CustomAlert = () => {
    const { alert, hideAlert } = useAlert();

    useEffect(() => {
        if (alert.show && alert.type !== 'confirm' && alert.duration) {
            const timer = setTimeout(() => {
                hideAlert();
            }, alert.duration);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    if (!alert.show) return null;

    const getIcon = () => {
        switch(alert.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'confirm': return '❓';
            default: return '📢';
        }
    };

    const getColor = () => {
        switch(alert.type) {
            case 'success':
                return { bg: '#D1FAE5', border: '#10B981', text: '#065F46', icon: '#10B981' };
            case 'error':
                return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', icon: '#EF4444' };
            case 'warning':
                return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: '#F59E0B' };
            case 'info':
                return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icon: '#3B82F6' };
            case 'confirm':
                return { bg: '#F3F4F6', border: '#6B7280', text: '#1F2937', icon: '#6B7280' };
            default:
                return { bg: '#F3F4F6', border: '#9CA3AF', text: '#1F2937', icon: '#6B7280' };
        }
    };

    const colors = getColor();

    const handleConfirm = () => {
        if (alert.onConfirm) alert.onConfirm();
        hideAlert();
    };

    const handleCancel = () => {
        if (alert.onCancel) alert.onCancel();
        hideAlert();
    };

    // For non-confirm alerts (toast style)
    if (alert.type !== 'confirm') {
        return (
            <div className="custom-alert-overlay" onClick={hideAlert}>
                <div 
                    className="custom-alert toast"
                    style={{ borderColor: colors.border }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="custom-alert-icon" style={{ color: colors.icon }}>
                        {getIcon()}
                    </div>
                    <div className="custom-alert-content">
                        <h3 className="custom-alert-title" style={{ color: colors.text }}>
                            {alert.title}
                        </h3>
                        <p className="custom-alert-message">{alert.message}</p>
                    </div>
                    <button 
                        className="custom-alert-close"
                        onClick={hideAlert}
                        style={{ color: colors.text }}
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    }

    // For confirm alerts - buttons at the bottom
    return (
        <div className="custom-alert-overlay">
            <div 
                className="custom-alert confirm"
                style={{ borderColor: colors.border }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="custom-alert-header">
                    <div className="custom-alert-icon" style={{ color: colors.icon }}>
                        {getIcon()}
                    </div>
                    <h3 className="custom-alert-title" style={{ color: colors.text }}>
                        {alert.title}
                    </h3>
                </div>
                
                <div className="custom-alert-body">
                    <p className="custom-alert-message">{alert.message}</p>
                </div>

                <div className="custom-alert-footer">
                    <button 
                        className="custom-alert-btn cancel"
                        onClick={handleCancel}
                    >
                        {alert.cancelText}
                    </button>
                    <button 
                        className="custom-alert-btn confirm"
                        onClick={handleConfirm}
                        style={{ background: colors.border }}
                    >
                        {alert.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertProvider;