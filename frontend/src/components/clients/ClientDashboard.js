// frontend/src/components/clients/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './ClientDashboard.css';

const ClientDashboard = () => {
    const { user } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    
    const [jobs, setJobs] = useState({
        posted: [],
        hired: [],
        in_progress: [],
        completed: [],
        cancelled: []
    });
    
    const [packages, setPackages] = useState([]);
    const [credits, setCredits] = useState({
        total_remaining: 0,
        active_packages: 0,
        has_unlimited: false
    });
    
    const [stats, setStats] = useState({
        total_spent: 0,
        total_hires: 0,
        active_jobs: 0,
        completion_rate: 0
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('hired');

    useEffect(() => {
        loadClientData();
    }, []);

const loadClientData = async () => {
    setLoading(true);
    try {
        // Load jobs
        const jobsResponse = await api.get('/client/jobs');
        console.log('🔍 FULL API RESPONSE:', jobsResponse.data);
        
        if (jobsResponse.data.success) {
            const allJobs = jobsResponse.data.data;
            console.log('📋 ALL JOBS RAW DATA:', allJobs);
            
            // Log each job's status and hired worker info
            allJobs.forEach(job => {
                console.log(`Job ID: ${job.id}, Title: ${job.title}, Status: ${job.status}`);
                console.log('  Hired Worker:', job.assigned_worker);
                console.log('  Job Status Field:', job.status);
                console.log('  --------------------');
            });
            
            // Count jobs by status
            const posted = allJobs.filter(job => job.status === 'posted').length;
            const hired = allJobs.filter(job => job.status === 'hired').length;
            const inProgress = allJobs.filter(job => job.status === 'in_progress').length;
            const completed = allJobs.filter(job => job.status === 'completed').length;
            const cancelled = allJobs.filter(job => job.status === 'cancelled').length;
            
            console.log('📊 JOB COUNTS:', { posted, hired, inProgress, completed, cancelled });

            setJobs({
                posted: allJobs.filter(job => job.status === 'posted'),
                hired: allJobs.filter(job => job.status === 'hired'),
                in_progress: allJobs.filter(job => job.status === 'in_progress'),
                completed: allJobs.filter(job => job.status === 'completed'),
                cancelled: allJobs.filter(job => job.status === 'cancelled')
            });

            // Calculate stats
            const totalHires = hired + inProgress + completed;
            const completionRate = totalHires > 0 ? Math.round((completed / totalHires) * 100) : 0;

            setStats(prev => ({
                ...prev,
                total_hires: totalHires,
                active_jobs: inProgress,
                completion_rate: completionRate
            }));
        }

        // Load packages and credits
        const packagesResponse = await api.get('/client/my-packages');
        console.log('📦 PACKAGES RESPONSE:', packagesResponse.data);
        
        if (packagesResponse.data.success) {
            const packagesData = packagesResponse.data.data;
            console.log('Packages data:', packagesData);
            
            setPackages(packagesData.packages);
            setCredits(packagesData.stats);
            
            const totalSpent = packagesData.packages.reduce((sum, pkg) => {
                return sum + (Number(pkg.amount_paid) || 0);
            }, 0);
            
            setStats(prev => ({
                ...prev,
                total_spent: totalSpent
            }));
        }

    } catch (error) {
        console.error('❌ Error loading client data:', error);
        setError('Failed to load dashboard data');
    } finally {
        setLoading(false);
    }
};   

    const formatNumber = (num) => {
        if (num === 'Unlimited') return '♾️';
        return num?.toLocaleString() || 0;
    };

    const getInitials = (name) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // ========== RENDER JOBS FUNCTION ==========
const renderJobs = (jobList, status) => {
    if (jobList.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No {status} jobs</h3>
                <p>There are no jobs in this category</p>
                {status === 'posted' && (
                    <Link to="/jobs/post" className="btn-primary">Post a Job</Link>
                )}
            </div>
        );
    }

    return jobList.map(job => (
        <div key={job.id} className={`job-card ${job.status}`}>
            <div className="job-header">
                <h3>{job.title}</h3>
                <span className={`job-status-badge status-${job.status}`}>
                    {job.status === 'hired' ? '👤 Hired' : 
                     job.status === 'posted' ? '📋 Open' : 
                     job.status === 'completed' ? '✅ Completed' : job.status}
                </span>
            </div>
            
            <div className="job-details">
                <p className="job-description">{job.description || 'No description'}</p>
                
                <div className="job-meta">
                    <span>📍 {job.township || 'Location not specified'}</span>
                    <span>💰 R{job.budget_min || 0} - R{job.budget_max || 0}</span>
                    <span>📅 Posted {formatDate(job.created_at)}</span>
                </div>

                {/* Show hired worker info if job is hired */}
                {job.status === 'hired' && job.assigned_worker && (
                    <div className="worker-info">
                        <h4>Hired Worker:</h4>
                        <div className="worker-details">
                            <div className="worker-avatar-small">
                                {getInitials(job.assigned_worker.name)}
                            </div>
                            <div className="worker-info-text">
                                <span className="worker-name">{job.assigned_worker.name}</span>
                                <span className="worker-rating">
                                    ⭐ {job.assigned_worker.rating ? Number(job.assigned_worker.rating).toFixed(1) : 'New'}
                                </span>
                            </div>
                            <Link to={`/workers/${job.assigned_worker.id}`} className="worker-profile-link">
                                View Profile →
                            </Link>
                        </div>
                    </div>
                )}

                <div className="job-actions">
                    <Link to={`/jobs/${job.id}`} className="btn-view">
                        View Details
                    </Link>

                    {job.status === 'posted' && (
                        <Link to={`/jobs/${job.id}`} className="btn-manage">
                            Manage Applications
                        </Link>
                    )}

                    {job.status === 'hired' && (
                        <button 
                            className="btn-complete"
                            onClick={() => handleCompleteJob(job)}
                        >
                            ✅ Mark as Complete
                        </button>
                    )}

                    {job.status === 'completed' && (
                        <button 
                            className="btn-review"
                            onClick={() => handleReviewJob(job)}
                        >
                            ⭐ Leave Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    ));
};

    // ========== JOB ACTION HANDLERS ==========
    const handleStartJob = async (jobId) => {
        alert.confirm(
            'Start this job? The worker will be notified that work has begun.',
            async () => {
                try {
                    const response = await api.post(`/jobs/${jobId}/start`);
                    if (response.data.success) {
                        alert.success('✅ Job started! The worker has been notified.');
                        loadClientData();
                    }
                } catch (error) {
                    console.error('Error starting job:', error);
                    alert.error('Failed to start job. Please try again.');
                }
            },
            () => {
                alert.info('Job start cancelled.');
            },
            'Start Job',
            'Yes, Start',
            'Cancel'
        );
    };

    const handleCompleteJob = (job) => {
        // Navigate to job details with a flag to open completion modal
        navigate(`/jobs/${job.id}`, { 
            state: { 
                openCompletionModal: true,
                fromDashboard: true 
            } 
        });
    };

    const handleReviewJob = (job) => {
        // For completed jobs, navigate to job details to leave a review
        navigate(`/jobs/${job.id}`, { 
            state: { 
                openReviewModal: true,
                fromDashboard: true 
            } 
        });
    };

    if (loading) {
        return <div className="loading-spinner">Loading dashboard...</div>;
    }

    return (
        <div className="client-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p>Manage your jobs and hire packages</p>
                </div>
                <div className="header-actions">
                    <Link to="/jobs/post" className="btn-primary">
                        + Post New Job
                    </Link>
                    <Link to="/client/packages" className="btn-secondary">
                        🎫 Buy Credits
                    </Link>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}


        {/* Dashboard Cards */}
        <div className="dashboard-cards">
            {/* Credit Card */}
            <div className="dashboard-card credit-card">
                <div className="card-icon">💳</div>
                <div className="card-content">
                    <h3>Hire Credits</h3>
                    <div className="card-value">
                        {credits.total_remaining === 'Unlimited' ? (
                            <span className="unlimited">♾️ Unlimited</span>
                        ) : (
                            <span>{credits.total_remaining}</span>
                        )}
                    </div>
                    <div className="card-footer">
                        <span className="card-label">Active packages: {credits.active_packages}</span>
                        <Link to="/client/my-packages" className="card-link">View →</Link>
                    </div>
                </div>
            </div>

            {/* Posted Jobs Card */}
            <div className="dashboard-card posted-card">
                <div className="card-icon">📋</div>
                <div className="card-content">
                    <h3>Posted Jobs</h3>
                    <div className="card-value">{jobs.posted.length}</div>
                    <div className="card-footer">
                        <span className="card-label">Waiting for applicants</span>
                        <Link to="/client/jobs?status=posted" className="card-link">View →</Link>
                    </div>
                </div>
            </div>

            {/* Active Hires Card */}
            <div className="dashboard-card hired-card">
                <div className="card-icon">🤝</div>
                <div className="card-content">
                    <h3>Active Hires</h3>
                    <div className="card-value">{jobs.hired.length + jobs.in_progress.length}</div>
                    <div className="card-footer">
                        <span className="card-label">{jobs.hired.length} hired, {jobs.in_progress.length} in progress</span>
                        <Link to="/client/jobs?status=active" className="card-link">View →</Link>
                    </div>
                </div>
            </div>

            {/* Completed Jobs Card */}
            <div className="dashboard-card completed-card">
                <div className="card-icon">✅</div>
                <div className="card-content">
                    <h3>Completed</h3>
                    <div className="card-value">{jobs.completed.length}</div>
                    <div className="card-footer">
                        <span className="card-label">
                            {stats.total_hires > 0 
                                ? `${stats.completion_rate}% success rate (${jobs.completed.length}/${stats.total_hires})`
                                : 'No hires yet'}
                        </span>
                        <Link to="/client/jobs?status=completed" className="card-link">View →</Link>
                    </div>
                </div>
            </div>

            {/* Total Spent Card */}
            <div className="dashboard-card spent-card">
                <div className="card-icon">💰</div>
                <div className="card-content">
                    <h3>Total Spent</h3>
                    <div className="card-value">
                        R{stats.total_spent.toLocaleString('en-ZA')}
                    </div>
                    <div className="card-footer">
                        <span className="card-label">{stats.total_hires} total hire{stats.total_hires !== 1 ? 's' : ''}</span>
                        <Link to="/client/my-packages" className="card-link">History →</Link>
                    </div>
                </div>
            </div>

            {/* Quick Stats Card */}
            <div className="dashboard-card stats-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                    <h3>Quick Stats</h3>
                    <div className="stats-mini-grid">
                        <div className="mini-stat">
                            <span className="mini-value">{jobs.posted.length}</span>
                            <span className="mini-label">Open</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-value">{jobs.hired.length}</span>
                            <span className="mini-label">Hired</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-value">{jobs.in_progress.length}</span>
                            <span className="mini-label">Active</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-value">{jobs.completed.length}</span>
                            <span className="mini-label">Done</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Credits Overview */}
            <div className="credits-overview">
                <h2>Your Hire Packages</h2>
                {packages.length === 0 ? (
                    <div className="no-packages">
                        <p>You haven't purchased any hire packages yet.</p>
                        <Link to="/client/packages" className="btn-primary">Buy Your First Package</Link>
                    </div>
                ) : (
                    <div className="packages-mini-grid">
                        {packages.slice(0, 3).map(pkg => (
                            <div key={pkg.id} className="package-mini-card">
                                <div className="package-mini-header">
                                    <span className="package-mini-type">
                                        {pkg.package_type === 'single' ? '🔨 Single' :
                                         pkg.package_type === 'starter' ? '📦 Starter' :
                                         pkg.package_type === 'business' ? '💼 Business' : '🚀 Unlimited'}
                                    </span>
                                    <span className={`package-mini-status ${pkg.status}`}>
                                        {pkg.status}
                                    </span>
                                </div>
                                <div className="package-mini-progress">
                                    {!pkg.unlimited ? (
                                        <>
                                            <div className="progress-bar-small">
                                                <div 
                                                    className="progress-fill-small"
                                                    style={{ width: `${((pkg.total_hires - pkg.hires_remaining) / pkg.total_hires) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="progress-text">
                                                {pkg.hires_remaining}/{pkg.total_hires} left
                                            </span>
                                        </>
                                    ) : (
                                        <span className="unlimited-text">♾️ Unlimited</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {packages.length > 3 && (
                            <Link to="/client/my-packages" className="view-all-packages">
                                View all {packages.length} packages →
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button 
                    className={`tab-btn ${activeTab === 'hired' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hired')}
                >
                    Hired ({jobs.hired.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('in_progress')}
                >
                    In Progress ({jobs.in_progress.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'posted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posted')}
                >
                    Open ({jobs.posted.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed ({jobs.completed.length})
                </button>
            </div>

            {/* Jobs List - Using renderJobs function */}
            <div className="jobs-list">
                {activeTab === 'hired' && renderJobs(jobs.hired, 'hired')}
                {activeTab === 'in_progress' && renderJobs(jobs.in_progress, 'in progress')}
                {activeTab === 'posted' && renderJobs(jobs.posted, 'posted')}
                {activeTab === 'completed' && renderJobs(jobs.completed, 'completed')}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/jobs/post" className="action-card">
                        <span className="action-icon">📋</span>
                        <span className="action-title">Post a Job</span>
                        <span className="action-desc">Create a new job posting</span>
                    </Link>
                    
                    <Link to="/client/packages" className="action-card">
                        <span className="action-icon">🎫</span>
                        <span className="action-title">Buy Credits</span>
                        <span className="action-desc">Purchase hire packages</span>
                    </Link>
                    
                    <Link to="/client/my-packages" className="action-card">
                        <span className="action-icon">📦</span>
                        <span className="action-title">My Packages</span>
                        <span className="action-desc">View your credits</span>
                    </Link>
                    
                    <Link to="/jobs" className="action-card">
                        <span className="action-icon">🔍</span>
                        <span className="action-title">Browse Jobs</span>
                        <span className="action-desc">See what workers are applying for</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;