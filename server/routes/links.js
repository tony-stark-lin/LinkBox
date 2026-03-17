import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { fetchLinkMeta } from '../utils/fetchMeta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.diskStorage({
    destination: join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
      const id = randomBytes(8).toString('hex');
      cb(null, `${id}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  },
});

const router = Router();
router.use(authMiddleware);

function attachTags(linkId) {
  return db.prepare('SELECT t.* FROM tags t JOIN link_tags lt ON t.id = lt.tag_id WHERE lt.link_id = ?').all(linkId);
}

function setTags(linkId, tagIds) {
  db.prepare('DELETE FROM link_tags WHERE link_id = ?').run(linkId);
  if (tagIds?.length) {
    const stmt = db.prepare('INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)');
    for (const tid of tagIds) stmt.run(linkId, tid);
  }
}

// List items with filters
router.get('/', (req, res) => {
  const { tag, search, from, to, type, page = 1, limit = 50 } = req.query;
  let sql = `SELECT DISTINCT l.* FROM links l`;
  let countSql = `SELECT COUNT(DISTINCT l.id) as total FROM links l`;
  const params = [];
  const conditions = ['l.user_id = ?'];
  params.push(req.userId);

  if (tag) {
    sql += ` JOIN link_tags lt ON l.id = lt.link_id JOIN tags t ON lt.tag_id = t.id`;
    countSql += ` JOIN link_tags lt ON l.id = lt.link_id JOIN tags t ON lt.tag_id = t.id`;
    conditions.push('t.id = ?');
    params.push(tag);
  }
  if (type) { conditions.push('l.type = ?'); params.push(type); }
  if (search) {
    conditions.push(`(l.title LIKE ? OR l.url LIKE ? OR l.comment LIKE ? OR l.content LIKE ?)`);
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (from) { conditions.push('l.imported_at >= ?'); params.push(from); }
  if (to) { conditions.push('l.imported_at <= ?'); params.push(to + ' 23:59:59'); }

  const where = ' WHERE ' + conditions.join(' AND ');
  sql += where + ` ORDER BY l.imported_at DESC LIMIT ? OFFSET ?`;
  countSql += where;

  const offset = (Number(page) - 1) * Number(limit);
  const countParams = [...params];
  params.push(Number(limit), offset);

  const links = db.prepare(sql).all(...params);
  const { total } = db.prepare(countSql).get(...countParams);
  const tagStmt = db.prepare('SELECT t.* FROM tags t JOIN link_tags lt ON t.id = lt.tag_id WHERE lt.link_id = ?');
  const result = links.map(link => ({ ...link, tags: tagStmt.all(link.id) }));

  res.json({ links: result, total, page: Number(page), limit: Number(limit) });
});

// Get single item
router.get('/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: '不存在' });
  res.json({ ...link, tags: attachTags(link.id) });
});

// Add link
router.post('/', async (req, res) => {
  const { url, title, comment, tag_ids, imported_at } = req.body;
  if (!url) return res.status(400).json({ error: 'URL 不能为空' });

  let meta = { title: title || '', description: '', thumbnail: '' };
  if (!title) meta = await fetchLinkMeta(url);

  const result = db.prepare(`
    INSERT INTO links (user_id, type, url, title, description, thumbnail, comment, imported_at)
    VALUES (?, 'link', ?, ?, ?, ?, ?, ?)
  `).run(req.userId, url, meta.title || url, meta.description, meta.thumbnail, comment || '', imported_at || new Date().toISOString());

  if (tag_ids?.length) setTags(result.lastInsertRowid, tag_ids);
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...link, tags: attachTags(link.id) });
});

// Add text note
router.post('/text', (req, res) => {
  const { title, content, comment, tag_ids, imported_at } = req.body;
  if (!content && !title) return res.status(400).json({ error: '标题或内容不能为空' });

  const result = db.prepare(`
    INSERT INTO links (user_id, type, title, content, comment, imported_at)
    VALUES (?, 'text', ?, ?, ?, ?)
  `).run(req.userId, title || '', content || '', comment || '', imported_at || new Date().toISOString());

  if (tag_ids?.length) setTags(result.lastInsertRowid, tag_ids);
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...link, tags: attachTags(link.id) });
});

// Upload image
router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传图片' });

  const imagePath = `/uploads/${req.file.filename}`;
  const { comment, tag_ids, imported_at, title } = req.body;
  const parsedTags = tag_ids ? JSON.parse(tag_ids) : [];

  const result = db.prepare(`
    INSERT INTO links (user_id, type, title, image_path, thumbnail, comment, imported_at)
    VALUES (?, 'image', ?, ?, ?, ?, ?)
  `).run(req.userId, title || req.file.originalname, imagePath, imagePath, comment || '', imported_at || new Date().toISOString());

  if (parsedTags.length) setTags(result.lastInsertRowid, parsedTags);
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...link, tags: attachTags(link.id) });
});

// Update item
router.put('/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: '不存在' });

  const { title, comment, content, tag_ids, imported_at } = req.body;
  db.prepare(`
    UPDATE links SET title = COALESCE(?, title), comment = COALESCE(?, comment),
    content = COALESCE(?, content), imported_at = COALESCE(?, imported_at) WHERE id = ?
  `).run(title ?? null, comment ?? null, content ?? null, imported_at ?? null, req.params.id);

  if (tag_ids !== undefined) setTags(req.params.id, tag_ids);
  const updated = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  res.json({ ...updated, tags: attachTags(updated.id) });
});

// Delete item
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '不存在' });
  res.json({ ok: true });
});

// Batch import links
router.post('/import', async (req, res) => {
  const { links } = req.body;
  if (!Array.isArray(links)) return res.status(400).json({ error: '请提供链接数组' });

  const imported = [];
  for (const item of links) {
    const url = typeof item === 'string' ? item : item.url;
    if (!url) continue;
    const meta = await fetchLinkMeta(url);
    const result = db.prepare(`
      INSERT INTO links (user_id, type, url, title, description, thumbnail, comment, imported_at)
      VALUES (?, 'link', ?, ?, ?, ?, ?, ?)
    `).run(req.userId, url, item.title || meta.title || url, meta.description, meta.thumbnail, item.comment || '', item.imported_at || new Date().toISOString());
    imported.push(result.lastInsertRowid);
  }
  res.json({ imported: imported.length });
});

// Export all
router.get('/export/all', (req, res) => {
  const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY imported_at DESC').all(req.userId);
  const tags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(req.userId);
  const linkTags = db.prepare('SELECT lt.* FROM link_tags lt JOIN links l ON lt.link_id = l.id WHERE l.user_id = ?').all(req.userId);
  res.json({ links, tags, linkTags, exported_at: new Date().toISOString() });
});

export default router;
