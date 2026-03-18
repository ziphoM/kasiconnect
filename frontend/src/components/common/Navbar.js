// frontend/src/components/common/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMobileMenuOpen(false);
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo" onClick={() => setIsMobileMenuOpen(false)}>
                    <img 
                        src="/images/logo-navbar.png" 
                        alt="KasiConnect" 
                        className="logo-image"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML += '<span class="logo-text">KasiConnect</span>';
                        }}
                    />
                </Link>

                {/* Desktop Navigation */}
                <div className="nav-links">
                    <Link to="/jobs">Find Work</Link>
                    <Link to="/jobs/post">Post Job</Link>
                    <Link to="/how-it-works">How It Works</Link>
                </div>

                {/* Desktop Right Section */}
                <div className="nav-buttons">
                    {/* 🔴 Notification Bell - Only shown when logged in */}
                    {isAuthenticated && <NotificationBell />}

                    {isAuthenticated ? (
                        <div className="user-menu-container">
                            <button 
                                className="user-button"
                                aria-expanded="false"
                                onClick={() => {}}
                            >
                                <div className="user-avatar">
                                    {user?.profile_picture ? (
                                        <img src={user.profile_picture} alt={user.name} />
                                    ) : (
                                        getInitials(user?.name)
                                    )}
                                </div>
                                <span className="user-name">{user?.name?.split(' ')[0]}</span>
                                <i className={`fas fa-chevron-down dropdown-icon`}></i>
                            </button>
                            
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <span className="user-type">{user?.user_type}</span>
                                    <span className="user-email">{user?.email || 'No email'}</span>
                                </div>
                                
                                <Link to="/dashboard" className="dropdown-item">
                                    <i className="fas fa-dashboard"></i> Dashboard
                                </Link>
                                
                                {user?.user_type === 'worker' && (
                                    <Link to="/worker/profile" className="dropdown-item">
                                        <i className="fas fa-user"></i> My Profile
                                    </Link>
                                )}
                                {user?.user_type === 'client' && (
                                    <Link to="/client/profile" className="dropdown-item">
                                        <i className="fas fa-user"></i> My Profile
                                    </Link>
                                )}
                                
                                <Link to="/notifications" className="dropdown-item">
                                    <i className="fas fa-bell"></i> Notifications
                                </Link>
                                
                                <div className="dropdown-divider"></div>
                                
                                <button onClick={handleLogout} className="dropdown-item logout-btn">
                                    <i className="fas fa-sign-out-alt"></i> Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn-outline">Login</Link>
                            <Link to="/register" className="btn-primary">Sign Up</Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button 
                    className="mobile-menu-button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`}></i>
                </button>

                {/* Mobile Menu */}
                <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    <div className="mobile-menu-header">
                        <img 
                            src="/images/logo-navbar.png" 
                            alt="KasiConnect" 
                            className="logo-image"
                            style={{ height: '40px' }}
                        />
                        <button 
                            className="close-button"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="mobile-nav-links">
                        <Link to="/jobs" onClick={() => setIsMobileMenuOpen(false)}>
                            <i className="fas fa-briefcase"></i> Find Work
                        </Link>
                        <Link to="/jobs/post" onClick={() => setIsMobileMenuOpen(false)}>
                            <i className="fas fa-pen-to-square"></i> Post Job
                        </Link>
                        <Link to="/how-it-works" onClick={() => setIsMobileMenuOpen(false)}>
                            <i className="fas fa-question-circle"></i> How It Works
                        </Link>
                        
                        {/* 🔴 Mobile Notification Bell - Only when logged in */}
                        {isAuthenticated && (
                            <Link to="/notifications" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-bell"></i> Notifications
                            </Link>
                        )}
                    </div>

                    {isAuthenticated ? (
                        <div className="mobile-user-info">
                            <div className="mobile-user-name">{user?.name}</div>
                            <div className="mobile-user-type">{user?.user_type}</div>
                            <div className="mobile-buttons">
                                <Link to="/dashboard" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>
                                    Dashboard
                                </Link>
                                {user?.user_type === 'worker' && (
                                    <Link to="/worker/profile" className="btn-outline" onClick={() => setIsMobileMenuOpen(false)}>
                                        My Profile
                                    </Link>
                                )}
                                {user?.user_type === 'client' && (
                                    <Link to="/client/profile" className="btn-outline" onClick={() => setIsMobileMenuOpen(false)}>
                                        My Profile
                                    </Link>
                                )}
                                <button onClick={handleLogout} className="btn-outline" style={{ color: '#DC2626' }}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mobile-buttons">
                            <Link to="/login" className="btn-outline" onClick={() => setIsMobileMenuOpen(false)}>
                                Login
                            </Link>
                            <Link to="/register" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;