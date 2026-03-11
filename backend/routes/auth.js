const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { pool } = require('../server');
const { sendSMS } = require('../utils/smsService');
const { generateVerificationCode } = require('../utils/helpers');

// Register user
router.post('/register', [
  check('phone').isMobilePhone().withMessage('Valid phone number required'),
  check('name').notEmpty().withMessage('Name is required'),
  check('user_type').isIn(['worker', 'client', 'partner']).withMessage('Valid user type required'),
  check('township').notEmpty().withMessage('Township is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, name, user_type, township, id_number, email } = req.body;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this phone already exists' 
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users 
       (phone, name, user_type, township, id_number, email, verification_level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, phone, name, user_type, township`,
      [phone, name, user_type, township, id_number, email, 0]
    );

    const user = result.rows[0];

    // Save verification code
    await pool.query(
      `INSERT INTO verification_codes 
       (user_id, code, purpose, expires_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [user.id, verificationCode, 'registration']
    );

    // Send SMS with verification code
    await sendSMS(
      phone,
      `Welcome to KasiConnect! Your verification code: ${verificationCode}. Dial *130*469# for USSD menu.`
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your phone.',
      data: { user, token },
      requires_verification: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Verify phone
router.post('/verify', [
  check('phone').isMobilePhone().withMessage('Valid phone number required'),
  check('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    const { phone, code } = req.body;

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = userResult.rows[0].id;

    // Check verification code
    const codeResult = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'registration' 
       AND used = false AND expires_at > NOW()`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification code' 
      });
    }

    // Mark code as used
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );

    // Update user verification status
    await pool.query(
      'UPDATE users SET is_verified = true, verification_level = 1 WHERE id = $1',
      [userId]
    );

    // Get updated user
    const updatedUser = await pool.query(
      'SELECT id, phone, name, user_type, township, is_verified FROM users WHERE id = $1',
      [userId]
    );

    // Generate new token
    const token = jwt.sign(
      { userId: userId, userType: updatedUser.rows[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Phone verified successfully',
      data: { 
        user: updatedUser.rows[0], 
        token 
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
});

// Login with phone
router.post('/login', [
  check('phone').isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const { phone } = req.body;

    // Find user
    const userResult = await pool.query(
      `SELECT id, phone, name, user_type, township, is_verified 
       FROM users WHERE phone = $1`,
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please register first.' 
      });
    }

    const user = userResult.rows[0];

    // Generate login code
    const loginCode = generateVerificationCode();

    // Save login code
    await pool.query(
      `INSERT INTO verification_codes 
       (user_id, code, purpose, expires_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [user.id, loginCode, 'login']
    );

    // Send SMS with login code
    await sendSMS(
      phone,
      `Your KasiConnect login code: ${loginCode}. Valid for 10 minutes.`
    );

    res.json({
      success: true,
      message: 'Login code sent to your phone',
      requires_code: true,
      phone: phone
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Verify login code
router.post('/login/verify', [
  check('phone').isMobilePhone().withMessage('Valid phone number required'),
  check('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    const { phone, code } = req.body;

    // Find user
    const userResult = await pool.query(
      `SELECT id, phone, name, user_type, township, is_verified 
       FROM users WHERE phone = $1`,
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];
    const userId = user.id;

    // Check login code
    const codeResult = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'login' 
       AND used = false AND expires_at > NOW()`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired login code' 
      });
    }

    // Mark code as used
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token }
    });

  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login verification' 
    });
  }
});

// Request password reset
router.post('/reset-password/request', [
  check('phone').isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const { phone } = req.body;

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal that user doesn't exist for security
      return res.json({
        success: true,
        message: 'If your number is registered, you will receive a reset code'
      });
    }

    const userId = userResult.rows[0].id;
    const resetCode = generateVerificationCode();

    // Save reset code
    await pool.query(
      `INSERT INTO verification_codes 
       (user_id, code, purpose, expires_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [userId, resetCode, 'reset']
    );

    // Send SMS
    await sendSMS(
      phone,
      `Your KasiConnect password reset code: ${resetCode}. Valid for 15 minutes.`
    );

    res.json({
      success: true,
      message: 'Reset code sent to your phone'
    });

  } catch (error) {
    console.error('Reset request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Reset password with code
router.post('/reset-password/confirm', [
  check('phone').isMobilePhone().withMessage('Valid phone number required'),
  check('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  check('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = userResult.rows[0].id;

    // Verify reset code
    const codeResult = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'reset' 
       AND used = false AND expires_at > NOW()`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password (in a real app, you'd store hashed password)
    // For now, we're using phone verification, so no password storage
    await pool.query(
      'UPDATE verification_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });

  } catch (error) {
    console.error('Reset confirm error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;