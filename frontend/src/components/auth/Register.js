// frontend/src/components/auth/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        user_type: 'worker',
        township: 'Soweto',
        id_number: ''
    });
    
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    // Unique townships list - removed duplicates
    const townships = [
        'Soweto', 'Alexandra', 'Khayelitsha', 'Tembisa', 'Katlehong',
        'Umlazi', 'Mdantsane', 'Mamelodi', 'Daveyton', 'Gugulethu',
        'Nyanga', 'Mitchells Plain', 'Atteridgeville', 'Botshabelo',
        'Zwelitsha', 'Mdantsane', 'Soshanguve', 'Meadowlands', 'Diepkloof',
        'Orlando', 'Dobsonville', 'Protea Glen', 'Zola', 'Jabulani'
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    const validateForm = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Phone validation (SA format)
        const phoneRegex = /^27[0-9]{9}$/;
        if (!formData.phone) {
            newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Phone must be in SA format: 27712345678';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one number';
        }

        // Confirm password
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // Township validation
        if (!formData.township) {
            newErrors.township = 'Please select a township';
        }

        // ID number validation (optional but if provided, must be valid)
        if (formData.id_number && !/^[0-9]{13}$/.test(formData.id_number)) {
            newErrors.id_number = 'ID number must be 13 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setApiError('');

        try {
            const result = await register({
                name: formData.name,
                phone: formData.phone,
                password: formData.password,
                user_type: formData.user_type,
                township: formData.township,
                id_number: formData.id_number || undefined
            });
            
            if (result.success) {
                // Redirect based on user type
                if (formData.user_type === 'worker') {
                    navigate('/dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setApiError(result.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setApiError('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Join Ekasilody</h2>
                    <p>Create your account and start hustling</p>
                </div>

                {apiError && (
                    <div className="auth-error">
                        <span className="error-icon">⚠️</span>
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* User Type Selection */}
                    <div className="user-type-selector">
                        <label className={formData.user_type === 'worker' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="user_type"
                                value="worker"
                                checked={formData.user_type === 'worker'}
                                onChange={handleChange}
                            />
                            <span className="type-card">
                                <span className="type-icon">👷</span>
                                <span className="type-label">Worker</span>
                                <span className="type-desc">Looking for jobs</span>
                            </span>
                        </label>
                        <label className={formData.user_type === 'client' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="user_type"
                                value="client"
                                checked={formData.user_type === 'client'}
                                onChange={handleChange}
                            />
                            <span className="type-card">
                                <span className="type-icon">🏠</span>
                                <span className="type-label">Client</span>
                                <span className="type-desc">Need services</span>
                            </span>
                        </label>
                    </div>

                    {/* Full Name */}
                    <div className="form-group">
                        <label htmlFor="name">Full Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className={errors.name ? 'error' : ''}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    {/* Phone Number */}
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number *</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="27712345678"
                            className={errors.phone ? 'error' : ''}
                        />
                        <small>SA format: 27712345678 (e.g., 27712345678)</small>
                        {errors.phone && <span className="error-message">{errors.phone}</span>}
                    </div>

                    {/* ID Number (Optional) */}
                    <div className="form-group">
                        <label htmlFor="id_number">SA ID Number (Optional)</label>
                        <input
                            type="text"
                            id="id_number"
                            name="id_number"
                            value={formData.id_number}
                            onChange={handleChange}
                            placeholder="000101 5084 089"
                            className={errors.id_number ? 'error' : ''}
                        />
                        <small>Helps with verification</small>
                        {errors.id_number && <span className="error-message">{errors.id_number}</span>}
                    </div>

                    {/* Township */}
                    <div className="form-group">
                        <label htmlFor="township">Township *</label>
                        <select
                            id="township"
                            name="township"
                            value={formData.township}
                            onChange={handleChange}
                            className={errors.township ? 'error' : ''}
                        >
                            {townships.map(town => (
                                <option key={town} value={town}>{town}</option>
                            ))}
                        </select>
                        {errors.township && <span className="error-message">{errors.township}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">Password *</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={errors.password ? 'error' : ''}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <small>Min 6 chars, 1 uppercase, 1 number</small>
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password *</label>
                        <div className="password-input">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={errors.confirmPassword ? 'error' : ''}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                    </div>

                    {/* Terms */}
                    <div className="form-group terms">
                        <label>
                            <input type="checkbox" required />
                            <span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link></span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account? <Link to="/login">Sign In</Link>
                    </p>
                </div>

                <div className="ussd-alternative">
                    <p>📱 No smartphone? Register via USSD:</p>
                    <code>*130*469#</code>
                </div>
            </div>
        </div>
    );
};

export default Register;