import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferNFT, burnNFT } from '../utils/EVMcontract';
import './NFTDisplay.css';
import './NFTManagePage.css';

const NFTManagePage = () => {
  // useWeb3 대신 직접 state 관리
  const [provider, setProvider] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [nft, setNft] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isProviderReady, setIsProviderReady] = useState(false);

  // 새 창에서 독립적으로 Provider 초기화 (Trust Wallet만 사용)
  useEffect(() => {
    const initProvider = async () => {
      try {
        console.log('🔌 Provider 초기화 시작...');
        
        // Trust Wallet만 확인
        if (!window.trustwallet && !window.ethereum) {
          throw new Error('Trust Wallet이 설치되어 있지 않습니다.');
        }
        
        const selectedProvider = window.trustwallet || window.ethereum;
        console.log('✅ Trust Wallet 감지됨');
        
        const ethersProvider = new ethers.BrowserProvider(selectedProvider);
        setProvider(ethersProvider);
        
        // 체인 정보 가져오기
        const network = await ethersProvider.getNetwork();
        const chainId = Number(network.chainId);
        
        console.log('📡 네트워크 정보:', { chainId, name: network.name });
        
        // 체인 정보 설정
        let chainInfo;
        if (chainId === 1) {
          chainInfo = {
            chainId: 1,
            name: 'Ethereum Mainnet',
            explorer: 'https://etherscan.io'
          };
        } else if (chainId === 11155111) {
          chainInfo = {
            chainId: 11155111,
            name: 'Sepolia Testnet',
            explorer: 'https://sepolia.etherscan.io'
          };
        } else {
          chainInfo = {
            chainId: chainId,
            name: network.name,
            explorer: `https://${network.name}.etherscan.io`
          };
        }
        
        setCurrentChain(chainInfo);
        setIsProviderReady(true);
        
        console.log('✅ Provider 초기화 완료:', chainInfo);
      } catch (err) {
        console.error('❌ Provider 초기화 실패:', err);
        setError('지갑을 연결할 수 없습니다. Trust Wallet을 설치하고 다시 시도해주세요.');
      }
    };
    
    initProvider();
  }, []);

  useEffect(() => {
    // URL 파라미터에서 NFT 데이터 가져오기
    const params = new URLSearchParams(window.location.search);
    const nftData = params.get('nft');
    
    if (nftData) {
      try {
        const parsedNft = JSON.parse(decodeURIComponent(nftData));
        setNft(parsedNft);
        console.log('📦 NFT 데이터 로드:', parsedNft);
        
        // Soulbound이면 소각 탭으로 시작
        if (parsedNft.type === 'soulbound') {
          setActiveTab('burn');
        }
      } catch (err) {
        console.error('NFT 데이터 파싱 실패:', err);
        setError('NFT 정보를 불러올 수 없습니다.');
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
    
    // Provider 확인 추가
    if (!provider) {
      setError('지갑이 연결되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
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
    // Provider 확인 추가
    if (!provider) {
      setError('지갑이 연결되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }

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
      
      // 사용자 친화적인 에러 메시지
      let errorMessage = err.message || '소각에 실패했습니다.';
      setError(errorMessage);
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

  if (!isProviderReady) {
    return (
      <div className="manage-page">
        <div className="loading">
          <h2>지갑 연결 중...</h2>
          <p>잠시만 기다려주세요.</p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </div>
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
          <div className="nft-badges">
            <span className={`nft-type ${nft.type}`}>
              {nft.type === 'soulbound' && '🔒 Soulbound'}
              {nft.type === 'native' && '🔄 Native NFT'}
              {nft.type === 'fractional' && '💎 Fractional'}
            </span>
            <span className="nft-chain">
              {nft.chain}
            </span>
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