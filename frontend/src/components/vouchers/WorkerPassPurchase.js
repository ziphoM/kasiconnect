// frontend/src/components/vouchers/WorkerPassPurchase.js
import React, { useState, useEffect } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './WorkerPassPurchase.css';

const WorkerPassPurchase = () => {
    const { user } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedPass, setSelectedPass] = useState('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
   

    const passOptions = {
        payg: {
            name: 'Pay-As-You-Go',
            price: 5,
            applications: 1,
            description: 'Single job application',
            icon: '🎫',
            color: '#10B981'
        },
        monthly: {
            name: 'Monthly Pass',
            price: 50,
            applications: 30,
            description: '30 applications over 30 days',
            icon: '📅',
            color: '#667EEA'
        },
        annual: {
            name: 'Annual Pass',
            price: 360,
            applications: 'Unlimited',
            description: 'Unlimited applications for a full year',
            icon: '🌟',
            color: '#8B5CF6'
        }
    };

    const handlePurchase = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/worker/buy-application-pass', {
                pass_type: selectedPass,
                payment_method: 'eft'
            });

            if (response.data.success) {
                setSuccess(`✅ Successfully purchased ${passOptions[selectedPass].name}!`);
                
                // Check if there's a pending job application
                const pendingApp = sessionStorage.getItem('pendingJobApplication');
                
                if (pendingApp) {
                    const pendingData = JSON.parse(pendingApp);
                    // Clear the pending data
                    sessionStorage.removeItem('pendingJobApplication');
                    
                    // Redirect back to the job with a success message
                    setTimeout(() => {
                        navigate(pendingData.returnTo || '/dashboard', {
                            state: { 
                                passPurchased: true,
                                message: 'Your pass has been purchased! You can now apply for the job.'
                            }
                        });
                    }, 2000);
                } else {
                    // No pending job, go to dashboard
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setError(error.response?.data?.message || 'Failed to purchase pass');
        } finally {
            setLoading(false);
        }
    };

    // Update the cancel button to handle pending applications
    const handleCancel = () => {
        const pendingApp = sessionStorage.getItem('pendingJobApplication');
        if (pendingApp) {
            const pendingData = JSON.parse(pendingApp);
            // Ask if they want to return to the job
            alert.confirm(
                'Return to the job you were applying for?',
                () => {
                    sessionStorage.removeItem('pendingJobApplication');
                    navigate(pendingData.returnTo);
                },
                () => navigate('/dashboard'),
                'Cancel Purchase',
                'Return to Job',
                'Go to Dashboard'
            );
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="pass-container">
            <div className="pass-card">
                <div className="pass-header">
                    <h1>🎫 Worker Application Passes</h1>
                    <p>Choose the perfect plan to start applying for jobs</p>
                </div>

                {error && (
                    <div className="pass-error">
                        <span>⚠️</span>
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="pass-success">
                        <span>✅</span>
                        {success}
                    </div>
                )}

                <div className="pass-grid">
                    {/* Pay-As-You-Go */}
                    <div 
                        className={`pass-item ${selectedPass === 'payg' ? 'selected' : ''}`}
                        onClick={() => setSelectedPass('payg')}
                    >
                        <span className="pass-badge">Flexible</span>
                        <div className="pass-icon">{passOptions.payg.icon}</div>
                        <h3>{passOptions.payg.name}</h3>
                        <div className="pass-price">R{passOptions.payg.price}</div>
                        <div className="pass-apps">{passOptions.payg.applications} application</div>
                        <p className="pass-desc">{passOptions.payg.description}</p>
                        <button 
                            className={`pass-select-btn ${selectedPass === 'payg' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPass === 'payg' ? passOptions.payg.color : '#F3F4F6',
                                color: selectedPass === 'payg' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPass === 'payg' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>

                    {/* Monthly Pass */}
                    <div 
                        className={`pass-item popular ${selectedPass === 'monthly' ? 'selected' : ''}`}
                        onClick={() => setSelectedPass('monthly')}
                    >
                        <span className="popular-badge">🔥 MOST POPULAR</span>
                        <div className="pass-icon">{passOptions.monthly.icon}</div>
                        <h3>{passOptions.monthly.name}</h3>
                        <div className="pass-price">R{passOptions.monthly.price}</div>
                        <div className="pass-apps">{passOptions.monthly.applications} applications</div>
                        <p className="pass-desc">{passOptions.monthly.description}</p>
                        <button 
                            className={`pass-select-btn ${selectedPass === 'monthly' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPass === 'monthly' ? passOptions.monthly.color : '#F3F4F6',
                                color: selectedPass === 'monthly' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPass === 'monthly' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>

                    {/* Annual Pass */}
                    <div 
                        className={`pass-item ${selectedPass === 'annual' ? 'selected' : ''}`}
                        onClick={() => setSelectedPass('annual')}
                    >
                        <span className="pass-badge">✨ Best Value</span>
                        <div className="pass-icon">{passOptions.annual.icon}</div>
                        <h3>{passOptions.annual.name}</h3>
                        <div className="pass-price">R{passOptions.annual.price}</div>
                        <div className="pass-apps">{passOptions.annual.applications} applications</div>
                        <span className="pass-savings">Save R240</span>
                        <p className="pass-desc">{passOptions.annual.description}</p>
                        <button 
                            className={`pass-select-btn ${selectedPass === 'annual' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPass === 'annual' ? passOptions.annual.color : '#F3F4F6',
                                color: selectedPass === 'annual' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPass === 'annual' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>
                </div>

                <div className="summary-box">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                        <span>Selected Pass:</span>
                        <strong>{passOptions[selectedPass].name}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Applications:</span>
                        <strong>{passOptions[selectedPass].applications}</strong>
                    </div>
                    {selectedPass === 'annual' && (
                        <div className="summary-row">
                            <span>You Save:</span>
                            <strong className="summary-savings">R240</strong>
                        </div>
                    )}
                    <div className="summary-row total">
                        <span>Total:</span>
                        <strong className="summary-total">R{passOptions[selectedPass].price}</strong>
                    </div>
                </div>

                <div className="payment-box">
                    <h4>Payment Method (Demo Mode)</h4>
                    <div className="payment-info">
                        <div className="payment-demo">
                            <div className="payment-icon">🏦</div>
                            <div>
                                <strong>EFT / Bank Transfer</strong>
                                <p>For demonstration purposes, only EFT is available</p>
                            </div>
                        </div>
                        <div className="bank-details">
                            <p><strong>Bank:</strong> FNB</p>
                            <p><strong>Account:</strong> KasiConnect (Pty) Ltd</p>
                            <p><strong>Account Number:</strong> 62849512678</p>
                            <p><strong>Reference:</strong> PASS-{Date.now()}</p>
                        </div>
                    </div>
                </div>

            <div className="action-buttons">
                <button className="btn-cancel" onClick={handleCancel}>
                    Cancel
                </button>
                <button 
                    className="btn-pay"
                    onClick={handlePurchase}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : `Pay R${passOptions[selectedPass].price}`}
                </button>
            </div>

                <div className="trust-badges">
                    <div className="trust-item">
                        <span>🔒</span>
                        <span>Secure Payment</span>
                    </div>
                    <div className="trust-item">
                        <span>⚡</span>
                        <span>Instant Access</span>
                    </div>
                    <div className="trust-item">
                        <span>💯</span>
                        <span>Satisfaction Guaranteed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerPassPurchase;