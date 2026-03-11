// frontend/src/components/jobs/JobDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './JobDetails.css';

const formatRating = (rating) => {
    if (rating === null || rating === undefined || rating === '') {
        return 'New';
    }
    const numRating = Number(rating);
    return isNaN(numRating) ? 'New' : numRating.toFixed(1);
};

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    
    // If it's a relative path, prepend the backend URL
    const API_URL = 'http://localhost:5000';
    return `${API_URL}${path}`;
};

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const alert = useAlert();
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [applying, setApplying] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null);
    const [applicationData, setApplicationData] = useState({
        proposed_rate: '',
        message: ''
    });
    const [clientCredits, setClientCredits] = useState(null);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [hireSuccess, setHireSuccess] = useState(false);
    const [hiredWorker, setHiredWorker] = useState(null);
    
    // Completion modal states
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [completing, setCompleting] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    useEffect(() => {
        loadJobDetails();
        if (user?.user_type === 'client') {
            checkClientCredits();
        }
    }, [id, user]);

    const loadJobDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/jobs/${id}`);
            if (response.data.success) {
                const jobData = response.data.data;
                console.log('📋 Raw job data from API:', jobData);
                
                // Check if worker data exists at the root level
                if (jobData.worker_id || jobData.hired_worker_id) {
                    // Create a hired_worker object from the root-level worker fields
                    jobData.hired_worker = {
                        id: jobData.worker_id || jobData.hired_worker_id,
                        name: jobData.worker_name || 'Worker',
                        phone: jobData.worker_phone || '',
                        email: jobData.worker_email || '',
                        rating: jobData.worker_rating || 0
                    };
                    console.log('✅ Created hired_worker object:', jobData.hired_worker);
                }
                
                setJob(jobData);
            } else {
                setError('Job not found');
            }
        } catch (error) {
            console.error('Error loading job:', error);
            setError('Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    const checkClientCredits = async () => {
        try {
            const response = await api.get('/client/hire-credits');
            if (response.data.success) {
                setClientCredits(response.data.data);
            }
        } catch (error) {
            console.error('Error checking credits:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setApplicationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // In JobDetails.js, update the handleApply function

const handleApply = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
        alert.warning('Please login to apply for jobs');
        navigate('/login', { state: { from: `/jobs/${id}` } });
        return;
    }

    if (user?.user_type !== 'worker') {
        alert.error('Only workers can apply for jobs');
        return;
    }

    if (!applicationData.proposed_rate) {
        alert.warning('Please enter your proposed rate');
        return;
    }

    setApplying(true);

    try {
        const response = await api.post(`/jobs/${id}/apply`, {
            proposed_rate: parseInt(applicationData.proposed_rate),
            message: applicationData.message
        });
        
        if (response.data.success) {
            alert.success('✅ Application submitted successfully!');
            setApplicationData({ proposed_rate: '', message: '' });
            loadJobDetails();
        } else {
            alert.error(response.data.message || 'Failed to apply');
        }
    } catch (error) {
        console.error('Apply error:', error);
        if (error.response?.status === 400 && error.response?.data?.message === 'You need an active application pass to apply for jobs') {
            // Store the job ID and application data before redirecting
            sessionStorage.setItem('pendingJobApplication', JSON.stringify({
                jobId: id,
                proposed_rate: applicationData.proposed_rate,
                message: applicationData.message,
                returnTo: `/jobs/${id}`
            }));
            
            alert.confirm(
                'You need an application pass to apply for jobs. Would you like to buy one now?',
                () => navigate('/worker/pass'),
                () => {},
                'Application Pass Required',
                'Buy Pass',
                'Cancel'
            );
        } else {
            alert.error(error.response?.data?.message || 'Failed to apply. Please try again.');
        }
    } finally {
        setApplying(false);
    }
};

// check for pending application when component loads
useEffect(() => {
    loadJobDetails();
    if (user?.user_type === 'client') {
        checkClientCredits();
    }
    
    // Check if we have a pending application for this job
    const pendingApp = sessionStorage.getItem('pendingJobApplication');
    if (pendingApp) {
        const pendingData = JSON.parse(pendingApp);
        if (pendingData.jobId === id) {
            // Restore the form data
            setApplicationData({
                proposed_rate: pendingData.proposed_rate || '',
                message: pendingData.message || ''
            });
            
            // Optional: Show a message that they can reapply
            alert.info('You can now apply for this job with your new pass!');
            
            // Clear the pending data after restoring
            sessionStorage.removeItem('pendingJobApplication');
        }
    }

      // Check for return from pass purchase

    if (location.state?.passPurchased) {
        alert.success(location.state.message || 'Pass purchased successfully!');
        // Clear the state so the message doesn't show again on refresh
        navigate(location.pathname, { replace: true ,state:{} });
    }

    // Check if we should open completion modal
    if (location.state?.openCompletionModal && job?.status === 'hired') {
        setShowCompletionModal(true);
        // Clear the state
        navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Check if we should open review modal
    if (location.state?.openReviewModal && job?.status === 'completed') {
        setShowReviewModal(true); // You'll need to add this state
        // Clear the state
        navigate(location.pathname, { replace: true, state: {} });
    }
}, [id, user, location.state, job?.status]);    // Add location.state to dependencies

    const handleViewWorkerProfile = (workerId) => {
        navigate(`/workers/${workerId}`, { 
            state: { 
                fromClient: true,
                jobId: job?.id,
                canHire: true 
            } 
        });
    };

    const handleHireClick = (application) => {
        console.log('Hire clicked for application:', application);
        console.log('Current client credits:', clientCredits);
        
        setSelectedWorker(application);
        
        if (!clientCredits) {
            console.log('No client credits data');
            alert.error('Unable to verify your credits. Please refresh and try again.');
            return;
        }

        if (clientCredits.active_packages === 0) {
            console.log('No active packages');
            setShowCreditModal(true);
            return;
        }

        if (clientCredits.total_remaining === 0) {
            console.log('Zero credits remaining');
            setShowCreditModal(true);
            return;
        }

        alert.confirm(
            `You are about to hire ${application.worker_name} for R${application.proposed_rate}. This will use 1 hire credit.`,
            () => processHire(application),
            () => {},
            'Confirm Hire',
            'Yes, Hire',
            'Cancel'
        );
    };

    const processHire = async (application) => {
        setAcceptingId(application.id);
        
        try {
            const response = await api.post(`/jobs/${job.id}/hire`, {
                worker_id: application.worker_id,
                agreed_rate: application.proposed_rate
            });

            if (response.data.success) {
                setHireSuccess(true);
                setHiredWorker({
                    name: application.worker_name,
                    phone: response.data.data.worker_phone,
                    email: response.data.data.worker_email
                });

                alert.success(
                    `✅ Successfully hired ${application.worker_name}! Contact them at ${response.data.data.worker_phone}`
                );

                loadJobDetails();
                checkClientCredits();
            }
        } catch (error) {
            console.error('Hire error:', error);
            if (error.response?.status === 400) {
                if (error.response?.data?.message?.includes('Insufficient credits')) {
                    setShowCreditModal(true);
                } else {
                    alert.error(error.response?.data?.message || 'Failed to hire worker');
                }
            } else {
                alert.error('Failed to hire worker. Please try again.');
            }
        } finally {
            setAcceptingId(null);
            setSelectedWorker(null);
        }
    };

    const handleCompleteJob = async () => {
        console.log('🔍 COMPLETE JOB - Full job object:', job);
        console.log('🔍 COMPLETE JOB - Hired worker:', job?.hired_worker);
        
        // Check if job exists
        if (!job) {
            alert.error('Job data not found');
            return;
        }
        
        // Check multiple possible locations for worker data
        const workerId = job.hired_worker?.id || job.worker_id || job.hired_worker_id;
        const workerName = job.hired_worker?.name || job.worker_name;
        
        console.log('🔍 Worker ID found:', workerId);
        console.log('🔍 Worker Name found:', workerName);
        
        if (!workerId) {
            console.error('No worker ID found in job data. Available fields:', {
                hired_worker: job.hired_worker,
                worker_id: job.worker_id,
                hired_worker_id: job.hired_worker_id,
                worker_name: job.worker_name
            });
            alert.error('No hired worker found for this job. Please check the job details.');
            return;
        }

        setCompleting(true);
        try {
            const response = await api.post(`/jobs/${job.id}/complete`, {
                rating: rating,
                review: review,
                worker_id: workerId  // Use the workerId we found
            });

            console.log('Complete response:', response.data);

            if (response.data.success) {
                alert.success('✅ Job completed successfully!');
                setShowCompletionModal(false);
                setRating(5);
                setReview('');
                loadJobDetails();
            } else {
                alert.error(response.data.message || 'Failed to complete job');
            }
        } catch (error) {
            console.error('❌ Error completing job:', error);
            alert.error(error.response?.data?.message || 'Failed to complete job');
        } finally {
            setCompleting(false);
        }
    };

        const handleSubmitReview = async () => {
        // You can reuse the same complete endpoint or create a separate one
        // For now, we'll just show a message
        alert.success('✅ Review submitted! Thank you for your feedback.');
        setShowReviewModal(false);
    };

    const handleBuyCredits = () => {
        setShowCreditModal(false);
        navigate('/client/packages');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getUrgencyColor = (urgency) => {
        switch (urgency) {
            case 'urgent': return { bg: '#FEE2E2', color: '#DC2626', text: '🚨 Urgent', light: '#FEF2F2' };
            case 'high': return { bg: '#FEF3C7', color: '#D97706', text: '⚡ High', light: '#FFFBEB' };
            case 'medium': return { bg: '#DBEAFE', color: '#2563EB', text: '📋 Medium', light: '#EFF6FF' };
            default: return { bg: '#E5E7EB', color: '#4B5563', text: '🟢 Low', light: '#F9FAFB' };
        }
    };

    const getInitials = (name) => {
        if (!name) return 'W';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">Loading job details...</div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="error-container">
                <h2>❌ Error</h2>
                <p>{error || 'Job not found'}</p>
                <button onClick={handleBack} className="btn-primary">Go Back</button>
            </div>
        );
    }

    const urgency = getUrgencyColor(job.urgency);
    const hasApplied = job.applications?.some(app => app.worker_id === user?.id);
    const isOwner = job.client_id === user?.id;
    const isWorker = user?.user_type === 'worker';
    const isJobHired = job.status === 'hired' || job.status === 'in_progress' || job.status === 'completed';

    return (
        <div className="job-details-container">
            <div className="job-details">
                {/* Breadcrumb Navigation */}
                <div className="breadcrumb-nav">
                    <Link to="/jobs" className="breadcrumb-link">Jobs</Link>
                    <span className="breadcrumb-separator">›</span>
                    <span className="breadcrumb-current">{job.title}</span>
                </div>

                {/* Job Header Card */}
                <div className="job-header-card">
                    <div className="job-title-section">
                        <h1 className="job-main-title">{job.title}</h1>
                        <div className="job-badges">
                            <span className="job-id-badge">#{job.job_code || 'N/A'}</span>
                            <span className="urgency-badge" style={{ backgroundColor: urgency.light, color: urgency.color }}>
                                {urgency.text}
                            </span>
                            <span className="status-badge">
                                {job.status === 'posted' && '📢 Open'}
                                {job.status === 'hired' && '👥 In Progress'}
                                {job.status === 'completed' && '✅ Completed'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="job-meta-grid">
                        <div className="meta-item location">
                            <span className="meta-icon">📍</span>
                            <div className="meta-content">
                                <span className="meta-label">Location</span>
                                <span className="meta-value">{job.township || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div className="meta-item date">
                            <span className="meta-icon">📅</span>
                            <div className="meta-content">
                                <span className="meta-label">Posted</span>
                                <span className="meta-value">{formatDate(job.created_at)}</span>
                            </div>
                        </div>
                        
                        <div className="meta-item category">
                            <span className="meta-icon">🏷️</span>
                            <div className="meta-content">
                                <span className="meta-label">Category</span>
                                <span className="meta-value">{job.category || 'General'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Card */}
                <div className="budget-card">
                    <div className="budget-header">
                        <span className="budget-icon">💰</span>
                        <span className="budget-title">Budget Range</span>
                    </div>
                    <div className="budget-amounts">
                        <div className="budget-min">
                            <span className="budget-label">Minimum</span>
                            <span className="budget-number">R {job.budget_min?.toLocaleString()}</span>
                        </div>
                        <div className="budget-separator">—</div>
                        <div className="budget-max">
                            <span className="budget-label">Maximum</span>
                            <span className="budget-number">R {job.budget_max?.toLocaleString()}</span>
                        </div>
                        {job.estimated_hours && (
                            <div className="estimated-time">
                                <span className="time-icon">⏱️</span>
                                <span>{job.estimated_hours} hours</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description Card */}
                <div className="description-card">
                    <h2 className="section-title">
                        <span className="title-icon">📝</span>
                        Description
                    </h2>
                    <p className="description-text">{job.description || 'No description provided'}</p>
                </div>

                {/* Details Grid */}
                <div className="details-grid">
                    {job.subcategory && (
                        <div className="detail-item">
                            <span className="detail-icon">🔧</span>
                            <div className="detail-content">
                                <span className="detail-label">Subcategory</span>
                                <span className="detail-value">{job.subcategory}</span>
                            </div>
                        </div>
                    )}
                    
                    {job.preferred_date && (
                        <div className="detail-item">
                            <span className="detail-icon">📆</span>
                            <div className="detail-content">
                                <span className="detail-label">Preferred Date</span>
                                <span className="detail-value">{formatDate(job.preferred_date)}</span>
                            </div>
                        </div>
                    )}
                    
                    {job.preferred_time && (
                        <div className="detail-item">
                            <span className="detail-icon">⏰</span>
                            <div className="detail-content">
                                <span className="detail-label">Preferred Time</span>
                                <span className="detail-value">{job.preferred_time}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Materials & Safety Section */}
                {job.materials_provided && (
                    <div className="materials-card">
                        <h2 className="section-title">
                            <span className="title-icon">📦</span>
                            Materials Provided
                        </h2>
                        <p className="materials-note">✓ Client will provide materials</p>
                        {job.materials_description && (
                            <p className="materials-description">{job.materials_description}</p>
                        )}
                    </div>
                )}

                {job.safety_requirements && (
                    <div className="safety-card">
                        <h2 className="section-title">
                            <span className="title-icon">🛡️</span>
                            Safety Requirements
                        </h2>
                        <p className="safety-text">{job.safety_requirements}</p>
                    </div>
                )}

                {/* Client Info Card */}
                <div className="client-card">
                    <h2 className="section-title">
                        Posted by
                    </h2>
                    <div className="client-info">
                        <div className="client-avatar">
                            {job.client_profile_picture ? (
                                <img 
                                    src={getImageUrl(job.client_profile_picture)} 
                                    alt={job.client_name || 'Client'} 
                                    className="client-avatar-image"
                                    onError={(e) => {
                                        console.error('Client image failed to load:', job.client_profile_picture);
                                        e.target.style.display = 'none';
                                        // Show initials as fallback
                                        const parent = e.target.parentElement;
                                        parent.innerHTML = `<div class="client-avatar-initials">${job.client_name?.charAt(0) || 'C'}</div>`;
                                    }}
                                />
                            ) : (
                                <div className="client-avatar-initials">
                                    {job.client_name?.charAt(0) || 'C'}
                                </div>
                            )}
                        </div>
                        <div className="client-details">
                            <h3 className="client-name">{job.client_name || 'Client'}</h3>
                            <p className="client-location">
                                <span>📍</span>
                                {job.client_township || job.township}
                            </p>
                            
                            {/* Show client contact if worker is hired for this job */}
                            {isWorker && job.status === 'hired' && job.hired_worker_id === user?.id && (
                                <div className="client-contact-info">
                                    <p className="client-phone">
                                        <span>📞</span> {job.client_phone || 'Contact info available after hire'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Client Contact Section - Only for hired workers */}
                {isWorker && job.status === 'hired' && job.hired_worker_id === user?.id && (
                    <div className="client-contact-section">
                        <h2 className="section-title">
                            <span className="title-icon">📞</span>
                            Client Contact Information
                        </h2>
                        <div className="contact-card">
                            <div className="contact-row">
                                <span className="contact-label">Name:</span>
                                <span className="contact-value">{job.client_name}</span>
                            </div>
                            <div className="contact-row">
                                <span className="contact-label">Phone:</span>
                                <span className="contact-value highlight">{job.client_phone}</span>
                            </div>
                            {job.client_email && (
                                <div className="contact-row">
                                    <span className="contact-label">Email:</span>
                                    <span className="contact-value">{job.client_email}</span>
                                </div>
                            )}
                            <div className="contact-note">
                                <span className="note-icon">ℹ️</span>
                                <span>You can now contact the client directly to arrange the job details.</span>
                            </div>
                        </div>
                    </div>
                )}               

                {/* Credit Status for Client */}
                {isOwner && clientCredits && (
                    <div className="credit-card">
                        <div className="credit-header">
                            <span className="credit-icon">💳</span>
                            <h3>Your Hire Credits</h3>
                        </div>
                        <div className="credit-body">
                            <div className="credit-amount">
                                {clientCredits.total_remaining === 'Unlimited' ? '♾️ Unlimited' : `${clientCredits.total_remaining} credits remaining`}
                            </div>
                            <Link to="/client/my-packages" className="credit-link">
                                View Packages →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Job Status Banner */}
                {isJobHired && (
                    <div className="status-banner">
                        <span className="banner-icon">
                            {job.status === 'hired' ? '👥' : '✅'}
                        </span>
                        <div className="banner-text">
                            <h3>Job Status: {job.status === 'hired' ? 'In Progress' : job.status}</h3>
                            <p>
                                {job.status === 'hired' && isWorker && job.hired_worker_id === user?.id 
                                    ? 'You have been hired for this job! Contact the client using the details below.'
                                    : job.status === 'hired' 
                                        ? 'A worker has been hired and work is in progress'
                                        : 'This job has been completed'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Hired Worker Section */}
                {isOwner && job.hired_worker && (
                    <div className="hired-worker-section">
                        <h2>✅ Hired Worker</h2>
                        <div className="hired-worker-card">
                            <div className="hired-worker-info">
                                <div className="worker-avatar-large">
                                    {job.hired_worker.profile_picture ? (
                                        <img 
                                            src={getImageUrl(job.hired_worker.profile_picture)} 
                                            alt={job.hired_worker.name}
                                            className="worker-avatar-image"
                                            onError={(e) => {
                                                console.error('Worker image failed to load:', job.hired_worker.profile_picture);
                                                e.target.style.display = 'none';
                                                // Show initials as fallback
                                                const parent = e.target.parentElement;
                                                parent.innerHTML = `<div class="worker-avatar-initials">${getInitials(job.hired_worker.name)}</div>`;
                                            }}
                                        />
                                    ) : (
                                        <div className="worker-avatar-initials">
                                            {getInitials(job.hired_worker.name)}
                                        </div>
                                    )}
                                </div>
                                <div className="worker-info">
                                    <h3>{job.hired_worker.name}</h3>
                                    <p className="worker-rating">
                                        ⭐ {job.hired_worker.rating ? Number(job.hired_worker.rating).toFixed(1) : 'New'}
                                    </p>
                                </div>
                            </div>
                            
                            {job.status === 'completed' ? (
                                <div className="completed-badge">
                                    <span className="completed-icon">✅</span>
                                    <span>Job Completed</span>
                                </div>
                            ) : (
                                <>
                                    <div className="contact-details">
                                        <p><strong>📞 Phone:</strong> {job.hired_worker.phone || 'Not available'}</p>
                                        {job.hired_worker.email && <p><strong>✉️ Email:</strong> {job.hired_worker.email}</p>}
                                    </div>
                                    <Link to={`/workers/${job.hired_worker.id}`} className="btn-view-full-profile">
                                        View Full Profile
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
                {/* Job Completion Section */}
                {isOwner && job.status === 'hired' && (
                    <div className="job-completion-section">
                        <h2>📋 Job Progress</h2>
                        <div className="completion-card">
                            <div className="completion-info">
                                <span className="info-icon">⏳</span>
                                <div>
                                    <h3>Job in Progress</h3>
                                    <p>Worker has been hired. Mark as complete when the work is done.</p>
                                </div>
                            </div>
                            <button 
                                className="btn-mark-complete"
                                onClick={() => setShowCompletionModal(true)}
                            >
                                ✅ Mark Job as Complete
                            </button>
                        </div>
                    </div>
                )}

                
                {/* Applications Section - Only show if job is NOT hired and NOT completed */}
                {isOwner && job.applications && job.applications.length > 0 && job.status === 'posted' && (
                    <div className="applications-section">
                        <h2 className="section-title">
                            <span className="title-icon">📋</span>
                            Applications ({job.applications.length})
                        </h2>
                        
                        <div className="applications-list">
                            {job.applications.map((app) => {
                                const isHired = app.status === 'accepted';
                                return (
                                    <div key={app.id} className={`application-card ${isHired ? 'hired' : ''}`}>
                                        <div className="application-header">
                                            <div className="applicant-main">
                                                <button 
                                                    onClick={() => handleViewWorkerProfile(app.worker_id)}
                                                    className="applicant-avatar"
                                                    disabled={isJobHired && !isHired}
                                                >
                                                    {app.worker_profile_picture ? (
                                                        <img 
                                                            src={getImageUrl(app.worker_profile_picture)} 
                                                            alt={app.worker_name}
                                                            className="applicant-avatar-image"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = getInitials(app.worker_name);
                                                            }}
                                                        />
                                                    ) : (
                                                        getInitials(app.worker_name)
                                                    )}
                                                </button>
                                                <div>
                                                    <button 
                                                        onClick={() => handleViewWorkerProfile(app.worker_id)}
                                                        className="applicant-name"
                                                        disabled={isJobHired && !isHired}
                                                    >
                                                        {app.worker_name}
                                                    </button>
                                                    <div className="applicant-rating">
                                                        {'⭐'.repeat(Math.round(app.worker_rating || 0))}
                                                        <span>({app.worker_rating ? Number(app.worker_rating).toFixed(1) : 'New'})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="application-status">
                                                <span className={`status-dot ${app.status}`}></span>
                                                {app.status === 'accepted' ? 'Hired' : app.status}
                                            </div>
                                        </div>

                                        <div className="application-body">
                                            <div className="rate-badge">
                                                <span className="rate-label">Quote</span>
                                                <span className="rate-value">R {app.proposed_rate}</span>
                                            </div>
                                            
                                            {app.message && (
                                                <div className="message-box">
                                                    <p>{app.message}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="application-footer">
                                            <button 
                                                onClick={() => handleViewWorkerProfile(app.worker_id)}
                                                className="btn-view"
                                            >
                                                View Profile
                                            </button>
                                            
                                            {app.status === 'pending' && (
                                                <button 
                                                    onClick={() => handleHireClick(app)}
                                                    className="btn-hire"
                                                    disabled={acceptingId === app.id}
                                                >
                                                    {acceptingId === app.id ? '...' : 'Hire'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* No Applications Message - Only show if job is posted and has no applications */}
                {isOwner && job.status === 'posted' && (!job.applications || job.applications.length === 0) && (
                    <div className="no-applications">
                        <div className="no-apps-icon">📭</div>
                        <h3>No applications yet</h3>
                        <p>When workers apply, they'll appear here</p>
                    </div>
                )}

                {/* No Applications Message */}
                {isOwner && (!job.applications || job.applications.length === 0) && (
                    <div className="no-applications">
                        <div className="no-apps-icon">📭</div>
                        <h3>No applications yet</h3>
                        <p>When workers apply, they'll appear here</p>
                    </div>
                )}

                {/* Apply Section for Workers - Only show if job is still posted */}
                {isWorker && !isOwner && !hasApplied && job.status === 'posted' && (
                    <div className="apply-card">
                        <h2 className="section-title">
                            <span className="title-icon">✍️</span>
                            Apply for this job
                        </h2>
                        
                        <form onSubmit={handleApply} className="apply-form">
                            <div className="form-group">
                                <label>Your proposed rate (R)</label>
                                <div className="rate-input-wrapper">
                                    <input
                                        type="number"
                                        name="proposed_rate"
                                        value={applicationData.proposed_rate}
                                        onChange={handleInputChange}
                                        placeholder={job.budget_min}
                                        min={job.budget_min}
                                        max={job.budget_max}
                                        required
                                    />
                                    <span className="rate-range">
                                        R{job.budget_min} - R{job.budget_max}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Message to client</label>
                                <textarea
                                    name="message"
                                    value={applicationData.message}
                                    onChange={handleInputChange}
                                    placeholder="Tell the client why you're the best person for this job..."
                                    rows="4"
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="btn-submit"
                                disabled={applying}
                            >
                                {applying ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Already Applied Message - Only show if job is still posted */}
                {isWorker && hasApplied && job.status === 'posted' && (
                    <div className="applied-card">
                        <span className="applied-icon">✅</span>
                        <div>
                            <h3>Application Submitted</h3>
                            <p>You've already applied for this job</p>
                        </div>
                        <Link to="/dashboard" className="btn-dashboard">
                            Dashboard
                        </Link>
                    </div>
                )}

                {/* Job Already Hired Message - For workers who ARE NOT hired */}
                {isWorker && job.status === 'hired' && job.hired_worker_id !== user?.id && (
                    <div className="job-closed-card">
                        <span className="closed-icon">🔒</span>
                        <div>
                            <h3>Position Filled</h3>
                            <p>This job has already been assigned to another worker</p>
                        </div>
                        <Link to="/jobs" className="btn-browse">
                            Browse Other Jobs
                        </Link>
                    </div>
                )}

                {/* Job Hired Success Message - For workers who ARE hired */}
                {isWorker && job.status === 'hired' && job.hired_worker_id === user?.id && (
                    <div className="job-hired-success-card">
                        <span className="success-icon">🎉</span>
                        <div>
                            <h3>You've Been Hired!</h3>
                            <p>Contact the client using the information above to arrange the job details.</p>
                        </div>
                    </div>
                )}               

                {/* Login Prompt */}
                {!isAuthenticated && (
                    <div className="login-prompt">
                        <p>Want to apply for this job?</p>
                        <Link to="/login" className="btn-login">
                            Sign in to Apply
                        </Link>
                    </div>
                )}
            </div>

            {/* Completion Modal */}
            {showCompletionModal && (
                <div className="modal-overlay" onClick={() => setShowCompletionModal(false)}>
                    <div className="completion-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Complete Job</h2>
                            <button className="modal-close" onClick={() => setShowCompletionModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="worker-summary">
                                <div className="worker-avatar-large">
                                    {getInitials(job.hired_worker?.name)}
                                </div>
                                <div>
                                    <h3>{job.hired_worker?.name}</h3>
                                    <p>Rating: {job.hired_worker?.rating ? Number(job.hired_worker.rating).toFixed(1) : 'New'}</p>
                                    <p>Rate their work</p>
                                </div>
                            </div>

                            <div className="rating-section">
                                <h4>How was their work?</h4>
                                <div className="rating-stars">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${rating >= star ? 'active' : ''}`}
                                            onClick={() => setRating(star)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <div className="rating-labels">
                                    <span>Poor</span>
                                    <span>Fair</span>
                                    <span>Good</span>
                                    <span>Very Good</span>
                                    <span>Excellent</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Review (optional)</label>
                                <textarea
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder="Share your experience..."
                                    rows="4"
                                />
                            </div>

                            <div className="modal-actions">
                                <button 
                                    className="btn-cancel"
                                    onClick={() => setShowCompletionModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-complete"
                                    onClick={() => {
                                        console.log('Confirm Completion clicked');
                                        console.log('Current job:', job);
                                        console.log('Hired worker:', job?.hired_worker);
                                        console.log('Rating:', rating);
                                        console.log('Review:', review);
                                        handleCompleteJob();
                                    }}
                                    disabled={completing}
                                >
                                    {completing ? 'Completing...' : 'Confirm Completion'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credits Modal */}
            {showCreditModal && (
                <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
                    <div className="credit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <h2>Insufficient Credits</h2>
                            <button className="modal-close" onClick={() => setShowCreditModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="credit-icon-large">💳</div>
                            <h3>You need hire credits</h3>
                            <p>Purchase a package to hire workers</p>
                            
                            <div className="modal-actions">
                                <button 
                                    className="btn-cancel"
                                    onClick={() => setShowCreditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-buy"
                                    onClick={handleBuyCredits}
                                >
                                    Buy Credits
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
                    <div className="review-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Leave a Review</h2>
                            <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="worker-summary">
                                <div className="worker-avatar-large">
                                    {getInitials(job.hired_worker?.name)}
                                </div>
                                <div>
                                    <h3>{job.hired_worker?.name}</h3>
                                    <p>How was your experience?</p>
                                </div>
                            </div>

                            <div className="rating-section">
                                <h4>Rate the worker</h4>
                                <div className="rating-stars">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${rating >= star ? 'active' : ''}`}
                                            onClick={() => setRating(star)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Review (optional)</label>
                                <textarea
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder="Share your experience working with this worker..."
                                    rows="4"
                                />
                            </div>

                            <div className="modal-actions">
                                <button 
                                    className="btn-cancel"
                                    onClick={() => setShowReviewModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-submit"
                                    onClick={handleSubmitReview}
                                >
                                    Submit Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default JobDetails;