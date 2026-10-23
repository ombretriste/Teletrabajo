// Función serverless de Vercel: guarda y devuelve el calendario CIFRADO de cada cuenta.
// El cifrado y el descifrado ocurren en el dispositivo; aquí solo llega un bloque ilegible.
//
//   GET  /api/sync                                              -> { configured, vars }  (comprobación)
//   POST /api/sync { action: 'register', user, auth, invite }  -> crea la cuenta (requiere la clave de registro)
//   POST /api/sync { action: 'pull', user, auth }              -> { rev, blob, at }
//   POST /api/sync { action: 'push', user, auth, blob, baseRev } -> { rev } | 409 { rev }
//
// `user` = SHA-256 del nombre de usuario y `auth` = clave derivada de la contraseña (PBKDF2),
// ambos calculados en el dispositivo. El servidor solo guarda el SHA-256 de `auth`.
// Almacenamiento: Upstash Redis (integración de Vercel), vía su API REST. Las claves empiezan por
// «u40:», así que comparte base de datos con UnderCTRL («fin:»), PayCTRL («nom:») y TaskCTRL («tsk:») sin mezclarse.
// La clave de registro es la misma que la de UnderCTRL y PayCTRL.

// Variables de la base de datos. Al conectar Upstash a un segundo proyecto, Vercel puede ponerles
// un prefijo propio (p. ej. NOMINAS_KV_REST_API_URL o STORAGE_REST_API_URL), así que se busca
// cualquier par …REST_API_URL / …REST_API_TOKEN (o …REDIS_REST_URL / …REDIS_REST_TOKEN).
function findRedisEnv(env = process.env) {
  const known = [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']];
  for (const [u, t] of known) if (env[u] && env[t]) return { url: env[u], token: env[t] };
  for (const k of Object.keys(env)) {
    const m = k.match(/^(.*)(REST_API_URL|REDIS_REST_URL)$/);
    if (!m || !/^https:\/\//.test(env[k] || '')) continue;
    const tk = m[1] + m[2].replace('URL', 'TOKEN');
    if (env[tk]) return { url: env[k], token: env[tk] };
  }
  return { url: null, token: null };
}
const { url: REDIS_URL, token: REDIS_TOKEN } = findRedisEnv();
const MAX_BLOB = 2 * 1024 * 1024;
const MAX_FAILS = 10;          // intentos fallidos de contraseña…
const FAIL_WINDOW_S = 15 * 60; // …por cada 15 minutos
const HEX64 = /^[a-f0-9]{64}$/;
// Clave de registro para crear cuentas nuevas. Se guarda solo su SHA-256; se puede cambiar
// sin tocar el código con la variable de entorno SIGNUP_CODE (texto) en Vercel.
const SIGNUP_CODE_SHA256 = 'ac1d2e03863dfb13990eb55aff6af1041c1b837f64c9f9fd5926bc7347c5c3db';
const MAX_SIGNUP_FAILS = 10; // intentos de clave de registro incorrecta por IP cada 15 min
// Escritura condicionada a la revisión: evita pisar cambios de otro dispositivo.
const PUSH_SCRIPT = `
local rev = tonumber(redis.call('HGET', KEYS[1], 'rev') or '0')
if rev ~= tonumber(ARGV[1]) then return {0, rev} end
redis.call('HSET', KEYS[1], 'blob', ARGV[2], 'rev', rev + 1, 'at', ARGV[3])
return {1, rev + 1}`;

async function redis(...command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparación en tiempo constante.
function sameHex(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // Comprobación (abrir /api/sync en el navegador): dice si hay base de datos y qué variables
  // de base de datos ve el servidor (solo los nombres, nunca sus valores).
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: !!(REDIS_URL && REDIS_TOKEN),
      vars: Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH|REST_API/.test(k)).sort(),
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'not-configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { action, user, auth } = body;
  if (!HEX64.test(user || '') || !HEX64.test(auth || '')) return res.status(400).json({ error: 'bad-request' });

  const key = `u40:acct:${user}`;
  const failKey = `u40:fail:${user}`;

  try {
    const verifier = await sha256hex(auth);

    if (action === 'register') {
      // Límite por IP para que la clave de registro no se pueda adivinar probando.
      const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'desconocida').split(',')[0].trim();
      const ipKey = `u40:signupfail:${await sha256hex(ip)}`;
      if ((Number(await redis('GET', ipKey)) || 0) >= MAX_SIGNUP_FAILS) return res.status(429).json({ error: 'too-many' });
      const expected = process.env.SIGNUP_CODE ? await sha256hex(process.env.SIGNUP_CODE) : SIGNUP_CODE_SHA256;
      const given = await sha256hex(String(body.invite ?? '').trim());
      if (!sameHex(given, expected)) {
        await redis('INCR', ipKey);
        await redis('EXPIRE', ipKey, FAIL_WINDOW_S);
        return res.status(403).json({ error: 'invite' });
      }
      const created = await redis('HSETNX', key, 'verifier', verifier);
      if (!created) return res.status(409).json({ error: 'exists' });
      await redis('HSET', key, 'rev', 0, 'created', Date.now());
      return res.status(200).json({ rev: 0 });
    }

    // Límite de intentos para frenar ataques de fuerza bruta a la contraseña.
    const fails = Number(await redis('GET', failKey)) || 0;
    if (fails >= MAX_FAILS) return res.status(429).json({ error: 'too-many' });

    const stored = await redis('HGET', key, 'verifier');
    if (!stored || !sameHex(stored, verifier)) {
      await redis('INCR', failKey);
      await redis('EXPIRE', failKey, FAIL_WINDOW_S);
      return res.status(401).json({ error: 'auth' }); // mismo error si no existe: no revela usuarios
    }
    if (fails) await redis('DEL', failKey);

    if (action === 'pull') {
      const [rev, blob, at] = await redis('HMGET', key, 'rev', 'blob', 'at');
      return res.status(200).json({ rev: Number(rev) || 0, blob: blob || null, at: Number(at) || null });
    }

    if (action === 'push') {
      const { blob, baseRev } = body;
      if (typeof blob !== 'string' || !blob || blob.length > MAX_BLOB || !Number.isInteger(baseRev)) {
        return res.status(400).json({ error: 'bad-request' });
      }
      const [ok, rev] = await redis('EVAL', PUSH_SCRIPT, 1, key, baseRev, blob, Date.now());
      if (!ok) return res.status(409).json({ error: 'conflict', rev });
      return res.status(200).json({ rev });
    }

    return res.status(400).json({ error: 'bad-action' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'storage' });
  }
};
