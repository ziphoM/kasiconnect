-- ========================================
-- KASICONNECT COMPLETE DATABASE SCHEMA
-- ========================================

-- Enable UUID extension (MySQL alternative)
-- MySQL doesn't have UUID generation like PostgreSQL
-- We'll let PHPMyAdmin handle IDs automatically

-- ========== USERS TABLES ==========
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    user_type ENUM('worker', 'client', 'partner', 'admin') DEFAULT 'worker',
    id_number VARCHAR(13),
    date_of_birth DATE,
    gender VARCHAR(10),
    township VARCHAR(100),
    address TEXT,
    profile_picture TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level INT DEFAULT 0,
    trust_score INT DEFAULT 50,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_user_type (user_type),
    INDEX idx_township (township)
);

-- Worker specific details
CREATE TABLE worker_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    primary_skill VARCHAR(100),
    experience_years INT DEFAULT 0,
    hourly_rate_min INT DEFAULT 100,
    hourly_rate_max INT DEFAULT 300,
    available_days VARCHAR(100), -- 'Mon,Tue,Wed'
    available_hours VARCHAR(50), -- '9am-5pm'
    travel_radius_km INT DEFAULT 5,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_skill (primary_skill)
);

-- Client specific details
CREATE TABLE client_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    preferred_payment_method VARCHAR(20) DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========== VERIFICATION SYSTEM ==========
CREATE TABLE verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose ENUM('registration', 'login', 'reset', 'verification') DEFAULT 'registration',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_code (code),
    INDEX idx_user (user_id)
);

CREATE TABLE partner_shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(100),
    owner_phone VARCHAR(20),
    shop_phone VARCHAR(20),
    address TEXT NOT NULL,
    township VARCHAR(100),
    shop_type VARCHAR(50),
    operating_hours TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    verification_count INT DEFAULT 0,
    total_payout DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_township (township),
    INDEX idx_active (is_active)
);

CREATE TABLE verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shop_id INT,
    verification_type ENUM('id', 'community', 'tools', 'background') DEFAULT 'id',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verified_by INT,
    notes TEXT,
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES partner_shops(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- ========== JOBS SYSTEM ==========
CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_code VARCHAR(20) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    address TEXT,
    township VARCHAR(100),
    budget_min INT,
    budget_max INT,
    estimated_hours INT,
    urgency ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('posted', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed') DEFAULT 'posted',
    preferred_date DATE,
    preferred_time VARCHAR(50),
    materials_provided BOOLEAN DEFAULT FALSE,
    materials_description TEXT,
    safety_requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_township (township),
    INDEX idx_category (category),
    INDEX idx_created (created_at)
);

CREATE TABLE job_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    worker_id INT NOT NULL,
    proposed_rate INT,
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (job_id, worker_id),
    INDEX idx_status (status)
);

CREATE TABLE job_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT UNIQUE NOT NULL,
    worker_id INT NOT NULL,
    agreed_rate INT NOT NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    status ENUM('assigned', 'started', 'completed', 'cancelled') DEFAULT 'assigned',
    completion_notes TEXT,
    client_satisfaction INT,
    worker_satisfaction INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status)
);

-- ========== VOUCHER SYSTEM ==========
CREATE TABLE voucher_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    face_value DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    validity_days INT DEFAULT 365,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_code VARCHAR(20) UNIQUE NOT NULL,
    pin_code VARCHAR(6),
    template_id INT,
    face_value DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    issued_to INT,
    issued_by INT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status ENUM('issued', 'active', 'partially_used', 'used', 'expired', 'cancelled') DEFAULT 'issued',
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES voucher_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (voucher_code),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
);

CREATE TABLE voucher_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT NOT NULL,
    job_id INT,
    user_id INT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type ENUM('activation', 'redemption', 'refund', 'transfer') DEFAULT 'redemption',
    previous_balance DECIMAL(10,2),
    new_balance DECIMAL(10,2),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_voucher (voucher_id)
);

-- ========== PAYMENTS SYSTEM ==========
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    voucher_id INT,
    payment_method ENUM('cash', 'eft', 'mobile_money', 'card', 'voucher') DEFAULT 'cash',
    transaction_type ENUM('job_payment', 'subscription', 'withdrawal', 'refund', 'bonus') DEFAULT 'job_payment',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    reference VARCHAR(100),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_from_user (from_user_id)
);

-- ========== RATINGS & REVIEWS ==========
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_type ENUM('client_to_worker', 'worker_to_client') DEFAULT 'client_to_worker',
    comment TEXT,
    status ENUM('pending', 'published', 'reported', 'removed') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_rating (rating)
);

-- ========== SAFETY & DISPUTES ==========
CREATE TABLE safety_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    reported_user_id INT,
    job_id INT,
    report_type ENUM('safety', 'harassment', 'fraud', 'poor_work', 'no_show', 'payment_issue') DEFAULT 'safety',
    description TEXT NOT NULL,
    status ENUM('submitted', 'investigating', 'resolved', 'dismissed') DEFAULT 'submitted',
    resolved_by INT,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- ========== NOTIFICATIONS ==========
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type VARCHAR(50),
    title VARCHAR(200),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    channel ENUM('in_app', 'sms', 'email', 'push') DEFAULT 'in_app',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
);

-- ========== USSD/SMS LOGS ==========
CREATE TABLE ussd_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    service_code VARCHAR(20),
    text TEXT,
    network_code VARCHAR(50),
    response TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_phone (phone_number)
);

CREATE TABLE sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    direction ENUM('inbound', 'outbound') DEFAULT 'outbound',
    status ENUM('sent', 'delivered', 'failed', 'received') DEFAULT 'sent',
    message_id VARCHAR(100),
    cost DECIMAL(6,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_status (status)
);

-- ========================================
-- INSERT DEFAULT DATA
-- ========================================

-- Insert test users
INSERT INTO users (phone, name, user_type, township, is_verified, verification_level) VALUES
('27712345678', 'John Gardener', 'worker', 'Soweto', TRUE, 2),
('27787654321', 'Sarah Client', 'client', 'Soweto', TRUE, 1),
('27711111111', 'Mike Builder', 'worker', 'Alexandra', TRUE, 3),
('27722222222', 'Thabo Painter', 'worker', 'Soweto', TRUE, 2),
('27733333333', 'Lerato Plumber', 'worker', 'Khayelitsha', TRUE, 1),
('27744444444', 'Peter Client', 'client', 'Soweto', TRUE, 1),
('27755555555', 'Grace Client', 'client', 'Alexandra', TRUE, 1);

-- Insert worker profiles
INSERT INTO worker_profiles (user_id, primary_skill, experience_years, hourly_rate_min, hourly_rate_max, rating, total_jobs, completed_jobs) VALUES
(1, 'Gardening', 5, 150, 300, 4.8, 25, 23),
(3, 'Building', 8, 250, 500, 4.9, 42, 41),
(4, 'Painting', 4, 200, 350, 4.5, 15, 14),
(5, 'Plumbing', 6, 300, 600, 4.7, 30, 29);

-- Insert client profiles
INSERT INTO client_profiles (user_id, preferred_payment_method) VALUES
(2, 'cash'),
(6, 'cash'),
(7, 'mobile_money');

-- Insert partner shops
INSERT INTO partner_shops (shop_name, owner_name, owner_phone, shop_phone, address, township, shop_type, is_active) VALUES
('Mama Nandi Spaza', 'Nandi Mkhize', '27766666666', '27766666666', '123 Orlando West, Soweto', 'Soweto', 'Spaza Shop', TRUE),
('Bheki Hardware', 'Bheki Khumalo', '27777777777', '27777777777', '456 Diepkloof, Soweto', 'Soweto', 'Hardware Store', TRUE),
('Sipho General Dealer', 'Sipho Dlamini', '27788888888', '27788888888', '789 Alexandra, Johannesburg', 'Alexandra', 'General Dealer', TRUE);

-- Insert voucher templates
INSERT INTO voucher_templates (name, description, face_value, selling_price, validity_days) VALUES
('Small Job Voucher', 'Perfect for small gardening or cleaning jobs', 200.00, 190.00, 90),
('Standard Voucher', 'Good for half-day work', 500.00, 475.00, 180),
('Premium Voucher', 'Ideal for full-day or skilled work', 1000.00, 950.00, 365);

-- Insert test vouchers
INSERT INTO vouchers (voucher_code, pin_code, template_id, face_value, current_balance, issued_to, expires_at, status) VALUES
('KC-S-ABCD-1234', '123456', 1, 200.00, 200.00, 2, DATE_ADD(NOW(), INTERVAL 90 DAY), 'active'),
('KC-G-EFGH-5678', '789012', 2, 500.00, 500.00, 6, DATE_ADD(NOW(), INTERVAL 180 DAY), 'active'),
('KC-P-IJKL-9012', '345678', 3, 1000.00, 1000.00, 7, DATE_ADD(NOW(), INTERVAL 365 DAY), 'active');

-- Insert test jobs
INSERT INTO jobs (job_code, client_id, title, description, category, township, budget_min, budget_max, status, urgency) VALUES
('KC240101-0001', 2, 'Garden Cleaning', 'Need garden cleaned, grass cut, and leaves removed. Small garden in Orlando.', 'Gardening', 'Soweto', 300, 500, 'posted', 'medium'),
('KC240101-0002', 2, 'Room Painting', 'Paint small bedroom (3m x 4m). Paint provided. Need good finish.', 'Painting', 'Soweto', 800, 1200, 'posted', 'high'),
('KC240102-0003', 6, 'Fix Leaking Tap', 'Kitchen tap leaking. Need plumber to fix/replace.', 'Plumbing', 'Soweto', 400, 800, 'posted', 'urgent'),
('KC240102-0004', 7, 'Build Garden Wall', 'Small garden wall collapsed. Need builder to rebuild (approx 5m).', 'Building', 'Alexandra', 2000, 3500, 'posted', 'medium'),
('KC240103-0005', 2, 'Deep Clean', 'Deep clean of 2-bedroom house. Need thorough cleaning.', 'Cleaning', 'Soweto', 500, 900, 'posted', 'low');

-- Insert job applications
INSERT INTO job_applications (job_id, worker_id, proposed_rate, message, status) VALUES
(1, 1, 350, 'I can do this job. I have 5 years gardening experience.', 'pending'),
(1, 4, 400, 'Available tomorrow. I do good work.', 'pending'),
(2, 4, 950, 'Professional painter. I can do it in one day.', 'pending'),
(3, 5, 600, 'Qualified plumber. Can come today.', 'pending'),
(4, 3, 2800, 'I specialize in wall building. Quality work guaranteed.', 'pending');

-- Insert reviews
INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, review_type, comment) VALUES
(1, 2, 1, 5, 'client_to_worker', 'John did excellent work. Garden looks beautiful!'),
(2, 2, 4, 4, 'client_to_worker', 'Good job, but finished a bit late.'),
(3, 6, 5, 5, 'client_to_worker', 'Fixed quickly and cleanly. Professional.');

-- Insert sample notifications
INSERT INTO notifications (user_id, notification_type, title, message, channel) VALUES
(1, 'job_alert', 'New Job Alert', 'New gardening job in Soweto. Budget R300-500', 'in_app'),
(2, 'application', 'Application Received', 'John Gardener applied for your job', 'in_app'),
(3, 'payment', 'Payment Received', 'You received R950 for painting job', 'sms');

-- Insert sample USSD session
INSERT INTO ussd_sessions (session_id, phone_number, service_code, text, response) VALUES
('TEST123456', '27712345678', '*130*469#', '1', 'CON Welcome to KasiConnect');

-- Insert sample SMS log
INSERT INTO sms_logs (phone_number, message, direction, status) VALUES
('27712345678', 'Welcome to KasiConnect! Your code: 123456', 'outbound', 'sent');

-- ========================================
-- Create some useful views
-- ========================================

CREATE VIEW active_jobs AS
SELECT 
    j.*,
    u.name as client_name,
    COUNT(ja.id) as application_count
FROM jobs j
LEFT JOIN users u ON j.client_id = u.id
LEFT JOIN job_applications ja ON j.id = ja.job_id
WHERE j.status = 'posted'
GROUP BY j.id;

CREATE VIEW worker_stats AS
SELECT 
    u.id,
    u.name,
    u.phone,
    u.township,
    wp.primary_skill,
    wp.rating,
    wp.total_jobs,
    wp.completed_jobs,
    (SELECT COUNT(*) FROM jobs WHERE worker_id = u.id AND status = 'completed') as jobs_completed,
    (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating
FROM users u
LEFT JOIN worker_profiles wp ON u.id = wp.user_id
WHERE u.user_type = 'worker';

-- ========================================
-- Create stored procedures
-- ========================================

DELIMITER $$

CREATE PROCEDURE GetAvailableJobs(IN worker_id INT)
BEGIN
    SELECT 
        j.*,
        u.name as client_name,
        (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = j.id) as total_applications
    FROM jobs j
    JOIN users u ON j.client_id = u.id
    WHERE j.status = 'posted'
    AND j.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY j.created_at DESC;
END$$

CREATE PROCEDURE ApplyForJob(
    IN p_job_id INT,
    IN p_worker_id INT,
    IN p_proposed_rate INT,
    IN p_message TEXT
)
BEGIN
    DECLARE job_exists INT;
    
    -- Check if job exists and is still open
    SELECT COUNT(*) INTO job_exists FROM jobs 
    WHERE id = p_job_id AND status = 'posted';
    
    IF job_exists > 0 THEN
        INSERT INTO job_applications (job_id, worker_id, proposed_rate, message)
        VALUES (p_job_id, p_worker_id, p_proposed_rate, p_message);
        
        SELECT 'Application submitted successfully' as message, LAST_INSERT_ID() as application_id;
    ELSE
        SELECT 'Job not available' as error;
    END IF;
END$$

DELIMITER ;

-- Show success message
SELECT 'Database setup complete!' as message;
SELECT CONCAT('Users created: ', COUNT(*)) as info FROM users;
SELECT CONCAT('Jobs created: ', COUNT(*)) as info FROM jobs;
SELECT CONCAT('Vouchers created: ', COUNT(*)) as info FROM vouchers;