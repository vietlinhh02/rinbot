const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: ',' },
    expertPublicRoom: { type: String, default: null },
    expertCodeFormat: { type: String, default: null },
    settings: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Guild', guildSchema); 