// frontend/src/components/workers/ProfileCompletionWidget.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ProfileCompletionWidget.css';

const ProfileCompletionWidget = () => {
    const { user } = useAuth();
    const [percentage, setPercentage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [missingFields, setMissingFields] = useState([]);
    const [showTips, setShowTips] = useState(false);

    useEffect(() => {
        if (user?.user_type === 'worker') {
            fetchProfileCompletion();
        }
    }, [user]);

    const fetchProfileCompletion = async () => {
        try {
            const response = await api.get('/worker/profile-completion');
            if (response.data.success) {
                setPercentage(response.data.data.percentage);
                setMissingFields(response.data.data.missing_fields || []);
            }
        } catch (error) {
            console.error('Error fetching profile completion:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate circle properties
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Benefits of completing profile
    const benefits = [
        { icon: '🎯', text: 'Get hired 3x faster', color: '#10B981' },
        { icon: '💰', text: 'Earn up to 40% more per job', color: '#F59E0B' },
        { icon: '⭐', text: 'Appear in top search results', color: '#8B5CF6' },
        { icon: '🔝', text: 'Get featured to more clients', color: '#FF6B35' }
    ];

    if (loading) {
        return (
            <div className="profile-completion-widget loading">
                <div className="spinner-small"></div>
            </div>
        );
    }

    return (
        <div className="profile-completion-widget">
            <div className="completion-header">
                <h3>
                    <i className="fas fa-chart-pie"></i>
                    Profile Strength
                </h3>
                <button 
                    className="tips-toggle"
                    onClick={() => setShowTips(!showTips)}
                    aria-label="Toggle tips"
                    title="Why complete your profile?"
                >
                    <i className="fas fa-question-circle"></i>
                </button>
            </div>

            <div className="completion-content">
                <div className="completion-circle-container">
                    <svg className="completion-circle" width="100" height="100" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="8"
                        />
                        
                        {/* Progress circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={percentage >= 80 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#FF6B35'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                        
                        {/* Percentage text */}
                        <text
                            x="50"
                            y="50"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="percentage-text"
                            fill={percentage >= 80 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#FF6B35'}
                        >
                            {percentage}%
                        </text>
                    </svg>
                </div>

                <div className="completion-message">
                    <p className="completion-title">
                        <strong>Your profile is {percentage}% complete</strong>
                    </p>
                    
                    {/* SINGLE EDIT PROFILE BUTTON - Only one button for all cases */}
                    <Link to="/worker/profile" className="edit-profile-btn">
                        <i className="fas fa-pen"></i>
                        {percentage === 100 ? 'View Profile' : 'Complete Profile'}
                    </Link>
                </div>
            </div>

            {percentage === 100 ? (
                <div className="perfect-profile">
                    <i className="fas fa-crown perfect-icon"></i>
                    <div className="perfect-text">
                        <strong>Perfect Profile!</strong>
                        <span>You're visible to all clients</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Benefits Grid */}
                    <div className="benefits-grid">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="benefit-item">
                                <span className="benefit-icon" style={{ background: `${benefit.color}20`, color: benefit.color }}>
                                    {benefit.icon}
                                </span>
                                <span className="benefit-text">{benefit.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Missing Fields Tips */}
                    {showTips && missingFields.length > 0 && (
                        <div className="missing-fields-tips">
                            <h4>
                                <i className="fas fa-lightbulb"></i>
                                Complete these to boost your profile:
                            </h4>
                            <ul className="tips-list">
                                {missingFields.map((field, index) => (
                                    <li key={index} className="tip-item">
                                        <i className="fas fa-arrow-right"></i>
                                        <span>{field}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="tip-note">
                                <i className="fas fa-chart-line"></i>
                                <span>Profiles with all fields get 5x more views!</span>
                            </div>
                        </div>
                    )}

                    {!showTips && missingFields.length > 0 && (
                        <button 
                            className="show-tips-btn"
                            onClick={() => setShowTips(true)}
                        >
                            <i className="fas fa-chevron-down"></i>
                            Show what's missing
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfileCompletionWidget;