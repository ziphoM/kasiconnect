// frontend/src/components/admin/JobManagement.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './Admin.css';

const JobManagement = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const alert = useAlert();

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/jobs');
            if (response.data.success) {
                setJobs(response.data.data);
            } else {
                setError('Failed to load jobs');
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (jobId) => {
        alert.confirm(
            '⚠️ Are you sure you want to permanently delete this job? This action cannot be undone.',
            async () => {
                setActionLoading(true);
                try {
                    await api.delete(`/admin/jobs/${jobId}`);
                    alert.success('Job deleted successfully');
                    loadJobs();
                    setShowModal(false);
                } catch (error) {
                    console.error('Error deleting job:', error);
                    alert.error('Failed to delete job');
                } finally {
                    setActionLoading(false);
                }
            },
            null,
            'Delete Job',
            'Yes, Delete',
            'Cancel'
        );
    };

    const handleFeatureJob = async (jobId) => {
        setActionLoading(true);
        try {
            await api.post(`/admin/jobs/${jobId}/feature`);
            alert.success('Job featured successfully');
            loadJobs();
            setShowModal(false);
        } catch (error) {
            console.error('Error featuring job:', error);
            alert.error('Failed to feature job');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (filter !== 'all' && job.status !== filter) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return job.title?.toLowerCase().includes(term) || 
                   job.description?.toLowerCase().includes(term) ||
                   job.township?.toLowerCase().includes(term);
        }
        return true;
    });

    const getStatusBadge = (status) => {
        switch(status) {
            case 'posted': return <span className="badge posted">Posted</span>;
            case 'assigned': return <span className="badge assigned">Assigned</span>;
            case 'in_progress': return <span className="badge progress">In Progress</span>;
            case 'completed': return <span className="badge completed">Completed</span>;
            case 'cancelled': return <span className="badge cancelled">Cancelled</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading jobs...</div>;
    }

    return (
        <div className="management-tab">
            <div className="management-header">
                <h1>💼 Job Management</h1>
                <button className="btn-refresh" onClick={loadJobs}>
                    🔄 Refresh
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filters-bar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search jobs by title, description, location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button 
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({jobs.length})
                    </button>
                    <button 
                        className={filter === 'posted' ? 'active' : ''}
                        onClick={() => setFilter('posted')}
                    >
                        Posted ({jobs.filter(j => j.status === 'posted').length})
                    </button>
                    <button 
                        className={filter === 'assigned' ? 'active' : ''}
                        onClick={() => setFilter('assigned')}
                    >
                        Assigned ({jobs.filter(j => j.status === 'assigned').length})
                    </button>
                    <button 
                        className={filter === 'in_progress' ? 'active' : ''}
                        onClick={() => setFilter('in_progress')}
                    >
                        In Progress ({jobs.filter(j => j.status === 'in_progress').length})
                    </button>
                    <button 
                        className={filter === 'completed' ? 'active' : ''}
                        onClick={() => setFilter('completed')}
                    >
                        Completed ({jobs.filter(j => j.status === 'completed').length})
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Client</th>
                            <th>Category</th>
                            <th>Township</th>
                            <th>Budget</th>
                            <th>Status</th>
                            <th>Posted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJobs.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="no-data">No jobs found</td>
                            </tr>
                        ) : (
                            filteredJobs.map(job => (
                                <tr key={job.id}>
                                    <td>{job.id}</td>
                                    <td>{job.title}</td>
                                    <td>{job.client_name || 'Unknown'}</td>
                                    <td>{job.category || '-'}</td>
                                    <td>{job.township}</td>
                                    <td>R{job.budget_min} - R{job.budget_max}</td>
                                    <td>{getStatusBadge(job.status)}</td>
                                    <td>{new Date(job.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button 
                                            className="btn-action"
                                            onClick={() => {
                                                setSelectedJob(job);
                                                setShowModal(true);
                                            }}
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && selectedJob && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Manage Job: {selectedJob.title}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="job-details">
                                <p><strong>ID:</strong> {selectedJob.id}</p>
                                <p><strong>Client:</strong> {selectedJob.client_name}</p>
                                <p><strong>Description:</strong> {selectedJob.description}</p>
                                <p><strong>Category:</strong> {selectedJob.category}</p>
                                <p><strong>Location:</strong> {selectedJob.township}</p>
                                <p><strong>Budget:</strong> R{selectedJob.budget_min} - R{selectedJob.budget_max}</p>
                                <p><strong>Status:</strong> {selectedJob.status}</p>
                                <p><strong>Posted:</strong> {new Date(selectedJob.created_at).toLocaleString()}</p>
                            </div>

                            <div className="action-buttons">
                                <Link 
                                    to={`/jobs/${selectedJob.id}`} 
                                    className="btn-view"
                                    target="_blank"
                                >
                                    👁️ View Job
                                </Link>
                                
                                <button 
                                    className="btn-feature"
                                    onClick={() => handleFeatureJob(selectedJob.id)}
                                    disabled={actionLoading}
                                >
                                    ⭐ Feature Job
                                </button>
                                
                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDeleteJob(selectedJob.id)}
                                    disabled={actionLoading}
                                >
                                    🗑️ Delete Job
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobManagement;