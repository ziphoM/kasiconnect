// frontend/src/pages/JobsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import JobCard from '../components/jobs/JobCard';
import './JobsPage.css';

const JobsPage = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        township: '',
        category: '',
        search: '',
        urgency: ''
    });
    const [activeFilters, setActiveFilters] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const jobsPerPage = 9;

    useEffect(() => {
        loadJobs();
    }, [filters.township, filters.category, filters.urgency]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.township) params.append('township', filters.township);
            if (filters.category) params.append('category', filters.category);
            
            const response = await api.get(`/jobs?${params}`);
            if (response.data.success) {
                let filteredJobs = response.data.data;
                
                if (filters.search) {
                    filteredJobs = filteredJobs.filter(job => 
                        job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                        job.description.toLowerCase().includes(filters.search.toLowerCase())
                    );
                }

                if (filters.urgency) {
                    filteredJobs = filteredJobs.filter(job => 
                        job.urgency === filters.urgency
                    );
                }
                
                setJobs(filteredJobs);
                updateActiveFilters();
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateActiveFilters = () => {
        const active = [];
        if (filters.township) active.push({ type: 'township', value: filters.township });
        if (filters.category) active.push({ type: 'category', value: filters.category });
        if (filters.urgency) active.push({ type: 'urgency', value: filters.urgency });
        if (filters.search) active.push({ type: 'search', value: filters.search });
        setActiveFilters(active);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setFilters(prev => ({
            ...prev,
            search: e.target.value
        }));
        setCurrentPage(1);
    };

    const removeFilter = (filterType) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: ''
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            township: '',
            category: '',
            search: '',
            urgency: ''
        });
    };

    // Pagination
    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);
    const totalPages = Math.ceil(jobs.length / jobsPerPage);

    const townships = [
        'All', 'Soweto', 'Alexandra', 'Khayelitsha', 'Tembisa', 
        'Katlehong', 'Umlazi', 'Mdantsane', 'Mamelodi'
    ];

    const categories = [
        'All', 'Gardening', 'Cleaning', 'Building', 'Plumbing', 
        'Painting', 'Electrical', 'Delivery', 'Moving', 'Handyman'
    ];

    const urgencyLevels = [
        'All', 'low', 'medium', 'high', 'urgent'
    ];

    return (
        <div className="jobs-page">
            <div className="jobs-header">
                <h1>Find Work in Your Area</h1>
                {user?.user_type === 'client' && (
                    <Link to="/jobs/post" className="btn-post-job">
                        + Post a Job
                    </Link>
                )}
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <div className="filters-header">
                    <h3>Filter Jobs</h3>
                    {activeFilters.length > 0 && (
                        <button onClick={clearAllFilters} className="btn-clear-filters">
                            ✕ Clear all filters
                        </button>
                    )}
                </div>

                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search jobs by title or description..."
                        value={filters.search}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Township</label>
                        <select 
                            name="township" 
                            value={filters.township} 
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Townships</option>
                            {townships.filter(t => t !== 'All').map(town => (
                                <option key={town} value={town}>{town}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Category</label>
                        <select 
                            name="category" 
                            value={filters.category} 
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Categories</option>
                            {categories.filter(c => c !== 'All').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Urgency</label>
                        <select 
                            name="urgency" 
                            value={filters.urgency} 
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Levels</option>
                            {urgencyLevels.filter(u => u !== 'All').map(level => (
                                <option key={level} value={level}>
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filters */}
                {activeFilters.length > 0 && (
                    <div className="active-filters">
                        <span>Active filters:</span>
                        {activeFilters.map((filter, index) => (
                            <div key={index} className="filter-tag">
                                {filter.type}: {filter.value}
                                <button onClick={() => removeFilter(filter.type)}>×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Jobs Grid */}
            {loading ? (
                <div className="loading-spinner">Loading jobs...</div>
            ) : currentJobs.length === 0 ? (
                <div className="no-jobs">
                    <div className="no-jobs-icon">🔍</div>
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or check back later</p>
                    {user?.user_type === 'client' && (
                        <Link to="/jobs/post" className="btn-primary">
                            Post a Job
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    <div className="jobs-grid">
                        {currentJobs.map(job => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                ←
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (
                                    pageNum === currentPage - 2 ||
                                    pageNum === currentPage + 2
                                ) {
                                    return <span key={pageNum} className="pagination-dots">...</span>;
                                }
                                return null;
                            })}
                            
                            <button 
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default JobsPage;