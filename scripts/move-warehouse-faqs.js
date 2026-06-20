#!/usr/bin/env node
/**
 * Mueve FAQs de bodega/warehouse/paquetes al grupo padre Warehouse (group_id=16).
 * Uso: node scripts/move-warehouse-faqs.js
 */
require('dotenv').config();
const db = require('../db');

const WAREHOUSE_GROUP_ID = 16;
const FAQ_IDS = [66, 67, 68, 69, 70, 71, 72, 73, 76, 77, 78, 79];

async function main() {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date();
    let updated = 0;
    for (let i = 0; i < FAQ_IDS.length; i++) {
      const [r] = await conn.query(
        `UPDATE faqs SET group_id = ?, category_id = NULL, category = 'Warehouse', sort_order = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [WAREHOUSE_GROUP_ID, i + 1, now, FAQ_IDS[i]]
      );
      updated += r.affectedRows;
    }
    await conn.commit();
    console.log(`OK: ${updated} FAQs movidas al grupo Warehouse`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
