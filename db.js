const fs      = require('fs');
const dns     = require('dns');
const bcrypt  = require('bcryptjs');
const mysql   = require('mysql2/promise');
const { DEFAULT_SITE } = require('./site-config');

// En Windows + .exe pkg a veces falla DNS con IPv6; forzar IPv4 primero
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

function sanitizeDatabaseUrl(raw) {
  if (!raw) return '';
  let url = String(raw).trim().replace(/\r/g, '');
  url = url.replace(/^['"`]+|['"`]+$/g, '');
  url = url.replace(/^[`$]?\d*=?/, '');
  const match = url.match(/(mysql\+pymysql:\/\/|mysql:\/\/)\S+/i);
  return match ? match[0].replace(/\r/g, '') : url;
}

function parseDatabaseUrl(url) {
  const cleaned = sanitizeDatabaseUrl(url);
  if (!cleaned) {
    throw new Error('DATABASE_URL vacía o no válida en .env');
  }
  const normalized = cleaned.replace(/^mysql\+pymysql:/i, 'mysql:');
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(
      'DATABASE_URL no válida. Debe verse así:\n' +
      'DATABASE_URL=mysql+pymysql://usuario:password@host:puerto/base?charset=utf8mb4'
    );
  }
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  let host = parsed.hostname.trim().replace(/\r/g, '');

  // Si el .exe no resuelve DNS, usa la IP directamente (opcional en .env)
  if (process.env.DB_HOST_IP) {
    host = process.env.DB_HOST_IP.trim();
  }

  const config = {
    host,
    port: parseInt(parsed.port || '3306', 10),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    charset: parsed.searchParams.get('charset') || 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10
  };

  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    const ssl = { minVersion: 'TLSv1.2' };
    if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
      ssl.ca = fs.readFileSync(process.env.DB_SSL_CA);
      ssl.rejectUnauthorized = true;
    } else {
      ssl.rejectUnauthorized = false;
    }
    config.ssl = ssl;
  }

  return config;
}

function getDbConfig() {
  if (process.env.DATABASE_URL) {
    return parseDatabaseUrl(process.env.DATABASE_URL);
  }
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'faq_db',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
  };
}

const dbConfig = getDbConfig();
const pool = mysql.createPool(dbConfig);

function getDbLabel() {
  if (process.env.DATABASE_URL) {
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    return `${cfg.database} @ ${cfg.host}:${cfg.port}`;
  }
  return `${dbConfig.database} @ ${dbConfig.host}`;
}

const FAQ_JOINS = `
  LEFT JOIN faq_categories g ON f.group_id = g.id
  LEFT JOIN faq_categories c ON f.category_id = c.id`;

/** Grupo padre → subcategoría → orden manual dentro de subcategoría */
const FAQ_ORDER_BY = `
  ORDER BY COALESCE(g.sort_order, 999) ASC,
           COALESCE(c.sort_order, 0) ASC,
           f.sort_order ASC,
           f.created_at ASC,
           f.id ASC`;

function rowToFaq(row) {
  const groupName = row.group_name || null;
  const subName = row.category_name || null;
  return {
    id: row.id,
    groupId: row.group_id ? Number(row.group_id) : null,
    categoryId: row.category_id ? Number(row.category_id) : null,
    category: subName || groupName || row.category || 'General',
    categoryGroup: groupName,
    categoryGroupId: row.group_id ? Number(row.group_id) : null,
    categoryIcon: row.category_icon || row.group_icon || null,
    order: row.sort_order,
    question: row.question,
    answer: row.answer,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : (row.attachments || []),
    createdAt: Number(row.created_at),
    updatedAt: row.updated_at ? Number(row.updated_at) : undefined,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : undefined,
    isAnnulled: !!row.deleted_at
  };
}

async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        sort_order INT NOT NULL DEFAULT 999,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        tags JSON NOT NULL,
        attachments JSON NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NULL,
        deleted_at BIGINT NULL,
        INDEX idx_category (category),
        INDEX idx_sort_order (sort_order),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    try {
      await conn.query('ALTER TABLE faqs ADD COLUMN deleted_at BIGINT NULL');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await conn.query('ALTER TABLE faqs ADD COLUMN category_id INT NULL');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await conn.query('ALTER TABLE faqs ADD COLUMN group_id INT NULL');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await conn.query('ALTER TABLE faqs ADD INDEX idx_group_id (group_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS faq_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(20) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        INDEX idx_cat_parent (parent_id),
        INDEX idx_cat_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await migrateCategoriesFromLegacy(conn);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT PRIMARY KEY,
        brand_name VARCHAR(120) NOT NULL DEFAULT 'Centro de Ayuda',
        logo_url VARCHAR(500) NULL,
        font_family VARCHAR(50) NOT NULL DEFAULT 'satoshi',
        updated_at BIGINT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS question_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suggestion TEXT NOT NULL,
        name VARCHAR(100) NULL,
        email VARCHAR(255) NULL,
        status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        reviewed_at BIGINT NULL,
        INDEX idx_suggestion_status (status),
        INDEX idx_suggestion_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT 'Administrador',
        role ENUM('admin', 'editor') NOT NULL DEFAULT 'admin',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NULL,
        last_login_at BIGINT NULL,
        UNIQUE KEY uq_users_email (email),
        INDEX idx_users_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    conn.release();
  }
}

function rowToUser(row, { includeDates = false } = {}) {
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: !!row.is_active
  };
  if (includeDates) {
    user.createdAt = Number(row.created_at);
    user.updatedAt = row.updated_at ? Number(row.updated_at) : undefined;
    user.lastLoginAt = row.last_login_at ? Number(row.last_login_at) : undefined;
  }
  return user;
}

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
    [email.trim().toLowerCase()]
  );
  return rows.length ? rows[0] : null;
}

async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows.length ? rows[0] : null;
}

async function verifyUserLogin(email, password) {
  const row = await getUserByEmail(email);
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  const now = Date.now();
  await pool.query('UPDATE users SET last_login_at = ? WHERE id = ?', [now, row.id]);
  return rowToUser({ ...row, last_login_at: now }, { includeDates: true });
}

async function getAllUsers() {
  const [rows] = await pool.query(
    'SELECT id, email, name, role, is_active, created_at, updated_at, last_login_at FROM users ORDER BY created_at ASC'
  );
  return rows.map(r => rowToUser(r, { includeDates: true }));
}

async function createUser({ email, password, name, role }) {
  const now = Date.now();
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, is_active, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [
      email.trim().toLowerCase(),
      hash,
      name || 'Administrador',
      role === 'editor' ? 'editor' : 'admin',
      now
    ]
  );
  const row = await getUserById(result.insertId);
  return rowToUser(row, { includeDates: true });
}

async function seedAdminIfEmpty({ email, password, name }) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');
  if (rows[0].total > 0) return false;
  await createUser({ email, password, name, role: 'admin' });
  return true;
}

function buildFAQFilters({ includeAnnulled = false, category, search } = {}) {
  const clauses = [];
  const params = [];
  const prefix = 'f.';

  if (!includeAnnulled) {
    clauses.push(`${prefix}deleted_at IS NULL`);
  }
  if (category && category !== 'all') {
    if (category.startsWith('group:')) {
      const groupId = parseInt(category.slice(6), 10);
      if (groupId) {
        clauses.push(`${prefix}group_id = ?`);
        params.push(groupId);
      }
    } else if (category.startsWith('id:')) {
      const catId = parseInt(category.slice(3), 10);
      if (catId) {
        clauses.push(`${prefix}category_id = ?`);
        params.push(catId);
      }
    } else {
      clauses.push(`(${prefix}category = ? OR c.name = ?)`);
      params.push(category, category);
    }
  }
  if (search) {
    const like = `%${search.trim()}%`;
    clauses.push(`(
      ${prefix}question LIKE ?
      OR ${prefix}answer LIKE ?
      OR ${prefix}category LIKE ?
      OR c.name LIKE ?
      OR g.name LIKE ?
      OR EXISTS (
        SELECT 1 FROM JSON_TABLE(${prefix}tags, '$[*]' COLUMNS (tag VARCHAR(255) PATH '$')) AS jt
        WHERE jt.tag LIKE ?
      )
    )`);
    params.push(like, like, like, like, like, like);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

async function migrateCategoriesFromLegacy(conn) {
  const db = conn || pool;
  const [catRows] = await db.query('SELECT COUNT(*) AS total FROM faq_categories');
  if (catRows[0].total === 0) {
    const now = Date.now();
    await db.query(
      `INSERT INTO faq_categories (parent_id, name, icon, sort_order, created_at) VALUES
       (NULL, 'Operativo', '⚙️', 1, ?),
       (NULL, 'Contable', '📊', 2, ?)`,
      [now, now]
    );
  }

  const [groups] = await db.query(
    'SELECT id, name FROM faq_categories WHERE parent_id IS NULL ORDER BY sort_order ASC'
  );
  const operativoId = groups.find(g => g.name === 'Operativo')?.id || groups[0]?.id;

  const [distinct] = await db.query(
    `SELECT DISTINCT category FROM faqs
     WHERE category_id IS NULL AND category IS NOT NULL AND TRIM(category) != ''`
  );

  for (const row of distinct) {
    const name = row.category.trim();
    const [existing] = await db.query(
      'SELECT id FROM faq_categories WHERE name = ? AND parent_id IS NOT NULL LIMIT 1',
      [name]
    );
    let leafId;
    if (existing.length) {
      leafId = existing[0].id;
    } else if (operativoId) {
      const now = Date.now();
      const [ins] = await db.query(
        `INSERT INTO faq_categories (parent_id, name, icon, sort_order, created_at) VALUES (?, ?, NULL, 999, ?)`,
        [operativoId, name, now]
      );
      leafId = ins.insertId;
    }
    if (leafId) {
      await db.query(
        'UPDATE faqs SET category_id = ? WHERE category = ? AND category_id IS NULL',
        [leafId, name]
      );
    }
  }

  await db.query(`
    UPDATE faqs f
    JOIN faq_categories c ON f.category_id = c.id
    SET f.group_id = c.parent_id
    WHERE f.category_id IS NOT NULL AND (f.group_id IS NULL OR f.group_id = 0)
  `);

  if (operativoId) {
    await db.query(
      'UPDATE faqs SET group_id = ? WHERE group_id IS NULL OR group_id = 0',
      [operativoId]
    );
  }

  await db.query(`
    UPDATE faqs f
    LEFT JOIN faq_categories c ON f.category_id = c.id
    LEFT JOIN faq_categories g ON f.group_id = g.id
    SET f.category = COALESCE(c.name, g.name, f.category)
    WHERE f.group_id IS NOT NULL OR f.category_id IS NOT NULL
  `);
}

function rowToCategory(row) {
  return {
    id: row.id,
    parentId: row.parent_id ? Number(row.parent_id) : null,
    name: row.name,
    icon: row.icon || null,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: Number(row.created_at)
  };
}

async function getAllCategories() {
  const [rows] = await pool.query(
    'SELECT * FROM faq_categories ORDER BY parent_id IS NULL DESC, sort_order ASC, name ASC'
  );
  return rows.map(rowToCategory);
}

async function getCategoryById(id) {
  const [rows] = await pool.query('SELECT * FROM faq_categories WHERE id = ? LIMIT 1', [id]);
  return rows.length ? rowToCategory(rows[0]) : null;
}

async function createCategory({ name, parentId, icon, sortOrder }) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Nombre obligatorio');
  const now = Date.now();
  const [result] = await pool.query(
    `INSERT INTO faq_categories (parent_id, name, icon, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      parentId ? parseInt(parentId, 10) : null,
      trimmed,
      icon?.trim() || null,
      parseInt(sortOrder, 10) || 0,
      now
    ]
  );
  return getCategoryById(result.insertId);
}

async function updateCategory(id, { name, parentId, icon, sortOrder }) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Nombre obligatorio');
  const catId = parseInt(id, 10);
  if (parentId && parseInt(parentId, 10) === catId) {
    throw new Error('Una categoría no puede ser padre de sí misma');
  }
  const [result] = await pool.query(
    `UPDATE faq_categories
     SET parent_id = ?, name = ?, icon = ?, sort_order = ?
     WHERE id = ?`,
    [
      parentId ? parseInt(parentId, 10) : null,
      trimmed,
      icon?.trim() || null,
      parseInt(sortOrder, 10) || 0,
      catId
    ]
  );
  if (result.affectedRows === 0) return null;

  await pool.query(
    `UPDATE faqs f
     JOIN faq_categories c ON f.category_id = c.id
     SET f.category = c.name
     WHERE c.id = ?`,
    [catId]
  );
  return getCategoryById(catId);
}

async function deleteCategory(id) {
  const catId = parseInt(id, 10);
  const [children] = await pool.query(
    'SELECT COUNT(*) AS total FROM faq_categories WHERE parent_id = ?',
    [catId]
  );
  if (children[0].total > 0) {
    throw new Error('Elimina primero las subcategorías');
  }
  const [faqs] = await pool.query(
    'SELECT COUNT(*) AS total FROM faqs WHERE category_id = ?',
    [catId]
  );
  if (faqs[0].total > 0) {
    throw new Error(`Hay ${faqs[0].total} pregunta(s) en esta subcategoría`);
  }
  const [faqsGroup] = await pool.query(
    'SELECT COUNT(*) AS total FROM faqs WHERE group_id = ?',
    [catId]
  );
  if (faqsGroup[0].total > 0) {
    throw new Error(`Hay ${faqsGroup[0].total} pregunta(s) en este grupo`);
  }
  const [result] = await pool.query('DELETE FROM faq_categories WHERE id = ?', [catId]);
  return result.affectedRows > 0;
}

async function getCategoryTreeWithCounts(includeAnnulled = false) {
  const annulSql = includeAnnulled ? '' : 'AND f.deleted_at IS NULL';

  const [groups] = await pool.query(
    `SELECT id, parent_id, name, icon, sort_order FROM faq_categories
     WHERE parent_id IS NULL ORDER BY sort_order ASC, name ASC`
  );
  const [children] = await pool.query(
    `SELECT id, parent_id, name, icon, sort_order FROM faq_categories
     WHERE parent_id IS NOT NULL ORDER BY sort_order ASC, name ASC`
  );
  const [counts] = await pool.query(
    `SELECT f.category_id, COUNT(*) AS count FROM faqs f
     WHERE f.category_id IS NOT NULL ${annulSql}
     GROUP BY f.category_id`
  );
  const countMap = Object.fromEntries(counts.map(r => [r.category_id, Number(r.count)]));

  const [groupCounts] = await pool.query(
    `SELECT f.group_id, COUNT(*) AS count FROM faqs f
     WHERE f.group_id IS NOT NULL ${annulSql}
     GROUP BY f.group_id`
  );
  const groupCountMap = Object.fromEntries(groupCounts.map(r => [r.group_id, Number(r.count)]));

  const [legacyCounts] = await pool.query(
    `SELECT category, COUNT(*) AS count FROM faqs f
     WHERE category_id IS NULL ${annulSql}
     GROUP BY category`
  );

  const tree = groups.map(g => {
    const kids = children
      .filter(c => c.parent_id === g.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon || null,
        sortOrder: c.sort_order,
        count: countMap[c.id] || 0
      }));
    return {
      id: g.id,
      name: g.name,
      icon: g.icon || null,
      sortOrder: g.sort_order,
      count: groupCountMap[g.id] || 0,
      children: kids
    };
  });

  const legacy = legacyCounts
    .filter(r => r.count > 0)
    .map(r => ({ category: r.category, count: Number(r.count) }));

  return { tree, legacy };
}

async function getAllFAQs(includeAnnulled = false) {
  const { whereSql, params } = buildFAQFilters({ includeAnnulled });
  const [rows] = await pool.query(
    `SELECT f.*, g.name AS group_name, g.icon AS group_icon,
            c.name AS category_name, c.icon AS category_icon
     FROM faqs f ${FAQ_JOINS} ${whereSql}
     ${FAQ_ORDER_BY}`,
    params
  );
  return rows.map(rowToFaq);
}

async function getFAQsPaginated({ page = 1, limit = 25, includeAnnulled = false, category, search } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const { whereSql, params } = buildFAQFilters({ includeAnnulled, category, search });

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM faqs f ${FAQ_JOINS} ${whereSql}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT f.*, g.name AS group_name, g.icon AS group_icon,
            c.name AS category_name, c.icon AS category_icon
     FROM faqs f ${FAQ_JOINS} ${whereSql}
     ${FAQ_ORDER_BY} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    faqs: rows.map(rowToFaq),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

async function getCategoryCounts(includeAnnulled = false) {
  const { tree, legacy } = await getCategoryTreeWithCounts(includeAnnulled);
  const flat = [];
  for (const g of tree) {
    for (const c of g.children) {
      if (c.count > 0) {
        flat.push({
          category: c.name,
          categoryId: c.id,
          groupId: g.id,
          groupName: g.name,
          count: c.count
        });
      }
    }
  }
  for (const l of legacy) {
    flat.push({ category: l.category, count: l.count });
  }
  flat.sort((a, b) => a.category.localeCompare(b.category, 'es'));
  return flat;
}

async function getFAQStats() {
  const [rows] = await pool.query(`
    SELECT
      SUM(deleted_at IS NULL) AS active,
      SUM(deleted_at IS NOT NULL) AS annulled,
      COUNT(DISTINCT CASE WHEN deleted_at IS NULL THEN category_id END) AS categories,
      MAX(CASE WHEN deleted_at IS NULL THEN COALESCE(updated_at, created_at) END) AS last_updated
    FROM faqs
  `);
  const [attRows] = await pool.query(
    `SELECT COALESCE(SUM(JSON_LENGTH(attachments)), 0) AS attachments FROM faqs WHERE deleted_at IS NULL`
  );
  return {
    active: Number(rows[0].active) || 0,
    annulled: Number(rows[0].annulled) || 0,
    categories: Number(rows[0].categories) || 0,
    lastUpdatedAt: rows[0].last_updated ? Number(rows[0].last_updated) : null,
    attachments: Number(attRows[0].attachments) || 0
  };
}

async function getPageForFAQId(id, limit, filters = {}) {
  const [faqRows] = await pool.query(
    `SELECT f.sort_order, f.created_at, g.sort_order AS g_sort, c.sort_order AS c_sort
     FROM faqs f ${FAQ_JOINS} WHERE f.id = ? LIMIT 1`,
    [id]
  );
  if (!faqRows.length) return null;
  const faq = faqRows[0];

  const { whereSql, params } = buildFAQFilters(filters);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS pos FROM faqs f ${FAQ_JOINS} ${whereSql}
     AND (
       COALESCE(g.sort_order, 999) < COALESCE(?, 999)
       OR (COALESCE(g.sort_order, 999) = COALESCE(?, 999) AND COALESCE(c.sort_order, 0) < COALESCE(?, 0))
       OR (COALESCE(g.sort_order, 999) = COALESCE(?, 999) AND COALESCE(c.sort_order, 0) = COALESCE(?, 0) AND f.sort_order < ?)
       OR (COALESCE(g.sort_order, 999) = COALESCE(?, 999) AND COALESCE(c.sort_order, 0) = COALESCE(?, 0) AND f.sort_order = ? AND f.created_at < ?)
       OR (COALESCE(g.sort_order, 999) = COALESCE(?, 999) AND COALESCE(c.sort_order, 0) = COALESCE(?, 0) AND f.sort_order = ? AND f.created_at = ? AND f.id < ?)
     )`,
    [
      ...params,
      faq.g_sort, faq.g_sort, faq.c_sort,
      faq.g_sort, faq.c_sort, faq.sort_order,
      faq.g_sort, faq.c_sort, faq.sort_order, faq.created_at,
      faq.g_sort, faq.c_sort, faq.sort_order, faq.created_at, id
    ]
  );
  const pos = rows[0].pos;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  return Math.floor(pos / safeLimit) + 1;
}

async function getFAQById(id, { includeAnnulled = true } = {}) {
  const annulClause = includeAnnulled ? '' : 'AND f.deleted_at IS NULL';
  const [rows] = await pool.query(
    `SELECT f.*, g.name AS group_name, g.icon AS group_icon,
            c.name AS category_name, c.icon AS category_icon
     FROM faqs f ${FAQ_JOINS}
     WHERE f.id = ? ${annulClause}`,
    [id]
  );
  return rows.length ? rowToFaq(rows[0]) : null;
}

async function resolveCategoryForFAQ({ category, categoryId, groupId }) {
  let gId = groupId ? parseInt(groupId, 10) : null;
  const cId = categoryId ? parseInt(categoryId, 10) : null;

  if (cId) {
    const cat = await getCategoryById(cId);
    if (!cat || !cat.parentId) throw new Error('Subcategoría no válida');
    if (gId && gId !== cat.parentId) {
      throw new Error('La subcategoría no pertenece al grupo seleccionado');
    }
    gId = cat.parentId;
    const group = await getCategoryById(gId);
    return {
      groupId: gId,
      categoryId: cId,
      categoryName: cat.name,
      groupName: group?.name || null
    };
  }

  if (gId) {
    const group = await getCategoryById(gId);
    if (!group || group.parentId) {
      throw new Error('Selecciona un grupo válido (Operativo, Contable, etc.)');
    }
    return {
      groupId: gId,
      categoryId: null,
      categoryName: group.name,
      groupName: group.name
    };
  }

  const name = (category || 'General').trim() || 'General';
  const [groupRows] = await pool.query(
    'SELECT id, name FROM faq_categories WHERE name = ? AND parent_id IS NULL LIMIT 1',
    [name]
  );
  if (groupRows.length) {
    return {
      groupId: groupRows[0].id,
      categoryId: null,
      categoryName: groupRows[0].name,
      groupName: groupRows[0].name
    };
  }

  const [rows] = await pool.query(
    'SELECT c.id, c.name, c.parent_id, g.name AS group_name FROM faq_categories c JOIN faq_categories g ON c.parent_id = g.id WHERE c.name = ? AND c.parent_id IS NOT NULL LIMIT 1',
    [name]
  );
  if (rows.length) {
    return {
      groupId: rows[0].parent_id,
      categoryId: rows[0].id,
      categoryName: rows[0].name,
      groupName: rows[0].group_name
    };
  }

  return { groupId: null, categoryId: null, categoryName: name, groupName: null };
}

async function createFAQ({ question, answer, category, categoryId, groupId, tags, order, attachments }) {
  const now = Date.now();
  const resolved = await resolveCategoryForFAQ({ category, categoryId, groupId });
  if (!resolved.groupId) throw new Error('Selecciona un grupo (Operativo o Contable)');
  const [result] = await pool.query(
    `INSERT INTO faqs (category, category_id, group_id, sort_order, question, answer, tags, attachments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resolved.categoryName,
      resolved.categoryId,
      resolved.groupId,
      parseInt(order, 10) || 999,
      question,
      answer,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      JSON.stringify(Array.isArray(attachments) ? attachments : []),
      now
    ]
  );
  return getFAQById(result.insertId);
}

async function updateFAQ(id, { question, answer, category, categoryId, groupId, tags, order, attachments }) {
  const now = Date.now();
  const resolved = await resolveCategoryForFAQ({ category, categoryId, groupId });
  if (!resolved.groupId) throw new Error('Selecciona un grupo (Operativo o Contable)');
  const [result] = await pool.query(
    `UPDATE faqs
     SET category = ?, category_id = ?, group_id = ?, sort_order = ?, question = ?, answer = ?,
         tags = ?, attachments = ?, updated_at = ?
     WHERE id = ?`,
    [
      resolved.categoryName,
      resolved.categoryId,
      resolved.groupId,
      parseInt(order, 10) || 999,
      question,
      answer,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      JSON.stringify(Array.isArray(attachments) ? attachments : []),
      now,
      id
    ]
  );
  if (result.affectedRows === 0) return null;
  return getFAQById(id);
}

async function annulFAQ(id) {
  const now = Date.now();
  const [result] = await pool.query(
    'UPDATE faqs SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  return result.affectedRows > 0;
}

async function restoreFAQ(id) {
  const now = Date.now();
  const [result] = await pool.query(
    'UPDATE faqs SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
    [now, id]
  );
  return result.affectedRows > 0;
}

async function seedIfEmpty(seedItems) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM faqs WHERE deleted_at IS NULL');
  if (rows[0].total > 0) return false;

  for (const item of seedItems) {
    await createFAQ({
      question: item.question,
      answer: item.answer,
      category: item.category,
      tags: item.tags,
      order: item.order,
      attachments: item.attachments || []
    });
  }
  return true;
}

async function testConnection() {
  const cfg = getDbConfig();
  const lookupHost = process.env.DATABASE_URL
    ? sanitizeDatabaseUrl(process.env.DATABASE_URL).match(/@([^:/]+)/)?.[1]
    : cfg.host;

  try {
    if (lookupHost && !process.env.DB_HOST_IP) {
      await dns.promises.lookup(lookupHost, { family: 4 });
    }
  } catch (e) {
    throw new Error(
      `No se pudo resolver el host MySQL "${lookupHost}". ` +
      `nslookup puede funcionar pero Node no — agrega en .env: DB_HOST_IP=164.90.145.105 (${e.message})`
    );
  }

  const conn = await pool.getConnection();
  conn.release();
}

function rowToSiteSettings(row) {
  return {
    brandName: row.brand_name,
    logoUrl: row.logo_url || null,
    fontFamily: row.font_family || DEFAULT_SITE.fontFamily,
    updatedAt: row.updated_at ? Number(row.updated_at) : undefined
  };
}

async function getSiteSettings() {
  const [rows] = await pool.query('SELECT * FROM site_settings WHERE id = 1');
  if (!rows.length) {
    const now = Date.now();
    await pool.query(
      `INSERT INTO site_settings (id, brand_name, logo_url, font_family, updated_at)
       VALUES (1, ?, NULL, ?, ?)`,
      [DEFAULT_SITE.brandName, DEFAULT_SITE.fontFamily, now]
    );
    return { ...DEFAULT_SITE, updatedAt: now };
  }
  return rowToSiteSettings(rows[0]);
}

async function updateSiteSettings({ brandName, logoUrl, fontFamily }) {
  const now = Date.now();
  await pool.query(
    `INSERT INTO site_settings (id, brand_name, logo_url, font_family, updated_at)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       brand_name = VALUES(brand_name),
       logo_url = VALUES(logo_url),
       font_family = VALUES(font_family),
       updated_at = VALUES(updated_at)`,
    [
      brandName || DEFAULT_SITE.brandName,
      logoUrl || null,
      fontFamily || DEFAULT_SITE.fontFamily,
      now
    ]
  );
  return getSiteSettings();
}

function rowToSuggestion(row) {
  return {
    id: row.id,
    suggestion: row.suggestion,
    name: row.name || null,
    email: row.email || null,
    status: row.status,
    createdAt: Number(row.created_at),
    reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : undefined
  };
}

async function createSuggestion({ suggestion, name, email }) {
  const now = Date.now();
  const [result] = await pool.query(
    `INSERT INTO question_suggestions (suggestion, name, email, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [suggestion.trim(), name?.trim() || null, email?.trim() || null, now]
  );
  const [rows] = await pool.query('SELECT * FROM question_suggestions WHERE id = ?', [result.insertId]);
  return rowToSuggestion(rows[0]);
}

async function getAllSuggestions() {
  const [rows] = await pool.query(
    'SELECT * FROM question_suggestions ORDER BY status ASC, created_at DESC'
  );
  return rows.map(rowToSuggestion);
}

async function countPendingSuggestions() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM question_suggestions WHERE status = 'pending'"
  );
  return rows[0].total;
}

async function markSuggestionReviewed(id) {
  const now = Date.now();
  const [result] = await pool.query(
    "UPDATE question_suggestions SET status = 'reviewed', reviewed_at = ? WHERE id = ?",
    [now, id]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query('SELECT * FROM question_suggestions WHERE id = ?', [id]);
  return rowToSuggestion(rows[0]);
}

module.exports = {
  pool,
  getDbLabel,
  initDatabase,
  testConnection,
  getAllFAQs,
  getFAQsPaginated,
  getCategoryCounts,
  getCategoryTreeWithCounts,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getFAQStats,
  getPageForFAQId,
  getFAQById,
  createFAQ,
  updateFAQ,
  annulFAQ,
  restoreFAQ,
  seedIfEmpty,
  verifyUserLogin,
  getAllUsers,
  createUser,
  seedAdminIfEmpty,
  getSiteSettings,
  updateSiteSettings,
  createSuggestion,
  getAllSuggestions,
  countPendingSuggestions,
  markSuggestionReviewed
};
