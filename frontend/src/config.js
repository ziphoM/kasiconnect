// frontend/src/config.js
const config = {
    // For local development
    development: {
        API_URL: 'http://localhost:5000/api'
    },
    // For production - UPDATE THIS WITH YOUR ACTUAL SERVER URL
    production: {
        API_URL: 'https://your-domain.com/api' // Change this to your domain
    }
};

// Determine which config to use
const environment = process.env.NODE_ENV || 'development';
export default config[environment];