const BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('linkbox_token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Links
  getLinks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/links${qs}`);
  },
  addLink: (data: { url: string; comment?: string; tag_ids?: number[]; imported_at?: string }) =>
    request('/links', { method: 'POST', body: JSON.stringify(data) }),
  addText: (data: { title: string; content: string; comment?: string; tag_ids?: number[]; imported_at?: string }) =>
    request('/links/text', { method: 'POST', body: JSON.stringify(data) }),
  addImage: async (formData: FormData) => {
    const token = localStorage.getItem('linkbox_token');
    const res = await fetch(`${BASE}/links/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data;
  },
  updateLink: (id: number, data: Record<string, unknown>) =>
    request(`/links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLink: (id: number) =>
    request(`/links/${id}`, { method: 'DELETE' }),
  importLinks: (links: Array<{ url: string; comment?: string; imported_at?: string }>) =>
    request('/links/import', { method: 'POST', body: JSON.stringify({ links }) }),
  exportLinks: () => request('/links/export/all'),

  // Tags
  getTags: () => request('/tags'),
  addTag: (name: string, color: string) =>
    request('/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
  updateTag: (id: number, data: { name?: string; color?: string }) =>
    request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTag: (id: number) =>
    request(`/tags/${id}`, { method: 'DELETE' }),
};
