function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  try {
    const mod = await import('@vercel/blob');
    const put = mod.put;
    const list = mod.list;
    if (req.method === 'POST') {
      let body = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', resolve);
      });
      let payload = {};
      try { payload = JSON.parse(body || '{}'); } catch {}
      const { action, device, nonce } = payload;
      if (!action || !nonce) {
        sendJSON(res, 400, { error: 'payload' });
        return;
      }
      const cmd = JSON.stringify({
        action,
        device: device || 'default',
        nonce,
        ts: Date.now()
      });
      const pathname = `commands/${encodeURIComponent(device || 'default')}.json`;
      const r = await put(pathname, cmd, { access: 'public', contentType: 'application/json' });
      sendJSON(res, 200, { ok: true, url: r.url });
      return;
    }
    if (req.method === 'GET') {
      const device = (new URL(req.url, 'http://x')).searchParams.get('device') || 'default';
      const prefix = `commands/${encodeURIComponent(device)}.json`;
      const r = await list({ prefix });
      const b = Array.isArray(r.blobs) ? r.blobs[0] : null;
      if (!b) { sendJSON(res, 404, { error: 'not_found' }); return; }
      const j = await (await fetch(b.downloadUrl)).json().catch(() => null);
      if (!j) { sendJSON(res, 500, { error: 'parse' }); return; }
      sendJSON(res, 200, j);
      return;
    }
    sendJSON(res, 405, { error: 'method' });
  } catch (e) {
    sendJSON(res, 500, { error: 'unexpected' });
  }
};
