import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Landing from './pages/Landing'
import Markets from './pages/Markets'
import CreateMarket from './pages/CreateMarket'
import MarketDetail from './pages/MarketDetail'
import Portfolio from './pages/Portfolio'

import './styles/App.css'
import './styles/Landing.css'

function App() {
    return (
        <BrowserRouter>
            <div className="app">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/markets" element={<Markets />} />
                        <Route path="/create" element={<CreateMarket />} />
                        <Route path="/market/:id" element={<MarketDetail />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                    </Routes>
                </main>
                <footer className="footer">
                    <p>Built on <a href="https://aleo.org" target="_blank" rel="noopener">Aleo</a> — The Privacy Layer</p>
                    <p className="privacy-badge">Your bets are private by default</p>
                </footer>
            </div>
        </BrowserRouter>
    )
}

export default App
