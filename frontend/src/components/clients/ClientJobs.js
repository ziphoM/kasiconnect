// frontend/src/components/clients/ClientJobs.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ClientJobs.css';

const ClientJobs = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const statusParam = queryParams.get('status') || 'all';
    
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(statusParam);

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        // Read status from URL when it changes
        const statusParam = queryParams.get('status') || 'all';
        console.log('URL status parameter:', statusParam);
        setActiveFilter(statusParam);
    }, [location.search]);   

    useEffect(() => {
        filterJobs();
    }, [jobs, activeFilter]);

    const loadJobs = async () => {
        try {
            const response = await api.get('/client/jobs');
            if (response.data.success) {
                console.log('Loaded jobs:', response.data.data);
                setJobs(response.data.data);
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        filterJobs();
    }, [jobs, activeFilter]);

    const filterJobs = () => {
        console.log('Filtering jobs with filter:', activeFilter);
        console.log('All jobs:', jobs);
        
        if (activeFilter === 'all') {
            setFilteredJobs(jobs);
        } else if (activeFilter === 'active') {
            // Active means both 'hired' and 'in_progress' jobs
            const activeJobs = jobs.filter(job => 
                job.status === 'hired' || job.status === 'in_progress'
            );
            console.log('Active jobs:', activeJobs);
            setFilteredJobs(activeJobs);
        } else if (activeFilter === 'posted') {
            setFilteredJobs(jobs.filter(job => job.status === 'posted'));
        } else if (activeFilter === 'completed') {
            setFilteredJobs(jobs.filter(job => job.status === 'completed'));
        } else {
            // If unknown filter, default to all
            setFilteredJobs(jobs);
        }
    };

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        // Update URL without reloading
        navigate(`/client/jobs${filter !== 'all' ? `?status=${filter}` : ''}`, { replace: true });
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'posted':
                return <span className="status-badge posted">📋 Open</span>;
            case 'hired':
                return <span className="status-badge hired">👤 Hired</span>;
            case 'in_progress':
                return <span className="status-badge in-progress">⚙️ In Progress</span>;
            case 'completed':
                return <span className="status-badge completed">✅ Completed</span>;
            case 'cancelled':
                return <span className="status-badge cancelled">❌ Cancelled</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    const getInitials = (name) => {
        if (!name) return 'W';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatRating = (rating) => {
        // Handle null, undefined, or empty values
        if (rating === null || rating === undefined || rating === '') {
            return 'New';
        }
        
        // Convert to number
        const numRating = Number(rating);
        
        // Check if it's a valid number
        if (isNaN(numRating)) {
            return 'New';
        }
        
        // Return formatted rating with 1 decimal place
        return numRating.toFixed(1);
    };   

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="client-jobs-loading">
                <div className="loading-spinner">Loading your jobs...</div>
            </div>
        );
    }

    return (
        <div className="client-jobs-container">
            {/* Header */}
            <div className="client-jobs-header">
                <div>
                    <h1>My Jobs</h1>
                    <p>Manage all your job postings and hires</p>
                </div>
                <Link to="/jobs/post" className="btn-primary">
                    + Post New Job
                </Link>
            </div>

            {/* Stats Summary */}
            <div className="jobs-stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Total Jobs</span>
                    <span className="stat-value">{jobs.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Open</span>
                    <span className="stat-value">{jobs.filter(j => j.status === 'posted').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Active Hires</span>
                    <span className="stat-value">
                        {jobs.filter(j => j.status === 'hired' || j.status === 'in_progress').length}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Completed</span>
                    <span className="stat-value">{jobs.filter(j => j.status === 'completed').length}</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button 
                    className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveFilter('all');
                        navigate('/client/jobs', { replace: true });
                    }}
                >
                    All Jobs
                </button>
                <button 
                    className={`filter-btn ${activeFilter === 'posted' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveFilter('posted');
                        navigate('/client/jobs?status=posted', { replace: true });
                    }}
                >
                    Open ({jobs.filter(j => j.status === 'posted').length})
                </button>
                <button 
                    className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveFilter('active');
                        navigate('/client/jobs?status=active', { replace: true });
                    }}
                >
                    Active Hires ({jobs.filter(j => j.status === 'hired' || j.status === 'in_progress').length})
                </button>
                <button 
                    className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveFilter('completed');
                        navigate('/client/jobs?status=completed', { replace: true });
                    }}
                >
                    Completed ({jobs.filter(j => j.status === 'completed').length})
                </button>
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No jobs found</h3>
                    <p>
                        {activeFilter === 'all' && "You haven't posted any jobs yet"}
                        {activeFilter === 'posted' && "You don't have any open jobs"}
                        {activeFilter === 'active' && "You don't have any active hires"}
                        {activeFilter === 'completed' && "You haven't completed any jobs yet"}
                    </p>
                    {activeFilter === 'posted' && (
                        <Link to="/jobs/post" className="btn-primary">
                            Post Your First Job
                        </Link>
                    )}
                </div>
            ) : (
                <div className="jobs-list">
                    {filteredJobs.map(job => (
                        <div key={job.id} className="job-card">
                            <div className="job-card-header">
                                <div>
                                    <h3>{job.title}</h3>
                                    <div className="job-meta">
                                        <span>📍 {job.township || 'Location not specified'}</span>
                                        <span>💰 R{job.budget_min?.toLocaleString()} - R{job.budget_max?.toLocaleString()}</span>
                                        <span>📅 Posted {formatDate(job.created_at)}</span>
                                    </div>
                                </div>
                                {getStatusBadge(job.status)}
                            </div>

                            <p className="job-description">
                                {job.description || 'No description provided'}
                            </p>

                            {/* Show assigned worker if any */}
                            {job.assigned_worker && (
                                <div className="assigned-worker">
                                    <h4>Hired Worker:</h4>
                                    <div className="worker-info">
                                        <div className="worker-avatar">
                                            {getInitials(job.assigned_worker.name)}
                                        </div>
                                        <div className="worker-details">
                                            <span className="worker-name">{job.assigned_worker.name}</span>
                                            <span className="worker-rating">
                                                ⭐ {formatRating(job.assigned_worker?.rating)}
                                            </span>
                                            {job.assigned_worker.completed_jobs > 0 && (
                                                <span className="worker-jobs">
                                                    {job.assigned_worker.completed_jobs} jobs completed
                                                </span>
                                            )}
                                        </div>
                                        <Link to={`/workers/${job.assigned_worker.id}`} className="worker-link">
                                            View Profile →
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Application count for posted jobs */}
                            {job.status === 'posted' && job.application_count > 0 && (
                                <div className="application-count">
                                    <span className="count-badge">
                                        📋 {job.application_count} application{job.application_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            <div className="job-card-footer">
                                <Link to={`/jobs/${job.id}`} className="btn-view">
                                    View Details
                                </Link>
                                {job.status === 'posted' && (
                                    <Link to={`/jobs/${job.id}`} className="btn-manage">
                                        Manage Applications →
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientJobs;