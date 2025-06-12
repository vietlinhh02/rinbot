const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'errortest',
    description: 'Test error reporting system (Owner only)',
    
    async execute(message, args) {
        // Chỉ owner mới được dùng
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Chỉ owner mới có thể sử dụng lệnh này!');
        }

        const action = args[0]?.toLowerCase();

        switch (action) {
            case 'console':
                // Test console.error
                console.error('🧪 Test Console Error:', new Error('Đây là test error từ console.error'));
                await message.reply('✅ Đã test console.error!');
                break;

            case 'uncaught':
                // Test uncaught exception (NGUY HIỂM - chỉ dùng để test!)
                await message.reply('⚠️ Sẽ tạo uncaught exception trong 3 giây...');
                setTimeout(() => {
                    throw new Error('🧪 Test Uncaught Exception');
                }, 3000);
                break;

            case 'rejection':
                // Test unhandled promise rejection
                new Promise((resolve, reject) => {
                    reject(new Error('🧪 Test Unhandled Promise Rejection'));
                });
                await message.reply('✅ Đã test unhandled promise rejection!');
                break;

            case 'manual':
                // Test manual error report
                const client = message.client;
                if (client.errorHandler) {
                    await client.errorHandler.testErrorReport();
                    await message.reply('✅ Đã gửi test error report!');
                } else {
                    await message.reply('❌ ErrorHandler chưa được khởi tạo!');
                }
                break;

            case 'info':
                // Hiển thị thông tin error handler
                const embed = new EmbedBuilder()
                    .setTitle('🚨 Error Handler Info')
                    .setColor('#00FF00')
                    .addFields(
                        { name: '🎯 Owner ID', value: process.env.OWNER_ID || 'Chưa set', inline: true },
                        { name: '📝 Console Override', value: 'Đã active', inline: true },
                        { name: '⚡ Exception Handler', value: 'Đã active', inline: true },
                        { name: '💭 Rejection Handler', value: 'Đã active', inline: true },
                        { name: '⏱️ Rate Limit', value: '5 phút/lỗi', inline: true },
                        { name: '📊 Status', value: client.errorHandler ? '✅ Ready' : '❌ Not Ready', inline: true }
                    )
                    .setFooter({ text: 'RinBot Error Handler' })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
                break;

            default:
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🚨 Error Test Commands')
                    .setDescription('Các lệnh test error reporting system:')
                    .setColor('#FF9900')
                    .addFields(
                        { name: '📝 console', value: '`errortest console` - Test console.error override', inline: false },
                        { name: '💥 uncaught', value: '`errortest uncaught` - Test uncaught exception (nguy hiểm!)', inline: false },
                        { name: '💭 rejection', value: '`errortest rejection` - Test unhandled promise rejection', inline: false },
                        { name: '📧 manual', value: '`errortest manual` - Test manual error report', inline: false },
                        { name: 'ℹ️ info', value: '`errortest info` - Hiển thị thông tin error handler', inline: false }
                    )
                    .setFooter({ text: '⚠️ Chỉ owner mới được sử dụng!' });

                await message.reply({ embeds: [helpEmbed] });
                break;
        }
    }
}; 