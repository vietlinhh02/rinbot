const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { hashApiKey, decryptApiKey } = require('../../utils/encryption');
const { getPrefix } = require('../../utils/prefixHelper');

module.exports = {
    name: 'geminiinfo',
    description: 'Xem thông tin API Key Gemini của bạn',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const prefix = await getPrefix(message.guild?.id);
            const user = await User.findOne({ userId });

            if (!user || !user.geminiApiKey) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle('❌ Chưa cài đặt API Key')
                    .setDescription('Bạn chưa cài đặt Gemini API Key!\n\n' +
                        `Sử dụng lệnh \`${prefix}setgemini\` để cài đặt.`)
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [noKeyEmbed] });
            }

            try {
                // Giải mã để lấy API key gốc (chỉ để tạo hash và kiểm tra)
                const decryptedApiKey = decryptApiKey(user.geminiApiKey);
                const apiKeyHash = hashApiKey(decryptedApiKey);
                const maskedApiKey = decryptedApiKey.substring(0, 10) + '••••••••••••••••••••••••••';

                const infoEmbed = new EmbedBuilder()
                    .setTitle('🔐 THÔNG TIN API KEY GEMINI')
                    .setDescription('**Trạng thái API Key của bạn**')
                    .addFields(
                        {
                            name: '🔑 API Key',
                            value: `\`${maskedApiKey}\``,
                            inline: false
                        },
                        {
                            name: '🔐 Hash ID',
                            value: `\`${apiKeyHash}\``,
                            inline: false
                        },
                        {
                            name: '✅ Trạng thái',
                            value: 'Đã cài đặt và sẵn sàng sử dụng',
                            inline: false
                        },
                        {
                            name: '🛡️ Bảo mật',
                            value: 'API Key được mã hóa AES-256 trong database',
                            inline: false
                        },
                        {
                            name: '🎯 Sử dụng',
                            value: `Gõ \`${prefix}boi\` để bắt đầu xem bói!`,
                            inline: false
                        }
                    )
                    .setColor('#00D4AA')
                    .setFooter({ 
                        text: 'API Key của bạn hoàn toàn an toàn',
                        iconURL: message.author.displayAvatarURL()
                    });

                await message.reply({ embeds: [infoEmbed] });

            } catch (decryptError) {
                console.error('Decryption error in geminiinfo:', decryptError);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Lỗi giải mã')
                    .setDescription('Không thể đọc API Key. Có thể API Key đã bị lỗi.\n\n' +
                        `Hãy cài đặt lại với lệnh \`${prefix}setgemini\``)
                    .setColor('#FF9500');

                await message.reply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Lỗi geminiinfo:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra thông tin API Key!');
        }
    }
}; 