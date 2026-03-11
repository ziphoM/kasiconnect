// frontend/src/components/clients/ClientPackagesDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import './ClientPackagesDashboard.css';

const ClientPackagesDashboard = () => {
    const { user } = useAuth();
    const alert = useAlert();
    const navigate = useNavigate();
    
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        total_packages: 0,
        active_packages: 0,
        total_hires_remaining: 0,
        total_spent: 0
    });

    useEffect(() => {
        loadPackages();
    }, []);

    const loadPackages = async () => {
        setLoading(true);
        try {
            const response = await api.get('/client/my-packages');
            if (response.data.success) {
                setPackages(response.data.data.packages);
                setStats(response.data.data.stats);
            }
        } catch (error) {
            console.error('Error loading packages:', error);
            setError('Failed to load packages');
        } finally {
            setLoading(false);
        }
    };

    const getPackageIcon = (type) => {
        switch(type) {
            case 'single': return '🔨';
            case 'starter': return '📦';
            case 'business': return '💼';
            case 'unlimited': return '🚀';
            default: return '🎫';
        }
    };

    const getPackageColor = (type) => {
        switch(type) {
            case 'single': return '#10B981';
            case 'starter': return '#F59E0B';
            case 'business': return '#3B82F6';
            case 'unlimited': return '#8B5CF6';
            default: return '#6B7280';
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active':
                return <span className="status-badge active">✅ Active</span>;
            case 'expired':
                return <span className="status-badge expired">⏰ Expired</span>;
            case 'used':
                return <span className="status-badge used">✓ Used</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '0.00';
        
        // Convert to number if it's a string
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        // Check if it's a valid number
        if (isNaN(numAmount)) return '0.00';
        
        // Format with 2 decimal places and thousands separator
        return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    if (loading) {
        return (
            <div className="packages-loading">
                <div className="loading-spinner"></div>
                <p>Loading your packages...</p>
            </div>
        );
    }

    return (
        <div className="client-packages-dashboard">
            <div className="packages-header">
                <div>
                    <h1>My Hire Packages</h1>
                    <p>Manage your active packages and view hiring credits</p>
                </div>
                <Link to="/client/packages" className="btn-buy-package">
                    + Buy New Package
                </Link>
            </div>

            {error && (
                <div className="packages-error">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            {/* Stats Overview - FIXED */}
            <div className="packages-stats">
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total_packages}</span>
                        <span className="stat-label">Total Packages</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active_packages}</span>
                        <span className="stat-label">Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💼</div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {stats.total_hires_remaining === 'Unlimited' ? '∞' : stats.total_hires_remaining}
                        </span>
                        <span className="stat-label">Hires Left</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <span className="stat-value">R {formatCurrency(stats.total_spent)}</span>
                        <span className="stat-label">Total Spent</span>
                    </div>
                </div>
            </div>

            {/* Active Packages Section */}
            <div className="packages-section">
                <h2>Active Packages</h2>
                {packages.filter(p => p.status === 'active').length === 0 ? (
                    <div className="no-active-packages">
                        <div className="no-packages-icon">📭</div>
                        <h3>No active packages</h3>
                        <p>Buy a package to start hiring workers</p>
                        <Link to="/client/packages" className="btn-primary">
                            Browse Packages
                        </Link>
                    </div>
                ) : (
                    <div className="packages-grid">
                        {packages.filter(p => p.status === 'active').map(pkg => (
                            <div 
                                key={pkg.id} 
                                className="package-card active"
                                style={{ borderTopColor: getPackageColor(pkg.package_type) }}
                            >
                                <div className="package-icon" style={{ background: `${getPackageColor(pkg.package_type)}15` }}>
                                    <span style={{ color: getPackageColor(pkg.package_type) }}>
                                        {getPackageIcon(pkg.package_type)}
                                    </span>
                                </div>
                                
                                <div className="package-header">
                                    <h3>
                                        {pkg.package_type === 'single' ? 'Single Hire' :
                                         pkg.package_type === 'starter' ? 'Starter Pack' :
                                         pkg.package_type === 'business' ? 'Business Pack' : 'Unlimited Month'}
                                    </h3>
                                    {getStatusBadge(pkg.status)}
                                </div>

                                <div className="package-details">
                                    <div className="detail-row">
                                        <span>Hires Remaining:</span>
                                        <strong className="hires-count">
                                            {pkg.unlimited ? '♾️ Unlimited' : pkg.hires_remaining}
                                        </strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Total Hires:</span>
                                        <strong>{pkg.unlimited ? 'Unlimited' : pkg.total_hires}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Amount Paid:</span>
                                        <strong>R {formatCurrency(pkg.amount_paid)}</strong>
                                    </div>
                                </div>

                                <div className="progress-section">
                                    {!pkg.unlimited && (
                                        <>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill"
                                                    style={{ 
                                                        width: `${((pkg.total_hires - pkg.hires_remaining) / pkg.total_hires) * 100}%`,
                                                        background: getPackageColor(pkg.package_type)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="progress-stats">
                                                <span>{pkg.total_hires - pkg.hires_remaining} used</span>
                                                <span>{pkg.hires_remaining} left</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="package-footer">
                                    <Link to="/jobs" className="btn-use-package">
                                        Hire Worker →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Package History Section */}
            {packages.filter(p => p.status !== 'active').length > 0 && (
                <div className="packages-section history">
                    <h2>Package History</h2>
                    <div className="packages-grid history">
                        {packages.filter(p => p.status !== 'active').map(pkg => (
                            <div key={pkg.id} className="package-card history">
                                <div className="package-header">
                                    <h4>
                                        {pkg.package_type === 'single' ? 'Single Hire' :
                                         pkg.package_type === 'starter' ? 'Starter Pack' :
                                         pkg.package_type === 'business' ? 'Business Pack' : 'Unlimited Month'}
                                    </h4>
                                    {getStatusBadge(pkg.status)}
                                </div>
                                <div className="package-details compact">
                                    <p>Purchased: {formatDate(pkg.created_at)}</p>
                                    <p>Amount: R {formatCurrency(pkg.amount_paid)}</p>
                                    {pkg.valid_until && (
                                        <p>Expired: {formatDate(pkg.valid_until)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="packages-info">
                <h3>💡 How Hiring Packages Work</h3>
                <div className="info-grid">
                    <div className="info-card">
                        <span className="info-icon">1️⃣</span>
                        <h4>Buy a Package</h4>
                        <p>Choose from Single, Starter, Business, or Unlimited plans</p>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">2️⃣</span>
                        <h4>Post Jobs</h4>
                        <p>Post jobs for free and receive applications</p>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">3️⃣</span>
                        <h4>Hire Workers</h4>
                        <p>Use your package credits to hire workers</p>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">4️⃣</span>
                        <h4>Track Usage</h4>
                        <p>Monitor your remaining hires here</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientPackagesDashboard;