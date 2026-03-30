// Generates a structured HTML learning note from article markdown
// Uses Spark 2 local Qwen2.5-VL-3B (port 8081)

const LOCAL_LLM = process.env.LOCAL_LLM_URL || 'http://localhost:8081/v1';
const MODEL = 'Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf';

async function callLLM(prompt, maxTokens = 800) {
  const response = await fetch(`${LOCAL_LLM}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`LLM error ${response.status}`);
  const data = await response.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

export async function generateLearningNote(markdown, title = '', summary = '') {
  const truncated = markdown.slice(0, 4000);

  // Step 1: Extract key takeaways
  const takeawaysRaw = await callLLM(
    `文章标题：${title}\n\n文章内容：\n${truncated}\n\n请提取这篇文章最重要的3-5个核心要点，每个要点一行，用"• "开头，中文，简洁清晰：`,
    400
  );

  // Step 2: Extract key concepts
  const conceptsRaw = await callLLM(
    `文章标题：${title}\n\n文章内容：\n${truncated}\n\n请识别文章中2-4个重要概念或术语，每个格式为"【概念名】：解释（30字以内）"，每个占一行：`,
    300
  );

  // Step 3: One-sentence conclusion
  const conclusion = summary || await callLLM(
    `请用一句话（30字以内）概括这篇文章的核心结论：\n\n${truncated.slice(0, 1000)}`,
    80
  );

  // Build the HTML
  const takeaways = takeawaysRaw
    .split('\n')
    .filter(l => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().match(/^\d+\./))
    .map(l => l.replace(/^[•\-\*\d\.]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  const concepts = conceptsRaw
    .split('\n')
    .filter(l => l.includes('：') || l.includes(':'))
    .map(l => {
      const match = l.match(/[【\[]?([^】\]：:]+)[】\]]?[：:]\s*(.+)/);
      return match ? { term: match[1].trim(), def: match[2].trim() } : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #1a1a2e; line-height: 1.7; }
  .page { max-width: 780px; margin: 0 auto; padding: 24px 20px 60px; }
  h1 { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; line-height: 1.4; }
  .conclusion { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; font-size: 1rem; font-weight: 500; line-height: 1.6; }
  .conclusion::before { content: '💡 核心结论'; display: block; font-size: 0.7rem; opacity: 0.85; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; display: flex; align-items: center; gap-gap: 6px; }
  .takeaways .section-title { color: #0ea5e9; }
  .concepts .section-title { color: #10b981; }
  .takeaway-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .takeaway-item:last-child { border-bottom: none; }
  .takeaway-num { width: 22px; height: 22px; border-radius: 50%; background: #e0f2fe; color: #0ea5e9; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .takeaway-text { font-size: 0.9rem; color: #334155; line-height: 1.6; }
  .concept-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .concept-item:last-child { border-bottom: none; }
  .concept-term { font-weight: 600; color: #065f46; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px; }
  .concept-term::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block; }
  .concept-def { font-size: 0.85rem; color: #64748b; margin-top: 3px; padding-left: 12px; }
  .orig-section { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .orig-section .section-title { color: #8b5cf6; }
  .orig-content { font-size: 0.88rem; color: #475569; line-height: 1.8; max-height: 400px; overflow-y: auto; }
  .orig-content h1, .orig-content h2, .orig-content h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 12px 0 6px; }
  .orig-content p { margin: 6px 0; }
  .orig-content ul, .orig-content ol { padding-left: 18px; margin: 6px 0; }
  .orig-content li { margin: 3px 0; }
  .orig-content code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.82em; font-family: 'Fira Code', monospace; }
  .orig-content pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; overflow-x: auto; margin: 10px 0; }
  .orig-content blockquote { border-left: 3px solid #e2e8f0; padding-left: 12px; color: #94a3b8; margin: 8px 0; }
  .orig-content a { color: #6366f1; text-decoration: none; }
  .footer { text-align: center; font-size: 0.72rem; color: #94a3b8; margin-top: 24px; }
</style>
</head>
<body>
<div class="page">
  <h1>${escapeHtml(title)}</h1>
  
  <div class="conclusion">${escapeHtml(conclusion)}</div>

  <div class="section takeaways">
    <div class="section-title">📌 核心要点</div>
    ${takeaways.map((t, i) => `
    <div class="takeaway-item">
      <div class="takeaway-num">${i + 1}</div>
      <div class="takeaway-text">${escapeHtml(t)}</div>
    </div>`).join('')}
  </div>

  ${concepts.length > 0 ? `
  <div class="section concepts">
    <div class="section-title">🔑 关键概念</div>
    ${concepts.map(c => `
    <div class="concept-item">
      <div class="concept-term">${escapeHtml(c.term)}</div>
      <div class="concept-def">${escapeHtml(c.def)}</div>
    </div>`).join('')}
  </div>` : ''}

  <div class="orig-section">
    <div class="section-title">📄 原文内容</div>
    <div class="orig-content" id="orig"></div>
  </div>

  <div class="footer">由 Qwen2.5-VL-3B 生成 · LinkBox</div>
</div>
<script>
// Simple markdown to HTML renderer for original content
const md = ${JSON.stringify(truncated)};
function renderMd(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^#{3}\s+(.+)$/gm,'<h3>$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm,'<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>')
    .replace(/^\-\s+(.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')
    .replace(/\n\n+/g,'</p><p>').replace(/^/,'<p>').replace(/$/,'</p>')
    .replace(/<p>(<[hul])/g,'$1').replace(/(<\/[hul][^>]*>)<\/p>/g,'$1');
}
document.getElementById('orig').innerHTML = renderMd(md);
</script>
</body>
</html>`;

  return html;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
