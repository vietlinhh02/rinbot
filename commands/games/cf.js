const { EmbedBuilder } = require('discord.js');
const { getUserRin, updateUserRin } = require('../../utils/database');
const AntiSpamManager = require('../../utils/antiSpam');

module.exports = {
    name: 'cf',
    description: 'Tung xu cược Rin, thắng x2, thua mất tiền. Cú pháp: cf <số tiền>',
    async execute(message, args) {
        const userId = message.author.id;
        
        try {
            // Bảo vệ command khỏi spam với cooldown 2 giây
            await AntiSpamManager.executeWithProtection(
                userId, 
                'cf', 
                2, // 2 giây cooldown
                this.executeCoinFlip,
                this,
                message,
                args
            );
        } catch (error) {
            return message.reply(error.message);
        }
    },

    async executeCoinFlip(message, args) {
        const userId = message.author.id;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Số Rin phải là số dương!');
        }
        
        const userRin = await getUserRin(userId);
        if (userRin < amount) {
            return message.reply('❌ Bạn không đủ Rin để cược!');
        }

        // Trừ tiền cược trước khi bắt đầu (tránh double spend)
        await updateUserRin(userId, -amount);
        
        // Gửi hiệu ứng tung xu
        const animEmbed = new EmbedBuilder()
            .setTitle('🪙 ĐANG TUNG XU...')
            .setDescription(`Đang tung xu, chờ kết quả...\n\n💸 **Đã cược:** ${amount} Rin`)
            .setColor('#AAAAAA');
        const sentMsg = await message.reply({ embeds: [animEmbed] });
        
        setTimeout(async () => {
            const result = Math.random() < 0.45 ? 'win' : 'lose'; // 45% thắng, 55% thua
            let desc = '';
            
            if (result === 'win') {
                const winAmount = amount * 2; // Thắng gấp đôi
                await updateUserRin(userId, winAmount);
                desc = `🎉 **THẮNG!** 🪙\n💰 **Nhận được:** ${winAmount} Rin\n📈 **Lời:** ${amount} Rin`;
            } else {
                desc = `😢 **THUA!** 🪙\n💸 **Mất:** ${amount} Rin`;
                // Không cộng gì vì đã trừ tiền cược rồi
            }
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('🪙 KẾT QUẢ TUNG XU')
                .setDescription(desc)
                .setColor(result === 'win' ? '#00FF00' : '#FF0000')
                .setFooter({ text: 'Tỷ lệ thắng: 45% | Tỷ lệ thua: 55%' });
                
            await sentMsg.edit({ embeds: [resultEmbed] });
        }, 1200);
    }
}; 