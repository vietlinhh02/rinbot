const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    rin: { type: Number, default: 0 },
    lastDaily: { type: Date },
    balance: { type: Number, default: 1000 },
    geminiApiKey: { type: String, default: null },
    inventory: {
        thuoc: { type: Number, default: 0 },
        balo: { type: Number, default: 0 },
        nhankim: { type: Number, default: 0 },
        nhanbac: { type: Number, default: 0 },
        nhanvang: { type: Number, default: 0 }
    },
    marriage: {
        isMarried: { type: Boolean, default: false },
        partnerId: { type: String, default: null },
        marriedAt: { type: Date, default: null },
        ringType: { type: String, default: null }, // kim, bac, vang
        ringLevel: { type: Number, default: 0 },
        chatExp: { type: Number, default: 0 },
        voiceExp: { type: Number, default: 0 },
        lastChatTogether: { type: Date, default: null },
        lastVoiceTogether: { type: Date, default: null }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema); 