// frontend/src/components/clients/ClientProfile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './ClientProfile.css';

const ClientProfile = () => {
    const { user, updateUser } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        township: '',
        address: ''
    });

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Helper function to get full image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('data:')) return path;
        
        const API_URL = 'http://localhost:5000';
        return `${API_URL}${path}`;
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get('/client/profile');
            if (response.data.success) {
                setProfile(response.data.data);
                setFormData({
                    name: response.data.data.name || '',
                    email: response.data.data.email || '',
                    phone: response.data.data.phone || '',
                    township: response.data.data.township || '',
                    address: response.data.data.address || ''
                });
                
                if (response.data.data.profile_picture) {
                    setImagePreview(response.data.data.profile_picture);
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.match(/image.*/)) {
                alert.error('Please select an image file');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                alert.error('Image size should be less than 2MB');
                return;
            }

            setProfileImage(file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfileImage = async () => {
        if (!profileImage) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('profile_picture', profileImage);

        try {
            const response = await api.post('/client/profile/upload-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                alert.success('Profile picture updated successfully!');
                
                if (response.data.data?.profile_picture) {
                    setImagePreview(response.data.data.profile_picture);
                }
                
                setProfileImage(null);
                loadProfile(); // Refresh profile data
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert.error('Failed to upload profile picture');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);

        try {
            const response = await api.put('/client/profile', formData);
            
            if (response.data.success) {
                updateUser({ name: formData.name });
                alert.success('Profile updated successfully!');
                
                if (profileImage) {
                    await uploadProfileImage();
                }
                
                loadProfile();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert.error('Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            alert.error('New passwords do not match');
            return;
        }

        if (passwordData.new_password.length < 6) {
            alert.error('Password must be at least 6 characters');
            return;
        }

        setUpdating(true);
        try {
            const response = await api.post('/client/change-password', {
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
            setUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        alert.confirm(
            '⚠️ Are you sure you want to delete your account? This action cannot be undone.',
            async () => {
                try {
                    const response = await api.delete('/client/account');
                    if (response.data.success) {
                        alert.success('Account deleted. Logging out...');
                        setTimeout(() => {
                            localStorage.clear();
                            window.location.href = '/';
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

    const getInitials = (name) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="client-profile-container">
            <div className="client-profile-card">
                <h1>My Profile</h1>

                {/* Profile Header with Avatar */}
                <div className="profile-header">
                    <div className="profile-avatar-large">
                        {imagePreview ? (
                            <img 
                                src={imagePreview} 
                                alt="Profile" 
                                className="profile-image"
                                onError={(e) => {
                                    console.error('Image failed to load:', imagePreview);
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<div class="avatar-initials">${getInitials(formData.name)}</div>`;
                                }}
                            />
                        ) : (
                            <div className="avatar-initials">
                                {getInitials(formData.name)}
                            </div>
                        )}
                        <label htmlFor="profile-image-upload" className="upload-image-btn">
                            <span>📷</span>
                            <input
                                type="file"
                                id="profile-image-upload"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                    <div className="profile-title">
                        <h2>{formData.name}</h2>
                        <p>{formData.township || 'Location not specified'}</p>
                    </div>
                </div>

                {profileImage && (
                    <div className="image-preview-actions">
                        <button onClick={uploadProfileImage} className="btn-save-image" disabled={uploadingImage}>
                            {uploadingImage ? 'Uploading...' : 'Save New Image'}
                        </button>
                        <button onClick={() => {
                            setProfileImage(null);
                            setImagePreview(profile?.profile_picture || null);
                        }} className="btn-cancel-image">
                            Cancel
                        </button>
                    </div>
                )}

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Township</label>
                        <input
                            type="text"
                            name="township"
                            value={formData.township}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="profile-actions">
                        <button 
                            type="button" 
                            className="btn-change-password"
                            onClick={() => setShowPasswordModal(true)}
                        >
                            Change Password
                        </button>
                        <button 
                            type="submit" 
                            className="btn-save-profile"
                            disabled={updating}
                        >
                            {updating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                {/* Danger Zone */}
                <div className="danger-zone">
                    <h3>⚠️ Danger Zone</h3>
                    <div className="danger-item">
                        <div className="danger-info">
                            <strong>Delete Account</strong>
                            <p>This action cannot be undone. All your data will be permanently removed.</p>
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

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="password-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Change Password</h2>
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
                                    minLength="6"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirm_password"
                                    value={passwordData.confirm_password}
                                    onChange={handlePasswordChange}
                                    required
                                />
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
                                    disabled={updating}
                                >
                                    {updating ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <h2>Delete Account</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <p className="warning-text">
                                ⚠️ This action is permanent and cannot be undone. All your data will be permanently deleted.
                            </p>
                            
                            <p>Are you absolutely sure you want to delete your account?</p>

                            <div className="modal-actions">
                                <button 
                                    className="btn-cancel"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-delete-confirm"
                                    onClick={handleDeleteAccount}
                                >
                                    Yes, Delete My Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientProfile;