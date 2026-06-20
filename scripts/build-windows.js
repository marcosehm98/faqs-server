#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'faq-server-windows');
const EXE = path.join(OUT, 'faq-server.exe');

const ENV_TEMPLATE = `PORT=3010
BASE_PATH=/faqs-logihub
ADMIN_EMAIL=admin@faq.local
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrador
DATABASE_URL=mysql+pymysql://usuario:password@host:3306/faq_db?charset=utf8mb4
# Si el .exe no resuelve DNS en Windows, descomenta y usa la IP de Aiven:
# DB_HOST_IP=164.90.145.105
`;

const LEEME = `FAQ SERVER - Windows
====================

ESTRUCTURA (mantener junta)
---------------------------
  faq-server.exe     Servidor
  public/            Vista publica (obligatorio)
  admin/             Panel admin (obligatorio)
  .env               Configuracion (crear desde .env.example)
  uploads/           Imagenes y GIFs adjuntos (misma carpeta que el .exe)
  data/              Datos locales (se crea solo)

INICIO
------
1. Copia toda esta carpeta a Windows
2. Copia .env.example a .env y pega tu DATABASE_URL
3. Doble clic en INICIAR.bat o faq-server.exe

URLS LOCALES
------------
  http://localhost:3010/faqs-logihub/
  http://localhost:3010/faqs-logihub/admin-panel

URL PUBLICA (con nginx en puerto 8060)
--------------------------------------
  http://TU-SERVIDOR:8060/faqs-logihub/

IMAGENES
--------
  Los archivos subidos se guardan en uploads/ junto al .exe.
  No muevas el .exe sin la carpeta uploads/.
`;

const INICIAR_BAT = `@echo off
chcp 65001 >nul
title FAQ Server - LogiHub
cd /d "%~dp0"

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo.
  echo  Edita .env con tu DATABASE_URL
  notepad ".env"
  echo.
)

if not exist "uploads" mkdir uploads
if not exist "data" mkdir data

set NODE_OPTIONS=--dns-result-order=ipv4first

echo.
echo  FAQ Server - LogiHub
echo  Publico: http://localhost:3010/faqs-logihub/
echo  Admin:   http://localhost:3010/faqs-logihub/admin-panel
echo  Imagenes: %~dp0uploads
echo.

faq-server.exe
pause
`;

const NGINX_SNIPPET = `# === FAQ LogiHub — dentro del server { listen 8060; ... } ===

location = /faqs-logihub {
    return 301 /faqs-logihub/;
}

location /faqs-logihub/ {
    proxy_pass http://127.0.0.1:3010/faqs-logihub/;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Prefix /faqs-logihub;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    proxy_connect_timeout 600s;
    proxy_send_timeout    600s;
    proxy_read_timeout    600s;
    client_max_body_size 50M;
}

# Rescate: si el navegador pide /api/* sin prefijo (HTML en cache)
location ~ ^/api/(site-config|faqs|suggestions|admin) {
    proxy_pass http://127.0.0.1:3010/faqs-logihub$request_uri;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 600s;
    proxy_send_timeout    600s;
    proxy_read_timeout    600s;
    client_max_body_size 50M;
}
`;

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '.gitkeep') continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('\n  📦  Construyendo faq-server.exe para Windows...\n');

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });

const pkgBin = path.join(ROOT, 'node_modules', '.bin', 'pkg');
const pkgCmd = fs.existsSync(pkgBin) ? `"${pkgBin}"` : 'npx --yes @yao-pkg/pkg@6.6.0';

execSync(
  `${pkgCmd} . --targets node18-win-x64 --output "${EXE}" --compress GZip`,
  { stdio: 'inherit', cwd: ROOT, env: { ...process.env, PKG_CACHE_PATH: path.join(ROOT, '.pkg-cache') } }
);

if (!fs.existsSync(EXE)) {
  console.error('\n  ❌  No se generó faq-server.exe\n');
  process.exit(1);
}

copyDir(path.join(ROOT, 'public'), path.join(OUT, 'public'));
copyDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
copyDir(path.join(ROOT, 'uploads'), path.join(OUT, 'uploads'));

fs.writeFileSync(path.join(OUT, '.env.example'), ENV_TEMPLATE);
fs.writeFileSync(path.join(OUT, 'LEEME.txt'), LEEME);
fs.writeFileSync(path.join(OUT, 'INICIAR.bat'), INICIAR_BAT);
fs.writeFileSync(path.join(OUT, 'nginx-faqs-logihub.conf'), NGINX_SNIPPET);

const sizeMb = (fs.statSync(EXE).size / 1024 / 1024).toFixed(1);
console.log(`\n  ✅  Listo: dist/faq-server-windows/`);
console.log(`  📎  faq-server.exe (${sizeMb} MB)`);
console.log('  📁  public/, admin/ y uploads/ junto al ejecutable');
console.log('  📄  nginx-faqs-logihub.conf para tu nginx\n');
