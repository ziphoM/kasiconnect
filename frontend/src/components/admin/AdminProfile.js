// frontend/src/components/admin/AdminProfile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './adminprofile.css';

const AdminProfile = () => {
    const { user, updateUser } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        township: '',
        id_number: ''
    });
    
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    
    const [securityData, setSecurityData] = useState({
        two_factor_enabled: false,
        login_alerts: true,
        session_timeout: 30 // minutes
    });

    const [activityLog, setActivityLog] = useState([]);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        loadAdminProfile();
        loadActivityLog();
    }, []);

    const loadAdminProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/profile');
            if (response.data.success) {
                setProfileData({
                    name: response.data.data.name || '',
                    email: response.data.data.email || '',
                    phone: response.data.data.phone || '',
                    township: response.data.data.township || '',
                    id_number: response.data.data.id_number || ''
                });
                setSecurityData({
                    two_factor_enabled: response.data.data.two_factor_enabled || false,
                    login_alerts: response.data.data.login_alerts || true,
                    session_timeout: response.data.data.session_timeout || 30
                });
            }
        } catch (error) {
            console.error('Error loading admin profile:', error);
            alert.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const loadActivityLog = async () => {
        try {
            const response = await api.get('/admin/activity-log');
            if (response.data.success) {
                setActivityLog(response.data.data.slice(0, 10));
            }
        } catch (error) {
            console.error('Error loading activity log:', error);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSecurityChange = (e) => {
        const { name, type, checked, value } = e.target;
        setSecurityData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.put('/admin/profile', profileData);
            if (response.data.success) {
                updateUser({ name: profileData.name });
                alert.success('Profile updated successfully!');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            alert.error('New passwords do not match');
            return;
        }

        if (passwordData.new_password.length < 8) {
            alert.error('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/admin/change-password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });

            if (response.data.success) {
                alert.success('Password changed successfully!');
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
                setShowPasswordModal(false);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSecurity = async () => {
        try {
            const response = await api.put('/admin/security-settings', securityData);
            if (response.data.success) {
                alert.success('Security settings updated!');
            }
        } catch (error) {
            console.error('Error updating security:', error);
            alert.error('Failed to update security settings');
        }
    };

    const handleDeleteAccount = async () => {
        alert.confirm(
            '⚠️ Are you absolutely sure you want to delete your admin account? This action cannot be undone and you will lose access to all admin functions.',
            async () => {
                try {
                    const response = await api.delete('/admin/account');
                    if (response.data.success) {
                        alert.success('Account deleted. Logging out...');
                        setTimeout(() => {
                            localStorage.clear();
                            window.location.href = '/login';
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error deleting account:', error);
                    alert.error('Failed to delete account');
                }
            },
            null,
            'Delete Account',
            'Yes, Delete Permanently',
            'Cancel'
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && !profileData.name) {
        return <div className="loading-spinner">Loading admin profile...</div>;
    }

    return (
        <div className="admin-profile-container">
            <div className="admin-profile-card">
                <div className="profile-header">
                    <div className="profile-avatar-large">
                        <span className="admin-badge">👑</span>
                        <div className="avatar-initials">
                            {profileData.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                        </div>
                    </div>
                    <div className="profile-title">
                        <h1>Admin Profile</h1>
                        <p>{profileData.name || 'Administrator'}</p>
                        <span className="admin-role-badge">Super Admin</span>
                    </div>
                </div>

                <div className="profile-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        👤 Profile Information
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🔒 Security Settings
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        📋 Activity Log
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <h2>Personal Information</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleProfileChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    placeholder="27712345678"
                                />
                            </div>

                            <div className="form-group">
                                <label>Township</label>
                                <input
                                    type="text"
                                    name="township"
                                    value={profileData.township}
                                    onChange={handleProfileChange}
                                    placeholder="e.g., Soweto"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>ID Number</label>
                            <input
                                type="text"
                                name="id_number"
                                value={profileData.id_number}
                                onChange={handleProfileChange}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="profile-actions">
                            <button 
                                type="button" 
                                className="btn-change-password"
                                onClick={() => setShowPasswordModal(true)}
                            >
                                🔑 Change Password
                            </button>
                            <button 
                                type="submit" 
                                className="btn-save-profile"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'security' && (
                    <div className="security-settings">
                        <h2>Security Settings</h2>

                        <div className="settings-section">
                            <h3>Two-Factor Authentication</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Enable 2FA</strong>
                                    <p>Add an extra layer of security to your account</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        name="two_factor_enabled"
                                        checked={securityData.two_factor_enabled}
                                        onChange={handleSecurityChange}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            {securityData.two_factor_enabled && (
                                <div className="two-factor-setup">
                                    <p>📱 Scan this QR code with Google Authenticator:</p>
                                    <div className="qr-placeholder">
                                        [QR Code Placeholder]
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="settings-section">
                            <h3>Login Alerts</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Email me on new login</strong>
                                    <p>Receive email notifications when someone logs into your account</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        name="login_alerts"
                                        checked={securityData.login_alerts}
                                        onChange={handleSecurityChange}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3>Session Settings</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Session Timeout</strong>
                                    <p>Automatically log out after inactivity</p>
                                </div>
                                <select
                                    name="session_timeout"
                                    value={securityData.session_timeout}
                                    onChange={handleSecurityChange}
                                    className="timeout-select"
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="120">2 hours</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            className="btn-save-security"
                            onClick={handleUpdateSecurity}
                        >
                            Save Security Settings
                        </button>

                        <div className="danger-zone">
                            <h3>⚠️ Danger Zone</h3>
                            <div className="danger-item">
                                <div className="danger-info">
                                    <strong>Delete Account</strong>
                                    <p>Permanently delete your admin account and all associated data</p>
                                </div>
                                <button 
                                    className="btn-delete-account"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="activity-log">
                        <h2>Recent Activity</h2>
                        {activityLog.length === 0 ? (
                            <p className="no-activity">No recent activity</p>
                        ) : (
                            <div className="activity-list">
                                {activityLog.map((activity, index) => (
                                    <div key={index} className="activity-item">
                                        <div className="activity-icon">
                                            {activity.action === 'login' && '🔐'}
                                            {activity.action === 'profile_update' && '✏️'}
                                            {activity.action === 'password_change' && '🔑'}
                                            {activity.action === 'user_suspended' && '🚫'}
                                            {activity.action === 'job_deleted' && '🗑️'}
                                        </div>
                                        <div className="activity-details">
                                            <strong>{activity.description}</strong>
                                            <span className="activity-time">
                                                {formatDate(activity.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="btn-view-all" onClick={loadActivityLog}>
                            Refresh Activity Log
                        </button>
                    </div>
                )}
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="password-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔑 Change Password</h2>
                            <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
                        </div>
                        
                        <form onSubmit={handleChangePassword} className="password-form">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="current_password"
                                    value={passwordData.current_password}
                                    onChange={handlePasswordChange}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="new_password"
                                    value={passwordData.new_password}
                                    onChange={handlePasswordChange}
                                    required
                                    minLength="8"
                                    autoComplete="new-password"
                                />
                                <small>Minimum 8 characters</small>
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirm_password"
                                    value={passwordData.confirm_password}
                                    onChange={handlePasswordChange}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="password-requirements">
                                <p>Password must contain:</p>
                                <ul>
                                    <li className={passwordData.new_password.length >= 8 ? 'valid' : ''}>
                                        ✓ At least 8 characters
                                    </li>
                                    <li className={/[A-Z]/.test(passwordData.new_password) ? 'valid' : ''}>
                                        ✓ One uppercase letter
                                    </li>
                                    <li className={/[0-9]/.test(passwordData.new_password) ? 'valid' : ''}>
                                        ✓ One number
                                    </li>
                                    <li className={/[!@#$%^&*]/.test(passwordData.new_password) ? 'valid' : ''}>
                                        ✓ One special character
                                    </li>
                                </ul>
                            </div>

                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => setShowPasswordModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-change"
                                    disabled={loading}
                                >
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <h2>⚠️ Delete Account</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <p className="warning-text">
                                This action is <strong>permanent and cannot be undone</strong>.
                                All your data, settings, and admin privileges will be removed.
                            </p>
                            
                            <p>To confirm, please type <strong>DELETE</strong> below:</p>
                            
                            <input 
                                type="text" 
                                className="delete-confirm-input"
                                placeholder="Type DELETE to confirm"
                                onChange={(e) => {
                                    if (e.target.value === 'DELETE') {
                                        document.getElementById('confirm-delete-btn').disabled = false;
                                    } else {
                                        document.getElementById('confirm-delete-btn').disabled = true;
                                    }
                                }}
                            />
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="btn-cancel"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                id="confirm-delete-btn"
                                className="btn-delete-confirm"
                                onClick={handleDeleteAccount}
                                disabled
                            >
                                Permanently Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProfile;