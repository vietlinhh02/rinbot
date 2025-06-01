const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Expert, Consultation } = require('../../models/Expert');
const crypto = require('crypto');
const { getPrefix } = require('../../utils/prefixHelper');

// Các thể loại câu hỏi
const CATEGORIES = {
    'general': '🌟 Tổng quát',
    'love': '💕 Tình yêu',
    'career': '💼 Sự nghiệp',
    'health': '🏥 Sức khỏe',
    'finance': '💰 Tài chính',
    'family': '👨‍👩‍👧‍👦 Gia đình',
    'education': '📚 Học tập',
    'life': '🌈 Cuộc sống'
};

module.exports = {
    name: 'hoi',
    description: 'Hỏi chuyên gia tư vấn ẩn danh',
    async execute(message, args) {
        try {
            // Kiểm tra có chuyên gia nào không
            const expertCount = await Expert.countDocuments({ status: 'active', isAvailable: true });
            
            if (expertCount === 0) {
                const noExpertEmbed = new EmbedBuilder()
                    .setTitle('😔 Không có chuyên gia')
                    .setDescription('Hiện tại không có chuyên gia nào sẵn sàng tư vấn.\n\nVui lòng thử lại sau!')
                    .setColor('#FF6B6B');

                return await message.reply({ embeds: [noExpertEmbed] });
            }

            // Hiển thị hướng dẫn và các thể loại
            const helpEmbed = new EmbedBuilder()
                .setTitle('❓ HỎI CHUYÊN GIA TƯ VẤN')
                .setDescription('**Hệ thống tư vấn ẩn danh hoàn toàn**\n\n' +
                    '🔒 **Bảo mật tuyệt đối:**\n' +
                    '• Chuyên gia không biết bạn là ai\n' +
                    '• Bạn không biết chuyên gia là ai\n' +
                    '• Tất cả thông tin hoàn toàn ẩn danh\n\n' +
                    `👥 **Có ${expertCount} chuyên gia** đang sẵn sàng tư vấn\n\n` +
                    '**📋 Chọn thể loại câu hỏi:**')
                .setColor('#0099FF')
                .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png');

            // Tạo buttons cho categories
            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            
            const categoryKeys = Object.keys(CATEGORIES);
            categoryKeys.forEach((key, index) => {
                const button = new ButtonBuilder()
                    .setCustomId(`ask_expert_${key}`)
                    .setLabel(CATEGORIES[key])
                    .setStyle(ButtonStyle.Primary);
                
                if (index < 4) {
                    row1.addComponents(button);
                } else {
                    row2.addComponents(button);
                }
            });

            await message.reply({ embeds: [helpEmbed], components: [row1, row2] });

        } catch (error) {
            console.error('Lỗi hoi:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    // Xử lý interactions
    async handleInteraction(interaction) {
        if (interaction.customId.startsWith('ask_expert_')) {
            const category = interaction.customId.replace('ask_expert_', '');
            
            // Tạo modal để nhập câu hỏi
            const modal = new ModalBuilder()
                .setCustomId(`question_modal_${category}`)
                .setTitle(`${CATEGORIES[category]} - Hỏi chuyên gia`);

            const questionInput = new TextInputBuilder()
                .setCustomId('question_input')
                .setLabel('Câu hỏi của bạn:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập câu hỏi chi tiết...')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);

            const row = new ActionRowBuilder().addComponents(questionInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('question_modal_')) {
            try {
                const category = interaction.customId.replace('question_modal_', '');
                const question = interaction.fields.getTextInputValue('question_input');
                const userId = interaction.user.id;

                // Tạo consultation ID duy nhất
                const consultationId = crypto.randomBytes(8).toString('hex');

                // Lưu câu hỏi vào database
                const consultation = await Consultation.create({
                    consultationId,
                    userId,
                    question,
                    category,
                    status: 'pending'
                });

                // Gửi thông báo xác nhận cho user
                const confirmEmbed = new EmbedBuilder()
                    .setTitle('✅ Đã gửi câu hỏi')
                    .setDescription(`**Mã số:** \`${consultationId}\`\n` +
                        `**Thể loại:** ${CATEGORIES[category]}\n` +
                        `**Câu hỏi:** ${question}\n\n` +
                        '🔄 Đang tìm chuyên gia phù hợp...\n' +
                        '📱 Bạn sẽ nhận được thông báo khi có câu trả lời!')
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hệ thống tư vấn ẩn danh' });

                await interaction.reply({ embeds: [confirmEmbed], flags: 64 });

                // Tìm và gửi cho chuyên gia
                await this.assignToExpert(interaction.client, consultation, category);

            } catch (error) {
                console.error('Lỗi submit question:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi gửi câu hỏi')
                    .setDescription('Không thể gửi câu hỏi. Vui lòng thử lại sau!')
                    .setColor('#FF0000');

                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    },

    // Gán cho chuyên gia
    async assignToExpert(client, consultation, category) {
        try {
            // Tìm chuyên gia phù hợp (ưu tiên theo specialty)
            let expert = await Expert.findOne({
                status: 'active',
                isAvailable: true,
                specialties: category
            });

            // Nếu không có chuyên gia chuyên môn, tìm chuyên gia tổng quát
            if (!expert) {
                expert = await Expert.findOne({
                    status: 'active',
                    isAvailable: true
                });
            }

            if (!expert) {
                console.log('Không tìm thấy chuyên gia sẵn sàng');
                return;
            }

            // Gửi DM cho chuyên gia
            const expertUser = await client.users.fetch(expert.userId);
            
            const expertEmbed = new EmbedBuilder()
                .setTitle('🔔 CÂU HỎI TƯ VẤN MỚI')
                .setDescription(`**Mã số:** \`${consultation.consultationId}\`\n` +
                    `**Thể loại:** ${CATEGORIES[category]}\n` +
                    `**Câu hỏi:**\n${consultation.question}\n\n` +
                    '**Cách trả lời:**\n' +
                    `Trả lời tin nhắn này với format:\n` +
                    `\`!reply ${consultation.consultationId} [câu trả lời]\`\n\n` +
                    '🔒 **Hoàn toàn ẩn danh** - Bạn và người hỏi không biết nhau')
                .setColor('#FFA500')
                .setFooter({ text: 'Hệ thống tư vấn chuyên gia' });

            const dmMessage = await expertUser.send({ embeds: [expertEmbed] });

            // Cập nhật consultation
            await Consultation.findByIdAndUpdate(consultation._id, {
                status: 'assigned',
                expertId: expert.userId,
                dmMessageId: dmMessage.id
            });

            // Tăng counter cho expert (chỉ khi assigned thành công)
            await Expert.findByIdAndUpdate(expert._id, {
                $inc: { totalConsultations: 1 }
            });

        } catch (error) {
            console.error('Lỗi assign to expert:', error);
        }
    }
}; 