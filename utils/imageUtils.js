const fs = require('fs');
const path = require('path');
const slotsConfig = require('../modules/SlotsConfig');

// Try to load canvas modules - fallback if not available
let canvas, GIFEncoder;
let canvasAvailable = false;

try {
    const canvasModule = require('canvas');
    canvas = canvasModule;
    GIFEncoder = require('gif-encoder-2');
    canvasAvailable = true;
    console.log('✅ Canvas và GIF encoder sẵn sàng');
} catch (error) {
    console.log('⚠️ Canvas không khả dụng, sử dụng text-based fallback');
    canvasAvailable = false;
}

class ImageUtils {
    constructor() {
        this.cardWidth = 71;
        this.cardHeight = 96;
        this.slotItemHeight = 180;
    }

    /**
     * Get card image filename từ suit và value
     */
    getCardImageName(suit, value) {
        const suitMap = {
            'hearts': 'H',
            'diamonds': 'D', 
            'clubs': 'C',
            'spades': 'S'
        };
        
        const valueMap = {
            11: 'J',
            12: 'Q', 
            13: 'K',
            14: 'A'
        };
        
        const suitCode = suitMap[suit];
        const valueCode = valueMap[value] || value.toString();
        
        return `${valueCode}${suitCode}.png`;
    }

    /**
     * Tạo hình ảnh bàn blackjack
     */
    async createBlackjackTable(dealerHand, playerHands, outputPath) {
        if (!canvasAvailable) {
            throw new Error('Canvas không khả dụng');
        }
        
        try {
            // Load background table
            const tablePath = path.join(__dirname, '../modules/table.png');
            const table = await canvas.loadImage(tablePath);
            
            const canvasElement = canvas.createCanvas(table.width, table.height);
            const ctx = canvasElement.getContext('2d');
            
            // Vẽ background
            ctx.drawImage(table, 0, 0);
            
            const centerX = canvasElement.width / 2;
            const centerY = canvasElement.height / 2;
            
            // Tính vị trí để căn giữa các hand
            const dealerY = centerY - 120; // Dealer ở trên
            
            // Vẽ dealer hand
            await this.drawHand(ctx, dealerHand, centerX, dealerY);
            
            // Vẽ text "DEALER"
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('DEALER', centerX, dealerY - 10);
            
            // Vẽ player hands
            if (Array.isArray(playerHands[0])) {
                // Nhiều người chơi
                const playersCount = playerHands.length;
                const playerSpacing = Math.min(200, canvasElement.width / (playersCount + 1));
                
                for (let i = 0; i < playersCount; i++) {
                    const playerX = centerX - ((playersCount - 1) * playerSpacing / 2) + (i * playerSpacing);
                    const playerY = centerY + 60;
                    await this.drawHand(ctx, playerHands[i].hand, playerX, playerY);
                    
                    // Vẽ tên người chơi
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    const displayName = playerHands[i].name.length > 10 ? 
                        playerHands[i].name.substring(0, 10) + '...' : playerHands[i].name;
                    ctx.fillText(displayName, playerX, playerY + this.cardHeight + 20);
                }
            } else {
                // Một người chơi (backward compatibility)
                const playerY = centerY + 60;
                await this.drawHand(ctx, playerHands, centerX, playerY);
            }
            
            // Lưu file
            const buffer = canvasElement.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);
            
            return outputPath;
            
        } catch (error) {
            console.error('Lỗi tạo blackjack table:', error);
            throw error;
        }
    }

    /**
     * Vẽ một hand cards lên canvas
     */
    async drawHand(ctx, hand, centerX, startY) {
        const totalWidth = (hand.length * this.cardWidth) + ((hand.length - 1) * 10);
        let startX = centerX - (totalWidth / 2);
        
        for (const card of hand) {
            let cardImage;
            
            if (card.hidden) {
                // Vẽ mặt sau
                const backPath = path.join(__dirname, '../modules/cards/red_back.png');
                cardImage = await canvas.loadImage(backPath);
            } else {
                // Vẽ mặt trước
                const cardFileName = this.getCardImageName(card.suit, card.value);
                const cardPath = path.join(__dirname, '../modules/cards', cardFileName);
                cardImage = await canvas.loadImage(cardPath);
            }
            
            ctx.drawImage(cardImage, startX, startY, this.cardWidth, this.cardHeight);
            startX += this.cardWidth + 10; // Khoảng cách giữa các lá
        }
    }

    /**
     * Tạo GIF animation cho slots
     */
    async createSlotsGIF(animationFrames, outputPath) {
        if (!canvasAvailable) {
            throw new Error('Canvas không khả dụng - không thể tạo GIF');
        }
        
        try {
            // Load slot assets từ SlotsConfig
            const assets = slotsConfig.getAssetPaths();
            const slotFace = await canvas.loadImage(assets.facePath);
            const slotReel = await canvas.loadImage(assets.reelPath);
            
            const canvasElement = canvas.createCanvas(slotFace.width, slotFace.height);
            const ctx = canvasElement.getContext('2d');
            
            // Tạo GIF encoder
            const encoder = new GIFEncoder(canvasElement.width, canvasElement.height);
            encoder.setQuality(10);
            encoder.setDelay(slotsConfig.frameDelay); // 50ms per frame
            encoder.setRepeat(0);
            
            const stream = fs.createWriteStream(outputPath);
            encoder.createReadStream().pipe(stream);
            encoder.start();
            
            console.log(`🎰 Tạo GIF với ${animationFrames.length} frames...`);
            
            // Vẽ từng frame
            for (let frameIndex = 0; frameIndex < animationFrames.length; frameIndex++) {
                const frame = animationFrames[frameIndex];
                
                // Clear canvas với background trắng
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
                
                // Vẽ 3 reels
                for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
                    const symbol = frame[reelIndex];
                    const symbolPosition = slotsConfig.symbolPositions[symbol] || 0;
                    
                    // Tính position trên reel image (mỗi symbol cao 180px)
                    const sourceY = symbolPosition * slotsConfig.itemHeight;
                    
                    // Vị trí vẽ trên canvas
                    const reelWidth = 155; // Width của mỗi reel
                    const reelX = 25 + (reelIndex * reelWidth);
                    const reelY = 100; // Y position cố định
                    
                    // Vẽ chỉ phần symbol cần thiết từ reel
                    ctx.drawImage(slotReel,
                        0, sourceY, slotReel.width, slotsConfig.itemHeight,  // Source: lấy 1 symbol
                        reelX, reelY, reelWidth, slotsConfig.itemHeight     // Dest: vẽ lên canvas
                    );
                }
                
                // Vẽ slot face overlay
                ctx.drawImage(slotFace, 0, 0);
                
                // Add frame to GIF
                encoder.addFrame(ctx);
                
                // Log progress
                if (frameIndex % 10 === 0 || frameIndex === animationFrames.length - 1) {
                    console.log(`🎬 Frame ${frameIndex + 1}/${animationFrames.length} - ${frame.join(' ')}`);
                }
            }
            
            encoder.finish();
            
            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    console.log(`✅ GIF hoàn thành: ${outputPath}`);
                    resolve(outputPath);
                });
                stream.on('error', (error) => {
                    console.error('❌ Lỗi tạo GIF:', error);
                    reject(error);
                });
                
                // Close stream sau khi encoder finish
                setTimeout(() => {
                    stream.end();
                }, 100);
            });
            
        } catch (error) {
            console.error('❌ Lỗi tạo slots GIF:', error);
            throw error;
        }
    }

    /**
     * Tạo static slots image (cho kết quả cuối)
     */
    async createSlotsImage(symbols, outputPath) {
        if (!canvasAvailable) {
            throw new Error('Canvas không khả dụng');
        }
        
        try {
            const assets = slotsConfig.getAssetPaths();
            const slotFace = await canvas.loadImage(assets.facePath);
            const slotReel = await canvas.loadImage(assets.reelPath);
            
            const canvasElement = canvas.createCanvas(slotFace.width, slotFace.height);
            const ctx = canvasElement.getContext('2d');
            
            // Clear canvas
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            
            // Vẽ 3 reels với symbols cố định
            for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
                const symbol = symbols[reelIndex];
                const symbolPosition = slotsConfig.symbolPositions[symbol] || 0;
                
                // Tính position trên reel image
                const sourceY = symbolPosition * slotsConfig.itemHeight;
                
                // Vị trí vẽ trên canvas
                const reelWidth = 155;
                const reelX = 25 + (reelIndex * reelWidth);
                const reelY = 100;
                
                ctx.drawImage(slotReel,
                    0, sourceY, slotReel.width, slotsConfig.itemHeight,
                    reelX, reelY, reelWidth, slotsConfig.itemHeight
                );
            }
            
            // Vẽ slot face overlay
            ctx.drawImage(slotFace, 0, 0);
            
            // Lưu file
            const buffer = canvasElement.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);
            
            return outputPath;
            
        } catch (error) {
            console.error('Lỗi tạo slots image:', error);
            throw error;
        }
    }

    /**
     * Check if canvas is available
     */
    isCanvasAvailable() {
        return canvasAvailable;
    }

    /**
     * Cleanup temporary files
     */
    cleanupTempFiles(files) {
        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                console.error(`Lỗi xóa file ${file}:`, error);
            }
        }
    }

    /**
     * Tạo GIF animation cho blackjack với hiệu ứng chia bài
     */
    async createBlackjackGIF(dealerHand, playerHands, outputPath) {
        if (!canvasAvailable) {
            throw new Error('Canvas không khả dụng - không thể tạo GIF');
        }
        
        try {
            // Load background table
            const tablePath = path.join(__dirname, '../modules/table.png');
            const table = await canvas.loadImage(tablePath);
            
            const canvasElement = canvas.createCanvas(table.width, table.height);
            const ctx = canvasElement.getContext('2d');
            
            // Tạo GIF encoder
            const encoder = new GIFEncoder(canvasElement.width, canvasElement.height);
            encoder.setQuality(10);
            encoder.setDelay(400); // 400ms per frame
            encoder.setRepeat(0);
            
            const stream = fs.createWriteStream(outputPath);
            encoder.createReadStream().pipe(stream);
            encoder.start();
            
            const centerX = canvasElement.width / 2;
            const centerY = canvasElement.height / 2;
            const dealerY = centerY - 120;
            
            // Tính số frame animation
            const playerHandLengths = Array.isArray(playerHands[0]) ? 
                playerHands.map(p => p.hand ? p.hand.length : 0) : 
                [playerHands.length];
            const maxCards = Math.max(dealerHand.length, ...playerHandLengths);
            const totalFrames = maxCards + 2; // +2 frames cho intro/outro
            
            console.log(`🃏 Tạo blackjack GIF với ${totalFrames} frames...`);
            
            // Frame 1: Chỉ có background và labels
            ctx.drawImage(table, 0, 0);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('DEALER', centerX, dealerY - 10);
            
            // Vẽ tên người chơi
            if (Array.isArray(playerHands[0])) {
                const playersCount = playerHands.length;
                const playerSpacing = Math.min(200, canvasElement.width / (playersCount + 1));
                
                for (let i = 0; i < playersCount; i++) {
                    const playerX = centerX - ((playersCount - 1) * playerSpacing / 2) + (i * playerSpacing);
                    const playerY = centerY + 60;
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial';
                    const displayName = playerHands[i].name.length > 10 ? 
                        playerHands[i].name.substring(0, 10) + '...' : playerHands[i].name;
                    ctx.fillText(displayName, playerX, playerY + this.cardHeight + 20);
                }
            }
            
            encoder.addFrame(ctx);
            
            // Frames 2 đến maxCards+1: Chia bài từng lá
            for (let cardIndex = 0; cardIndex < maxCards; cardIndex++) {
                ctx.drawImage(table, 0, 0);
                
                // Vẽ labels
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('DEALER', centerX, dealerY - 10);
                
                // Vẽ dealer cards đến cardIndex hiện tại
                if (cardIndex < dealerHand.length) {
                    const dealerCardsToShow = dealerHand.slice(0, cardIndex + 1);
                    await this.drawHand(ctx, dealerCardsToShow, centerX, dealerY);
                } else if (dealerHand.length > 0) {
                    await this.drawHand(ctx, dealerHand, centerX, dealerY);
                }
                
                // Vẽ player cards đến cardIndex hiện tại
                if (Array.isArray(playerHands[0])) {
                    const playersCount = playerHands.length;
                    const playerSpacing = Math.min(200, canvasElement.width / (playersCount + 1));
                    
                    for (let i = 0; i < playersCount; i++) {
                        const playerX = centerX - ((playersCount - 1) * playerSpacing / 2) + (i * playerSpacing);
                        const playerY = centerY + 60;
                        
                        if (cardIndex < playerHands[i].hand.length) {
                            const playerCardsToShow = playerHands[i].hand.slice(0, cardIndex + 1);
                            await this.drawHand(ctx, playerCardsToShow, playerX, playerY);
                        } else if (playerHands[i].hand.length > 0) {
                            await this.drawHand(ctx, playerHands[i].hand, playerX, playerY);
                        }
                        
                        // Vẽ tên người chơi
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = 'bold 14px Arial';
                        const displayName = playerHands[i].name.length > 10 ? 
                            playerHands[i].name.substring(0, 10) + '...' : playerHands[i].name;
                        ctx.fillText(displayName, playerX, playerY + this.cardHeight + 20);
                    }
                } else {
                    // Single player mode
                    const playerY = centerY + 60;
                    if (cardIndex < playerHands.length) {
                        const playerCardsToShow = playerHands.slice(0, cardIndex + 1);
                        await this.drawHand(ctx, playerCardsToShow, centerX, playerY);
                    } else if (playerHands.length > 0) {
                        await this.drawHand(ctx, playerHands, centerX, playerY);
                    }
                }
                
                encoder.addFrame(ctx);
                console.log(`🎬 Frame ${cardIndex + 2}/${totalFrames} - Chia bài lá ${cardIndex + 1}`);
            }
            
            // Frame cuối: Hiển thị tất cả
            ctx.drawImage(table, 0, 0);
            
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('DEALER', centerX, dealerY - 10);
            
            await this.drawHand(ctx, dealerHand, centerX, dealerY);
            
            if (Array.isArray(playerHands[0])) {
                const playersCount = playerHands.length;
                const playerSpacing = Math.min(200, canvasElement.width / (playersCount + 1));
                
                for (let i = 0; i < playersCount; i++) {
                    const playerX = centerX - ((playersCount - 1) * playerSpacing / 2) + (i * playerSpacing);
                    const playerY = centerY + 60;
                    await this.drawHand(ctx, playerHands[i].hand, playerX, playerY);
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial';
                    const displayName = playerHands[i].name.length > 10 ? 
                        playerHands[i].name.substring(0, 10) + '...' : playerHands[i].name;
                    ctx.fillText(displayName, playerX, playerY + this.cardHeight + 20);
                }
            } else {
                const playerY = centerY + 60;
                await this.drawHand(ctx, playerHands, centerX, playerY);
            }
            
            encoder.addFrame(ctx);
            encoder.finish();
            
            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    console.log(`✅ Blackjack GIF hoàn thành: ${outputPath}`);
                    resolve(outputPath);
                });
                stream.on('error', (error) => {
                    console.error('❌ Lỗi tạo blackjack GIF:', error);
                    reject(error);
                });
                
                setTimeout(() => {
                    stream.end();
                }, 100);
            });
            
        } catch (error) {
            console.error('❌ Lỗi tạo blackjack GIF:', error);
            throw error;
        }
    }
}

module.exports = new ImageUtils(); 