function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    sendJSON(res, 405, { error: 'method' });
    return;
  }
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      sendJSON(res, 500, { error: 'env' });
      return;
    }
    const body = JSON.stringify({
      prefix: 'commands/',
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
    const r = await fetch(`${url}/storage/v1/object/list/loader`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Content-Type': 'application/json'
      },
      body
    });
    if (!r.ok) {
      const t = await r.text();
      sendJSON(res, 500, { error: 'list', message: t });
      return;
    }
    const j = await r.json();
    const names = Array.isArray(j) ? j.map(e => (e.name || '')).filter(n => n.endsWith('.json')).map(n => n.replace(/\.json$/,'')) : [];
    sendJSON(res, 200, { devices: names });
  } catch (e) {
    sendJSON(res, 500, { error: 'unexpected' });
  }
};
