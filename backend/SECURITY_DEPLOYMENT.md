# 星河智安 - 安全部署指南

## 生产环境安全配置清单

### 1. 必须修改的配置项

在部署到生产环境前，**必须**修改以下配置：

```bash
# 生成强密钥
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 2. 环境变量配置

创建 `.env.production` 文件：

```bash
# 应用配置
DEBUG=False
SECRET_KEY=<生成的强密钥>
JWT_SECRET_KEY=<生成的强密钥>

# 数据库配置（推荐使用PostgreSQL）
DATABASE_URL=postgresql+psycopg://user:strong_password@localhost:5432/xinghe_zhi_an

# Redis配置（必须设置密码）
REDIS_URL=redis://:strong_redis_password@localhost:6379/0
CELERY_BROKER_URL=redis://:strong_redis_password@localhost:6379/0
CELERY_RESULT_BACKEND=redis://:strong_redis_password@localhost:6379/0

# CORS配置（限制为实际域名）
CORS_ORIGINS=["https://yourdomain.com"]

# JWT配置（缩短有效期）
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=3
```

### 3. 数据库安全

#### 推荐使用PostgreSQL

```bash
# 安装PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres psql
CREATE DATABASE xinghe_zhi_an;
CREATE USER xinghe_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE xinghe_zhi_an TO xinghe_user;
```

#### SQLite安全配置（如果必须使用）

```bash
# 设置文件权限
chmod 600 xinghe_zhi_an.db
chown app_user:app_user xinghe_zhi_an.db
```

### 4. Redis安全配置

```bash
# 编辑redis.conf
requirepass strong_redis_password
bind 127.0.0.1
protected-mode yes

# 重启Redis
sudo systemctl restart redis
```

### 5. HTTPS配置

#### 使用Nginx反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 80/tcp    # HTTP (重定向到HTTPS)
sudo ufw deny 8000/tcp   # 后端端口不对外开放
sudo ufw enable
```

### 7. 文件权限

```bash
# 设置正确的文件权限
chmod 600 .env
chmod 700 logs/
chmod 755 outputs/
```

### 8. 日志监控

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/xinghe_zhi_an

/path/to/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 9. 定期安全检查

```bash
# 检查依赖漏洞
pip-audit

# 更新依赖
pip install --upgrade -r requirements.txt

# 检查配置
python -c "from app.core.config import settings; print('DEBUG:', settings.debug)"
```

### 10. 备份策略

```bash
# 数据库备份
pg_dump xinghe_zhi_an > backup_$(date +%Y%m%d).sql

# 定时备份
crontab -e
0 2 * * * pg_dump xinghe_zhi_an > /backup/xinghe_zhi_an_$(date +\%Y\%m\%d).sql
```

## 安全最佳实践

1. **定期更新**：保持系统和依赖包最新
2. **最小权限原则**：只给用户必要的权限
3. **监控日志**：定期检查异常登录和错误日志
4. **备份测试**：定期测试备份恢复
5. **渗透测试**：定期进行安全测试
6. **应急响应**：制定安全事件响应计划

## 联系方式

如有安全问题，请联系：
- 邮箱：security@xinghe-lab.com
- GitHub Issues：https://github.com/ZUST-AI-security/xinghe-lab/issues
