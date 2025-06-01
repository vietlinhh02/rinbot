const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { encryptApiKey, hashApiKey } = require('../../utils/encryption');
const { getPrefix } = require('../../utils/prefixHelper');

module.exports = {
    name: 'setgemini',
    description: 'Cài đặt Gemini API Key cho tính năng xem bói (bảo mật)',
    async execute(message, args) {
        try {
            // Lấy prefix của server
            const prefix = await getPrefix(message.guild?.id);
            
            // Hiển thị hướng dẫn và nút mở modal
            const helpEmbed = new EmbedBuilder()
                .setTitle('🔐 CÀI ĐẶT GEMINI API KEY BẢO MẬT')
                .setDescription('**Hướng dẫn lấy API Key MIỄN PHÍ:**\n\n' +
                    '1️⃣ Truy cập: https://aistudio.google.com/app/apikey\n' +
                    '2️⃣ Đăng nhập bằng tài khoản Google\n' +
                    '3️⃣ Nhấn "Create API Key"\n' +
                    '4️⃣ Copy API Key vừa tạo\n' +
                    '5️⃣ Bấm nút "🔑 Nhập API Key" bên dưới\n\n' +
                    '**🛡️ Bảo mật:**\n' +
                    '• API Key sẽ được mã hóa trước khi lưu\n' +
                    '• Chỉ bạn mới thấy được API Key\n' +
                    '• Modal sẽ tự động ẩn sau khi nhập\n' +
                    '• Không ai khác có thể xem API Key của bạn\n\n' +
                    `**Sau khi cài đặt, sử dụng:** \`${prefix}boi\``)
                .setColor('#00D4AA')
                .setThumbnail('https://i.imgur.com/fX8SdqQ.png');

            const button = new ButtonBuilder()
                .setCustomId('open_apikey_modal')
                .setLabel('🔑 Nhập API Key (Bảo mật)')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            await message.reply({ embeds: [helpEmbed], components: [row] });

        } catch (error) {
            console.error('Lỗi setgemini:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Xử lý interactions cho modal
    async handleInteraction(interaction) {
        if (interaction.customId === 'open_apikey_modal') {
            // Tạo modal để nhập API key
            const modal = new ModalBuilder()
                .setCustomId('apikey_modal')
                .setTitle('🔐 Nhập Gemini API Key');

            const apiKeyInput = new TextInputBuilder()
                .setCustomId('apikey_input')
                .setLabel('Gemini API Key:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('AIzaSy...')
                .setRequired(true)
                .setMinLength(35)
                .setMaxLength(100);

            const row = new ActionRowBuilder().addComponents(apiKeyInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'apikey_modal') {
            try {
                const apiKey = interaction.fields.getTextInputValue('apikey_input');
                const userId = interaction.user.id;

                // Kiểm tra format API key
                if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ API Key không hợp lệ!')
                        .setDescription('API Key phải bắt đầu bằng "AIza" và có độ dài ít nhất 35 ký tự.\n\n' +
                            'Hãy kiểm tra lại từ: https://aistudio.google.com/app/apikey')
                        .setColor('#FF0000');

                    return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }

                // Mã hóa API key trước khi lưu
                const encryptedApiKey = encryptApiKey(apiKey);
                const apiKeyHash = hashApiKey(apiKey);

                // Tìm hoặc tạo user
                let user = await User.findOne({ userId });
                if (!user) {
                    user = await User.create({ userId, rin: 0 });
                }

                // Lưu API key đã mã hóa
                user.geminiApiKey = encryptedApiKey;
                await user.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Cài đặt thành công!')
                    .setDescription('**API Key đã được mã hóa và lưu an toàn!**\n\n' +
                        `🔐 **Hash ID:** \`${apiKeyHash}\`\n` +
                        '🎯 **Trạng thái:** Sẵn sàng sử dụng\n\n' +
                        `Giờ bạn có thể sử dụng lệnh \`${await getPrefix(interaction.guild?.id)}boi\` để xem bói!`)
                    .setColor('#00FF00')
                    .setFooter({ text: 'API Key được bảo mật với mã hóa AES-256' });

                await interaction.reply({ embeds: [successEmbed], flags: 64 });

            } catch (error) {
                console.error('Lỗi modal submit:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi bảo mật!')
                    .setDescription('Không thể mã hóa API Key. Vui lòng thử lại sau.')
                    .setColor('#FF0000');

                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    }
}; 