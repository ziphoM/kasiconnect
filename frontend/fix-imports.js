// fix-imports.js
const fs = require('fs');
const path = require('path');

const componentFolders = [
    'src/components/auth',
    'src/components/common',
    'src/components/jobs',
    'src/components/workers',
    'src/components/vouchers',
    'src/components/admin',
    'src/pages',
    'src/contexts',
    'src/services'
];

// Create missing directories
componentFolders.forEach(folder => {
    const fullPath = path.join(__dirname, folder);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${folder}`);
    }
});

console.log('✅ Directory structure fixed');

// Now create all missing files manually with the code provided above
console.log('\n📝 Next steps:');
console.log('1. Create all the missing .js files with the code provided');
console.log('2. Make sure file names match imports exactly');
console.log('3. Restart the dev server: npm start');