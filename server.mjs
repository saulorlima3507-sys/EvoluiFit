import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Only public application files are exposed; no uploads or API endpoints.
const root = new URL('./', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/media/elephant-logo.png', ['media/elephant-logo.png', 'image/png']],
  ['/media/qr-test.svg', ['media/qr-test.svg', 'image/svg+xml']],
  ['/media/exercise-videos.json', ['media/exercise-videos.json', 'application/json; charset=utf-8']],
  ['/media/recipe-videos.json', ['media/recipe-videos.json', 'application/json; charset=utf-8']],
  ['/media/credits.json', ['media/credits.json', 'application/json; charset=utf-8']],
  ['/account-client.js', ['account-client.js', 'text/javascript; charset=utf-8']],
  ['/auth-entry.js', ['auth-entry.js', 'text/javascript; charset=utf-8']],
  ['/sobre.html', ['sobre.html', 'text/html; charset=utf-8']],
  ['/sobre.css', ['sobre.css', 'text/css; charset=utf-8']],
  ['/conta.html', ['conta.html', 'text/html; charset=utf-8']],
  ['/conta.css', ['conta.css', 'text/css; charset=utf-8']],
  ['/conta.js', ['conta.js', 'text/javascript; charset=utf-8']],
  ['/app-age-input-6.js', ['app-age-input-6.js', 'text/javascript; charset=utf-8']],
  ['/auth-entry-age-input-6.js', ['auth-entry-age-input-6.js', 'text/javascript; charset=utf-8']],
  ['/questionario.html', ['questionario.html', 'text/html; charset=utf-8']],
  ['/questionario.css', ['questionario.css', 'text/css; charset=utf-8']],
  ['/questionario.js', ['questionario.js', 'text/javascript; charset=utf-8']],
  ['/recipes150.js', ['recipes150.js', 'text/javascript; charset=utf-8']],
  ['/media/recipes150.json', ['media/recipes150.json', 'application/json; charset=utf-8']],
  ['/app-onboarding-7.js', ['app-onboarding-7.js', 'text/javascript; charset=utf-8']],
  ['/auth-entry-onboarding-7.js', ['auth-entry-onboarding-7.js', 'text/javascript; charset=utf-8']],
  ...['theme.js','app-update-18.js','auth-entry-update-18.js','recipe-covers.js'].map(file=>['/'+file,[file,'text/javascript; charset=utf-8']]),
  ['/theme.css',['theme.css','text/css; charset=utf-8']],
  ['/media/recipe-cover-credits.json',['media/recipe-cover-credits.json','application/json; charset=utf-8']],
  ...['legal.js','legal-manifest.js','conta-legal-1.js','auth-entry-legal-1.js'].map(file=>['/'+file,[file,'text/javascript; charset=utf-8']]),
  ...['termos.html','privacidade.html','legal/2026-10-18.1/termos.html','legal/2026-10-18.1/privacidade.html'].map(file=>['/'+file,[file,'text/html; charset=utf-8']]),
  ['/legal.css',['legal.css','text/css; charset=utf-8']],
  ['/legal-manifest.json',['legal-manifest.json','application/json; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Método não permitido'); return; }
  let entry = files.get(path);
  const media = /^\/media\/(?:recipe-[0-5]|(?:squat|push|row|hinge|plank|lunge|shoulder|pull|bridge|deadbug|calf)-(?:home|gym))\.(mp4|jpg|vtt)$/.exec(path);
  if(media) entry = [path.slice(1), {mp4:'video/mp4',jpg:'image/jpeg',vtt:'text/vtt; charset=utf-8'}[media[1]]];
  if(/^\/legal\/[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+\/(?:termos|privacidade)\.html$/.test(path))entry=[path.slice(1),'text/html; charset=utf-8'];
  const cover=/^\/media\/recipe-covers\/[a-z0-9-]+\.webp$/.test(path);
  if(cover)entry=[path.slice(1),'image/webp'];
  if (!entry) { res.writeHead(404); res.end('Não encontrado'); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(entry[0], root)));
    const headers = {
      'Content-Type': entry[1],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://xoyaoxhmkmplqsxjooni.supabase.co; media-src 'self'; frame-src https://www.youtube-nocookie.com; connect-src 'self' https://xoyaoxhmkmplqsxjooni.supabase.co; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Length': body.length,
    };
    if(media?.[1]==='mp4') {
      headers['Accept-Ranges']='bytes';
      if(req.headers.range) {
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start, end;
        if(range && (range[1] || range[2])) {
          start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
          end=range[1]?(range[2]?Math.min(Number(range[2]),body.length-1):body.length-1):body.length-1;
        }
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=body.length||end<start) {res.writeHead(416,{'Content-Range':`bytes */${body.length}`});res.end();return;}
        const chunk=body.subarray(start,end+1);
        res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':chunk.length});
        res.end(req.method==='HEAD'?undefined:chunk);return;
      }
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Não foi possível abrir o arquivo'); }
});
server.listen(port, host, () => console.log(`EvoluiFit disponível em http://${host}:${port}`));
server.on('error', error => { console.error(`Falha ao iniciar: ${error.message}`); process.exit(1); });
