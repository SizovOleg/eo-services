# DEPLOY.md — Инструкции по разработке и деплою EO Services

## Критические правила

### ⚠️ НИКОГДА не билдить в директории деплоя
```
НЕПРАВИЛЬНО:  cd /var/www/eo-services && npx vite build && cp -r dist/* ./
ПРАВИЛЬНО:    cd /home/user/eo-services && npx vite build
              rm -rf /var/www/eo-services/assets && cp -r dist/* /var/www/eo-services/
```
**Почему:** Vite сканирует всю директорию проекта. Если старые бандлы лежат рядом с исходниками, они попадают в новый билд — возникает бесконечный цикл мусора.

### ⚠️ ВСЕГДА чистить assets перед копированием
```bash
rm -rf /var/www/eo-services/assets
cp -r dist/* /var/www/eo-services/
```
**Почему:** Vite генерирует файлы с хэшами в имени (`index-Ab12Cd.js`). Без очистки старые бандлы накапливаются, браузер может загрузить устаревший файл.

### ⚠️ ВСЕГДА проверять билд, а не исходники
```bash
# После сборки — проверяем результат
grep -o 'basename:"/[^"]*"' dist/assets/index-*.js
```
**Почему:** Исходники могут быть правильными, а билд — нет (из-за кэша Vite, мусора в директории, старых node_modules).

---

## Структура директорий на сервере

```
/home/user/eo-services/     ← ИСХОДНИКИ + СБОРКА (рабочая директория)
├── src/
├── backend/
├── public/
├── node_modules/
├── dist/                   ← результат vite build
├── package.json
└── vite.config.js

/var/www/eo-services/       ← ДЕПЛОЙ (nginx root, только статика)
├── index.html
├── assets/
├── earth_texture.jpg
├── textures/
└── vite.svg

/opt/eo-services-api/       ← BACKEND (FastAPI)
├── main.py
├── .env
└── venv/
```

---

## Два режима работы

Проект может работать по двум адресам. Конфигурация отличается:

| Параметр | По IP (подпуть) | По домену (корень) |
|---|---|---|
| URL | `http://IP/eo_services/` | `https://earthfrom.space/` |
| `vite.config.js` → `base` | `'/eo_services/'` | `'/'` |
| `main.jsx` → `basename` | `"/eo_services"` | убрать / оставить пустым |
| API пути в OrbitHistory | `/eo_services/api/...` | `/api/...` |
| Nginx | `location /eo_services/ { alias ... }` | `root /var/www/eo-services;` |

### Переключение между режимами

**На домен (корень):**
```bash
# vite.config.js
sed -i "s|base: '/eo_services/'|base: '/'|" vite.config.js

# main.jsx — убрать basename
sed -i 's|basename="/eo_services"||' src/main.jsx

# API пути в OrbitHistory (если используется)
sed -i 's|/eo_services/api/|/api/|g' src/pages/OrbitHistory.jsx
```

**Обратно на подпуть:**
```bash
sed -i "s|base: '/'|base: '/eo_services/'|" vite.config.js
sed -i 's|<BrowserRouter>|<BrowserRouter basename="/eo_services">|' src/main.jsx
sed -i 's|/api/spacetrack|/eo_services/api/spacetrack|g' src/pages/OrbitHistory.jsx
```

---

## Деплой: пошаговая инструкция

### 1. Сборка (на сервере или локально)

```bash
cd /home/user/eo-services

# Убедиться что конфиг соответствует целевому режиму
cat vite.config.js        # проверить base
cat src/main.jsx          # проверить basename

# Очистить кэш и собрать
rm -rf dist node_modules/.vite
npx vite build

# Проверить билд
grep -o 'basename:"/[^"]*"' dist/assets/index-*.js   # должно соответствовать режиму
cat dist/index.html                                    # пути к assets корректны
```

### 2. Копирование на nginx

```bash
rm -rf /var/www/eo-services/assets
cp -r dist/* /var/www/eo-services/
```

### 3. Проверка

```bash
# Файлы на месте
ls -la /var/www/eo-services/assets/index-*.js

# Nginx конфиг валиден
nginx -t && systemctl reload nginx

# Контент отдаётся
curl -s http://127.0.0.1/ | head -5        # для домена
curl -s http://127.0.0.1/eo_services/ | head -5  # для подпути
```

---

## Nginx конфигурации

### Домен (earthfrom.space)
Файл: `/etc/nginx/sites-available/earthfrom.space`

```nginx
server {
    listen 443 ssl;
    server_name earthfrom.space www.earthfrom.space;

    root /var/www/eo-services;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API прокси (для OrbitHistory)
    location /api/ {
        proxy_pass http://127.0.0.1:8083/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    ssl_certificate /etc/letsencrypt/live/earthfrom.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/earthfrom.space/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name earthfrom.space www.earthfrom.space;
    return 301 https://$host$request_uri;
}
```

### Подпуть (по IP)
Добавить в существующий `server {}` блок:

```nginx
# API (ПЕРЕД location /eo_services/)
location /eo_services/api/ {
    proxy_pass http://127.0.0.1:8083/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 30;
}

# Статика
location /eo_services/ {
    alias /var/www/eo-services/;
    index index.html;
    try_files $uri $uri/ /eo_services/index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

---

## Backend (FastAPI)

### Установка

```bash
mkdir -p /opt/eo-services-api
cp backend/main.py /opt/eo-services-api/
cd /opt/eo-services-api

python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx python-dotenv

# Credentials
cat > .env << 'EOF'
SPACETRACK_USER=your_login
SPACETRACK_PASS=your_password
EOF
chmod 600 .env
```

### Systemd сервис

```bash
cat > /etc/systemd/system/eo-api.service << 'EOF'
[Unit]
Description=EO Services API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/eo-services-api
ExecStart=/opt/eo-services-api/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8083
Restart=always
RestartSec=5
EnvironmentFile=/opt/eo-services-api/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable eo-api
systemctl start eo-api
systemctl status eo-api
```

---

## DNS + SSL

### Порядок действий при привязке домена

1. **Настроить A-записи** у регистратора:
   ```
   @    → IP_сервера
   www  → IP_сервера
   ```

2. **Проверить пропагацию** через NS регистратора (не ждать глобальный кэш):
   ```bash
   dig earthfrom.space @ns1.reg.ru +short   # должен показать IP сервера
   ```

3. **Создать nginx конфиг** до SSL (слушать 80):
   ```bash
   # Минимальный конфиг для certbot
   server {
       listen 80;
       server_name earthfrom.space www.earthfrom.space;
       root /var/www/eo-services;
   }
   ```

4. **Получить SSL** (только когда dig показывает правильный IP):
   ```bash
   certbot --nginx -d earthfrom.space -d www.earthfrom.space
   ```

5. **Проверить:**
   ```bash
   openssl s_client -connect 127.0.0.1:443 -servername earthfrom.space </dev/null 2>&1 | head -5
   curl -sI https://earthfrom.space/
   ```

### Типичные проблемы DNS
- `dig domain +short` показывает старый IP → DNS ещё не обновился глобально
- `dig domain @ns1.reg.ru +short` показывает правильный IP → на стороне регистратора всё ОК, просто кэш
- certbot `Failed to resolve` → DNS не дошёл до серверов Let's Encrypt, подождать 10-30 минут

---

## Git workflow

### Первичная настройка

```bash
cd /home/user/eo-services
git init
echo -e "node_modules/\ndist/\n.env\n*.bak" > .gitignore
git add -A
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USER/eo-services.git
git push -u origin main
```

### После изменений

```bash
cd /home/user/eo-services
# ... внести правки ...
npx vite build                                    # собрать
grep -o 'basename:"/[^"]*"' dist/assets/index-*.js  # проверить
rm -rf /var/www/eo-services/assets
cp -r dist/* /var/www/eo-services/                 # задеплоить
git add -A && git commit -m "описание" && git push # запушить
```

---

## Быстрый деплой (скрипт)

Файл: `/home/user/eo-services/deploy.sh`

```bash
#!/bin/bash
set -e

PROJECT_DIR="/home/user/eo-services"
DEPLOY_DIR="/var/www/eo-services"

cd "$PROJECT_DIR"

echo "1. Очистка кэша..."
rm -rf dist node_modules/.vite

echo "2. Сборка..."
npx vite build

echo "3. Проверка билда..."
if grep -q 'basename:"/eo_services"' dist/assets/index-*.js 2>/dev/null; then
    echo "ОШИБКА: в билде остался basename /eo_services"
    exit 1
fi

echo "4. Деплой..."
rm -rf "$DEPLOY_DIR/assets"
cp -r dist/* "$DEPLOY_DIR/"

echo "5. Reload nginx..."
nginx -t && systemctl reload nginx

echo "✅ Деплой завершён"
echo "Проверь: https://earthfrom.space"
```

```bash
chmod +x deploy.sh
```

---

## Чеклист перед деплоем

- [ ] `vite.config.js` → `base` соответствует режиму
- [ ] `src/main.jsx` → `basename` соответствует режиму
- [ ] `src/pages/OrbitHistory.jsx` → API пути соответствуют режиму
- [ ] Сборка из рабочей директории (НЕ из `/var/www/`)
- [ ] `dist/assets/` очищен перед копированием
- [ ] `grep` по билду подтверждает корректность
- [ ] `nginx -t` проходит
- [ ] Проверка в инкогнито-режиме браузера
