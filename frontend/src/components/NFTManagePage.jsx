import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferNFT, burnNFT, getContract } from '../utils/EVMcontract';
import './NFTDisplay.css';
import './NFTManagePage.css';

const NFTManagePage = () => {
  const [provider, setProvider] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [nft, setNft] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isProviderReady, setIsProviderReady] = useState(false);

  // 분할 관련 state
  const [fractionName, setFractionName] = useState('');
  const [fractionSymbol, setFractionSymbol] = useState('');
  const [totalFractions, setTotalFractions] = useState();
  const [buyoutPrice, setBuyoutPrice] = useState('');
  const [isFractionalized, setIsFractionalized] = useState(false);

  useEffect(() => {
    const initProvider = async () => {
      try {
        console.log('🔌 Provider 초기화 시작...');
        
        if (!window.trustwallet && !window.ethereum) {
          throw new Error('Trust Wallet이 설치되어 있지 않습니다.');
        }
        
        const selectedProvider = window.trustwallet || window.ethereum;
        console.log('✅ Trust Wallet 감지됨');
        
        const ethersProvider = new ethers.BrowserProvider(selectedProvider);
        setProvider(ethersProvider);
        
        const network = await ethersProvider.getNetwork();
        const chainId = Number(network.chainId);
        
        console.log('📡 네트워크 정보:', { chainId, name: network.name });
        
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
        
        // Fractional NFT 분할 상태 확인
        if (parsedNft.type === 'fractional' && provider) {
          checkFractionalStatus(parsedNft.tokenId);
        }
      } catch (err) {
        console.error('NFT 데이터 파싱 실패:', err);
        setError('NFT 정보를 불러올 수 없습니다.');
      }
    }
  }, [provider]);

  const checkFractionalStatus = async (tokenId) => {
    try {
      const contract = await getContract(provider, 'fractional');
      const fractionalized = await contract.isFractionalized(tokenId);
      setIsFractionalized(fractionalized);
    } catch (err) {
      console.error('분할 상태 확인 실패:', err);
    }
  };

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
      setError(err.message || '소각에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFractionalize = async (e) => {
    e.preventDefault();

    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }

    if (!fractionName || !fractionSymbol) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const contract = await getContract(provider, 'fractional');
      const buyoutPriceWei = ethers.parseEther(buyoutPrice);

      console.log('NFT 분할 시작:', {
        tokenId: nft.tokenId,
        fractionName,
        fractionSymbol,
        totalFractions,
        buyoutPrice: buyoutPriceWei.toString()
      });

      const tx = await contract.fractionalizeNFT(
        nft.tokenId,
        fractionName,
        fractionSymbol,
        totalFractions,
        buyoutPriceWei
      );

      console.log('트랜잭션 전송됨:', tx.hash);
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);

      // 이벤트에서 ERC-20 토큰 주소 추출
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'NFTFractionalized';
        } catch {
          return false;
        }
      });

      let fractionTokenAddress = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        fractionTokenAddress = parsed.args.fractionToken;
      }

      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert(`분할 완료!\n\nERC-20 토큰 주소:\n${fractionTokenAddress}\n\n메타마스크에 추가하여 조각을 확인하세요.`);
        window.close();
      }, 3000);

    } catch (err) {
      console.error('분할 실패:', err);
      setError(err.message || 'NFT 분할에 실패했습니다.');
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
  const isFractional = nft.type === 'fractional';

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
              {nft.type === 'soulbound' && 'Soulbound'}
              {nft.type === 'native' && 'Native NFT'}
              {nft.type === 'fractional' && 'Fractional'}
              {nft.type === 'dynamic' && 'Dynamic'}
              {nft.type === 'composable' && 'Composable'}
            </span>
            <span className="nft-chain">
              {nft.chain}
            </span>
            {isFractionalized && (
              <span className="nft-fractionalized">
                이미 분할됨
              </span>
            )}
          </div>
        </div>
      </div>

      {isSoulbound && (
        <div className="warning-banner">
          ⚠️ Soulbound Token은 전송할 수 없습니다. 소각만 가능합니다.
        </div>
      )}

      {isFractional && isFractionalized && (
        <div className="info-banner">
          ℹ️ 이 NFT는 이미 분할되었습니다. 전송 및 소각이 불가능합니다.
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs">
          {!isSoulbound && !isFractionalized && (
            <button
              className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              전송
            </button>
          )}
          {!isFractionalized && (
            <button
              className={`tab ${activeTab === 'burn' ? 'active' : ''}`}
              onClick={() => setActiveTab('burn')}
            >
              소각
            </button>
          )}
          {isFractional && !isFractionalized && (
            <button
              className={`tab ${activeTab === 'fractionalize' ? 'active' : ''}`}
              onClick={() => setActiveTab('fractionalize')}
            >
              분할
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'transfer' && !isSoulbound && !isFractionalized && (
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

          {activeTab === 'burn' && !isFractionalized && (
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

          {activeTab === 'fractionalize' && isFractional && !isFractionalized && (
            <form onSubmit={handleFractionalize} className="action-form">
              <div className="form-group">
                <label htmlFor="fractionName">조각 토큰 이름</label>
                <input
                  id="fractionName"
                  type="text"
                  value={fractionName}
                  onChange={(e) => setFractionName(e.target.value)}
                  placeholder="예: Fractional Art Token"
                  disabled={isProcessing}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fractionSymbol">조각 토큰 심볼</label>
                <input
                  id="fractionSymbol"
                  type="text"
                  value={fractionSymbol}
                  onChange={(e) => setFractionSymbol(e.target.value)}
                  placeholder="예: FART"
                  disabled={isProcessing}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="totalFractions">총 조각 개수</label>
                <input
                  id="totalFractions"
                  type="number"
                  value={totalFractions}
                  onChange={(e) => setTotalFractions(Number(e.target.value))}
                  placeholder="예: 5"
                  disabled={isProcessing}
                  required
                />
                <small>이 개수만큼 ERC-20 토큰이 생성됩니다</small>
              </div>

              <div className="form-group">
                <label htmlFor="buyoutPrice">매입 가격 (ETH)</label>
                <input
                  id="buyoutPrice"
                  type="text"
                  value={buyoutPrice}
                  onChange={(e) => setBuyoutPrice(e.target.value)}
                  placeholder="예: 0.01"
                  disabled={isProcessing}
                  required
                />
                <small>누군가 이 가격을 지불하면 전체 NFT를 매입할 수 있습니다</small>
              </div>

              <div className="price-info-box">
                <strong>조각당 가격:</strong> {(parseFloat(buyoutPrice) / totalFractions).toFixed(6)} ETH
              </div>

              <button
                type="submit"
                className="action-button fractionalize"
                disabled={isProcessing}
              >
                {isProcessing ? '분할 중...' : 'NFT 분할하기'}
              </button>
            </form>
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