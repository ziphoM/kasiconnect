// backend/middleware/contactFilter.js
const contactPatterns = {
    phone: [
        /(0[0-9]{9})\b/,
        /(\+27[0-9]{9})\b/,
        /(27[0-9]{9})\b/,
        /(0[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{4})\b/
    ],
    email: [
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    ],
    social: [
        /(?:facebook\.com|fb\.com)\/[A-Za-z0-9.]+/i,
        /(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+/i,
        /(?:instagram\.com)\/[A-Za-z0-9_.]+/i,
        /@[A-Za-z0-9_]{3,}/
    ]
};

const detectContactInfo = (text) => {
    if (!text) return false;
    
    for (const patterns of Object.values(contactPatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
    }
    return false;
};

const contactFilterMiddleware = (req, res, next) => {
    // Check message field
    if (req.body.message && detectContactInfo(req.body.message)) {
        return res.status(400).json({
            success: false,
            message: 'Contact information detected in message. Please remove phone numbers, emails, or social media handles.'
        });
    }
    
    // Check proposed_rate (ensure it's just a number)
    if (req.body.proposed_rate && typeof req.body.proposed_rate === 'string') {
        if (req.body.proposed_rate.match(/[^0-9]/)) {
            return res.status(400).json({
                success: false,
                message: 'Proposed rate must contain only numbers.'
            });
        }
    }
    
    next();
};

module.exports = contactFilterMiddleware;