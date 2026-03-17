import * as cheerio from 'cheerio';
import https from 'https';
import http from 'http';

function httpGet(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const redirect = new URL(res.headers.location, url).href;
        return httpGet(redirect, maxRedirects - 1).then(resolve, reject);
      }
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        res.destroy();
        return resolve('');
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

export async function fetchLinkMeta(url) {
  const result = { title: '', description: '', thumbnail: '' };
  try {
    const html = await httpGet(url);
    if (!html) return result;

    const $ = cheerio.load(html);

    result.title = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text()
      || '';

    result.description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="twitter:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || '';

    result.thumbnail = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || '';

    // Fallback: WeChat articles and similar - extract first content image
    if (!result.thumbnail) {
      // WeChat: look for cover image or first article image
      const wxCover = $('var msg_cdn_url').text()
        || $('script').text().match(/msg_cdn_url\s*=\s*["']([^"']+)["']/)?.[1]
        || $('script').text().match(/cdn_url_1_1\s*=\s*["']([^"']+)["']/)?.[1];
      if (wxCover) {
        result.thumbnail = wxCover;
      } else {
        // Generic fallback: first large image in page content
        const contentSelectors = ['#js_content', '#content', 'article', '.content', 'main', 'body'];
        for (const sel of contentSelectors) {
          const img = $(sel).find('img[data-src], img[src]').first();
          const src = img.attr('data-src') || img.attr('src') || '';
          if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar')) {
            result.thumbnail = src;
            break;
          }
        }
      }
    }

    if (result.thumbnail && !result.thumbnail.startsWith('http')) {
      try { result.thumbnail = new URL(result.thumbnail, url).href; } catch { /* ignore */ }
    }

    result.title = result.title.trim().slice(0, 500);
    result.description = result.description.trim().slice(0, 1000);
  } catch {
    // Silently fail - metadata is best-effort
  }
  return result;
}
