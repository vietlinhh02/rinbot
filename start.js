#!/usr/bin/env node

const DeployManager = require('./deploy-manager.js');

console.log('🤖 RinBot Deploy Manager');
console.log('========================');
console.log('Tính năng:');
console.log('• ✅ Tự động khởi động bot');
console.log('• 🔄 Auto restart khi code thay đổi');
console.log('• 📤 Thông báo vào Discord');
console.log('• 🛡️ Graceful shutdown');
console.log('• 🔧 Crash recovery');
console.log('========================\n');

// Khởi động Deploy Manager
new DeployManager(); 