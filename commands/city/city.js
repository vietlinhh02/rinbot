const { EmbedBuilder } = require('discord.js');
const { CityUser } = require('../../models/CityUser');
const { updateUserRin } = require('../../utils/database');
const { HOUSE_TYPES, COLORS } = require('../../utils/constants');

/**
 * Kiểm tra và cập nhật trạng thái sửa nhà hàng ngày
 * @param {Client} client Discord client
 */
async function checkRepair(client) {
    try {
        console.log('🏠 Đang kiểm tra trạng thái sửa nhà...');
        
        // Tìm tất cả người dùng có nhà cần sửa
        const now = new Date();
        const usersNeedRepair = await CityUser.find({
            houseId: { $exists: true, $ne: null },
            houseHealth: { $lt: 100 }
        });
        
        if (usersNeedRepair.length === 0) {
            console.log('✅ Không có nhà nào cần sửa chữa');
            return;
        }
        
        console.log(`🔧 Tìm thấy ${usersNeedRepair.length} nhà cần sửa chữa`);
        
        // Xử lý từng người dùng
        for (const cityUser of usersNeedRepair) {
            try {
                // Giảm health nếu quá lâu không sửa
                const lastRepair = cityUser.lastRepair ? new Date(cityUser.lastRepair) : null;
                const daysSinceRepair = lastRepair ? Math.floor((now - lastRepair) / (24 * 60 * 60 * 1000)) : 0;
                
                if (daysSinceRepair > 7) {
                    // Giảm health nếu không sửa quá 7 ngày
                    const healthDecrease = Math.min(cityUser.houseHealth, Math.floor(daysSinceRepair / 7) * 5);
                    
                    if (healthDecrease > 0) {
                        cityUser.houseHealth -= healthDecrease;
                        await cityUser.save();
                        
                        console.log(`🏚️ Nhà của user ${cityUser.userId} giảm ${healthDecrease}% health do không sửa chữa`);
                        
                        // Thông báo cho user nếu health quá thấp
                        if (cityUser.houseHealth <= 30) {
                            try {
                                const user = await client.users.fetch(cityUser.userId);
                                const houseType = HOUSE_TYPES[cityUser.houseId];
                                
                                const warningEmbed = new EmbedBuilder()
                                    .setTitle('⚠️ NHÀ CỦA BẠN ĐANG HƯ HỎNG NẶNG!')
                                    .setDescription(`**${houseType?.name || 'Ngôi nhà'} của bạn đang trong tình trạng nguy hiểm!**\n\n` +
                                        `• **Độ bền hiện tại:** ${cityUser.houseHealth}%\n` +
                                        `• **Trạng thái:** ${getHealthStatus(cityUser.houseHealth)}\n\n` +
                                        `⚠️ **Cảnh báo:** Nhà có thể bị hư hỏng hoàn toàn nếu không sửa chữa!\n` +
                                        `💡 **Hướng dẫn:** Sử dụng lệnh \`,suanha\` để sửa chữa ngay!`)
                                    .setColor(COLORS.warning)
                                    .setTimestamp();
                                
                                await user.send({ embeds: [warningEmbed] });
                            } catch (dmError) {
                                console.log(`Không thể gửi DM cảnh báo cho user ${cityUser.userId}:`, dmError.message);
                            }
                        }
                    }
                }
            } catch (userError) {
                console.error(`Lỗi xử lý nhà của user ${cityUser.userId}:`, userError);
            }
        }
        
        console.log('✅ Đã hoàn thành kiểm tra sửa nhà');
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra sửa nhà:', error);
    }
}

/**
 * Lấy mô tả trạng thái dựa trên độ bền
 * @param {number} health Độ bền nhà
 * @returns {string} Mô tả trạng thái
 */
function getHealthStatus(health) {
    if (health > 80) return '🟢 Tốt';
    if (health > 60) return '🟡 Bình thường';
    if (health > 40) return '🟠 Xuống cấp';
    if (health > 20) return '🔴 Hư hỏng nặng';
    return '⚫ Nguy hiểm';
}

module.exports = {
    checkRepair
}; 