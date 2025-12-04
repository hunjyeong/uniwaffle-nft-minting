import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getEvmNFTs } from '../utils/EVMcontract';
import { CHAIN_TYPES } from '../config/chains';
import axios from 'axios';
import './NFTDisplay.css';

const NFTDisplay = () => {
  const { account, provider, isConnected, currentChain } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NFT 메타데이터 가져오기
  const fetchMetadata = async (uri) => {
    try {
      if (!uri) return null;
      
      // IPFS URI 정규화
      let url = uri;
      
      // 중복된 게이트웨이 URL 제거
      if (uri.includes('gateway.pinata.cloud/ipfs/ipfs://')) {
        url = uri.replace('gateway.pinata.cloud/ipfs/ipfs://', 'gateway.pinata.cloud/ipfs/');
      } else if (uri.includes('gateway.pinata.cloud/ipfs/ipfs:/')) {
        url = uri.replace('gateway.pinata.cloud/ipfs/ipfs:/', 'gateway.pinata.cloud/ipfs/');
      }
      // ipfs:// 프로토콜 처리
      else if (uri.startsWith('ipfs://')) {
        const cid = uri.replace('ipfs://', '');
        url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      } 
      // 잘못된 형식 ipfs:/ 처리
      else if (uri.startsWith('ipfs:/')) {
        const cid = uri.replace('ipfs:/', '');
        url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      } 
      // CID만 있는 경우
      else if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
        url = `https://gateway.pinata.cloud/ipfs/${uri}`;
      }
      
      console.log('📥 메타데이터 요청:', url);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('메타데이터 로드 실패:', error.message);
      return null;
    }
  };

  // IPFS URL을 HTTP로 변환하는 헬퍼 함수
  const convertIpfsUrl = (url) => {
    if (!url) return '';
    
    // 이미 https://로 시작하는 경우
    if (url.startsWith('https://')) {
      // 중복된 게이트웨이 URL 수정
      const duplicatePattern = /https:\/\/gateway\.pinata\.cloud\/ipfs\/https:\/\/gateway\.pinata\.cloud\/ipfs\//;
      if (duplicatePattern.test(url)) {
        return url.replace(duplicatePattern, 'https://gateway.pinata.cloud/ipfs/');
      }
      return url;
    }
    
    // ipfs:// 프로토콜을 HTTP로 변환
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    
    // Qm으로 시작하는 해시만 있는 경우
    if (url.startsWith('Qm')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    
    return url;
  };

  // EVM 체인의 NFT 로드
  const loadEvmNFTs = useCallback(async () => {
    const allNFTs = [];
    const nftTypes = ['native', 'soulbound', 'fractional', 'dynamic', 'composable'];
  
    for (const type of nftTypes) {
      try {
        console.log(`🔍 ${type} NFT 조회 중...`);
        const nftsOfType = await getEvmNFTs(provider, account, type);
        console.log(`✅ ${type} NFTs:`, nftsOfType);
        
        for (let nft of nftsOfType) {
          const metadata = await fetchMetadata(nft.tokenURI);
          allNFTs.push({
            ...nft,
            metadata,
            chain: currentChain.name
          });
        }
      } catch (err) {
        console.log(`⚠️ ${type} NFT 스킵:`, err.message);
      }
    }
  
    return allNFTs;
  }, [provider, account, currentChain]); 

  // 사용자의 NFT 목록 가져오기
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

  // 계정 변경 시 NFT 다시 로드
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

  // NFT 타입별 한글 이름 매핑
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
                    onError={(e) => {
                      console.error('이미지 로드 실패:', nft.metadata.image);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="no-image">이미지 로드 실패</div>';
                    }}
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

                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                  <div className="nft-attributes">
                    {nft.metadata.attributes.map((attr, idx) => (
                      <div key={idx} className="attribute">
                        <span className="attr-type">{attr.trait_type}</span>
                        <span className="attr-value">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}

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
                    전송 및 소각
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