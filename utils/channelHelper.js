/**
 * Helper để quản lý channel settings của guild
 */

const Guild = require('../models/Guild');

class ChannelHelper {
    /**
     * Lấy channel settings của một guild
     * @param {string} guildId - ID của guild
     * @returns {Object} Channel settings
     */
    static async getChannelSettings(guildId) {
        try {
            const guild = await Guild.findOne({ guildId });
            return guild?.channelSettings || {};
        } catch (error) {
            console.error('Lỗi lấy channel settings:', error);
            return {};
        }
    }

    /**
     * Lấy ID của một loại channel cụ thể
     * @param {string} guildId - ID của guild
     * @param {string} type - Loại channel (announce, log, welcome, general, game)
     * @returns {string|null} Channel ID hoặc null
     */
    static async getChannelId(guildId, type) {
        try {
            const settings = await this.getChannelSettings(guildId);
            return settings[type] || null;
        } catch (error) {
            console.error(`Lỗi lấy ${type} channel:`, error);
            return null;
        }
    }

    /**
     * Lấy channel announce của guild
     * @param {string} guildId - ID của guild
     * @returns {string|null} Channel ID
     */
    static async getAnnounceChannel(guildId) {
        return await this.getChannelId(guildId, 'announce');
    }

    /**
     * Lấy channel log của guild
     * @param {string} guildId - ID của guild
     * @returns {string|null} Channel ID
     */
    static async getLogChannel(guildId) {
        return await this.getChannelId(guildId, 'log');
    }

    /**
     * Lấy channel welcome của guild
     * @param {string} guildId - ID của guild
     * @returns {string|null} Channel ID
     */
    static async getWelcomeChannel(guildId) {
        return await this.getChannelId(guildId, 'welcome');
    }

    /**
     * Lấy channel general của guild
     * @param {string} guildId - ID của guild
     * @returns {string|null} Channel ID
     */
    static async getGeneralChannel(guildId) {
        return await this.getChannelId(guildId, 'general');
    }

    /**
     * Lấy channel game của guild
     * @param {string} guildId - ID của guild
     * @returns {string|null} Channel ID
     */
    static async getGameChannel(guildId) {
        return await this.getChannelId(guildId, 'game');
    }

    /**
     * Gửi message tới channel announce của guild
     * @param {Client} client - Discord client
     * @param {string} guildId - ID của guild
     * @param {Object} content - Content để gửi (text hoặc embed)
     * @returns {Message|null} Tin nhắn đã gửi hoặc null
     */
    static async sendToAnnounceChannel(client, guildId, content) {
        try {
            const channelId = await this.getAnnounceChannel(guildId);
            if (!channelId) return null;

            const channel = await client.channels.fetch(channelId);
            if (!channel) return null;

            return await channel.send(content);
        } catch (error) {
            console.error('Lỗi gửi tin nhắn tới announce channel:', error);
            return null;
        }
    }

    /**
     * Gửi message tới channel log của guild
     * @param {Client} client - Discord client
     * @param {string} guildId - ID của guild
     * @param {Object} content - Content để gửi (text hoặc embed)
     * @returns {Message|null} Tin nhắn đã gửi hoặc null
     */
    static async sendToLogChannel(client, guildId, content) {
        try {
            const channelId = await this.getLogChannel(guildId);
            if (!channelId) return null;

            const channel = await client.channels.fetch(channelId);
            if (!channel) return null;

            return await channel.send(content);
        } catch (error) {
            console.error('Lỗi gửi tin nhắn tới log channel:', error);
            return null;
        }
    }

    /**
     * Gửi message tới channel welcome của guild
     * @param {Client} client - Discord client
     * @param {string} guildId - ID của guild
     * @param {Object} content - Content để gửi (text hoặc embed)
     * @returns {Message|null} Tin nhắn đã gửi hoặc null
     */
    static async sendToWelcomeChannel(client, guildId, content) {
        try {
            const channelId = await this.getWelcomeChannel(guildId);
            if (!channelId) return null;

            const channel = await client.channels.fetch(channelId);
            if (!channel) return null;

            return await channel.send(content);
        } catch (error) {
            console.error('Lỗi gửi tin nhắn tới welcome channel:', error);
            return null;
        }
    }

    /**
     * Kiểm tra xem user có quyền sử dụng channel cụ thể không
     * @param {Member} member - Discord member
     * @param {Channel} channel - Discord channel
     * @returns {boolean} True nếu có quyền
     */
    static canAccessChannel(member, channel) {
        try {
            return channel.permissionsFor(member).has(['VIEW_CHANNEL', 'SEND_MESSAGES']);
        } catch (error) {
            console.error('Lỗi kiểm tra quyền channel:', error);
            return false;
        }
    }

    /**
     * Lấy thông tin chi tiết về tất cả channels đã set
     * @param {Client} client - Discord client
     * @param {string} guildId - ID của guild
     * @returns {Object} Thông tin chi tiết các channels
     */
    static async getChannelDetails(client, guildId) {
        try {
            const settings = await this.getChannelSettings(guildId);
            const details = {};

            for (const [type, channelId] of Object.entries(settings)) {
                if (channelId) {
                    try {
                        const channel = await client.channels.fetch(channelId);
                        details[type] = {
                            id: channelId,
                            name: channel.name,
                            mention: `<#${channelId}>`,
                            exists: true
                        };
                    } catch (error) {
                        details[type] = {
                            id: channelId,
                            name: 'Channel không tồn tại',
                            mention: `<#${channelId}>`,
                            exists: false
                        };
                    }
                }
            }

            return details;
        } catch (error) {
            console.error('Lỗi lấy channel details:', error);
            return {};
        }
    }
}

module.exports = ChannelHelper; 