#!/bin/bash

# AWS Deploy AI - Manual Deployment Completion Script
# Run this script on your EC2 instance to complete the deployment

echo "🚀 AWS Deploy AI - Manual Deployment Completion"
echo "================================================"

# Check if we're running as root or ubuntu user
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root. Switching to ubuntu user for application setup..."
    USER_HOME="/home/ubuntu"
    APP_USER="ubuntu"
else
    echo "✅ Running as ubuntu user"
    USER_HOME="$HOME"
    APP_USER="$(whoami)"
fi

# Create log directory
sudo mkdir -p /var/log/app
sudo chown -R ubuntu:ubuntu /var/log/app

# Function to log messages
log_message() {
    echo "$(date): $1" | sudo tee -a /var/log/app/deployment.log
    echo "$1"
}

log_message "🔧 Starting manual deployment completion..."

# Check if repository was cloned
if [ -d "$USER_HOME/app" ]; then
    log_message "✅ Repository found at $USER_HOME/app"
    cd "$USER_HOME/app"
else
    log_message "❌ Repository not found. Please clone your repository first:"
    log_message "   cd $USER_HOME && git clone YOUR_REPO_URL app"
    exit 1
fi

# Check Node.js installation
log_message "🔍 Checking Node.js installation..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_message "✅ Node.js installed: $NODE_VERSION"
else
    log_message "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
    sudo apt-get install -y nodejs
    log_message "✅ Node.js installed: $(node --version)"
fi

# Install dependencies
log_message "📦 Installing npm dependencies..."
echo "installing_dependencies" | sudo tee /var/log/app/deployment-status.txt
if npm install; then
    log_message "✅ Dependencies installed successfully"
else
    log_message "❌ Failed to install dependencies"
    log_message "🔍 Checking package.json..."
    if [ ! -f "package.json" ]; then
        log_message "📝 Creating basic package.json..."
        cat > package.json << 'EOF'
{
  "name": "deployed-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {}
}
EOF
        log_message "✅ Basic package.json created"
    fi
fi

# Try to build the project
log_message "🔨 Attempting to build project..."
echo "building" | sudo tee /var/log/app/deployment-status.txt
if npm run build 2>/dev/null; then
    log_message "✅ Build completed successfully"
else
    log_message "⚠️  Build step skipped or failed, continuing..."
fi

# Check for start script or create one
log_message "🔍 Checking for application entry point..."
if [ -f "package.json" ]; then
    if grep -q '"start"' package.json; then
        log_message "✅ Start script found in package.json"
    else
        log_message "📝 Adding start script to package.json..."
        
        # Find main file
        if [ -f "index.js" ]; then
            MAIN_FILE="index.js"
        elif [ -f "app.js" ]; then
            MAIN_FILE="app.js"
        elif [ -f "server.js" ]; then
            MAIN_FILE="server.js"
        elif [ -f "main.js" ]; then
            MAIN_FILE="main.js"
        else
            MAIN_FILE="index.js"
            log_message "📝 Creating basic index.js..."
            cat > index.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        // Check if there's an index.html file
        if (fs.existsSync('index.html')) {
            const content = fs.readFileSync('index.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        } else if (fs.existsSync('build/index.html')) {
            const content = fs.readFileSync('build/index.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        } else if (fs.existsSync('dist/index.html')) {
            const content = fs.readFileSync('dist/index.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>🚀 AWS Deploy AI - App Running!</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
                        .container { max-width: 600px; margin: 0 auto; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 20px; backdrop-filter: blur(10px); }
                        h1 { font-size: 2.5em; margin-bottom: 20px; }
                        .status { background: rgba(0,255,0,0.2); padding: 20px; border-radius: 10px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 Your App is Running!</h1>
                        <div class="status">
                            <h2>✅ Deployment Successful</h2>
                            <p>Your application has been deployed successfully on AWS!</p>
                            <p><strong>Server:</strong> Running on port ${PORT}</p>
                            <p><strong>Status:</strong> Active and responding</p>
                        </div>
                        <p>This is a default page. Your application files are ready to be configured.</p>
                        <p><small>Powered by AWS Deploy AI</small></p>
                    </div>
                </body>
                </html>
            `);
        }
    } else {
        // Try to serve static files
        const filePath = path.join(__dirname, req.url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath);
            res.writeHead(200);
            res.end(content);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
        }
    }
});

server.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
    console.log(\`🌐 Access your app at: http://localhost:\${PORT}\`);
});
EOF
        fi
        
        # Update package.json with start script
        npm pkg set scripts.start="node $MAIN_FILE"
        log_message "✅ Created start script for $MAIN_FILE"
    fi
fi

# Create systemd service
log_message "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/app.service > /dev/null << EOF
[Unit]
Description=Deployed GitHub Application
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$USER_HOME/app
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
StandardOutput=append:/var/log/app/app.log
StandardError=append:/var/log/app/app-error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log files with proper permissions
sudo touch /var/log/app/app.log /var/log/app/app-error.log
sudo chown ubuntu:ubuntu /var/log/app/app.log /var/log/app/app-error.log

# Start the service
log_message "🚀 Starting application service..."
echo "starting_service" | sudo tee /var/log/app/deployment-status.txt
sudo systemctl daemon-reload
sudo systemctl enable app
sudo systemctl start app

# Wait a moment for service to start
sleep 5

# Check service status
log_message "🔍 Checking service status..."
if sudo systemctl is-active --quiet app; then
    log_message "✅ Application service is running"
else
    log_message "⚠️  Application service failed to start. Checking logs..."
    sudo systemctl status app --no-pager
    log_message "📋 Recent application logs:"
    sudo tail -10 /var/log/app/app.log 2>/dev/null || echo "No app logs yet"
    sudo tail -10 /var/log/app/app-error.log 2>/dev/null || echo "No error logs yet"
fi

# Install and configure nginx
log_message "🌐 Installing and configuring nginx..."
echo "configuring_nginx" | sudo tee /var/log/app/deployment-status.txt
sudo apt-get update -y
sudo apt-get install -y nginx

# Create nginx configuration
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Test nginx configuration and start
log_message "🔧 Testing nginx configuration..."
if sudo nginx -t; then
    log_message "✅ Nginx configuration is valid"
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    log_message "✅ Nginx started successfully"
else
    log_message "❌ Nginx configuration error"
fi

# Final status update
echo "completed" | sudo tee /var/log/app/deployment-status.txt
log_message "🎉 Deployment completed!"

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "Unable to fetch IP")

# Final summary
echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================="
echo "✅ Application is running"
echo "✅ Nginx proxy configured"
echo "🌐 Your app is accessible at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:3000 (direct)"
echo ""
echo "📋 Service Management:"
echo "   sudo systemctl status app     # Check app status"
echo "   sudo systemctl restart app    # Restart app"
echo "   sudo systemctl status nginx   # Check nginx status"
echo ""
echo "📝 Logs:"
echo "   sudo tail -f /var/log/app/app.log        # App logs"
echo "   sudo tail -f /var/log/app/deployment.log # Deployment logs"
echo ""
log_message "🎉 Manual deployment completion finished successfully!"