import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getContract } from '../utils/contract';
import axios from 'axios';

const NFTDisplay = () => {
  const { account, provider, isConnected } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NFT 메타데이터 가져오기
  const fetchMetadata = async (tokenURI) => {
    try {
      // ipfs:// URL을 HTTP 게이트웨이로 변환
      let uri = tokenURI;
      if (uri.startsWith('ipfs://')) {
        uri = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      }
      
      const response = await axios.get(uri);
      return response.data;
    } catch (err) {
      console.error('메타데이터 로드 실패:', err);
      return null;
    }
  };

  // IPFS URL을 HTTP로 변환하는 헬퍼 함수
  const convertIpfsUrl = (url) => {
    if (!url) return '';
    
    // 이미 https://로 시작하는 경우
    if (url.startsWith('https://')) {
      // 중복된 게이트웨이 URL 수정
      // https://gateway.../ipfs/https://gateway.../ipfs/Qm... 
      // → https://gateway.../ipfs/Qm...
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

  // 사용자의 NFT 목록 가져오기
  const loadNFTs = useCallback(async () => {
    if (!isConnected || !provider) return;

    setLoading(true);
    setError(null);

    try {
      const allNFTs = [];

      // Soulbound NFT 조회
      try {
        const soulboundContract = await getContract(provider, 'soulbound');
        const soulboundTokens = await soulboundContract.tokensOfOwner(account);
        
        for (let tokenId of soulboundTokens) {
          const tokenURI = await soulboundContract.tokenURI(tokenId);
          console.log('Soulbound Token URI:', tokenURI);
          const metadata = await fetchMetadata(tokenURI);
          console.log('Soulbound Metadata:', metadata);
          
          allNFTs.push({
            tokenId: tokenId.toString(),
            type: 'soulbound',
            tokenURI,
            metadata
          });
        }
      } catch (err) {
        console.error('Soulbound Token 조회 실패:', err);
      }

      // native NFT 조회
      try {
        const nativeContract = await getContract(provider, 'native');
        const nativeTokens = await nativeContract.tokensOfOwner(account);
        
        for (let tokenId of nativeTokens) {
          const tokenURI = await nativeContract.tokenURI(tokenId);
          console.log('Native NFT Token URI:', tokenURI);
          const metadata = await fetchMetadata(tokenURI);
          console.log('Native NFT Metadata:', metadata);
          
          allNFTs.push({
            tokenId: tokenId.toString(),
            type: 'native',
            tokenURI,
            metadata
          });
        }
      } catch (err) {
        console.error('Native NFT 조회 실패:', err);
      }

      console.log('All NFTs loaded:', allNFTs);
      setNfts(allNFTs);
    } catch (err) {
      console.error('NFT 로드 실패:', err);
      setError('NFT를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, account]);

  // 계정 변경 시 NFT 다시 로드
  useEffect(() => {
    if (isConnected && account) {
      loadNFTs();
    } else {
      setNfts([]);
    }
  }, [isConnected, account, loadNFTs]);

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
        <button onClick={loadNFTs} className="refresh-button" disabled={loading}>
          {loading ? '로딩 중...' : '🔄 새로고침'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">NFT를 불러오는 중...</div>
      ) : nfts.length === 0 ? (
        <p className="no-nfts">아직 NFT가 없습니다</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => (
            <div key={`${nft.type}-${nft.tokenId}`} className="nft-card">
              <div className="nft-image">
                {nft.metadata?.image ? (
                  <img 
                    src={convertIpfsUrl(nft.metadata.image)} 
                    alt={nft.metadata.name}
                    onError={(e) => {
                      console.error('Image load failed:', nft.metadata.image);
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
                    {nft.type === 'soulbound' ? '🔒 Soulbound' : '🔄 Native NFT'}
                  </span>
                  <span className="nft-token-id">#{nft.tokenId}</span>
                </div>

                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                  <div className="nft-attributes">
                    {nft.metadata.attributes.map((attr, index) => (
                      <div key={index} className="attribute">
                        <span className="attr-type">{attr.trait_type}</span>
                        <span className="attr-value">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTDisplay;