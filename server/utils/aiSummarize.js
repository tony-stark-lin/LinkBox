const VLLM_BASE = process.env.VLLM_URL || 'http://192.168.1.23:8000/v1';
const MODEL = process.env.VLLM_MODEL || 'qwen3.5-35b-a3b';

/**
 * Summarize text using Spark 1's vLLM service (Qwen3.5-35B).
 * Returns a concise Chinese summary.
 */
export async function summarizeContent(text, type = 'link') {
  const truncated = text.slice(0, 3000); // avoid token overflow

  const systemPrompt = '你是一个专业的内容摘要助手。请直接输出摘要，不要有任何多余的说明。';
  const userPrompt = type === 'text'
    ? `请用简洁的中文对以下内容写一段摘要（80字以内，直接输出摘要文字）：\n\n${truncated}`
    : `请用简洁的中文对以下网页内容写一段摘要（80字以内，直接输出摘要文字）：\n\n标题：${truncated}`;

  const response = await fetch(`${VLLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`vLLM error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';

  // Strip Qwen3 thinking tokens <think>...</think>
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  return content;
}
