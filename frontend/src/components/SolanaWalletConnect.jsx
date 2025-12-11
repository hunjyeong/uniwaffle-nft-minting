import React, { useState } from 'react';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import './WalletConnect.css';

const SolanaWalletConnect = () => {
  const { wallet, publicKey, connected, connectWallet, disconnectWallet } = useSolanaWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      await connectWallet();
    } catch (err) {
      if (err.message.includes('not installed')) {
        setError('Phantom 지갑이 설치되어 있지 않습니다.');
      } else {
        setError('지갑 연결에 실패했습니다: ' + err.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setError('');
    } catch (err) {
      setError('지갑 연결 해제에 실패했습니다.');
    }
  };

  const copyToClipboard = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      alert('주소가 복사되었습니다!');
    }
  };

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!connected ? (
        <div className="connect-section">
          <button 
            className="connect-button"
            onClick={handleConnect}
            disabled={isConnecting || !wallet}
          >
            {isConnecting ? '연결 중...' : '⚡ Phantom 지갑 연결'}
          </button>

          {!wallet && (
            <div className="wallet-hint">
              <p>
                Phantom 지갑이 없으신가요?{' '}
                <a 
                  href="https://phantom.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="install-link"
                >
                  여기서 설치하세요
                </a>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="connected-info">
          <div className="account-info">
            <span className="status-indicator">🟢</span>
            <span className="address">
              {publicKey?.toString()}
            </span>
            <button
              className="copy-button"
              onClick={copyToClipboard}
              title="주소 복사"
            >
              📋
            </button>
          </div>
          
          <button 
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            연결 해제
          </button>
        </div>
      )}
    </div>
  );
};

export default SolanaWalletConnect;