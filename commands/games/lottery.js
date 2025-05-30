const { EmbedBuilder } = require('discord.js');
const LotteryTicket = require('../../models/LotteryTicket');
const { getUserRin, updateUserRin } = require('../../utils/database');
const axios = require('axios');

function getTodayStr() {
    const now = new Date();
    return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
}

function getVNTime() {
    return new Date();
}

module.exports = {
    name: 'lottery',
    description: 'Mua vé số miền Bắc, nhập 5 số, cược 1000. Chỉ nhận vé từ 8h đến 6h30 tối. Kết quả dựa trên giải ĐB. Cú pháp: lottery <5 số>\nAdmin: lotterycheck [ngày-dd-mm-yyyy] để xem danh sách vé.\nAdmin: lotteryreward [ngày-dd-mm-yyyy] để trả thưởng.',
    async execute(message, args) {
        const userId = message.author.id;
        const now = getVNTime();
        const hour = now.getHours();
        const minute = now.getMinutes();
        let today = getTodayStr();
        // Nếu sau 18h30 hoặc trước 8h sáng thì tính cho ngày hôm sau
        if ((hour > 18 || (hour === 18 && minute >= 30)) || hour < 8) {
            // Lấy ngày mai
            const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            today = `${nextDay.getDate()}-${nextDay.getMonth() + 1}-${nextDay.getFullYear()}`;
        }
        // Kiểm tra số hợp lệ
        if (!args[0] || !/^[0-9]{5}$/.test(args[0])) {
            return message.reply('❌ Bạn phải nhập đúng 5 số (vd: 12345)');
        }
        // Không kiểm tra đã mua, cho phép mua nhiều vé/ngày
        // Kiểm tra tiền
        const userRin = await getUserRin(userId);
        if (userRin < 1000) {
            return message.reply('❌ Bạn cần 1000 Rin để mua vé số!');
        }
        // Trừ tiền và lưu vé
        await updateUserRin(userId, -1000);
        await LotteryTicket.create({ userId, soDuDoan: args[0], ngay: today });
        const embed = new EmbedBuilder()
            .setTitle('🎟️ ĐÃ MUA VÉ SỐ MIỀN BẮC')
            .setDescription(`Bạn đã mua vé số miền Bắc ngày **${today}** với số dự đoán **${args[0]}**\nChờ kết quả sau 18h30 ngày đó!`)
            .setColor('#FFD700');
        await message.reply({ embeds: [embed] });
    },
    // Hàm này để admin hoặc tự động gọi sau 18h để trả thưởng
    async checkResult(message, ngay = null) {
        const day = ngay || getTodayStr();
        // Lấy kết quả từ API
        const res = await axios.get('https://api-xsmb-today.onrender.com/api/v1');
        const data = await res.data;
        const result = data.results['ĐB'][0];
        // Nếu kết quả chưa quay
        if (!result || result === 'Đang cập nhật') {
            return message.reply('⏳ Kết quả xổ số miền Bắc hôm nay chưa có, hãy thử lại sau 18h30!');
        }
        // Lấy tất cả vé chưa claim của ngày đó
        const tickets = await LotteryTicket.find({ ngay: day, claimed: false });
        let summary = '';
        for (const ticket of tickets) {
            const soDuDoan = ticket.soDuDoan;
            let match = 0;
            // So sánh từ cuối lên đầu
            for (let i = 1; i <= 5; i++) {
                if (soDuDoan[5 - i] === result[5 - i]) match++;
                else break;
            }
            let reward = 0;
            if (match === 5) reward = 500000; // Jackpot
            else if (match === 4) reward = 50000;
            else if (match === 3) reward = 5000;
            else if (match === 2) reward = 1000;
            if (reward > 0) {
                await updateUserRin(ticket.userId, reward);
                summary += `<@${ticket.userId}> (${soDuDoan}) trúng ${match} số cuối: +${reward} Rin\n`;
            }
            ticket.claimed = true;
            await ticket.save();
        }
        if (!summary) summary = 'Không ai trúng thưởng hôm nay.';
        const embed = new EmbedBuilder()
            .setTitle('🎉 KẾT QUẢ XỔ SỐ MIỀN BẮC')
            .setDescription(`Giải ĐB: **${result}**\n\n${summary}`)
            .setColor('#00FF00');
        await message.reply({ embeds: [embed] });
    },
    // Lệnh: xem danh sách vé đã mua hôm nay (ai cũng dùng được, chỉ lấy ngày hiện tại)
    async lotterycheck(message) {
        let day = getTodayStr();
        const tickets = await LotteryTicket.find({ ngay: day });
        if (!tickets.length) return message.reply(`Không có vé nào cho ngày ${day}`);
        let list = tickets.map(t => `<@${t.userId}>: **${t.soDuDoan}**`).join('\n');
        const embed = new EmbedBuilder()
            .setTitle(`📋 DANH SÁCH VÉ SỐ NGÀY ${day}`)
            .setDescription(list)
            .setColor('#0099FF');
        await message.reply({ embeds: [embed] });
    },
    // Lệnh admin: trả thưởng thủ công (có thể dùng cho auto 9h tối)
    async lotteryreward(message, args) {
        // Chỉ cho admin dùng
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('⛔ Lệnh này chỉ dành cho admin!');
        }
        let day = args[0] || getTodayStr();
        await this.checkResult(message, day);
    },
    // Lệnh: xem thông tin tất cả vé số gần nhất của user
    async lotteryinfo(message) {
        const userId = message.author.id;
        // Lấy ngày gần nhất user có vé
        const lastTicket = await LotteryTicket.findOne({ userId }).sort({ createdAt: -1 });
        if (!lastTicket) return message.reply('Bạn chưa từng mua vé số nào!');
        const day = lastTicket.ngay;
        // Lấy tất cả vé của user trong ngày đó
        const tickets = await LotteryTicket.find({ userId, ngay: day });
        // Lấy kết quả từ API
        const { data } = await axios.get('https://api-xsmb-today.onrender.com/api/v1');
        const resultDay = data.time;
        const result = data.results['ĐB'][0];
        let info = '';
        for (const ticket of tickets) {
            let match = 0, reward = 0, status = '';
            // Nếu chưa có kết quả
            if (!result || result === 'Đang cập nhật') {
                status = '⏳ Chưa quay số';
            } else if (day === resultDay) {
                for (let i = 1; i <= 5; i++) {
                    if (ticket.soDuDoan[5 - i] === result[5 - i]) match++;
                    else break;
                }
                if (match === 5) reward = 500000;
                else if (match === 4) reward = 50000;
                else if (match === 3) reward = 5000;
                else if (match === 2) reward = 1000;
                if (reward > 0) status = `🎉 Trúng ${match} số cuối: +${reward} Rin`;
                else status = '😢 Không trúng';
            } else {
                status = '⏳ Chưa quay số';
            }
            info += `• Số: **${ticket.soDuDoan}** | ${status}\n`;
        }
        const embed = new EmbedBuilder()
            .setTitle('📄 THÔNG TIN VÉ SỐ MIỀN BẮC')
            .setDescription(`• Ngày dự thưởng: **${day}**\n${info}`)
            .setColor('#0099FF');
        await message.reply({ embeds: [embed] });
    }
}; 