const { EmbedBuilder } = require('discord.js');
const { Expert, Consultation } = require('../models/Expert');

// Categories mapping
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

class ExpertHandler {
    constructor(client) {
        this.client = client;
    }

    // Xử lý tin nhắn DM từ chuyên gia
    async handleExpertDM(message) {
        try {
            // Kiểm tra user có phải chuyên gia không
            const expert = await Expert.findOne({ userId: message.author.id, status: 'active' });
            if (!expert) {
                return false; // Không phải chuyên gia
            }

            // Kiểm tra format !reply
            if (!message.content.startsWith('!reply ')) {
                // Gửi hướng dẫn
                const helpEmbed = new EmbedBuilder()
                    .setTitle('❓ Cách trả lời câu hỏi tư vấn')
                    .setDescription('**Format trả lời:**\n' +
                        '`!reply [mã số] [câu trả lời]`\n\n' +
                        '**Ví dụ:**\n' +
                        '`!reply abc123 Tôi nghĩ bạn nên...`\n\n' +
                        '**Lưu ý:**\n' +
                        '• Mã số phải chính xác\n' +
                        '• Câu trả lời ít nhất 20 ký tự\n' +
                        '• Hoàn toàn ẩn danh')
                    .setColor('#0099FF');

                await message.reply({ embeds: [helpEmbed] });
                return true;
            }

            // Parse tin nhắn
            const parts = message.content.substring(7).trim(); // Bỏ "!reply "
            const spaceIndex = parts.indexOf(' ');
            
            if (spaceIndex === -1) {
                await message.reply('❌ Format không đúng! Sử dụng: `!reply [mã] [câu trả lời]`');
                return true;
            }

            const consultationId = parts.substring(0, spaceIndex);
            const answer = parts.substring(spaceIndex + 1).trim();

            // Validate
            if (!consultationId || !answer) {
                await message.reply('❌ Vui lòng nhập đầy đủ mã số và câu trả lời!');
                return true;
            }

            if (answer.length < 20) {
                await message.reply('❌ Câu trả lời phải ít nhất 20 ký tự!');
                return true;
            }

            // Tìm consultation - hỗ trợ cả consultationId và shortId
            let consultation = await Consultation.findOne({ 
                consultationId,
                status: 'assigned'
            });
            
            // Nếu không tìm thấy với consultationId, thử tìm với shortId
            if (!consultation) {
                consultation = await Consultation.findOne({
                    shortId: consultationId,
                    status: 'published'
                });
            }

            if (!consultation) {
                await message.reply('❌ Không tìm thấy câu hỏi với mã này hoặc câu hỏi đã được trả lời!');
                return true;
            }

            // Cập nhật consultation
            consultation.status = 'answered';
            consultation.answer = answer;
            consultation.expertResponse = {
                answeredAt: new Date(),
                expertUserId: message.author.id
            };
            await consultation.save();
            
            // Nếu là câu hỏi public, cập nhật tin nhắn công khai
            if (consultation.publicMessageId && consultation.publicChannelId) {
                try {
                    const channel = await this.client.channels.fetch(consultation.publicChannelId);
                    const publicMessage = await channel.messages.fetch(consultation.publicMessageId);
                    
                    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                    
                    const answeredEmbed = new EmbedBuilder()
                        .setTitle('✅ CÂU HỎI ĐÃ ĐƯỢC TRẢ LỜI')
                        .setDescription(`**Mã:** \`${consultation.shortId || consultationId}\`\n` +
                            `**Thể loại:** ${CATEGORIES[consultation.category]}\n` +
                            `**Câu hỏi:**\n${consultation.question}\n\n` +
                            `**💡 Câu trả lời từ chuyên gia:**\n${answer}\n\n` +
                            '🔒 **Hoàn toàn ẩn danh** - Chuyên gia đã trả lời một cách chuyên nghiệp')
                        .setColor('#00FF00')
                        .setFooter({ text: 'Đã trả lời • Chỉ mang tính tham khảo' })
                        .setTimestamp();

                    // Disable button
                    const disabledButton = new ButtonBuilder()
                        .setCustomId(`expert_reply_${consultation.shortId || consultationId}_disabled`)
                        .setLabel('✅ Đã trả lời')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true);

                    const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

                    await publicMessage.edit({ 
                        embeds: [answeredEmbed], 
                        components: [disabledRow] 
                    });
                } catch (updateError) {
                    console.error('Lỗi cập nhật tin nhắn công khai:', updateError);
                }
            }

            // Gửi thông báo cho user (người hỏi)
            try {
                const userWhoAsked = await this.client.users.fetch(consultation.userId);
                
                const answerEmbed = new EmbedBuilder()
                    .setTitle('📝 CHUYÊN GIA ĐÃ TRẢ LỜI')
                    .setDescription(`**Mã số:** \`${consultationId}\`\n` +
                        `**Thể loại:** ${CATEGORIES[consultation.category]}\n\n` +
                        `**Câu hỏi của bạn:**\n${consultation.question}\n\n` +
                        `**💡 Câu trả lời từ chuyên gia:**\n${answer}\n\n` +
                        '🔒 **Ẩn danh hoàn toàn** - Chuyên gia không biết bạn là ai')
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hệ thống tư vấn chuyên gia • Chỉ mang tính tham khảo' })
                    .setTimestamp();

                await userWhoAsked.send({ embeds: [answerEmbed] });

                // Thông báo cho chuyên gia đã gửi thành công
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Đã gửi câu trả lời')
                    .setDescription(`**Mã số:** \`${consultationId}\`\n` +
                        `**Câu trả lời:** ${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}\n\n` +
                        '📱 Người hỏi đã nhận được câu trả lời!\n' +
                        '🔒 Hoàn toàn ẩn danh')
                    .setColor('#00FF00')
                    .setFooter({ text: 'Cảm ơn bạn đã hỗ trợ!' });

                await message.reply({ embeds: [successEmbed] });

            } catch (userError) {
                console.error('Lỗi gửi cho user:', userError);
                
                // Vẫn thông báo cho chuyên gia rằng đã trả lời
                const partialSuccessEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Đã lưu câu trả lời')
                    .setDescription(`**Mã số:** \`${consultationId}\`\n\n` +
                        '✅ Câu trả lời đã được lưu\n' +
                        '⚠️ Không thể gửi trực tiếp cho người hỏi (có thể đã tắt DM)\n' +
                        '📝 Họ sẽ nhận được thông báo khi kiểm tra')
                    .setColor('#FFA500');

                await message.reply({ embeds: [partialSuccessEmbed] });
            }

            // Cập nhật thống kê cho chuyên gia
            await Expert.findByIdAndUpdate(expert._id, {
                $inc: { totalConsultations: 1 }
            });

            return true;

        } catch (error) {
            console.error('Lỗi handle expert DM:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Có lỗi xảy ra')
                .setDescription('Không thể xử lý câu trả lời. Vui lòng thử lại sau!')
                .setColor('#FF0000');

            await message.reply({ embeds: [errorEmbed] });
            return true;
        }
    }

    // Kiểm tra trạng thái chuyên gia
    async checkExpertStatus(message) {
        try {
            const expert = await Expert.findOne({ userId: message.author.id });
            
            if (!expert) {
                const notExpertEmbed = new EmbedBuilder()
                    .setTitle('ℹ️ Bạn chưa là chuyên gia')
                    .setDescription('Bạn chưa được thêm vào hệ thống tư vấn.\n\n' +
                        'Liên hệ admin để được thêm làm chuyên gia!')
                    .setColor('#0099FF');

                await message.reply({ embeds: [notExpertEmbed] });
                return;
            }

            // Thống kê của chuyên gia
            const pendingCount = await Consultation.countDocuments({ 
                expertId: expert.userId, 
                status: 'assigned' 
            });
            
            const answeredCount = await Consultation.countDocuments({ 
                'expertResponse.expertUserId': expert.userId 
            });

            const statusEmbed = new EmbedBuilder()
                .setTitle('👨‍⚕️ Thông tin chuyên gia')
                .setDescription(`**Tên:** ${expert.username}\n` +
                    `**Lĩnh vực:** ${expert.specialties.map(s => CATEGORIES[s]).join(', ')}\n` +
                    `**Trạng thái:** ${expert.status === 'active' ? '🟢 Hoạt động' : '🔴 Tạm dừng'}\n` +
                    `**Sẵn sàng:** ${expert.isAvailable ? '✅ Có' : '⏸️ Bận'}\n\n` +
                    `**📊 Thống kê:**\n` +
                    `• Đang chờ trả lời: ${pendingCount}\n` +
                    `• Đã trả lời: ${answeredCount}\n` +
                    `• Đánh giá: ⭐ ${expert.rating}/5`)
                .setColor('#0099FF')
                .setFooter({ text: 'Cảm ơn bạn đã đóng góp cho cộng đồng!' });

            await message.reply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('Lỗi check expert status:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra thông tin!');
        }
    }
}

module.exports = ExpertHandler; 