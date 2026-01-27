import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const { Pool } = pg
const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
})

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS market_questions (
                market_id VARCHAR(255) PRIMARY KEY,
                question TEXT NOT NULL,
                hash VARCHAR(255),
                ipfs_cid VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS markets_cache (
                market_id VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
        console.log('Database initialized successfully')
    } catch (error) {
        console.error('Database initialization failed:', error)
    }
}

initDatabase()

app.post('/api/index', async (req, res) => {
    const { hash, question, ipfsCid, marketId } = req.body

    if (!marketId || !question) {
        return res.status(400).json({ error: 'marketId and question required' })
    }

    try {
        const cleanMarketId = String(marketId).replace('field', '')
        
        await pool.query(`
            INSERT INTO market_questions (market_id, question, hash, ipfs_cid)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (market_id) 
            DO UPDATE SET question = $2, hash = $3, ipfs_cid = $4, created_at = CURRENT_TIMESTAMP
        `, [cleanMarketId, question, hash || null, ipfsCid || null])

        console.log(`Indexed question for market ${cleanMarketId}: "${question.slice(0, 40)}..."`)
        res.json({ success: true, marketId: cleanMarketId })
    } catch (error) {
        console.error('Error indexing question:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/question/:marketId', async (req, res) => {
    try {
        const cleanId = String(req.params.marketId).replace('field', '')
        
        const result = await pool.query(
            'SELECT * FROM market_questions WHERE market_id = $1',
            [cleanId]
        )

        if (result.rows.length > 0) {
            const row = result.rows[0]
            res.json({
                marketId: row.market_id,
                question: row.question,
                hash: row.hash,
                ipfsCid: row.ipfs_cid,
                createdAt: row.created_at
            })
        } else {
            res.status(404).json({ error: 'Question not found' })
        }
    } catch (error) {
        console.error('Error fetching question:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/questions', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM market_questions ORDER BY created_at DESC'
        )
        
        const questions = result.rows.map(row => ({
            marketId: row.market_id,
            question: row.question,
            hash: row.hash,
            ipfsCid: row.ipfs_cid,
            createdAt: row.created_at
        }))
        
        res.json(questions)
    } catch (error) {
        console.error('Error fetching questions:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM market_questions')
        res.json({ status: 'ok', storage: 'postgresql', questionCount: parseInt(result.rows[0].count) })
    } catch (error) {
        res.json({ status: 'ok', storage: 'postgresql', error: error.message })
    }
})

app.get('/api/markets/cached', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT mc.market_id, mc.data, mc.updated_at, mq.question
            FROM markets_cache mc
            LEFT JOIN market_questions mq ON mc.market_id = mq.market_id
            ORDER BY mc.updated_at DESC
        `)
        
        const markets = result.rows.map(row => ({
            ...row.data,
            id: row.market_id,
            question: row.question || row.data.question || `Market #${row.market_id}`,
            cachedAt: row.updated_at
        }))
        
        res.json({ markets, cached: true })
    } catch (error) {
        console.error('Error fetching cached markets:', error)
        res.json({ markets: [], cached: false })
    }
})

app.post('/api/markets/cache', async (req, res) => {
    const { markets } = req.body
    
    if (!Array.isArray(markets)) {
        return res.status(400).json({ error: 'markets array required' })
    }

    try {
        for (const market of markets) {
            const cleanId = String(market.id).replace('field', '')
            await pool.query(`
                INSERT INTO markets_cache (market_id, data, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (market_id) 
                DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
            `, [cleanId, JSON.stringify(market)])
        }
        
        console.log(`Cached ${markets.length} markets`)
        res.json({ success: true, count: markets.length })
    } catch (error) {
        console.error('Error caching markets:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Question indexer running on port ${PORT}`)
})
