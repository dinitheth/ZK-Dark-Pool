import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import BetForm from '../components/BetForm'

// Demo market data (in production, fetched from blockchain)
const getMarketById = (id) => ({
    id,
    question: 'Will Bitcoin reach $100,000 by Q2 2026?',
    description: 'This market resolves YES if the price of Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange (Binance, Coinbase, Kraken) before July 1, 2026.',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 90,
    resolved: false,
    winningOutcome: null,
    totalYes: 45000,
    totalNo: 32000,
    creator: 'aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 7,
})

export default function MarketDetail() {
    const { id } = useParams()
    const [market, setMarket] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [betPlaced, setBetPlaced] = useState(null)

    useEffect(() => {
        const loadMarket = async () => {
            setIsLoading(true)
            await new Promise(resolve => setTimeout(resolve, 300))
            setMarket(getMarketById(id))
            setIsLoading(false)
        }
        loadMarket()
    }, [id])

    const handleBetPlaced = (bet) => {
        setBetPlaced(bet)
        // In production, refresh market data
    }

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount)
    }

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    if (isLoading) {
        return (
            <div className="market-detail-page">
                <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 300 }} />
            </div>
        )
    }

    if (!market) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"></div>
                <h3 className="empty-state-title">Market not found</h3>
                <Link to="/markets" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                    Back to Markets
                </Link>
            </div>
        )
    }

    const totalPool = market.totalYes + market.totalNo
    const yesPercentage = totalPool > 0 ? (market.totalYes / totalPool) * 100 : 50

    return (
        <div className="market-detail-page" style={{ maxWidth: 900, margin: '0 auto' }}>
            <Link to="/markets" style={{
                color: 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                marginBottom: 'var(--spacing-lg)'
            }}>
                ← Back to Markets
            </Link>

            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                    <h1 style={{ flex: 1, marginRight: 'var(--spacing-lg)' }}>{market.question}</h1>
                    <span className={`market-card-status ${market.resolved ? 'resolved' : 'open'}`}>
                        {market.resolved ? 'Resolved' : 'Open'}
                    </span>
                </div>

                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
                    {market.description}
                </p>

                {/* Pool visualization */}
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ color: 'var(--color-yes)', fontWeight: 600 }}>
                            YES {yesPercentage.toFixed(1)}%
                        </span>
                        <span style={{ color: 'var(--color-no)', fontWeight: 600 }}>
                            NO {(100 - yesPercentage).toFixed(1)}%
                        </span>
                    </div>
                    <div style={{
                        height: 12,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-no)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${yesPercentage}%`,
                            height: '100%',
                            background: 'var(--color-yes)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <div className="market-card-pool">
                    <div className="pool-stat">
                        <div className="pool-stat-label">Yes Pool</div>
                        <div className="pool-stat-value yes">{formatCredits(market.totalYes)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">No Pool</div>
                        <div className="pool-stat-value no">{formatCredits(market.totalNo)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">Total Pool</div>
                        <div className="pool-stat-value">{formatCredits(totalPool)}</div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-lg)',
                    marginTop: 'var(--spacing-lg)',
                    paddingTop: 'var(--spacing-lg)',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.875rem'
                }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Resolution Date: </span>
                        <span style={{ fontWeight: 500 }}>{formatDate(market.resolutionTime)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Created: </span>
                        <span style={{ fontWeight: 500 }}>{formatDate(market.createdAt)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Creator: </span>
                        <span className="mono" style={{ fontWeight: 500 }}>
                            {market.creator.slice(0, 10)}...{market.creator.slice(-6)}
                        </span>
                    </div>
                    <div>
                        <span className="privacy-indicator private">Individual bets hidden</span>
                    </div>
                </div>
            </div>

            {/* Bet Form */}
            {!market.resolved && (
                <BetForm market={market} onBetPlaced={handleBetPlaced} />
            )}

            {/* Bet confirmation */}
            {betPlaced && (
                <div className="card" style={{
                    marginTop: 'var(--spacing-lg)',
                    background: 'var(--color-yes-bg)',
                    borderColor: 'var(--color-yes)'
                }}>
                    <h3 style={{ color: 'var(--color-yes)', marginBottom: 'var(--spacing-sm)' }}>
                        Bet Placed Successfully
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        Your bet is now encrypted on-chain. Only you can see the details until resolution.
                    </p>
                    <div className="mono" style={{
                        marginTop: 'var(--spacing-md)',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        wordBreak: 'break-all'
                    }}>
                        TX: {betPlaced.txId || 'Pending confirmation...'}
                    </div>
                </div>
            )}

            {/* Resolution info for resolved markets */}
            {market.resolved && (
                <div className="card" style={{
                    background: market.winningOutcome === 1 ? 'var(--color-yes-bg)' : 'var(--color-no-bg)',
                    borderColor: market.winningOutcome === 1 ? 'var(--color-yes)' : 'var(--color-no)'
                }}>
                    <h3 style={{
                        color: market.winningOutcome === 1 ? 'var(--color-yes)' : 'var(--color-no)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        Market Resolved: {market.winningOutcome === 1 ? 'YES' : 'NO'}
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        If you placed a winning bet, you can now claim your payout using ZK proof.
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                        Claim Winnings
                    </button>
                </div>
            )}
        </div>
    )
}
