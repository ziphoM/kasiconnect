const express = require('express');
const bodyParser = require('body-parser');
const { AfricasTalking } = require('africastalking');
const { pool } = require('../server');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Africa's Talking setup
const credentials = {
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
};
const africastalking = AfricasTalking(credentials);
const sms = africastalking.SMS;
const ussd = africastalking.USSD;

// USSD Menu States
const MENU_STATES = {
  MAIN: 'main',
  REGISTER: 'register',
  REGISTER_NAME: 'register_name',
  REGISTER_SKILL: 'register_skill',
  REGISTER_LOCATION: 'register_location',
  VIEW_JOBS: 'view_jobs',
  JOB_DETAILS: 'job_details',
  APPLY_JOB: 'apply_job',
  PROFILE: 'profile',
  VERIFICATION: 'verification',
  HELP: 'help'
};

// USSD Session store
const sessions = new Map();

// USSD Endpoint
app.post('/ussd', async (req, res) => {
  try {
    const { sessionId, phoneNumber, text, networkCode } = req.body;
    
    // Log session
    await pool.query(
      `INSERT INTO ussd_sessions 
       (session_id, phone_number, text, network_code) 
       VALUES ($1, $2, $3, $4)`,
      [sessionId, phoneNumber, text || '', networkCode]
    );

    let response = '';
    const input = text ? text.split('*') : [];
    const currentStep = input.length;

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        phoneNumber,
        state: MENU_STATES.MAIN,
        data: {}
      };
      sessions.set(sessionId, session);
    }

    // Clear session after 5 minutes
    setTimeout(() => {
      sessions.delete(sessionId);
    }, 5 * 60 * 1000);

    // Handle menu navigation
    switch (session.state) {
      case MENU_STATES.MAIN:
        response = await handleMainMenu(input, session, phoneNumber);
        break;
      case MENU_STATES.REGISTER:
        response = await handleRegister(input, session, phoneNumber);
        break;
      case MENU_STATES.REGISTER_NAME:
        response = await handleRegisterName(input, session);
        break;
      case MENU_STATES.REGISTER_SKILL:
        response = await handleRegisterSkill(input, session);
        break;
      case MENU_STATES.REGISTER_LOCATION:
        response = await handleRegisterLocation(input, session, phoneNumber);
        break;
      case MENU_STATES.VIEW_JOBS:
        response = await handleViewJobs(input, session, phoneNumber);
        break;
      case MENU_STATES.JOB_DETAILS:
        response = await handleJobDetails(input, session);
        break;
      case MENU_STATES.APPLY_JOB:
        response = await handleApplyJob(input, session, phoneNumber);
        break;
      case MENU_STATES.PROFILE:
        response = await handleProfile(input, session, phoneNumber);
        break;
      case MENU_STATES.VERIFICATION:
        response = await handleVerification(input, session, phoneNumber);
        break;
      case MENU_STATES.HELP:
        response = handleHelp();
        break;
      default:
        response = 'END Invalid option. Please try again.';
    }

    // Update session
    sessions.set(sessionId, session);

    // Send response
    res.set('Content-Type', 'text/plain');
    res.send(response);

    // Log response
    await pool.query(
      'UPDATE ussd_sessions SET response = $1 WHERE session_id = $2',
      [response, sessionId]
    );

  } catch (error) {
    console.error('USSD Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again later.');
  }
});

async function handleMainMenu(input, session, phoneNumber) {
  if (input.length === 0 || input[0] === '') {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name, user_type, is_verified FROM users WHERE phone = $1',
      [phoneNumber]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      session.userId = user.id;
      session.userType = user.user_type;
      
      if (!user.is_verified) {
        session.state = MENU_STATES.VERIFICATION;
        return `CON Your account needs verification. Please visit a partner shop.\n\n1. Find nearest shop\n2. Resend verification code\n0. Back`;
      }

      return `CON Welcome back ${user.name}!\n\n1. View available jobs\n2. My profile\n3. Job applications\n4. Verification status\n5. Help\n0. Exit`;
    } else {
      session.state = MENU_STATES.REGISTER;
      return `CON Welcome to KasiConnect!\n\n1. Register as Worker\n2. Register as Client\n3. Learn more\n4. Help\n0. Exit`;
    }
  }

  const choice = input[0];
  
  if (session.userId) {
    // Existing user menu
    switch (choice) {
      case '1':
        session.state = MENU_STATES.VIEW_JOBS;
        return await getAvailableJobs(phoneNumber);
      case '2':
        session.state = MENU_STATES.PROFILE;
        return await getUserProfile(session.userId);
      case '3':
        return await getJobApplications(session.userId);
      case '4':
        session.state = MENU_STATES.VERIFICATION;
        return await getVerificationStatus(session.userId);
      case '5':
        session.state = MENU_STATES.HELP;
        return `CON Need help?\n\n1. How to get verified\n2. How to apply for jobs\n3. Safety tips\n4. Contact support\n0. Back`;
      case '0':
        sessions.delete(session.sessionId);
        return 'END Thank you for using KasiConnect!';
      default:
        return 'END Invalid option. Please try again.';
    }
  } else {
    // New user menu
    switch (choice) {
      case '1':
        session.userType = 'worker';
        session.state = MENU_STATES.REGISTER_NAME;
        return 'CON Enter your full name:';
      case '2':
        session.userType = 'client';
        session.state = MENU_STATES.REGISTER_NAME;
        return 'CON Enter your full name:';
      case '3':
        return 'END KasiConnect connects township workers with clients. Works on any phone. Dial *130*469# to start.';
      case '4':
        session.state = MENU_STATES.HELP;
        return `CON Need help?\n\n1. How to register\n2. How verification works\n3. Safety information\n4. Contact details\n0. Back`;
      case '0':
        sessions.delete(session.sessionId);
        return 'END Thank you. Goodbye!';
      default:
        return 'END Invalid option. Please try again.';
    }
  }
}

async function handleRegisterName(input, session) {
  const name = input[input.length - 1];
  if (!name || name.length < 2) {
    return 'CON Invalid name. Enter your full name:';
  }
  
  session.data.name = name;
  session.state = MENU_STATES.REGISTER_SKILL;
  
  if (session.userType === 'worker') {
    return `CON Select your main skill:\n\n1. Gardening\n2. Building\n3. Plumbing\n4. Painting\n5. Electrical\n6. Cleaning\n7. Other`;
  } else {
    session.state = MENU_STATES.REGISTER_LOCATION;
    return 'CON Enter your township (e.g., Soweto, Alexandra):';
  }
}

async function handleRegisterSkill(input, session) {
  const skillChoice = input[input.length - 1];
  const skills = [
    'Gardening', 'Building', 'Plumbing', 'Painting', 
    'Electrical', 'Cleaning', 'Other'
  ];
  
  if (!skillChoice || skillChoice < '1' || skillChoice > '7') {
    return `CON Invalid choice. Select skill:\n\n1. Gardening\n2. Building\n3. Plumbing\n4. Painting\n5. Electrical\n6. Cleaning\n7. Other`;
  }
  
  session.data.skill = skills[parseInt(skillChoice) - 1];
  session.state = MENU_STATES.REGISTER_LOCATION;
  return 'CON Enter your township (e.g., Soweto, Alexandra):';
}

async function handleRegisterLocation(input, session, phoneNumber) {
  const township = input[input.length - 1];
  
  if (!township || township.length < 2) {
    return 'CON Invalid township. Enter your township:';
  }
  
  session.data.township = township;
  
  // Register user in database
  try {
    const result = await pool.query(
      `INSERT INTO users (phone, name, user_type, township, verification_level) 
       VALUES ($1, $2, $3, $4, 0) 
       RETURNING id`,
      [phoneNumber, session.data.name, session.userType, township]
    );
    
    session.userId = result.rows[0].id;
    
    // If worker, create worker profile
    if (session.userType === 'worker') {
      await pool.query(
        `INSERT INTO worker_profiles (user_id, primary_skill) 
         VALUES ($1, $2)`,
        [session.userId, session.data.skill]
      );
    }
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await pool.query(
      `INSERT INTO verification_codes 
       (user_id, code, purpose, expires_at) 
       VALUES ($1, $2, 'registration', NOW() + INTERVAL '10 minutes')`,
      [session.userId, verificationCode]
    );
    
    // Send SMS with verification code
    await sms.send({
      to: phoneNumber,
      message: `Welcome to KasiConnect ${session.data.name}! Your verification code: ${verificationCode}. Visit a partner shop to get verified.`
    });
    
    // Find nearest partner shops
    const shops = await pool.query(
      `SELECT shop_name, address FROM partner_shops 
       WHERE township = $1 AND is_active = true 
       LIMIT 3`,
      [township]
    );
    
    let shopInfo = '';
    if (shops.rows.length > 0) {
      shopInfo = '\n\nNearest verification shops:';
      shops.rows.forEach((shop, i) => {
        shopInfo += `\n${i + 1}. ${shop.shop_name} - ${shop.address}`;
      });
    }
    
    sessions.delete(session.sessionId);
    
    return `END Registration successful ${session.data.name}!${shopInfo}\n\nDial *130*469# to view jobs.`;
    
  } catch (error) {
    console.error('Registration error:', error);
    return 'END Registration failed. Please try again or contact support.';
  }
}

async function getAvailableJobs(phoneNumber) {
  try {
    // Get user's township
    const userResult = await pool.query(
      'SELECT township FROM users WHERE phone = $1',
      [phoneNumber]
    );
    
    if (userResult.rows.length === 0) {
      return 'END User not found. Please register first.';
    }
    
    const township = userResult.rows[0].township;
    
    // Get available jobs
    const jobsResult = await pool.query(
      `SELECT id, job_code, title, budget_min, budget_max, urgency 
       FROM jobs 
       WHERE township = $1 AND status = 'posted' 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [township]
    );
    
    if (jobsResult.rows.length === 0) {
      return `CON No jobs available in ${township}.\n\n1. Check other townships\n2. Update my location\n0. Back`;
    }
    
    let response = `CON Available jobs in ${township}:\n\n`;
    
    jobsResult.rows.forEach((job, index) => {
      const urgencyIcon = job.urgency === 'urgent' ? '🚨 ' : '';
      response += `${index + 1}. ${urgencyIcon}${job.title} (R${job.budget_min}-${job.budget_max})\n`;
    });
    
    response += '\nSelect job number for details\n0. Back';
    
    return response;
    
  } catch (error) {
    console.error('Get jobs error:', error);
    return 'END Error fetching jobs. Please try again.';
  }
}

async function getUserProfile(userId) {
  try {
    const userResult = await pool.query(
      `SELECT u.name, u.township, u.verification_level, 
              wp.primary_skill, wp.rating, wp.total_jobs
       FROM users u
       LEFT JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return 'END Profile not found.';
    }
    
    const user = userResult.rows[0];
    
    let response = `CON Your Profile:\n\nName: ${user.name}\nTownship: ${user.township}\n`;
    response += `Verification: Level ${user.verification_level}\n`;
    
    if (user.primary_skill) {
      response += `Skill: ${user.primary_skill}\n`;
      response += `Rating: ${user.rating || 'No ratings yet'}\n`;
      response += `Jobs completed: ${user.total_jobs || 0}\n`;
    }
    
    response += '\n1. Update profile\n2. View ratings\n3. Job history\n0. Back';
    
    return response;
    
  } catch (error) {
    console.error('Get profile error:', error);
    return 'END Error fetching profile.';
  }
}

// SMS sending function
async function sendJobAlert(workerPhone, jobDetails) {
  try {
    const message = `NEW JOB ALERT: ${jobDetails.title} in ${jobDetails.township}. Budget: R${jobDetails.budget_min}-${jobDetails.budget_max}. To apply, dial *130*469#`;
    
    await sms.send({
      to: workerPhone,
      message: message
    });
    
    // Log SMS
    await pool.query(
      `INSERT INTO sms_logs 
       (phone_number, message, direction, status) 
       VALUES ($1, $2, 'outbound', 'sent')`,
      [workerPhone, message]
    );
    
    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
}

module.exports = app;