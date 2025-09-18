#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing @aramax/nestjs-shipping library...');

// Check if TypeScript is available
try {
  require.resolve('typescript');
  console.log('✅ TypeScript found');
} catch (error) {
  console.log('❌ TypeScript not found. Installing...');
  require('child_process').execSync('npm install typescript --save-dev', { stdio: 'inherit' });
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('✅ Created dist directory');
}

// Build the library
console.log('📦 Building library...');
try {
  require('child_process').execSync('npm run build', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Library built successfully');
} catch (error) {
  console.log('❌ Build failed');
  process.exit(1);
}

console.log('🎉 @aramax/nestjs-shipping library is ready to use!');
console.log('');
console.log('Next steps:');
console.log('1. Configure your environment variables in .env');
console.log('2. Import AramaxModule in your NestJS application');
console.log('3. Inject ShippingService or TrackingService where needed');
console.log('');
console.log('For more information, check the README.md file.');