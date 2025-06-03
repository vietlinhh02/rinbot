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
                .setPlaceholder('Nhập câu hỏi chi tiết... (Không giới hạn độ dài)')
                .setRequired(true)
                .setMinLength(10);

            const row = new ActionRowBuilder().addComponents(questionInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId.startsWith('expert_reply_')) {
            return await this.handleExpertReply(interaction);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('expert_answer_')) {
            return await this.handleAnswerSubmit(interaction);
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
                    guildId: interaction.guild.id,
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
            // Kiểm tra có room public không
            const { getGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(consultation.guildId);
            
            if (config?.expertPublicRoom) {
                // Gửi public vào room
                return await this.sendToPublicRoom(client, consultation, category, config.expertPublicRoom);
            } else {
                // Gửi DM như cũ
                return await this.sendToDM(client, consultation, category);
            }

        } catch (error) {
            console.error('Lỗi gán cho chuyên gia:', error);
        }
    },

    // Gửi vào room public
    async sendToPublicRoom(client, consultation, category, channelId) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.log('Không tìm thấy room public');
                return await this.sendToDM(client, consultation, category);
            }

            // Tạo mã theo format custom của guild
            const shortId = await this.generateCodeForGuild(consultation.guildId);
            
            // Cập nhật consultation với shortId
            await Consultation.findByIdAndUpdate(consultation._id, {
                status: 'published',
                shortId: shortId,
                publicChannelId: channelId
            });

            const publicEmbed = new EmbedBuilder()
                .setTitle('❓ CÂU HỎI CHUYÊN GIA')
                .setDescription(`**Mã:** \`${shortId}\`\n` +
                    `**Thể loại:** ${CATEGORIES[category]}\n` +
                    `**Câu hỏi:**\n${consultation.question}\n\n` +
                    '🔒 **Ẩn danh hoàn toàn** - Người hỏi và chuyên gia không biết nhau')
                .setColor('#0099FF')
                .setFooter({ text: 'Chờ chuyên gia trả lời...' })
                .setTimestamp();

            // Tạo button cho chuyên gia reply
            const replyButton = new ButtonBuilder()
                .setCustomId(`expert_reply_${shortId}`)
                .setLabel('📝 Trả lời (Chuyên gia)')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(replyButton);

            const publicMessage = await channel.send({ 
                embeds: [publicEmbed], 
                components: [row] 
            });

            // Lưu message ID để update sau
            await Consultation.findByIdAndUpdate(consultation._id, {
                publicMessageId: publicMessage.id
            });

        } catch (error) {
            console.error('Lỗi gửi public:', error);
            // Fallback to DM
            return await this.sendToDM(client, consultation, category);
        }
    },

    // Gửi DM như cũ (fallback)
    async sendToDM(client, consultation, category) {
        try {
            // Tìm chuyên gia phù hợp
            let expert = await Expert.findOne({
                status: 'active',
                isAvailable: true,
                specialties: category
            });

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

            await Consultation.findByIdAndUpdate(consultation._id, {
                status: 'assigned',
                expertId: expert.userId,
                dmMessageId: dmMessage.id
            });

        } catch (error) {
            console.error('Lỗi gửi DM:', error);
        }
    },

    // Xử lý chuyên gia reply qua button
    async handleExpertReply(interaction) {
        try {
            const shortId = interaction.customId.replace('expert_reply_', '');
            
            // Kiểm tra user có phải chuyên gia không
            const expert = await Expert.findOne({ 
                userId: interaction.user.id, 
                status: 'active' 
            });
            
            if (!expert) {
                return await interaction.reply({ 
                    content: '❌ Chỉ chuyên gia mới có thể trả lời!', 
                    ephemeral: true 
                });
            }

            // Tìm consultation
            const consultation = await Consultation.findOne({ 
                shortId: shortId,
                status: 'published'
            });

            if (!consultation) {
                return await interaction.reply({ 
                    content: '❌ Không tìm thấy câu hỏi này hoặc đã được trả lời!', 
                    ephemeral: true 
                });
            }

            // Tạo modal để nhập câu trả lời
            const modal = new ModalBuilder()
                .setCustomId(`expert_answer_${shortId}`)
                .setTitle('Trả lời câu hỏi (Ẩn danh)');

            const answerInput = new TextInputBuilder()
                .setCustomId('answer_input')
                .setLabel('Câu trả lời của bạn:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập câu trả lời chi tiết, chuyên nghiệp... (Không giới hạn độ dài)')
                .setRequired(true)
                .setMinLength(20);

            const row = new ActionRowBuilder().addComponents(answerInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Lỗi expert reply:', error);
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra!', 
                ephemeral: true 
            });
        }
    },

    // Xử lý submit answer
    async handleAnswerSubmit(interaction) {
        try {
            const shortId = interaction.customId.replace('expert_answer_', '');
            const answer = interaction.fields.getTextInputValue('answer_input');

            // Kiểm tra lại expert
            const expert = await Expert.findOne({ 
                userId: interaction.user.id, 
                status: 'active' 
            });

            if (!expert) {
                return await interaction.reply({ 
                    content: '❌ Chỉ chuyên gia mới có thể trả lời!', 
                    ephemeral: true 
                });
            }

            // Tìm consultation
            const consultation = await Consultation.findOne({ 
                shortId: shortId,
                status: 'published'
            });

            if (!consultation) {
                return await interaction.reply({ 
                    content: '❌ Câu hỏi không tồn tại hoặc đã được trả lời!', 
                    ephemeral: true 
                });
            }

            // Cập nhật consultation
            await Consultation.findByIdAndUpdate(consultation._id, {
                status: 'answered',
                answer: answer,
                expertResponse: {
                    answeredAt: new Date(),
                    expertUserId: interaction.user.id
                }
            });

            // Update public message
            const channel = await interaction.client.channels.fetch(consultation.publicChannelId);
            const publicMessage = await channel.messages.fetch(consultation.publicMessageId);

            const answeredEmbed = new EmbedBuilder()
                .setTitle('✅ CÂU HỎI ĐÃ ĐƯỢC TRẢ LỜI')
                .setDescription(`**Mã:** \`${shortId}\`\n` +
                    `**Thể loại:** ${CATEGORIES[consultation.category]}\n` +
                    `**Câu hỏi:**\n${consultation.question}\n\n` +
                    `**💡 Câu trả lời từ chuyên gia:**\n${answer}\n\n` +
                    '🔒 **Hoàn toàn ẩn danh** - Chuyên gia đã trả lời một cách chuyên nghiệp')
                .setColor('#00FF00')
                .setFooter({ text: 'Đã trả lời • Chỉ mang tính tham khảo' })
                .setTimestamp();

            // Disable button
            const disabledButton = new ButtonBuilder()
                .setCustomId(`expert_reply_${shortId}_disabled`)
                .setLabel('✅ Đã trả lời')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

            await publicMessage.edit({ 
                embeds: [answeredEmbed], 
                components: [disabledRow] 
            });

            // Gửi DM cho người hỏi
            try {
                const userWhoAsked = await interaction.client.users.fetch(consultation.userId);
                
                const dmEmbed = new EmbedBuilder()
                    .setTitle('📝 CÂU HỎI CỦA BẠN ĐÃ ĐƯỢC TRẢ LỜI')
                    .setDescription(`**Mã:** \`${shortId}\`\n` +
                        `**Thể loại:** ${CATEGORIES[consultation.category]}\n\n` +
                        `**Câu hỏi của bạn:**\n${consultation.question}\n\n` +
                        `**💡 Câu trả lời từ chuyên gia:**\n${answer}\n\n` +
                        '🔒 **Ẩn danh hoàn toàn** - Câu trả lời đã được đăng công khai')
                    .setColor('#00FF00')
                    .setFooter({ text: 'Hệ thống tư vấn chuyên gia • Chỉ mang tính tham khảo' });

                await userWhoAsked.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Không thể gửi DM cho người hỏi:', dmError.message);
            }

            // Thông báo thành công cho chuyên gia
            await interaction.reply({ 
                content: '✅ Đã gửi câu trả lời thành công! Câu trả lời đã được đăng công khai.', 
                ephemeral: true 
            });

            // Tăng counter cho expert
            await Expert.findByIdAndUpdate(expert._id, {
                $inc: { totalConsultations: 1 }
            });

        } catch (error) {
            console.error('Lỗi submit answer:', error);
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra khi gửi câu trả lời!', 
                ephemeral: true 
            });
        }
    },

    // Tạo mã theo format của guild
    async generateCodeForGuild(guildId) {
        try {
            const { getGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(guildId);
            const format = config?.expertCodeFormat;

            if (!format) {
                // Mặc định: 4 ký tự ngẫu nhiên
                return Math.random().toString(36).substring(2, 6).toUpperCase();
            }

            // Parse format custom
            const match = format.match(/^([A-Z]*)\{(\d+)\}$/);
            if (!match) {
                // Format lỗi, fallback về mặc định
                return Math.random().toString(36).substring(2, 6).toUpperCase();
            }

            const prefix = match[1];
            const length = parseInt(match[2]);
            
            // Tạo phần số ngẫu nhiên
            let randomPart = '';
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (let i = 0; i < length; i++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            return prefix + randomPart;

        } catch (error) {
            console.error('Lỗi generate code:', error);
            // Fallback về mặc định
            return Math.random().toString(36).substring(2, 6).toUpperCase();
        }
    }
}; 