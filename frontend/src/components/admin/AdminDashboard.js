// frontend/src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';
import JobManagement from './JobManagement';
import PackageManagement from './PackageManagement';
import ReportsAnalytics from './ReportsAnalytics';
import AdminProfile from './AdminProfile';
import './Admin.css';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [overviewRes, usersRes, jobsRes] = await Promise.all([
                api.get('/admin/overview'),
                api.get('/admin/users'),
                api.get('/admin/jobs')
            ]);

            if (overviewRes.data.success) {
                setStats(overviewRes.data.data);
            }
            if (usersRes.data.success) {
                setRecentUsers(usersRes.data.data.slice(0, 5));
            }
            if (jobsRes.data.success) {
                setRecentJobs(jobsRes.data.data.slice(0, 5));
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (user?.user_type !== 'admin') {
        return (
            <div className="admin-error">
                <h2>⛔ Access Denied</h2>
                <p>You don't have permission to view this page.</p>
                <Link to="/" className="btn-primary">Back Home</Link>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-spinner">Loading dashboard...</div>;
    }

    // Safely access nested data
    const users = stats?.users || {};
    const jobs = stats?.jobs || {};
    const hires = stats?.hires || {};
    const revenue = stats?.revenue || {};

    return (
        <div className="admin-dashboard">
            {/* Stylish Sidebar */}
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>Admin Panel</h2>
                    <p>Welcome back, {user?.name?.split(' ')[0]}</p>
                    
                    {/* Profile Card Link */}
                    <Link to="/admin/profile" className="admin-profile-card">
                        <div className="profile-card-content">
                            <div className="profile-avatar-small">
                                <div className="avatar-initials">
                                    {getInitials(user?.name)}
                                </div>
                                <span className="online-indicator"></span>
                            </div>
                            <div className="profile-info">
                                <div className="profile-name">{user?.name}</div>
                                <div className="profile-role">Super Admin</div>
                                <span className="view-profile-link">
                                    View Profile <span>→</span>
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    <button 
                        className={activeTab === 'overview' ? 'active' : ''}
                        onClick={() => setActiveTab('overview')}
                    >
                        <i>📊</i>
                        <span>Dashboard Overview</span>
                    </button>
                    
                    <button 
                        className={activeTab === 'users' ? 'active' : ''}
                        onClick={() => setActiveTab('users')}
                    >
                        <i>👥</i>
                        <span>User Management</span>
                    </button>
                    
                    <button 
                        className={activeTab === 'jobs' ? 'active' : ''}
                        onClick={() => setActiveTab('jobs')}
                    >
                        <i>💼</i>
                        <span>Job Management</span>
                    </button>
                    
                    <button 
                        className={activeTab === 'packages' ? 'active' : ''}
                        onClick={() => setActiveTab('packages')}
                    >
                        <i>📦</i>
                        <span>Package Management</span>
                    </button>
                    
                    <button 
                        className={activeTab === 'reports' ? 'active' : ''}
                        onClick={() => setActiveTab('reports')}
                    >
                        <i>📈</i>
                        <span>Reports & Analytics</span>
                    </button>

                    <div className="sidebar-divider"></div>

                    {/* Direct Profile Link */}
                    <Link to="/admin/profile" className="profile-nav-link">
                        <i>👤</i>
                        <span>My Profile</span>
                        <span className="badge">Admin</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info-card">
                        <div className="user-info-row">
                            <div className="user-avatar-mini">
                                {getInitials(user?.name)}
                            </div>
                            <div className="user-details-mini">
                                <div className="user-name">{user?.name}</div>
                                <div className="user-type">{user?.user_type}</div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="logout-btn-sidebar">
                            <span>🚪</span> Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="admin-main">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        <h1>Dashboard Overview</h1>

                        {error && <div className="error-message">{error}</div>}

                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-icon">👥</span>
                                <div className="stat-info">
                                    <span className="stat-value">{users.total_users || 0}</span>
                                    <span className="stat-label">Total Users</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">👷</span>
                                <div className="stat-info">
                                    <span className="stat-value">{users.total_workers || 0}</span>
                                    <span className="stat-label">Workers</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">🏠</span>
                                <div className="stat-info">
                                    <span className="stat-value">{users.total_clients || 0}</span>
                                    <span className="stat-label">Clients</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">💼</span>
                                <div className="stat-info">
                                    <span className="stat-value">{jobs.total_jobs || 0}</span>
                                    <span className="stat-label">Total Jobs</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">📝</span>
                                <div className="stat-info">
                                    <span className="stat-value">{jobs.posted_jobs || 0}</span>
                                    <span className="stat-label">Active Jobs</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">✅</span>
                                <div className="stat-info">
                                    <span className="stat-value">{hires.total_hires || 0}</span>
                                    <span className="stat-label">Total Hires</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">📦</span>
                                <div className="stat-info">
                                    <span className="stat-value">{stats?.worker_passes?.total_passes || 0}</span>
                                    <span className="stat-label">Worker Passes</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">💰</span>
                                <div className="stat-info">
                                    <span className="stat-value">R {revenue.total_revenue?.toLocaleString() || 0}</span>
                                    <span className="stat-label">Revenue</span>
                                </div>
                            </div>
                        </div>

                        <div className="recent-section">
                            <h2>Recent Users</h2>
                            <div className="recent-list">
                                {recentUsers.length === 0 ? (
                                    <p className="no-data">No recent users</p>
                                ) : (
                                    recentUsers.map(user => (
                                        <div key={user.id} className="recent-item">
                                            <span className="item-name">{user.name}</span>
                                            <span className="item-type">{user.user_type}</span>
                                            <span className="item-phone">{user.phone}</span>
                                            <span className={`item-status ${user.status}`}>
                                                {user.status}
                                            </span>
                                            <button 
                                                onClick={() => setActiveTab('users')}
                                                className="item-link"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="recent-section">
                            <h2>Recent Jobs</h2>
                            <div className="recent-list">
                                {recentJobs.length === 0 ? (
                                    <p className="no-data">No recent jobs</p>
                                ) : (
                                    recentJobs.map(job => (
                                        <div key={job.id} className="recent-item">
                                            <span className="item-name">{job.title}</span>
                                            <span className="item-type">{job.status}</span>
                                            <span className="item-township">{job.township}</span>
                                            <button 
                                                onClick={() => setActiveTab('jobs')}
                                                className="item-link"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <UserManagement />
                )}

                {activeTab === 'jobs' && (
                    <JobManagement />
                )}

                {activeTab === 'packages' && (
                    <PackageManagement />
                )}

                {activeTab === 'reports' && (
                    <ReportsAnalytics />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;