const mongoose = require('mongoose');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Tree = require('../models/Tree');
const CityUser = require('../models/CityUser');
const Guild = require('../models/Guild');

// Kết nối MongoDB
const connectDB = async (uri) => {
    try {
        await mongoose.connect(uri);
        console.log('✅ Đã kết nối MongoDB thành công');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error);
        process.exit(1);
    }
};

// User functions
const getUserRin = async (userId) => {
    try {
        let user = await User.findOne({ userId });
        if (!user) {
            user = await User.create({ userId, rin: 0 });
        }
        return user.rin;
    } catch (error) {
        console.error('Lỗi getUserRin:', error);
        return 0;
    }
};

const updateUserRin = async (userId, amount) => {
    try {
        let user = await User.findOne({ userId });
        if (!user) {
            user = await User.create({ userId, rin: amount });
        } else {
            user.rin += amount;
            await user.save();
        }
        return user.rin;
    } catch (error) {
        console.error('Lỗi updateUserRin:', error);
        return 0;
    }
};

// Pet functions
const getPet = async (userId) => {
    try {
        return await Pet.findOne({ userId });
    } catch (error) {
        console.error('Lỗi getPet:', error);
        return null;
    }
};

const updatePet = async (userId, updateData) => {
    try {
        return await Pet.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, upsert: true }
        );
    } catch (error) {
        console.error('Lỗi updatePet:', error);
        return null;
    }
};

const deletePet = async (userId) => {
    try {
        return await Pet.findOneAndDelete({ userId });
    } catch (error) {
        console.error('Lỗi deletePet:', error);
        return null;
    }
};

// Tree functions
const getUserTree = async (userId) => {
    try {
        return await Tree.findOne({ userId });
    } catch (error) {
        console.error('Lỗi getUserTree:', error);
        return null;
    }
};

const createTree = async (userId, species) => {
    try {
        // Xóa cây cũ nếu có
        await Tree.findOneAndDelete({ userId });
        
        return await Tree.create({
            userId,
            species,
            growthStage: 0,
            plantedAt: new Date()
        });
    } catch (error) {
        console.error('Lỗi createTree:', error);
        return null;
    }
};

const updateTree = async (userId, updateData) => {
    try {
        return await Tree.findOneAndUpdate(
            { userId },
            updateData,
            { new: true }
        );
    } catch (error) {
        console.error('Lỗi updateTree:', error);
        return null;
    }
};

const deleteTree = async (userId) => {
    try {
        return await Tree.findOneAndDelete({ userId });
    } catch (error) {
        console.error('Lỗi deleteTree:', error);
        return null;
    }
};

// City functions
const getCityUser = async (userId) => {
    try {
        let cityUser = await CityUser.findOne({ userId });
        if (!cityUser) {
            cityUser = await CityUser.create({
                userId,
                lastRepair: new Date()
            });
        }
        return cityUser;
    } catch (error) {
        console.error('Lỗi getCityUser:', error);
        return null;
    }
};

const updateCityUser = async (userId, updateData) => {
    try {
        return await CityUser.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, upsert: true }
        );
    } catch (error) {
        console.error('Lỗi updateCityUser:', error);
        return null;
    }
};

// Guild functions
const getGuildPrefix = async (guildId) => {
    try {
        const guild = await Guild.findOne({ guildId });
        if (!guild) {
            // Không tự động tạo guild, trả về null để dùng prefix từ .env hoặc default
            return null;
        }
        return guild.prefix;
    } catch (error) {
        console.error('Lỗi getGuildPrefix:', error);
        return null;
    }
};

const setGuildPrefix = async (guildId, prefix) => {
    try {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId, prefix });
        } else {
            guild.prefix = prefix;
            await guild.save();
        }
        return guild.prefix;
    } catch (error) {
        console.error('Lỗi setGuildPrefix:', error);
        return ',';
    }
};

const getAllGuildPrefixes = async () => {
    try {
        const guilds = await Guild.find({}, 'guildId prefix');
        const prefixMap = {};
        guilds.forEach(guild => {
            prefixMap[guild.guildId] = guild.prefix;
        });
        return prefixMap;
    } catch (error) {
        console.error('Lỗi getAllGuildPrefixes:', error);
        return {};
    }
};

module.exports = {
    connectDB,
    getUserRin,
    updateUserRin,
    getPet,
    updatePet,
    deletePet,
    getUserTree,
    createTree,
    updateTree,
    deleteTree,
    getCityUser,
    updateCityUser,
    getGuildPrefix,
    setGuildPrefix,
    getAllGuildPrefixes
}; 