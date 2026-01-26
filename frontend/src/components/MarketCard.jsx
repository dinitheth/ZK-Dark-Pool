import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { aleoService } from '../services/AleoService'

export default function MarketCard({ market }) {
    const navigate = useNavigate()
    const [currentBlockHeight, setCurrentBlockHeight] = useState(null)

    useEffect(() => {
        aleoService.getCurrentBlockHeight().then(setCurrentBlockHeight)
    }, [])

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const getTimeRemaining = () => {
        // Use block height for blockchain markets, timestamp for local/demo
        if (market.resolutionHeight && currentBlockHeight) {
            const blocksRemaining = market.resolutionHeight - currentBlockHeight
            if (blocksRemaining <= 0) return 'Ended'
            
            // Aleo blocks ~3 seconds each
            const secondsRemaining = blocksRemaining * 3
            const hours = Math.floor(secondsRemaining / 3600)
            const days = Math.floor(hours / 24)
            const remainingHours = hours % 24
            
            if (days > 0) return `~${days}d ${remainingHours}h left`
            if (hours > 0) return `~${hours}h left`
            return `~${Math.floor(secondsRemaining / 60)}m left`
        }
        
        // Fallback for timestamp-based markets
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

    return (
        <div
            className="market-card animate-fade-in"
            onClick={() => navigate(`/market/${market.id}`)}
        >
            <div className="market-card-header">
                <h3 className="market-card-question">{market.question}</h3>
                <span className={`market-card-status ${market.pending ? 'pending' : market.resolved ? 'resolved' : 'open'}`}>
                    {market.pending ? 'Pending...' : market.resolved ? 'Resolved' : 'Open'}
                </span>
            </div>

            <div className="market-card-pool">
                <div className="pool-stat">
                    <div className="pool-stat-label">Yes Pool</div>
                    <div className="pool-stat-value yes">
                        {formatCredits(market.totalYes)}
                    </div>
                </div>
                <div className="pool-stat">
                    <div className="pool-stat-label">No Pool</div>
                    <div className="pool-stat-value no">
                        {formatCredits(market.totalNo)}
                    </div>
                </div>
                <div className="pool-stat">
                    <div className="pool-stat-label">Total</div>
                    <div className="pool-stat-value">
                        {formatCredits(market.totalYes + market.totalNo)}
                    </div>
                </div>
            </div>

            <div className="market-card-footer">
                <span className="market-card-time">
                    {market.pending ? 'Confirming on blockchain...' : getTimeRemaining()}
                </span>
                <span className="privacy-indicator private">Hidden Positions</span>
            </div>
        </div>
    )
}
