#!/bin/bash

echo "🐧 Cài đặt Canvas dependencies cho Ubuntu..."

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install system dependencies required for canvas
echo "🔧 Installing system dependencies..."
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Install additional dependencies
echo "🎨 Installing additional graphics dependencies..."
sudo apt install -y libpixman-1-dev libfontconfig1-dev libxft-dev

# Install Node.js canvas module
echo "📦 Installing Node.js canvas module..."
npm install canvas

# Install GIF encoder
echo "🎬 Installing GIF encoder..."
npm install gif-encoder-2

# Test installation
echo "🧪 Testing Canvas installation..."
node -e "
try {
    const canvas = require('canvas');
    const GIFEncoder = require('gif-encoder-2');
    console.log('✅ Canvas và GIF Encoder cài đặt thành công!');
    console.log('📋 Canvas version:', canvas.version || 'Unknown');
    
    // Test basic functionality
    const testCanvas = canvas.createCanvas(100, 100);
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 50, 50);
    console.log('✅ Basic Canvas functionality hoạt động!');
    
} catch (error) {
    console.log('❌ Lỗi:', error.message);
    console.log('🔍 Vui lòng kiểm tra system dependencies');
}
"

echo "🎉 Hoàn thành cài đặt Canvas cho Ubuntu!"
echo "🔄 Hãy restart bot để áp dụng thay đổi." 