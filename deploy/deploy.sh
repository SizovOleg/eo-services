#!/bin/bash
# Деплой EO Services на сервер
# Запуск: bash deploy.sh

set -e

DEPLOY_DIR="/var/www/eo-services"

echo "=== Деплой EO Services ==="

# 1. Сборка
echo "1. Сборка проекта..."
npm run build

# 2. Копирование в nginx-директорию
echo "2. Копирование файлов..."
sudo mkdir -p $DEPLOY_DIR
sudo rm -rf $DEPLOY_DIR/*
sudo cp -r dist/* $DEPLOY_DIR/
sudo chown -R www-data:www-data $DEPLOY_DIR

# 3. Nginx конфиг
echo "3. Настройка nginx..."
sudo cp deploy/nginx-eo-services.conf /etc/nginx/sites-available/eo-services
sudo ln -sf /etc/nginx/sites-available/eo-services /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Готово! ==="
echo "Сайт доступен по адресу сервера"
