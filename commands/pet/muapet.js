const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getPet, updatePet } = require('../../utils/database');
const { getUserRin, updateUserRin } = require('../../utils/database');
const { PET_TYPES, PET_IMAGES } = require('../../utils/constants');

module.exports = {
    name: 'muapet',
    description: 'Mua thú cưng mới (100 Rin)',
    async execute(message, args) {
        try {
            const userId = message.author.id;
            const existingPet = await getPet(userId);
            
            if (existingPet) {
                return await message.reply('❌ Bạn đã sở hữu một thú cưng rồi!');
            }

            const userRin = await getUserRin(userId);
            if (userRin < 100) {
                return await message.reply('❌ Bạn không đủ 100 Rin để mua thú cưng!');
            }

            // Hiển thị menu chọn thú cưng
            const petOptions = Object.keys(PET_TYPES).map((petType, index) => ({
                label: petType,
                value: petType,
                emoji: PET_TYPES[petType],
                description: `Giá: 100 Rin`
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_pet_type')
                .setPlaceholder('🐾 Chọn loại thú cưng bạn muốn...')
                .addOptions(petOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🐾 CỬA HÀNG THÚ CƯNG')
                .setDescription('**💰 Giá:** 100 Rin mỗi con\n\n' +
                    '**🎯 Quy trình mua:**\n' +
                    '1. 🐾 Chọn loài thú cưng\n' +
                    '2. ⚧️ Chọn giới tính (Đực/Cái)\n' +
                    '3. ✅ Xác nhận mua\n\n' +
                    '**🌟 Đặc điểm các loài:**\n' +
                    Object.entries(PET_TYPES).map(([name, emoji]) => 
                        `${emoji} **${name}** - Dễ thương và trung thành`
                    ).join('\n') + '\n\n' +
                    '**💡 Hãy chọn loài thú cưng bạn yêu thích!**')
                .setColor('#FF99CC')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/616/616408.png')
                .setFooter({ text: 'Mỗi người chỉ được sở hữu 1 thú cưng!' });

            const replyMessage = await message.reply({ embeds: [embed], components: [row] });

            // Collector để xử lý selection
            const collector = replyMessage.createMessageComponentCollector({ 
                filter: (interaction) => interaction.user.id === userId,
                time: 60000 
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'select_pet_type') {
                    const selectedPetType = interaction.values[0];
                    await this.showGenderSelection(interaction, selectedPetType, userId);
                } else if (interaction.customId.startsWith('select_gender_')) {
                    const petType = interaction.customId.split('_')[2];
                    const gender = interaction.customId.split('_')[3];
                    await this.purchasePet(interaction, petType, gender, userId);
                }
            });

            collector.on('end', async () => {
                try {
                    await replyMessage.edit({ components: [] });
                } catch (error) {
                    // Message might be deleted, ignore error
                }
            });

        } catch (error) {
            console.error('Lỗi muapet:', error);
            await message.reply('❌ Có lỗi xảy ra!');
        }
    },

    async showGenderSelection(interaction, petType, userId) {
        const maleButton = new ButtonBuilder()
            .setCustomId(`select_gender_${petType}_Đực`)
            .setLabel('🐶 Đực')
            .setStyle(ButtonStyle.Primary);

        const femaleButton = new ButtonBuilder()
            .setCustomId(`select_gender_${petType}_Cái`)
            .setLabel('🐱 Cái')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(maleButton, femaleButton);

        const embed = new EmbedBuilder()
            .setTitle('⚧️ CHỌN GIỚI TÍNH')
            .setDescription(`**Bạn đã chọn:** ${PET_TYPES[petType]} **${petType}**\n\n` +
                '**🎯 Bước tiếp theo:** Chọn giới tính cho thú cưng\n\n' +
                '**🐶 Đực:** Mạnh mẽ, năng động\n' +
                '**🐱 Cái:** Dễ thương, nữ tính\n\n' +
                '💡 *Giới tính không ảnh hưởng đến khả năng, chỉ mang tính thẩm mỹ!*')
            .setThumbnail(PET_IMAGES[petType])
            .setColor('#FF99CC')
            .setFooter({ text: 'Chọn giới tính bạn thích!' });

        await interaction.update({ embeds: [embed], components: [row] });
    },

    async purchasePet(interaction, petType, gender, userId) {
        try {
            // Kiểm tra lại Rin trước khi mua
            const userRin = await getUserRin(userId);
            if (userRin < 100) {
                return await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ KHÔNG ĐỦ RIN')
                        .setDescription('Bạn không còn đủ 100 Rin để mua thú cưng!')
                        .setColor('#FF0000')],
                    components: []
                });
            }

            // Kiểm tra lại xem đã có thú cưng chưa
            const existingPet = await getPet(userId);
            if (existingPet) {
                return await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ ĐÃ CÓ THÚ CƯNG')
                        .setDescription('Bạn đã sở hữu một thú cưng rồi!')
                        .setColor('#FF0000')],
                    components: []
                });
            }

            // Tạo pet mới
            await updatePet(userId, {
                userId,
                petType: petType,
                gender: gender,
                health: 'Bình thường',
                age: 0,
                breedCount: 0,
                married: false
            });

            await updateUserRin(userId, -100);

            const embed = new EmbedBuilder()
                .setTitle('🎉 MUA THÚ CƯNG THÀNH CÔNG!')
                .setDescription(`**Chúc mừng ${interaction.user.displayName}!** 🎊\n\n` +
                    `**🐾 Thú cưng mới:**\n` +
                    `• Loài: ${PET_TYPES[petType]} **${petType}**\n` +
                    `• Giới tính: ${gender}\n` +
                    `• Sức khỏe: Bình thường\n` +
                    `• Tuổi: 0 ngày\n\n` +
                    `**💸 Chi phí:** 100 Rin\n\n` +
                    `**🎯 Bước tiếp theo:**\n` +
                    `• Dùng \`petcheck\` để xem thông tin\n` +
                    `• Dùng \`thucan\` để cho ăn mỗi 3h\n` +
                    `• Dùng \`petchich @user\` để ghép cặp\n\n` +
                    `**Chúc bạn có những phút giây vui vẻ với thú cưng! 🐾**`)
                .setThumbnail(PET_IMAGES[petType])
                .setColor('#00FF00')
                .setFooter({ text: 'Hãy chăm sóc thú cưng thật tốt nhé!' })
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });

        } catch (error) {
            console.error('Lỗi mua pet:', error);
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ LỖI HỆ THỐNG')
                    .setDescription('Có lỗi xảy ra khi mua thú cưng. Vui lòng thử lại!')
                    .setColor('#FF0000')],
                components: []
            });
        }
    }
}; 