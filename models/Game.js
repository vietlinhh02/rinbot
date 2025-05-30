const mongoose = require('mongoose');

// Schema cho game Tỷ Phú
const typhuPlayerSchema = new mongoose.Schema({
    roomId: String,
    userId: String,
    nene: { type: Number, default: 2000 },
    position: { type: Number, default: 0 },
    inJail: { type: Number, default: 0 }
});

const typhuPropertySchema = new mongoose.Schema({
    roomId: String,
    tileIndex: Number,
    ownerId: String,
    level: { type: Number, default: 0 }
});

// Schema cho Bầu Cua
const bauCuaBetSchema = new mongoose.Schema({
    gameId: String,
    userId: String,
    animal: String,
    amount: Number
});

const bauCuaGameSchema = new mongoose.Schema({
    gameId: { type: String, unique: true },
    hostId: String,
    started: { type: Boolean, default: false }
});

module.exports = {
    TyphuPlayer: mongoose.model('TyphuPlayer', typhuPlayerSchema),
    TyphuProperty: mongoose.model('TyphuProperty', typhuPropertySchema),
    BauCuaBet: mongoose.model('BauCuaBet', bauCuaBetSchema),
    BauCuaGame: mongoose.model('BauCuaGame', bauCuaGameSchema)
}; 