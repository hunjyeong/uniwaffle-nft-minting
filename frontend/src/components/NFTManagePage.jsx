import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { transferNFT, burnNFT } from '../utils/EVMcontract';
import './NFTDisplay.css';
import './NFTManagePage.css';

const NFTManagePage = () => {
  const { provider, currentChain } = useWeb3();
  const [nft, setNft] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  useEffect(() => {
    // URL 파라미터에서 NFT 데이터 가져오기
    const params = new URLSearchParams(window.location.search);
    const nftData = params.get('nft');
    
    if (nftData) {
      const parsedNft = JSON.parse(decodeURIComponent(nftData));
      setNft(parsedNft);
      
      // Soulbound이면 소각 탭으로 시작
      if (parsedNft.type === 'soulbound') {
        setActiveTab('burn');
      }
    }
  }, []);

  const convertIpfsUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('https://') || url.startsWith('http://')) return url;
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (url.startsWith('ipfs:/')) {
      return url.replace('ipfs:/', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (url.startsWith('Qm') || url.startsWith('bafy')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    return url;
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!recipientAddress) {
      setError('받는 주소를 입력해주세요.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('올바른 이더리움 주소를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      const result = await transferNFT(
        provider,
        nft.type,
        from,
        recipientAddress,
        nft.tokenId
      );

      setTxHash(result.txHash);
      
      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('전송이 완료되었습니다!');
        window.close();
      }, 3000);

    } catch (err) {
      console.error('전송 실패:', err);
      setError(err.message || '전송에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBurn = async () => {
    if (!window.confirm('정말로 이 NFT를 소각하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const result = await burnNFT(provider, nft.type, nft.tokenId);
      setTxHash(result.txHash);

      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('소각이 완료되었습니다!');
        window.close();
      }, 3000);

    } catch (err) {
      console.error('소각 실패:', err);
      setError(err.message || '소각에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!nft) {
    return (
      <div className="manage-page">
        <div className="loading">NFT 정보를 불러오는 중...</div>
      </div>
    );
  }

  const isSoulbound = nft.type === 'soulbound';

  return (
    <div className="manage-page">
      <div className="manage-header">
        <h1>NFT 관리</h1>
      </div>

      <div className="nft-preview-card">
        <div className="preview-image">
          {nft.metadata?.image ? (
            <img src={convertIpfsUrl(nft.metadata.image)} alt={nft.metadata.name} />
          ) : (
            <div className="no-image">이미지 없음</div>
          )}
        </div>
        <div className="preview-info">
          <h2>{nft.metadata?.name || `Token #${nft.tokenId}`}</h2>
          <p className="token-id">Token ID: #{nft.tokenId}</p>
          <span className={`nft-type ${nft.type}`}>
            {nft.type === 'soulbound' && '🔒 Soulbound'}
            {nft.type === 'native' && '🔄 Native NFT'}
            {nft.type === 'fractional' && '💎 Fractional'}
          </span>
          <div className="nft-chain">
            <span>{nft.chain}</span>
          </div>
        </div>
      </div>

      {isSoulbound && (
        <div className="warning-banner">
          ⚠️ Soulbound Token은 전송할 수 없습니다. 소각만 가능합니다.
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs">
          {!isSoulbound && (
            <button
              className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              전송
            </button>
          )}
          <button
            className={`tab ${activeTab === 'burn' ? 'active' : ''}`}
            onClick={() => setActiveTab('burn')}
          >
            소각
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'transfer' && !isSoulbound && (
            <form onSubmit={handleTransfer} className="action-form">
              <div className="form-group">
                <label htmlFor="recipient">받는 주소</label>
                <input
                  id="recipient"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isProcessing}
                  required
                />
                <small>NFT를 받을 이더리움 주소를 입력하세요</small>
              </div>

              <button
                type="submit"
                className="action-button transfer"
                disabled={isProcessing}
              >
                {isProcessing ? '전송 중...' : '전송하기'}
              </button>
            </form>
          )}

          {activeTab === 'burn' && (
            <div className="burn-section">
              <div className="warning-box">
                <p>⚠️ <strong>주의:</strong> NFT를 소각하면 영구적으로 삭제됩니다.</p>
                <p>이 작업은 되돌릴 수 없습니다.</p>
              </div>

              <button
                onClick={handleBurn}
                className="action-button burn"
                disabled={isProcessing}
              >
                {isProcessing ? '소각 중...' : '🔥 소각하기'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {txHash && (
          <div className="success-message">
            <p>✅ 트랜잭션 성공!</p>
            <a
              href={`${currentChain?.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Explorer에서 보기 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTManagePage;