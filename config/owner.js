module.exports = {
    // Discord ID của owner bot
    ownerId: '429078973562093569,1328980118223458388', // Thay đổi thành ID Discord của bạn
    
    // Thông tin owner (không bắt buộc)
    ownerInfo: {
        username: 'Bot Owner',
        discriminator: '0000'
    },
    
    // Settings bảo mật
    security: {
        dmOnly: true,        // Gửi thông tin nhạy cảm qua DM
        deleteAfter: 5000,   // Xóa reply sau 5 giây
        logAccess: true      // Log khi ai đó cố truy cập owner commands
    }
}; 