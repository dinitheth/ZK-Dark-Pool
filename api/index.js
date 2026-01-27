import pg from 'pg';

const { Pool } = pg;

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api', '');

  try {
    const db = getPool();

    if (path === '/health' && req.method === 'GET') {
      const result = await db.query('SELECT COUNT(*) as count FROM market_questions');
      return res.json({ status: 'ok', storage: 'postgresql', questionCount: parseInt(result.rows[0].count) });
    }

    if (path === '/questions' && req.method === 'GET') {
      const result = await db.query('SELECT * FROM market_questions ORDER BY created_at DESC');
      const questions = result.rows.map(row => ({
        marketId: row.market_id,
        question: row.question,
        hash: row.hash,
        ipfsCid: row.ipfs_cid,
        createdAt: row.created_at
      }));
      return res.json(questions);
    }

    if (path.startsWith('/question/') && req.method === 'GET') {
      const marketId = path.replace('/question/', '').replace('field', '');
      const result = await db.query('SELECT * FROM market_questions WHERE market_id = $1', [marketId]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return res.json({
          marketId: row.market_id,
          question: row.question,
          hash: row.hash,
          ipfsCid: row.ipfs_cid,
          createdAt: row.created_at
        });
      }
      return res.status(404).json({ error: 'Question not found' });
    }

    if (path === '/index' && req.method === 'POST') {
      const { hash, question, ipfsCid, marketId } = req.body;
      if (!marketId || !question) {
        return res.status(400).json({ error: 'marketId and question required' });
      }
      const cleanMarketId = String(marketId).replace('field', '');
      await db.query(`
        INSERT INTO market_questions (market_id, question, hash, ipfs_cid)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (market_id) 
        DO UPDATE SET question = $2, hash = $3, ipfs_cid = $4, created_at = CURRENT_TIMESTAMP
      `, [cleanMarketId, question, hash || null, ipfsCid || null]);
      return res.json({ success: true, marketId: cleanMarketId });
    }

    if (path === '/markets/cached' && req.method === 'GET') {
      const result = await db.query(`
        SELECT mc.market_id, mc.data, mc.updated_at, mq.question
        FROM markets_cache mc
        LEFT JOIN market_questions mq ON mc.market_id = mq.market_id
        ORDER BY mc.updated_at DESC
      `);
      const markets = result.rows.map(row => ({
        ...row.data,
        id: row.market_id,
        question: row.question || row.data.question || `Market #${row.market_id}`,
        cachedAt: row.updated_at
      }));
      return res.json({ markets, cached: true });
    }

    if (path === '/markets/cache' && req.method === 'POST') {
      const { markets } = req.body;
      if (!Array.isArray(markets)) {
        return res.status(400).json({ error: 'markets array required' });
      }
      for (const market of markets) {
        const cleanId = String(market.id).replace('field', '');
        await db.query(`
          INSERT INTO markets_cache (market_id, data, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (market_id) 
          DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
        `, [cleanId, JSON.stringify(market)]);
      }
      return res.json({ success: true, count: markets.length });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
