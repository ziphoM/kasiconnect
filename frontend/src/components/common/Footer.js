// frontend/src/components/common/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>KasiConnect</h3>
                    <p>Connecting township hustlers with local opportunities. Find work or hire trusted workers in your community.</p>
                    
                    {/* Social Media Icons */}
                    <div className="social-icons">
                        <a 
                            href="https://facebook.com/kasiconnect" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-icon facebook"
                            aria-label="Facebook"
                        >
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        
                        <a 
                            href="https://twitter.com/kasiconnect" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-icon twitter"
                            aria-label="X (Twitter)"
                        >
                            <i className="fab fa-x-twitter"></i>
                        </a>
                        
                        <a 
                            href="https://wa.me/27731026251" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-icon whatsapp"
                            aria-label="WhatsApp"
                        >
                            <i className="fab fa-whatsapp"></i>
                        </a>
                        
                        <a 
                            href="https://linkedin.com/company/kasiconnect" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-icon linkedin"
                            aria-label="LinkedIn"
                        >
                            <i className="fab fa-linkedin-in"></i>
                        </a>
                    </div>
                </div>

                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/jobs">Find Jobs</Link></li>
                        <li><Link to="/jobs/post">Post a Job</Link></li>
                        <li><Link to="/register">Join as Worker</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Support</h4>
                    <ul>
                        <li><Link to="/faq">FAQ</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                        <li><Link to="/terms">Terms of Service</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Contact</h4>
                    <ul className="contact-info">
                        <li>
                            <i className="fas fa-phone"></i>
                            <span>Call: 0800 123 456</span>
                        </li>
                        <li>
                            <i className="fas fa-envelope"></i>
                            <span>Email: info@kasiconnect.co.za</span>
                        </li>
                        <li>
                            <i className="fas fa-map-marker-alt"></i>
                            <span>Johannesburg, South Africa</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} EKasilody. All rights reserved. 🇿🇦</p>
            </div>
        </footer>
    );
};

export default Footer;