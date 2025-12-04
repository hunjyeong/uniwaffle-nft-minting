import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getChainsByCategory } from '../config/chains';
import './WalletConnect.css';

const WalletConnect = () => {
  const {
    account,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    currentChain,
    error,
    connectWallet,
    disconnectWallet,
    switchChain
  } = useWeb3();

  const [showChainSelector, setShowChainSelector] = useState(false);

  // 주소 포맷
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 체인 아이콘 렌더링 (이미지 URL 또는 이모지)
  const renderChainIcon = (icon) => {
    if (!icon) return null;
    
    if (icon.startsWith('http')) {
      return <img src={icon} alt="chain" className="chain-icon-img" />;
    }
    return <span className="chain-icon-emoji">{icon}</span>;
  };

  // 체인 선택 핸들러
  const handleChainSelect = async (chain) => {
    if (isConnected) {
      await switchChain(chain);
    } else {
      await connectWallet(chain);
    }
    setShowChainSelector(false);
  };

  const chainCategories = getChainsByCategory();

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!isConnected ? (
        <div className="connect-section">
          <div className="chain-selector-wrapper">
            <button 
              className="chain-selector-button"
              onClick={() => setShowChainSelector(!showChainSelector)}
            >
              <span>{currentChain ? currentChain.shortName : '블록체인 선택'}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showChainSelector && (
              <div className="chain-dropdown">
                {Object.entries(chainCategories).map(([category, chains]) => (
                  chains.length > 0 && (
                    <div key={category} className="chain-category">
                      <div className="category-title">{category}</div>
                      {chains.map(chain => (
                        <button
                          key={chain.id}
                          className={`chain-option ${currentChain?.id === chain.id ? 'selected' : ''}`}
                          onClick={() => handleChainSelect(chain)}
                        >
                          {renderChainIcon(chain.icon)}
                          <span className="chain-name">{chain.shortName}</span>
                          {chain.isTestnet && (
                            <span className="testnet-badge">Testnet</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <button 
            className="connect-button"
            onClick={() => connectWallet(currentChain)}
            disabled={isConnecting || !currentChain}
          >
            {isConnecting ? '연결 중...' : 'Trust Wallet 연결'}
          </button>

          <div className="wallet-hint">
            <p>Trust Wallet을 사용하세요</p>
          </div>
        </div>
      ) : (
        <div className="connected-info">
          <div className="chain-info">
            <button 
              className="chain-display"
              onClick={() => setShowChainSelector(!showChainSelector)}
            >
              <span className="chain-name">{currentChain?.shortName}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showChainSelector && (
              <div className="chain-dropdown">
                {Object.entries(chainCategories).map(([category, chains]) => (
                  chains.length > 0 && (
                    <div key={category} className="chain-category">
                      <div className="category-title">{category}</div>
                      {chains.map(chain => (
                        <button
                          key={chain.id}
                          className={`chain-option ${currentChain?.id === chain.id ? 'selected' : ''}`}
                          onClick={() => handleChainSelect(chain)}
                          disabled={isConnecting}
                        >
                          {renderChainIcon(chain.icon)}
                          <span className="chain-name">{chain.shortName}</span>
                          {chain.isTestnet && (
                            <span className="testnet-badge">Testnet</span>
                          )}
                          {currentChain?.id === chain.id && (
                            <span className="check-mark">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="account-info">
            <span className="status-indicator">🟢</span>
            <span className="address">
              {account}
            </span>
            <button
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(account);
                alert('주소가 복사되었습니다!');
              }}
              title="주소 복사"
            >
              📋
            </button>
          </div>
          
          {!isCorrectNetwork && currentChain && (
            <button 
              className="network-switch-button"
              onClick={() => switchChain(currentChain)}
            >
              {currentChain.shortName}로 전환
            </button>
          )}
          
          <button 
            className="disconnect-button"
            onClick={disconnectWallet}
          >
            연결 해제
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;