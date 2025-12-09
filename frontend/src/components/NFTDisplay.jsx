import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getEvmNFTs } from '../utils/EVMcontract';
import { CHAIN_TYPES } from '../config/chains';
import axios from 'axios';
import './NFTDisplay.css';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const NFTDisplay = () => {
  const { account, provider, isConnected, currentChain } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fallbackAttempts, setFallbackAttempts] = useState({});

  // IPFS 게이트웨이 목록 (ipfs.io를 최우선으로)
  const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',           // 최우선
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
  ];

  /**
   * IPFS URL을 HTTP 게이트웨이 URL로 변환
   * 기본적으로 https://ipfs.io/ipfs/ 사용
   */
  const convertIpfsUrl = (url) => {
    if (!url) return '';
  
    // console.log('🔗 원본 URL:', url);
    
    // 이미 https://로 시작하고 ipfs가 중복으로 들어간 경우
    if (url.includes('ipfs/ipfs:')) {
      const hashMatch = url.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/);
      if (hashMatch) {
        return `https://ipfs.io/ipfs/${hashMatch[0]}`;
      }
    }
    
    // 이미 완전한 https URL이면 ipfs.io로 변환
    if (url.startsWith('https://') || url.startsWith('http://')) {
      // 이미 ipfs.io를 사용하고 있으면 그대로
      if (url.includes('ipfs.io')) {
        return url;
      }
      // 다른 게이트웨이면 ipfs.io로 변환
      const hashMatch = url.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/);
      if (hashMatch) {
        return `https://ipfs.io/ipfs/${hashMatch[0]}`;
      }
      return url;
    }
    
    // ipfs:// 프로토콜 제거하고 ipfs.io 사용
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }
    
    // Qm 또는 bafy로 시작하는 해시
    if (url.startsWith('Qm') || url.startsWith('bafy')) {
      return `https://ipfs.io/ipfs/${url}`;
    }
    
    return url;
  };

  /**
   * 이미지 로드 실패 시 다른 게이트웨이로 재시도
   */
  const handleImageError = (e, nft) => {
    const tokenKey = `${nft.type}-${nft.tokenId}`;
    const currentAttempt = fallbackAttempts[tokenKey] || 0;
    
    console.log(`🔄 이미지 로드 실패 (시도 ${currentAttempt + 1}/${IPFS_GATEWAYS.length}):`, e.target.src);
    
    // 이미 모든 게이트웨이를 시도했으면 포기
    if (currentAttempt >= IPFS_GATEWAYS.length - 1) {
      console.log('❌ 모든 게이트웨이 실패:', tokenKey);
      e.target.style.display = 'none';
      e.target.parentElement.innerHTML = '<div class="no-image">이미지 로드 실패</div>';
      return;
    }
    
    // IPFS 해시 추출
    const originalUrl = nft.metadata?.image || '';
    const hashMatch = originalUrl.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/);
    
    if (!hashMatch) {
      console.log('❌ IPFS 해시를 찾을 수 없음:', originalUrl);
      e.target.style.display = 'none';
      e.target.parentElement.innerHTML = '<div class="no-image">이미지 로드 실패</div>';
      return;
    }
    
    const hash = hashMatch[0];
    const nextGateway = IPFS_GATEWAYS[(currentAttempt + 1) % IPFS_GATEWAYS.length];
    const newUrl = nextGateway + hash;
    
    console.log(`✅ 다음 게이트웨이 시도 (${currentAttempt + 2}/${IPFS_GATEWAYS.length}): ${newUrl}`);
    
    // 시도 횟수 증가
    setFallbackAttempts(prev => ({
      ...prev,
      [tokenKey]: currentAttempt + 1
    }));
    
    // 새 URL로 이미지 다시 로드
    e.target.src = newUrl;
  };

  /**
   * 메타데이터를 표준 형식으로 정규화
   */
  const normalizeMetadata = (metadata) => {
    if (!metadata) return metadata;
  
    // 이미 표준 형식이면 그대로 반환
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      return metadata;
    }
  
    // 비표준 형식을 표준 형식으로 변환
    const { name, description, image, ...customFields } = metadata;
    
    // customFields를 attributes 배열로 변환
    const attributes = Object.entries(customFields)
      .filter(([key]) => key !== 'trait_type' && key !== 'value') // 예약어 제외
      .map(([key, value]) => ({
        trait_type: key,
        value: value
      }));
  
    return {
      name: name || 'Unknown',
      description: description || '',
      image: image || '',
      attributes: attributes.length > 0 ? attributes : undefined
    };
  };

  const fetchMetadata = async (tokenURI) => {
    if (!tokenURI) return null;
    
    try {
      // 1. tokenURI에서 IPFS 해시 추출 (모든 형태 지원)
      let hash = '';
      
      if (tokenURI.startsWith('ipfs://')) {
        hash = tokenURI.replace('ipfs://', '');
      } else if (tokenURI.includes('/ipfs/')) {
        const match = tokenURI.match(/\/ipfs\/([^/?]+)/);
        hash = match ? match[1] : '';
      } else if (tokenURI.match(/^Qm[a-zA-Z0-9]{44,}|^bafy[a-zA-Z0-9]{50,}/)) {
        hash = tokenURI;
      }
      
      if (!hash) {
        console.error('❌ IPFS 해시 추출 실패:', tokenURI);
        return null;
      }
      
      console.log('🔍 추출된 해시:', hash);
      
      // 2. 로컬에서 먼저 시도
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/nft/nft-metadata/${hash}`,
          { timeout: 3000 }
        );
        
        if (response.data.success) {
          console.log('✅ 로컬에서 메타데이터 로드');
          return response.data.metadata;
        }
      } catch (localError) {
        console.log('⚠️ 로컬에 없음, IPFS에서 가져옴');
      }
      
      // 3. 로컬에 없으면 IPFS에서 가져오기
      const ipfsUrl = `https://ipfs.io/ipfs/${hash}`;
      const response = await axios.get(ipfsUrl, { timeout: 10000 });
      return response.data;
      
    } catch (error) {
      console.error('❌ 메타데이터 로드 실패:', error);
      return null;
    }
  };
    
  /**
 * EVM 체인의 NFT 로드
 */
  const loadEvmNFTs = useCallback(async () => {
    const allNFTs = [];
    const nftTypes = ['native', 'soulbound', 'fractional', 'dynamic', 'composable'];

    for (const type of nftTypes) {
      try {
        console.log(`🔍 ${type} NFT 조회 중...`);
        const nftsOfType = await getEvmNFTs(provider, account, type);
        console.log(`✅ ${type} NFTs:`, nftsOfType);
        
        for (let nft of nftsOfType) {
          // ❌ nft.metadata 사용 안 함 (Pinata에서 가져온 것)
          // ✅ tokenURI로만 로컬/ipfs.io에서 조회
          const metadata = await fetchMetadata(nft.tokenURI);
          
          allNFTs.push({
            tokenId: nft.tokenId,
            tokenURI: nft.tokenURI,
            type: nft.type,
            contractAddress: nft.contractAddress,
            chain: currentChain.name,
            metadata: normalizeMetadata(metadata) // 로컬 또는 ipfs.io에서 가져온 메타데이터
          });
        }
      } catch (err) {
        console.log(`⚠️ ${type} NFT 스킵:`, err.message);
      }
    }

    return allNFTs;
  }, [provider, account, currentChain]);

  /**
   * 사용자의 NFT 목록 가져오기
   */
  const loadNFTs = useCallback(async () => {
    if (!isConnected || !provider) {
      console.log('⚠️ 지갑이 연결되지 않음');
      return;
    }

    console.log('🚀 NFT 로딩 시작...', {
      account,
      chain: currentChain?.name,
      chainType: currentChain?.type
    });

    setLoading(true);
    setError(null);

    try {
      let allNFTs = [];

      if (currentChain?.type === CHAIN_TYPES.EVM) {
        allNFTs = await loadEvmNFTs();
      } else {
        console.warn('⚠️ 지원하지 않는 체인 타입:', currentChain?.type);
        setError('현재 EVM 체인만 지원합니다.');
      }

      console.log('✅ 전체 NFT 로드 완료:', allNFTs);
      
      if (allNFTs.length === 0) {
        console.log('ℹ️ NFT가 없습니다');
      }
      
      setNfts(allNFTs);
    } catch (err) {
      console.error('❌ NFT 로드 실패:', err);
      setError('NFT를 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, account, currentChain, loadEvmNFTs]);

  /**
   * 계정 변경 시 NFT 다시 로드
   */
  useEffect(() => {
    if (isConnected && account && currentChain) {
      console.log('🔄 체인/계정 변경 감지, NFT 재로드:', {
        chain: currentChain.name,
        chainId: currentChain.id,
        account
      });
      loadNFTs();
    } else {
      setNfts([]);
    }
  }, [isConnected, account, currentChain, loadNFTs]);

  /**
   * NFT 타입별 한글 이름 매핑
   */
  const getNftTypeName = (type) => {
    const typeNames = {
      native: 'Native NFT',
      soulbound: 'Soulbound',
      fractional: 'Fractional',
      dynamic: 'Dynamic',
      composable: 'Composable'
    };
    return typeNames[type] || type;
  };

  if (!isConnected) {
    return (
      <div className="nft-display">
        <div className="nft-header">
          <h2>My NFT</h2>
        </div>
        <p className="no-nfts">지갑을 연결하여 NFT를 확인하세요</p>
      </div>
    );
  }

  return (
    <div className="nft-display">
      <div className="nft-header">
        <h2>My NFT</h2>
        <div className="header-info">
          {currentChain && (
            <span className="chain-badge">
              {currentChain.shortName}
            </span>
          )}
          <button onClick={loadNFTs} className="refresh-button" disabled={loading}>
            {loading ? '로딩 중...' : '🔄 새로고침'}
          </button>
        </div>
      </div>
  
      {error && <div className="error-message">{error}</div>}
  
      {loading ? (
        <div className="loading">NFT를 불러오는 중...</div>
      ) : nfts.length === 0 ? (
        <p className="no-nfts">아직 NFT가 없습니다</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft, index) => (
            <div key={`${nft.type}-${nft.tokenId}-${index}`} className="nft-card">
              <div className="nft-image">
                {nft.metadata?.image ? (
                  <img 
                    src={convertIpfsUrl(nft.metadata.image)} 
                    alt={nft.metadata.name}
                    onError={(e) => handleImageError(e, nft)}
                  />
                ) : (
                  <div className="no-image">이미지 없음</div>
                )}
              </div>
              
              <div className="nft-info">
                <h3>{nft.metadata?.name || `Token #${nft.tokenId}`}</h3>
                <p className="nft-description">
                  {nft.metadata?.description || '설명 없음'}
                </p>
                
                <div className="nft-meta">
                  <span className={`nft-type ${nft.type}`}>
                    {getNftTypeName(nft.type)}
                  </span>
                  <span className="nft-token-id">
                    #{nft.tokenId}
                  </span>
                </div>

                <div className="nft-chain">
                  <span>{nft.chain}</span>
                </div>

                <div className="nft-actions">
                  <button
                    className="action-btn manage"
                    onClick={() => {
                      const nftData = encodeURIComponent(JSON.stringify(nft));
                      window.open(
                        `/nft-manage?nft=${nftData}`,
                        'NFT관리',
                        'width=900,height=800,left=200,top=100'
                      );
                    }}
                  >
                    NFT Management
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTDisplay;