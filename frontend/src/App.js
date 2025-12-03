import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import WalletConnect from './components/WalletConnect';
import MintForm from './components/MintForm';
import NFTDisplay from './components/NFTDisplay';
import NFTManagePage from './components/NFTManagePage';

function MainApp() {
  const [activeTab, setActiveTab] = useState('mint');

  return (
    <div className="App">
      <header className="App-header">
        <h1>NFT Minting System</h1>
        <p className="subtitle">NFTs on Sepolia</p>
        <WalletConnect />
      </header>

      <main className="App-main">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'mint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            Minting
          </button>
          <button 
            className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            My NFT
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'mint' ? <MintForm /> : <NFTDisplay />}
        </div>
      </main>

      <footer className="App-footer">
        <p>
          Made with using React, Hardhat, and IPFS
        </p>
        <div className="footer-links">
          <a 
            href="https://sepolia.etherscan.io" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Sepolia Explorer
          </a>
          <span>•</span>
          <a 
            href="https://testnets.opensea.io" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            OpenSea Testnet
          </a>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/nft-manage" element={<NFTManagePage />} />
      </Routes>
    </Router>
  );
}

export default App;