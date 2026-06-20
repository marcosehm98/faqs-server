const paths = require('./paths');
paths.ensureRuntimeDirs();
const envCreated = paths.ensureEnvFile();
require('dotenv').config({ path: paths.envPath() });

const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const db      = require('./db');
const auth    = require('./auth');
const { FONT_OPTIONS } = require('./site-config');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CONFIG ──────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@faq.local';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Administrador';
const UPLOADS_DIR    = paths.uploadsDir();
const LEGACY_JSON    = path.join(paths.dataDir(), 'faqs.json');
const ROOT_DIR       = paths.rootDir();
const BASE_PATH      = (process.env.BASE_PATH || '').replace(/\/$/, '');

function publicUrl(p) {
  if (!p || p.startsWith('http')) return p;
  const rel = p.startsWith('/') ? p : `/${p}`;
  if (BASE_PATH && rel.startsWith(`${BASE_PATH}/`)) return rel;
  return BASE_PATH ? `${BASE_PATH}${rel}` : rel;
}

function stripPublicUrl(p) {
  if (!p || !BASE_PATH) return p;
  if (p.startsWith(`${BASE_PATH}/`)) return p.slice(BASE_PATH.length);
  return p;
}

function mapAttachment(a) {
  if (!a) return a;
  return { ...a, url: publicUrl(a.url) };
}

function mapFaqPublic(faq) {
  if (!faq) return faq;
  return {
    ...faq,
    attachments: (faq.attachments || []).map(mapAttachment)
  };
}

function mapSitePublic(settings) {
  if (!settings) return settings;
  return {
    ...settings,
    basePath: BASE_PATH,
    logoUrl: settings.logoUrl ? publicUrl(settings.logoUrl) : null
  };
}

function sendHtmlWithBase(filePath, res) {
  if (!fs.existsSync(filePath)) {
    return res.status(500).send(
      'No se encontró el archivo HTML. Asegúrate de tener las carpetas public/ y admin/ junto al ejecutable.'
    );
  }
  let html = fs.readFileSync(filePath, 'utf8');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(html);
}

const SEED_DATA = [
  {
    category: 'General', order: 1,
    question: '¿Cómo puedo contactar al soporte?',
    answer: 'Puedes contactarnos por correo a soporte@tuempresa.com o por WhatsApp al +52 55 1234-5678, de lunes a viernes de 9:00 a 18:00 hrs.',
    tags: ['contacto', 'soporte'], attachments: []
  },
  {
    category: 'Pagos', order: 1,
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, AmEx), transferencia bancaria, PayPal y efectivo en tiendas de conveniencia (OXXO, 7-Eleven).',
    tags: ['pago', 'tarjeta'], attachments: []
  },
  {
    category: 'Envíos', order: 1,
    question: '¿Cuánto tarda en llegar mi pedido?',
    answer: 'Ciudad de México: 1-2 días hábiles. Interior de la República: 3-5 días. Zonas extendidas: 5-7 días. Procesamos envíos de lunes a viernes.',
    tags: ['envío', 'entrega'], attachments: []
  }
];

// ── MIDDLEWARE ───────────────────────────────────────────
const router = express.Router();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
router.use('/uploads', express.static(UPLOADS_DIR));

router.get('/favicon.ico', (req, res) => {
  const file = paths.assetPath('public', 'favicon.ico');
  if (!fs.existsSync(file)) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=86400');
  res.type('ico').sendFile(file);
});

router.get('/logo-logihub.svg', (req, res) => {
  const file = paths.assetPath('public', 'logo-logihub.svg');
  if (!fs.existsSync(file)) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=86400');
  res.type('svg').sendFile(file);
});

// ── MULTER ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext    = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv/;
    const ext     = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext));
  }
});

// ── HELPERS ──────────────────────────────────────────────
function getLastUpdatedAt(faq) {
  return faq.updatedAt || faq.createdAt || 0;
}

function getSiteLastUpdated(faqs) {
  if (!faqs.length) return null;
  return Math.max(...faqs.map(getLastUpdatedAt));
}

const ALLOWED_PAGE_SIZES = [25, 50, 75, 100];

function parsePagination(query) {
  const limit = ALLOWED_PAGE_SIZES.includes(parseInt(query.limit, 10))
    ? parseInt(query.limit, 10)
    : 25;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const search = (query.q || query.search || '').trim();
  const category = (query.category || 'all').trim();
  const openId = parseInt(query.openId, 10) || null;
  return { page, limit, search, category, openId };
}

async function importLegacyJsonIfNeeded() {
  if (!fs.existsSync(LEGACY_JSON)) return false;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));
    if (!Array.isArray(legacy) || !legacy.length) return false;
    for (const item of legacy) {
      await db.createFAQ({
        question: item.question,
        answer: item.answer,
        category: item.category,
        tags: item.tags,
        order: item.order,
        attachments: item.attachments || []
      });
    }
    const backup = LEGACY_JSON + '.migrated-' + Date.now();
    fs.renameSync(LEGACY_JSON, backup);
    console.log(`  📦  Datos migrados desde faqs.json → ${path.basename(backup)}`);
    return true;
  } catch (e) {
    console.warn('  ⚠️  No se pudo migrar faqs.json:', e.message);
    return false;
  }
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const user = token ? auth.verifyToken(token) : null;
  if (!user) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  req.adminUser = user;
  next();
}

// ── RUTAS PÚBLICAS ────────────────────────────────────────
router.get('/', (req, res) => {
  sendHtmlWithBase(paths.assetPath('public', 'index.html'), res);
});

router.get('/api/site-config', async (req, res) => {
  try {
    const settings = await db.getSiteSettings();
    res.json(mapSitePublic(settings));
  } catch (e) {
    console.error('Error GET /api/site-config:', e.message);
    res.status(500).json({ error: 'Error al cargar la configuración' });
  }
});

router.post('/api/suggestions', async (req, res) => {
  try {
    const { suggestion, name, email } = req.body;
    const text = (suggestion || '').trim();
    if (!text || text.length < 10) {
      return res.status(400).json({ error: 'Escribe una pregunta de al menos 10 caracteres' });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: 'La sugerencia es demasiado larga (máx. 500 caracteres)' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email no válido' });
    }
    const entry = await db.createSuggestion({ suggestion: text, name, email });
    res.json({ ok: true, message: '¡Gracias! Recibimos tu sugerencia.' });
  } catch (e) {
    console.error('Error POST /api/suggestions:', e.message);
    res.status(500).json({ error: 'No se pudo enviar la sugerencia' });
  }
});

router.get('/api/faqs', async (req, res) => {
  try {
    const { page, limit, search, category, openId } = parsePagination(req.query);
    let targetPage = page;

    if (openId) {
      const pageForId = await db.getPageForFAQId(openId, limit, {
        includeAnnulled: false,
        category: category !== 'all' ? category : undefined,
        search: search || undefined
      });
      if (pageForId) targetPage = pageForId;
    }

    const result = await db.getFAQsPaginated({
      page: targetPage,
      limit,
      includeAnnulled: false,
      category: category !== 'all' ? category : undefined,
      search: search || undefined
    });
    const categories = await db.getCategoryCounts(false);
    const categoryTree = await db.getCategoryTreeWithCounts(false);
    const stats = await db.getFAQStats();

    res.json({
      faqs: result.faqs.map(mapFaqPublic),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        lastUpdatedAt: stats.lastUpdatedAt,
        categories,
        categoryTree: categoryTree.tree,
        openId: openId || null,
        basePath: BASE_PATH
      }
    });
  } catch (e) {
    console.error('Error GET /api/faqs:', e.message);
    res.status(500).json({ error: 'Error al cargar las preguntas' });
  }
});

// ── RUTAS ADMIN ───────────────────────────────────────────
router.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    const user = await db.verifyUserLogin(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = auth.createToken(user);
    res.json({ ok: true, token, user });
  } catch (e) {
    console.error('Error POST /api/admin/login:', e.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (e) {
    console.error('Error GET /api/admin/users:', e.message);
    res.status(500).json({ error: 'Error al cargar usuarios' });
  }
});

router.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const user = await db.createUser({ email, password, name, role });
    res.json(user);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }
    console.error('Error POST /api/admin/users:', e.message);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

router.get('/api/admin/site-config', requireAdmin, async (req, res) => {
  try {
    const settings = await db.getSiteSettings();
    res.json({ ...mapSitePublic(settings), fonts: FONT_OPTIONS });
  } catch (e) {
    console.error('Error GET /api/admin/site-config:', e.message);
    res.status(500).json({ error: 'Error al cargar la configuración' });
  }
});

router.put('/api/admin/site-config', requireAdmin, async (req, res) => {
  try {
    const { brandName, logoUrl, fontFamily } = req.body;
    if (fontFamily && !FONT_OPTIONS[fontFamily]) {
      return res.status(400).json({ error: 'Tipografía no válida' });
    }
    const settings = await db.updateSiteSettings({
      brandName,
      logoUrl: stripPublicUrl(logoUrl),
      fontFamily
    });
    res.json(mapSitePublic(settings));
  } catch (e) {
    console.error('Error PUT /api/admin/site-config:', e.message);
    res.status(500).json({ error: 'Error al guardar la configuración' });
  }
});

router.get('/api/admin/suggestions', requireAdmin, async (req, res) => {
  try {
    const suggestions = await db.getAllSuggestions();
    const pending = await db.countPendingSuggestions();
    res.json({ suggestions, pending });
  } catch (e) {
    console.error('Error GET /api/admin/suggestions:', e.message);
    res.status(500).json({ error: 'Error al cargar sugerencias' });
  }
});

router.patch('/api/admin/suggestions/:id/reviewed', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await db.markSuggestionReviewed(id);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  } catch (e) {
    console.error('Error PATCH suggestion:', e.message);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.get('/api/admin/faqs', requireAdmin, async (req, res) => {
  try {
    if (req.query.all === '1') {
      const faqs = await db.getAllFAQs(true);
      return res.json({ faqs });
    }

    const { page, limit, search, category } = parsePagination(req.query);
    const result = await db.getFAQsPaginated({
      page,
      limit,
      includeAnnulled: true,
      category: category !== 'all' ? category : undefined,
      search: search || undefined
    });
    const stats = await db.getFAQStats();
    const categoryList = await db.getCategoryCounts(true);
    const categoryTree = await db.getCategoryTreeWithCounts(true);
    const allCategories = await db.getAllCategories();

    res.json({
      faqs: result.faqs,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        lastUpdatedAt: stats.lastUpdatedAt,
        active: stats.active,
        annulled: stats.annulled,
        categories: stats.categories,
        attachments: stats.attachments,
        categoryList,
        categoryTree: categoryTree.tree,
        allCategories
      }
    });
  } catch (e) {
    console.error('Error GET /api/admin/faqs:', e.message);
    res.status(500).json({ error: 'Error al cargar las preguntas' });
  }
});

router.post('/api/admin/faqs', requireAdmin, async (req, res) => {
  try {
    const { question, answer, category, categoryId, groupId, tags, order, attachments } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Pregunta y respuesta son obligatorias' });
    }
    const entry = await db.createFAQ({
      question, answer, category, categoryId, groupId, tags, order,
      attachments: Array.isArray(attachments) ? attachments : []
    });
    res.json(entry);
  } catch (e) {
    console.error('Error POST /api/admin/faqs:', e.message);
    res.status(400).json({ error: e.message || 'Error al crear la pregunta' });
  }
});

router.get('/api/admin/faqs/:id', requireAdmin, async (req, res) => {
  try {
    const faq = await db.getFAQById(parseInt(req.params.id, 10));
    if (!faq) return res.status(404).json({ error: 'FAQ no encontrada' });
    res.json(faq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener FAQ' });
  }
});

router.put('/api/admin/faqs/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.getFAQById(id);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const { question, answer, category, categoryId, groupId, tags, order, attachments } = req.body;
    const updated = await db.updateFAQ(id, {
      question, answer,
      category: category || 'General',
      categoryId,
      groupId,
      tags: Array.isArray(tags) ? tags : [],
      order: parseInt(order, 10) || 999,
      attachments: attachments || existing.attachments
    });
    res.json(updated);
  } catch (e) {
    console.error('Error PUT /api/admin/faqs:', e.message);
    res.status(400).json({ error: e.message || 'Error al actualizar la pregunta' });
  }
});

router.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await db.getAllCategories();
    const { tree } = await db.getCategoryTreeWithCounts(true);
    res.json({ categories, tree });
  } catch (e) {
    console.error('Error GET /api/admin/categories:', e.message);
    res.status(500).json({ error: 'Error al cargar categorías' });
  }
});

router.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name, parentId, icon, sortOrder } = req.body;
    const entry = await db.createCategory({ name, parentId, icon, sortOrder });
    res.json(entry);
  } catch (e) {
    console.error('Error POST /api/admin/categories:', e.message);
    res.status(400).json({ error: e.message || 'Error al crear categoría' });
  }
});

router.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, parentId, icon, sortOrder } = req.body;
    const updated = await db.updateCategory(id, { name, parentId, icon, sortOrder });
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  } catch (e) {
    console.error('Error PUT /api/admin/categories:', e.message);
    res.status(400).json({ error: e.message || 'Error al actualizar categoría' });
  }
});

router.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await db.deleteCategory(id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error DELETE /api/admin/categories:', e.message);
    res.status(400).json({ error: e.message || 'Error al eliminar categoría' });
  }
});

router.delete('/api/admin/faqs/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const faq = await db.getFAQById(id);
    if (!faq) return res.status(404).json({ error: 'No encontrado' });
    if (faq.isAnnulled) return res.status(400).json({ error: 'La pregunta ya está anulada' });

    const ok = await db.annulFAQ(id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, message: 'Pregunta anulada' });
  } catch (e) {
    console.error('Error DELETE /api/admin/faqs:', e.message);
    res.status(500).json({ error: 'Error al anular la pregunta' });
  }
});

router.post('/api/admin/faqs/:id/restore', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const faq = await db.getFAQById(id);
    if (!faq) return res.status(404).json({ error: 'No encontrado' });
    if (!faq.isAnnulled) return res.status(400).json({ error: 'La pregunta no está anulada' });

    const ok = await db.restoreFAQ(id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    const restored = await db.getFAQById(id);
    res.json({ ok: true, faq: restored });
  } catch (e) {
    console.error('Error POST /api/admin/faqs/:id/restore:', e.message);
    res.status(500).json({ error: 'Error al restaurar la pregunta' });
  }
});

router.post('/api/admin/upload', requireAdmin, upload.array('files', 10), (req, res) => {
  const files = req.files.map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    type: f.mimetype,
    size: f.size,
    url: publicUrl(`/uploads/${f.filename}`)
  }));
  res.json({ files });
});

router.delete('/api/admin/upload/:filename', requireAdmin, (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

// ── PANEL ADMIN ───────────────────────────────────────────
router.get('/admin-panel', (req, res) => {
  sendHtmlWithBase(paths.assetPath('admin', 'index.html'), res);
});
router.get('/admin-panel/*', (req, res) => {
  sendHtmlWithBase(paths.assetPath('admin', 'index.html'), res);
});

if (BASE_PATH) {
  app.get('/', (req, res) => res.redirect(301, `${BASE_PATH}/`));
}
app.use(BASE_PATH || '/', router);

// ── START ─────────────────────────────────────────────────
async function start() {
  try {
    await db.testConnection();
    await db.initDatabase();

    const adminSeeded = await db.seedAdminIfEmpty({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME
    });
    if (adminSeeded) {
      console.log(`  👤  Usuario admin creado: ${ADMIN_EMAIL}`);
    }

    const seeded = await db.seedIfEmpty(SEED_DATA);
    if (seeded) {
      console.log('  🌱  Tabla vacía: se insertaron preguntas de ejemplo');
    } else {
      await importLegacyJsonIfNeeded();
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('  ✅  FAQ Server corriendo (MySQL)');
      if (paths.isPkg) {
        console.log(`  📁  Carpeta de trabajo: ${paths.appDir()}`);
        console.log(`  🖼️  Imágenes/adjuntos: ${UPLOADS_DIR}`);
      }
      if (envCreated) {
        console.log('  📄  Se creó .env — edítalo con tu DATABASE_URL y reinicia');
      }
      console.log(`  🗄️  Base de datos:  ${db.getDbLabel()}`);
      const prefix = BASE_PATH || '';
      console.log(`  🌐  Vista pública:  http://localhost:${PORT}${prefix}/`);
      console.log(`  🔒  Panel admin:   http://localhost:${PORT}${prefix}/admin-panel`);
      if (BASE_PATH) console.log(`  🔗  Ruta nginx:    ${BASE_PATH}/`);
      console.log(`  👤  Admin login:   ${ADMIN_EMAIL}`);
      console.log('');
    });
  } catch (e) {
    console.error('');
    console.error('  ❌  No se pudo conectar a MySQL');
    console.error(`  →  ${e.message}`);
    console.error('');
    console.error('  Pasos:');
    if (paths.isPkg) {
      console.error(`  1. Edita el archivo .env en: ${paths.appDir()}`);
      console.error('  2. Pega tu DATABASE_URL en .env');
      console.error('  3. Vuelve a ejecutar faq-server.exe');
    } else {
      console.error('  1. Copia .env.example → .env');
      console.error('  2. Pega tu DATABASE_URL en .env');
      console.error('  3. Ejecuta: npm start');
    }
    console.error('');
    process.exit(1);
  }
}

start();
