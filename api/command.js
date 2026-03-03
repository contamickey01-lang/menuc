function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'method' });
    return;
  }
  try {
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
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      sendJSON(res, 500, { error: 'env' });
      return;
    }
    const cmd = JSON.stringify({
      action,
      device: device || 'default',
      nonce,
      ts: Date.now()
    });
    const target = `${url}/storage/v1/object/loader/commands/${encodeURIComponent(device || 'default')}.json`;
    const putRes = await fetch(target, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Content-Type': 'application/json',
        'x-upsert': 'true'
      },
      body: cmd
    });
    if (!putRes.ok) {
      const txt = await putRes.text();
      sendJSON(res, 500, { error: 'storage', message: txt });
      return;
    }
    sendJSON(res, 200, { ok: true });
  } catch (e) {
    sendJSON(res, 500, { error: 'unexpected' });
  }
};
