-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== USERS TABLES ==========
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    user_type VARCHAR(20) CHECK (user_type IN ('worker', 'client', 'partner', 'admin')),
    id_number VARCHAR(13),
    date_of_birth DATE,
    gender VARCHAR(10),
    township VARCHAR(100),
    address TEXT,
    profile_picture TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worker specific details
CREATE TABLE worker_profiles (
    id UUID PRIMARY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    primary_skill VARCHAR(100),
    skills TEXT[], -- Array of skills
    experience_years INTEGER,
    tools_available TEXT[],
    hourly_rate_min INTEGER,
    hourly_rate_max INTEGER,
    available_days TEXT[], -- ['Mon', 'Tue', 'Wed'...]
    available_hours VARCHAR(50), -- '9am-5pm'
    travel_radius_km INTEGER DEFAULT 5,
    work_photos TEXT[], -- URLs to work photos
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client specific details
CREATE TABLE client_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferred_payment_method VARCHAR(20),
    address_lat DECIMAL(10,8),
    address_lng DECIMAL(11,8),
    favorite_workers UUID[], -- Array of worker IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== VERIFICATION SYSTEM ==========
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) CHECK (purpose IN ('registration', 'login', 'reset', 'verification')),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partner_shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(100),
    owner_phone VARCHAR(20),
    shop_phone VARCHAR(20),
    address TEXT NOT NULL,
    township VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    shop_type VARCHAR(50),
    operating_hours TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    verification_count INTEGER DEFAULT 0,
    total_payout DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES partner_shops(id),
    verification_type VARCHAR(50) CHECK (verification_type IN ('id', 'community', 'tools', 'background')),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== JOBS SYSTEM ==========
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_code VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    address TEXT,
    township VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    budget_min INTEGER,
    budget_max INTEGER,
    estimated_hours INTEGER,
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) CHECK (status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed')) DEFAULT 'posted',
    preferred_date DATE,
    preferred_time VARCHAR(50),
    materials_provided BOOLEAN DEFAULT FALSE,
    materials_description TEXT,
    safety_requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(20) CHECK (photo_type IN ('before', 'during', 'after', 'issue')),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    proposed_rate INTEGER,
    estimated_completion_time VARCHAR(100),
    message TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agreed_rate INTEGER NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('assigned', 'started', 'completed', 'cancelled')) DEFAULT 'assigned',
    completion_notes TEXT,
    client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
    worker_satisfaction INTEGER CHECK (worker_satisfaction >= 1 AND worker_satisfaction <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== PAYMENTS SYSTEM ==========
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'eft', 'mobile_money', 'card')),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('job_payment', 'subscription', 'withdrawal', 'refund', 'bonus')),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    reference VARCHAR(100),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) CHECK (plan_type IN ('free', 'basic', 'premium', 'business')),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== RATINGS & REVIEWS ==========
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_type VARCHAR(20) CHECK (review_type IN ('client_to_worker', 'worker_to_client')),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) CHECK (status IN ('pending', 'published', 'reported', 'removed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== SAFETY & DISPUTES ==========
CREATE TABLE safety_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    report_type VARCHAR(50) CHECK (report_type IN ('safety', 'harassment', 'fraud', 'poor_work', 'no_show', 'payment_issue')),
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status VARCHAR(20) CHECK (status IN ('submitted', 'investigating', 'resolved', 'dismissed')) DEFAULT 'submitted',
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES users(id),
    dispute_type VARCHAR(50),
    description TEXT NOT NULL,
    requested_resolution TEXT,
    status VARCHAR(20) CHECK (status IN ('open', 'mediation', 'resolved', 'escalated')) DEFAULT 'open',
    assigned_ambassador UUID REFERENCES users(id),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ========== NOTIFICATIONS ==========
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50),
    title VARCHAR(200),
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    channel VARCHAR(20) CHECK (channel IN ('in_app', 'sms', 'email', 'push')) DEFAULT 'in_app',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== USSD/SMS LOGS ==========
CREATE TABLE ussd_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    service_code VARCHAR(20),
    text TEXT,
    network_code VARCHAR(50),
    response TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
    message_id VARCHAR(100),
    cost DECIMAL(6,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== INDEXES ==========
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_township ON users(township);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_township ON jobs(township);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX idx_verifications_user_id ON verifications(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX idx_payments_job_id ON payments(job_id);

-- ========== FUNCTIONS & TRIGGERS ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate job codes
CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.job_code := 'KC' || to_char(NEW.created_at, 'YYMMDD') || '-' || 
                   LPAD(CAST(nextval('job_code_seq') AS VARCHAR), 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE job_code_seq START 1;
CREATE TRIGGER set_job_code BEFORE INSERT ON jobs
    FOR EACH ROW EXECUTE FUNCTION generate_job_code();