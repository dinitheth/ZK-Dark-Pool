// ManifoldService.js — Fetches real prediction market data from Manifold Markets API
// Docs: https://docs.manifold.markets/api

const BASE_URL = 'https://api.manifold.markets/v0'

// Categories to fetch (search terms)
const CATEGORIES = [
    { term: 'bitcoin price', label: 'Crypto' },
    { term: 'ethereum', label: 'Crypto' },
    { term: 'US president', label: 'Politics' },
    { term: 'AI artificial intelligence', label: 'Tech' },
    { term: 'world cup', label: 'Sports' },
    { term: 'stock market S&P', label: 'Finance' },
]

class ManifoldService {
    constructor() {
        this.cache = null
        this.cacheTime = 0
        this.CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    }

    /**
     * Fetch popular BINARY markets from Manifold across multiple categories
     */
    async getPopularMarkets(limit = 20) {
        // Return cache if fresh
        if (this.cache && Date.now() - this.cacheTime < this.CACHE_TTL) {
            return this.cache
        }

        try {
            // Fetch from multiple categories in parallel
            const perCategory = Math.ceil(limit / CATEGORIES.length)
            const fetches = CATEGORIES.map(cat =>
                this._searchMarkets(cat.term, perCategory, cat.label)
            )
            const results = await Promise.allSettled(fetches)

            // Flatten, deduplicate, and sort by volume
            const seen = new Set()
            let allMarkets = []
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    for (const m of result.value) {
                        if (!seen.has(m.id)) {
                            seen.add(m.id)
                            allMarkets.push(m)
                        }
                    }
                }
            }

            // Sort by total volume descending
            allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0))

            // Limit
            allMarkets = allMarkets.slice(0, limit)

            this.cache = allMarkets
            this.cacheTime = Date.now()
            return allMarkets
        } catch (err) {
            console.error('ManifoldService: Error fetching markets', err)
            return this.cache || []
        }
    }

    /**
     * Fetch a single market by Manifold slug or ID
     */
    async getMarketBySlug(slug) {
        try {
            const res = await fetch(`${BASE_URL}/slug/${slug}`)
            if (!res.ok) return null
            const data = await res.json()
            return this._normalize(data)
        } catch (err) {
            console.error('ManifoldService: Error fetching market by slug', err)
            return null
        }
    }

    async getMarketById(id) {
        try {
            const res = await fetch(`${BASE_URL}/market/${id}`)
            if (!res.ok) return null
            const data = await res.json()
            return this._normalize(data)
        } catch (err) {
            console.error('ManifoldService: Error fetching market by id', err)
            return null
        }
    }

    /**
     * Search Manifold for BINARY markets
     */
    async _searchMarkets(term, limit, categoryLabel) {
        const url = `${BASE_URL}/search-markets?term=${encodeURIComponent(term)}&limit=${limit}&sort=liquidity&filter=open&contractType=BINARY`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Manifold API ${res.status}`)
        const data = await res.json()
        return data
            .filter(m => m.outcomeType === 'BINARY' && !m.isResolved)
            .map(m => this._normalize(m, categoryLabel))
    }

    /**
     * Normalize Manifold market data into our app's format
     */
    _normalize(m, categoryLabel) {
        const prob = (m.probability || 0.5) * 100
        const yesPool = Math.round((m.pool?.YES || 0) * 100) // convert to "microcredits"-like units
        const noPool = Math.round((m.pool?.NO || 0) * 100)

        return {
            id: `manifold_${m.id}`,
            manifoldId: m.id,
            manifoldSlug: m.slug,
            manifoldUrl: m.url,
            question: m.question,
            category: categoryLabel || 'Other',
            resolved: m.isResolved || false,
            resolution: m.resolution || null,
            probability: prob,
            totalYes: yesPool,
            totalNo: noPool,
            totalPool: yesPool + noPool,
            volume: Math.round(m.volume || 0),
            totalLiquidity: Math.round(m.totalLiquidity || 0),
            uniqueBettors: m.uniqueBettorCount || 0,
            closeTime: m.closeTime,
            createdTime: m.createdTime,
            creatorName: m.creatorName,
            isManifold: true, // flag to distinguish from on-chain markets
            // Compatibility fields for MarketCard
            liquidityYes: 0,
            liquidityNo: 0,
            totalClaimed: 0,
            resolutionTime: m.closeTime ? Math.floor(m.closeTime / 1000) : 0,
        }
    }

    /**
     * Format close time to readable date
     */
    formatCloseDate(closeTime) {
        if (!closeTime) return 'No end date'
        return new Date(closeTime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    /**
     * Format close time to time remaining
     */
    formatTimeRemaining(closeTime) {
        if (!closeTime) return 'Ongoing'
        const diff = closeTime - Date.now()
        if (diff <= 0) return 'Ended'
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        if (days > 365) return `~${Math.floor(days / 365)}y left`
        if (days > 0) return `~${days}d ${hours}h left`
        return `~${hours}h left`
    }
}

const manifoldService = new ManifoldService()
export default manifoldService
