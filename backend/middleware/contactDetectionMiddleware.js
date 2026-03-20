// backend/middleware/contactDetectionMiddleware.js
const { detectContactInfo, logSuspiciousActivity } = require('../utils/contactDetection');
const { pool } = require('../db');

const contactDetectionMiddleware = (contentType) => {
  return async (req, res, next) => {
    try {
      // Check fields that might contain contact info
      const fieldsToCheck = ['message', 'bio', 'description', 'title', 'content'];
      let suspiciousContent = null;

      for (const field of fieldsToCheck) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const detection = detectContactInfo(req.body[field]);
          if (detection.hasContact && detection.confidence > 0.5) {
            suspiciousContent = {
              field,
              content: req.body[field],
              detection
            };
            break;
          }
        }
      }

      if (suspiciousContent) {
        // Log the violation
        await logSuspiciousActivity(
          req.user.userId,
          contentType,
          suspiciousContent.content,
          suspiciousContent.detection
        );

        // Check violation count
        const [result] = await pool.execute(
          `SELECT COUNT(*) as count FROM flagged_content 
           WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
          [req.user.userId]
        );
        
        const violationCount = result[0].count;
        
        let message = '⚠️ Please do not include contact information like phone numbers, emails, or social media handles. ';
        
        if (violationCount >= 3) {
          message = '🚫 Your account has been temporarily suspended due to multiple contact information violations. Please contact support.';
        } else if (violationCount >= 1) {
          message += `This is violation #${violationCount}. Further violations may result in account suspension.`;
        } else {
          message += 'Your phone number and email will be revealed to clients only after you\'re hired.';
        }

        return res.status(400).json({
          success: false,
          message,
          violationCount,
          field: suspiciousContent.field
        });
      }

      next();
    } catch (error) {
      console.error('Error in contact detection middleware:', error);
      next(); // Don't block the request if detection fails
    }
  };
};

module.exports = contactDetectionMiddleware;