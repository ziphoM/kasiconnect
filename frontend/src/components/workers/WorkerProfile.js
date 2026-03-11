// frontend/src/components/workers/WorkerProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './WorkerProfile.css';

const WorkerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateUser } = useAuth();
    const alert = useAlert();
    const API_BASE_URL = 'http://localhost:5000'; // backend URL
    
    // Get navigation state
    const fromClient = location.state?.fromClient;
    const jobId = location.state?.jobId;
    
    const [worker, setWorker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [hasHired, setHasHired] = useState(false);
    const [isHiringClient, setIsHiringClient] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    
    
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        township: '',
        address: '',
        primary_skill: '',
        skills: [],
        experience_years: 0,
        hourly_rate_min: 100,
        hourly_rate_max: 300,
        available_days: '',
        available_hours: '',
        travel_radius_km: 5,
        bio: ''
    });
    
    const [newSkill, setNewSkill] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState('');
    
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        loadWorkerProfile();
        if (user?.user_type === 'client' && jobId) {
            checkHireStatus();
            checkIfHiringClient();
        }
    }, [id, user, jobId]);

    const loadWorkerProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/workers/${id}`);
            console.log('📥 Worker API Response:', response.data);
            
            if (response.data.success) {

                console.log('Worker data received:', response.data.data);
                console.log('Phone from API:', response.data.data.phone);
                console.log('Email from API:', response.data.data.email);
                console.log('can_view_contact flag:', response.data.data.can_view_contact);

                setWorker(response.data.data);
                setProfileData({
                    name: response.data.data.name || '',
                    email: response.data.data.email || '',
                    phone: response.data.data.phone || '',
                    township: response.data.data.township || '',
                    address: response.data.data.address || '',
                    primary_skill: response.data.data.primary_skill || '',
                    skills: response.data.data.skills || [],
                    experience_years: response.data.data.experience_years || 0,
                    hourly_rate_min: response.data.data.hourly_rate_min || 100,
                    hourly_rate_max: response.data.data.hourly_rate_max || 300,
                    available_days: response.data.data.available_days || '',
                    available_hours: response.data.data.available_hours || '',
                    travel_radius_km: response.data.data.travel_radius_km || 5,
                    bio: response.data.data.bio || ''
                });
                
                if (response.data.data.profile_picture) {
                    setImagePreview(response.data.data.profile_picture);
                }
            } else {
                setError('Worker not found');
            }
        } catch (error) {
            console.error('Error loading worker:', error);
            setError('Failed to load worker profile');
        } finally {
            setLoading(false);
        }
    };

    const checkHireStatus = async () => {
        if (!user || user.user_type !== 'client' || !jobId) return;
        
        try {
            console.log('Checking hire status for job:', jobId, 'worker:', id);
            const response = await api.get(`/jobs/${jobId}/hire-status?worker=${id}`);
            if (response.data.success) {
                console.log('Hire status:', response.data.data);
                setHasHired(response.data.data.hired);
            }
        } catch (error) {
            console.error('Error checking hire status:', error);
        }
    };

    const checkIfHiringClient = async () => {
        if (!user || user.user_type !== 'client' || !jobId) return;
        
        try {
            const response = await api.get(`/jobs/${jobId}`);
            if (response.data.success) {
                const job = response.data.data;
                setIsHiringClient(job.client_id === user.id);
                console.log('Is hiring client:', job.client_id === user.id);
            }
        } catch (error) {
            console.error('Error checking job ownership:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? parseInt(value) : 0) : value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
            setProfileData(prev => ({
                ...prev,
                skills: [...prev.skills, newSkill.trim()]
            }));
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setProfileData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
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

    useEffect(() => {
    if (worker?.profile_picture) {
        console.log('Profile picture URL:', worker.profile_picture);
        
        // Test if image loads
        const img = new Image();
        img.onload = () => console.log('✅ Image loaded successfully');
        img.onerror = () => console.error('❌ Image failed to load:', worker.profile_picture);
        img.src = worker.profile_picture;
    }
}, [worker]);

    const uploadProfileImage = async () => {
        if (!profileImage) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('profile_picture', profileImage);

        try {
            const response = await api.post('/worker/profile/upload-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                alert.success('Profile picture updated successfully!');
                setProfileImage(null);
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
        setError('');
        setUpdateSuccess('');

        try {
            const dataToSend = {
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone,
                township: profileData.township,
                address: profileData.address,
                primary_skill: profileData.primary_skill,
                skills: profileData.skills,
                experience_years: parseInt(profileData.experience_years) || 0,
                hourly_rate_min: parseInt(profileData.hourly_rate_min) || 100,
                hourly_rate_max: parseInt(profileData.hourly_rate_max) || 300,
                available_days: profileData.available_days,
                available_hours: profileData.available_hours,
                travel_radius_km: parseInt(profileData.travel_radius_km) || 5,
                bio: profileData.bio
            };
            
            const response = await api.put('/worker/profile', dataToSend);
            
            if (response.data.success) {
                updateUser({ name: profileData.name });
                alert.success('Profile updated successfully!');
                setUpdateSuccess('Profile updated successfully!');
                
                if (profileImage) {
                    await uploadProfileImage();
                }
                
                setIsEditing(false);
                loadWorkerProfile();
                
                setTimeout(() => setUpdateSuccess(''), 3000);
            } else {
                alert.error(response.data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert.error(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (worker) {
            setProfileData({
                name: worker.name || '',
                email: worker.email || '',
                phone: worker.phone || '',
                township: worker.township || '',
                address: worker.address || '',
                primary_skill: worker.primary_skill || '',
                skills: worker.skills || [],
                experience_years: worker.experience_years || 0,
                hourly_rate_min: worker.hourly_rate_min || 100,
                hourly_rate_max: worker.hourly_rate_max || 300,
                available_days: worker.available_days || '',
                available_hours: worker.available_hours || '',
                travel_radius_km: worker.travel_radius_km || 5,
                bio: worker.bio || ''
            });
        }
        setNewSkill('');
        setProfileImage(null);
        setImagePreview(worker?.profile_picture || null);
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
            const response = await api.post('/worker/change-password', {
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
                    const response = await api.delete('/worker/account');
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

    const formatRating = (rating) => {
        if (rating === null || rating === undefined) return '0.0';
        const numRating = parseFloat(rating);
        return isNaN(numRating) ? '0.0' : numRating.toFixed(1);
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        const parsed = parseInt(num);
        return isNaN(parsed) ? '0' : parsed.toString();
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '0';
        const parsed = parseFloat(amount);
        return isNaN(parsed) ? '0' : parsed.toFixed(0);
    };

    const formatPercentage = (rate) => {
        if (rate === null || rate === undefined) return '0%';
        const parsed = parseFloat(rate);
        return isNaN(parsed) ? '0%' : parsed.toFixed(1) + '%';
    };

    const handleBack = () => {
        if (fromClient && jobId) {
            navigate(`/jobs/${jobId}`);
        } else {
            navigate(-1);
        }
    };

    const handleGoToMyProfile = () => {
        if (user) {
            navigate(`/workers/${user.id}`);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'W';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">Loading profile...</div>
            </div>
        );
    }

    if (error || !worker) {
        return (
            <div className="error-container">
                <h2>❌ Error</h2>
                <p>{error || 'Worker not found'}</p>
                <button onClick={handleBack} className="btn-primary">
                    Go Back
                </button>
            </div>
        );
    }

    const isOwnProfile = user?.id === worker.user_id;
    
    // ========== DETERMINE IF CONTACT INFO SHOULD BE SHOWN ==========
    const canViewContact = 
        isOwnProfile || // Own profile
        (user?.user_type === 'client' && hasHired) || // Client who hired this worker
        (user?.user_type === 'admin'); // Admin users

    console.log('Contact visibility check:', {
        isOwnProfile,
        userType: user?.user_type,
        hasHired,
        isHiringClient,
        canViewContact
    });

    return (
        <div className="worker-profile-container">
            <div className="worker-profile-card">
                {/* Back Button */}
                <div className="back-navigation">
                    <button onClick={handleBack} className="back-button">
                        ← {fromClient ? 'Back to Job' : 'Back'}
                    </button>
                    {isOwnProfile && user && (
                        <span className="navigation-context">Your Profile</span>
                    )}
                </div>

                {/* Success Message */}
                {updateSuccess && (
                    <div className="success-message">
                        ✅ {updateSuccess}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-avatar-large">
                        {imagePreview ? (
                            <img 
                                src={imagePreview.startsWith('http') ? imagePreview : `${API_BASE_URL}${imagePreview}`} 
                                alt="Profile" 
                                className="profile-image"
                                onError={(e) => {
                                    console.error('Image failed to load:', imagePreview);
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<div class="avatar-initials">${getInitials(worker.name)}</div>`;
                                }}
                            />
                        ) : (
                            <div className="avatar-initials">
                                {getInitials(worker.name)}
                            </div>
                        )}
                        {isOwnProfile && (
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
                        )}
                    </div>
                    <div className="profile-title">
                        <h1>{worker.name || 'Unknown Worker'}</h1>
                        <p className="worker-location">
                            <span className="location-icon">📍</span>
                            {worker.township || 'Location not specified'}
                        </p>
                        <div className="worker-badges">
                            {worker.is_verified && (
                                <span className="badge verified">✓ Verified</span>
                            )}
                            <span className="badge level">
                                Level {worker.verification_level || 0}
                            </span>
                        </div>
                    </div>
                    
                    {isOwnProfile && !isEditing && (
                        <button 
                            className="btn-edit"
                            onClick={() => setIsEditing(true)}
                        >
                            ✎ Edit Profile
                        </button>
                    )}
                    
                    {isOwnProfile && isEditing && (
                        <button 
                            className="btn-cancel-edit"
                            onClick={handleCancel}
                        >
                            ✕ Cancel Editing
                        </button>
                    )}
                </div>

                {profileImage && isOwnProfile && (
                    <div className="image-preview-actions">
                        <button onClick={uploadProfileImage} className="btn-save-image" disabled={uploadingImage}>
                            {uploadingImage ? 'Uploading...' : 'Save New Image'}
                        </button>
                        <button onClick={() => {
                            setProfileImage(null);
                            setImagePreview(worker.profile_picture || null);
                        }} className="btn-cancel-image">
                            Cancel
                        </button>
                    </div>
                )}

                {/* ========== EDIT PROFILE FORM ========== */}
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <h2>Edit Profile</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Township</label>
                                <input
                                    type="text"
                                    name="township"
                                    value={profileData.township}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={profileData.address}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Primary Skill</label>
                                <input
                                    type="text"
                                    name="primary_skill"
                                    value={profileData.primary_skill}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Experience (Years)</label>
                                <input
                                    type="number"
                                    name="experience_years"
                                    value={profileData.experience_years}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Skills</label>
                            <div className="skills-input-group">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    placeholder="Add a skill"
                                    className="skill-input"
                                />
                                <button 
                                    type="button" 
                                    onClick={handleAddSkill}
                                    className="btn-add-skill"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="skills-list-edit">
                                {profileData.skills.map((skill, index) => (
                                    <div key={index} className="skill-item">
                                        <span>{skill}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="btn-remove-skill"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Hourly Rate (Min) - R</label>
                                <input
                                    type="number"
                                    name="hourly_rate_min"
                                    value={profileData.hourly_rate_min}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Hourly Rate (Max) - R</label>
                                <input
                                    type="number"
                                    name="hourly_rate_max"
                                    value={profileData.hourly_rate_max}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Available Days</label>
                                <input
                                    type="text"
                                    name="available_days"
                                    value={profileData.available_days}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Weekdays, Weekends"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Available Hours</label>
                                <input
                                    type="text"
                                    name="available_hours"
                                    value={profileData.available_hours}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 9am-5pm"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Travel Radius (km)</label>
                            <input
                                type="number"
                                name="travel_radius_km"
                                value={profileData.travel_radius_km}
                                onChange={handleInputChange}
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                value={profileData.bio}
                                onChange={handleInputChange}
                                rows="4"
                                placeholder="Tell clients about yourself..."
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
                ) : (
                    /* ========== VIEW PROFILE (NON-EDITING MODE) ========== */
                    <>
                    {/* ========== CONTACT INFORMATION SECTION ========== */}
                    {canViewContact ? (
                        <div className="contact-info-section">
                            <h3>📞 Contact Information</h3>
                            <div className="contact-details">
                                <p><strong>Phone:</strong> {worker.phone || 'Not provided'}</p>
                                {worker.email && <p><strong>Email:</strong> {worker.email}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="contact-hidden-message">
                            <div className="hidden-icon">🔒</div>
                            <h3>Contact Information Hidden</h3>
                            <p>You need to hire this worker to reveal their contact details</p>
                            {jobId && isHiringClient && (
                                <Link to={`/jobs/${jobId}`} className="btn-back-to-job">
                                    ← Back to Job
                                </Link>
                            )}
                            {!jobId && (
                                <Link to="/jobs" className="btn-browse-jobs">
                                    Browse Jobs
                                </Link>
                            )}
                        </div>
                    )}

                        {/* Profile Tabs */}
                        <div className="profile-tabs">
                            <button 
                                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                Profile
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                                onClick={() => setActiveTab('skills')}
                            >
                                Skills & Rates
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                                onClick={() => setActiveTab('reviews')}
                            >
                                Reviews
                            </button>
                            {isOwnProfile && (
                                <button 
                                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('security')}
                                >
                                    Security
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'profile' && (
                            <>
                                {/* Performance Stats */}
                                <div className="performance-stats">
                                    <h3>Performance Stats</h3>
                                    <div className="stats-grid">
                                        <div className="stat-item">
                                            <span className="stat-value">{formatRating(worker.rating)}</span>
                                            <span className="stat-label">Rating</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-value">{formatNumber(worker.completed_jobs)}</span>
                                            <span className="stat-label">Jobs Done</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-value">{formatNumber(worker.total_jobs)}</span>
                                            <span className="stat-label">Total Jobs</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-value">{formatPercentage(worker.cancellation_rate)}</span>
                                            <span className="stat-label">Cancellation Rate</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Section */}
                                <div className="availability-section">
                                    <h3>📅 Availability</h3>
                                    <p><strong>Days:</strong> {worker.available_days || 'Flexible'}</p>
                                    <p><strong>Hours:</strong> {worker.available_hours || 'Flexible'}</p>
                                </div>

                                {/* Bio Section */}
                                {worker.bio && (
                                    <div className="bio-section">
                                        <h3>📝 About</h3>
                                        <p>{worker.bio}</p>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'skills' && (
                            <div className="skills-tab">
                                {/* Skills Section */}
                                <div className="skills-section">
                                    <h3>🛠️ Skills</h3>
                                    <div className="skills-list">
                                        {worker.primary_skill && (
                                            <span className="skill-tag primary">{worker.primary_skill}</span>
                                        )}
                                        {worker.skills?.map((skill, index) => (
                                            <span key={index} className="skill-tag">{skill}</span>
                                        ))}
                                        {(!worker.primary_skill && (!worker.skills || worker.skills.length === 0)) && (
                                            <p className="no-skills">No skills listed</p>
                                        )}
                                    </div>
                                    {worker.experience_years > 0 && (
                                        <p className="experience-text">📅 {worker.experience_years} years experience</p>
                                    )}
                                </div>

                                {/* Rates Section */}
                                <div className="rates-section">
                                    <h3>💰 Rates</h3>
                                    <p>R{worker.hourly_rate_min || 100} - R{worker.hourly_rate_max || 300} per hour</p>
                                    <p className="travel-radius">🚗 Travel radius: {worker.travel_radius_km || 5}km</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="reviews-section">
                                <h3>⭐ Client Reviews</h3>
                                {worker.reviews?.length > 0 ? (
                                    <div className="reviews-list">
                                        {worker.reviews.map((review, index) => (
                                            <div key={index} className="review-item">
                                                <div className="review-header">
                                                    <span className="reviewer">{review.reviewer_name}</span>
                                                    <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                                                </div>
                                                <p className="review-comment">{review.comment}</p>
                                                <span className="review-date">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-reviews">No reviews yet</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'security' && isOwnProfile && (
                            <div className="security-settings">
                                <h2>Security Settings</h2>
                                
                                <div className="settings-section">
                                    <h3>Password</h3>
                                    <div className="setting-item">
                                        <span>Change your password</span>
                                        <button 
                                            className="btn-change-password-small"
                                            onClick={() => setShowPasswordModal(true)}
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </div>

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
                        )}
                    </>
                )}

                {/* Password Modal */}
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

                                <div className="password-requirements">
                                    <p>Password must:</p>
                                    <ul>
                                        <li className={passwordData.new_password.length >= 6 ? 'valid' : ''}>
                                            ✓ Be at least 6 characters
                                        </li>
                                        <li className={passwordData.new_password === passwordData.confirm_password && passwordData.new_password ? 'valid' : ''}>
                                            ✓ Match confirmation
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
                                    ⚠️ This action is permanent and cannot be undone. All your data, including job history and profile information, will be permanently deleted.
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
        </div>
    );
};

export default WorkerProfile;