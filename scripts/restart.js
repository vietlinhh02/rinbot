#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

const createLogsDir = () => {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
        log('📁 Đã tạo thư mục logs', 'green');
    }
};

const checkPM2 = () => {
    return new Promise((resolve) => {
        exec('pm2 --version', (error) => {
            resolve(!error);
        });
    });
};

const installPM2 = () => {
    return new Promise((resolve, reject) => {
        log('📦 Đang cài đặt PM2...', 'yellow');
        const install = spawn('npm', ['install', '-g', 'pm2'], { stdio: 'pipe' });
        
        install.on('close', (code) => {
            if (code === 0) {
                log('✅ PM2 đã được cài đặt thành công', 'green');
                resolve();
            } else {
                reject(new Error('Không thể cài đặt PM2'));
            }
        });
    });
};

const stopBot = () => {
    return new Promise((resolve) => {
        log('🛑 Đang dừng bot...', 'yellow');
        exec('pm2 stop RinBot', (error) => {
            if (error) {
                log('⚠️ Bot chưa chạy hoặc đã dừng', 'yellow');
            } else {
                log('✅ Đã dừng bot', 'green');
            }
            resolve();
        });
    });
};

const startBot = () => {
    return new Promise((resolve, reject) => {
        log('🚀 Đang khởi động bot...', 'cyan');
        
        const start = spawn('pm2', ['start', 'ecosystem.config.js'], { 
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
        });
        
        let output = '';
        
        start.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        start.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        start.on('close', (code) => {
            if (code === 0) {
                log('✅ Bot đã khởi động thành công!', 'green');
                log('📊 Dùng "npm run pm2:logs" để xem logs', 'cyan');
                resolve();
            } else {
                log('❌ Không thể khởi động bot', 'red');
                console.log(output);
                reject(new Error('Start failed'));
            }
        });
    });
};

const showStatus = () => {
    return new Promise((resolve) => {
        log('📊 Trạng thái bot:', 'cyan');
        const status = spawn('pm2', ['status'], { stdio: 'inherit' });
        
        status.on('close', () => {
            resolve();
        });
    });
};

const main = async () => {
    try {
        log('🔄 RinBot Restart Script', 'bright');
        log('=====================', 'bright');
        
        // Tạo thư mục logs
        createLogsDir();
        
        // Kiểm tra PM2
        const hasPM2 = await checkPM2();
        if (!hasPM2) {
            await installPM2();
        }
        
        // Dừng bot nếu đang chạy
        await stopBot();
        
        // Đợi 2 giây
        log('⏳ Đợi 2 giây...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Khởi động bot
        await startBot();
        
        // Hiển thị trạng thái
        await new Promise(resolve => setTimeout(resolve, 1000));
        await showStatus();
        
        log('🎉 Restart hoàn tất!', 'green');
        
    } catch (error) {
        log(`❌ Lỗi: ${error.message}`, 'red');
        
        // Fallback: thử start bằng node thường
        log('🔄 Thử khởi động bằng Node.js thường...', 'yellow');
        try {
            const nodeStart = spawn('node', ['index.js'], { 
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
            });
            
            log('✅ Bot đang chạy với Node.js', 'green');
            log('⚠️ Lưu ý: Sử dụng Ctrl+C để dừng', 'yellow');
            
        } catch (nodeError) {
            log(`❌ Không thể khởi động: ${nodeError.message}`, 'red');
            process.exit(1);
        }
    }
};

// Xử lý tín hiệu dừng
process.on('SIGINT', () => {
    log('\n🛑 Đang dừng script...', 'yellow');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('\n🛑 Đang dừng script...', 'yellow');
    process.exit(0);
});

main(); 