const { EmbedBuilder } = require('discord.js');
const { Consultation } = require('../../models/Expert');
const { getPrefix } = require('../../utils/prefixHelper');

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

const STATUS_EMOJIS = {
    'pending': '⏳',
    'assigned': '👨‍⚕️',
    'answered': '✅',
    'closed': '🔒'
};

const STATUS_TEXT = {
    'pending': 'Đang chờ chuyên gia',
    'assigned': 'Đã giao cho chuyên gia',
    'answered': 'Đã có câu trả lời',
    'closed': 'Đã đóng'
};

module.exports = {
    name: 'hoistatus',
    description: 'Kiểm tra trạng thái câu hỏi đã gửi',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const prefix = await getPrefix(message.guild?.id);

            // Nếu có mã cụ thể
            if (args[0]) {
                const consultationId = args[0];
                const consultation = await Consultation.findOne({ 
                    consultationId,
                    userId 
                });

                if (!consultation) {
                    return await message.reply('❌ Không tìm thấy câu hỏi với mã này hoặc bạn không phải là người hỏi!');
                }

                // Hiển thị chi tiết
                const detailEmbed = new EmbedBuilder()
                    .setTitle(`${STATUS_EMOJIS[consultation.status]} CHI TIẾT CÂU HỎI`)
                    .setDescription(`**Mã số:** \`${consultation.consultationId}\`\n` +
                        `**Thể loại:** ${CATEGORIES[consultation.category]}\n` +
                        `**Trạng thái:** ${STATUS_TEXT[consultation.status]}\n` +
                        `**Thời gian gửi:** ${consultation.createdAt.toLocaleString('vi-VN')}\n\n` +
                        `**Câu hỏi:**\n${consultation.question}`)
                    .setColor(consultation.status === 'answered' ? '#00FF00' : 
                             consultation.status === 'assigned' ? '#FFA500' : '#0099FF');

                // Nếu đã có câu trả lời
                if (consultation.status === 'answered' && consultation.answer) {
                    detailEmbed.addFields({
                        name: '💡 Câu trả lời từ chuyên gia',
                        value: consultation.answer,
                        inline: false
                    });
                    
                    if (consultation.expertResponse.answeredAt) {
                        detailEmbed.setFooter({ 
                            text: `Trả lời lúc: ${consultation.expertResponse.answeredAt.toLocaleString('vi-VN')}` 
                        });
                    }
                }

                await message.reply({ embeds: [detailEmbed] });
                return;
            }

            // Hiển thị tất cả câu hỏi của user
            const consultations = await Consultation.find({ userId })
                .sort({ createdAt: -1 })
                .limit(10);

            if (consultations.length === 0) {
                const noQuestionsEmbed = new EmbedBuilder()
                    .setTitle('📝 Lịch sử câu hỏi')
                    .setDescription('Bạn chưa hỏi chuyên gia câu hỏi nào.\n\n' +
                        `Sử dụng lệnh \`${prefix}hoi\` để hỏi chuyên gia!`)
                    .setColor('#0099FF');

                return await message.reply({ embeds: [noQuestionsEmbed] });
            }

            // Thống kê
            const totalQuestions = consultations.length;
            const pendingCount = consultations.filter(c => c.status === 'pending').length;
            const assignedCount = consultations.filter(c => c.status === 'assigned').length;
            const answeredCount = consultations.filter(c => c.status === 'answered').length;

            // Danh sách câu hỏi
            const questionsList = consultations.map((q, index) => {
                const emoji = STATUS_EMOJIS[q.status];
                const status = STATUS_TEXT[q.status];
                const category = CATEGORIES[q.category];
                const question = q.question.length > 50 
                    ? q.question.substring(0, 50) + '...'
                    : q.question;
                const timeAgo = this.getTimeAgo(q.createdAt);
                
                return `${index + 1}. ${emoji} **\`${q.consultationId}\`**\n` +
                       `   ${category} • ${status}\n` +
                       `   *${question}*\n` +
                       `   📅 ${timeAgo}`;
            }).join('\n\n');

            const listEmbed = new EmbedBuilder()
                .setTitle('📝 LỊCH SỬ CÂU HỎI')
                .setDescription(`**📊 Thống kê:**\n` +
                    `• Tổng câu hỏi: ${totalQuestions}\n` +
                    `• Đang chờ: ${pendingCount}\n` +
                    `• Đã giao: ${assignedCount}\n` +
                    `• Đã trả lời: ${answeredCount}\n\n` +
                    `**📋 Câu hỏi gần đây:**\n\n${questionsList}`)
                .setColor('#0099FF')
                .setFooter({ 
                    text: `Sử dụng '${prefix}hoistatus [mã]' để xem chi tiết • Tối đa hiển thị 10 câu hỏi gần nhất`
                });

            // Thêm hướng dẫn nếu có câu hỏi chưa trả lời
            if (pendingCount > 0 || assignedCount > 0) {
                listEmbed.addFields({
                    name: '📱 Thông báo',
                    value: 'Bạn sẽ nhận được tin nhắn riêng khi chuyên gia trả lời!',
                    inline: false
                });
            }

            await message.reply({ embeds: [listEmbed] });

        } catch (error) {
            console.error('Lỗi hoistatus:', error);
            await message.reply('❌ Có lỗi xảy ra khi kiểm tra trạng thái!');
        }
    },

    // Tính thời gian đã trôi qua
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Vừa xong';
        } else if (diffMins < 60) {
            return `${diffMins} phút trước`;
        } else if (diffHours < 24) {
            return `${diffHours} giờ trước`;
        } else {
            return `${diffDays} ngày trước`;
        }
    }
}; 