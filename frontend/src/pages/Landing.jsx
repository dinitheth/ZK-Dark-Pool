import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import WalletButton from '../components/WalletButton'
import aleoService from '../services/AleoService'
import marketStorage from '../services/MarketStorage'

export default function Landing() {
    const { connected } = useWallet()
    const [stats, setStats] = useState({
        totalVolume: 0,
        totalMarkets: 0,
        isLoading: true
    })
    const [showNetworkNotice, setShowNetworkNotice] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            let totalVolume = 0
            let marketCount = 0

            // Get market count from blockchain
            try {
                marketCount = await aleoService.getMarketCount()
            } catch (err) {
                console.log('Could not get market count from chain')
            }

            // Get all markets to calculate total volume
            try {
                const markets = await aleoService.getAllMarkets()
                for (const market of markets) {
                    if (market && market.totalPool !== undefined && !isNaN(market.totalPool)) {
                        totalVolume += market.totalPool
                    }
                }
                // Update market count if we got more data
                if (markets.length > marketCount) {
                    marketCount = markets.length
                }
            } catch (err) {
                console.log('Could not fetch market details:', err)
            }

            console.log('Stats calculated:', { totalVolume, marketCount })
            setStats({
                totalVolume: isNaN(totalVolume) ? 0 : totalVolume,
                totalMarkets: marketCount,
                isLoading: false
            })
        } catch (err) {
            console.error('Error fetching stats:', err)
            setStats({ totalVolume: 0, totalMarkets: 0, isLoading: false })
        }
    }

    const formatVolume = (microcredits) => {
        // Convert microcredits to ALEO (1 ALEO = 10,000 microcredits)
        const aleo = microcredits / 10000
        if (aleo >= 1000000) {
            return `${(aleo / 1000000).toFixed(2)}M`
        } else if (aleo >= 1000) {
            return `${(aleo / 1000).toFixed(2)}K`
        } else if (aleo >= 1) {
            return aleo.toFixed(2)
        }
        return aleo.toFixed(4)
    }

    return (
        <div className="landing-page">
            {/* Network Notice */}
            {showNetworkNotice && (
                <div className="network-notice">
                    <span>Please switch your wallet to Aleo Testnet Beta to use this platform</span>
                    <button onClick={() => setShowNetworkNotice(false)} className="notice-close">&times;</button>
                </div>
            )}
            
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-badge">Built on Aleo</div>
                    <h1 className="hero-title">
                        The First <span className="text-gradient">Private</span><br />
                        Prediction Market
                    </h1>
                    <p className="hero-subtitle">
                        Bet on outcomes without revealing your position.
                        Powered by zero-knowledge proofs for complete privacy.
                    </p>
                    <div className="hero-actions">
                        <Link to="/markets" className="btn btn-primary btn-lg">
                            Explore Markets
                        </Link>
                        <Link to="/create" className="btn btn-outline btn-lg">
                            Create Market
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-value">
                                {stats.isLoading ? 'Loading' : `${formatVolume(stats.totalVolume)} ALEO`}
                            </span>
                            <span className="hero-stat-label">Total Volume</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat">
                            <span className="hero-stat-value">
                                {stats.isLoading ? 'Loading' : stats.totalMarkets}
                            </span>
                            <span className="hero-stat-label">Total Markets</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat">
                            <span className="hero-stat-value">100%</span>
                            <span className="hero-stat-label">Private Bets</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-card">
                        <div className="hero-card-header">
                            <span className="hero-card-badge">Live Market</span>
                        </div>
                        <h3>Will Bitcoin reach $100,000 by Q2 2026?</h3>
                        <div className="hero-card-odds">
                            <div className="hero-card-odd yes">
                                <span className="label">YES</span>
                                <span className="value">58%</span>
                            </div>
                            <div className="hero-card-odd no">
                                <span className="label">NO</span>
                                <span className="value">42%</span>
                            </div>
                        </div>
                        <div className="hero-card-privacy">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            Your position remains hidden
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <h2 className="section-title">Why Choose ZK Dark Pool</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <h3>Complete Privacy</h3>
                        <p>Your bet size and outcome choice are encrypted. Only you can see your position until resolution.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h3>MEV Protected</h3>
                        <p>No front-running or sandwich attacks. Your transactions are invisible to arbitrage bots.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h3>Provably Fair</h3>
                        <p>Zero-knowledge proofs ensure market integrity while keeping individual positions private.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                            </svg>
                        </div>
                        <h3>Decentralized</h3>
                        <p>Built on Aleo, the leading privacy-first Layer 1 blockchain. No central authority.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <h2 className="section-title">How It Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Connect Wallet</h3>
                        <p>Link your Leo Wallet to access the platform securely.</p>
                    </div>
                    <div className="step-connector"></div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Place Private Bet</h3>
                        <p>Choose YES or NO. Your bet is encrypted on-chain.</p>
                    </div>
                    <div className="step-connector"></div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Claim Winnings</h3>
                        <p>Prove ownership via ZK proof without revealing bet details.</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta">
                <div className="cta-content">
                    <h2>Ready to Trade Privately?</h2>
                    <p>Join the future of prediction markets where your strategy stays yours.</p>
                    <div className="cta-actions">
                        {connected ? (
                            <Link to="/markets" className="btn btn-primary btn-lg">
                                View Markets
                            </Link>
                        ) : (
                            <WalletButton />
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
