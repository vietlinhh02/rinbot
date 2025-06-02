console.log('🐧 Debug Canvas trên Ubuntu Server...');

// Test 1: Basic Canvas import với error chi tiết
console.log('\n📦 Test 1: Import Canvas...');
try {
    const canvas = require('canvas');
    console.log('✅ Canvas module imported thành công');
    
    // Kiểm tra các function có sẵn
    console.log('🔍 Canvas functions:');
    console.log('  - createCanvas:', typeof canvas.createCanvas);
    console.log('  - loadImage:', typeof canvas.loadImage);
    console.log('  - registerFont:', typeof canvas.registerFont);
    
    // Test tạo canvas
    const testCanvas = canvas.createCanvas(100, 100);
    console.log('✅ createCanvas thành công');
    
    const ctx = testCanvas.getContext('2d');
    console.log('✅ getContext thành công');
    
    // Test vẽ cơ bản
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 50, 50);
    console.log('✅ Basic drawing thành công');
    
    // Test buffer export
    const buffer = testCanvas.toBuffer('image/png');
    console.log('✅ Buffer export thành công, size:', buffer.length, 'bytes');
    
} catch (error) {
    console.log('❌ Canvas error:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('  Stack:', error.stack);
    
    // Kiểm tra require paths
    try {
        require.resolve('canvas');
        console.log('✅ Canvas module found in require.resolve');
    } catch (resolveError) {
        console.log('❌ Canvas module NOT found:', resolveError.message);
    }
}

// Test 2: GIF Encoder import chi tiết
console.log('\n🎬 Test 2: Import GIF Encoder...');
try {
    const GIFEncoder = require('gif-encoder-2');
    console.log('✅ GIF Encoder imported thành công');
    
    // Test tạo encoder
    const encoder = new GIFEncoder(100, 100);
    console.log('✅ GIF Encoder instance tạo thành công');
    console.log('🔍 Encoder methods:', Object.getOwnPropertyNames(encoder).slice(0, 5));
    
} catch (error) {
    console.log('❌ GIF Encoder error:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    
    try {
        require.resolve('gif-encoder-2');
        console.log('✅ gif-encoder-2 module found');
    } catch (resolveError) {
        console.log('❌ gif-encoder-2 module NOT found:', resolveError.message);
    }
}

// Test 3: System dependencies check
console.log('\n🔍 Test 3: System Dependencies...');
const fs = require('fs');

// Kiểm tra các thư viện hệ thống quan trọng
const systemLibs = [
    '/usr/lib/x86_64-linux-gnu/libcairo.so.2',
    '/usr/lib/x86_64-linux-gnu/libpango-1.0.so.0',
    '/usr/lib/x86_64-linux-gnu/libjpeg.so.8',
    '/usr/lib/x86_64-linux-gnu/libpng16.so.16'
];

systemLibs.forEach(lib => {
    if (fs.existsSync(lib)) {
        console.log(`✅ ${lib} - OK`);
    } else {
        console.log(`❌ ${lib} - MISSING`);
    }
});

// Test 4: Module info
console.log('\n📋 Test 4: Module Info...');
console.log('🐧 Platform:', process.platform);
console.log('🏗️ Architecture:', process.arch);
console.log('📝 Node version:', process.version);
console.log('📁 Working directory:', process.cwd());

// Kiểm tra package.json dependencies
try {
    const packageJson = require('./package.json');
    console.log('\n📦 Package.json dependencies:');
    if (packageJson.dependencies.canvas) {
        console.log('  ✅ canvas:', packageJson.dependencies.canvas);
    } else {
        console.log('  ❌ canvas: NOT LISTED');
    }
    if (packageJson.dependencies['gif-encoder-2']) {
        console.log('  ✅ gif-encoder-2:', packageJson.dependencies['gif-encoder-2']);
    } else {
        console.log('  ❌ gif-encoder-2: NOT LISTED');
    }
} catch (error) {
    console.log('❌ Không đọc được package.json:', error.message);
}

// Test 5: Load Image test với error chi tiết
console.log('\n🖼️ Test 5: Load Image test...');
try {
    const canvas = require('canvas');
    const path = require('path');
    
    const testImagePath = path.join(__dirname, 'modules/table.png');
    console.log('📁 Test image path:', testImagePath);
    
    if (fs.existsSync(testImagePath)) {
        console.log('✅ Test image file tồn tại');
        
        // Test async load
        canvas.loadImage(testImagePath).then((image) => {
            console.log('✅ loadImage thành công');
            console.log('📐 Image size:', image.width, 'x', image.height);
        }).catch((error) => {
            console.log('❌ loadImage error:', error.message);
            console.log('📋 Full error:', error);
        });
    } else {
        console.log('⚠️ Test image file không tồn tại');
        
        // List files in modules directory
        const modulesDir = path.join(__dirname, 'modules');
        if (fs.existsSync(modulesDir)) {
            console.log('📂 Files in modules/:', fs.readdirSync(modulesDir));
        }
    }
} catch (error) {
    console.log('❌ Image test error:', error.message);
}

// Test 6: Environment variables
console.log('\n🌍 Test 6: Environment Variables...');
const importantEnvs = [
    'LD_LIBRARY_PATH', 
    'PKG_CONFIG_PATH', 
    'CAIRO_PATH',
    'NODE_ENV',
    'PATH'
];
importantEnvs.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
        console.log(`✅ ${envVar}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    } else {
        console.log(`❌ ${envVar}: Not set`);
    }
});

console.log('\n🔚 Debug hoàn thành! Gửi output này để được hỗ trợ.'); 