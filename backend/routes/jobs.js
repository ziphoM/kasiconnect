const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { pool } = require('../server');
const auth = require('../middleware/auth');
const { sendSMS } = require('../utils/smsService');
const { sendNotification } = require('../utils/notificationService');

// Get all jobs (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const {
      township,
      category,
      min_budget,
      max_budget,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user.userId;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        j.*,
        u.name as client_name,
        u.phone as client_phone,
        COUNT(ja.id) as application_count,
        EXISTS(
          SELECT 1 FROM job_applications 
          WHERE job_id = j.id AND worker_id = $1
        ) as has_applied
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE j.status = 'posted'
    `;

    const params = [userId];
    let paramCount = 2;

    // Add filters
    if (township) {
      query += ` AND j.township = $${paramCount}`;
      params.push(township);
      paramCount++;
    }

    if (category) {
      query += ` AND j.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (min_budget) {
      query += ` AND j.budget_max >= $${paramCount}`;
      params.push(min_budget);
      paramCount++;
    }

    if (max_budget) {
      query += ` AND j.budget_min <= $${paramCount}`;
      params.push(max_budget);
      paramCount++;
    }

    // Group and order
    query += ` 
      GROUP BY j.id, u.name, u.phone
      ORDER BY j.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM jobs WHERE status = \'posted\'';
    const countParams = [];
    let countParamCount = 1;

    if (township) {
      countQuery += ` AND township = $${countParamCount}`;
      countParams.push(township);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalJobs = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalJobs,
        pages: Math.ceil(totalJobs / limit)
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching jobs' 
    });
  }
});

// Create a job
router.post('/', auth, [
  check('title').notEmpty().withMessage('Job title is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('category').notEmpty().withMessage('Category is required'),
  check('township').notEmpty().withMessage('Township is required'),
  check('budget_min').isInt({ min: 0 }).withMessage('Valid minimum budget required'),
  check('budget_max').isInt({ min: 0 }).withMessage('Valid maximum budget required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      subcategory,
      township,
      address,
      budget_min,
      budget_max,
      estimated_hours,
      urgency,
      preferred_date,
      preferred_time,
      materials_provided,
      materials_description,
      safety_requirements
    } = req.body;

    const clientId = req.user.userId;

    // Create job
    const result = await pool.query(
      `INSERT INTO jobs (
        client_id, title, description, category, subcategory, 
        township, address, budget_min, budget_max, estimated_hours,
        urgency, preferred_date, preferred_time, materials_provided,
        materials_description, safety_requirements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        clientId, title, description, category, subcategory,
        township, address, budget_min, budget_max, estimated_hours,
        urgency || 'medium', preferred_date, preferred_time,
        materials_provided || false, materials_description, safety_requirements
      ]
    );

    const job = result.rows[0];

    // Notify nearby workers about new job
    await notifyWorkersAboutJob(job);

    // Send confirmation to client
    await sendNotification(clientId, 'job_posted', {
      job_id: job.id,
      job_title: job.title,
      job_code: job.job_code
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: job
    });

  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating job' 
    });
  }
});

// Get job details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        j.*,
        u.name as client_name,
        u.phone as client_phone,
        u.township as client_township,
        u.trust_score as client_trust_score,
        (
          SELECT COUNT(*) FROM reviews 
          WHERE reviewee_id = j.client_id AND review_type = 'worker_to_client'
        ) as client_total_reviews,
        (
          SELECT ROUND(AVG(rating), 1) FROM reviews 
          WHERE reviewee_id = j.client_id AND review_type = 'worker_to_client'
        ) as client_rating,
        EXISTS(
          SELECT 1 FROM job_applications 
          WHERE job_id = j.id AND worker_id = $2
        ) as has_applied,
        (
          SELECT COUNT(*) FROM job_applications WHERE job_id = j.id
        ) as total_applications
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      WHERE j.id = $1`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Get job photos
    const photosResult = await pool.query(
      'SELECT * FROM job_photos WHERE job_id = $1 ORDER BY created_at',
      [id]
    );

    const job = result.rows[0];
    job.photos = photosResult.rows;

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching job' 
    });
  }
});

// Apply for a job
router.post('/:id/apply', auth, [
  check('proposed_rate').isInt({ min: 0 }).withMessage('Valid rate required'),
  check('message').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { proposed_rate, message, estimated_completion_time } = req.body;
    const workerId = req.user.userId;

    // Check if job exists and is open
    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND status = \'posted\'',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found or not available' 
      });
    }

    const job = jobResult.rows[0];

    // Check if worker has already applied
    const existingApplication = await pool.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND worker_id = $2',
      [id, workerId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already applied for this job' 
      });
    }

    // Get worker profile
    const workerResult = await pool.query(
      `SELECT wp.*, u.name, u.phone, u.township 
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.id
       WHERE wp.user_id = $1`,
      [workerId]
    );

    if (workerResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete your worker profile before applying' 
      });
    }

    const worker = workerResult.rows[0];

    // Create application
    const applicationResult = await pool.query(
      `INSERT INTO job_applications (
        job_id, worker_id, proposed_rate, message, estimated_completion_time
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [id, workerId, proposed_rate, message, estimated_completion_time]
    );

    const application = applicationResult.rows[0];

    // Notify client about new application
    await sendNotification(
      job.client_id,
      'job_application',
      {
        job_id: job.id,
        job_title: job.title,
        worker_name: worker.name,
        worker_rating: worker.rating,
        proposed_rate: proposed_rate
      }
    );

    // Send SMS to client
    const clientResult = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [job.client_id]
    );

    if (clientResult.rows.length > 0) {
      await sendSMS(
        clientResult.rows[0].phone,
        `New application for your job "${job.title}". Check your KasiConnect app.`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });

  } catch (error) {
    console.error('Apply job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error submitting application' 
    });
  }
});

// Get applications for a job (client only)
router.get('/:id/applications', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify job ownership
    const jobResult = await pool.query(
      'SELECT client_id FROM jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (jobResult.rows[0].client_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view applications' 
      });
    }

    // Get applications
    const result = await pool.query(
      `SELECT 
        ja.*,
        u.name as worker_name,
        u.phone as worker_phone,
        u.township as worker_township,
        u.verification_level,
        wp.primary_skill,
        wp.experience_years,
        wp.rating,
        wp.total_jobs,
        wp.completed_jobs
      FROM job_applications ja
      JOIN users u ON ja.worker_id = u.id
      LEFT JOIN worker_profiles wp ON ja.worker_id = wp.user_id
      WHERE ja.job_id = $1
      ORDER BY ja.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching applications' 
    });
  }
});

// Accept an application (client only)
router.post('/:jobId/accept/:applicationId', auth, async (req, res) => {
  try {
    const { jobId, applicationId } = req.params;
    const userId = req.user.userId;

    // Get job and verify ownership
    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    const job = jobResult.rows[0];

    if (job.client_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to accept applications' 
      });
    }

    if (job.status !== 'posted') {
      return res.status(400).json({ 
        success: false, 
        message: 'Job is no longer available' 
      });
    }

    // Get application
    const applicationResult = await pool.query(
      `SELECT ja.*, u.name as worker_name, u.phone as worker_phone 
       FROM job_applications ja
       JOIN users u ON ja.worker_id = u.id
       WHERE ja.id = $1 AND ja.job_id = $2`,
      [applicationId, jobId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    const application = applicationResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update job status
      await pool.query(
        'UPDATE jobs SET status = \'assigned\', updated_at = NOW() WHERE id = $1',
        [jobId]
      );

      // Create job assignment
      const assignmentResult = await pool.query(
        `INSERT INTO job_assignments (
          job_id, worker_id, agreed_rate, status
        ) VALUES ($1, $2, $3, 'assigned')
        RETURNING *`,
        [jobId, application.worker_id, application.proposed_rate]
      );

      // Update application status
      await pool.query(
        `UPDATE job_applications SET status = 'accepted' WHERE id = $1`,
        [applicationId]
      );

      // Reject all other applications
      await pool.query(
        `UPDATE job_applications 
         SET status = 'rejected' 
         WHERE job_id = $1 AND id != $2`,
        [jobId, applicationId]
      );

      await pool.query('COMMIT');

      const assignment = assignmentResult.rows[0];

      // Notify worker
      await sendNotification(
        application.worker_id,
        'application_accepted',
        {
          job_id: jobId,
          job_title: job.title,
          client_name: req.user.name,
          agreed_rate: application.proposed_rate
        }
      );

      // Send SMS to worker
      await sendSMS(
        application.worker_phone,
        `Congratulations! Your application for "${job.title}" has been accepted. Contact client at ${req.user.phone}.`
      );

      res.json({
        success: true,
        message: 'Application accepted successfully',
        data: assignment
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Accept application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error accepting application' 
    });
  }
});

// Helper function to notify workers about new job
async function notifyWorkersAboutJob(job) {
  try {
    // Find workers in same township with matching skills
    const workersResult = await pool.query(
      `SELECT u.id, u.phone, wp.primary_skill
       FROM users u
       JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE u.user_type = 'worker' 
       AND u.township = $1 
       AND u.is_verified = true
       AND (wp.primary_skill = $2 OR $2 = ANY(wp.skills))
       LIMIT 50`,
      [job.township, job.category]
    );

    // Send notifications
    for (const worker of workersResult.rows) {
      await sendNotification(
        worker.id,
        'new_job',
        {
          job_id: job.id,
          job_title: job.title,
          job_category: job.category,
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          township: job.township
        }
      );

      // Send SMS for urgent jobs
      if (job.urgency === 'urgent' || job.urgency === 'high') {
        await sendSMS(
          worker.phone,
          `URGENT JOB: ${job.title} in ${job.township}. Budget: R${job.budget_min}-${job.budget_max}. Check KasiConnect app.`
        );
      }
    }

    console.log(`Notified ${workersResult.rows.length} workers about job ${job.id}`);

  } catch (error) {
    console.error('Error notifying workers:', error);
  }
}

module.exports = router;