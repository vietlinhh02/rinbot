#!/usr/bin/env node

/**
 * RinBot Deploy Manager
 * Quản lý việc deploy và restart bot một cách an toàn
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeployManager {
    constructor() {
        this.botProcess = null;
        this.isRestarting = false;
        this.restartCount = 0;
        this.maxRestarts = 5;
        this.restartWindow = 60000; // 1 phút
        this.restartTimes = [];
        
        console.log('🚀 RinBot Deploy Manager Started');
        this.startBot();
        
        // Graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    startBot() {
        if (this.botProcess) {
            console.log('⚠️ Bot is already running');
            return;
        }

        console.log('🤖 Starting RinBot...');
        
        this.botProcess = spawn('node', ['index.js'], {
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        this.botProcess.on('close', (code) => {
            console.log(`🔴 Bot stopped with code: ${code}`);
            this.botProcess = null;
            
            if (!this.isRestarting && code !== 0) {
                this.handleCrash();
            }
        });

        this.botProcess.on('error', (error) => {
            console.error('❌ Error starting bot:', error);
            this.botProcess = null;
            
            if (!this.isRestarting) {
                this.handleCrash();
            }
        });
    }

    handleCrash() {
        const now = Date.now();
        this.restartTimes = this.restartTimes.filter(time => now - time < this.restartWindow);
        
        if (this.restartTimes.length >= this.maxRestarts) {
            console.error('💀 Too many restarts, stopping deploy manager');
            process.exit(1);
        }
        
        this.restartTimes.push(now);
        
        console.log(`🔄 Auto-restarting bot (${this.restartTimes.length}/${this.maxRestarts})...`);
        setTimeout(() => this.startBot(), 5000); // Đợi 5 giây trước khi restart
    }

    async restart() {
        if (this.isRestarting) {
            console.log('⚠️ Already restarting...');
            return;
        }

        console.log('🔄 Restarting bot...');
        this.isRestarting = true;

        if (this.botProcess) {
            console.log('🛑 Stopping current bot process...');
            this.botProcess.kill('SIGTERM');
            
            // Đợi process dừng hoặc force kill sau 10 giây
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.botProcess) {
                        console.log('⚡ Force killing bot process...');
                        this.botProcess.kill('SIGKILL');
                    }
                    resolve();
                }, 10000);

                if (this.botProcess) {
                    this.botProcess.on('close', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                }
            });
        }

        console.log('⏳ Waiting before restart...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.isRestarting = false;
        this.startBot();
    }

    async shutdown() {
        console.log('🛑 Shutting down Deploy Manager...');
        
        if (this.botProcess) {
            console.log('🔴 Stopping bot...');
            this.botProcess.kill('SIGTERM');
            
            // Đợi 10 giây rồi force kill
            setTimeout(() => {
                if (this.botProcess) {
                    console.log('⚡ Force killing bot...');
                    this.botProcess.kill('SIGKILL');
                }
            }, 10000);
        }
        
        console.log('👋 Deploy Manager stopped');
        process.exit(0);
    }

    getStatus() {
        return {
            running: !!this.botProcess,
            pid: this.botProcess?.pid,
            restartCount: this.restartTimes.length,
            isRestarting: this.isRestarting
        };
    }
}

// Khởi động Deploy Manager
const manager = new DeployManager();

// Export cho external control
module.exports = manager; 