import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import WalletButton from './WalletButton'
import useAleo from '../hooks/useAleo'

export default function Header() {
    const location = useLocation()
    const [isDarkMode, setIsDarkMode] = useState(true)

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'light') {
            setIsDarkMode(false)
            document.body.classList.add('light-mode')
        }
    }, [])

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode)
        if (isDarkMode) {
            document.body.classList.add('light-mode')
            localStorage.setItem('theme', 'light')
        } else {
            document.body.classList.remove('light-mode')
            localStorage.setItem('theme', 'dark')
        }
    }

    const isActive = (path) => location.pathname === path ? 'active' : ''

    return (
        <header className="header">
            <Link to="/" className="header-logo">
                <div className="logo-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <h1>ZK <span className="text-gradient">Dark Pool</span></h1>
            </Link>

            <nav className="header-nav">
                <Link to="/markets" className={isActive('/markets')}>Markets</Link>
                <Link to="/create" className={isActive('/create')}>Create</Link>
                <Link to="/portfolio" className={isActive('/portfolio')}>Portfolio</Link>
            </nav>

            <div className="header-right">
                <NetworkStatus />
                <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                    {isDarkMode ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="header-actions">
                <WalletButton />
            </div>
        </header>
    )
}

function NetworkStatus() {
    const { programDeployed, isCheckingProgram } = useAleo()

    if (isCheckingProgram) {
        return (
            <div className="network-status checking">
                <span className="status-dot"></span>
                <span className="status-text">Checking...</span>
            </div>
        )
    }

    if (programDeployed) {
        return (
            <div className="network-status connected">
                <span className="status-dot"></span>
                <span className="status-text">Testnet</span>
            </div>
        )
    }

    return (
        <div className="network-status disconnected">
            <span className="status-dot"></span>
            <span className="status-text">Offline</span>
        </div>
    )
}
