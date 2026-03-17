import { useState } from 'react';
import { ExternalLink, Pencil, Trash2, X, Check, MessageSquare, FileText, Image } from 'lucide-react';

interface Tag { id: number; name: string; color: string; }
interface LinkItem {
  id: number; type?: string; url: string; title: string; description: string;
  thumbnail: string; comment: string; content?: string; image_path?: string;
  imported_at: string; tags: Tag[];
}

interface Props {
  link: LinkItem;
  allTags: Tag[];
  onUpdate: (id: number, data: Record<string, any>) => void;
  onDelete: (id: number) => void;
}

export default function LinkCard({ link, allTags, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(link.comment);
  const [editContent, setEditContent] = useState(link.content || '');
  const [editTitle, setEditTitle] = useState(link.title || '');
  const [selectedTags, setSelectedTags] = useState<number[]>(link.tags.map(t => t.id));

  const itemType = link.type || 'link';

  const save = () => {
    const data: Record<string, any> = { comment, tag_ids: selectedTags };
    if (itemType === 'text') {
      data.title = editTitle;
      data.content = editContent;
    }
    onUpdate(link.id, data);
    setEditing(false);
  };

  const cancel = () => {
    setComment(link.comment);
    setEditContent(link.content || '');
    setEditTitle(link.title || '');
    setSelectedTags(link.tags.map(t => t.id));
    setEditing(false);
  };

  const domain = (() => {
    try { return new URL(link.url).hostname.replace('www.', ''); } catch { return ''; }
  })();

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return d; }
  };

  const typeLabel = itemType === 'image' ? '图片' : itemType === 'text' ? '笔记' : '';

  // Edit mode UI (shared across types)
  const editSection = editing && (
    <div className="mt-3 space-y-3">
      {itemType === 'text' && (
        <>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">标题</label>
            <input className="input text-sm" value={editTitle}
              onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">内容</label>
            <textarea className="input text-sm" rows={4} value={editContent}
              onChange={e => setEditContent(e.target.value)} />
          </div>
        </>
      )}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">我的评论</label>
        <textarea className="input text-sm" rows={2} placeholder="写点什么..."
          value={comment} onChange={e => setComment(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">标签</label>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(tag => (
            <button key={tag.id}
              onClick={() => setSelectedTags(prev =>
                prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
              )}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedTags.includes(tag.id)
                  ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700'
              }`}
              style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}>
              {tag.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="btn-primary text-xs py-1.5">
          <Check className="w-3 h-3" /> 保存
        </button>
        <button onClick={cancel} className="btn-secondary text-xs py-1.5">
          <X className="w-3 h-3" /> 取消
        </button>
      </div>
    </div>
  );

  // Action buttons
  const actionButtons = !editing && (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={() => setEditing(true)} className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(link.id)} className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 text-red-500">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Tags display
  const tagsDisplay = !editing && link.tags.length > 0 && (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {link.tags.map(tag => (
        <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: tag.color + '20', color: tag.color }}>
          {tag.name}
        </span>
      ))}
    </div>
  );

  // Comment display
  const commentDisplay = !editing && link.comment && (
    <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
      <span className="line-clamp-2">{link.comment}</span>
    </div>
  );

  // --- IMAGE TYPE ---
  if (itemType === 'image') {
    return (
      <div className="card overflow-hidden group hover:shadow-md transition-shadow">
        {link.image_path && !editing && (
          <div className="bg-gray-100 dark:bg-gray-800">
            <img src={link.image_path} alt={link.title}
              className="w-full max-h-64 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium text-sm truncate">{link.title || '未命名图片'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px]">
                  {typeLabel}
                </span>
                <span className="ml-1.5">{formatDate(link.imported_at)}</span>
              </p>
            </div>
            {actionButtons}
          </div>
          {tagsDisplay}
          {commentDisplay}
          {editSection}
        </div>
      </div>
    );
  }

  // --- TEXT TYPE ---
  if (itemType === 'text') {
    return (
      <div className="card overflow-hidden group hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-medium text-sm truncate">{link.title || '未命名笔记'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px]">
                  {typeLabel}
                </span>
                <span className="ml-1.5">{formatDate(link.imported_at)}</span>
              </p>
            </div>
            {actionButtons}
          </div>
          {/* Text content */}
          {!editing && link.content && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap line-clamp-4">{link.content}</p>
          )}
          {tagsDisplay}
          {commentDisplay}
          {editSection}
        </div>
      </div>
    );
  }

  // --- LINK TYPE (default) ---
  return (
    <div className="card overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex">
        {link.thumbnail && (
          <div className="hidden sm:block w-32 h-32 shrink-0 bg-gray-100 dark:bg-gray-800">
            <img src={link.thumbnail} alt="" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <a href={link.url} target="_blank" rel="noopener noreferrer"
                className="font-medium text-sm hover:text-indigo-600 flex items-center gap-1.5 group/link">
                <span className="truncate">{link.title || link.url}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100" />
              </a>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{domain} &middot; {formatDate(link.imported_at)}</p>
            </div>
            {actionButtons}
          </div>
          {link.description && !editing && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{link.description}</p>
          )}
          {tagsDisplay}
          {commentDisplay}
          {editSection}
        </div>
      </div>
    </div>
  );
}
