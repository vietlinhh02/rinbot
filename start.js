#!/usr/bin/env node

/**
 * Rinbot Start Script
 * Khởi động bot trực tiếp mà không qua Deploy Manager
 */

const { spawn } = require('child_process');

console.log('🤖 Starting RinBot...');

// Khởi động bot trực tiếp
const botProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
});

botProcess.on('close', (code) => {
    console.log(`🔴 Bot stopped with code: ${code}`);
    process.exit(code);
});

botProcess.on('error', (error) => {
    console.error('❌ Error starting bot:', error);
    process.exit(1);
}); 