// frontend/src/components/admin/ReportsAnalytics.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const ReportsAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('month');
    const [reportData, setReportData] = useState(null);
    const [exportFormat, setExportFormat] = useState('csv');
    const [exportType, setExportType] = useState('users');

    useEffect(() => {
        loadReportData();
    }, [dateRange]);

    const loadReportData = async () => {
        setLoading(true);
        setError('');
        try {
            console.log(`📊 Loading ${dateRange} report data...`);
            const response = await api.get(`/admin/reports?range=${dateRange}`);
            
            if (response.data.success) {
                console.log('✅ Report data loaded:', response.data.data);
                setReportData(response.data.data);
            } else {
                setError('Failed to load report data');
            }
        } catch (error) {
            console.error('❌ Error loading report data:', error);
            setError('Failed to load report data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            console.log(`📥 Exporting ${exportType} data as ${exportFormat}...`);
            
            const response = await api.get(`/admin/export?format=${exportFormat}&type=${exportType}&range=${dateRange}`, {
                responseType: exportFormat === 'csv' ? 'blob' : 'json'
            });
            
            if (exportFormat === 'csv') {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `export-${exportType}-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                const dataStr = JSON.stringify(response.data, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const link = document.createElement('a');
                link.href = dataUri;
                link.setAttribute('download', `export-${exportType}-${dateRange}-${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            
            alert(`✅ Export completed successfully!`);
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    // Safe number formatting functions
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'R0';
        const num = Number(amount);
        return isNaN(num) ? 'R0' : `R${num.toLocaleString()}`;
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        const parsed = Number(num);
        return isNaN(parsed) ? '0' : parsed.toLocaleString();
    };

    const formatDecimal = (num, decimals = 0) => {
        if (num === null || num === undefined) return '0';
        const parsed = Number(num);
        return isNaN(parsed) ? '0' : parsed.toFixed(decimals);
    };

    const getRangeLabel = () => {
        switch(dateRange) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'quarter': return 'This Quarter';
            case 'year': return 'This Year';
            default: return 'All Time';
        }
    };

    if (loading) {
        return (
            <div className="reports-tab">
                <div className="loading-container">
                    <div className="loading-spinner">Loading reports data...</div>
                </div>
            </div>
        );
    }

    const summary = reportData?.summary || {};
    const userGrowth = reportData?.user_growth || [];
    const jobTrends = reportData?.job_trends || [];
    const revenue = reportData?.revenue || [];
    const passSales = reportData?.pass_sales || [];
    const packageSales = reportData?.package_sales || [];
    const hireActivity = reportData?.hire_activity || [];
    const categories = reportData?.categories || [];
    const workers = reportData?.workers || [];
    const clients = reportData?.clients || [];
    const peakHours = reportData?.peak_hours || [];
    const townshipPerformance = reportData?.township_performance || [];

    return (
        <div className="reports-tab">
            <div className="management-header">
                <h1>📈 Reports & Analytics</h1>
                <div className="report-actions">
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        className="range-select"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                    
                    <select 
                        value={exportType} 
                        onChange={(e) => setExportType(e.target.value)}
                        className="type-select"
                    >
                        <option value="users">Users</option>
                        <option value="jobs">Jobs</option>
                        <option value="hires">Hires</option>
                        <option value="passes">Worker Passes</option>
                        <option value="packages">Client Packages</option>
                    </select>
                    
                    <select 
                        value={exportFormat} 
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="format-select"
                    >
                        <option value="csv">CSV</option>
                        <option value="excel">Excel (JSON)</option>
                        <option value="pdf">PDF (HTML)</option>
                    </select>
                    
                    <button className="btn-export" onClick={handleExport}>
                        📥 Export
                    </button>
                    
                    <button className="btn-refresh" onClick={loadReportData}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <span className="summary-icon">📅</span>
                    <div className="summary-info">
                        <span className="summary-label">Report Period</span>
                        <span className="summary-value">{getRangeLabel()}</span>
                    </div>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">⏱️</span>
                    <div className="summary-info">
                        <span className="summary-label">Generated</span>
                        <span className="summary-value">
                            {summary.generated_at ? new Date(summary.generated_at).toLocaleString() : 'N/A'}
                        </span>
                    </div>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">👥</span>
                    <div className="summary-info">
                        <span className="summary-label">New Users</span>
                        <span className="summary-value">{formatNumber(summary.new_users)}</span>
                    </div>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">💼</span>
                    <div className="summary-info">
                        <span className="summary-label">Total Hires</span>
                        <span className="summary-value">{formatNumber(summary.total_hires)}</span>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <h3>User Growth</h3>
                    <div className="metric-big">
                        {formatNumber(userGrowth.reduce((acc, d) => acc + (d.new_users || 0), 0))}
                    </div>
                    <div className="metric-sub">New Users</div>
                    <div className="metric-breakdown">
                        <span>👷 Workers: {formatNumber(userGrowth.reduce((acc, d) => acc + (d.new_workers || 0), 0))}</span>
                        <span>🏠 Clients: {formatNumber(userGrowth.reduce((acc, d) => acc + (d.new_clients || 0), 0))}</span>
                    </div>
                </div>

                <div className="metric-card">
                    <h3>Job Activity</h3>
                    <div className="metric-big">
                        {formatNumber(jobTrends.reduce((acc, d) => acc + (d.total_jobs || 0), 0))}
                    </div>
                    <div className="metric-sub">Total Jobs</div>
                    <div className="metric-breakdown">
                        <span>✅ Hired: {formatNumber(hireActivity.reduce((acc, d) => acc + (d.total_hires || 0), 0))}</span>
                        <span>⚡ Urgent: {formatNumber(jobTrends.reduce((acc, d) => acc + (d.urgent_jobs || 0), 0))}</span>
                    </div>
                </div>

                <div className="metric-card">
                    <h3>Revenue</h3>
                    <div className="metric-big">
                        {formatCurrency(revenue.reduce((acc, d) => acc + (d.total_revenue || 0), 0))}
                    </div>
                    <div className="metric-sub">Total Revenue</div>
                    <div className="metric-breakdown">
                        <span>👷 Worker Passes: {formatCurrency(revenue.reduce((acc, d) => acc + (d.worker_revenue || 0), 0))}</span>
                        <span>🏢 Client Packages: {formatCurrency(revenue.reduce((acc, d) => acc + (d.client_revenue || 0), 0))}</span>
                    </div>
                </div>
            </div>

            {/* User Growth Chart */}
            {userGrowth.length > 0 && (
                <div className="report-card">
                    <h3>User Growth Over Time</h3>
                    <div className="chart-container">
                        <div className="bar-chart">
                            {userGrowth.map((item, index) => (
                                <div key={index} className="bar-group">
                                    <div className="bar-stack">
                                        <div 
                                            className="bar workers-bar" 
                                            style={{ height: `${Math.min((item.new_workers || 0) * 5, 100)}px` }}
                                            title={`Workers: ${item.new_workers || 0}`}
                                        ></div>
                                        <div 
                                            className="bar clients-bar" 
                                            style={{ height: `${Math.min((item.new_clients || 0) * 5, 100)}px` }}
                                            title={`Clients: ${item.new_clients || 0}`}
                                        ></div>
                                    </div>
                                    <span className="bar-label">{item.period || 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="chart-legend">
                            <span className="legend-item workers">👷 Workers</span>
                            <span className="legend-item clients">🏠 Clients</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Package Sales Overview */}
            {(passSales.length > 0 || packageSales.length > 0) && (
                <div className="report-card">
                    <h3>Package Sales Overview</h3>
                    <div className="package-sales-grid">
                        {passSales.length > 0 && (
                            <div className="sales-section">
                                <h4>Worker Passes</h4>
                                {passSales.map((item, index) => (
                                    <div key={index} className="sales-item">
                                        <span className="sales-type">
                                            {item.pass_type === 'payg' ? '🎫 Pay-As-You-Go' :
                                             item.pass_type === 'monthly' ? '📅 Monthly' : '🌟 Annual'}
                                        </span>
                                        <span className="sales-count">{item.count} sold</span>
                                        <span className="sales-total">{formatCurrency(item.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {packageSales.length > 0 && (
                            <div className="sales-section">
                                <h4>Client Packages</h4>
                                {packageSales.map((item, index) => (
                                    <div key={index} className="sales-item">
                                        <span className="sales-type">
                                            {item.package_type === 'single' ? '🔨 Single Hire' :
                                             item.package_type === 'starter' ? '📦 Starter Pack' :
                                             item.package_type === 'business' ? '💼 Business Pack' : '🚀 Unlimited'}
                                        </span>
                                        <span className="sales-count">{item.count} sold</span>
                                        <span className="sales-total">{formatCurrency(item.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Revenue Chart */}
            {revenue.length > 0 && (
                <div className="report-card">
                    <h3>Revenue Trend</h3>
                    <div className="chart-container">
                        <div className="line-chart">
                            {revenue.map((item, index) => {
                                const maxRevenue = Math.max(...revenue.map(r => r.total_revenue || 0));
                                const height = maxRevenue > 0 ? ((item.total_revenue || 0) / maxRevenue) * 150 : 0;
                                return (
                                    <div key={index} className="data-point-group">
                                        <div 
                                            className="data-point" 
                                            style={{ bottom: `${height}px` }}
                                            title={`R${item.total_revenue || 0}`}
                                        >
                                            <span className="point-value">R{item.total_revenue || 0}</span>
                                        </div>
                                        <span className="point-label">{item.period || 'N/A'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Performance */}
            {categories.length > 0 && (
                <div className="report-card">
                    <h3>Category Performance</h3>
                    <div className="categories-table">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Total Jobs</th>
                                    <th>Hired</th>
                                    <th>Hire Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, index) => {
                                    const totalJobs = cat.total_jobs || 0;
                                    const hired = cat.hired_jobs || 0;
                                    const hireRate = totalJobs > 0 ? (hired / totalJobs) * 100 : 0;
                                    
                                    return (
                                        <tr key={index}>
                                            <td><strong>{cat.category || 'N/A'}</strong></td>
                                            <td>{formatNumber(totalJobs)}</td>
                                            <td>{formatNumber(hired)}</td>
                                            <td>
                                                <div className="progress-bar-small">
                                                    <div 
                                                        className="progress-fill" 
                                                        style={{ width: `${hireRate}%` }}
                                                    ></div>
                                                    <span>{hireRate.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Workers */}
            {workers.length > 0 && (
                <div className="report-card">
                    <h3>Top Performing Workers</h3>
                    <div className="workers-table">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Worker</th>
                                    <th>Township</th>
                                    <th>Primary Skill</th>
                                    <th>Rating</th>
                                    <th>Total Hires</th>
                                    <th>Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.slice(0, 10).map((worker, index) => (
                                    <tr key={index}>
                                        <td><strong>{worker.name || 'N/A'}</strong></td>
                                        <td>{worker.township || 'N/A'}</td>
                                        <td>{worker.primary_skill || 'N/A'}</td>
                                        <td>
                                            <span className="rating-value">
                                                {worker.rating ? Number(worker.rating).toFixed(1) : '0.0'} ⭐
                                            </span>
                                        </td>
                                        <td>{formatNumber(worker.total_hires)}</td>
                                        <td>{formatNumber(worker.completed_hires)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Peak Hours */}
            {peakHours.length > 0 && (
                <div className="report-card half-width">
                    <h3>Peak Activity Hours</h3>
                    <div className="hours-chart">
                        {peakHours.map((hour, index) => {
                            const maxHires = Math.max(...peakHours.map(h => h.hire_count || 0));
                            const width = maxHires > 0 ? ((hour.hire_count || 0) / maxHires) * 100 : 0;
                            
                            return (
                                <div key={index} className="hour-row">
                                    <span className="hour-label">{hour.hour || 0}:00</span>
                                    <div className="hour-bar-container">
                                        <div 
                                            className="hour-bar" 
                                            style={{ width: `${width}%` }}
                                        >
                                            <span className="hour-count">{hour.hire_count || 0} hires</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Township Performance */}
            {townshipPerformance.length > 0 && (
                <div className="report-card half-width">
                    <h3>Township Performance</h3>
                    <div className="township-list">
                        {townshipPerformance.map((town, index) => (
                            <div key={index} className="township-stat">
                                <div className="township-header">
                                    <span className="township-name">{town.township || 'N/A'}</span>
                                    <span className="township-rate">{town.hire_rate?.toFixed(1) || '0'}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${town.hire_rate || 0}%` }}
                                    ></div>
                                </div>
                                <div className="township-details">
                                    <span>{town.hired_jobs || 0}/{town.total_jobs || 0} jobs hired</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {!userGrowth.length && !jobTrends.length && !revenue.length && (
                <div className="no-data-container">
                    <div className="no-data-icon">📊</div>
                    <h3>No Data Available</h3>
                    <p>There is no data available for the selected period.</p>
                    <button onClick={loadReportData} className="btn-refresh">
                        🔄 Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportsAnalytics;