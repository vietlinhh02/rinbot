const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: ',' },
    expertPublicRoom: { type: String, default: null },
    expertCodeFormat: { type: String, default: null },
    channelSettings: {
        type: Object,
        default: {
            announce: null,    // Channel thông báo
            log: null,         // Channel log
            welcome: null,     // Channel chào mừng
            general: null,     // Channel chat chung
            game: null         // Channel game
        }
    },
    settings: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Guild', guildSchema); 