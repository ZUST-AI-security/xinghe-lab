# 星河智安 (XingHe ZhiAn) - Makefile
# 便捷的构建和部署命令

.PHONY: help install build run test clean docker-build docker-up docker-down

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

help: ## 显示帮助信息
	@echo "$(BLUE)星河智安 (XingHe ZhiAn) - AI安全攻击可视化平台$(RESET)"
	@echo ""
	@echo "$(GREEN)可用命令:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## 安装项目依赖
	@echo "$(BLUE)安装后端依赖...$(RESET)"
	cd api && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "$(BLUE)安装前端依赖...$(RESET)"
	cd web && npm install
	@echo "$(GREEN)依赖安装完成!$(RESET)"

build: ## 构建项目
	@echo "$(BLUE)构建前端...$(RESET)"
	cd web && npm run build
	@echo "$(GREEN)构建完成!$(RESET)"

run: ## 运行开发服务器
	@echo "$(BLUE)启动开发服务器...$(RESET)"
	@echo "$(YELLOW)请在不同终端中运行以下命令:$(RESET)"
	@echo "$(GREEN)1. 启动Redis:$(RESET) redis-server"
	@echo "$(GREEN)2. 启动后端:$(RESET) cd api && source venv/bin/activate && uvicorn app.main:app --reload"
	@echo "$(GREEN)3. 启动Celery:$(RESET) cd api && source venv/bin/activate && celery -A app.workers.celery_app worker"
	@echo "$(GREEN)4. 启动前端:$(RESET) cd web && npm start"

test: ## 运行测试
	@echo "$(BLUE)运行后端测试...$(RESET)"
	cd api && python -m pytest tests/ -v
	@echo "$(BLUE)运行前端测试...$(RESET)"
	cd web && npm test -- --coverage --watchAll=false

test-backend: ## 运行后端测试
	@echo "$(BLUE)运行后端测试...$(RESET)"
	cd api && python -m pytest tests/ -v

test-frontend: ## 运行前端测试
	@echo "$(BLUE)运行前端测试...$(RESET)"
	cd web && npm test -- --coverage --watchAll=false

lint: ## 代码检查
	@echo "$(BLUE)检查后端代码...$(RESET)"
	cd api && flake8 app/ --max-line-length=100
	cd api && black --check app/
	cd api && mypy app/
	@echo "$(BLUE)检查前端代码...$(RESET)"
	cd web && npm run lint
	cd web && npm run lint:style

format: ## 格式化代码
	@echo "$(BLUE)格式化后端代码...$(RESET)"
	cd api && black app/
	cd api && isort app/
	@echo "$(BLUE)格式化前端代码...$(RESET)"
	cd web && npm run format

clean: ## 清理临时文件
	@echo "$(BLUE)清理后端文件...$(RESET)"
	cd api && find . -type f -name "*.pyc" -delete
	cd api && find . -type d -name "__pycache__" -delete
	cd api && rm -rf .pytest_cache .coverage htmlcov/
	@echo "$(BLUE)清理前端文件...$(RESET)"
	cd web && rm -rf build node_modules/.cache
	cd web && rm -rf .eslintcache
	@echo "$(GREEN)清理完成!$(RESET)"

docker-build: ## 构建Docker镜像
	@echo "$(BLUE)构建Docker镜像...$(RESET)"
	docker-compose build

docker-up: ## 启动Docker服务
	@echo "$(BLUE)启动Docker服务...$(RESET)"
	docker-compose up -d
	@echo "$(GREEN)服务已启动!$(RESET)"
	@echo "$(YELLOW)前端: http://localhost:3000$(RESET)"
	@echo "$(YELLOW)后端: http://localhost:8000$(RESET)"
	@echo "$(YELLOW)API文档: http://localhost:8000/docs$(RESET)"

docker-down: ## 停止Docker服务
	@echo "$(BLUE)停止Docker服务...$(RESET)"
	docker-compose down

docker-logs: ## 查看Docker日志
	docker-compose logs -f

docker-clean: ## 清理Docker资源
	@echo "$(BLUE)清理Docker资源...$(RESET)"
	docker-compose down -v --rmi all
	docker system prune -f

dev-setup: ## 初始化开发环境
	@echo "$(BLUE)初始化开发环境...$(RESET)"
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
	@if [ ! -f frontend/.env ]; then cp frontend/.env.example frontend/.env; fi
	@echo "$(GREEN)环境配置文件已创建!$(RESET)"
	@echo "$(YELLOW)请根据需要修改 backend/.env 和 frontend/.env 文件$(RESET)"

backup: ## 备份数据
	@echo "$(BLUE)备份数据...$(RESET)"
	mkdir -p backups
	docker-compose exec backend tar czf /app/backups/backup-$(shell date +%Y%m%d-%H%M%S).tar.gz /app/data /app/logs
	@echo "$(GREEN)备份完成!$(RESET)"

restore: ## 恢复数据 (使用: make restore BACKUP=backup-file.tar.gz)
	@if [ -z "$(BACKUP)" ]; then echo "$(RED)请指定备份文件: make restore BACKUP=backup-file.tar.gz$(RESET)"; exit 1; fi
	@echo "$(BLUE)恢复数据...$(RESET)"
	docker-compose exec backend tar xzf /app/data/$(BACKUP) -C /
	@echo "$(GREEN)恢复完成!$(RESET)"

update: ## 更新依赖
	@echo "$(BLUE)更新后端依赖...$(RESET)"
	cd api && source venv/bin/activate && pip install -r requirements.txt --upgrade
	@echo "$(BLUE)更新前端依赖...$(RESET)"
	cd web && npm update
	@echo "$(GREEN)依赖更新完成!$(RESET)"

status: ## 查看服务状态
	@echo "$(BLUE)Docker服务状态:$(RESET)"
	docker-compose ps
	@echo ""
	@echo "$(BLUE)系统资源使用:$(RESET)"
	docker stats --no-stream
