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
                .setThumbnail('https://raw.githubusercontent.com/vietlinhh02/test/refs/heads/main/d098bf056c1a3a3f23261606edde04de.png')
                .setFooter({ text: 'Tin nhắn này sẽ tự động ẩn sau 3 phút' });

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

            const helpMessage = await message.reply({ embeds: [helpEmbed], components: [row1, row2] });

            // Tự động xóa tin nhắn hướng dẫn sau 3 phút để tránh spam
            setTimeout(async () => {
                try {
                    await helpMessage.delete();
                } catch (deleteError) {
                    console.log('Không thể xóa tin nhắn hướng dẫn (có thể đã bị xóa):', deleteError.message);
                }
            }, 180000); // 3 phút

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

        // Xử lý modal submit cho expert_answer_ đã được chuyển sang phần riêng biệt trong index.js

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

                // Gửi thông báo xác nhận cho user (ephemeral)
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

                // Ẩn tin nhắn gốc sau khi gửi thành công
                try {
                    // Lấy tin nhắn gốc (tin nhắn có button hỏi chuyên gia)
                    const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
                    
                    // Tạo embed thông báo đã gửi
                    const sentEmbed = new EmbedBuilder()
                        .setTitle('✅ Câu hỏi đã được gửi')
                        .setDescription(`${interaction.user} đã gửi câu hỏi **${CATEGORIES[category]}** thành công!\n\n` +
                            '🔒 **Ẩn danh hoàn toàn** - Chuyên gia sẽ trả lời sớm nhất có thể.')
                        .setColor('#00FF00')
                        .setFooter({ text: 'Tin nhắn này sẽ tự động ẩn sau 10 giây' });

                    // Edit tin nhắn gốc thành thông báo đã gửi
                    await originalMessage.edit({ 
                        embeds: [sentEmbed], 
                        components: [] // Xóa tất cả button
                    });

                    // Tự động xóa tin nhắn sau 10 giây
                    setTimeout(async () => {
                        try {
                            await originalMessage.delete();
                        } catch (deleteError) {
                            console.log('Không thể xóa tin nhắn (có thể đã bị xóa):', deleteError.message);
                        }
                    }, 10000);

                } catch (editError) {
                    console.log('Không thể edit/xóa tin nhắn gốc:', editError.message);
                    // Không cần thông báo lỗi cho user vì câu hỏi đã được gửi thành công
                }

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
            
            // Thông báo cho tất cả chuyên gia phù hợp với lĩnh vực này
            await this.notifyExperts(client, consultation, category, shortId, channel.guild.id);

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
            console.log('Chuyên gia đang mở form trả lời...');
            const shortId = interaction.customId.replace('expert_reply_', '');
            
            // Kiểm tra user có phải chuyên gia không
            const expert = await Expert.findOne({ 
                userId: interaction.user.id
            });
            
            if (!expert) {
                return await interaction.reply({ 
                    content: '❌ Bạn không phải là chuyên gia trong hệ thống!', 
                    flags: 64 
                });
            }
            
            if (expert.status !== 'active') {
                return await interaction.reply({ 
                    content: '❌ Tài khoản chuyên gia của bạn đang bị vô hiệu hóa!', 
                    flags: 64 
                });
            }

            // Tìm consultation
            console.log(`Đang tìm consultation với shortId: ${shortId}`);
            const consultation = await Consultation.findOne({ 
                shortId: shortId
            });

            if (!consultation) {
                return await interaction.reply({ 
                    content: '❌ Không tìm thấy câu hỏi này! Có thể đã bị xóa.', 
                    flags: 64 
                });
            }
            
            if (consultation.status !== 'published') {
                return await interaction.reply({ 
                    content: `❌ Câu hỏi này đã được trả lời hoặc không còn khả dụng (status: ${consultation.status})!`, 
                    flags: 64 
                });
            }

            // Tạo modal để nhập câu trả lời
            try {
                console.log('Đang tạo modal trả lời...');
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
                console.log('Đã hiển thị modal trả lời thành công');
            } catch (modalError) {
                console.error('Lỗi hiển thị modal:', modalError);
                await interaction.reply({ 
                    content: `❌ Không thể hiển thị form trả lời: ${modalError.message}`, 
                    flags: 64 
                });
            }

        } catch (error) {
            console.error('Lỗi expert reply:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: `❌ Có lỗi xảy ra: ${error.message}`, 
                        flags: 64 
                    });
                }
            } catch (replyError) {
                console.error('Không thể phản hồi lỗi:', replyError);
            }
        }
    },

    // Xử lý submit answer
    async handleAnswerSubmit(interaction) {
        try {
            console.log('Đang xử lý câu trả lời chuyên gia...');
            
            // Kiểm tra interaction
            if (!interaction.isModalSubmit()) {
                console.error('Interaction không phải modal submit');
                return await interaction.reply({ 
                    content: '❌ Có lỗi xảy ra: Không phải modal submit', 
                    flags: 64 
                });
            }
            
            // Lấy shortId từ customId
            const shortId = interaction.customId.replace('expert_answer_', '');
            console.log(`ShortID: ${shortId}`);
            
            // Kiểm tra fields
            if (!interaction.fields || !interaction.fields.getTextInputValue) {
                console.error('Không tìm thấy fields trong modal submit');
                return await interaction.reply({ 
                    content: '❌ Có lỗi xảy ra: Không tìm thấy nội dung câu trả lời', 
                    flags: 64 
                });
            }
            
            // Lấy câu trả lời
            let answer;
            try {
                answer = interaction.fields.getTextInputValue('answer_input');
                console.log(`Đã lấy được câu trả lời, độ dài: ${answer?.length || 0}`);
            } catch (fieldError) {
                console.error('Lỗi khi lấy câu trả lời:', fieldError);
                return await interaction.reply({ 
                    content: '❌ Không thể đọc nội dung câu trả lời. Vui lòng thử lại!', 
                    flags: 64 
                });
            }
            
            if (!answer || answer.trim().length < 10) {
                return await interaction.reply({ 
                    content: '❌ Câu trả lời quá ngắn! Vui lòng viết chi tiết hơn.', 
                    flags: 64 
                });
            }

            // Kiểm tra lại expert
            console.log(`Kiểm tra chuyên gia: ${interaction.user.id}`);
            const expert = await Expert.findOne({ 
                userId: interaction.user.id
            });

            if (!expert) {
                console.log('Không tìm thấy chuyên gia với ID:', interaction.user.id);
                return await interaction.reply({ 
                    content: '❌ Bạn không phải là chuyên gia trong hệ thống!', 
                    flags: 64 
                });
            }
            
            if (expert.status !== 'active') {
                console.log('Chuyên gia không active:', expert.status);
                return await interaction.reply({ 
                    content: '❌ Tài khoản chuyên gia của bạn đang bị vô hiệu hóa!', 
                    flags: 64 
                });
            }

            // Tìm consultation
            console.log(`Đang tìm consultation với shortId: ${shortId}`);
            const consultation = await Consultation.findOne({ 
                shortId: shortId
            });

            if (!consultation) {
                console.log('Không tìm thấy consultation với shortId:', shortId);
                return await interaction.reply({ 
                    content: '❌ Không tìm thấy câu hỏi này! Có thể đã bị xóa.', 
                    flags: 64 
                });
            }
            
            if (consultation.status !== 'published') {
                console.log('Consultation không ở trạng thái published:', consultation.status);
                return await interaction.reply({ 
                    content: `❌ Câu hỏi này đã được trả lời hoặc không còn khả dụng (status: ${consultation.status})!`, 
                    flags: 64 
                });
            }

            // Cập nhật consultation
            console.log('Đang cập nhật consultation...');
            await Consultation.findByIdAndUpdate(consultation._id, {
                status: 'answered',
                answer: answer,
                expertResponse: {
                    answeredAt: new Date(),
                    expertUserId: interaction.user.id
                }
            });

            // Kiểm tra publicChannelId và publicMessageId
            if (!consultation.publicChannelId || !consultation.publicMessageId) {
                console.error('Thiếu publicChannelId hoặc publicMessageId');
                return await interaction.reply({ 
                    content: '✅ Đã lưu câu trả lời thành công, nhưng không thể cập nhật tin nhắn công khai!', 
                    flags: 64 
                });
            }

            try {
                // Update public message
                console.log('Đang cập nhật tin nhắn công khai...');
                const channel = await interaction.client.channels.fetch(consultation.publicChannelId);
                if (!channel) {
                    console.error('Không tìm thấy channel:', consultation.publicChannelId);
                    throw new Error('Không tìm thấy channel');
                }
                
                const publicMessage = await channel.messages.fetch(consultation.publicMessageId);
                if (!publicMessage) {
                    console.error('Không tìm thấy tin nhắn:', consultation.publicMessageId);
                    throw new Error('Không tìm thấy tin nhắn');
                }

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
                console.log('Đã cập nhật tin nhắn công khai thành công');
            } catch (messageError) {
                console.error('Lỗi cập nhật tin nhắn công khai:', messageError);
                await interaction.reply({ 
                    content: '✅ Đã lưu câu trả lời thành công, nhưng không thể cập nhật tin nhắn công khai!', 
                    flags: 64 
                });
                return;
            }

            // Gửi DM cho người hỏi
            try {
                console.log('Đang gửi DM cho người hỏi...');
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
                console.log('Đã gửi DM cho người hỏi thành công');
            } catch (dmError) {
                console.log('Không thể gửi DM cho người hỏi:', dmError.message);
                // Không cần phản hồi lỗi này cho chuyên gia
            }

            // Tăng counter cho expert
            await Expert.findByIdAndUpdate(expert._id, {
                $inc: { totalConsultations: 1 }
            });

            // Thông báo thành công cho chuyên gia
            console.log('Hoàn tất xử lý câu trả lời');
            await interaction.reply({ 
                content: '✅ Đã gửi câu trả lời thành công! Câu trả lời đã được đăng công khai.', 
                flags: 64 
            });

        } catch (error) {
            console.error('Lỗi submit answer:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: `❌ Có lỗi xảy ra khi gửi câu trả lời: ${error.message}`, 
                        flags: 64 
                    });
                }
            } catch (replyError) {
                console.error('Không thể phản hồi lỗi:', replyError);
            }
        }
    },

    // Gửi thông báo cho tất cả chuyên gia phù hợp
    async notifyExperts(client, consultation, category, shortId, guildId) {
        try {
            console.log(`Đang thông báo cho chuyên gia về câu hỏi ${shortId}...`);
            
            // Tìm tất cả chuyên gia phù hợp với lĩnh vực này
            const experts = await Expert.find({
                status: 'active',
                isAvailable: true,
                $or: [
                    { specialties: category },
                    { specialties: 'general' }
                ]
            });
            
            if (experts.length === 0) {
                console.log('Không tìm thấy chuyên gia phù hợp để thông báo');
                return;
            }
            
            console.log(`Tìm thấy ${experts.length} chuyên gia phù hợp`);
            
            // Lấy thông tin guild và channel
            const guild = await client.guilds.fetch(guildId);
            const { getGuildConfig } = require('../../utils/database');
            const config = await getGuildConfig(guildId);
            const channelId = config?.expertPublicRoom;
            
            // Tạo embed thông báo
            const notifyEmbed = new EmbedBuilder()
                .setTitle('🔔 CÓ CÂU HỎI MỚI CẦN TƯ VẤN!')
                .setDescription(`**Mã:** \`${shortId}\`\n` +
                    `**Thể loại:** ${CATEGORIES[category]}\n` +
                    `**Câu hỏi:**\n${consultation.question}\n\n` +
                    '**💬 Cách trả lời:**\n' +
                    '1️⃣ **Trả lời trực tiếp:** Reply tin nhắn này với format:\n' +
                    `\`!reply ${shortId} [câu trả lời của bạn]\`\n\n` +
                    `2️⃣ **Trả lời trong kênh:** ${channelId ? `<#${channelId}>` : 'Kênh public'}\n` +
                    '• Nhấn nút "📝 Trả lời" trong câu hỏi công khai\n\n' +
                    '🔒 **Hoàn toàn ẩn danh** - Bạn và người hỏi không biết nhau')
                .setColor('#FFA500')
                .setFooter({ text: `${guild.name} • Hệ thống tư vấn chuyên gia` })
                .setTimestamp();
            
            // Gửi thông báo cho từng chuyên gia
            let sentCount = 0;
            for (const expert of experts) {
                try {
                    const expertUser = await client.users.fetch(expert.userId);
                    await expertUser.send({ embeds: [notifyEmbed] });
                    sentCount++;
                } catch (dmError) {
                    console.log(`Không thể gửi DM cho chuyên gia ${expert.username}:`, dmError.message);
                }
            }
            
            console.log(`Đã gửi thông báo cho ${sentCount}/${experts.length} chuyên gia`);
            
            // Lưu danh sách chuyên gia đã thông báo
            await Consultation.findByIdAndUpdate(consultation._id, {
                notifiedExperts: experts.map(e => e.userId)
            });
            
        } catch (error) {
            console.error('Lỗi thông báo cho chuyên gia:', error);
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
