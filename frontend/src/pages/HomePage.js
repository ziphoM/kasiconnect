// frontend/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '@fortawesome/fontawesome-free/css/all.min.css';
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

    // Define categories with Font Awesome icons
    const categories = [
        { name: 'Plumbing', icon: 'fa-solid fa-wrench', color: '#FF6B35', lightColor: '#FFF1E6', jobs: '24', description: 'Leaky pipes? Fixed sharp!' },
        { name: 'Building', icon: 'fa-solid fa-hard-hat', color: '#F59E0B', lightColor: '#FEF3C7', jobs: '18', description: 'Extensions, renovations' },
        { name: 'Gardening', icon: 'fa-solid fa-seedling', color: '#10B981', lightColor: '#D1FAE5', jobs: '32', description: 'Lawn, landscaping' },
        { name: 'Painting', icon: 'fa-solid fa-paint-roller', color: '#8B5CF6', lightColor: '#EDE9FE', jobs: '15', description: 'Inside & outside' },
        { name: 'Cleaning', icon: 'fa-solid fa-broom', color: '#EC4899', lightColor: '#FCE7F3', jobs: '27', description: 'Deep cleaning' },
        { name: 'Electrical', icon: 'fa-solid fa-bolt', color: '#F97316', lightColor: '#FFEDD5', jobs: '12', description: 'Wiring, installations' },
        { name: 'Moving', icon: 'fa-solid fa-truck', color: '#06B6D4', lightColor: '#CFFAFE', jobs: '9', description: 'Local moves' },
        { name: 'Handyman', icon: 'fa-solid fa-toolbox', color: '#6B7280', lightColor: '#F3F4F6', jobs: '41', description: 'All small jobs' }
    ];

    // Features with Font Awesome icons
    const features = [
        {
            icon: 'fa-solid fa-user-shield',
            title: 'Trusted Hustlers',
            description: 'All our hustlers are verified locals from the hood',
            color: '#282fff'
        },
        {
            icon: 'fa-solid fa-bolt',
            title: 'Quick Connect',
            description: 'Get connected with workers in minutes',
            color: '#F59E0B'
        },
        {
            icon: 'fa-solid fa-thumbs-up',
            title: 'Quality Work',
            description: 'Only the best hustlers, guaranteed satisfaction',
            color: '#fa2b2b'
        }
    ];

    // How it works steps with Font Awesome icons
    const steps = [
        {
            number: '1',
            icon: 'fa-regular fa-pen-to-square',
            title: 'Spread the word',
            description: 'Post your job in minutes — tell us what you need, where, and your budget. No charge!',
            example: '"Need a plumber in Soweto • R500"',
            color: '#FF6B35'
        },
        {
            number: '2',
            icon: 'fa-regular fa-message',
            title: 'Get quotes',
            description: 'Local hustlers will send you offers with their prices. Check their ratings and pick your person.',
            example: '"Bra Bheki • 4.9⭐ • R450"',
            color: '#F59E0B'
        },
        {
            number: '3',
            icon: 'fa-solid fa-handshake',
            title: 'Job done!',
            description: 'Hire, get the work done, and pay securely. Leave a review to help the next person.',
            example: '"Geyser fixed in 2 hours!"',
            color: '#10B981'
        }
    ];

    // Stats with Font Awesome icons
    const statIcons = {
        workers: 'fa-solid fa-users',
        jobsDone: 'fa-solid fa-circle-check',
        revenue: 'fa-solid fa-sack-dollar',
        townships: 'fa-solid fa-location-dot'
    };

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
                                <i className="fas fa-pen-to-square btn-icon"></i>
                                Post a Job — It's Free!
                            </Link>
                            <Link to="/jobs" className="btn-secondary btn-large">
                                <i className="fas fa-magnifying-glass btn-icon"></i>
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
                <div className="floating-element element-1"><i className="fas fa-wrench"></i></div>
                <div className="floating-element element-2"><i className="fas fa-seedling"></i></div>
                <div className="floating-element element-3"><i className="fas fa-paint-roller"></i></div>
                <div className="floating-element element-4"><i className="fas fa-bolt"></i></div>
            </section>

            {/* Features Section - NEW */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">Why Choose <span className="highlight">KasiConnect</span></h2>
                        <p className="section-subtitle">We make it easy to get things done in your community</p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon-wrapper" style={{ background: `${feature.color}15` }}>
                                    <i className={`${feature.icon} feature-icon`} style={{ color: feature.color }}></i>
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="trust-badges">
                <div className="container">
                    <div className="badges-grid">
                        <div className="trust-badge">
                            <i className="fas fa-check-circle badge-icon" style={{ color: '#10B981' }}></i>
                            <span>All workers vetted</span>
                        </div>
                        <div className="trust-badge">
                            <i className="fas fa-shield-heart badge-icon" style={{ color: '#FF6B35' }}></i>
                            <span>Secure payments</span>
                        </div>
                        <div className="trust-badge">
                            <i className="fas fa-bolt badge-icon" style={{ color: '#F59E0B' }}></i>
                            <span>Same-day service</span>
                        </div>
                        <div className="trust-badge">
                            <i className="fas fa-star badge-icon" style={{ color: '#FBBF24' }}></i>
                            <span>5-star ratings</span>
                        </div>
                        <div className="trust-badge">
                            <i className="fas fa-location-dot badge-icon" style={{ color: '#EF4444' }}></i>
                            <span>All townships</span>
                        </div>
                        <div className="trust-badge">
                            <i className="fas fa-mobile-screen-button badge-icon" style={{ color: '#8B5CF6' }}></i>
                            <span>USSD supported</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="categories-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">
                            <i className="fas fa-magnifying-glass title-icon"></i>
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
                                    <i className={`${category.icon} category-icon`}></i>
                                </div>
                                <div className="category-info">
                                    <h3 className="category-name">{category.name}</h3>
                                    <p className="category-description">{category.description}</p>
                                    <span className="category-jobs-badge">
                                        {category.jobs} jobs now
                                    </span>
                                </div>
                                <div className="category-arrow"><i className="fas fa-arrow-right"></i></div>
                            </Link>
                        ))}
                    </div>
                    
                    <div className="categories-cta">
                        <Link to="/jobs" className="btn-outline">
                            View All Categories <i className="fas fa-arrow-right"></i>
                        </Link>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">How it works — <span className="highlight">sharp sharp!</span></h2>
                        <p className="section-subtitle">Three simple steps to get things done in your kasi</p>
                    </div>
                    
                    <div className="steps-grid-modern">
                        {steps.map((step, index) => (
                            <div key={index} className="step-card-modern">
                                <div className="step-number" style={{ background: step.color }}>{step.number}</div>
                                <div className="step-icon-wrapper">
                                    <i className={`${step.icon} step-icon`} style={{ color: step.color }}></i>
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                                <div className="step-example">"{step.example}"</div>
                            </div>
                        ))}
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
                            View All <i className="fas fa-arrow-right"></i>
                        </Link>
                    </div>
                    
                    {loading.jobs ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading opportunities...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-inbox empty-icon"></i>
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
                                            <i className="fas fa-location-dot"></i>
                                            <span>{job.township || 'Kasi'}</span>
                                        </div>
                                        <div className="job-budget">
                                            <i className="fas fa-coin"></i>
                                            <span>R{job.budget_min} - R{job.budget_max}</span>
                                        </div>
                                    </div>
                                    <div className="job-applications">
                                        <span className="applications-count">
                                            <i className="fas fa-users" style={{ marginRight: '5px' }}></i>
                                            {job.application_count || 0} applicants
                                        </span>
                                        <span className="job-apply-link">Apply <i className="fas fa-arrow-right"></i></span>
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
                                    <i className="fas fa-quote-right testimonial-quote"></i>
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
                            <i className={statIcons.workers} style={{ fontSize: '48px', color: '#FF6B35', marginBottom: '16px' }}></i>
                            <div className="counter-number">
                                {loading.stats ? '...' : formatNumber(stats.workers)}
                            </div>
                            <div className="counter-label">Active Hustlers</div>
                        </div>
                        <div className="counter-card">
                            <i className={statIcons.jobsDone} style={{ fontSize: '48px', color: '#10B981', marginBottom: '16px' }}></i>
                            <div className="counter-number">
                                {loading.stats ? '...' : formatNumber(stats.completed_jobs || stats.total_hires)}
                            </div>
                            <div className="counter-label">Jobs Completed</div>
                        </div>
                        <div className="counter-card">
                            <i className={statIcons.revenue} style={{ fontSize: '48px', color: '#F59E0B', marginBottom: '16px' }}></i>
                            <div className="counter-number">
                                R{loading.stats ? '...' : formatNumber(stats.total_revenue)}
                            </div>
                            <div className="counter-label">Paid to Hustlers</div>
                        </div>
                        <div className="counter-card">
                            <i className={statIcons.townships} style={{ fontSize: '48px', color: '#8B5CF6', marginBottom: '16px' }}></i>
                            <div className="counter-number">
                                {loading.stats ? '...' : '15+'}
                            </div>
                            <div className="counter-label">Townships Covered</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* USSD Section */}
            <section className="ussd-feature-section">
                <div className="container">
                    <div className="ussd-card">
                        <div className="ussd-icon">
                            <i className="fas fa-mobile-screen-button" style={{ fontSize: '60px', color: '#FF6B35' }}></i>
                        </div>
                        <div className="ussd-content">
                            <h2>No smartphone? <span className="highlight">No stress!</span></h2>
                            <p>Use any phone — even a mzansi phone — to find work or post jobs</p>
                            <div className="ussd-code-box">
                                <span className="ussd-label">Dial:</span>
                                <span className="ussd-number">*130*469#</span>
                                <span className="ussd-free">FREE</span>
                            </div>
                            <div className="ussd-features">
                                <span><i className="fas fa-wifi" style={{ marginRight: '5px' }}></i> No data needed</span>
                                <span><i className="fas fa-globe" style={{ marginRight: '5px' }}></i> Works on all networks</span>
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
                                <i className="fas fa-rocket btn-icon"></i>
                                Start Hustling
                            </Link>
                            <Link to="/jobs/post" className="btn-cta-secondary">
                                <i className="fas fa-pen-to-square btn-icon"></i>
                                Post a Job
                            </Link>
                        </div>
                        <div className="cta-footer">
                            <i className="fas fa-bolt"></i> Free to join • No hidden fees • 100% mzansi
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;