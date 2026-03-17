import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const tags = db.prepare(`
    SELECT t.*, COUNT(lt.link_id) as link_count
    FROM tags t LEFT JOIN link_tags lt ON t.id = lt.tag_id
    WHERE t.user_id = ?
    GROUP BY t.id ORDER BY t.name
  `).all(req.userId);
  res.json(tags);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: '标签名不能为空' });
  try {
    const result = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(req.userId, name.trim(), color || '#6366f1');
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.json(tag);
  } catch {
    res.status(409).json({ error: '标签已存在' });
  }
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const tag = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!tag) return res.status(404).json({ error: '标签不存在' });
  db.prepare('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
    .run(name || null, color || null, req.params.id);
  res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '标签不存在' });
  res.json({ ok: true });
});

export default router;
