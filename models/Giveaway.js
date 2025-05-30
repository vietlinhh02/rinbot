const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: String,
    channelId: String,
    guildId: String,
    hostId: String,
    prize: String,
    winners: Number,
    endTime: Date,
    participants: [String],
    targetUsers: [String],
    ended: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Giveaway', giveawaySchema); 