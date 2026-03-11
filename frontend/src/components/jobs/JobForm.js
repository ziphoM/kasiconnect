// frontend/src/components/jobs/JobForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './JobForm.css';

const JobForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Gardening',
        subcategory: '',
        township: user?.township || 'Soweto',
        address: '',
        budget_min: '',
        budget_max: '',
        estimated_hours: '',
        urgency: 'medium',
        preferred_date: '',
        preferred_time: '',
        materials_provided: false,
        materials_description: '',
        safety_requirements: ''
    });

    const categories = [
        'Gardening', 'Building', 'Plumbing', 'Painting', 
        'Electrical', 'Cleaning', 'Moving', 'Delivery', 'Handyman'
    ];

    const townships = [
        'Soweto', 'Alexandra', 'Khayelitsha', 'Tembisa', 'Katlehong',
        'Umlazi', 'Mdantsane', 'Mamelodi', 'Soshanguve', 'Daveyton'
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const validateForm = () => {
        if (!formData.title.trim()) {
            setError('Job title is required');
            return false;
        }
        if (!formData.description.trim()) {
            setError('Job description is required');
            return false;
        }
        if (!formData.budget_min || !formData.budget_max) {
            setError('Budget range is required');
            return false;
        }
        if (parseInt(formData.budget_min) >= parseInt(formData.budget_max)) {
            setError('Maximum budget must be greater than minimum');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/jobs', formData);
            
            if (response.data.success) {
                setSuccess('Job posted successfully!');
                setTimeout(() => {
                    navigate(`/jobs/${response.data.data.id}`);
                }, 2000);
            } else {
                setError(response.data.message || 'Failed to post job');
            }
        } catch (error) {
            console.error('Job posting error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="job-form-container">
            <div className="job-form-card">
                <div className="form-header">
                    <h2>📋 Post a Job</h2>
                    <p>Find skilled workers in your area</p>
                </div>

                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">{success}</div>}

                <form onSubmit={handleSubmit} className="job-form">
                    <div className="form-section">
                        <h3>Job Details</h3>
                        
                        <div className="form-group">
                            <label>Job Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Need garden cleaned"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the work needed..."
                                rows="4"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category *</label>
                                <select 
                                    name="category" 
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Subcategory (Optional)</label>
                                <input
                                    type="text"
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    placeholder="e.g., Lawn mowing"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Location & Schedule</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Township *</label>
                                <select 
                                    name="township" 
                                    value={formData.township}
                                    onChange={handleChange}
                                >
                                    {townships.map(town => (
                                        <option key={town} value={town}>{town}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Street Address (Optional)</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Vilakazi St"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Preferred Date</label>
                                <input
                                    type="date"
                                    name="preferred_date"
                                    value={formData.preferred_date}
                                    onChange={handleChange}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="form-group">
                                <label>Preferred Time</label>
                                <input
                                    type="time"
                                    name="preferred_time"
                                    value={formData.preferred_time}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Estimated Hours</label>
                                <input
                                    type="number"
                                    name="estimated_hours"
                                    value={formData.estimated_hours}
                                    onChange={handleChange}
                                    placeholder="e.g., 3"
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label>Urgency</label>
                                <select 
                                    name="urgency" 
                                    value={formData.urgency}
                                    onChange={handleChange}
                                >
                                    <option value="low">Low - Flexible timeline</option>
                                    <option value="medium">Medium - Within a week</option>
                                    <option value="high">High - Within days</option>
                                    <option value="urgent">Urgent - Today/tomorrow</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Budget</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Minimum Budget (R) *</label>
                                <input
                                    type="number"
                                    name="budget_min"
                                    value={formData.budget_min}
                                    onChange={handleChange}
                                    placeholder="300"
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Maximum Budget (R) *</label>
                                <input
                                    type="number"
                                    name="budget_max"
                                    value={formData.budget_max}
                                    onChange={handleChange}
                                    placeholder="500"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Materials & Safety</h3>

                        <div className="form-group checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    name="materials_provided"
                                    checked={formData.materials_provided}
                                    onChange={handleChange}
                                />
                                I will provide materials/tools
                            </label>
                        </div>

                        {formData.materials_provided && (
                            <div className="form-group">
                                <label>Materials Description</label>
                                <textarea
                                    name="materials_description"
                                    value={formData.materials_description}
                                    onChange={handleChange}
                                    placeholder="What materials/tools will you provide?"
                                    rows="2"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Safety Requirements</label>
                            <textarea
                                name="safety_requirements"
                                value={formData.safety_requirements}
                                onChange={handleChange}
                                placeholder="Any safety considerations workers should know?"
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="btn-cancel"
                            onClick={() => navigate('/jobs')}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? 'Posting...' : '📢 Post Job'}
                        </button>
                    </div>
                </form>

                <div className="form-note">
                    <p>💡 Job posting costs R5. First 3 posts are FREE!</p>
                </div>
            </div>
        </div>
    );
};

export default JobForm;