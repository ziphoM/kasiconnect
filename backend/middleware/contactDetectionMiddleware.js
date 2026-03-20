// backend/middleware/contactDetectionMiddleware.js
const { detectContactInfoWithAI, logSuspiciousActivity } = require('../utils/contactDetection');
const { pool } = require('../db');

const contactDetectionMiddleware = (contentType) => {
  return async (req, res, next) => {
    try {
      // Check both message and bio fields
      const fieldsToCheck = ['message', 'bio', 'description', 'title', 'content'];
      let suspiciousContent = null;
      let fieldName = null;

      for (const field of fieldsToCheck) {
        if (req.body[field]) {
          const detection = detectContactInfoWithAI(req.body[field]);
          if (detection.hasContact) {
            suspiciousContent = {
              field,
              content: req.body[field],
              detection
            };
            fieldName = field;
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

        // Check if user has too many violations
        const violationCount = await checkUserViolations(req.user.userId);
        
        let message = 'Please do not include contact information like phone numbers, emails, or social media handles. ';
        
        if (violationCount >= 3) {
          message = 'Your account has been temporarily suspended due to multiple contact information violations. Please contact support.';
        } else if (violationCount >= 1) {
          message += `This is violation #${violationCount}. Further violations may result in account suspension.`;
        } else {
          message += 'Your phone number and email will be revealed to clients only after you\'re hired.';
        }

        return res.status(400).json({
          success: false,
          message,
          violationCount,
          needsReview: suspiciousContent.detection.needsReview
        });
      }

      next();
    } catch (error) {
      console.error('Error in contact detection middleware:', error);
      next(); // Don't block the request if detection fails
    }
  };
};

// Helper function to check user violations
async function checkUserViolations(userId) {
  try {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count FROM flagged_content 
       WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId]
    );
    
    return result[0].count;
  } catch (error) {
    console.error('Error checking violations:', error);
    return 0;
  }
}

module.exports = contactDetectionMiddleware;