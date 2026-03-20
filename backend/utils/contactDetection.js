// backend/utils/contactDetection.js
const nlp = require('compromise');

// Try to load compromise-stats if available
let statsPlugin = null;
try {
  // compromise-stats exports a function that takes compromise
  statsPlugin = require('compromise-stats');
  // Apply the plugin
  statsPlugin(nlp);
  console.log('✅ NLP stats plugin loaded');
} catch (error) {
  console.log('⚠️ compromise-stats not installed, using basic detection only');
}

// Common South African phone number patterns
const saPhonePatterns = [
  /(0[0-9]{9})\b/,                    // 0821234567
  /(\+27[0-9]{9})\b/,                  // +27821234567
  /(27[0-9]{9})\b/,                    // 27821234567
  /(0[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{4})\b/, // 082-123-4567
  /(0[0-9]{2}\s[0-9]{3}\s[0-9]{4})\b/,  // 082 123 4567
  /(0[0-9]{2}\.[0-9]{3}\.[0-9]{4})\b/   // 082.123.4567
];

// Social media and contact keywords
const contactKeywords = [
  'call me', 'text me', 'sms me', 'whatsapp', 'wa me', 'contact me',
  'reach me', 'phone me', 'cell', 'mobile', 'my number', 'my phone',
  'chat on', 'dm me', 'ping me', 'send a message', 'get in touch',
  'contact', 'number', 'phone', 'whatsapp', 'email', 'call'
];

// Email pattern
const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

// Social media patterns
const socialPatterns = [
  /(?:facebook\.com|fb\.com)\/[A-Za-z0-9.]+/i,
  /(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+/i,
  /(?:instagram\.com)\/[A-Za-z0-9_.]+/i,
  /(?:linkedin\.com)\/[A-Za-z0-9_\/-]+/i,
  /@[A-Za-z0-9_]{3,}/ // @username mentions
];

/**
 * AI-Powered contact information detection
 * Uses compromise for natural language processing
 */
function detectContactInfoWithAI(text) {
  if (!text) return { hasContact: false, confidence: 0, matches: [] };
  
  const matches = [];
  let confidence = 0;
  const lowerText = text.toLowerCase();

  // 1. Check for phone numbers (high confidence)
  for (const pattern of saPhonePatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push({
        type: 'phone',
        value: found[0],
        confidence: 0.95,
        index: found.index
      });
      confidence += 0.3;
    }
  }

  // 2. Check for emails (very high confidence)
  const emails = text.match(emailPattern);
  if (emails) {
    matches.push({
      type: 'email',
      value: emails[0],
      confidence: 0.98,
      index: emails.index
    });
    confidence += 0.4;
  }

  // 3. Check for social media handles
  for (const pattern of socialPatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push({
        type: 'social',
        value: found[0],
        confidence: 0.9,
        index: found.index
      });
      confidence += 0.25;
    }
  }

  // 4. Check for contact keywords
  for (const keyword of contactKeywords) {
    if (lowerText.includes(keyword)) {
      // Only count if it's a standalone word or part of a contact phrase
      const wordBoundary = new RegExp(`\\b${keyword}\\b`, 'i');
      if (wordBoundary.test(lowerText)) {
        matches.push({
          type: 'contact_keyword',
          value: keyword,
          confidence: 0.5,
          context: 'suspicious_phrase'
        });
        confidence += 0.1;
      }
    }
  }

  // 5. NLP analysis (if compromise-stats is available)
  try {
    const doc = nlp(text);
    
    // Look for numbers that might be phone numbers
    const numbers = doc.numbers().out('array');
    for (const num of numbers) {
      const digits = num.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 10) {
        matches.push({
          type: 'suspicious_number',
          value: num,
          confidence: 0.6,
          digits: digits.length
        });
        confidence += 0.1;
      }
    }
    
    // Look for contact-related phrases
    const contactPhrases = doc.match('(call|text|whatsapp|phone|number) (me|us|at|on)').out('array');
    if (contactPhrases.length > 0) {
      matches.push({
        type: 'contact_phrase',
        value: contactPhrases[0],
        confidence: 0.7
      });
      confidence += 0.2;
    }
  } catch (error) {
    console.error('NLP analysis error:', error);
  }

  // Normalize confidence
  confidence = Math.min(confidence, 1.0);
  
  // Calculate final confidence based on match quality
  const hasPhoneOrEmail = matches.some(m => m.type === 'phone' || m.type === 'email');
  if (hasPhoneOrEmail) {
    confidence = Math.max(confidence, 0.85);
  }

  return {
    hasContact: matches.length > 0,
    confidence,
    matches,
    needsReview: confidence > 0.4 && confidence < 0.8
  };
}

/**
 * Clean contact information from text
 */
function sanitizeContactInfo(text) {
  if (!text) return text;
  
  let sanitized = text;
  
  // Replace phone numbers
  for (const pattern of saPhonePatterns) {
    sanitized = sanitized.replace(pattern, '[PHONE HIDDEN]');
  }
  
  // Replace emails
  sanitized = sanitized.replace(emailPattern, '[EMAIL HIDDEN]');
  
  // Replace social media handles
  for (const pattern of socialPatterns) {
    sanitized = sanitized.replace(pattern, '[SOCIAL HIDDEN]');
  }
  
  return sanitized;
}

/**
 * Log suspicious activity for review
 */
async function logSuspiciousActivity(userId, contentType, content, detection) {
  try {
    const { pool } = require('../db');
    
    await pool.execute(
      `INSERT INTO flagged_content 
       (user_id, content_type, content, detection_data, confidence, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        userId, 
        contentType, 
        content, 
        JSON.stringify(detection), 
        detection.confidence
      ]
    );
    console.log(`🚨 Suspicious content logged for user ${userId} (confidence: ${detection.confidence})`);
  } catch (error) {
    console.error('Error logging suspicious content:', error);
  }
}

module.exports = {
  detectContactInfoWithAI,
  sanitizeContactInfo,
  logSuspiciousActivity
};