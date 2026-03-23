import { useState, useEffect, useCallback } from 'react';
import { api, type UploadProgress } from '../api/client';
import LinkCard from '../components/LinkCard';
import AddLinkModal from '../components/AddLinkModal';
import ImportModal from '../components/ImportModal';
import { Plus, Search, Upload, Download, Filter, X, Loader2, Link2, Image, FileText, Mic, Paperclip } from 'lucide-react';

interface Tag { id: number; name: string; color: string; link_count: number; }
interface LinkItem {
  id: number; type?: string; url: string; title: string; description: string;
  thumbnail: string; comment: string; content?: string; image_path?: string;
  imported_at: string; tags: Tag[];
}

const TYPE_FILTERS = [
  { key: '', label: '全部', icon: null },
  { key: 'link', label: '链接', icon: Link2 },
  { key: 'image', label: '图片', icon: Image },
  { key: 'text', label: '文字', icon: FileText },
  { key: 'audio', label: '录音', icon: Mic },
  { key: 'file', label: '文件', icon: Paperclip },
];

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeType, setActiveType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (activeTag) params.tag = activeTag;
      if (activeType) params.type = activeType;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const data = await api.getLinks(params);
      setLinks(data.links);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, activeTag, activeType, dateFrom, dateTo]);

  const fetchTags = async () => {
    try { setTags(await api.getTags()); } catch { /* ignore */ }
  };

  useEffect(() => { fetchTags(); }, []);
  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleAddLink = async (data: any) => {
    await api.addLink(data);
    fetchLinks();
    fetchTags();
  };

  const handleAddText = async (data: any) => {
    await api.addText(data);
    fetchLinks();
    fetchTags();
  };

  const handleAddImage = async (formData: FormData, onProgress?: (p: UploadProgress) => void) => {
    await api.addImage(formData, onProgress);
    fetchLinks();
    fetchTags();
  };

  const handleAddAudio = async (formData: FormData, onProgress?: (p: UploadProgress) => void) => {
    await api.addAudio(formData, onProgress);
    fetchLinks();
    fetchTags();
  };

  const handleAddFile = async (formData: FormData, onProgress?: (p: UploadProgress) => void) => {
    await api.addFile(formData, onProgress);
    fetchLinks();
    fetchTags();
  };

  const handleUpdate = async (id: number, data: Record<string, any>) => {
    await api.updateLink(id, data);
    fetchLinks();
    fetchTags();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条收藏？')) return;
    await api.deleteLink(id);
    fetchLinks();
    fetchTags();
  };

  const handleImport = async (items: any[]) => {
    await api.importLinks(items);
    fetchLinks();
  };

  const handleExport = async () => {
    const data = await api.exportLinks();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `linkbox-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const hasFilters = activeTag || dateFrom || dateTo || activeType;
  const clearFilters = () => { setActiveTag(''); setDateFrom(''); setDateTo(''); setActiveType(''); };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">我的收藏</h1>
          <p className="text-sm text-gray-500">{total} 条收藏</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary text-xs">
            <Upload className="w-3.5 h-3.5" /> 导入
          </button>
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> 添加
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="card p-3 mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="搜索标题、链接、评论..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${hasFilters ? 'text-indigo-600' : ''}`}>
            <Filter className="w-4 h-4" />
            {hasFilters && <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full" />}
          </button>
        </div>

        {/* Type filter pills - always visible */}
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map(tf => (
            <button key={tf.key} onClick={() => setActiveType(tf.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeType === tf.key
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {tf.icon && <tf.icon className="w-3 h-3" />}
              {tf.label}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="space-y-3 pt-2 border-t">
            {/* Tag filter */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">按标签筛选</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setActiveTag('')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    !activeTag ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  全部
                </button>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setActiveTag(String(tag.id))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      activeTag === String(tag.id) ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={activeTag === String(tag.id) ? { backgroundColor: tag.color } : {}}>
                    {tag.name} ({tag.link_count})
                  </button>
                ))}
              </div>
            </div>
            {/* Date range */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">开始日期</label>
                <input type="date" className="input text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
                <input type="date" className="input text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost text-xs self-end text-red-500">
                  <X className="w-3 h-3" /> 清除筛选
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Links list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">{hasFilters || search ? '没有找到匹配的内容' : '还没有收藏任何内容'}</p>
          <p className="text-sm">{hasFilters || search ? '试试调整筛选条件' : '点击"添加"开始收藏'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <LinkCard key={link.id} link={link} allTags={tags}
              onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AddLinkModal open={showAdd} tags={tags} onClose={() => setShowAdd(false)}
        onAddLink={handleAddLink} onAddText={handleAddText} onAddImage={handleAddImage} onAddAudio={handleAddAudio} onAddFile={handleAddFile} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
    </div>
  );
}
