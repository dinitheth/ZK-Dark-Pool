/**
 * AleoService - Handles all Aleo blockchain interactions
 * 
 * This service provides:
 * - Network client for reading public state (mappings)
 * - Transaction building helpers
 * - Program execution utilities
 * - Caching for performance
 */

import { ALEO_CONFIG, API_BASE_URL } from '../config'

class AleoService {
    constructor() {
        this.rpcUrl = ALEO_CONFIG.rpcUrl
        this.programId = ALEO_CONFIG.programId
        this.cache = new Map()
        this.cacheTimeout = 30000
        this.blockHeightCache = null
        this.blockHeightCacheTime = 0
    }

    getCached(key) {
        const cached = this.cache.get(key)
        if (cached && Date.now() - cached.time < this.cacheTimeout) {
            return cached.data
        }
        return null
    }

    setCache(key, data) {
        this.cache.set(key, { data, time: Date.now() })
    }

    async getMappingValue(mappingName, key) {
        const cacheKey = `mapping:${mappingName}:${key}`
        const cached = this.getCached(cacheKey)
        if (cached) return cached

        try {
            const url = `${this.rpcUrl}/testnet/program/${this.programId}/mapping/${mappingName}/${key}`
            const response = await fetch(url)

            if (!response.ok) {
                if (response.status === 404) {
                    return null
                }
                throw new Error(`Failed to fetch mapping: ${response.statusText}`)
            }

            const data = await response.text()
            this.setCache(cacheKey, data || null)
            return data || null
        } catch (error) {
            console.error(`Error reading mapping ${mappingName}[${key}]:`, error)
            return null
        }
    }

    async getMarket(marketId) {
        const key = String(marketId).includes('field') ? marketId : `${marketId}field`
        const value = await this.getMappingValue(ALEO_CONFIG.mappings.markets, key)
        if (!value) return null
        return this.parseMarketInfo(value)
    }

    async getPool(marketId) {
        const key = String(marketId).includes('field') ? marketId : `${marketId}field`
        const value = await this.getMappingValue(ALEO_CONFIG.mappings.pools, key)
        if (!value) return null
        return this.parsePoolState(value)
    }

    parseMarketInfo(value) {
        try {
            const cleaned = value.replace(/^"|"$/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim()
            const creatorMatch = cleaned.match(/creator:\s*(aleo1[a-z0-9]+)/)
            const resolutionMatch = cleaned.match(/resolution_height:\s*(\d+)u32/)
            const resolvedMatch = cleaned.match(/resolved:\s*(true|false)/)
            const outcomeMatch = cleaned.match(/winning_outcome:\s*(\d+)u8/)
            const oracleMatch = cleaned.match(/oracle:\s*(aleo1[a-z0-9]+)/)

            if (!creatorMatch || !resolutionMatch || !resolvedMatch || !outcomeMatch) {
                return null
            }

            return {
                creator: creatorMatch[1],
                resolutionHeight: parseInt(resolutionMatch[1]),
                resolved: resolvedMatch[1] === 'true',
                winningOutcome: parseInt(outcomeMatch[1]),
                oracle: oracleMatch ? oracleMatch[1] : creatorMatch[1],
            }
        } catch (error) {
            return null
        }
    }

    parsePoolState(value) {
        try {
            const cleaned = value.replace(/^"|"$/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim()
            const yesMatch = cleaned.match(/total_yes:\s*(\d+)u64/)
            const noMatch = cleaned.match(/total_no:\s*(\d+)u64/)
            const poolMatch = cleaned.match(/total_pool:\s*(\d+)u64/)
            const liqYesMatch = cleaned.match(/liquidity_yes:\s*(\d+)u64/)
            const liqNoMatch = cleaned.match(/liquidity_no:\s*(\d+)u64/)
            const claimedMatch = cleaned.match(/total_claimed:\s*(\d+)u64/)

            if (!yesMatch || !noMatch || !poolMatch) {
                return null
            }

            return {
                totalYes: parseInt(yesMatch[1]),
                totalNo: parseInt(noMatch[1]),
                totalPool: parseInt(poolMatch[1]),
                liquidityYes: liqYesMatch ? parseInt(liqYesMatch[1]) : 0,
                liquidityNo: liqNoMatch ? parseInt(liqNoMatch[1]) : 0,
                totalClaimed: claimedMatch ? parseInt(claimedMatch[1]) : 0,
            }
        } catch (error) {
            return null
        }
    }

    async programExists() {
        const cached = this.getCached('programExists')
        if (cached !== null) return cached

        try {
            const url = `${this.rpcUrl}/testnet/program/${this.programId}`
            const response = await fetch(url)
            const exists = response.ok
            this.setCache('programExists', exists)
            console.log('Program exists:', exists)
            return exists
        } catch (error) {
            return false
        }
    }

    async getCurrentBlockHeight() {
        if (this.blockHeightCache && Date.now() - this.blockHeightCacheTime < 10000) {
            return this.blockHeightCache
        }

        try {
            const url = `${this.rpcUrl}/testnet/block/height/latest`
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error('Failed to fetch block height')
            }
            const height = parseInt(await response.text())
            this.blockHeightCache = height
            this.blockHeightCacheTime = Date.now()
            return height
        } catch (error) {
            return this.blockHeightCache || 14000000
        }
    }

    async getMarketCount() {
        const cached = this.getCached('marketCount')
        if (cached !== null) return cached

        try {
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketCount, '0u64')
            if (!value) return 0
            const match = value.match(/(\d+)u64/)
            const count = match ? parseInt(match[1]) : 0
            this.setCache('marketCount', count)
            return count
        } catch (error) {
            return 0
        }
    }

    async getMarketIdAtIndex(index) {
        try {
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketIds, `${index}u64`)
            if (!value) return null
            const match = value.match(/(\d+)field/)
            return match ? match[1] : null
        } catch (error) {
            return null
        }
    }

    async getMarketQuestionHash(marketId) {
        try {
            const key = String(marketId).includes('field') ? marketId : `${marketId}field`
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketQuestions, key)
            if (!value) return null
            const match = value.match(/(\d+)field/)
            return match ? match[1] : null
        } catch (error) {
            return null
        }
    }

    async getAllMarkets(forceRefresh = false) {
        try {
            if (!forceRefresh) {
                const cached = await this.fetchCachedMarkets()
                if (cached.length > 0) {
                    console.log('Loaded from cache:', cached.length, 'markets')
                    this.refreshMarketsInBackground()
                    return cached
                }
            }

            return await this.fetchMarketsFromBlockchain()
        } catch (error) {
            console.error('Error fetching all markets:', error)
            return []
        }
    }

    async fetchCachedMarkets() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/markets/cached`)
            if (response.ok) {
                const data = await response.json()
                if (data.markets && data.markets.length > 0) {
                    return data.markets
                }
            }
        } catch (error) {
            console.log('Cache miss, fetching from blockchain')
        }
        return []
    }

    async refreshMarketsInBackground() {
        setTimeout(async () => {
            try {
                const markets = await this.fetchMarketsFromBlockchain()
                if (markets.length > 0) {
                    await fetch(`${API_BASE_URL}/api/markets/cache`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ markets })
                    })
                    console.log('Cache updated with fresh blockchain data')
                }
            } catch (error) {
                console.error('Background refresh failed:', error)
            }
        }, 100)
    }

    async fetchMarketsFromBlockchain() {
        const count = await this.getMarketCount()
        console.log('Total markets on-chain:', count)

        if (count === 0) return []

        const [indexedQuestions, blockHeight] = await Promise.all([
            this.fetchAllQuestionsFromBackend(),
            this.getCurrentBlockHeight()
        ])

        const idPromises = []
        for (let i = 0; i < count; i++) {
            idPromises.push(this.getMarketIdAtIndex(i))
        }
        const marketIds = await Promise.all(idPromises)
        const validIds = marketIds.filter(id => id !== null)

        const markets = await Promise.all(validIds.map(async (marketId) => {
            const [marketInfo, poolState] = await Promise.all([
                this.getMarket(marketId),
                this.getPool(marketId)
            ])

            const cleanId = String(marketId).replace('field', '')
            const backendData = indexedQuestions[cleanId]

            return {
                id: cleanId,
                question: backendData ? backendData.question : `Market #${cleanId}`,
                ipfsCid: backendData?.ipfsCid,
                ...marketInfo,
                totalYes: poolState?.totalYes || 0,
                totalNo: poolState?.totalNo || 0,
                totalPool: poolState?.totalPool || 0,
                liquidityYes: poolState?.liquidityYes || 0,
                liquidityNo: poolState?.liquidityNo || 0,
                totalClaimed: poolState?.totalClaimed || 0,
                currentBlockHeight: blockHeight,
            }
        }))

        if (markets.length > 0) {
            fetch(`${API_BASE_URL}/api/markets/cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markets })
            }).catch(() => {})
        }

        return markets
    }

    async fetchAllQuestionsFromBackend() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/questions`)
            if (response.ok) {
                const data = await response.json()
                const map = {}
                if (Array.isArray(data)) {
                    data.forEach(q => { map[q.marketId] = q })
                }
                console.log('Fetched indexed questions:', Object.keys(map).length)
                return map
            }
        } catch (error) {
            console.error('Failed to fetch indexed questions:', error)
        }
        return {}
    }
    
    async getMarketWithDetails(marketId) {
        try {
            const cleanId = String(marketId).replace('field', '')
            
            const [marketInfo, poolState, backendData, blockHeight] = await Promise.all([
                this.getMarket(cleanId),
                this.getPool(cleanId),
                this.fetchQuestionFromBackend(cleanId),
                this.getCurrentBlockHeight()
            ])
            
            if (!marketInfo) return null
            
            return {
                id: cleanId,
                question: backendData?.question || `Market #${cleanId}`,
                description: backendData?.description || '',
                ipfsCid: backendData?.ipfsCid,
                ...marketInfo,
                totalYes: poolState?.totalYes || 0,
                totalNo: poolState?.totalNo || 0,
                totalPool: poolState?.totalPool || 0,
                liquidityYes: poolState?.liquidityYes || 0,
                liquidityNo: poolState?.liquidityNo || 0,
                totalClaimed: poolState?.totalClaimed || 0,
                currentBlockHeight: blockHeight,
            }
        } catch (error) {
            console.error('Error fetching market details:', error)
            return null
        }
    }
    
    async fetchQuestionFromBackend(marketId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/question/${marketId}`)
            if (response.ok) {
                return await response.json()
            }
        } catch (error) {}
        return null
    }

    buildPlaceBetInputs(marketId, outcome, amount) {
        const cleanId = String(marketId).replace('field', '')
        return [
            `${cleanId}field`,
            `${outcome}u8`,
            `${amount}u64`,
        ]
    }

    buildCreateMarketInputs(marketId, resolutionHeight, questionHash, oracleAddress) {
        const hashStr = typeof questionHash === 'bigint' ? questionHash.toString() : String(questionHash)
        return [
            `${marketId}field`,
            `${resolutionHeight}u32`,
            `${hashStr}field`,
            oracleAddress,
        ]
    }

    buildResolveMarketInputs(marketId, winningOutcome) {
        return [
            `${marketId}field`,
            `${winningOutcome}u8`,
        ]
    }

    // ============================================
    // PAYOUT & ODDS CALCULATION
    // ============================================

    /**
     * Calculate proportional payout: (betAmount × totalPool) ÷ winningPool
     * Uses BigInt to match on-chain u128 math exactly
     */
    calculatePayout(betAmount, outcome, pool) {
        const winningPool = outcome === 1 ? pool.totalYes : pool.totalNo
        if (!winningPool || winningPool === 0) return 0
        const bet = BigInt(betAmount)
        const total = BigInt(pool.totalPool)
        const winning = BigInt(winningPool)
        return Number((bet * total) / winning)
    }

    /**
     * Calculate implied probability from pool ratios
     * Returns { yes: number, no: number } as percentages
     */
    calculateImpliedOdds(pool) {
        const total = (pool.totalYes || 0) + (pool.totalNo || 0)
        if (total === 0) return { yes: 50, no: 50 }
        return {
            yes: ((pool.totalYes || 0) / total) * 100,
            no: ((pool.totalNo || 0) / total) * 100,
        }
    }

    /**
     * Estimate potential payout if user places a new bet
     * Accounts for the user's bet changing the pool size
     */
    estimatePayout(betAmount, outcome, pool) {
        const currentYes = pool.totalYes || 0
        const currentNo = pool.totalNo || 0
        const currentTotal = pool.totalPool || 0

        const newYes = outcome === 1 ? currentYes + betAmount : currentYes
        const newNo = outcome === 0 ? currentNo + betAmount : currentNo
        const newTotal = currentTotal + betAmount
        const winningPool = outcome === 1 ? newYes : newNo

        if (winningPool === 0) return 0
        return Math.floor((betAmount * newTotal) / winningPool)
    }

    /**
     * Calculate the multiplier for a given outcome
     */
    getPayoutMultiplier(outcome, pool) {
        const winningPool = outcome === 1 ? pool.totalYes : pool.totalNo
        if (!winningPool || winningPool === 0) return 0
        return pool.totalPool / winningPool
    }

    // ============================================
    // NEW TRANSACTION BUILDERS
    // ============================================

    buildSeedLiquidityInputs(marketId, yesAmount, noAmount) {
        const cleanId = String(marketId).replace('field', '')
        return [
            `${cleanId}field`,
            `${yesAmount}u64`,
            `${noAmount}u64`,
        ]
    }

    buildClaimWinningsInputs(betRecord, claimedPayout) {
        // betRecord is the raw record from the wallet
        return [
            betRecord, // private Bet record
            `${claimedPayout}u64`, // public claimed_payout
        ]
    }

    buildWithdrawLiquidityInputs(lpTokenRecord, expectedReturn) {
        return [
            lpTokenRecord, // private LPToken record
            `${expectedReturn}u64`, // public expected_return
        ]
    }
}

export const aleoService = new AleoService()
export default aleoService
