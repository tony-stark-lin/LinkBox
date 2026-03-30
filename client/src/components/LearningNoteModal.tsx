import { useState } from 'react';
import { X, RefreshCw, ExternalLink, GraduationCap, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  linkId: number;
  linkTitle: string;
  linkUrl: string;
  initialHtml?: string;
  onClose: () => void;
  onUpdated: (html: string) => void;
}

export default function LearningNoteModal({ linkId, linkTitle, linkUrl, initialHtml, onClose, onUpdated }: Props) {
  const [html, setHtml] = useState(initialHtml || '');
  const [loading, setLoading] = useState(!initialHtml);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getLearningNote(linkId, refresh);
      setHtml(result.html_note);
      onUpdated(result.html_note);
    } catch (e: any) {
      setError(e.message || '生成失败');
    }
    setLoading(false);
  };

  // Auto-load on open if no cached html
  useState(() => { if (!initialHtml) load(); });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="font-semibold text-sm truncate">{linkTitle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={linkUrl} target="_blank" rel="noopener noreferrer"
            className="btn-ghost p-1.5 text-gray-400" title="打开原链接">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => load(true)} disabled={loading}
            className="btn-ghost p-1.5 text-gray-400 disabled:opacity-40" title="重新生成">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">AI 正在生成学习笔记</p>
              <p className="text-xs text-gray-400 mt-1">分析要点 · 提取概念 · 整理结构</p>
              <p className="text-xs text-gray-300 mt-1">约需 30-60 秒...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={() => load()} className="btn-secondary text-xs">重试</button>
          </div>
        ) : html ? (
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="学习笔记"
          />
        ) : null}
      </div>
    </div>
  );
}
