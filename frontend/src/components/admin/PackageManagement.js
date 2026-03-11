// frontend/src/components/admin/PackageManagement.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './Admin.css';

const PackageManagement = () => {
    const [workerPasses, setWorkerPasses] = useState([]);
    const [clientPackages, setClientPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('worker-passes');
    const alert = useAlert();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [passesRes, packagesRes] = await Promise.all([
                api.get('/admin/worker-passes'),
                api.get('/admin/client-packages')
            ]);
            
            if (passesRes.data.success) setWorkerPasses(passesRes.data.data);
            if (packagesRes.data.success) setClientPackages(packagesRes.data.data);
        } catch (error) {
            console.error('Error loading package data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active': return <span className="badge active">Active</span>;
            case 'expired': return <span className="badge expired">Expired</span>;
            case 'used': return <span className="badge used">Used</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return <div className="loading-spinner">Loading package data...</div>;
    }

    return (
        <div className="management-tab">
            <div className="management-header">
                <h1>📦 Package Management</h1>
                <button className="btn-refresh" onClick={loadData}>
                    🔄 Refresh
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="tab-navigation">
                <button 
                    className={activeTab === 'worker-passes' ? 'active' : ''}
                    onClick={() => setActiveTab('worker-passes')}
                >
                    Worker Passes ({workerPasses.length})
                </button>
                <button 
                    className={activeTab === 'client-packages' ? 'active' : ''}
                    onClick={() => setActiveTab('client-packages')}
                >
                    Client Packages ({clientPackages.length})
                </button>
            </div>

            {activeTab === 'worker-passes' && (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Worker</th>
                                <th>Pass Type</th>
                                <th>Applications</th>
                                <th>Status</th>
                                <th>Valid Until</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workerPasses.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="no-data">No worker passes found</td>
                                </tr>
                            ) : (
                                workerPasses.map(pass => (
                                    <tr key={pass.id}>
                                        <td>{pass.id}</td>
                                        <td>{pass.worker_name || 'Unknown'}</td>
                                        <td>
                                            <span className={`package-type ${pass.pass_type}`}>
                                                {pass.pass_type === 'payg' ? 'Pay-As-You-Go' :
                                                 pass.pass_type === 'monthly' ? 'Monthly' : 'Annual'}
                                            </span>
                                        </td>
                                        <td>
                                            {pass.unlimited ? 'Unlimited' : 
                                             `${pass.applications_remaining}/${pass.total_applications}`}
                                        </td>
                                        <td>{getStatusBadge(pass.status)}</td>
                                        <td>{formatDate(pass.end_date)}</td>
                                        <td>R{pass.amount_paid}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'client-packages' && (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Client</th>
                                <th>Package Type</th>
                                <th>Hires</th>
                                <th>Status</th>
                                <th>Valid Until</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientPackages.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="no-data">No client packages found</td>
                                </tr>
                            ) : (
                                clientPackages.map(pkg => (
                                    <tr key={pkg.id}>
                                        <td>{pkg.id}</td>
                                        <td>{pkg.client_name || 'Unknown'}</td>
                                        <td>
                                            <span className={`package-type ${pkg.package_type}`}>
                                                {pkg.package_type === 'single' ? 'Single Hire' :
                                                 pkg.package_type === 'starter' ? 'Starter Pack' :
                                                 pkg.package_type === 'business' ? 'Business Pack' : 'Unlimited'}
                                            </span>
                                        </td>
                                        <td>
                                            {pkg.unlimited ? 'Unlimited' : 
                                             `${pkg.hires_remaining}/${pkg.total_hires}`}
                                        </td>
                                        <td>{getStatusBadge(pkg.status)}</td>
                                        <td>{formatDate(pkg.valid_until)}</td>
                                        <td>R{pkg.amount_paid}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PackageManagement;