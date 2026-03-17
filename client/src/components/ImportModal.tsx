import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (links: Array<{ url: string; comment?: string; imported_at?: string }>) => Promise<void>;
}

export default function ImportModal({ open, onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const lines = text.trim().split('\n').filter(Boolean);
    if (!lines.length) { setError('请输入至少一个链接'); return; }

    // Try parsing as JSON first
    let links: Array<{ url: string; comment?: string; imported_at?: string }>;
    try {
      const parsed = JSON.parse(text);
      links = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Treat each line as a URL
      links = lines.map(line => ({ url: line.trim() }));
    }

    setLoading(true);
    try {
      await onImport(links);
      setText('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="card relative w-full max-w-lg p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">批量导入</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">链接列表</label>
            <textarea className="input font-mono text-xs" rows={10}
              placeholder={`每行一个链接，例如：\nhttps://mp.weixin.qq.com/s/xxx\nhttps://www.xiaohongshu.com/xxx\n\n或粘贴 JSON 数组：\n[{"url": "https://...", "comment": "备注"}]`}
              value={text} onChange={e => setText(e.target.value)} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? '导入中...' : '开始导入'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
