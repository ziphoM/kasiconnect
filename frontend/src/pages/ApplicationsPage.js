// frontend/src/pages/ApplicationsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import './ApplicationsPage.css';

const ApplicationsPage = () => {
    const { user } = useAuth();
    const alert = useAlert();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
    });

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/worker/applications');
            if (response.data.success) {
                setApplications(response.data.data);
                calculateStats(response.data.data);
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            setError('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (apps) => {
        const stats = {
            total: apps.length,
            pending: apps.filter(a => a.status === 'pending').length,
            accepted: apps.filter(a => a.status === 'accepted').length,
            rejected: apps.filter(a => a.status === 'rejected').length
        };
        setStats(stats);
    };

    const handleWithdraw = async (applicationId) => {
        alert.confirm(
            'Are you sure you want to withdraw this application?',
            async () => {
                try {
                    const response = await api.delete(`/applications/${applicationId}`);
                    if (response.data.success) {
                        alert.success('Application withdrawn successfully');
                        loadApplications();
                    }
                } catch (error) {
                    console.error('Error withdrawing application:', error);
                    alert.error('Failed to withdraw application');
                }
            },
            null,
            'Withdraw Application',
            'Yes, Withdraw',
            'Cancel'
        );
    };

    const filteredApplications = applications.filter(app => {
        // Filter by status
        if (filter !== 'all' && app.status !== filter) return false;
        
        // Search by job title or client name
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return app.job_title?.toLowerCase().includes(term) ||
                   app.client_name?.toLowerCase().includes(term) ||
                   app.township?.toLowerCase().includes(term);
        }
        return true;
    });

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return { bg: '#FEF3C7', color: '#D97706', text: '⏳ Pending' };
            case 'accepted': return { bg: '#D1FAE5', color: '#059669', text: '✅ Accepted' };
            case 'rejected': return { bg: '#FEE2E2', color: '#DC2626', text: '❌ Rejected' };
            default: return { bg: '#E5E7EB', color: '#4B5563', text: status };
        }
    };

    const getInitials = (name) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return (
            <div className="applications-loading">
                <div className="loading-spinner"></div>
                <p>Loading your applications...</p>
            </div>
        );
    }

    return (
        <div className="applications-page">
            <div className="applications-header">
                <div>
                    <h1>My Applications</h1>
                    <p>Track and manage all your job applications</p>
                </div>
                <Link to="/jobs" className="btn-browse-jobs">
                    🔍 Browse Jobs
                </Link>
            </div>

            {error && (
                <div className="applications-error">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="applications-stats">
                <div className="stat-card total">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Applications</span>
                    </div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.pending}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
                <div className="stat-card accepted">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.accepted}</span>
                        <span className="stat-label">Accepted</span>
                    </div>
                </div>
                <div className="stat-card rejected">
                    <div className="stat-icon">❌</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.rejected}</span>
                        <span className="stat-label">Rejected</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="applications-filters">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by job title, client, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-tabs">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({stats.total})
                    </button>
                    <button 
                        className={`filter-btn pending ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending ({stats.pending})
                    </button>
                    <button 
                        className={`filter-btn accepted ${filter === 'accepted' ? 'active' : ''}`}
                        onClick={() => setFilter('accepted')}
                    >
                        Accepted ({stats.accepted})
                    </button>
                    <button 
                        className={`filter-btn rejected ${filter === 'rejected' ? 'active' : ''}`}
                        onClick={() => setFilter('rejected')}
                    >
                        Rejected ({stats.rejected})
                    </button>
                </div>
            </div>

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
                <div className="no-applications">
                    <div className="no-apps-icon">📭</div>
                    <h3>No applications found</h3>
                    <p>
                        {searchTerm || filter !== 'all' 
                            ? 'Try adjusting your filters'
                            : 'Start applying for jobs to see them here'}
                    </p>
                    {!searchTerm && filter === 'all' && (
                        <Link to="/jobs" className="btn-start-applying">
                            Browse Jobs
                        </Link>
                    )}
                </div>
            ) : (
                <div className="applications-list">
                    {filteredApplications.map((app) => {
                        const status = getStatusColor(app.status);
                        return (
                            <div key={app.id} className="application-card">
                                <div className="application-header">
                                    <div className="client-info">
                                        <div className="client-avatar">
                                            {getInitials(app.client_name)}
                                        </div>
                                        <div>
                                            <h3>{app.job_title}</h3>
                                            <p className="client-name">Posted by {app.client_name}</p>
                                        </div>
                                    </div>
                                    <div 
                                        className="status-badge"
                                        style={{ backgroundColor: status.bg, color: status.color }}
                                    >
                                        {status.text}
                                    </div>
                                </div>

                                <div className="application-body">
                                    <div className="application-details">
                                        <div className="detail-item">
                                            <span className="detail-icon">📍</span>
                                            <span>{app.township}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-icon">💰</span>
                                            <span>Your quote: <strong>R{app.proposed_rate}</strong></span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-icon">📅</span>
                                            <span>Applied: {formatDate(app.created_at)}</span>
                                        </div>
                                        {app.job_budget && (
                                            <div className="detail-item">
                                                <span className="detail-icon">🎯</span>
                                                <span>Job budget: R{app.job_budget}</span>
                                            </div>
                                        )}
                                    </div>

                                    {app.message && (
                                        <div className="application-message">
                                            <strong>Your message:</strong>
                                            <p>{app.message}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="application-footer">
                                    <Link to={`/jobs/${app.job_id}`} className="btn-view-job">
                                        View Job Details
                                    </Link>
                                    {app.status === 'pending' && (
                                        <button 
                                            className="btn-withdraw"
                                            onClick={() => handleWithdraw(app.id)}
                                        >
                                            Withdraw Application
                                        </button>
                                    )}
                                    {app.status === 'accepted' && (
                                        <Link to={`/messages/${app.client_id}`} className="btn-contact">
                                            💬 Contact Client
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tips Section */}
            <div className="applications-tips">
                <h3>💡 Tips to Improve Your Chances</h3>
                <div className="tips-grid">
                    <div className="tip-card">
                        <span className="tip-number">1</span>
                        <h4>Complete Your Profile</h4>
                        <p>A complete profile with skills and rates attracts more clients</p>
                    </div>
                    <div className="tip-card">
                        <span className="tip-number">2</span>
                        <h4>Write Personalized Messages</h4>
                        <p>Customize your application for each job</p>
                    </div>
                    <div className="tip-card">
                        <span className="tip-number">3</span>
                        <h4>Apply to Multiple Jobs</h4>
                        <p>Increase your chances by applying to relevant positions</p>
                    </div>
                    <div className="tip-card">
                        <span className="tip-number">4</span>
                        <h4>Keep Your Pass Active</h4>
                        <p>Maintain an active pass to keep applying</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsPage;