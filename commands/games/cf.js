const { EmbedBuilder } = require('discord.js');
const FastUtils = require('../../utils/fastUtils');
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
                1, // 1 giây cooldown - nhanh hơn
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
            return message.reply('❌ Số dương!');
        }
        
        if (!(await FastUtils.canAfford(userId, amount))) {
            return message.reply('❌ Không đủ Rin!');
        }

        // Trừ tiền cược nhanh
        await FastUtils.updateFastUserRin(userId, -amount);
        
        // Animation nhanh hơn
        const animEmbed = new EmbedBuilder()
            .setTitle('🪙 TUNG XU...')
            .setDescription(`💸 **Cược:** ${FastUtils.fastFormat(amount)} Rin`)
            .setColor('#AAAAAA');
        const sentMsg = await message.reply({ embeds: [animEmbed] });
        
        setTimeout(async () => {
            const result = Math.random() < 0.45 ? 'win' : 'lose';
            let desc = '';
            
            if (result === 'win') {
                const winAmount = amount * 2;
                await FastUtils.updateFastUserRin(userId, winAmount);
                desc = `🎉 **THẮNG!** 🪙\n💰 **Nhận:** ${FastUtils.fastFormat(winAmount)} Rin\n📈 **Lời:** ${FastUtils.fastFormat(amount)} Rin`;
            } else {
                desc = `😢 **THUA!** 🪙\n💸 **Mất:** ${FastUtils.fastFormat(amount)} Rin`;
            }
            
            await sentMsg.edit({ embeds: [new EmbedBuilder()
                .setTitle('🪙 KẾT QUẢ')
                .setDescription(desc)
                .setColor(result === 'win' ? '#00FF00' : '#FF0000')] });
        }, 800); // Giảm từ 1200ms xuống 800ms
    }
}; 