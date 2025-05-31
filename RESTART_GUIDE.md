# 🔄 RinBot Auto-Restart System

## 🆕 Tính năng mới
Bot giờ đây có khả năng **tự động restart** khi gặp lỗi, không còn bị shutdown hoàn toàn!

## 🛠️ Cách sử dụng

### 1. Khởi động bot thông thường
```bash
npm start
# hoặc
node index.js
```

### 2. Khởi động với PM2 (Khuyến nghị)
```bash
# Cài đặt PM2 (nếu chưa có)
npm install -g pm2

# Khởi động bot với PM2
npm run pm2:start

# Xem trạng thái
npm run pm2:status

# Xem logs
npm run pm2:logs
```

### 3. Script restart thông minh
```bash
# Script restart an toàn
npm run restart

# Restart an toàn với PM2
npm run safe-restart
```

## 📊 Monitoring & Logs

### Xem logs
```bash
# Logs PM2
npm run logs

# Monitor real-time
npm run monitor

# Health check
npm run health
```

### Các lệnh PM2 hữu ích
```bash
# Dừng bot
npm run pm2:stop

# Restart bot
npm run pm2:restart

# Reload bot (zero downtime)
npm run pm2:reload

# Xóa bot khỏi PM2
npm run pm2:delete
```

## 🔧 Cấu hình Auto-Restart

### Trong code (index.js)
- **Max restarts**: 10 lần
- **Restart delay**: 10 giây
- **Auto-reconnect**: 30 giây timeout

### Trong PM2 (ecosystem.config.js)
- **Max memory**: 400MB (auto restart)
- **Min uptime**: 30 giây
- **Daily restart**: 4:00 AM
- **Max restarts**: 10 lần/phút

## 🚨 Xử lý lỗi

### Khi bot bị crash
1. **Auto-restart** sẽ kích hoạt trong vòng 10 giây
2. Thử tối đa **10 lần** restart
3. Nếu vẫn lỗi → dừng để tránh loop vô tận

### Khi bot disconnect
1. Đợi **30 giây** để Discord reconnect
2. Nếu không reconnect được → auto restart
3. Logs sẽ ghi lại toàn bộ quá trình

### Khi bot dùng quá nhiều RAM
1. PM2 tự động restart khi vượt **400MB**
2. Node.js giới hạn **256MB** heap size
3. Graceful shutdown trong **5 giây**

## 📂 File logs

Logs được lưu trong thư mục `./logs/`:
- `combined.log` - Tất cả logs
- `out.log` - Output logs  
- `error.log` - Error logs

## 🎯 Best Practices

### 1. Sử dụng PM2 cho production
```bash
npm run pm2:start
```

### 2. Monitor thường xuyên
```bash
npm run monitor
```

### 3. Kiểm tra logs khi có vấn đề
```bash
npm run logs
```

### 4. Restart an toàn khi update
```bash
npm run safe-restart
```

### 5. Daily maintenance
- Bot tự động restart lúc **4:00 AM** mỗi ngày
- Giúp làm mới memory và connections

## ⚡ Quick Commands

```bash
# Start
npm run pm2:start

# Stop  
npm run pm2:stop

# Restart
npm run restart

# Logs
npm run logs

# Status
npm run pm2:status

# Monitor
npm run monitor
```

## 🔍 Troubleshooting

### Bot không start được
1. Kiểm tra file `.env` và config
2. Xem logs: `npm run logs`
3. Thử restart: `npm run restart`

### Bot restart liên tục
1. Xem error logs: `tail -f logs/error.log`
2. Kiểm tra database connection
3. Kiểm tra Discord token

### PM2 không hoạt động
1. Cài lại PM2: `npm install -g pm2`
2. Dùng Node.js thường: `npm start`
3. Dùng script restart: `npm run restart`

## 📋 System Requirements

- **Node.js**: >= 18.0.0
- **PM2**: >= 5.0.0 (optional)
- **RAM**: Tối thiểu 512MB
- **Disk**: 100MB cho logs

---

🎉 **Bot giờ đây sẽ không bao giờ bị shutdown hoàn toàn nữa!** 