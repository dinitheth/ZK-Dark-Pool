import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import manifoldService from '../services/ManifoldService'

export default function ManifoldMarketDetail() {
    const { manifoldId } = useParams()
    const [market, setMarket] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const data = await manifoldService.getMarketById(manifoldId)
                setMarket(data)
            } catch (err) {
                console.error('Error loading Manifold market:', err)
            }
            setIsLoading(false)
        }
        load()
    }, [manifoldId])

    if (isLoading) {
        return (
            <div className="market-detail-page" style={{ maxWidth: 900, margin: '0 auto' }}>
                <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 150 }} />
            </div>
        )
    }

    if (!market) {
        return (
            <div className="empty-state">
                <h3 className="empty-state-title">Market not found</h3>
                <Link to="/markets" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                    Back to Markets
                </Link>
            </div>
        )
    }

    const yesPercent = market.probability || 50
    const noPercent = 100 - yesPercent

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
                        {market.resolved ? `Resolved: ${market.resolution}` : 'Open'}
                    </span>
                </div>

                {/* Resolution & Time above bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-md)',
                    fontSize: '0.875rem'
                }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Closes: </span>
                        <span style={{ fontWeight: 500 }}>{manifoldService.formatCloseDate(market.closeTime)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Time Remaining: </span>
                        <span style={{ fontWeight: 500 }}>{manifoldService.formatTimeRemaining(market.closeTime)}</span>
                    </div>
                </div>

                {/* Odds bar */}
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ color: 'var(--color-yes)', fontWeight: 600 }}>
                            YES {yesPercent.toFixed(1)}%
                        </span>
                        <span style={{ color: 'var(--color-no)', fontWeight: 600 }}>
                            NO {noPercent.toFixed(1)}%
                        </span>
                    </div>
                    <div style={{
                        height: 12,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-no)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${yesPercent}%`,
                            height: '100%',
                            background: 'var(--color-yes)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                {/* Stats */}
                <div className="market-card-pool">
                    <div className="pool-stat">
                        <div className="pool-stat-label">Volume</div>
                        <div className="pool-stat-value">{new Intl.NumberFormat('en-US').format(market.volume)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">Liquidity</div>
                        <div className="pool-stat-value">{new Intl.NumberFormat('en-US').format(market.totalLiquidity)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">Bettors</div>
                        <div className="pool-stat-value">{market.uniqueBettors}</div>
                    </div>
                </div>

                {/* Meta info */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    paddingTop: 'var(--spacing-lg)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    fontSize: '0.85rem',
                }}>
                    {market.category && (
                        <span style={{
                            padding: '2px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--color-accent)',
                            fontSize: '0.8rem',
                        }}>{market.category}</span>
                    )}
                    {market.creatorName && (
                        <span style={{ color: 'var(--color-text-muted)' }}>
                            Created by <strong>{market.creatorName}</strong>
                        </span>
                    )}
                    <span style={{
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(99, 102, 241, 0.08)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                    }}>Live Data via Manifold Markets</span>
                </div>

                {/* CTA link to Manifold */}
                {market.manifoldUrl && (
                    <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                        <a
                            href={market.manifoldUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ display: 'inline-block', padding: 'var(--spacing-sm) var(--spacing-xl)' }}
                        >
                            View on Manifold Markets
                        </a>
                    </div>
                )}
            </div>

            {/* ZK Dark Pool pitch */}
            <div className="card" style={{
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
            }}>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Want to bet privately?</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                    Traditional markets expose your positions. ZK Dark Pool uses zero-knowledge proofs on Aleo
                    to keep your bets completely private — no one can see your position, bet size, or strategy.
                </p>
                <Link to="/create" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                    Create a Private Market on Aleo
                </Link>
            </div>
        </div>
    )
}
