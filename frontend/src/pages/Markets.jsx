import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarketCard from '../components/MarketCard'
import useAleo from '../hooks/useAleo'
import { ALEO_CONFIG, getExplorerUrl } from '../config'
import aleoService from '../services/AleoService'
import marketStorage from '../services/MarketStorage'

// Demo markets for display when program not deployed
const DEMO_MARKETS = [
    {
        id: '1',
        question: 'Will Bitcoin reach $100,000 by Q2 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 90,
        resolved: false,
        totalYes: 45000,
        totalNo: 32000,
        creator: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9',
    },
    {
        id: '2',
        question: 'Will Ethereum complete Danksharding in 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 365,
        resolved: false,
        totalYes: 28500,
        totalNo: 19200,
        creator: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9',
    },
    {
        id: '3',
        question: 'Will US approve a spot ETH ETF by March 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 60,
        resolved: false,
        totalYes: 67000,
        totalNo: 23000,
        creator: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9',
    },
    {
        id: '4',
        question: 'Will Aleo TVL exceed $1B by end of 2026?',
        resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 340,
        resolved: false,
        totalYes: 15000,
        totalNo: 8000,
        creator: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9',
    },
]

export default function Markets() {
    const { programDeployed, isCheckingProgram, connected } = useAleo()
    const [markets, setMarkets] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [showAddMarket, setShowAddMarket] = useState(false)
    const [addMarketId, setAddMarketId] = useState('')
    const [addMarketQuestion, setAddMarketQuestion] = useState('')
    const [addMarketError, setAddMarketError] = useState('')

    const handleAddMarket = () => {
        if (!addMarketId.trim() || !addMarketQuestion.trim()) {
            setAddMarketError('Please enter both Market ID and Question')
            return
        }
        const marketId = addMarketId.replace('field', '').trim()
        marketStorage.addMarket(marketId, addMarketQuestion.trim())
        setAddMarketId('')
        setAddMarketQuestion('')
        setAddMarketError('')
        setShowAddMarket(false)
        window.location.reload()
    }

    useEffect(() => {
        const loadMarkets = async () => {
            setIsLoading(true)

            if (!programDeployed) {
                console.log('Program not deployed, showing demo markets')
                setMarkets(DEMO_MARKETS)
                setIsLoading(false)
                return
            }

            try {
                console.log('Fetching markets from blockchain registry...')
                
                // First, try to fetch from on-chain registry
                const onChainMarkets = await aleoService.getAllMarkets()
                console.log('On-chain markets:', onChainMarkets)
                
                // Also get locally tracked markets (for pending ones not yet on-chain)
                const localMarkets = marketStorage.getMarketIds()
                console.log('Local tracked markets:', localMarkets)
                
                // Merge on-chain and local markets, preferring on-chain data
                const onChainIds = new Set(onChainMarkets.map(m => String(m.id)))
                
                // Add local markets that aren't on-chain yet (pending confirmation)
                const pendingMarkets = localMarkets
                    .filter(local => !onChainIds.has(String(local.id)))
                    .map(local => ({
                        id: local.id,
                        question: local.question,
                        pending: true,
                        resolved: false,
                        totalYes: 0,
                        totalNo: 0,
                        totalPool: 0,
                        createdAt: local.createdAt,
                    }))
                
                // For on-chain markets, try to get question from local storage if available
                const enrichedOnChainMarkets = onChainMarkets.map(market => {
                    const localMatch = localMarkets.find(l => String(l.id) === String(market.id))
                    return {
                        ...market,
                        question: localMatch?.question || `Market #${market.id}`,
                        pending: false,
                    }
                })
                
                const allMarkets = [...enrichedOnChainMarkets, ...pendingMarkets]
                console.log('All markets:', allMarkets)
                
                if (allMarkets.length === 0) {
                    console.log('No markets found. Create one to get started!')
                }
                
                setMarkets(allMarkets)

            } catch (error) {
                console.error('Error loading markets:', error)
                setMarkets(DEMO_MARKETS) // Fallback to demo
            }

            setIsLoading(false)
        }

        loadMarkets()
    }, [programDeployed])

    const filteredMarkets = markets.filter(market => {
        if (filter === 'open') return !market.resolved
        if (filter === 'resolved') return market.resolved
        return true
    })

    return (
        <div className="markets-page">
            <div className="markets-header">
                <div>
                    <h2>Prediction Markets</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                        Bet on outcomes with complete privacy. Your positions are hidden until resolution.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button 
                        className="btn btn-outline"
                        onClick={() => setShowAddMarket(!showAddMarket)}
                    >
                        Track Existing
                    </button>
                    <Link to="/create" className="btn btn-primary">
                        + Create Market
                    </Link>
                </div>
            </div>

            {showAddMarket && (
                <div style={{
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Track an Existing Market</h4>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                        If you created markets from another browser or device, enter the market details to track them here.
                    </p>
                    {addMarketError && (
                        <div style={{ color: 'var(--color-no)', marginBottom: 'var(--spacing-md)' }}>
                            {addMarketError}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Market ID (e.g., 123456789)"
                            value={addMarketId}
                            onChange={(e) => setAddMarketId(e.target.value)}
                        />
                        <input
                            type="text"
                            className="input"
                            placeholder="Market Question"
                            value={addMarketQuestion}
                            onChange={(e) => setAddMarketQuestion(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn btn-primary" onClick={handleAddMarket}>
                                Add Market
                            </button>
                            <button className="btn btn-outline" onClick={() => setShowAddMarket(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <button
                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`btn ${filter === 'open' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFilter('open')}
                >
                    Open
                </button>
                <button
                    className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFilter('resolved')}
                >
                    Resolved
                </button>
            </div>

            {isLoading ? (
                <div className="markets-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="market-card">
                            <div className="skeleton" style={{ height: 24, width: '80%', marginBottom: 16 }} />
                            <div className="skeleton" style={{ height: 60, marginBottom: 16 }} />
                            <div className="skeleton" style={{ height: 20, width: '50%' }} />
                        </div>
                    ))}
                </div>
            ) : filteredMarkets.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"></div>
                    <h3 className="empty-state-title">No markets found</h3>
                    <p>Be the first to create a prediction market!</p>
                    <Link to="/create" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                        Create Market
                    </Link>
                </div>
            ) : (
                <div className="markets-grid">
                    {filteredMarkets.map(market => (
                        <MarketCard key={market.id} market={market} />
                    ))}
                </div>
            )}

            <div style={{
                marginTop: 'var(--spacing-2xl)',
                padding: 'var(--spacing-lg)',
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)'
            }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    Privacy Guarantee
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Unlike traditional prediction markets, ZK Dark Pool uses <strong>zero-knowledge proofs</strong> to keep your bets completely private.
                    No one can see your position, bet size, or strategy — not even the market creator.
                    Only after resolution can you prove you won, without revealing your original bet details.
                </p>
            </div>
        </div>
    )
}
