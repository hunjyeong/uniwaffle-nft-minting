import React, { useState, useEffect } from 'react';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { getUserNFTs, transferNFT } from '../utils/solana/mintNFT';
import './NFTDisplay.css'; // 기존 스타일 재사용

// IPFS URI를 HTTP URL로 변환하는 헬퍼 함수
const ipfsToHttp = (uri) => {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return uri;
};

const SolanaNFTDisplay = () => {
  const { wallet, connected, publicKey } = useSolanaWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (connected && wallet) {
      loadNFTs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, wallet]);

  const loadNFTs = async () => {
    if (!wallet || !connected) {
      setError('지갑이 연결되어 있지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Loading NFTs for wallet:', publicKey?.toString());
      const userNFTs = await getUserNFTs(wallet);
      setNfts(userNFTs);
      
      if (userNFTs.length === 0) {
        setError('보유 중인 NFT가 없습니다. NFT를 민팅해보세요!');
      }
    } catch (err) {
      console.error('Error loading NFTs:', err);
      setError('NFT를 불러오는 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!selectedNFT || !transferAddress) {
      alert('전송할 NFT와 수신자 주소를 입력해주세요.');
      return;
    }

    if (!transferAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      alert('유효하지 않은 Solana 주소입니다.');
      return;
    }

    const confirmed = window.confirm(
      `정말로 "${selectedNFT.name}"을(를) ${transferAddress}로 전송하시겠습니까?`
    );

    if (!confirmed) return;

    setTransferring(true);

    try {
      await transferNFT(wallet, selectedNFT.mintAddress, transferAddress);
      alert('NFT가 성공적으로 전송되었습니다!');
      
      // NFT 목록 새로고침
      await loadNFTs();
      
      // 전송 폼 초기화
      setSelectedNFT(null);
      setTransferAddress('');
    } catch (err) {
      console.error('Transfer error:', err);
      alert('전송 실패: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <div className="nft-display-container">
        <div className="empty-state">
          <h3>⚡ Phantom 지갑을 연결해주세요</h3>
          <p>보유 중인 Solana NFT를 확인하려면 지갑을 연결해야 합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-display-container">
      <div className="nft-header">
        <h2>내 Solana NFT 컬렉션</h2>
        <button onClick={loadNFTs} disabled={loading} className="refresh-button">
          {loading ? '⏳ 로딩 중...' : '🔄 새로고침'}
        </button>
      </div>

      {error && !loading && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>NFT를 불러오는 중...</p>
        </div>
      ) : nfts.length > 0 ? (
        <div>
          <div className="nft-grid">
            {nfts.map((nft, index) => (
              <div key={index} className="nft-card">
                <div className="nft-image-container">
                  {nft.image ? (
                    <img 
                      src={ipfsToHttp(nft.image)} 
                      alt={nft.name}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x300?text=NFT';
                      }}
                    />
                  ) : (
                    <div className="nft-placeholder">🖼️</div>
                  )}
                </div>
                
                <div className="nft-info">
                  <h3>{nft.name || 'Unnamed NFT'}</h3>
                  <p className="nft-symbol">{nft.symbol}</p>
                  {nft.description && (
                    <p className="nft-description">{nft.description}</p>
                  )}
                  
                  <div className="nft-details">
                    <div className="detail-item">
                      <span className="detail-label">Mint:</span>
                      <span className="detail-value" title={nft.mintAddress}>
                        {shortenAddress(nft.mintAddress)}
                      </span>
                    </div>
                  </div>

                  <div className="nft-actions">
                    <a 
                      href={nft.explorerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="action-button explorer"
                    >
                      🔍 Explorer
                    </a>
                    <button
                      onClick={() => setSelectedNFT(nft)}
                      className="action-button transfer"
                    >
                      📤 전송
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfer Modal */}
          {selectedNFT && (
            <div className="modal-overlay" onClick={() => setSelectedNFT(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>NFT 전송</h3>
                <div className="modal-nft-info">
                  <img 
                    src={ipfsToHttp(selectedNFT.image)} 
                    alt={selectedNFT.name}
                    className="modal-nft-image"
                  />
                  <p><strong>{selectedNFT.name}</strong></p>
                </div>

                <form onSubmit={handleTransfer}>
                  <div className="form-group">
                    <label>수신자 Solana 주소</label>
                    <input
                      type="text"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                      placeholder="예: 7xKXtg2CW87..."
                      disabled={transferring}
                      required
                    />
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedNFT(null);
                        setTransferAddress('');
                      }}
                      disabled={transferring}
                      className="cancel-button"
                    >
                      취소
                    </button>
                    <button 
                      type="submit"
                      disabled={transferring}
                      className="submit-button"
                    >
                      {transferring ? '전송 중...' : '전송하기'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="info-box">
        <h4>💡 팁</h4>
        <ul>
          <li>NFT는 Solana Devnet에서 민팅됩니다</li>
          <li>Phantom 지갑 앱에서도 NFT를 확인할 수 있습니다</li>
          <li>NFT 전송 시 소량의 SOL 가스비가 필요합니다</li>
          <li>Solana Explorer에서 NFT의 상세 정보를 확인할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
};

export default SolanaNFTDisplay;