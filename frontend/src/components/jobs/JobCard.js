// frontend/src/components/jobs/JobCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './JobCard.css';

const JobCard = ({ job }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const getUrgencyColor = (urgency) => {
        switch (urgency) {
            case 'urgent': return '#DC2626';
            case 'high': return '#F97316';
            case 'medium': return '#F59E0B';
            default: return '#10B981';
        }
    };

    // Handle click to ensure scroll to top
    const handleClick = () => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant'
        });
    };

    return (
        <Link to={`/jobs/${job.id}`} className="job-card-link" onClick={handleClick}>
            <div className="job-card">
                {/* Urgency Badge */}
                {job.urgency && job.urgency !== 'low' && (
                    <div 
                        className="urgency-badge"
                        style={{ backgroundColor: getUrgencyColor(job.urgency) }}
                    >
                        {job.urgency === 'urgent' ? '🚨 Urgent' : 
                         job.urgency === 'high' ? '⚡ High' : 
                         job.urgency === 'medium' ? '📋 Medium' : ''}
                    </div>
                )}

                {/* Category */}
                <div className="job-category">
                    <span className="category-icon">
                        {job.category === 'Gardening' && '🌿'}
                        {job.category === 'Cleaning' && '🧹'}
                        {job.category === 'Building' && '🏗️'}
                        {job.category === 'Plumbing' && '🔧'}
                        {job.category === 'Painting' && '🎨'}
                        {job.category === 'Electrical' && '⚡'}
                        {job.category === 'Delivery' && '🚚'}
                        {job.category === 'Moving' && '📦'}
                        {!job.category && '💼'}
                    </span>
                    <span className="category-name">{job.category || 'General'}</span>
                </div>

                {/* Title */}
                <h3 className="job-title">{job.title}</h3>

                {/* Description (truncated) */}
                <p className="job-description">
                    {job.description?.length > 100 
                        ? `${job.description.substring(0, 100)}...` 
                        : job.description}
                </p>

                {/* Details */}
                <div className="job-details">
                    <div className="detail-item">
                        <span className="detail-icon">📍</span>
                        <span>{job.township}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">⏱️</span>
                        <span>{job.estimated_hours || 'Flexible'} hours</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="job-footer">
                    <div className="job-budget">
                        <span className="budget-label">Budget:</span>
                        <span className="budget-amount">
                            R {job.budget_min} - R {job.budget_max}
                        </span>
                    </div>
                    <div className="job-meta">
                        <span className="post-date">{formatDate(job.created_at)}</span>
                        {job.application_count > 0 && (
                            <span className="application-count">
                                {job.application_count} {job.application_count === 1 ? 'application' : 'applications'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Posted by */}
                <div className="job-client">
                    <span className="client-label">Posted by:</span>
                    <span className="client-name">{job.client_name || 'Client'}</span>
                </div>
            </div>
        </Link>
    );
};

export default JobCard;