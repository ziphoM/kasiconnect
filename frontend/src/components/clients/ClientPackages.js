// frontend/src/components/clients/ClientPackages.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './ClientPackages.css';

const ClientPackages = () => {
    const { user } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    
    const [selectedPackage, setSelectedPackage] = useState('starter');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const packageOptions = {
        single: {
            name: 'Single Hire',
            price: 75,
            hires: 1,
            description: 'Perfect for one-time jobs',
            icon: '🔨',
            color: '#10B981',
            badge: 'Basic',
            savings: 0
        },
        starter: {
            name: 'Starter Pack',
            price: 350,
            hires: 5,
            description: 'Ideal for small projects',
            icon: '📦',
            color: '#FF6B35',
            badge: '🔥 Popular',
            savings: 25,
            perHire: 70
        },
        business: {
            name: 'Business Pack',
            price: 650,
            hires: 10,
            description: 'Perfect for regular hiring',
            icon: '💼',
            color: '#8B5CF6',
            badge: '✨ Best Value',
            savings: 100,
            perHire: 65
        },
        unlimited: {
            name: 'Unlimited Month',
            price: 1200,
            hires: 'Unlimited',
            description: 'Hire as many workers as you need',
            icon: '🚀',
            color: '#EC4899',
            badge: '⚡ Pro',
            savings: 'Unlimited',
            perHire: 'As low as R50'
        }
    };

    const calculateSavings = () => {
        const pkg = packageOptions[selectedPackage];
        if (selectedPackage === 'single') return '';
        if (selectedPackage === 'unlimited') return 'Unlimited hires for 30 days';
        return `Save R${pkg.savings} compared to single hires`;
    };

    const handlePurchase = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // For demo, only EFT is available
            const response = await api.post('/client/buy-package', {
                package_type: selectedPackage,
                payment_method: 'eft'
            });

            if (response.data.success) {
                setSuccess(`✅ Successfully purchased ${packageOptions[selectedPackage].name}!`);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setError(error.response?.data?.message || 'Failed to purchase package');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="client-packages-container">
            <div className="client-packages-card">
                <div className="packages-header">
                    <h1>💼 Client Hire Packages</h1>
                    <p>Save money when you hire multiple workers</p>
                </div>

                {error && (
                    <div className="packages-error">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="packages-success">
                        <span className="success-icon">✅</span>
                        {success}
                    </div>
                )}

                {/* Package Options Grid */}
                <div className="packages-grid">
                    {/* Single Hire */}
                    <div 
                        className={`package-card ${selectedPackage === 'single' ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage('single')}
                        style={{ borderColor: selectedPackage === 'single' ? packageOptions.single.color : '#E5E7EB' }}
                    >
                        <div className="package-badge">{packageOptions.single.badge}</div>
                        <div className="package-icon" style={{ background: `${packageOptions.single.color}15` }}>
                            <span style={{ color: packageOptions.single.color }}>{packageOptions.single.icon}</span>
                        </div>
                        <h3>{packageOptions.single.name}</h3>
                        <div className="package-price">R{packageOptions.single.price}</div>
                        <div className="package-hires">
                            <strong>{packageOptions.single.hires}</strong> hire
                        </div>
                        <p className="package-description">{packageOptions.single.description}</p>
                        <div className="package-per-hire">
                            R75 per hire
                        </div>
                        <button 
                            className={`package-select-btn ${selectedPackage === 'single' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPackage === 'single' ? packageOptions.single.color : '#F3F4F6',
                                color: selectedPackage === 'single' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPackage === 'single' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>

                    {/* Starter Pack */}
                    <div 
                        className={`package-card popular ${selectedPackage === 'starter' ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage('starter')}
                        style={{ borderColor: selectedPackage === 'starter' ? packageOptions.starter.color : '#E5E7EB' }}
                    >
                        <div className="popular-badge">{packageOptions.starter.badge}</div>
                        <div className="package-icon" style={{ background: `${packageOptions.starter.color}15` }}>
                            <span style={{ color: packageOptions.starter.color }}>{packageOptions.starter.icon}</span>
                        </div>
                        <h3>{packageOptions.starter.name}</h3>
                        <div className="package-price">R{packageOptions.starter.price}</div>
                        <div className="package-hires">
                            <strong>{packageOptions.starter.hires}</strong> hires
                        </div>
                        <div className="package-savings-badge">Save R{packageOptions.starter.savings}</div>
                        <p className="package-description">{packageOptions.starter.description}</p>
                        <div className="package-per-hire">
                            R{packageOptions.starter.perHire} per hire
                        </div>
                        <button 
                            className={`package-select-btn ${selectedPackage === 'starter' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPackage === 'starter' ? packageOptions.starter.color : '#F3F4F6',
                                color: selectedPackage === 'starter' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPackage === 'starter' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>

                    {/* Business Pack */}
                    <div 
                        className={`package-card ${selectedPackage === 'business' ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage('business')}
                        style={{ borderColor: selectedPackage === 'business' ? packageOptions.business.color : '#E5E7EB' }}
                    >
                        <div className="package-badge">{packageOptions.business.badge}</div>
                        <div className="package-icon" style={{ background: `${packageOptions.business.color}15` }}>
                            <span style={{ color: packageOptions.business.color }}>{packageOptions.business.icon}</span>
                        </div>
                        <h3>{packageOptions.business.name}</h3>
                        <div className="package-price">R{packageOptions.business.price}</div>
                        <div className="package-hires">
                            <strong>{packageOptions.business.hires}</strong> hires
                        </div>
                        <div className="package-savings-badge">Save R{packageOptions.business.savings}</div>
                        <p className="package-description">{packageOptions.business.description}</p>
                        <div className="package-per-hire">
                            R{packageOptions.business.perHire} per hire
                        </div>
                        <button 
                            className={`package-select-btn ${selectedPackage === 'business' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPackage === 'business' ? packageOptions.business.color : '#F3F4F6',
                                color: selectedPackage === 'business' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPackage === 'business' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>

                    {/* Unlimited Month */}
                    <div 
                        className={`package-card ${selectedPackage === 'unlimited' ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage('unlimited')}
                        style={{ borderColor: selectedPackage === 'unlimited' ? packageOptions.unlimited.color : '#E5E7EB' }}
                    >
                        <div className="package-badge">{packageOptions.unlimited.badge}</div>
                        <div className="package-icon" style={{ background: `${packageOptions.unlimited.color}15` }}>
                            <span style={{ color: packageOptions.unlimited.color }}>{packageOptions.unlimited.icon}</span>
                        </div>
                        <h3>{packageOptions.unlimited.name}</h3>
                        <div className="package-price">R{packageOptions.unlimited.price}</div>
                        <div className="package-hires">
                            <strong>{packageOptions.unlimited.hires}</strong> hires
                        </div>
                        <div className="package-savings-badge">Best Value</div>
                        <p className="package-description">{packageOptions.unlimited.description}</p>
                        <div className="package-per-hire">
                            {packageOptions.unlimited.perHire}
                        </div>
                        <button 
                            className={`package-select-btn ${selectedPackage === 'unlimited' ? 'selected' : ''}`}
                            style={{ 
                                background: selectedPackage === 'unlimited' ? packageOptions.unlimited.color : '#F3F4F6',
                                color: selectedPackage === 'unlimited' ? 'white' : '#4B5563'
                            }}
                        >
                            {selectedPackage === 'unlimited' ? '✓ Selected' : 'Select'}
                        </button>
                    </div>
                </div>

                {/* Package Comparison Table */}
                <div className="comparison-table">
                    <h3>Compare Packages</h3>
                    <table className="package-comparison">
                        <thead>
                            <tr>
                                <th>Package</th>
                                <th>Price</th>
                                <th>Hires Included</th>
                                <th>Cost Per Hire</th>
                                <th>Savings</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className={selectedPackage === 'single' ? 'highlight' : ''}>
                                <td>Single Hire</td>
                                <td>R75</td>
                                <td>1</td>
                                <td>R75</td>
                                <td>-</td>
                            </tr>
                            <tr className={selectedPackage === 'starter' ? 'highlight' : ''}>
                                <td>Starter Pack</td>
                                <td>R350</td>
                                <td>5</td>
                                <td>R70</td>
                                <td>Save R25</td>
                            </tr>
                            <tr className={selectedPackage === 'business' ? 'highlight' : ''}>
                                <td>Business Pack</td>
                                <td>R650</td>
                                <td>10</td>
                                <td>R65</td>
                                <td>Save R100</td>
                            </tr>
                            <tr className={selectedPackage === 'unlimited' ? 'highlight' : ''}>
                                <td>Unlimited Month</td>
                                <td>R1200</td>
                                <td>Unlimited</td>
                                <td>As low as R50</td>
                                <td>Best Value</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Selected Package Summary */}
                <div className="selected-package-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                        <span>Selected Package:</span>
                        <strong>{packageOptions[selectedPackage].name}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Hires Included:</span>
                        <strong>{packageOptions[selectedPackage].hires}</strong>
                    </div>
                    {selectedPackage !== 'single' && selectedPackage !== 'unlimited' && (
                        <div className="summary-row savings">
                            <span>You Save:</span>
                            <strong className="save-amount">R{packageOptions[selectedPackage].savings}</strong>
                        </div>
                    )}
                    {selectedPackage === 'unlimited' && (
                        <div className="summary-row savings">
                            <span>Value:</span>
                            <strong className="save-amount">Unlimited hires for 30 days</strong>
                        </div>
                    )}
                    <div className="summary-row total">
                        <span>Total:</span>
                        <strong className="total-amount">R{packageOptions[selectedPackage].price}</strong>
                    </div>
                    {calculateSavings() && (
                        <div className="savings-message">
                            💡 {calculateSavings()}
                        </div>
                    )}
                </div>

                {/* Payment Section - Demo Only */}
                <div className="payment-section-demo">
                    <h4>Payment Method (Demo Mode)</h4>
                    <div className="payment-info-demo">
                        <div className="eft-demo-info">
                            <span className="demo-icon">🏦</span>
                            <div>
                                <strong>EFT / Bank Transfer</strong>
                                <p>For demonstration purposes, only EFT is available</p>
                            </div>
                        </div>
                        <div className="bank-details-demo">
                            <p><strong>Bank:</strong> FNB</p>
                            <p><strong>Account Name:</strong> KasiConnect (Pty) Ltd</p>
                            <p><strong>Account Number:</strong> 62849512678</p>
                            <p><strong>Reference:</strong> CLIENT-{Date.now()}</p>
                        </div>
                        <div className="demo-notice">
                            ⚡ This is a demo. No actual payment will be processed.
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="purchase-actions">
                    <button className="btn-cancel" onClick={() => navigate('/dashboard')}>
                        Cancel
                    </button>
                    <button 
                        className="btn-purchase-package"
                        onClick={handlePurchase}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : `Purchase for R${packageOptions[selectedPackage].price}`}
                    </button>
                </div>

                {/* Trust Badges */}
                <div className="trust-badges">
                    <div className="trust-badge">
                        <span>🔒</span>
                        <span>Secure Payment</span>
                    </div>
                    <div className="trust-badge">
                        <span>⚡</span>
                        <span>Instant Access</span>
                    </div>
                    <div className="trust-badge">
                        <span>💯</span>
                        <span>Hires Never Expire*</span>
                    </div>
                </div>
                <p className="fine-print">*Unlimited month package hires must be used within 30 days</p>
            </div>
        </div>
    );
};

export default ClientPackages;