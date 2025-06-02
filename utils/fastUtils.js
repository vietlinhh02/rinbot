// Fast utilities để tăng tốc Bot Response Time
const { getUserRin, updateUserRin } = require('./database');

// Cache layer
const rinCache = new Map();
const CACHE_DURATION = 30000; // 30 giây

class FastUtils {
    
    /**
     * Get user Rin với cache - nhanh hơn 10x
     */
    static async getFastUserRin(userId) {
        const cached = rinCache.get(userId);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            return cached.rin;
        }
        
        const rin = await getUserRin(userId);
        rinCache.set(userId, { rin, timestamp: now });
        return rin;
    }
    
    /**
     * Update Rin và refresh cache
     */
    static async updateFastUserRin(userId, amount) {
        // Update database
        await updateUserRin(userId, amount);
        
        // Update cache immediately
        const cached = rinCache.get(userId);
        if (cached) {
            cached.rin += amount;
            cached.timestamp = Date.now();
        }
    }
    
    /**
     * Batch get nhiều users cùng lúc
     */
    static async getBatchUserRin(userIds) {
        const results = new Map();
        const uncachedIds = [];
        const now = Date.now();
        
        // Check cache first
        for (const userId of userIds) {
            const cached = rinCache.get(userId);
            if (cached && (now - cached.timestamp) < CACHE_DURATION) {
                results.set(userId, cached.rin);
            } else {
                uncachedIds.push(userId);
            }
        }
        
        // Fetch uncached ones in parallel
        if (uncachedIds.length > 0) {
            const promises = uncachedIds.map(async (userId) => {
                const rin = await getUserRin(userId);
                rinCache.set(userId, { rin, timestamp: now });
                return { userId, rin };
            });
            
            const fetchedResults = await Promise.all(promises);
            for (const { userId, rin } of fetchedResults) {
                results.set(userId, rin);
            }
        }
        
        return results;
    }
    
    /**
     * Fast check if user has enough Rin
     */
    static async canAfford(userId, amount) {
        const rin = await this.getFastUserRin(userId);
        return rin >= amount;
    }
    
    /**
     * Format số Rin hiển thị đẹp
     */
    static fastFormat(number) {
        if (typeof number !== 'number') {
            number = parseInt(number) || 0;
        }
        
        return number.toLocaleString('vi-VN');
    }
    
    /**
     * Format số tiền nhanh (không dùng toLocaleString)
     */
    static fastFormat(number) {
        if (number < 1000) return number.toString();
        if (number < 1000000) return (number / 1000).toFixed(1) + 'K';
        if (number < 1000000000) return (number / 1000000).toFixed(1) + 'M';
        return (number / 1000000000).toFixed(1) + 'B';
    }
    
    /**
     * Clear cache của user khi cần
     */
    static clearUserCache(userId) {
        rinCache.delete(userId);
    }
    
    /**
     * Cleanup cache cũ - chạy định kỳ
     */
    static cleanupCache() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [userId, cached] of rinCache.entries()) {
            if ((now - cached.timestamp) > CACHE_DURATION * 2) {
                toDelete.push(userId);
            }
        }
        
        toDelete.forEach(userId => rinCache.delete(userId));
        
        if (toDelete.length > 0) {
            console.log(`🧹 Cleaned ${toDelete.length} expired cache entries`);
        }
    }
}

// Auto cleanup mỗi 5 phút
setInterval(() => {
    FastUtils.cleanupCache();
}, 5 * 60 * 1000);

module.exports = FastUtils; 