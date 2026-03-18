// frontend/src/contexts/AlertContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

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
        confirmColor: '#10B981', // Green for confirm
        cancelColor: '#6B7280'    // Grey for cancel
    });

    const showAlert = useCallback(({
        type = 'info',
        title = '',
        message = '',
        onConfirm = null,
        onCancel = null,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmColor,
        cancelColor
    }) => {
        // Set colors based on type if not provided
        let finalConfirmColor = confirmColor;
        let finalCancelColor = cancelColor;

        if (!finalConfirmColor) {
            switch (type) {
                case 'success':
                    finalConfirmColor = '#10B981'; // Green
                    break;
                case 'warning':
                    finalConfirmColor = '#F59E0B'; // Orange
                    break;
                case 'error':
                case 'danger':
                    finalConfirmColor = '#EF4444'; // Red
                    break;
                case 'info':
                    finalConfirmColor = '#3B82F6'; // Blue
                    break;
                default:
                    finalConfirmColor = '#10B981';
            }
        }

        if (!finalCancelColor) {
            finalCancelColor = '#6B7280'; // Grey
        }

        setAlert({
            show: true,
            type,
            title,
            message,
            onConfirm,
            onCancel,
            confirmText,
            cancelText,
            confirmColor: finalConfirmColor,
            cancelColor: finalCancelColor
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, show: false }));
    }, []);

    const confirm = useCallback((message, onConfirm, onCancel, title = 'Confirm', confirmText = 'Yes', cancelText = 'No') => {
        showAlert({
            type: 'warning',
            title,
            message,
            onConfirm,
            onCancel,
            confirmText,
            cancelText,
            confirmColor: '#EF4444' // Red for destructive actions
        });
    }, [showAlert]);

    const success = useCallback((message, title = 'Success') => {
        showAlert({
            type: 'success',
            title,
            message,
            confirmText: 'OK',
            cancelText: null,
            confirmColor: '#10B981' // Green for success
        });
    }, [showAlert]);

    const error = useCallback((message, title = 'Error') => {
        showAlert({
            type: 'error',
            title,
            message,
            confirmText: 'OK',
            cancelText: null,
            confirmColor: '#EF4444' // Red for error
        });
    }, [showAlert]);

    const warning = useCallback((message, title = 'Warning') => {
        showAlert({
            type: 'warning',
            title,
            message,
            confirmText: 'OK',
            cancelText: null,
            confirmColor: '#F59E0B' // Orange for warning
        });
    }, [showAlert]);

    const info = useCallback((message, title = 'Info') => {
        showAlert({
            type: 'info',
            title,
            message,
            confirmText: 'OK',
            cancelText: null,
            confirmColor: '#3B82F6' // Blue for info
        });
    }, [showAlert]);

    const value = {
        alert,
        showAlert,
        hideAlert,
        confirm,
        success,
        error,
        warning,
        info
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
            <AlertComponent alert={alert} onClose={hideAlert} />
        </AlertContext.Provider>
    );
};

// Alert Component
const AlertComponent = ({ alert, onClose }) => {
    if (!alert.show) return null;

    const handleConfirm = () => {
        if (alert.onConfirm) alert.onConfirm();
        onClose();
    };

    const handleCancel = () => {
        if (alert.onCancel) alert.onCancel();
        onClose();
    };

    // Get icon based on type
    const getIcon = () => {
        switch (alert.type) {
            case 'success':
                return '✅';
            case 'error':
            case 'danger':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return '📢';
        }
    };

    return (
        <div className="alert-modal-overlay" onClick={onClose}>
            <div className="alert-modal" onClick={e => e.stopPropagation()}>
                <div className={`alert-modal-header alert-${alert.type}`}>
                    <span className="alert-icon">{getIcon()}</span>
                    <h3>{alert.title}</h3>
                </div>
                
                <div className="alert-modal-body">
                    <p>{alert.message}</p>
                </div>

                <div className="alert-modal-actions">
                    {alert.cancelText !== null && (
                        <button 
                            className="alert-btn alert-btn-cancel"
                            onClick={handleCancel}
                            style={{ backgroundColor: alert.cancelColor }}
                        >
                            {alert.cancelText}
                        </button>
                    )}
                    <button 
                        className="alert-btn alert-btn-confirm"
                        onClick={handleConfirm}
                        style={{ backgroundColor: alert.confirmColor }}
                    >
                        {alert.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};