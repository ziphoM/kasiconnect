// frontend/src/components/common/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* Company Info */}
                    <div className="footer-section">
                        <div className="footer-logo">
                            <span className="logo-icon">🏠</span>
                            <span className="logo-text">Ekasilody</span>
                        </div>
                        <p className="footer-description">
                            Connecting township workers with jobs. Fast, reliable, local service at your fingertips. Siyaphanda!
                        </p>
                        <div className="social-links">
                            <a href="#" className="social-link">📘</a>
                            <a href="#" className="social-link">📱</a>
                            <a href="#" className="social-link">🐦</a>
                            <a href="#" className="social-link">📷</a>
                        </div>
                    </div>

                    {/* For Clients */}
                    <div className="footer-section">
                        <h3>For Clients</h3>
                        <ul className="footer-links">
                            <li><Link to="/jobs/post">Post a Job</Link></li>
                            <li><Link to="/jobs">Browse Services</Link></li>
                            <li><Link to="/how-it-works">How it Works</Link></li>
                            <li><Link to="/pricing">Pricing</Link></li>
                            <li><Link to="/safety">Safety Tips</Link></li>
                        </ul>
                    </div>

                    {/* For Workers */}
                    <div className="footer-section">
                        <h3>For Workers</h3>
                        <ul className="footer-links">
                            <li><Link to="/register?type=worker">Become a Hustler</Link></li>
                            <li><Link to="/jobs">Find Work</Link></li>
                            <li><Link to="/profile">Create Profile</Link></li>
                            <li><Link to="/earnings">Earnings Guide</Link></li>
                            <li><Link to="/training">Free Training</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="footer-section">
                        <h3>Support</h3>
                        <ul className="footer-links">
                            <li><Link to="/help">Help Center</Link></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                            <li><Link to="/faq">FAQ</Link></li>
                            <li><Link to="/terms">Terms of Service</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-section">
                        <h3>Contact Us</h3>
                        <div className="contact-info">
                            <p>
                                <span className="contact-icon">📞</span>
                                <span>*130*469# (USSD)</span>
                            </p>
                            <p>
                                <span className="contact-icon">📱</span>
                                <span>071 234 5678</span>
                            </p>
                            <p>
                                <span className="contact-icon">✉️</span>
                                <span>info@ekasilody.co.za</span>
                            </p>
                            <p>
                                <span className="contact-icon">📍</span>
                                <span>Orlando, Soweto</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2024 Ekasilody. All rights reserved. Siyaphanda! 🇿🇦</p>
                    <p>
                        <Link to="/ussd">USSD: *130*469#</Link> | 
                        <Link to="/data-free"> Data-Free Mode</Link> | 
                        <Link to="/accessibility"> Accessibility</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;