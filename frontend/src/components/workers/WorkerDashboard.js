// frontend/src/components/workers/WorkerDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './WorkerDashboard.css';

const WorkerDashboard = () => {
    const { user } = useAuth();
    const alert = useAlert();
    
    // State declarations
    const [applications, setApplications] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [myVouchers, setMyVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [claimAmount, setClaimAmount] = useState(0);
    const [claimMethod, setClaimMethod] = useState('bank');
    const [stats, setStats] = useState({
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        completedJobs: 0,
        totalEarnings: 0,
        voucherBalance: 0,
        interviewRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Pass system states
    const [activePass, setActivePass] = useState(null);
    const [applicationsRemaining, setApplicationsRemaining] = useState(0);
    const [showPassModal, setShowPassModal] = useState(false);
    
    // Profile completion state
    const [profileCompletion, setProfileCompletion] = useState(0);

    useEffect(() => {
        loadDashboardData();
        loadWorkerVouchers();
        loadActivePass();
        calculateProfileCompletion();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load applications
            const appsResponse = await api.get('/worker/applications');
            if (appsResponse.data.success) {
                setApplications(appsResponse.data.data);
                
                // Calculate stats
                const pending = appsResponse.data.data.filter(a => a.status === 'pending').length;
                const accepted = appsResponse.data.data.filter(a => a.status === 'accepted').length;
                const completed = appsResponse.data.data.filter(a => a.job_status === 'completed').length;
                const earnings = appsResponse.data.data
                    .filter(a => a.job_status === 'completed')
                    .reduce((sum, a) => sum + (a.agreed_rate || a.proposed_rate), 0);

                const interviewRate = appsResponse.data.data.length > 0 
                    ? Math.round((accepted / appsResponse.data.data.length) * 100) 
                    : 0;

                setStats(prev => ({
                    ...prev,
                    totalApplications: appsResponse.data.data.length,
                    pendingApplications: pending,
                    acceptedApplications: accepted,
                    completedJobs: completed,
                    totalEarnings: earnings,
                    interviewRate: interviewRate
                }));
            }

            // Load recommended jobs
            const jobsResponse = await api.get('/jobs?status=posted');
            if (jobsResponse.data.success) {
                setRecommendedJobs(jobsResponse.data.data.slice(0, 3));
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const loadWorkerVouchers = async () => {
        setLoadingVouchers(true);
        try {
            const response = await api.get('/worker/vouchers');
            if (response.data.success) {
                const vouchers = response.data.data;
                setMyVouchers(vouchers);
                
                const totalBalance = vouchers
                    .filter(v => v.status === 'active')
                    .reduce((sum, v) => sum + v.balance, 0);
                
                setStats(prev => ({
                    ...prev,
                    voucherBalance: totalBalance
                }));
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
        } finally {
            setLoadingVouchers(false);
        }
    };

    const loadActivePass = async () => {
        try {
            const response = await api.get('/worker/active-pass');
            if (response.data.success && response.data.data) {
                setActivePass(response.data.data);
                setApplicationsRemaining(response.data.data.applications_remaining);
            }
        } catch (error) {
            console.error('Error loading pass:', error);
        }
    };

    const calculateProfileCompletion = async () => {
        try {
            const response = await api.get('/worker/profile-completion');
            if (response.data.success) {
                setProfileCompletion(response.data.data.percentage);
            }
        } catch (error) {
            console.error('Error calculating profile completion:', error);
        }
    };

    const canApplyForJob = () => {
        if (!activePass) return false;
        if (activePass.status !== 'active') return false;
        if (!activePass.unlimited && applicationsRemaining <= 0) return false;
        return true;
    };

    const handleClaimVoucher = (voucher) => {
        setSelectedVoucher(voucher);
        setClaimAmount(voucher.balance);
        setShowClaimModal(true);
    };

    const handleProcessClaim = async () => {
        if (!selectedVoucher) return;

        try {
            const response = await api.post('/vouchers/claim', {
                voucher_id: selectedVoucher.id,
                amount: claimAmount,
                claim_method: claimMethod
            });

            if (response.data.success) {
                alert.success(`✅ Successfully claimed R${claimAmount}!`);
                setShowClaimModal(false);
                setSelectedVoucher(null);
                loadWorkerVouchers();
            }
        } catch (error) {
            console.error('Claim error:', error);
            alert.error(error.response?.data?.message || 'Failed to claim voucher');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'accepted': return 'status-accepted';
            case 'rejected': return 'status-rejected';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'accepted': return '✅';
            case 'rejected': return '❌';
            default: return '📝';
        }
    };

    const getVoucherStatusClass = (status) => {
        switch (status) {
            case 'active': return 'voucher-active';
            case 'pending': return 'voucher-pending';
            case 'paid': return 'voucher-paid';
            default: return '';
        }
    };

    const getInitials = (name) => {
        if (!name) return 'W';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="worker-dashboard">
            <div className="dashboard-container">
                {/* Welcome Banner */}
                <div className="welcome-banner">
                    <div className="welcome-content">
                        <div className="welcome-avatar">
                            {user?.profile_picture ? (
                                <img src={user.profile_picture} alt="Profile" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {getInitials(user?.name)}
                                </div>
                            )}
                        </div>
                        <div className="welcome-text">
                            <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                            <p className="welcome-subtitle">Here's your job hunting progress</p>
                        </div>
                    </div>
                    
                    {/* Profile Completion Ring */}
                    <div className="completion-ring">
                        <svg className="ring-progress" width="80" height="80">
                            <circle className="ring-bg" cx="40" cy="40" r="36" />
                            <circle 
                                className="ring-fill" 
                                cx="40" 
                                cy="40" 
                                r="36" 
                                style={{ 
                                    strokeDasharray: `${2 * Math.PI * 36}`,
                                    strokeDashoffset: `${2 * Math.PI * 36 * (1 - profileCompletion / 100)}`
                                }} 
                            />
                        </svg>
                        <span className="completion-percent">{profileCompletion}%</span>
                        <span className="completion-label">Profile</span>
                    </div>
                </div>

                {/* Pass Status Card */}
                {activePass ? (
                    <div className="pass-card">
                        <div className="pass-icon">🎫</div>
                        <div className="pass-details">
                            <h4>Active Pass: {activePass.pass_type === 'monthly' ? 'Monthly' : activePass.pass_type === 'annual' ? 'Annual' : 'Pay-As-You-Go'}</h4>
                            <div className="pass-metrics">
                                <div className="pass-metric">
                                    <span className="metric-value">{activePass.unlimited ? '∞' : applicationsRemaining}</span>
                                    <span className="metric-label">applications left</span>
                                </div>
                                {activePass.end_date && (
                                    <div className="pass-metric">
                                        <span className="metric-value">{formatDate(activePass.end_date)}</span>
                                        <span className="metric-label">expires</span>
                                    </div>
                                )}
                            </div>
                            <div className="pass-progress">
                                {!activePass.unlimited && (
                                    <div 
                                        className="pass-progress-bar"
                                        style={{ width: `${(activePass.applications_remaining / activePass.total_applications) * 100}%` }}
                                    ></div>
                                )}
                            </div>
                        </div>
                        <Link to="/worker/pass" className="pass-action">
                            Manage Pass <span>→</span>
                        </Link>
                    </div>
                ) : (
                    <div className="no-pass-card">
                        <div className="no-pass-content">
                            <span className="no-pass-icon">🎫</span>
                            <div>
                                <h4>No Active Application Pass</h4>
                                <p>Get a pass to start applying for jobs</p>
                            </div>
                        </div>
                        <Link to="/worker/pass" className="btn-buy-pass">
                            Buy Pass Now
                        </Link>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card total">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalApplications}</span>
                            <span className="stat-label">Total Apps</span>
                        </div>
                    </div>
                    <div className="stat-card pending">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.pendingApplications}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-card accepted">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.acceptedApplications}</span>
                            <span className="stat-label">Accepted</span>
                        </div>
                    </div>
                    <div className="stat-card rate">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.interviewRate}%</span>
                            <span className="stat-label">Success Rate</span>
                        </div>
                    </div>
                    <div className="stat-card earnings">
                        <div className="stat-icon">💰</div>
                        <div className="stat-info">
                            <span className="stat-value">R{stats.totalEarnings}</span>
                            <span className="stat-label">Earned</span>
                        </div>
                    </div>
                    <div className="stat-card vouchers">
                        <div className="stat-icon">🎫</div>
                        <div className="stat-info">
                            <span className="stat-value">R{stats.voucherBalance}</span>
                            <span className="stat-label">Vouchers</span>
                        </div>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* ========== MY APPLICATIONS SECTION - COMPLETELY REDESIGNED ========== */}
                <div className="applications-section">
                    <div className="section-header">
                        <div className="header-left">
                            <h2>📋 My Applications</h2>
                            <span className="application-count">{applications.length}</span>
                        </div>
                        <Link to="/applications" className="view-all-link">
                            View All <span>→</span>
                        </Link>
                    </div>

                    {applications.length === 0 ? (
                        <div className="empty-applications">
                            <div className="empty-icon">📭</div>
                            <h3>No applications yet</h3>
                            <p>Start applying for jobs to track them here</p>
                            <Link to="/jobs" className="btn-browse">
                                Browse Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="applications-timeline">
                            {applications.slice(0, 4).map((app, index) => {
                                const statusClass = getStatusClass(app.status);
                                const statusIcon = getStatusIcon(app.status);
                                const isRecent = index === 0;
                                
                                return (
                                    <div key={app.id} className={`application-timeline-card ${statusClass} ${isRecent ? 'recent' : ''}`}>
                                        <div className="timeline-indicator">
                                            <span className="status-icon">{statusIcon}</span>
                                            <div className="timeline-line"></div>
                                        </div>
                                        
                                        <div className="application-content">
                                            <div className="application-header">
                                                <div className="job-info">
                                                    <h3>{app.job_title}</h3>
                                                    <div className="job-meta">
                                                        <span className="meta-tag">
                                                            <span className="meta-icon">📍</span>
                                                            {app.township}
                                                        </span>
                                                        <span className="meta-tag">
                                                            <span className="meta-icon">📅</span>
                                                            {formatDate(app.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`status-badge ${app.status}`}>
                                                    {statusIcon} {app.status}
                                                </div>
                                            </div>

                                            <div className="application-details">
                                                <div className="detail-highlight">
                                                    <span className="detail-label">Your Quote</span>
                                                    <span className="detail-value">R {app.proposed_rate}</span>
                                                </div>
                                                
                                                {app.message && (
                                                    <div className="message-preview">
                                                        <p>{app.message.length > 100 ? app.message.substring(0, 100) + '...' : app.message}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="application-footer">
                                                <Link to={`/jobs/${app.job_id}`} className="btn-view-job">
                                                    View Job Details
                                                </Link>
                                                {app.status === 'pending' && (
                                                    <span className="pending-hint">⏳ Awaiting client response</span>
                                                )}
                                                {app.status === 'accepted' && (
                                                    <span className="accepted-hint">🎉 You got hired!</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recommended Jobs Grid */}
                <div className="recommended-section">
                    <div className="section-header">
                        <h2>🎯 Recommended for You</h2>
                        <Link to="/jobs" className="view-all-link">
                            Browse All <span>→</span>
                        </Link>
                    </div>

                    <div className="jobs-grid">
                        {recommendedJobs.map(job => (
                            <div key={job.id} className="job-card">
                                <div className="job-card-header">
                                    <div className="job-category">
                                        <span className="category-icon">
                                            {job.category === 'Gardening' && '🌿'}
                                            {job.category === 'Cleaning' && '🧹'}
                                            {job.category === 'Plumbing' && '🔧'}
                                            {job.category === 'Electrical' && '⚡'}
                                            {job.category === 'Painting' && '🎨'}
                                            {job.category === 'Building' && '🏗️'}
                                            {job.category === 'Delivery' && '🚚'}
                                            {job.category === 'Moving' && '📦'}
                                            {!job.category && '💼'}
                                        </span>
                                        <span className="category-name">{job.category || 'General'}</span>
                                    </div>
                                    {job.urgency === 'urgent' && (
                                        <span className="urgent-badge">🚨 Urgent</span>
                                    )}
                                </div>

                                <h3 className="job-title">{job.title}</h3>
                                <p className="job-description">{job.description?.substring(0, 80)}...</p>

                                <div className="job-meta">
                                    <span>📍 {job.township}</span>
                                    <span>💰 R{job.budget_min} - R{job.budget_max}</span>
                                </div>

                                <div className="job-footer">
                                    <span className="job-date">📅 {formatDate(job.created_at)}</span>
                                    <Link to={`/jobs/${job.id}`} className="btn-apply-small">
                                        Apply →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <h2>⚡ Quick Actions</h2>
                    <div className="actions-grid">
                        <Link to={`/workers/${user?.id}`} className="action-card">
                            <div className="action-icon">👤</div>
                            <div className="action-content">
                                <span className="action-title">My Profile</span>
                                <span className="action-desc">View and edit your profile</span>
                            </div>
                            {profileCompletion < 100 && (
                                <span className="action-badge">{profileCompletion}%</span>
                            )}
                        </Link>
                        
                        <Link to="/worker/pass" className="action-card">
                            <div className="action-icon">🎫</div>
                            <div className="action-content">
                                <span className="action-title">Buy Pass</span>
                                <span className="action-desc">Get application passes</span>
                            </div>
                            {!activePass && (
                                <span className="action-badge urgent">Required</span>
                            )}
                        </Link>
                        
                        <Link to="/jobs" className="action-card">
                            <div className="action-icon">🔍</div>
                            <div className="action-content">
                                <span className="action-title">Find Work</span>
                                <span className="action-desc">Browse available jobs</span>
                            </div>
                            {canApplyForJob() && (
                                <span className="action-badge success">Ready</span>
                            )}
                        </Link>
                        
                        <Link to="/vouchers" className="action-card">
                            <div className="action-icon">💰</div>
                            <div className="action-content">
                                <span className="action-title">My Vouchers</span>
                                <span className="action-desc">Check your earnings</span>
                            </div>
                            {stats.voucherBalance > 0 && (
                                <span className="action-badge">R{stats.voucherBalance}</span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerDashboard;