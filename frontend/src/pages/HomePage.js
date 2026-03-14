// frontend/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './HomePage.css';

const HomePage = () => {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState({
        workers: 0,
        clients: 0,
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        total_hires: 0,
        total_revenue: 0
    });
    const [loading, setLoading] = useState({
        jobs: false,
        stats: false
    });
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    // Define categories with real township flavor
    const categories = [
        { name: 'Plumbing', icon: '🔧', color: '#FF6B35', lightColor: '#FFF1E6', jobs: '24', description: 'Leaky pipes? Fixed sharp!' },
        { name: 'Building', icon: '🏗️', color: '#F59E0B', lightColor: '#FEF3C7', jobs: '18', description: 'Extensions, renovations' },
        { name: 'Gardening', icon: '🌿', color: '#10B981', lightColor: '#D1FAE5', jobs: '32', description: 'Lawn, landscaping' },
        { name: 'Painting', icon: '🎨', color: '#8B5CF6', lightColor: '#EDE9FE', jobs: '15', description: 'Inside & outside' },
        { name: 'Cleaning', icon: '🧹', color: '#EC4899', lightColor: '#FCE7F3', jobs: '27', description: 'Deep cleaning' },
        { name: 'Electrical', icon: '⚡', color: '#F97316', lightColor: '#FFEDD5', jobs: '12', description: 'Wiring, installations' },
        { name: 'Moving', icon: '📦', color: '#06B6D4', lightColor: '#CFFAFE', jobs: '9', description: 'Local moves' },
        { name: 'Handyman', icon: '🛠️', color: '#6B7280', lightColor: '#F3F4F6', jobs: '41', description: 'All small jobs' }
    ];

    // Testimonials with real township voices
    const testimonials = [
        {
            name: 'Thabo "Spoko" M.',
            location: 'Soweto',
            role: 'Client',
            text: '"I needed a plumber spapa! Within 2 hours, bra Bheki fixed my geyser. R300 well spent!"',
            rating: 5,
            avatar: '👨🏾'
        },
        {
            name: 'Lerato "Boss Lady" K.',
            location: 'Alexandra',
            role: 'Worker (Painter)',
            text: '"KasiConnect changed my life yazi. I get 3-4 jobs every week now. My kids eat every day!"',
            rating: 5,
            avatar: '👩🏾'
        },
        {
            name: 'Sipho "General" D.',
            location: 'Katlehong',
            role: 'Worker (Handyman)',
            text: '"From zero to hero. Now I have regular clients who call me for everything. Best decision ever!"',
            rating: 5,
            avatar: '👨🏾'
        },
        {
            name: 'Nomsa "Mama" P.',
            location: 'Tembisa',
            role: 'Client',
            text: '"I was scared to hire online, but these guys are legit. Helped me move furniture on Saturday."',
            rating: 5,
            avatar: '👩🏾'
        }
    ];

    useEffect(() => {
        loadJobs();
        loadStats();
        
        // Rotate testimonials
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    const loadJobs = async () => {
        setLoading(prev => ({ ...prev, jobs: true }));
        try {
            const response = await api.get('/jobs?status=posted');
            if (response.data.success) {
                setJobs(response.data.data.slice(0, 4));
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(prev => ({ ...prev, jobs: false }));
        }
    };

    const loadStats = async () => {
        setLoading(prev => ({ ...prev, stats: true }));
        try {
            const response = await api.get('/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(prev => ({ ...prev, stats: false }));
        }
    };

    // Format numbers with commas
    const formatNumber = (num) => {
        if (!num && num !== 0) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Truncate text
    const truncateText = (text, maxLength = 60) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="homepage">
            {/* Hero Section - Modern Township Vibe */}
            <section className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Find <span className="highlight">hustlers</span> for any piece job in your <span className="highlight">kasi</span>
                        </h1>
                        <p className="hero-subtitle">
                            From handyman to housekeeping, plumbing to ElectriFix — connect with trusted locals who deliver sharp 4 sho!
                        </p>
                        <div className="hero-buttons">
                            <Link to="/jobs/post" className="btn-primary btn-large">
                                <span className="btn-icon">📋</span>
                                Post a Job — It's Free!
                            </Link>
                            <Link to="/jobs" className="btn-secondary btn-large">
                                <span className="btn-icon">🔍</span>
                                Find Work
                            </Link>
                        </div>
                        
                        {/* Real Stats from Database */}
                        <div className="hero-stats-grid">
                            <div className="hero-stat-item">
                                <div className="hero-stat-value">
                                    {loading.stats ? <span className="loading-dots">•••</span> : formatNumber(stats.workers)}
                                </div>
                                <div className="hero-stat-label">Active Hustlers</div>
                            </div>
                            <div className="hero-stat-item">
                                <div className="hero-stat-value">
                                    {loading.stats ? <span className="loading-dots">•••</span> : formatNumber(stats.completed_jobs || stats.total_hires)}
                                </div>
                                <div className="hero-stat-label">Jobs Done</div>
                            </div>
                            <div className="hero-stat-item">
                                <div className="hero-stat-value">
                                    {loading.stats ? <span className="loading-dots">•••</span> : formatNumber(stats.active_jobs)}
                                </div>
                                <div className="hero-stat-label">Open Jobs</div>
                            </div>
                            <div className="hero-stat-item">
                                <div className="hero-stat-value">
                                    {loading.stats ? <span className="loading-dots">•••</span> : formatNumber(stats.clients)}
                                </div>
                                <div className="hero-stat-label">Happy Clients</div>
                            </div>
                        </div>
                    </div>
                    <div className="hero-image-wrapper">
                        <div className="hero-image-card">
                            <img 
                                src="/images/hero-banner.png" 
                                alt="Township hustlers working" 
                                className="hero-banner"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80';
                                }}
                            />

                        </div>
                    </div>
                </div>
                
                {/* Floating Elements */}
                <div className="floating-element element-1">🔧</div>
                <div className="floating-element element-2">🪴</div>
                <div className="floating-element element-3">🎨</div>
                <div className="floating-element element-4">⚡</div>
            </section>

            {/* Trust Badges */}
            <section className="trust-badges">
                <div className="container">
                    <div className="badges-grid">
                        <div className="trust-badge">
                            <span className="badge-icon">✓</span>
                            <span>All workers vetted</span>
                        </div>
                        <div className="trust-badge">
                            <span className="badge-icon">💰</span>
                            <span>Secure payments</span>
                        </div>
                        <div className="trust-badge">
                            <span className="badge-icon">⚡</span>
                            <span>Same-day service</span>
                        </div>
                        <div className="trust-badge">
                            <span className="badge-icon">⭐</span>
                            <span>5-star ratings</span>
                        </div>
                        <div className="trust-badge">
                            <span className="badge-icon">📍</span>
                            <span>All townships</span>
                        </div>
                        <div className="trust-badge">
                            <span className="badge-icon">📱</span>
                            <span>USSD supported</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section - Vibrant Grid */}
            <section className="categories-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="title-icon">🔍</span>
                            What needs to be done?
                        </h2>
                        <p className="section-subtitle">
                            Browse popular categories — there's a hustler for everything!
                        </p>
                    </div>
                    
                    <div className="categories-grid-modern">
                        {categories.map((category, index) => (
                            <Link 
                                to={`/jobs?category=${category.name.toLowerCase()}`} 
                                key={index} 
                                className="category-card-modern"
                                style={{ backgroundColor: category.lightColor }}
                            >
                                <div className="category-icon-wrapper" style={{ backgroundColor: category.color }}>
                                    <span className="category-icon">{category.icon}</span>
                                </div>
                                <div className="category-info">
                                    <h3 className="category-name">{category.name}</h3>
                                    <p className="category-description">{category.description}</p>
                                    <span className="category-jobs-badge">
                                        {category.jobs} jobs now
                                    </span>
                                </div>
                                <div className="category-arrow">→</div>
                            </Link>
                        ))}
                    </div>
                    
                    <div className="categories-cta">
                        <Link to="/jobs" className="btn-outline">
                            View All Categories <span>→</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* How It Works - Township Style */}
            <section className="how-it-works-section">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">How it works — <span className="highlight">sharp sharp!</span></h2>
                        <p className="section-subtitle">Three simple steps to get things done in your kasi</p>
                    </div>
                    
                    <div className="steps-grid-modern">
                        <div className="step-card-modern">
                            <div className="step-number" style={{ background: '#FF6B35' }}>1</div>
                            <div className="step-icon">📢</div>
                            <h3>Spread the word</h3>
                            <p>Post your job in minutes — tell us what you need, where, and your budget. No charge!</p>
                            <div className="step-example">"Need a plumber in Soweto • R500"</div>
                        </div>
                        
                        <div className="step-card-modern">
                            <div className="step-number" style={{ background: '#F59E0B' }}>2</div>
                            <div className="step-icon">👥</div>
                            <h3>Get quotes</h3>
                            <p>Local hustlers will send you offers with their prices. Check their ratings and pick your person.</p>
                            <div className="step-example">"Bra Bheki • 4.9⭐ • R450"</div>
                        </div>
                        
                        <div className="step-card-modern">
                            <div className="step-number" style={{ background: '#10B981' }}>3</div>
                            <div className="step-icon">✅</div>
                            <h3>Job done!</h3>
                            <p>Hire, get the work done, and pay securely. Leave a review to help the next person.</p>
                            <div className="step-example">"Geyser fixed in 2 hours!"</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Job Feed */}
            <section className="live-jobs-section">
                <div className="container">
                    <div className="section-header with-cta">
                        <div>
                            <h2 className="section-title">
                                <span className="live-badge">🔴 LIVE</span>
                                Recent jobs in your area
                            </h2>
                            <p className="section-subtitle">Fresh opportunities posted just now</p>
                        </div>
                        <Link to="/jobs" className="btn-outline">
                            View All <span>→</span>
                        </Link>
                    </div>
                    
                    {loading.jobs ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading opportunities...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <h3>No jobs yet</h3>
                            <p>Be the first to post a job in your area!</p>
                            <Link to="/jobs/post" className="btn-primary">
                                Post a Job Now
                            </Link>
                        </div>
                    ) : (
                        <div className="jobs-grid-modern">
                            {jobs.map(job => (
                                <Link to={`/jobs/${job.id}`} key={job.id} className="job-card-modern">
                                    <div className="job-card-header">
                                        <span className="job-category-badge" style={{
                                            background: categories.find(c => c.name.toLowerCase() === job.category?.toLowerCase())?.lightColor || '#F3F4F6',
                                            color: categories.find(c => c.name.toLowerCase() === job.category?.toLowerCase())?.color || '#6B7280'
                                        }}>
                                            {job.category || 'General'}
                                        </span>
                                        <span className="job-time">
                                            {new Date(job.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <h3 className="job-title">{job.title}</h3>
                                    <p className="job-description">{truncateText(job.description)}</p>
                                    <div className="job-details-row">
                                        <div className="job-location">
                                            <span>📍</span>
                                            <span>{job.township || 'Kasi'}</span>
                                        </div>
                                        <div className="job-budget">
                                            <span>💰</span>
                                            <span>R{job.budget_min} - R{job.budget_max}</span>
                                        </div>
                                    </div>
                                    <div className="job-applications">
                                        <span className="applications-count">
                                            👥 {job.application_count || 0} applicants
                                        </span>
                                        <span className="job-apply-link">Apply →</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials Carousel */}
            <section className="testimonials-section">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">Real people, real stories</h2>
                        <p className="section-subtitle">From our kasi community</p>
                    </div>
                    
                    <div className="testimonials-carousel">
                        {testimonials.map((testimonial, index) => (
                            <div 
                                key={index} 
                                className={`testimonial-slide ${activeTestimonial === index ? 'active' : ''}`}
                                style={{ display: activeTestimonial === index ? 'block' : 'none' }}
                            >
                                <div className="testimonial-card-modern">
                                    <div className="testimonial-quote">"</div>
                                    <p className="testimonial-text">{testimonial.text}</p>
                                    <div className="testimonial-rating">
                                        {'⭐'.repeat(testimonial.rating)}
                                    </div>
                                    <div className="testimonial-author">
                                        <div className="author-avatar">{testimonial.avatar}</div>
                                        <div className="author-info">
                                            <strong>{testimonial.name}</strong>
                                            <span>{testimonial.location} • {testimonial.role}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="carousel-dots">
                            {testimonials.map((_, index) => (
                                <button 
                                    key={index}
                                    className={`dot ${activeTestimonial === index ? 'active' : ''}`}
                                    onClick={() => setActiveTestimonial(index)}
                                    style={{ background: activeTestimonial === index ? '#FF6B35' : '#E5E7EB' }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Counter Section */}
            <section className="stats-counter-section">
                <div className="container">
                    <div className="stats-counter-grid">
                        <div className="counter-card">
                            <div className="counter-icon">👨🏾‍🔧</div>
                            <div className="counter-number">
                                {loading.stats ? '...' : formatNumber(stats.workers)}
                            </div>
                            <div className="counter-label">Active Hustlers</div>
                        </div>
                        <div className="counter-card">
                            <div className="counter-icon">✅</div>
                            <div className="counter-number">
                                {loading.stats ? '...' : formatNumber(stats.completed_jobs || stats.total_hires)}
                            </div>
                            <div className="counter-label">Jobs Completed</div>
                        </div>
                        <div className="counter-card">
                            <div className="counter-icon">💰</div>
                            <div className="counter-number">
                                R{loading.stats ? '...' : formatNumber(stats.total_revenue)}
                            </div>
                            <div className="counter-label">Paid to Hustlers</div>
                        </div>
                        <div className="counter-card">
                            <div className="counter-icon">🏘️</div>
                            <div className="counter-number">
                                {loading.stats ? '...' : '15+'}
                            </div>
                            <div className="counter-label">Townships Covered</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* USSD Section - Township Special */}
            <section className="ussd-feature-section">
                <div className="container">
                    <div className="ussd-card">
                        <div className="ussd-icon">📱</div>
                        <div className="ussd-content">
                            <h2>No smartphone? <span className="highlight">No stress!</span></h2>
                            <p>Use any phone — even a mzansi phone — to find work or post jobs</p>
                            <div className="ussd-code-box">
                                <span className="ussd-label">Dial:</span>
                                <span className="ussd-number">*130*469#</span>
                                <span className="ussd-free">FREE</span>
                            </div>
                            <div className="ussd-features">
                                <span>✓ No data needed</span>
                                <span>✓ Works on all networks</span>
                            </div>
                        </div>
                        <div className="ussd-phone">
                            <div className="phone-mockup">
                                <div className="phone-screen">
                                    <div className="ussd-demo">
                                        <div>KasiConnect</div>
                                        <div>1: Find work</div>
                                        <div>2: Post job</div>
                                        <div>3: Check balance</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta-section">
                <div className="container">
                    <div className="cta-card" style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F45B1E 100%)' }}>
                        <h2 className="cta-title">Ready to make moves?</h2>
                        <p className="cta-subtitle">Join thousands of hustlers and clients in your kasi</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn-cta-primary">
                                <span className="btn-icon">🚀</span>
                                Start Hustling
                            </Link>
                            <Link to="/jobs/post" className="btn-cta-secondary">
                                <span className="btn-icon">📋</span>
                                Post a Job
                            </Link>
                        </div>
                        <div className="cta-footer">
                            <span>⚡ Free to join • No hidden fees • 100% mzansi</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;