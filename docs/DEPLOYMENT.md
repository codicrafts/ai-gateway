# AI Gateway 部署文档

## 1. 环境准备

### 1.1 服务器要求

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 1 核 | 2 核 |
| 内存 | 2 GB | 4 GB |
| 硬盘 | 20 GB | 50 GB |
| 系统 | Ubuntu 20.04+ / CentOS 7+ | Ubuntu 22.04 |
| 带宽 | 1 Mbps | 5 Mbps |

### 1.2 域名和证书

- 准备域名并解析到服务器 IP
- SSL 证书（可用 Let's Encrypt 免费申请）

## 2. Docker 部署（推荐）

### 2.1 安装 Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.2 创建配置文件

```bash
mkdir -p /opt/ai-gateway
cd /opt/ai-gateway
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  one-api:
    image: justsong/one-api:latest
    container_name: one-api
    restart: always
    ports:
      - "3001:3000"
    volumes:
      - ./one-api-data:/data
    environment:
      - TZ=Asia/Shanghai
      # 可选：使用 MySQL
      # - SQL_DSN=root:password@tcp(mysql:3306)/oneapi

  frontend:
    image: node:18-alpine
    container_name: ai-gateway-frontend
    restart: always
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NODE_ENV=production
      - ONE_API_URL=http://one-api:3000
      - ONE_API_KEY=${ONE_API_KEY}
    command: sh -c "npm install --production && npm start"

  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - one-api
      - frontend
```

### 2.3 Nginx 配置

创建 `nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream oneapi {
        server one-api:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # 前端页面
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # One API 接口
        location /v1/ {
            proxy_pass http://oneapi/v1/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering off;  # 流式响应
        }

        # One API 管理后台
        location /admin/ {
            proxy_pass http://oneapi/;
            proxy_set_header Host $host;
        }
    }
}
```

### 2.4 启动服务

```bash
# 创建环境变量文件
echo "ONE_API_KEY=sk-your-token" > .env

# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 3. 手动部署

### 3.1 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm
```

### 3.2 部署 One API

```bash
# 下载
cd /opt
wget https://github.com/songquanpeng/one-api/releases/latest/download/one-api
chmod +x one-api

# 创建 systemd 服务
cat > /etc/systemd/system/one-api.service << EOF
[Unit]
Description=One API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt
ExecStart=/opt/one-api --port 3001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 启动
systemctl enable one-api
systemctl start one-api
```

### 3.3 部署前端

```bash
# 克隆代码
cd /opt
git clone https://github.com/your-repo/ai-gateway.git
cd ai-gateway

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入配置

# 构建
pnpm build

# 创建 systemd 服务
cat > /etc/systemd/system/ai-gateway.service << EOF
[Unit]
Description=AI Gateway Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ai-gateway
ExecStart=/usr/bin/pnpm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 启动
systemctl enable ai-gateway
systemctl start ai-gateway
```

### 3.4 配置 Nginx

```bash
sudo apt install nginx -y

# 配置站点
sudo nano /etc/nginx/sites-available/ai-gateway
# 粘贴上面的 nginx 配置

sudo ln -s /etc/nginx/sites-available/ai-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.5 申请 SSL 证书

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 4. 阿里云部署

### 4.1 购买服务器

- 产品：轻量应用服务器 或 ECS
- 配置：2核4G
- 地域：国内（如需调用海外 API，选香港/新加坡）
- 系统：Ubuntu 22.04

### 4.2 安全组配置

开放端口：
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)

### 4.3 部署步骤

按照上述 Docker 部署或手动部署步骤操作。

## 5. 初始化配置

### 5.1 One API 配置

1. 访问 `https://your-domain.com/admin/`
2. 登录（默认 root/123456）
3. 修改管理员密码
4. 添加渠道（DeepSeek、OpenAI 等）
5. 创建令牌

### 5.2 前端配置

更新 `.env.local`：

```env
ONE_API_URL=http://localhost:3001  # 或内网地址
ONE_API_KEY=sk-xxx                 # One API 令牌
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

## 6. 运维管理

### 6.1 日志查看

```bash
# Docker
docker-compose logs -f one-api
docker-compose logs -f frontend

# Systemd
journalctl -u one-api -f
journalctl -u ai-gateway -f
```

### 6.2 数据备份

```bash
# 备份 One API 数据
cp -r /opt/ai-gateway/one-api-data /backup/one-api-$(date +%Y%m%d)

# 定时备份
crontab -e
0 3 * * * cp -r /opt/ai-gateway/one-api-data /backup/one-api-$(date +\%Y\%m\%d)
```

### 6.3 更新升级

```bash
# 更新 One API
docker-compose pull one-api
docker-compose up -d one-api

# 更新前端
cd /opt/ai-gateway
git pull
pnpm install
pnpm build
systemctl restart ai-gateway
```

## 7. 故障排查

### 7.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 502 Bad Gateway | 后端服务未启动 | 检查服务状态 |
| API 超时 | 网络问题 | 检查服务器能否访问 AI 厂商 |
| 流式响应中断 | Nginx 缓冲 | 添加 `proxy_buffering off` |

### 7.2 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/api/health
curl http://localhost:3001/api/status

# 检查端口
netstat -tlnp | grep -E '3000|3001'
```
