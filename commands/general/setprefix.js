const { EmbedBuilder } = require('discord.js');
const { setGuildPrefix } = require('../../utils/database');

module.exports = {
    name: 'setprefix',
    description: 'Thay đổi prefix của bot trong server (chỉ admin)',
    async execute(message, args) {
        // Kiểm tra quyền admin
        if (!message.member.permissions.has('Administrator')) {
            const embed = new EmbedBuilder()
                .setTitle('⛔ Không có quyền!')
                .setDescription('Chỉ admin mới có thể thay đổi prefix!')
                .setColor('#FF0000');
            return await message.reply({ embeds: [embed] });
        }

        // Kiểm tra có prefix mới không
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Vui lòng nhập prefix mới!\n\n**Cách dùng:** `,setprefix <prefix_mới>`\n**Ví dụ:** `,setprefix !`')
                .setColor('#FF0000');
            return await message.reply({ embeds: [embed] });
        }

        const newPrefix = args[0];

        // Kiểm tra độ dài prefix
        if (newPrefix.length > 5) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Prefix không được dài quá 5 ký tự!')
                .setColor('#FF0000');
            return await message.reply({ embeds: [embed] });
        }

        try {
            // Lưu prefix mới vào database
            await setGuildPrefix(message.guild.id, newPrefix);

            // Cập nhật bot activity để hiển thị thông tin prefix mới
            if (global.updateBotActivity) {
                await global.updateBotActivity();
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Thành công!')
                .setDescription(`Đã đổi prefix thành: **${newPrefix}**\n\nBạn có thể dùng: **${newPrefix}rin** để xem thông tin bot!`)
                .setColor('#00FF00')
                .addFields({ 
                    name: '💡 Ví dụ lệnh mới:', 
                    value: `${newPrefix}rincheck\n${newPrefix}rindaily\n${newPrefix}rinhelp`, 
                    inline: false 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi setprefix:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Có lỗi xảy ra khi thay đổi prefix!')
                .setColor('#FF0000');
            await message.reply({ embeds: [embed] });
        }
    }
}; 