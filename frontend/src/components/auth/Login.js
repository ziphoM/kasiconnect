// frontend/src/components/auth/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        phone: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};

        // Phone validation
        const phoneRegex = /^27[0-9]{9}$/;
        if (!formData.phone) {
            newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Phone must be in SA format: 27712345678';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
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
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
        
        // Clear API error when user types
        if (apiError) {
            setApiError('');
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
            const result = await login(formData.phone, formData.password);
            
            if (result.success) {
                // Store phone if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('rememberedPhone', formData.phone);
                } else {
                    localStorage.removeItem('rememberedPhone');
                }
                
                navigate('/dashboard');
            } else {
                setApiError(result.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setApiError('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Load remembered phone on component mount
    React.useEffect(() => {
        const rememberedPhone = localStorage.getItem('rememberedPhone');
        if (rememberedPhone) {
            setFormData(prev => ({ ...prev, phone: rememberedPhone }));
            setRememberMe(true);
        }
    }, []);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome Back!</h2>
                    <p>Sign in to continue your hustle</p>
                </div>

                {apiError && (
                    <div className="auth-error">
                        <span className="error-icon">⚠️</span>
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Phone Number */}
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="27712345678"
                            className={errors.phone ? 'error' : ''}
                            autoComplete="username"
                        />
                        <small>SA format: 27712345678</small>
                        {errors.phone && <span className="error-message">{errors.phone}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={errors.password ? 'error' : ''}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="form-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" className="forgot-link">
                            Forgot Password?
                        </Link>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account? <Link to="/register">Sign Up</Link>
                    </p>
                </div>

                {/* USSD Alternative */}
                <div className="ussd-alternative">
                    <p>📱 No internet? Login via USSD:</p>
                    <code>*130*469#</code>
                </div>

                {/* Demo Credentials (remove in production) */}
                <div className="demo-credentials">
                    <p>📝 Demo Accounts:</p>
                    <small>Worker: 27712345678 / password123</small><br />
                    <small>Client: 27787654321 / password123</small>
                </div>
            </div>
        </div>
    );
};

export default Login;