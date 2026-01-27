import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
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

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Question indexer running on port ${PORT}`)
})
