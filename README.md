# 📋 FAQ Server

Sistema de preguntas frecuentes con panel de administración separado. Las preguntas se guardan en **MySQL**.

---

## 🚀 Instalación y arranque

### Requisitos
- **Node.js** v18 o superior → https://nodejs.org
- **MySQL** 8.0+ en tu laptop (MySQL Workbench, XAMPP, MAMP, Homebrew, etc.)

### Pasos

```bash
# 1. Entra a la carpeta del proyecto
cd faq-server

# 2. Instala las dependencias (solo la primera vez)
npm install

# 3. Configura la URL de MySQL
cp .env.example .env
# Edita .env y pega tu DATABASE_URL (Aiven, local, etc.)

# 4. Inicia el servidor (crea la tabla faqs automáticamente)
npm start
```

El servidor arranca en `http://localhost:3000`

---

## 🔧 Variables de entorno (`.env`)

Copia `.env.example` a `.env` y completa tus datos:

```env
PORT=3000
ADMIN_PASSWORD=admin123

DATABASE_URL=mysql+pymysql://usuario:password@host:puerto/nombre_db?charset=utf8mb4
```

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL completa de conexión MySQL (compatible con Aiven y SQLAlchemy) |

---

## 🌐 URLs

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000/` | Vista pública — lo que ven tus usuarios |
| `http://localhost:3000/admin-panel` | Panel de administración (interno) |

---

## 🔑 Contraseña de admin

La contraseña por defecto es **`admin123`**. Cámbiala en tu archivo `.env`:

```env
ADMIN_PASSWORD=mi_password_seguro
```

---

## 📁 Estructura de archivos

```
faq-server/
├── server.js          ← Servidor principal
├── db.js              ← Conexión y consultas MySQL
├── .env.example       ← Plantilla de credenciales (copiar a .env)
├── frontend-public/   ← Código fuente Vue (vista pública)
│   └── src/           ← Componentes, estilos y lógica
├── public/
│   ├── index.html     ← Build Vue (generado — no editar a mano)
│   ├── assets/        ← JS/CSS del bundle Vue (servidos en /assets/)
│   └── index.html.legacy ← Respaldo HTML vanilla (archivo, no se sirve)
├── scripts/
│   └── schema.sql     ← Script para crear la base de datos
└── admin/
    └── index.html     ← Panel admin (URL /admin-panel)
```

---

## 🗄️ Base de datos

La tabla `faqs` guarda cada pregunta con:
- categoría, orden, pregunta, respuesta
- etiquetas y archivos adjuntos (JSON)
- `created_at` y `updated_at` (fechas visibles para el usuario final)

**Primera vez:** si la tabla está vacía, el servidor inserta 3 preguntas de ejemplo.

**Migración:** si tenías datos en `data/faqs.json`, el servidor los importa automáticamente a MySQL la primera vez que arranca.

---

## 💡 Tips

- **Vista pública Vue:** edita `frontend-public/` y compila con `npm run build:public` (o `npm run build:win` para el .exe)
- El servidor solo sirve `public/index.html` + `public/assets/`; `index.html.legacy` es respaldo y no se usa en runtime
- Los archivos subidos se guardan en `uploads/`
- Para backup de preguntas usa **Exportar JSON** en el panel admin → Configuración
- Si cambias el puerto, edita `PORT` en `.env`
- Si MySQL no conecta, revisa que el servicio esté encendido y que `.env` tenga las credenciales correctas

---

## 🖥️ Acceso desde otras computadoras en la red

1. Averigua la IP local de tu laptop (`ifconfig` en Mac/Linux, `ipconfig` en Windows)
2. Las demás PCs acceden con: `http://192.168.X.X:3000/`
3. El admin lo usas desde tu laptop: `http://localhost:3000/admin-panel`

---

## 🔄 Iniciar automáticamente (macOS/Linux)

```bash
npm install -g pm2
pm2 start server.js --name "faq-server"
pm2 startup
pm2 save
```
