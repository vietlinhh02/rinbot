# 🤖 RinBot - Discord Bot Đa Chức Năng

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14-blue.svg)](https://discord.js.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **RinBot** là một Discord bot đa chức năng được viết bằng Node.js, mang đến trải nghiệm giải trí phong phú với nhiều tính năng độc đáo như hệ thống kinh tế, mini-games, quản lý thành phố và nhiều hơn nữa!

## ✨ Tính Năng Nổi Bật

### 💰 **Hệ Thống Kinh Tế**
- 💳 Tiền tệ Rin với daily, work, chuyển khoản
- 🏪 Cửa hàng với các vật phẩm hữu ích
- 📊 Bảng xếp hạng người giàu

### 🎮 **Mini Games**
- 🃏 **Xì Dách**: Game bài kinh điển với nhiều biến thể
- 🎲 **Bầu Cua**: Cờ bạc truyền thống Việt Nam  
- 🏠 **Cờ Tỷ Phú**: Monopoly phiên bản Discord
- 🎰 Slot machine, tung xu, xúc xắc...

### 🌱 **Hệ Thống Farm**
- 🌾 Trồng và chăm sóc cây trồng
- 💧 Tưới nước, bón phân theo thời gian thực
- 🍎 Thu hoạch để kiếm Rin

### 🐾 **Nuôi Thú Cưng**
- 🐕 9 loài thú cưng đa dạng
- 💕 Hệ thống sinh sản và ghép đôi
- 🍖 Chăm sóc, cho ăn, chữa bệnh

### 🏙️ **Thành Phố Ảo**
- 🏠 Thuê nhà từ trọ đến biệt thự
- 💼 Nghề nghiệp: Trộm, Nhà báo, MC, Công an
- 🎯 Nhiệm vụ và hoạt động đặc biệt

### ⏰ **Hệ Thống Nhắc Nhở**
- 📅 Đặt nhắc nhở theo giờ hoặc ngày
- 💌 Gửi DM tự động khi đến giờ
- 📝 Quản lý danh sách nhắc nhở

## 🚀 Cài Đặt Nhanh

### **Yêu Cầu Hệ Thống**
- 📦 **Node.js** 18.9.0 trở lên
- 🗄️ **MongoDB** 5.0 trở lên (hoặc MongoDB Atlas)
- 🤖 **Discord Bot Token**

### **Bước 1: Clone Repository**
```bash
# Clone từ GitHub
git clone https://github.com/vietlinhh02/rinbot.git
cd rinbot

# Hoặc download ZIP và giải nén
```

### **Bước 2: Cài Đặt Dependencies**
```bash
# Cài đặt tất cả packages cần thiết
npm install

# Nếu có lỗi, thử cài đặt lại
npm install --force
```

### **Bước 3: Cấu Hình Bot**
```bash
# Copy file cấu hình mẫu
cp env.example .env

# Mở file .env và điền thông tin
nano .env  # hoặc notepad .env trên Windows
```

**Điền thông tin vào file `.env`:**
```env
DISCORD_TOKEN=your_discord_bot_token_here
MONGO_URI=mongodb://localhost:27017/rinbot
BOT_PREFIX=,

# BẮT BUỘC: Owner ID để sử dụng lệnh update
DISCORD_OWNER_ID=your_discord_user_id

# BẮT BUỘC: GitHub Token cho Private Repository
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username

# BẮT BUỘC: Nhiều owner (khuyến nghị)
DISCORD_OWNER_IDS=123456789012345678,987654321098765432,567890123456789012
```

### **📦 Setup Private Repository** 

**1. Tạo GitHub Personal Access Token:**
- 🌐 Vào: https://github.com/settings/tokens
- ➕ **Generate new token (classic)**
- ✅ Chọn quyền **`repo`** (Full control of private repositories)
- 📝 Copy token và paste vào `GITHUB_TOKEN` trong `.env`

**2. Cấu hình Repository:**
```bash
# Đảm bảo remote URL đúng format
git remote -v

# Nếu dùng HTTPS (khuyến nghị cho private repo)
git remote set-url origin https://github.com/username/repo-name.git

# Nếu dùng SSH (cần setup SSH key trước)
git remote set-url origin git@github.com:username/repo-name.git
```

**3. Test Authentication:**
```bash
# Test pull thủ công trước
git pull origin main

# Nếu thành công, lệnh ,update sẽ hoạt động
```

### **Bước 4: Tạo Discord Bot**

1. **Vào Discord Developer Portal:**
   - 🌐 Truy cập: https://discord.com/developers/applications
   - ➕ Nhấn **"New Application"**
   - 📝 Đặt tên bot (ví dụ: "RinBot")

2. **Tạo Bot:**
   - 📱 Vào tab **"Bot"**
   - ➕ Nhấn **"Add Bot"**
   - 🔑 Copy **Token** và paste vào file `.env`

3. **Cấu Hình Intents (QUAN TRỌNG):**
   ```
   ✅ Message Content Intent
   ✅ Server Members Intent  
   ✅ Presence Intent
   ```

4. **Invite Bot:**
   - 🔗 Vào tab **"OAuth2" > "URL Generator"**
   - ✅ Chọn **"bot"** và **"applications.commands"**
   - ✅ Chọn permissions cần thiết:
     ```
     ✅ Send Messages
     ✅ Read Message History
     ✅ Use Slash Commands  
     ✅ Add Reactions
     ✅ Embed Links
     ✅ Attach Files
     ✅ Connect (voice)
     ```

### **Bước 5: Cài Đặt MongoDB**

**Option A: MongoDB Atlas (Khuyến nghị - Miễn phí)**
1. 🌐 Đăng ký tại: https://cloud.mongodb.com/
2. ➕ Tạo cluster miễn phí
3. 🔗 Lấy connection string
4. 📝 Paste vào `MONGO_URI` trong `.env`

**Option B: MongoDB Local**
```bash
# Ubuntu/Debian
sudo apt install mongodb

# CentOS/RHEL  
sudo yum install mongodb

# macOS
brew install mongodb

# Windows: Download từ mongodb.com
```

### **Bước 6: Chạy Bot**
```bash
# Chạy một lần
npm start

# Hoặc chạy với auto-restart (development)
npm run dev

# Chạy trong background (production)
npm run pm2
```

## 🎯 Hướng Dẫn Sử Dụng

### **Lệnh Cơ Bản**
```
,rinhelp          # Xem tất cả hướng dẫn
,rin              # Xem số tiền hiện có
,daily            # Nhận 200 Rin mỗi ngày
,work             # Làm việc kiếm 50-150 Rin
,shop             # Xem cửa hàng
```

### **Mini Games**
```
,xjbot 100        # Chơi Xì Dách với bot, cược 100 Rin
,bcbot 50         # Chơi Bầu Cua với bot
,cf 100 sap       # Tung xu cược 100 Rin, chọn sấp
,slot 50          # Quay slot machine cược 50 Rin
```

### **Farm & Pet**
```
,muacay           # Mua cây ngẫu nhiên (50 Rin)
,tuoicay 1        # Tưới cây số 1
,muapet           # Mua thú cưng (100 Rin)
,thucan           # Cho thú cưng ăn
```

### **Thành Phố**
```
,city             # Xem thông tin thành phố
,thuenha          # Thuê nhà
,dangkynghe       # Đăng ký nghề nghiệp
,lamviec          # Làm việc theo nghề
```

### **Nhắc Nhở**
```
,nhacnho 17h dậy đi học          # Nhắc hôm nay 17h
,nhacnho 25/12 20h sinh nhật     # Nhắc ngày 25/12 lúc 20h
,xemnhacnho                      # Xem danh sách nhắc nhở
```

## 🛠️ Commands cho Admin

### **Quản Lý Server**
```bash
# Đổi prefix server
,setprefix !

# Reset thông tin user  
,resetcity @user

# Hủy games
,cleargames
```

### **Update Bot (Tự Động)**
```bash
# Update code từ GitHub và restart
,update

# Kiểm tra version hiện tại
,version

# Backup database trước khi update
,backup
```

## 📁 Cấu Trúc Project

```
rinbot/
├── 📁 commands/           # Tất cả lệnh bot
│   ├── 📁 general/        # Lệnh chung (help, rin, daily...)
│   ├── 📁 games/          # Mini games
│   ├── 📁 farm/           # Hệ thống farm
│   ├── 📁 pet/            # Hệ thống pet
│   ├── 📁 city/           # Hệ thống city
│   └── 📁 admin/          # Lệnh admin
├── 📁 models/             # MongoDB schemas
├── 📁 utils/              # Utilities và helpers
├── 📁 config/             # File cấu hình
├── 📄 index.js            # File chính
├── 📄 package.json        # Dependencies
├── 📄 .env.example        # Cấu hình mẫu
└── 📄 README.md           # File này
```

## 🔧 Troubleshooting

### **Bot không online?**
```bash
# Kiểm tra token
echo $DISCORD_TOKEN

# Kiểm tra intents trong Discord Developer Portal
# Kiểm tra permissions khi invite bot
```

### **Lỗi MongoDB?**
```bash
# Kiểm tra connection string
# Atlas: Whitelist IP 0.0.0.0/0 để test
# Local: Khởi động MongoDB service

sudo systemctl start mongodb  # Linux
brew services start mongodb   # macOS
```

### **Lỗi dependencies?**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install

# Hoặc dùng yarn
yarn install
```

### **Bot lag hoặc crash?**
```bash
# Kiểm tra RAM usage
free -h           # Linux
top               # macOS/Linux  

# Restart bot
pm2 restart rinbot
```

## 🚀 Deploy Lên VPS/Cloud

### **Deploy với PM2 (Khuyến nghị)**
```bash
# Cài PM2 globally
npm install -g pm2

# Chạy bot với PM2
pm2 start index.js --name "rinbot"

# Auto start khi reboot
pm2 startup
pm2 save

#Dừng bot
pm2 stop [id]
```




