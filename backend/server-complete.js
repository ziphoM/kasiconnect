// backend/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database connection
const { pool, testConnection } = require('./db');

const app = express();

// ========== MIDDLEWARE ==========
// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'https://kasiconnect-frontend.onrender.com',
    'https://kasiconnect.onrender.com',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ Blocked CORS request from:', origin);
            callback(new Error('CORS not allowed from this origin'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ========== DATABASE CONNECTION ==========
// Test connection on startup
testConnection().then(success => {
    if (!success) {
        console.warn('⚠️ Server starting but database connection failed!');
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT VERSION() as version');
        res.json({ 
            success: true,
            status: 'connected', 
            version: rows[0].version,
            database: process.env.TIDB_DATABASE,
            message: '✅ Connected to TiDB Cloud!' 
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false,
            status: 'error', 
            message: error.message 
        });
    }
});

// ========== CREATE UPLOAD DIRECTORIES ==========
const uploadDirs = ['uploads/workers', 'uploads/clients'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created upload directory: ${dir}`);
    }
});

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'kasiconnect-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Valid SA phone number required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('user_type').isIn(['worker', 'client']).withMessage('Valid user type required'),
    body('township').notEmpty().withMessage('Township is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { name, phone, password, user_type, township, id_number } = req.body;

        // Check if user exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE phone = ?',
            [phone]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number already registered' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.execute(
            `INSERT INTO users 
             (phone, name, user_type, township, id_number, password, is_verified, verification_level) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [phone, name, user_type, township, id_number || null, hashedPassword, false, 0]
        );

        const userId = result.insertId;

        // Create profile based on user type
        if (user_type === 'worker') {
            await pool.execute(
                `INSERT INTO worker_profiles 
                 (user_id, primary_skill, hourly_rate_min, hourly_rate_max, travel_radius_km) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, 'Not specified', 100, 300, 5]
            );
        } else if (user_type === 'client') {
            await pool.execute(
                'INSERT INTO client_profiles (user_id, preferred_payment_method) VALUES (?, ?)',
                [userId, 'cash']
            );
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: userId, 
                userType: user_type, 
                phone: phone, 
                name: name 
            },
            process.env.JWT_SECRET || 'kasiconnect-secret-key',
            { expiresIn: '7d' }
        );

        // Get the created user
        const [newUser] = await pool.execute(
            'SELECT id, phone, name, user_type, township, is_verified, verification_level FROM users WHERE id = ?',
            [userId]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                ...newUser[0],
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration',
            error: error.message 
        });
    }
});

// Login
app.post('/api/auth/login', [
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { phone, password } = req.body;

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE phone = ?',
            [phone]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or password' 
            });
        }

        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or password' 
            });
        }

        // Get worker profile if applicable
        let profile = null;
        if (user.user_type === 'worker') {
            const [profiles] = await pool.execute(
                'SELECT * FROM worker_profiles WHERE user_id = ?',
                [user.id]
            );
            profile = profiles[0] || null;
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user.id, 
                userType: user.user_type, 
                phone: user.phone, 
                name: user.name 
            },
            process.env.JWT_SECRET || 'kasiconnect-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                user_type: user.user_type,
                township: user.township,
                is_verified: user.is_verified,
                verification_level: user.verification_level,
                profile,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login',
            error: error.message 
        });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, phone, name, user_type, township, is_verified, verification_level, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = users[0];

        // Get profile based on type
        let profile = null;
        if (user.user_type === 'worker') {
            const [profiles] = await pool.execute(
                'SELECT * FROM worker_profiles WHERE user_id = ?',
                [user.id]
            );
            profile = profiles[0] || null;
        } else if (user.user_type === 'client') {
            const [profiles] = await pool.execute(
                'SELECT * FROM client_profiles WHERE user_id = ?',
                [user.id]
            );
            profile = profiles[0] || null;
        }

        res.json({
            success: true,
            data: { ...user, profile }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// ========== STATS API ENDPOINT ==========
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 Stats API called');

        const [workerCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE user_type = "worker"'
        );

        const [clientCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE user_type = "client"'
        );

        const [totalJobs] = await pool.execute(
            'SELECT COUNT(*) as count FROM jobs'
        );

        const [activeJobs] = await pool.execute(
            'SELECT COUNT(*) as count FROM jobs WHERE status = "posted"'
        );

        const [completedJobs] = await pool.execute(
            `SELECT COUNT(*) as count FROM job_hires WHERE status = 'completed'`
        );

        const [totalHires] = await pool.execute(
            `SELECT COUNT(*) as count FROM job_hires`
        );

        // REVENUE FROM WORKER PASSES
        const [workerPassRevenue] = await pool.execute(
            `SELECT COALESCE(SUM(amount_paid), 0) as total FROM worker_application_passes WHERE status = 'active' OR status = 'used'`
        );

        // REVENUE FROM CLIENT PACKAGES
        const [clientPackageRevenue] = await pool.execute(
            `SELECT COALESCE(SUM(amount_paid), 0) as total FROM client_hire_packages`
        );

        const totalRevenue = parseFloat(workerPassRevenue[0].total) + parseFloat(clientPackageRevenue[0].total);

        const [workerPasses] = await pool.execute(
            `SELECT COUNT(*) as count FROM worker_application_passes`
        );

        const [clientPackages] = await pool.execute(
            `SELECT COUNT(*) as count FROM client_hire_packages`
        );

        console.log('✅ Stats fetched successfully');
        console.log(`💰 Revenue breakdown - Worker Passes: R${workerPassRevenue[0].total}, Client Packages: R${clientPackageRevenue[0].total}, Total: R${totalRevenue}`);

        const stats = {
            workers: workerCount[0].count || 0,
            clients: clientCount[0].count || 0,
            total_jobs: totalJobs[0].count || 0,
            active_jobs: activeJobs[0].count || 0,
            completed_jobs: completedJobs[0].count || 0,
            total_hires: totalHires[0].count || 0,
            total_revenue: totalRevenue,
            worker_passes_sold: workerPasses[0].count || 0,
            client_packages_sold: clientPackages[0].count || 0
        };

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch stats',
            error: error.message 
        });
    }
});

// ========== JOBS ROUTES ==========

// Get all jobs (public)
app.get('/api/jobs', async (req, res) => {
    try {
        const { township, category, status = 'posted' } = req.query;
        
        console.log('📥 Jobs request received:', { township, category, status });

        let query = `
            SELECT j.*, 
                   u.name as client_name, 
                   u.phone as client_phone,
                   u.profile_picture as client_profile_picture,
                   (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as application_count
            FROM jobs j
            LEFT JOIN users u ON j.client_id = u.id
            WHERE j.status = ?
        `;
        const params = [status];

        if (township) {
            query += ' AND j.township = ?';
            params.push(township);
        }

        if (category) {
            query += ' AND j.category = ?';
            params.push(category);
        }

        query += ' ORDER BY j.created_at DESC LIMIT 50';

        console.log('📝 Executing query:', query);
        console.log('📝 With params:', params);

        const [jobs] = await pool.execute(query, params);
        
        console.log(`✅ Found ${jobs.length} jobs`);

        // Construct full URLs for profile pictures
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        jobs.forEach(job => {
            if (job.client_profile_picture) {
                job.client_profile_picture = job.client_profile_picture.startsWith('http') 
                    ? job.client_profile_picture 
                    : `${baseUrl}${job.client_profile_picture}`;
            }
        });

        res.json({ success: true, data: jobs });

    } catch (error) {
        console.error('❌❌❌ JOBS ENDPOINT ERROR ❌❌❌');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error sql:', error.sql);
        console.error('Error sqlMessage:', error.sqlMessage);
        console.error('Full error:', error);
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch jobs',
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        const [jobs] = await pool.execute(
            `SELECT j.*, 
                    u.name as client_name, 
                    u.phone as client_phone,
                    u.email as client_email,
                    u.township as client_township,
                    u.profile_picture as client_profile_picture,
                    w.name as worker_name,
                    w.phone as worker_phone,
                    w.email as worker_email,
                    wp.rating as worker_rating
             FROM jobs j
             LEFT JOIN users u ON j.client_id = u.id
             LEFT JOIN users w ON j.hired_worker_id = w.id
             LEFT JOIN worker_profiles wp ON j.hired_worker_id = wp.user_id
             WHERE j.id = ?`,
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }

        const job = jobs[0];
        
        // Construct full URL for client profile picture
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (job.client_profile_picture) {
            job.client_profile_picture = job.client_profile_picture.startsWith('http') 
                ? job.client_profile_picture 
                : `${baseUrl}${job.client_profile_picture}`;
        }

        // Get applications
        const [applications] = await pool.execute(
            `SELECT ja.*, 
                    u.name as worker_name, 
                    u.phone as worker_phone,
                    u.profile_picture as worker_profile_picture,
                    wp.primary_skill,
                    wp.rating
             FROM job_applications ja
             LEFT JOIN users u ON ja.worker_id = u.id
             LEFT JOIN worker_profiles wp ON ja.worker_id = wp.user_id
             WHERE ja.job_id = ?
             ORDER BY ja.created_at DESC`,
            [jobId]
        );

        // Structure the response
        const responseData = {
            ...job,
            applications: applications,
            hired_worker: job.hired_worker_id ? {
                id: job.hired_worker_id,
                name: job.worker_name,
                phone: job.worker_phone,
                email: job.worker_email,
                rating: job.worker_rating,
                profile_picture: job.worker_profile_picture
            } : null
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('❌ Get job error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch job',
            error: error.message 
        });
    }
});

// Create job (clients only)
app.post('/api/jobs', authenticateToken, async (req, res) => {
    try {
        const {
            title, description, category, subcategory,
            township, address, budget_min, budget_max,
            estimated_hours, urgency, preferred_date,
            preferred_time, materials_provided, materials_description,
            safety_requirements
        } = req.body;

        const clientId = req.user.userId;

        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only clients can post jobs' 
            });
        }

        const date = new Date();
        const dateStr = date.getFullYear().toString().slice(-2) +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');

        const [seqResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM jobs WHERE job_code LIKE ?',
            [`KC${dateStr}%`]
        );

        const seq = (seqResult[0].count + 1).toString().padStart(4, '0');
        const jobCode = `KC${dateStr}-${seq}`;

        const [result] = await pool.execute(
            `INSERT INTO jobs (
                job_code, client_id, title, description, category, subcategory,
                township, address, budget_min, budget_max, estimated_hours,
                urgency, preferred_date, preferred_time, materials_provided,
                materials_description, safety_requirements, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')`,
            [
                jobCode, clientId, title, description, category, subcategory || null,
                township, address || null, budget_min, budget_max, estimated_hours || null,
                urgency || 'medium', preferred_date || null, preferred_time || null,
                materials_provided || false, materials_description || null, safety_requirements || null
            ]
        );

        res.json({
            success: true,
            message: 'Job posted successfully',
            data: {
                id: result.insertId,
                job_code: jobCode
            }
        });

    } catch (error) {
        console.error('❌ Create job error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create job',
            error: error.message 
        });
    }
});

// ========== JOB APPLICATION ENDPOINT ==========
app.post('/api/jobs/:id/apply', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const jobId = req.params.id;
        const workerId = req.user.userId;
        const { proposed_rate, message } = req.body;

        console.log('='.repeat(50));
        console.log('📝 JOB APPLICATION REQUEST');
        console.log('Job ID:', jobId);
        console.log('Worker ID:', workerId);
        console.log('Proposed Rate:', proposed_rate);
        console.log('Message:', message);
        console.log('='.repeat(50));

        // Validate user type
        if (req.user.userType !== 'worker') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Only workers can apply for jobs' 
            });
        }

        // Validate required fields
        if (!proposed_rate || proposed_rate <= 0) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid proposed rate' 
            });
        }

        await connection.beginTransaction();

        // Check if job exists and is posted
        const [jobs] = await connection.execute(
            'SELECT * FROM jobs WHERE id = ? AND status = "posted"',
            [jobId]
        );

        if (jobs.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Job not available' 
            });
        }

        const job = jobs[0];

        // Validate proposed rate is within job budget
        if (proposed_rate < job.budget_min || proposed_rate > job.budget_max) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: `Proposed rate must be between R${job.budget_min} and R${job.budget_max}` 
            });
        }

        // Check if worker has an active pass
        const [passes] = await connection.execute(
            `SELECT * FROM worker_application_passes 
             WHERE worker_id = ? AND status = 'active' 
             AND (end_date IS NULL OR end_date > NOW())
             AND (unlimited = TRUE OR applications_remaining > 0)
             ORDER BY end_date ASC LIMIT 1`,
            [workerId]
        );

        if (passes.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'You need an active application pass to apply for jobs',
                requires_pass: true
            });
        }

        const pass = passes[0];

        // Check if already applied
        const [existing] = await connection.execute(
            'SELECT id FROM job_applications WHERE job_id = ? AND worker_id = ?',
            [jobId, workerId]
        );

        if (existing.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'You have already applied for this job' 
            });
        }

        // Deduct one application if not unlimited
        if (!pass.unlimited) {
            await connection.execute(
                'UPDATE worker_application_passes SET applications_remaining = applications_remaining - 1 WHERE id = ?',
                [pass.id]
            );
        }

        // Create application
        const [result] = await connection.execute(
            `INSERT INTO job_applications 
             (job_id, worker_id, pass_id, proposed_rate, message, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [jobId, workerId, pass.id, proposed_rate, message || null]
        );

        await connection.commit();
        connection.release();

        console.log('✅ Application submitted successfully. ID:', result.insertId);

        res.json({
            success: true,
            message: 'Application submitted successfully',
            data: { 
                id: result.insertId,
                applications_remaining: pass.unlimited ? 'Unlimited' : (pass.applications_remaining - 1)
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Apply error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit application',
            error: error.message 
        });
    }
});

// ========== FIXED HIRE WORKER ENDPOINT ==========
app.post('/api/jobs/:jobId/hire', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { jobId } = req.params;
        const clientId = req.user.userId;
        const { worker_id, agreed_rate } = req.body;

        console.log('='.repeat(50));
        console.log('🤝 HIRE WORKER REQUEST');
        console.log('Job ID:', jobId);
        console.log('Client ID:', clientId);
        console.log('Worker ID:', worker_id);
        console.log('Agreed Rate:', agreed_rate);
        console.log('='.repeat(50));

        await connection.beginTransaction();

        // 1. Verify job belongs to client and is still open
        const [jobs] = await connection.execute(
            `SELECT * FROM jobs WHERE id = ? AND client_id = ? AND status = 'posted'`,
            [jobId, clientId]
        );

        if (jobs.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found or already assigned' 
            });
        }

        const job = jobs[0];

        // 2. Check client's active packages with credits
        const [packages] = await connection.execute(
            `SELECT * FROM client_hire_packages 
            WHERE client_id = ? AND status = 'active' 
            AND (valid_until IS NULL OR valid_until > NOW())
            AND (unlimited = TRUE OR hires_remaining > 0)
            ORDER BY 
                CASE WHEN unlimited = true THEN 0 ELSE 1 END,
                created_at ASC`,
            [clientId]
        );

        console.log('Found packages:', packages.length);

        if (packages.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient hire credits. Please purchase a package.',
                needs_credits: true
            });
        }

        // 3. Find a package to use
        let usedPackage = null;
        for (const pkg of packages) {
            if (pkg.unlimited || pkg.hires_remaining > 0) {
                usedPackage = pkg;
                break;
            }
        }

        if (!usedPackage) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'No active packages with available credits',
                needs_credits: true
            });
        }

        console.log('Using package:', usedPackage.id);

        // 4. Update package credits
        if (!usedPackage.unlimited) {
            const newRemaining = usedPackage.hires_remaining - 1;
            const newStatus = newRemaining === 0 ? 'used' : 'active';
            
            await connection.execute(
                `UPDATE client_hire_packages 
                SET hires_remaining = ?,
                    status = ?
                WHERE id = ?`,
                [newRemaining, newStatus, usedPackage.id]
            );
            console.log(`Package updated: ${newRemaining} remaining, status: ${newStatus}`);
        } else {
            console.log('Unlimited package used - no deduction');
        }

        // 5. Update job status and hired_worker_id
        await connection.execute(
            `UPDATE jobs SET status = 'hired', hired_worker_id = ? WHERE id = ?`,
            [worker_id, jobId]
        );
        console.log('Job status updated to hired');

        // 6. Update the selected application to 'accepted'
        await connection.execute(
            `UPDATE job_applications SET status = 'accepted' 
            WHERE job_id = ? AND worker_id = ?`,
            [jobId, worker_id]
        );
        console.log('Application accepted');

        // 7. Reject all other applications
        const [rejectResult] = await connection.execute(
            `UPDATE job_applications SET status = 'rejected' 
            WHERE job_id = ? AND worker_id != ?`,
            [jobId, worker_id]
        );
        console.log(`${rejectResult.affectedRows} other applications rejected`);

        // 8. CREATE JOB_HIRES RECORD
        const [hireResult] = await connection.execute(
            `INSERT INTO job_hires 
            (job_id, client_id, worker_id, package_id, hire_fee, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'hired', NOW())`,
            [jobId, clientId, worker_id, usedPackage.id, agreed_rate]
        );
        console.log('✅ Job hire record created with ID:', hireResult.insertId);

        // 9. Reveal worker contact info for this client
        console.log('Revealing worker contact info...');
        await connection.execute(
            `UPDATE worker_profiles 
             SET contact_hidden = 0, 
                 reveal_count = reveal_count + 1 
             WHERE user_id = ?`,
            [worker_id]
        );
        console.log('✅ Worker contact info revealed');

        // 10. Get worker contact info
        const [worker] = await connection.execute(
            `SELECT name, phone, email FROM users WHERE id = ?`,
            [worker_id]
        );

        await connection.commit();
        connection.release();

        console.log('✅ Worker hired successfully');

        res.json({
            success: true,
            message: 'Worker hired successfully',
            data: {
                hire_id: hireResult.insertId,
                worker_name: worker[0].name,
                worker_phone: worker[0].phone,
                worker_email: worker[0].email,
                package_used: usedPackage.package_type
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Hire error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to hire worker',
            error: error.message 
        });
    }
});

// ========== WORKER ROUTES ==========

// Get worker's applications
app.get('/api/worker/applications', authenticateToken, async (req, res) => {
    try {
        const workerId = req.user.userId;

        const [applications] = await pool.execute(
            `SELECT ja.*, 
                    j.title as job_title,
                    j.description as job_description,
                    j.township,
                    j.budget_min,
                    j.budget_max,
                    j.status as job_status,
                    u.name as client_name
             FROM job_applications ja
             JOIN jobs j ON ja.job_id = j.id
             JOIN users u ON j.client_id = u.id
             WHERE ja.worker_id = ?
             ORDER BY ja.created_at DESC`,
            [workerId]
        );

        res.json({ success: true, data: applications });

    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get worker profile
app.get('/api/workers/:id', async (req, res) => {
    try {
        const workerId = req.params.id;
        const requestingUserId = req.user?.userId;
        const requestingUserType = req.user?.userType;

        // Get user data
        const [users] = await pool.execute(
            `SELECT u.id as user_id, u.name, u.phone, u.email, u.township, u.address, 
                    u.profile_picture, u.is_verified, u.verification_level, u.created_at,
                    wp.contact_hidden
             FROM users u
             LEFT JOIN worker_profiles wp ON u.id = wp.user_id
             WHERE u.id = ? AND u.user_type = 'worker'`,
            [workerId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Worker not found' 
            });
        }

        const user = users[0];
        
        // Construct full URL for profile picture
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const profilePictureUrl = user.profile_picture 
            ? (user.profile_picture.startsWith('http') 
                ? user.profile_picture 
                : `${baseUrl}${user.profile_picture}`)
            : null;

        // Determine if contact info should be shown
        let showContact = false;
        
        // Admin always sees contact
        if (requestingUserType === 'admin') {
            showContact = true;
        }
        
        // The worker themselves always sees their own contact
        if (requestingUserId && parseInt(requestingUserId) === parseInt(workerId)) {
            showContact = true;
            console.log('✅ Worker viewing own profile - showing contact');
        }
        
        // Client who hired this worker can see contact
        if (requestingUserType === 'client' && requestingUserId) {
            const [hired] = await pool.execute(
                `SELECT * FROM job_hires 
                 WHERE worker_id = ? AND client_id = ? 
                 AND (status = 'hired' OR status = 'completed')`,
                [workerId, requestingUserId]
            );
            if (hired.length > 0) {
                showContact = true;
                console.log('✅ Client who hired worker - showing contact');
            }
        }

        // Get worker profile
        let profile = {};
        const [profiles] = await pool.execute(
            `SELECT * FROM worker_profiles WHERE user_id = ?`,
            [workerId]
        );
        
        if (profiles.length > 0) {
            profile = profiles[0];
            if (profile.skills && typeof profile.skills === 'string') {
                try {
                    profile.skills = JSON.parse(profile.skills);
                } catch (e) {
                    profile.skills = [];
                }
            }
        }

        // Get reviews
        let reviews = [];
        try {
            const [reviewsResult] = await pool.execute(
                `SELECT r.*, u.name as reviewer_name, j.title as job_title
                 FROM reviews r
                 JOIN users u ON r.reviewer_id = u.id
                 LEFT JOIN jobs j ON r.job_id = j.id
                 WHERE r.reviewee_id = ? AND r.review_type = 'client_to_worker'
                 ORDER BY r.created_at DESC`,
                [workerId]
            );
            reviews = reviewsResult;
        } catch (reviewError) {
            console.log('Error fetching reviews:', reviewError);
        }

        // Prepare response - show actual contact info if allowed
        const workerData = {
            user_id: user.user_id,
            name: user.name,
            // Always include the actual data from database
            phone: user.phone,
            email: user.email || '',
            // But add a flag for frontend to know if it should be displayed
            contact_hidden: !showContact,
            can_view_contact: showContact, // Add this flag
            township: user.township || '',
            address: user.address || '',
            profile_picture: profilePictureUrl,
            is_verified: user.is_verified || false,
            verification_level: user.verification_level || 0,
            created_at: user.created_at,
            // Profile fields
            primary_skill: profile.primary_skill || '',
            skills: profile.skills || [],
            experience_years: profile.experience_years || 0,
            hourly_rate_min: profile.hourly_rate_min || 100,
            hourly_rate_max: profile.hourly_rate_max || 300,
            available_days: profile.available_days || '',
            available_hours: profile.available_hours || '',
            travel_radius_km: profile.travel_radius_km || 5,
            bio: profile.bio || '',
            rating: profile.rating || 0,
            total_jobs: profile.total_jobs || 0,
            completed_jobs: profile.completed_jobs || 0,
            cancellation_rate: profile.cancellation_rate || 0,
            reviews: reviews
        };

        console.log('✅ Worker profile prepared. Show contact:', showContact);
        res.json({ success: true, data: workerData });

    } catch (error) {
        console.error('❌ Get worker error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load worker profile',
            error: error.message 
        });
    }
});

// Update worker profile
app.put('/api/worker/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            name, email, phone, township, address,
            primary_skill, skills, experience_years,
            hourly_rate_min, hourly_rate_max,
            available_days, available_hours,
            travel_radius_km, bio
        } = req.body;

        // Update users table
        await pool.execute(
            `UPDATE users SET 
             name = ?, email = ?, phone = ?, township = ?, address = ?
             WHERE id = ?`,
            [name, email, phone, township, address, userId]
        );

        // Check if profile exists
        const [existing] = await pool.execute(
            'SELECT id FROM worker_profiles WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            await pool.execute(
                `UPDATE worker_profiles SET
                 primary_skill = ?, 
                 skills = ?, 
                 experience_years = ?,
                 hourly_rate_min = ?, 
                 hourly_rate_max = ?,
                 available_days = ?, 
                 available_hours = ?,
                 travel_radius_km = ?, 
                 bio = ?, 
                 updated_at = NOW()
                 WHERE user_id = ?`,
                [
                    primary_skill || null,
                    skills ? JSON.stringify(skills) : null,
                    experience_years || 0,
                    hourly_rate_min || 100,
                    hourly_rate_max || 300,
                    available_days || null,
                    available_hours || null,
                    travel_radius_km || 5,
                    bio || null,
                    userId
                ]
            );
        } else {
            await pool.execute(
                `INSERT INTO worker_profiles 
                 (user_id, primary_skill, skills, experience_years, 
                  hourly_rate_min, hourly_rate_max, available_days, 
                  available_hours, travel_radius_km, bio)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    primary_skill || null,
                    skills ? JSON.stringify(skills) : null,
                    experience_years || 0,
                    hourly_rate_min || 100,
                    hourly_rate_max || 300,
                    available_days || null,
                    available_hours || null,
                    travel_radius_km || 5,
                    bio || null
                ]
            );
        }

        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload worker profile picture
const workerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/workers');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'worker-' + req.user.userId + '-' + uniqueSuffix + ext);
    }
});

const workerUpload = multer({ 
    storage: workerStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Upload worker profile picture
app.post('/api/worker/profile/upload-picture', authenticateToken, workerUpload.single('profile_picture'), async (req, res) => {
    try {
        if (req.user.userType !== 'worker') {
            return res.status(403).json({ 
                success: false, 
                message: 'Worker access required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        // Create the full URL path
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const profilePictureUrl = `${baseUrl}/uploads/workers/${req.file.filename}`;
        
        // Also save the relative path in database
        const relativePath = `/uploads/workers/${req.file.filename}`;
        
        await pool.execute(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [relativePath, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { 
                profile_picture: profilePictureUrl,
                relative_path: relativePath
            }
        });

    } catch (error) {
        console.error('❌ Error uploading profile picture:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload profile picture',
            error: error.message 
        });
    }
});

// Change worker password
app.post('/api/worker/change-password', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'worker') {
            return res.status(403).json({ 
                success: false, 
                message: 'Worker access required' 
            });
        }

        const { current_password, new_password } = req.body;

        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const validPassword = await bcrypt.compare(current_password, users[0].password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to change password',
            error: error.message 
        });
    }
});

// Get worker's vouchers (Application Passes)
app.get('/api/worker/vouchers', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'worker') {
            return res.status(403).json({ 
                success: false, 
                message: 'Worker access required' 
            });
        }

        const workerId = req.user.userId;

        // Get all application passes for this worker
        const [passes] = await pool.execute(
            `SELECT 
                id,
                pass_type as code,
                applications_remaining as balance,
                amount_paid as amount,
                status,
                created_at,
                start_date,
                end_date,
                unlimited,
                total_applications
             FROM worker_application_passes 
             WHERE worker_id = ?
             ORDER BY created_at DESC`,
            [workerId]
        );

        // Format the response
        const formattedPasses = passes.map(pass => ({
            id: pass.id,
            code: pass.code,
            type: pass.code, // pass_type
            balance: pass.unlimited ? 'Unlimited' : pass.balance,
            amount: pass.amount,
            status: pass.status,
            created_at: pass.created_at,
            start_date: pass.start_date,
            end_date: pass.end_date,
            unlimited: pass.unlimited === 1,
            total_applications: pass.total_applications
        }));

        res.json({ 
            success: true, 
            data: formattedPasses 
        });

    } catch (error) {
        console.error('❌ Error fetching worker vouchers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch vouchers',
            error: error.message 
        });
    }
});

// Get profile completion percentage
app.get('/api/worker/profile-completion', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'worker') {
            return res.status(403).json({ 
                success: false, 
                message: 'Worker access required' 
            });
        }

        const [profiles] = await pool.execute(
            `SELECT * FROM worker_profiles WHERE user_id = ?`,
            [req.user.userId]
        );

        if (profiles.length === 0) {
            return res.json({ success: true, data: { percentage: 0 } });
        }

        const profile = profiles[0];
        let completed = 0;
        let total = 0;

        if (profile.primary_skill) completed++;
        total++;
        if (profile.skills && profile.skills.length > 0) completed++;
        total++;
        if (profile.experience_years > 0) completed++;
        total++;
        if (profile.hourly_rate_min > 0 && profile.hourly_rate_max > 0) completed++;
        total++;
        if (profile.available_days) completed++;
        total++;
        if (profile.available_hours) completed++;
        total++;
        if (profile.travel_radius_km > 0) completed++;
        total++;
        if (profile.bio) completed++;
        total++;

        const percentage = Math.round((completed / total) * 100);

        res.json({ success: true, data: { percentage } });

    } catch (error) {
        console.error('Error calculating profile completion:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to calculate profile completion' 
        });
    }
});

// Get worker's active pass
app.get('/api/worker/active-pass', authenticateToken, async (req, res) => {
    try {
        const workerId = req.user.userId;

        const [passes] = await pool.execute(
            `SELECT * FROM worker_application_passes 
             WHERE worker_id = ? AND status = 'active' AND (end_date IS NULL OR end_date > NOW())
             ORDER BY end_date ASC LIMIT 1`,
            [workerId]
        );

        if (passes.length === 0) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: passes[0] });

    } catch (error) {
        console.error('Error fetching pass:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pass' 
        });
    }
});

// Buy worker application pass
app.post('/api/worker/buy-application-pass', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const workerId = req.user.userId;
        const { pass_type, payment_method } = req.body;

        if (req.user.userType !== 'worker') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Workers only' 
            });
        }

        const passConfig = {
            payg: { applications: 1, price: 5, days: null },
            monthly: { applications: 30, price: 50, days: 30 },
            annual: { applications: null, price: 360, days: 365, unlimited: true }
        };

        const config = passConfig[pass_type];
        if (!config) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid pass type' 
            });
        }

        await connection.beginTransaction();

        const startDate = new Date();
        let endDate = null;
        
        if (config.days) {
            endDate = new Date();
            endDate.setDate(endDate.getDate() + config.days);
        }

        const [passResult] = await connection.execute(
            `INSERT INTO worker_application_passes 
             (worker_id, pass_type, applications_remaining, total_applications, start_date, end_date, amount_paid, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                workerId, 
                pass_type, 
                config.applications, 
                config.applications, 
                startDate, 
                endDate, 
                config.price, 
                payment_method || 'eft'
            ]
        );

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Pass purchased successfully',
            data: {
                pass_id: passResult.insertId,
                pass_type,
                applications: config.applications || 'Unlimited',
                valid_until: endDate
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Pass purchase error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to purchase pass',
            error: error.message 
        });
    }
});

// Delete worker account
app.delete('/api/worker/account', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        if (req.user.userType !== 'worker') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Worker access required' 
            });
        }

        await connection.beginTransaction();

        await connection.execute('DELETE FROM job_applications WHERE worker_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM worker_application_passes WHERE worker_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM worker_profiles WHERE user_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM users WHERE id = ?', [req.user.userId]);

        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Error deleting worker account:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete account',
            error: error.message 
        });
    }
});

// ========== CHECK HIRE STATUS ENDPOINT ==========
app.get('/api/jobs/:jobId/hire-status', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.query.worker;
        const clientId = req.user.userId;

        console.log('Checking hire status:', { jobId, workerId, clientId });

        // Check if there's a hire record for this job and worker
        const [hires] = await pool.execute(
            `SELECT * FROM job_hires 
             WHERE job_id = ? AND worker_id = ? AND client_id = ?`,
            [jobId, workerId, clientId]
        );

        const isHired = hires.length > 0;

        res.json({
            success: true,
            data: {
                hired: isHired,
                hire_details: isHired ? hires[0] : null
            }
        });   
        
    } catch (error) {
        console.error('Error checking hire status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check hire status' 
        });
    }
});

// ========== COMPLETE JOB ENDPOINT ==========
app.post('/api/jobs/:jobId/complete', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { jobId } = req.params;
        const clientId = req.user.userId;
        const { rating, review, worker_id } = req.body;

        console.log('='.repeat(50));
        console.log('✅ COMPLETE JOB REQUEST');
        console.log('Job ID:', jobId);
        console.log('Client ID:', clientId);
        console.log('Worker ID:', worker_id);
        console.log('Rating:', rating);
        console.log('Review:', review);
        console.log('='.repeat(50));

        await connection.beginTransaction();

        // 1. Verify job exists and belongs to client and is in 'hired' status
        const [jobs] = await connection.execute(
            `SELECT * FROM jobs WHERE id = ? AND client_id = ? AND status = 'hired'`,
            [jobId, clientId]
        );

        if (jobs.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found or cannot be completed' 
            });
        }

        const job = jobs[0];

        // 2. Update job status to completed
        await connection.execute(
            `UPDATE jobs SET status = 'completed', completed_at = NOW() WHERE id = ?`,
            [jobId]
        );

        // 3. Update job_hires record if exists
        await connection.execute(
            `UPDATE job_hires SET status = 'completed', end_time = NOW() WHERE job_id = ?`,
            [jobId]
        );

        // 4. Insert review if rating provided
        if (rating) {
            await connection.execute(
                `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment, review_type) 
                 VALUES (?, ?, ?, ?, ?, 'client_to_worker')`,
                [jobId, clientId, worker_id, rating, review || null]
            );

            // Update worker's average rating
            await connection.execute(
                `UPDATE worker_profiles wp
                 SET rating = (
                     SELECT COALESCE(AVG(rating), 0)
                     FROM reviews
                     WHERE reviewee_id = ? AND review_type = 'client_to_worker'
                 )
                 WHERE wp.user_id = ?`,
                [worker_id, worker_id]
            );

            // Update worker's completed jobs count
            await connection.execute(
                `UPDATE worker_profiles 
                 SET completed_jobs = completed_jobs + 1
                 WHERE user_id = ?`,
                [worker_id]
            );
        }

        // 5. Create notification for worker
        await connection.execute(
            `INSERT INTO notifications (user_id, type, title, message, created_at) 
             VALUES (?, 'job_completed', '💰 Payment Received!', ?, NOW())`,
            [worker_id, `Your work for "${job.title}" has been marked as complete. Payment has been processed.`]
        );

        await connection.commit();
        connection.release();

        console.log('✅ Job completed successfully');

        res.json({
            success: true,
            message: 'Job completed successfully',
            data: {
                job_id: jobId,
                completed: true,
                rating_provided: !!rating
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Complete job error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to complete job',
            error: error.message 
        });
    }
});

// ========== CLIENT ROUTES ==========

// ========== CLIENT PACKAGES ENDPOINT ==========
app.get('/api/client/my-packages', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        const clientId = req.user.userId;

        // Get all packages for this client
        const [packages] = await pool.execute(
            `SELECT * FROM client_hire_packages 
             WHERE client_id = ? 
             ORDER BY 
                CASE status
                    WHEN 'active' THEN 1
                    ELSE 2
                END,
                created_at DESC`,
            [clientId]
        );

        // Calculate statistics
        let totalPackages = packages.length;
        let activePackages = packages.filter(p => p.status === 'active').length;
        
        // Calculate total spent properly
        let totalSpent = 0;
        packages.forEach(pkg => {
            // Ensure amount_paid is treated as a number
            const amount = parseFloat(pkg.amount_paid) || 0;
            totalSpent += amount;
        });
        
        let totalHiresRemaining = 0;
        let hasUnlimited = false;

        packages.forEach(p => {
            if (p.status === 'active') {
                if (p.unlimited) {
                    hasUnlimited = true;
                } else {
                    totalHiresRemaining += p.hires_remaining;
                }
            }
        });

        console.log('Calculated total spent:', totalSpent);

        res.json({
            success: true,
            data: {
                packages: packages,
                stats: {
                    total_packages: totalPackages,
                    active_packages: activePackages,
                    total_hires_remaining: hasUnlimited ? 'Unlimited' : totalHiresRemaining,
                    total_spent: totalSpent // This should be a number, not a string
                }
            }
        });

    } catch (error) {
        console.error('Error fetching client packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch packages',
            error: error.message 
        });
    }
});

// Get client jobs
app.get('/api/client/jobs', authenticateToken, async (req, res) => {
    try {
        const clientId = req.user.userId;

        if (req.user.userType !== 'client' && req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Client access required.' 
            });
        }
        console.log(`📋 Fetching jobs for client ID: ${clientId}`);

        const [jobs] = await pool.execute(
            `SELECT 
                j.*,
                jh.worker_id,
                jh.status as hire_status,
                jh.start_time,
                jh.end_time,
                jh.hire_fee,
                u.name as worker_name,
                u.phone as worker_phone,
                wp.rating as worker_rating,
                wp.primary_skill as worker_skill,
                wp.total_jobs as worker_total_jobs,
                wp.completed_jobs as worker_completed_jobs
            FROM jobs j
            LEFT JOIN job_hires jh ON j.id = jh.job_id
            LEFT JOIN users u ON jh.worker_id = u.id
            LEFT JOIN worker_profiles wp ON jh.worker_id = wp.user_id
            WHERE j.client_id = ?
            ORDER BY j.created_at DESC`,
            [clientId]
        );
        
        console.log(`✅ Found ${jobs.length} jobs for client`);

        const formattedJobs = jobs.map(job => ({
            id: job.id,
            job_code: job.job_code,
            title: job.title,
            description: job.description,
            category: job.category,
            township: job.township,
            budget_min: job.budget_min,
            budget_max: job.budget_max,
            status: job.status,
            urgency: job.urgency,
            created_at: job.created_at,
            updated_at: job.updated_at,
            preferred_date: job.preferred_date,
            estimated_hours: job.estimated_hours,
            materials_provided: job.materials_provided,
            safety_requirements: job.safety_requirements,
            assigned_worker: job.worker_id ? {
                id: job.worker_id,
                name: job.worker_name,
                phone: job.worker_phone,
                rating: job.worker_rating,
                skill: job.worker_skill,
                total_jobs: job.worker_total_jobs,
                completed_jobs: job.worker_completed_jobs,
                hire_fee: job.hire_fee,
                hire_status: job.hire_status,
                start_time: job.start_time,
                end_time: job.end_time
            } : null
        }));

        jobs.forEach(job => {
            console.log(`Job ${job.id}: status=${job.status}, worker_id=${job.worker_id || 'none'}`);
        });

        res.json({ success: true, data: formattedJobs });

    } catch (error) {
        console.error('❌ Error fetching client jobs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch jobs',
            error: error.message 
        });
    }
});

// Get client profile
app.get('/api/client/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        const [users] = await pool.execute(
            `SELECT id, name, email, phone, township, address, id_number, profile_picture, created_at
             FROM users WHERE id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = users[0];
        
        // Construct full URL for profile picture
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const profilePictureUrl = user.profile_picture 
            ? (user.profile_picture.startsWith('http') 
                ? user.profile_picture 
                : `${baseUrl}${user.profile_picture}`)
            : null;

        res.json({ 
            success: true, 
            data: {
                ...user,
                profile_picture: profilePictureUrl
            }
        });

    } catch (error) {
        console.error('Error fetching client profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile' 
        });
    }
});

// Update client profile
app.put('/api/client/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        const { name, email, phone, township, address } = req.body;

        await pool.execute(
            `UPDATE users SET 
             name = ?, email = ?, phone = ?, township = ?, address = ?
             WHERE id = ?`,
            [name, email, phone, township, address, req.user.userId]
        );

        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Error updating client profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile' 
        });
    }
});

// Upload client profile picture
const clientStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/clients');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'client-' + req.user.userId + '-' + uniqueSuffix + ext);
    }
});

const clientUpload = multer({ 
    storage: clientStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

app.post('/api/client/profile/upload-picture', authenticateToken, clientUpload.single('profile_picture'), async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        // Create the full URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fullUrl = `${baseUrl}/uploads/clients/${req.file.filename}`;
        
        // Save the relative path in database
        const relativePath = `/uploads/clients/${req.file.filename}`;
        
        await pool.execute(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [relativePath, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { 
                profile_picture: fullUrl,
                relative_path: relativePath
            }
        });

    } catch (error) {
        console.error('❌ Error uploading profile picture:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload profile picture',
            error: error.message 
        });
    }
});

// Change client password
app.post('/api/client/change-password', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        const { current_password, new_password } = req.body;

        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const validPassword = await bcrypt.compare(current_password, users[0].password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to change password',
            error: error.message 
        });
    }
});

// Delete client account
app.delete('/api/client/account', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        if (req.user.userType !== 'client') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        await connection.beginTransaction();

        const [jobs] = await connection.execute(
            'SELECT id FROM jobs WHERE client_id = ?',
            [req.user.userId]
        );
        
        for (const job of jobs) {
            await connection.execute('DELETE FROM job_applications WHERE job_id = ?', [job.id]);
        }

        await connection.execute('DELETE FROM jobs WHERE client_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM client_hire_packages WHERE client_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM client_profiles WHERE user_id = ?', [req.user.userId]);
        await connection.execute('DELETE FROM users WHERE id = ?', [req.user.userId]);

        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Error deleting account:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete account',
            error: error.message 
        });
    }
});

// Buy client package
app.post('/api/client/buy-package', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const clientId = req.user.userId;
        const { package_type, payment_method } = req.body;

        if (req.user.userType !== 'client') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Clients only' 
            });
        }

        const packageConfig = {
            single: { hires: 1, price: 75 },
            starter: { hires: 5, price: 350 },
            business: { hires: 10, price: 650 },
            unlimited: { hires: null, price: 1200, unlimited: true, days: 30 }
        };

        const config = packageConfig[package_type];
        if (!config) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid package type' 
            });
        }

        await connection.beginTransaction();

        let validUntil = null;
        if (package_type === 'unlimited') {
            validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);
        }

        const [creditResult] = await connection.execute(
            `INSERT INTO client_hire_packages 
             (client_id, package_type, hires_remaining, total_hires, unlimited, valid_until, amount_paid, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                clientId,
                package_type,
                config.hires,
                config.hires,
                package_type === 'unlimited',
                validUntil,
                config.price,
                payment_method || 'eft'
            ]
        );

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Package purchased successfully',
            data: {
                credit_id: creditResult.insertId,
                package_type,
                hires: config.hires || 'Unlimited',
                valid_until: validUntil
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Package purchase error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to purchase package',
            error: error.message 
        });
    }
});

// packages check
app.get('/api/client/hire-packages', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        // Return available packages
        const packages = [
            { id: 1, name: 'Single Hire', price: 75, hires: 1 },
            { id: 2, name: 'Starter Pack', price: 350, hires: 5 },
            { id: 3, name: 'Business Pack', price: 650, hires: 10 },
            { id: 4, name: 'Unlimited Month', price: 1200, hires: 'Unlimited' }
        ];

        res.json({ success: true, data: packages });

    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch packages' 
        });
    }
});

// ========== GET CLIENT HIRE CREDITS ==========
app.get('/api/client/hire-credits', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'client') {
            return res.status(403).json({ 
                success: false, 
                message: 'Client access required' 
            });
        }

        const clientId = req.user.userId;

        // Get all active packages
        const [packages] = await pool.execute(
            `SELECT * FROM client_hire_packages 
             WHERE client_id = ? AND status = 'active' 
             AND (valid_until IS NULL OR valid_until > NOW())`,
            [clientId]
        );

        let totalRemaining = 0;
        let hasUnlimited = false;

        packages.forEach(pkg => {
            if (pkg.unlimited) {
                hasUnlimited = true;
            } else {
                totalRemaining += pkg.hires_remaining;
            }
        });

        res.json({
            success: true,
            data: {
                packages: packages,
                total_remaining: hasUnlimited ? 'Unlimited' : totalRemaining,
                has_unlimited: hasUnlimited,
                active_packages: packages.length
            }
        });

    } catch (error) {
        console.error('Error fetching hire credits:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch hire credits' 
        });
    }
});

// ========== ADMIN ROUTES ==========

// Get admin profile
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [users] = await pool.execute(
            `SELECT id, name, email, phone, township, id_number, created_at
             FROM users WHERE id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const securitySettings = {
            two_factor_enabled: false,
            login_alerts: true,
            session_timeout: 30
        };

        res.json({
            success: true,
            data: {
                ...users[0],
                ...securitySettings
            }
        });

    } catch (error) {
        console.error('❌ Error fetching admin profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile',
            error: error.message 
        });
    }
});

// Update admin profile
app.put('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const { name, email, phone, township, id_number } = req.body;

        await pool.execute(
            `UPDATE users SET 
             name = ?, email = ?, phone = ?, township = ?, id_number = ?
             WHERE id = ?`,
            [name, email, phone, township, id_number, req.user.userId]
        );

        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('❌ Error updating admin profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile',
            error: error.message 
        });
    }
});

// Change admin password
app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const { current_password, new_password } = req.body;

        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const validPassword = await bcrypt.compare(current_password, users[0].password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to change password',
            error: error.message 
        });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [users] = await pool.execute(
            `SELECT id, phone, name, user_type, township, is_verified, status, created_at
             FROM users ORDER BY created_at DESC`
        );

        res.json({ success: true, data: users });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get all jobs (admin only)
app.get('/api/admin/jobs', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [jobs] = await pool.execute(
            `SELECT j.*, u.name as client_name 
             FROM jobs j LEFT JOIN users u ON j.client_id = u.id
             ORDER BY j.created_at DESC`
        );

        res.json({ success: true, data: jobs });

    } catch (error) {
        console.error('Get admin jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
    }
});

// Get all worker passes (admin only)
app.get('/api/admin/worker-passes', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [passes] = await pool.execute(
            `SELECT wp.*, u.name as worker_name, u.phone as worker_phone 
             FROM worker_application_passes wp
             JOIN users u ON wp.worker_id = u.id
             ORDER BY wp.created_at DESC LIMIT 100`
        );

        res.json({ success: true, data: passes });

    } catch (error) {
        console.error('❌ Error fetching worker passes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch worker passes',
            error: error.message 
        });
    }
});

// Get all client packages (admin only)
app.get('/api/admin/client-packages', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [packages] = await pool.execute(
            `SELECT cp.*, u.name as client_name, u.phone as client_phone 
             FROM client_hire_packages cp
             JOIN users u ON cp.client_id = u.id
             ORDER BY cp.created_at DESC LIMIT 100`
        );

        res.json({ success: true, data: packages });

    } catch (error) {
        console.error('❌ Error fetching client packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch client packages',
            error: error.message 
        });
    }
});

// Get admin overview
app.get('/api/admin/overview', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const [userStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN user_type = 'worker' THEN 1 ELSE 0 END) as total_workers,
                SUM(CASE WHEN user_type = 'client' THEN 1 ELSE 0 END) as total_clients,
                SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as total_admins
            FROM users
        `);

        const [jobStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted_jobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs
            FROM jobs
        `);

        const [hireStats] = await pool.execute(`
            SELECT COUNT(*) as total_hires FROM job_hires
        `);

        // REVENUE FROM WORKER PASSES
        const [workerPassRevenue] = await pool.execute(`
            SELECT COALESCE(SUM(amount_paid), 0) as total FROM worker_application_passes
        `);

        // REVENUE FROM CLIENT PACKAGES
        const [clientPackageRevenue] = await pool.execute(`
            SELECT COALESCE(SUM(amount_paid), 0) as total FROM client_hire_packages
        `);

        const totalRevenue = parseFloat(workerPassRevenue[0].total) + parseFloat(clientPackageRevenue[0].total);

        const [passStats] = await pool.execute(`
            SELECT COUNT(*) as total_passes FROM worker_application_passes
        `);

        const [packageStats] = await pool.execute(`
            SELECT COUNT(*) as total_packages FROM client_hire_packages
        `);

        console.log(`💰 Admin Overview Revenue: R${totalRevenue}`);

        res.json({
            success: true,
            data: {
                users: userStats[0],
                jobs: jobStats[0],
                hires: hireStats[0],
                revenue: {
                    total_revenue: totalRevenue,
                    worker_revenue: parseFloat(workerPassRevenue[0].total),
                    client_revenue: parseFloat(clientPackageRevenue[0].total)
                },
                worker_passes: passStats[0],
                client_packages: packageStats[0]
            }
        });

    } catch (error) {
        console.error('❌ Error fetching admin overview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch overview',
            error: error.message 
        });
    }
});

// Get reports
app.get('/api/admin/reports', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const range = req.query.range || 'month';
        let startDate = new Date();
        
        switch(range) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case 'week': startDate.setDate(startDate.getDate() - 7); break;
            case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
            case 'quarter': startDate.setMonth(startDate.getMonth() - 3); break;
            case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
            default: startDate = new Date(0);
        }

        console.log(`📊 Generating report for range: ${range}, from: ${startDate}`);

        // User growth over time (daily)
        const [userGrowth] = await pool.execute(`
            SELECT 
                DATE(created_at) as period,
                COUNT(*) as new_users,
                SUM(CASE WHEN user_type = 'worker' THEN 1 ELSE 0 END) as new_workers,
                SUM(CASE WHEN user_type = 'client' THEN 1 ELSE 0 END) as new_clients
            FROM users 
            WHERE created_at >= ? 
            GROUP BY DATE(created_at)
            ORDER BY period ASC
        `, [startDate]);

        // Job trends
        const [jobTrends] = await pool.execute(`
            SELECT 
                DATE(created_at) as period,
                COUNT(*) as total_jobs,
                SUM(CASE WHEN urgency = 'urgent' THEN 1 ELSE 0 END) as urgent_jobs
            FROM jobs 
            WHERE created_at >= ? 
            GROUP BY DATE(created_at)
            ORDER BY period ASC
        `, [startDate]);

        // REVENUE FROM WORKER PASSES
        const [workerRevenue] = await pool.execute(`
            SELECT 
                DATE(created_at) as period,
                SUM(amount_paid) as total
            FROM worker_application_passes 
            WHERE created_at >= ? 
            GROUP BY DATE(created_at)
            ORDER BY period ASC
        `, [startDate]);

        // REVENUE FROM CLIENT PACKAGES
        const [clientRevenue] = await pool.execute(`
            SELECT 
                DATE(created_at) as period,
                SUM(amount_paid) as total
            FROM client_hire_packages 
            WHERE created_at >= ? 
            GROUP BY DATE(created_at)
            ORDER BY period ASC
        `, [startDate]);

        // Combine revenue data
        const revenueMap = new Map();
        
        // Add worker revenue
        workerRevenue.forEach(row => {
            const period = row.period.toISOString().split('T')[0];
            revenueMap.set(period, {
                period,
                worker_revenue: parseFloat(row.total) || 0,
                client_revenue: 0,
                total_revenue: parseFloat(row.total) || 0
            });
        });

        // Add client revenue
        clientRevenue.forEach(row => {
            const period = row.period.toISOString().split('T')[0];
            if (revenueMap.has(period)) {
                const existing = revenueMap.get(period);
                existing.client_revenue = parseFloat(row.total) || 0;
                existing.total_revenue = (existing.worker_revenue || 0) + (parseFloat(row.total) || 0);
            } else {
                revenueMap.set(period, {
                    period,
                    worker_revenue: 0,
                    client_revenue: parseFloat(row.total) || 0,
                    total_revenue: parseFloat(row.total) || 0
                });
            }
        });

        // Convert map to array and sort by period
        const revenue = Array.from(revenueMap.values()).sort((a, b) => 
            new Date(a.period) - new Date(b.period)
        );

        // Worker pass sales by type
        const [passSales] = await pool.execute(`
            SELECT 
                pass_type,
                COUNT(*) as count,
                SUM(amount_paid) as total
            FROM worker_application_passes 
            WHERE created_at >= ? 
            GROUP BY pass_type
        `, [startDate]);

        // Client package sales by type
        const [packageSales] = await pool.execute(`
            SELECT 
                package_type,
                COUNT(*) as count,
                SUM(amount_paid) as total
            FROM client_hire_packages 
            WHERE created_at >= ? 
            GROUP BY package_type
        `, [startDate]);

        // Category performance
        const [categories] = await pool.execute(`
            SELECT 
                category,
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status IN ('hired', 'completed') THEN 1 ELSE 0 END) as hired_jobs
            FROM jobs 
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY total_jobs DESC
        `);

        // Top workers
        const [workers] = await pool.execute(`
            SELECT 
                u.name,
                u.township,
                wp.primary_skill,
                wp.rating,
                COUNT(DISTINCT jh.id) as total_hires,
                SUM(CASE WHEN jh.status = 'completed' THEN 1 ELSE 0 END) as completed_hires
            FROM users u
            JOIN worker_profiles wp ON u.id = wp.user_id
            LEFT JOIN job_hires jh ON u.id = jh.worker_id
            WHERE u.user_type = 'worker'
            GROUP BY u.id
            ORDER BY total_hires DESC
            LIMIT 10
        `);

        // Summary stats
        const [newUsers] = await pool.execute(`
            SELECT COUNT(*) as count FROM users WHERE created_at >= ?
        `, [startDate]);

        const [totalHires] = await pool.execute(`
            SELECT COUNT(*) as count FROM job_hires WHERE created_at >= ?
        `, [startDate]);

        // Total revenue for the period
        const [totalWorkerRevenue] = await pool.execute(`
            SELECT SUM(amount_paid) as total FROM worker_application_passes WHERE created_at >= ?
        `, [startDate]);

        const [totalClientRevenue] = await pool.execute(`
            SELECT SUM(amount_paid) as total FROM client_hire_packages WHERE created_at >= ?
        `, [startDate]);

        const totalRevenue = (parseFloat(totalWorkerRevenue[0]?.total) || 0) + 
                            (parseFloat(totalClientRevenue[0]?.total) || 0);

        console.log('✅ Report generated successfully');
        console.log(`💰 Total revenue for period: R${totalRevenue}`);

        res.json({
            success: true,
            data: {
                user_growth: userGrowth,
                job_trends: jobTrends,
                revenue: revenue,
                pass_sales: passSales,
                package_sales: packageSales,
                categories: categories,
                workers: workers,
                summary: {
                    generated_at: new Date(),
                    new_users: newUsers[0]?.count || 0,
                    total_hires: totalHires[0]?.count || 0,
                    total_revenue: totalRevenue
                }
            }
        });

    } catch (error) {
        console.error('❌ Error generating report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate report',
            error: error.message 
        });
    }
});

// Get admin activity log
app.get('/api/admin/activity-log', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const sampleLogs = [
            { id: 1, action: 'login', description: 'Logged in successfully', created_at: new Date() },
            { id: 2, action: 'profile_view', description: 'Viewed admin profile', created_at: new Date(Date.now() - 3600000) }
        ];

        res.json({ success: true, data: sampleLogs });

    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch activity log' 
        });
    }
});

// ========== ADMIN USER MANAGEMENT ENDPOINTS ==========

// Make user admin
app.post('/api/admin/users/:userId/make-admin', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const userId = req.params.userId;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Update user type to admin
        await pool.execute(
            'UPDATE users SET user_type = ? WHERE id = ?',
            ['admin', userId]
        );

        res.json({
            success: true,
            message: 'User is now an admin',
            data: { user_id: userId, user_type: 'admin' }
        });

    } catch (error) {
        console.error('Error making user admin:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to make user admin',
            error: error.message 
        });
    }
});

// Suspend user
app.post('/api/admin/users/:userId/suspend', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const userId = req.params.userId;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Don't allow suspending your own account
        if (parseInt(userId) === parseInt(req.user.userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'You cannot suspend your own account' 
            });
        }

        // Update user status
        await pool.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            ['suspended', userId]
        );

        res.json({
            success: true,
            message: 'User suspended successfully',
            data: { user_id: userId, status: 'suspended' }
        });

    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to suspend user',
            error: error.message 
        });
    }
});

// Activate user
app.post('/api/admin/users/:userId/activate', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const userId = req.params.userId;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Update user status
        await pool.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            ['active', userId]
        );

        res.json({
            success: true,
            message: 'User activated successfully',
            data: { user_id: userId, status: 'active' }
        });

    } catch (error) {
        console.error('Error activating user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to activate user',
            error: error.message 
        });
    }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        if (req.user.userType !== 'admin') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const userId = req.params.userId;

        // Don't allow deleting your own account
        if (parseInt(userId) === parseInt(req.user.userId)) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'You cannot delete your own account' 
            });
        }

        await connection.beginTransaction();

        // Delete user data from all related tables
        await connection.execute('DELETE FROM job_applications WHERE worker_id = ?', [userId]);
        await connection.execute('DELETE FROM worker_application_passes WHERE worker_id = ?', [userId]);
        await connection.execute('DELETE FROM worker_profiles WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM client_hire_packages WHERE client_id = ?', [userId]);
        await connection.execute('DELETE FROM client_profiles WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM job_hires WHERE client_id = ? OR worker_id = ?', [userId, userId]);
        await connection.execute('DELETE FROM jobs WHERE client_id = ?', [userId]);
        await connection.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM reviews WHERE reviewer_id = ? OR reviewee_id = ?', [userId, userId]);
        await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user',
            error: error.message 
        });
    }
});

// ========== ADMIN JOB MANAGEMENT ENDPOINTS ==========

// Feature job (toggle featured status)
app.post('/api/admin/jobs/:jobId/feature', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const jobId = req.params.jobId;

        // Check if job exists
        const [jobs] = await pool.execute(
            'SELECT * FROM jobs WHERE id = ?',
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }

        // Check if featured column exists, if not add it
        try {
            await pool.execute('SELECT featured FROM jobs LIMIT 1');
        } catch (err) {
            // Add featured column if it doesn't exist
            await pool.execute('ALTER TABLE jobs ADD COLUMN featured BOOLEAN DEFAULT FALSE');
        }

        const currentFeatured = jobs[0].featured || false;
        await pool.execute(
            'UPDATE jobs SET featured = ? WHERE id = ?',
            [!currentFeatured, jobId]
        );

        res.json({
            success: true,
            message: !currentFeatured ? 'Job featured successfully' : 'Job unfeatured successfully',
            data: { job_id: jobId, featured: !currentFeatured }
        });

    } catch (error) {
        console.error('Error featuring job:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to feature job',
            error: error.message 
        });
    }
});

// Delete job (admin only)
app.delete('/api/admin/jobs/:jobId', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        if (req.user.userType !== 'admin') {
            connection.release();
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const jobId = req.params.jobId;

        await connection.beginTransaction();

        // Delete job related data
        await connection.execute('DELETE FROM job_applications WHERE job_id = ?', [jobId]);
        await connection.execute('DELETE FROM job_hires WHERE job_id = ?', [jobId]);
        await connection.execute('DELETE FROM job_photos WHERE job_id = ?', [jobId]);
        await connection.execute('DELETE FROM reviews WHERE job_id = ?', [jobId]);
        await connection.execute('DELETE FROM jobs WHERE id = ?', [jobId]);

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error deleting job:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete job',
            error: error.message 
        });
    }
});

// ========== EXPORT ENDPOINT ==========
app.get('/api/admin/export', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const { format = 'csv', type = 'users', range = 'month' } = req.query;

        // Get date range
        let startDate = new Date();
        switch(range) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case 'week': startDate.setDate(startDate.getDate() - 7); break;
            case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
            case 'quarter': startDate.setMonth(startDate.getMonth() - 3); break;
            case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
            default: startDate = new Date(0);
        }

        let data = [];
        let filename = `export-${type}-${range}-${new Date().toISOString().split('T')[0]}`;

        // Fetch data based on type
        switch(type) {
            case 'users':
                const [users] = await pool.execute(
                    `SELECT id, name, phone, email, user_type, township, is_verified, status, created_at 
                     FROM users WHERE created_at >= ? ORDER BY created_at DESC`,
                    [startDate]
                );
                data = users;
                break;
            case 'jobs':
                const [jobs] = await pool.execute(
                    `SELECT j.*, u.name as client_name 
                     FROM jobs j LEFT JOIN users u ON j.client_id = u.id
                     WHERE j.created_at >= ? ORDER BY j.created_at DESC`,
                    [startDate]
                );
                data = jobs;
                break;
            case 'hires':
                const [hires] = await pool.execute(
                    `SELECT jh.*, j.title as job_title, u.name as client_name, w.name as worker_name
                     FROM job_hires jh
                     LEFT JOIN jobs j ON jh.job_id = j.id
                     LEFT JOIN users u ON jh.client_id = u.id
                     LEFT JOIN users w ON jh.worker_id = w.id
                     WHERE jh.created_at >= ? ORDER BY jh.created_at DESC`,
                    [startDate]
                );
                data = hires;
                break;
            case 'passes':
                const [passes] = await pool.execute(
                    `SELECT wp.*, u.name as worker_name, u.phone as worker_phone
                     FROM worker_application_passes wp
                     JOIN users u ON wp.worker_id = u.id
                     WHERE wp.created_at >= ? ORDER BY wp.created_at DESC`,
                    [startDate]
                );
                data = passes;
                break;
            case 'packages':
                const [packages] = await pool.execute(
                    `SELECT cp.*, u.name as client_name, u.phone as client_phone
                     FROM client_hire_packages cp
                     JOIN users u ON cp.client_id = u.id
                     WHERE cp.created_at >= ? ORDER BY cp.created_at DESC`,
                    [startDate]
                );
                data = packages;
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid export type' });
        }

        if (format === 'csv') {
            // Convert to CSV
            if (data.length === 0) {
                return res.status(404).json({ success: false, message: 'No data to export' });
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(','));
            
            const csv = [headers, ...rows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(csv);
        } else {
            // Return JSON
            res.json({ success: true, data, filename });
        }

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export data',
            error: error.message 
        });
    }
});

// ========== TEST ENDPOINT ==========
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Backend is working!',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'KasiConnect Complete API',
        version: '3.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'KasiConnect API',
        version: '3.0.0',
        endpoints: [
            'GET /api/health',
            'GET /api/stats',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'GET /api/jobs',
            'GET /api/jobs/:id',
            'POST /api/jobs',
            'POST /api/jobs/:id/apply',
            'GET /api/worker/applications',
            'GET /api/workers/:id',
            'PUT /api/worker/profile',
            'POST /api/worker/profile/upload-picture',
            'POST /api/worker/change-password',
            'GET /api/worker/vouchers',
            'GET /api/worker/active-pass',
            'POST /api/worker/buy-application-pass',
            'DELETE /api/worker/account',
            'GET /api/client/jobs',
            'GET /api/client/profile',
            'PUT /api/client/profile',
            'POST /api/client/profile/upload-picture',
            'POST /api/client/change-password',
            'DELETE /api/client/account',
            'POST /api/client/buy-package',
            'GET /api/admin/profile',
            'PUT /api/admin/profile',
            'POST /api/admin/change-password',
            'GET /api/admin/users',
            'GET /api/admin/jobs',
            'GET /api/admin/worker-passes',
            'GET /api/admin/client-packages',
            'GET /api/admin/overview',
            'GET /api/admin/reports',
            'GET /api/admin/activity-log'
        ]
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('✅ KasiConnect Complete Backend v3.0');
    console.log('=================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🗄️  Database: TiDB Cloud Connected`);
    console.log(`📊 Package System Active`);
    console.log('=================================\n');
});