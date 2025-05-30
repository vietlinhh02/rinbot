#!/bin/bash

# ==============================================
# 🔐 RINBOT PRIVATE REPOSITORY SETUP
# ==============================================

echo "🤖 RinBot Private Repository Setup"
echo "=================================="

# Kiểm tra Git
if ! command -v git &> /dev/null; then
    echo "❌ Git chưa được cài đặt!"
    exit 1
fi

echo "📁 Current repository info:"
git remote -v

echo ""
echo "🔧 Setup options:"
echo "1. Setup với GitHub Personal Access Token (HTTPS)"
echo "2. Setup với SSH Key" 
echo "3. Kiểm tra authentication hiện tại"
echo "4. Thoát"

read -p "Chọn option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔑 Setup GitHub Personal Access Token"
        echo "------------------------------------"
        echo "1. Vào: https://github.com/settings/tokens"
        echo "2. Generate new token (classic)"
        echo "3. Chọn quyền 'repo' (full repository access)"
        echo "4. Copy token"
        echo ""
        
        read -p "Nhập GitHub username: " github_user
        read -s -p "Nhập GitHub token: " github_token
        echo ""
        
        # Get current repo info
        current_url=$(git config --get remote.origin.url)
        
        if [[ $current_url == *"github.com"* ]]; then
            # Extract repo path
            repo_path=$(echo $current_url | sed 's/.*github\.com[/:]//' | sed 's/\.git$//')
            new_url="https://${github_user}:${github_token}@github.com/${repo_path}.git"
            
            git remote set-url origin "$new_url"
            echo "✅ Đã cấu hình remote URL với token"
            
            # Test authentication
            echo "🧪 Testing authentication..."
            if git ls-remote origin > /dev/null 2>&1; then
                echo "✅ Authentication thành công!"
                
                # Update .env file
                if [ -f ".env" ]; then
                    # Backup .env
                    cp .env .env.backup
                    
                    # Update or add GITHUB_TOKEN
                    if grep -q "GITHUB_TOKEN=" .env; then
                        sed -i "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${github_token}/" .env
                    else
                        echo "GITHUB_TOKEN=${github_token}" >> .env
                    fi
                    
                    # Update or add GITHUB_USERNAME
                    if grep -q "GITHUB_USERNAME=" .env; then
                        sed -i "s/GITHUB_USERNAME=.*/GITHUB_USERNAME=${github_user}/" .env
                    else
                        echo "GITHUB_USERNAME=${github_user}" >> .env
                    fi
                    
                    echo "✅ Đã cập nhật file .env"
                else
                    echo "⚠️ File .env không tồn tại. Tạo từ env.example"
                fi
            else
                echo "❌ Authentication thất bại! Kiểm tra token và quyền."
            fi
        else
            echo "❌ Repository URL không phải GitHub"
        fi
        ;;
        
    2)
        echo ""
        echo "🔑 Setup SSH Key"
        echo "---------------"
        echo "1. Tạo SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
        echo "2. Add key to agent: ssh-add ~/.ssh/id_ed25519"
        echo "3. Copy public key: cat ~/.ssh/id_ed25519.pub"
        echo "4. Add to GitHub: https://github.com/settings/keys"
        echo ""
        
        read -p "Nhập GitHub username: " github_user
        repo_name=$(basename $(git config --get remote.origin.url) .git)
        
        ssh_url="git@github.com:${github_user}/${repo_name}.git"
        git remote set-url origin "$ssh_url"
        
        echo "✅ Đã set remote URL: $ssh_url"
        
        # Test SSH
        echo "🧪 Testing SSH connection..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo "✅ SSH authentication thành công!"
        else
            echo "❌ SSH authentication thất bại! Kiểm tra SSH key setup."
        fi
        ;;
        
    3)
        echo ""
        echo "🔍 Kiểm tra authentication hiện tại"
        echo "----------------------------------"
        
        current_url=$(git config --get remote.origin.url)
        echo "Remote URL: $current_url"
        
        echo "🧪 Testing git access..."
        if git ls-remote origin > /dev/null 2>&1; then
            echo "✅ Git access OK!"
            
            echo "🧪 Testing pull..."
            if git pull --dry-run origin main > /dev/null 2>&1; then
                echo "✅ Pull access OK!"
            elif git pull --dry-run origin master > /dev/null 2>&1; then
                echo "✅ Pull access OK! (master branch)"
            else
                echo "❌ Pull access thất bại!"
            fi
        else
            echo "❌ Git access thất bại!"
        fi
        ;;
        
    4)
        echo "👋 Thoát setup"
        exit 0
        ;;
        
    *)
        echo "❌ Option không hợp lệ"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup hoàn tất! Giờ có thể sử dụng lệnh ,update trong Discord."
echo "📝 Nhớ restart bot để áp dụng cấu hình mới." 