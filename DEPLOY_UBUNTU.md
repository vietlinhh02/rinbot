# 🐧 Hướng Dẫn Deploy Bot trên Ubuntu

## ⚡ Cài Đặt Nhanh

### 1. Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Cài đặt Node.js (nếu chưa có)
```bash
# Cài NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Cài Node.js
sudo apt install -y nodejs

# Kiểm tra version
node --version
npm --version
```

### 3. Cài đặt System Dependencies cho Canvas
```bash
# Build tools
sudo apt install -y build-essential

# Canvas dependencies
sudo apt install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Additional graphics libraries
sudo apt install -y libpixman-1-dev libfontconfig1-dev libxft-dev

# Font support
sudo apt install -y fontconfig
```

### 4. Clone và Setup Bot
```bash
# Clone repository
git clone <your-repo-url>
cd rinbot

# Install Node.js dependencies
npm install

# Cài đặt Canvas (có thể mất vài phút)
npm install canvas gif-encoder-2
```

## 🧪 Kiểm Tra Canvas

### Chạy script debug:
```bash
node debug_canvas_ubuntu.js
```

### Output mong đợi:
```
✅ Canvas module imported thành công
✅ createCanvas thành công
✅ getContext thành công
✅ Basic drawing thành công
✅ Buffer export thành công
```

## 🔧 Xử Lý Lỗi Thường Gặp

### Lỗi: "Canvas not found"
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
npm install canvas gif-encoder-2 --build-from-source
```

### Lỗi: "cairo not found"
```bash
sudo apt install -y libcairo2-dev pkg-config
npm rebuild canvas
```

### Lỗi: "permission denied"
```bash
# Đảm bảo user có quyền
sudo chown -R $USER:$USER /path/to/rinbot
chmod +x install_canvas_ubuntu.sh
```

## 🚀 Chạy Bot

### Development mode:
```bash
node index.js
```

### Production mode với PM2:
```bash
# Cài PM2
npm install -g pm2

# Chạy bot
pm2 start index.js --name "rinbot"

# Xem logs
pm2 logs rinbot

# Restart bot
pm2 restart rinbot

# Stop bot
pm2 stop rinbot
```

## 📋 System Requirements

- **OS**: Ubuntu 18.04+ (hoặc Debian-based)
- **Node.js**: 16.x hoặc 18.x
- **RAM**: Tối thiểu 512MB (khuyến nghị 1GB+)
- **Storage**: 500MB+ free space
- **Network**: Internet connection

## 🐛 Troubleshooting

### Bot chạy nhưng Canvas không hoạt động:

1. **Kiểm tra dependencies:**
```bash
npm list canvas gif-encoder-2
```

2. **Rebuild Canvas:**
```bash
npm rebuild canvas --build-from-source
```

3. **Kiểm tra system libraries:**
```bash
ldconfig -p | grep cairo
ldconfig -p | grep pango
```

4. **Chạy script debug:**
```bash
node debug_canvas_ubuntu.js
```

### Lỗi "Cannot find module 'canvas'":
```bash
# Cài đặt lại hoàn toàn
npm uninstall canvas gif-encoder-2
rm -rf node_modules/.cache
npm install canvas gif-encoder-2 --build-from-source
```

### Performance Issues:
```bash
# Tăng Node.js memory limit
node --max-old-space-size=1024 index.js

# Hoặc với PM2
pm2 start index.js --name "rinbot" --node-args="--max-old-space-size=1024"
```

## 📞 Hỗ Trợ

Nếu vẫn gặp lỗi, hãy:

1. **Chạy debug script:**
```bash
node debug_canvas_ubuntu.js > debug_output.txt 2>&1
```

2. **Gửi output file** `debug_output.txt` để được hỗ trợ

3. **Kiểm tra logs:**
```bash
# Bot logs
tail -f logs/bot.log

# PM2 logs (nếu dùng PM2)
pm2 logs rinbot --lines 100
```

## 🔄 Auto Scripts

### Chạy script tự động cài đặt:
```bash
chmod +x install_canvas_ubuntu.sh
./install_canvas_ubuntu.sh
```

### Script sẽ:
- ✅ Update system packages
- ✅ Install Canvas dependencies
- ✅ Install Node.js modules
- ✅ Test Canvas functionality
- ✅ Report status

---

**🎉 Chúc bạn deploy thành công!** 