#!/bin/bash

# Deploy block system to VPS

echo "📤 Uploading block manager files to VPS..."

# Upload user-block-manager.js
scp -r utils/user-block-manager.js root@84.54.23.85:/root/diamond-bot/utils/

# Upload user-manage.js
scp user-manage.js root@84.54.23.85:/root/diamond-bot/

# Upload updated index.js
scp index.js root@84.54.23.85:/root/diamond-bot/

echo "✅ Upload complete!"
echo ""
echo "Now restart the bot with:"
echo "  ssh root@84.54.23.85 'pm2 restart diamond-bot'"
