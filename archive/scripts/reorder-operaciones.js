#!/usr/bin/env node
/**
 * Reordena FAQs del grupo Operaciones (group_id=2) y subcategorías.
 * node archive/scripts/reorder-operaciones.js
 */
require('dotenv').config();
const db = require('../../db');

const FAQ_ORDER = {
  3: [18, 8, 19, 20, 21],
  4: [22, 23, 24, 46, 66, 43, 44, 45, 7, 26, 25, 67, 68, 69, 70, 71, 72, 47, 48, 73, 74, 49, 50, 75, 6, 5],
  11: [42, 41, 17],
  6: [10, 30, 31],
  5: [9, 27, 11, 28, 29, 15, 76, 77],
  7: [12, 32, 78, 79],
  10: [39, 40, 16],
  9: [36, 37, 14, 38, 51, 82, 83, 84, 85, 86, 87, 88, 89],
  8: [13, 33, 34, 35, 65]
};

const CATEGORY_SORT = {
  3: 1, 4: 2, 11: 3, 6: 4, 5: 5, 7: 6, 10: 7, 9: 8, 8: 9
};

const BASE = 100;

async function main() {
  const now = new Date();
  const conn = await db.pool.getConnection();

  try {
    await conn.beginTransaction();

    for (const [catId, sort] of Object.entries(CATEGORY_SORT)) {
      await conn.query(
        'UPDATE faq_categories SET sort_order = ? WHERE id = ? AND parent_id = 2',
        [sort, Number(catId)]
      );
    }

    let updated = 0;
    for (const [catId, ids] of Object.entries(FAQ_ORDER)) {
      const block = Number(catId) * BASE;
      for (let i = 0; i < ids.length; i++) {
        const [r] = await conn.query(
          'UPDATE faqs SET sort_order = ?, updated_at = ? WHERE id = ? AND group_id = 2 AND deleted_at IS NULL',
          [block + i + 1, now, ids[i]]
        );
        updated += r.affectedRows;
      }
    }

    await conn.commit();
    console.log(`OK: ${updated} FAQs reordenadas en Operaciones`);

    const [sample] = await db.pool.query(
      `SELECT f.id, f.sort_order, c.name AS cat, f.question
       FROM faqs f
       LEFT JOIN faq_categories c ON f.category_id = c.id
       WHERE f.group_id = 2 AND f.deleted_at IS NULL
       ORDER BY f.sort_order ASC LIMIT 12`
    );
    console.log('\nPrimeras 12:');
    sample.forEach((r) => console.log(`${r.sort_order} | ${r.cat} | ${r.question}`));
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
