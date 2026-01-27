import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import BetForm from '../components/BetForm'
import aleoService from '../services/AleoService'

export default function MarketDetail() {
    const { id } = useParams()
    const [market, setMarket] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [betPlaced, setBetPlaced] = useState(null)
    const [currentBlockHeight, setCurrentBlockHeight] = useState(null)
    const [loadingDelayed, setLoadingDelayed] = useState(false)

    useEffect(() => {
        const loadMarket = async () => {
            setIsLoading(true)
            setLoadingDelayed(false)
            
            // Show delayed message after 3 seconds
            const delayTimer = setTimeout(() => {
                setLoadingDelayed(true)
            }, 3000)
            
            try {
                const cleanId = String(id).replace('field', '')
                
                const [marketData, blockHeight] = await Promise.all([
                    aleoService.getMarketWithDetails(cleanId),
                    aleoService.getCurrentBlockHeight()
                ])
                
                setCurrentBlockHeight(blockHeight)
                
                if (marketData) {
                    setMarket(marketData)
                }
            } catch (error) {
                console.error('Error loading market:', error)
            }
            
            clearTimeout(delayTimer)
            setIsLoading(false)
            setLoadingDelayed(false)
        }
        loadMarket()
    }, [id])

    const handleBetPlaced = (bet) => {
        setBetPlaced(bet)
    }

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount)
    }

    const formatBlocksToTime = (resolutionHeight) => {
        if (!currentBlockHeight || !resolutionHeight) return 'Unknown'
        
        const blocksRemaining = resolutionHeight - currentBlockHeight
        if (blocksRemaining <= 0) return 'Ready for resolution'
        
        const secondsRemaining = blocksRemaining * 5
        const days = Math.floor(secondsRemaining / 86400)
        const hours = Math.floor((secondsRemaining % 86400) / 3600)
        
        if (days > 0) {
            return `~${days}d ${hours}h left`
        } else if (hours > 0) {
            return `~${hours}h left`
        } else {
            return `<1h left`
        }
    }

    const estimateResolutionDate = (resolutionHeight) => {
        if (!currentBlockHeight || !resolutionHeight) return 'Unknown'
        
        const blocksRemaining = resolutionHeight - currentBlockHeight
        const secondsRemaining = blocksRemaining * 5
        const resolutionDate = new Date(Date.now() + secondsRemaining * 1000)
        
        return resolutionDate.toLocaleDateString('en-US', {
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
                {loadingDelayed && (
                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-bg-card)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        Fetching data from blockchain... This may take a moment, or try refreshing the page.
                    </div>
                )}
            </div>
        )
    }

    if (!market) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"></div>
                <h3 className="empty-state-title">Market not found</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                    This market may not exist on the blockchain or hasn't been indexed yet.
                </p>
                <Link to="/markets" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                    Back to Markets
                </Link>
            </div>
        )
    }

    const totalPool = (market.totalYes || 0) + (market.totalNo || 0)
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

                {market.description && (
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
                        {market.description}
                    </p>
                )}

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
                        <div className="pool-stat-value yes">{formatCredits(market.totalYes || 0)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">No Pool</div>
                        <div className="pool-stat-value no">{formatCredits(market.totalNo || 0)}</div>
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
                        <span style={{ fontWeight: 500 }}>{estimateResolutionDate(market.resolutionHeight)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Time Remaining: </span>
                        <span style={{ fontWeight: 500 }}>{formatBlocksToTime(market.resolutionHeight)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Creator: </span>
                        <span className="mono" style={{ fontWeight: 500 }}>
                            {market.creator?.slice(0, 10)}...{market.creator?.slice(-6)}
                        </span>
                    </div>
                    <div>
                        <span className="privacy-indicator private">Individual bets hidden</span>
                    </div>
                </div>
                
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <strong>Market ID:</strong> {market.id} | 
                    <strong> Resolution Block:</strong> {market.resolutionHeight} |
                    <strong> Current Block:</strong> {currentBlockHeight}
                </div>
            </div>

            {!market.resolved && (
                <BetForm market={market} onBetPlaced={handleBetPlaced} />
            )}

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
                        Request ID: {betPlaced.txId || 'Pending confirmation...'}
                    </div>
                </div>
            )}

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
