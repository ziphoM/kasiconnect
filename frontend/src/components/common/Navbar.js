// frontend/src/components/common/Navbar.js
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileMenuOpen(false);
        setDropdownOpen(false);
    };

    const getDashboardLink = () => {
        if (!user) return '/';
        return '/dashboard';
    };

    const getProfileLink = () => {
        if (!user) return '/';
        
        switch (user.user_type) {
            case 'worker':
                return `/workers/${user.id}`;
            case 'client':
                return `/client/profile`;
            case 'admin':
                return `/admin/profile`;
            default:
                return '/';
        }
    };

    const getProfileText = () => {
        if (!user) return 'My Profile';
        
        switch (user.user_type) {
            case 'worker':
                return 'My Worker Profile';
            case 'client':
                return 'My Profile';
            case 'admin':
                return 'Admin Profile';
            default:
                return 'My Profile';
        }
    };

    const getPurchaseLink = () => {
        if (!user) return '#';
        if (user.user_type === 'worker') {
            return '/worker/pass';
        }
        if (user.user_type === 'client') {
            return '/client/packages';
        }
        return '#';
    };

    const getPurchaseText = () => {
        if (!user) return 'Buy Pass';
        if (user.user_type === 'worker') {
            return 'Buy Application Pass';
        }
        if (user.user_type === 'client') {
            return 'Hire Packages';
        }
        return 'Buy Pass';
    };

    // Check if user is admin
    const isAdmin = user?.user_type === 'admin';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target) &&
                buttonRef.current && 
                !buttonRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            <nav className="navbar">
                <div className="nav-container">
                    {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <img 
                        src="/images/logo-navbar-large.png" 
                        alt="KasiConnect" 
                        className="logo-image"
                        onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        // Show text fallback
                        e.target.parentElement.innerHTML += '<span class="logo-text">Ekasilody</span>';
                    }}
                    />
                    {/* Optional: Keep text as fallback or remove completely */}
                    {/* <span className="logo-text">KasiConnect</span> */}
                </Link>

                    {/* Desktop Navigation Links */}
                    <div className="nav-links">
                        {/* Find Work - Only for non-authenticated users or workers */}
                        {(!isAuthenticated || user?.user_type === 'worker') && (
                            <Link to="/jobs" onClick={() => setDropdownOpen(false)}>Find Work</Link>
                        )}
                        
                        {/* Post Job - Only for clients */}
                        {isAuthenticated && user?.user_type === 'client' && (
                            <Link to="/jobs/post" onClick={() => setDropdownOpen(false)}>Post Job</Link>
                        )}
                        
                        {/* Purchase links - For workers and clients only */}
                        {isAuthenticated && !isAdmin && (
                            <Link to={getPurchaseLink()} onClick={() => setDropdownOpen(false)}>
                                {getPurchaseText()}
                            </Link>
                        )}
                        
                        {/* Dashboard - For all authenticated users */}
                        {isAuthenticated && (
                            <Link to={getDashboardLink()} onClick={() => setDropdownOpen(false)}>Dashboard</Link>
                        )}
                    </div>

                    {/* Desktop Auth Buttons / User Menu */}
                    <div className="nav-buttons">
                        {isAuthenticated ? (
                            <div className="user-menu">
                                <button 
                                    ref={buttonRef}
                                    className="user-button"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <span className="user-avatar">
                                        {user?.name?.charAt(0) || 'U'}
                                    </span>
                                    <span className="user-name">
                                        {user?.name?.split(' ')[0]}
                                    </span>
                                    <span className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}>
                                        ▼
                                    </span>
                                </button>
                                
                                {dropdownOpen && (
                                    <div ref={dropdownRef} className="dropdown-menu show">
                                        <div className="dropdown-header">
                                            <span className="user-type">
                                                {isAdmin ? '👑 Admin' : user?.user_type}
                                            </span>
                                            <span className="user-email">{user?.phone}</span>
                                        </div>
                                        
                                        <Link 
                                            to={getDashboardLink()} 
                                            className="dropdown-item"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            📊 Dashboard
                                        </Link>
                                        
                                        <Link 
                                            to={getProfileLink()} 
                                            className="dropdown-item"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            👤 {getProfileText()}
                                        </Link>
                                        
                                        {!isAdmin && (
                                            <Link 
                                                to={getPurchaseLink()} 
                                                className="dropdown-item"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                🎫 {getPurchaseText()}
                                            </Link>
                                        )}

                                            <Link 
                                                to="/client/my-packages" 
                                                className="dropdown-item"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                📦 My Packages
                                            </Link>
                                     
                                        
                                        {user?.user_type === 'worker' && (
                                            <Link 
                                                to="/applications" 
                                                className="dropdown-item"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                📋 My Applications
                                            </Link>
                                        )}
                                        
                                        {isAdmin && (
                                            <>
                                                <Link 
                                                    to="/admin/users" 
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    👥 Manage Users
                                                </Link>
                                                <Link 
                                                    to="/admin/jobs" 
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    💼 Manage Jobs
                                                </Link>
                                                <Link 
                                                    to="/admin/packages" 
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    📦 Manage Packages
                                                </Link>
                                            </>
                                        )}
                                        
                                        <div className="dropdown-divider"></div>
                                        
                                        <button 
                                            onClick={handleLogout} 
                                            className="dropdown-item logout-btn"
                                        >
                                            🚪 Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="btn-outline" onClick={() => setDropdownOpen(false)}>Sign In</Link>
                                <Link to="/register" className="btn-primary" onClick={() => setDropdownOpen(false)}>Join Now</Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button 
                        className="mobile-menu-button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        ☰
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-header">
                    <Link to="/" className="logo" onClick={() => setMobileMenuOpen(false)}>
                        <span className="logo-icon">🏠</span>
                        <span className="logo-text">Ekasilody</span>
                    </Link>
                    <button 
                        className="close-button"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        ✕
                    </button>
                </div>

                <div className="mobile-nav-links">
                    {/* Find Work - Only for non-authenticated users or workers */}
                    {(!isAuthenticated || user?.user_type === 'worker') && (
                        <Link to="/jobs" onClick={() => setMobileMenuOpen(false)}>Find Work</Link>
                    )}
                    
                    {/* Post Job - Only for clients */}
                    {isAuthenticated && user?.user_type === 'client' && (
                        <Link to="/jobs/post" onClick={() => setMobileMenuOpen(false)}>Post Job</Link>
                    )}
                    
                    {/* Purchase links - For workers and clients only */}
                    {isAuthenticated && !isAdmin && (
                        <Link to={getPurchaseLink()} onClick={() => setMobileMenuOpen(false)}>
                            {getPurchaseText()}
                        </Link>
                    )}
                    
                    {/* Dashboard - For all authenticated users */}
                    {isAuthenticated && (
                        <Link to={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                            Dashboard
                        </Link>
                    )}
                    
                    {/* Profile link for authenticated users */}
                    {isAuthenticated && (
                        <Link to={getProfileLink()} onClick={() => setMobileMenuOpen(false)}>
                            {getProfileText()}
                        </Link>
                    )}
                    
                    {/* Worker-specific links */}
                    {user?.user_type === 'worker' && (
                        <Link to="/applications" onClick={() => setMobileMenuOpen(false)}>
                            My Applications
                        </Link>
                    )}
                    
                    {/* Admin-specific links */}
                    {isAdmin && (
                        <>
                            <Link to="/admin/users" onClick={() => setMobileMenuOpen(false)}>
                                Manage Users
                            </Link>
                            <Link to="/admin/jobs" onClick={() => setMobileMenuOpen(false)}>
                                Manage Jobs
                            </Link>
                            <Link to="/admin/packages" onClick={() => setMobileMenuOpen(false)}>
                                Manage Packages
                            </Link>
                        </>
                    )}
                </div>

                {!isAuthenticated ? (
                    <div className="mobile-buttons">
                        <Link to="/login" className="btn-outline" onClick={() => setMobileMenuOpen(false)}>
                            Sign In
                        </Link>
                        <Link to="/register" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>
                            Join Now
                        </Link>
                    </div>
                ) : (
                    <div className="mobile-user-info">
                        <div className="mobile-user-name">{user?.name}</div>
                        <div className="mobile-user-type">
                            {isAdmin ? '👑 Administrator' : user?.user_type}
                        </div>
                        <div className="mobile-buttons">
                            <button onClick={handleLogout} className="btn-outline">
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Navbar;