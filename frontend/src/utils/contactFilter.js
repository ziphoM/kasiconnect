// frontend/src/utils/contactFilter.js
export const contactPatterns = {
    // South African phone patterns
    phone: [
        /\b(0[0-9]{9})\b/,                    // 0821234567
        /\b(\+27[0-9]{9})\b/,                  // +27821234567
        /\b(27[0-9]{9})\b/,                    // 27821234567
        /\b(0[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{4})\b/, // 082-123-4567
        /\b(0[0-9]{2}\s[0-9]{3}\s[0-9]{4})\b/  // 082 123 4567
    ],
    // Email patterns
    email: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\.[A-Z|a-z]{2,}\b/
    ],
    // Social media handles
    social: [
        /\b(?:facebook\.com|fb\.com)\/[A-Za-z0-9.]+/i,
        /\b(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+/i,
        /\b(?:instagram\.com)\/[A-Za-z0-9_.]+/i,
        /\b(?:wa\.me|whatsapp\.com)\/[A-Za-z0-9]+/i,
        /\b@[A-Za-z0-9_]{3,}/, // @username mentions
    ],
    // WhatsApp specific
    whatsapp: [
        /\b(?:whatsapp|wa)\s*(?:me|app)?\s*[:\-]?\s*(\+?[0-9\s\-]{10,})/i,
        /\b(?:call|text|sms|message)\s*(?:me|us)?\s*(?:on|at)?\s*(\+?[0-9\s\-]{10,})/i
    ]
};

export const detectContactInfo = (text) => {
    if (!text) return { hasContact: false, matches: [] };
    
    const matches = [];
    
    for (const [type, patterns] of Object.entries(contactPatterns)) {
        for (const pattern of patterns) {
            const found = text.match(pattern);
            if (found) {
                matches.push({
                    type,
                    match: found[0],
                    index: found.index
                });
            }
        }
    }
    
    return {
        hasContact: matches.length > 0,
        matches
    };
};

export const filterContactInfo = (text) => {
    let filtered = text;
    for (const patterns of Object.values(contactPatterns)) {
        for (const pattern of patterns) {
            filtered = filtered.replace(pattern, '[CONTACT HIDDEN]');
        }
    }
    return filtered;
};