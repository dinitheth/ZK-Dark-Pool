import { useNavigate } from 'react-router-dom'
import aleoService from '../services/AleoService'
import manifoldService from '../services/ManifoldService'

export default function MarketCard({ market }) {
    const navigate = useNavigate()
    const impliedOdds = market.isManifold
        ? { yes: market.probability || 50, no: 100 - (market.probability || 50) }
        : aleoService.calculateImpliedOdds(market)

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
        }).format(amount || 0)
    }

    const getTimeRemaining = () => {
        // Manifold markets use closeTime (ms)
        if (market.isManifold && market.closeTime) {
            return manifoldService.formatTimeRemaining(market.closeTime)
        }

        if (market.resolutionHeight && market.currentBlockHeight) {
            const blocksRemaining = market.resolutionHeight - market.currentBlockHeight
            if (blocksRemaining <= 0) return 'Ended'
            
            const secondsRemaining = blocksRemaining * 5
            const hours = Math.floor(secondsRemaining / 3600)
            const days = Math.floor(hours / 24)
            const remainingHours = hours % 24
            
            if (days > 0) return `~${days}d ${remainingHours}h left`
            if (hours > 0) return `~${hours}h left`
            return `~${Math.floor(secondsRemaining / 60)}m left`
        }
        
        if (market.resolutionTime) {
            const now = Date.now()
            const resolution = market.resolutionTime * 1000
            const diff = resolution - now

            if (diff <= 0) return 'Ended'

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

            if (days > 0) return `${days}d ${hours}h left`
            return `${hours}h left`
        }
        
        return 'Unknown'
    }

    const handleClick = () => {
        if (market.isManifold) {
            navigate(`/market/manifold/${market.manifoldId}`)
        } else {
            navigate(`/market/${market.id}`)
        }
    }

    return (
        <div
            className="market-card animate-fade-in"
            onClick={handleClick}
        >
            <div className="market-card-header">
                <h3 className="market-card-question">{market.question}</h3>
                <span className={`market-card-status ${market.pending ? 'pending' : market.resolved ? 'resolved' : 'open'}`}>
                    {market.pending ? 'Pending...' : market.resolved ? 'Resolved' : 'Open'}
                </span>
            </div>

            <div className="market-card-pool">
                <div className="pool-stat">
                    <div className="pool-stat-label">{market.isManifold ? 'YES' : 'Yes Pool'}</div>
                    <div className="pool-stat-value yes">
                        {market.isManifold ? `${impliedOdds.yes.toFixed(0)}%` : formatCredits(market.totalYes)}
                    </div>
                </div>
                <div className="pool-stat">
                    <div className="pool-stat-label">{market.isManifold ? 'NO' : 'No Pool'}</div>
                    <div className="pool-stat-value no">
                        {market.isManifold ? `${impliedOdds.no.toFixed(0)}%` : formatCredits(market.totalNo)}
                    </div>
                </div>
                <div className="pool-stat">
                    <div className="pool-stat-label">{market.isManifold ? 'Volume' : 'Total'}</div>
                    <div className="pool-stat-value">
                        {market.isManifold ? formatCredits(market.volume) : formatCredits((market.totalYes || 0) + (market.totalNo || 0))}
                    </div>
                </div>
            </div>

            {/* Implied Odds Bar */}
            <div style={{
                margin: '0 0 var(--spacing-sm)',
                height: 6,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-no)',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${impliedOdds.yes}%`,
                    height: '100%',
                    background: 'var(--color-yes)',
                    transition: 'width 0.3s ease'
                }} />
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                marginBottom: 'var(--spacing-sm)'
            }}>
                <span style={{ color: 'var(--color-yes)' }}>YES {impliedOdds.yes.toFixed(0)}%</span>
                <span style={{ color: 'var(--color-no)' }}>NO {impliedOdds.no.toFixed(0)}%</span>
            </div>

            <div className="market-card-footer">
                <span className="market-card-time">
                    {market.pending ? 'Confirming on blockchain...' : getTimeRemaining()}
                </span>
                {market.isManifold ? (
                    <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--color-accent)',
                    }}>{market.category}</span>
                ) : (
                    <span className="privacy-indicator private">Hidden Positions</span>
                )}
            </div>
        </div>
    )
}
