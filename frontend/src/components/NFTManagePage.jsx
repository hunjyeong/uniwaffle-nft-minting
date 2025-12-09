import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { transferNFT, burnNFT, getContract } from '../utils/EVMcontract';
import { uploadImageToPinata } from '../utils/ipfs.js';
import axios from 'axios';
import './NFTDisplay.css';
import './NFTManagePage.css';

// 백엔드 API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// IPFS URL을 ipfs.io로 변환
const convertIpfsUrl = (url) => {
  if (!url) return '';
  
  // 이미 HTTP/HTTPS URL이면 ipfs.io로 변환
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('ipfs.io')) {
      return url;
    }
    // 다른 게이트웨이면 해시 추출 후 ipfs.io로 변환
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

// 로컬 또는 IPFS에서 메타데이터 가져오기
const fetchNFTMetadata = async (tokenURI) => {
  if (!tokenURI) return null;
  
  try {
    // 1. tokenURI에서 IPFS 해시 추출
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
    
    // 3. 로컬에 없으면 ipfs.io에서
    const ipfsUrl = `https://ipfs.io/ipfs/${hash}`;
    const response = await axios.get(ipfsUrl, { timeout: 10000 });
    return response.data;
    
  } catch (error) {
    console.error('❌ 메타데이터 로드 실패:', error);
    return null;
  }
};

// 분할 토큰 정보 컴포넌트
const FractionTokenInfo = ({ nft, provider }) => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokenInfo = async () => {
      try {
        const contract = await getContract(provider, 'fractional');
        const fractionData = await contract.fractionalizedNFTs(nft.tokenId);
        
        const tokenAddress = fractionData.fractionToken;
        
        const tokenAbi = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)'
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        const [name, symbol, totalSupply, balance] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply(),
          tokenContract.balanceOf(userAddress)
        ]);

        setTokenInfo({
          address: tokenAddress,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          balance: balance.toString(),
          buyoutPrice: ethers.formatEther(fractionData.buyoutPrice)
        });
      } catch (err) {
        console.error('토큰 정보 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    if (provider && nft) {
      loadTokenInfo();
    }
  }, [provider, nft]);

  if (loading) {
    return <div className="loading-small">토큰 정보 로딩 중...</div>;
  }

  if (!tokenInfo) {
    return <div className="error-small">토큰 정보를 불러올 수 없습니다.</div>;
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('주소가 복사되었습니다!');
  };

  return (
    <div className="token-info-content">
      <div className="info-row">
        <span className="info-label">토큰 이름:</span>
        <span className="info-value">{tokenInfo.name}</span>
      </div>
      <div className="info-row">
        <span className="info-label">토큰 심볼:</span>
        <span className="info-value">{tokenInfo.symbol}</span>
      </div>
      <div className="info-row">
        <span className="info-label">총 조각 수:</span>
        <span className="info-value">{tokenInfo.totalSupply}</span>
      </div>
      <div className="info-row">
        <span className="info-label">내 보유량:</span>
        <span className="info-value balance">{tokenInfo.balance} 조각</span>
      </div>
      <div className="info-row">
        <span className="info-label">매입 가격:</span>
        <span className="info-value">{tokenInfo.buyoutPrice} ETH</span>
      </div>
      <div className="info-row">
        <span className="info-label">토큰 주소:</span>
        <span className="info-value address-value">
          <code className="token-address">{tokenInfo.address}</code>
          <button 
            className="copy-button"
            onClick={() => copyToClipboard(tokenInfo.address)}
            title="주소 복사"
          >
            📋
          </button>
        </span>
      </div>
      
      <div className="wallet-guide">
        <h4>💡 Trust Wallet에 추가하는 방법:</h4>
        <ol>
          <li>Trust Wallet 앱 열기</li>
          <li>가상자산 관리 선택</li>
          <li><strong>"추가(+)"</strong> 버튼 선택</li>
          <li>네트워크: <strong className="network-highlight">Ethereum (Sepolia Testnet)</strong></li>
          <li>Contract Address: 위 주소 옆 📋 버튼으로 복사 후 붙여넣기</li>
          <li>"토큰 추가" 버튼 클릭</li>
        </ol>
        <p>
          ⚠️ <strong>Sepolia 테스트넷</strong>에서만 보입니다. 메인넷이 아닙니다!
        </p>
      </div>
    </div>
  );
};

// Dynamic NFT 메타데이터 관리 컴포넌트
const DynamicNFTManager = ({ nft, provider, onSuccess, onError }) => {
  const [metadata, setMetadata] = useState('');
  const [metadataHistory, setMetadataHistory] = useState([]);
  const [uriHistory, setUriHistory] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [newTokenURI, setNewTokenURI] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 이미지 업로드 관련 state 추가
  const [newImageFile, setNewImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 메타데이터 필드 상태
  const [metadataFields, setMetadataFields] = useState([
    { id: 1, fieldName: '', value: '' },
    { id: 2, fieldName: '', value: '' }
  ]);

  const loadMetadata = useCallback(async () => {
    try {
      setLoadingMetadata(true);
      const contract = await getContract(provider, 'dynamic');
      
      // 현재 메타데이터 가져오기
      const currentMetadata = await contract.getMetadata(nft.tokenId);
      setMetadata(currentMetadata);
      
      // 메타데이터를 필드로 파싱
      if (currentMetadata) {
        try {
          const parsed = JSON.parse(currentMetadata);
          const fields = Object.entries(parsed).map(([key, value], index) => ({
            id: Date.now() + index,
            fieldName: key,
            value: String(value)
          }));
          setMetadataFields(fields.length > 0 ? fields : [{ id: Date.now(), fieldName: '', value: '' }]);
        } catch (e) {
          console.error('메타데이터 파싱 실패:', e);
        }
      }
      
      // 메타데이터 히스토리 가져오기
      const history = await contract.getMetadataHistory(nft.tokenId);
      setMetadataHistory(history);
      
    } catch (err) {
      console.error('메타데이터 로드 실패:', err);
    } finally {
      setLoadingMetadata(false);
    }
  }, [provider, nft.tokenId]);

  const loadURIHistory = useCallback(async () => {
    try {
      const contract = await getContract(provider, 'dynamic');
      const history = await contract.getURIHistory(nft.tokenId);
      setUriHistory(history);
    } catch (err) {
      console.error('URI 히스토리 로드 실패:', err);
    }
  }, [provider, nft.tokenId]);

  useEffect(() => {
    loadMetadata();
    loadURIHistory();
  }, [loadMetadata, loadURIHistory]);

  // 필드 추가
  const addField = () => {
    setMetadataFields([
      ...metadataFields,
      { id: Date.now(), fieldName: '', value: '' }
    ]);
  };

  // 필드명 변경
  const updateFieldName = (id, newName) => {
    setMetadataFields(
      metadataFields.map(field =>
        field.id === id ? { ...field, fieldName: newName } : field
      )
    );
  };

  // 값 변경
  const updateFieldValue = (id, newValue) => {
    setMetadataFields(
      metadataFields.map(field =>
        field.id === id ? { ...field, value: newValue } : field
      )
    );
  };

  // 필드 삭제
  const removeField = (id) => {
    setMetadataFields(metadataFields.filter(field => field.id !== id));
  };

  // 배열을 객체로 변환
  const getMetadataObject = () => {
    const obj = {};
    metadataFields.forEach(field => {
      if (field.fieldName.trim()) {
        obj[field.fieldName] = field.value;
      }
    });
    return obj;
  };

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onError('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      
      setNewImageFile(file);
      setNewTokenURI(''); // URI 입력 초기화
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 파일 제거
  const handleRemoveImage = () => {
    setNewImageFile(null);
    setImagePreview(null);
  };

  // 메타데이터 업데이트
  const handleUpdateMetadata = async () => {
    const metadataObj = getMetadataObject();
    
    if (Object.keys(metadataObj).length === 0) {
      onError('최소 1개의 필드를 입력해주세요.');
      return;
    }

    const metadataJson = JSON.stringify(metadataObj);

    setIsProcessing(true);
    try {
      const contract = await getContract(provider, 'dynamic');
      const tx = await contract.updateMetadata(nft.tokenId, metadataJson);
      const receipt = await tx.wait();
      
      onSuccess('메타데이터가 업데이트되었습니다!', receipt.hash);
      await loadMetadata();
    } catch (err) {
      console.error('메타데이터 업데이트 실패:', err);
      if (err.message.includes('Not owner')) {
        onError('권한이 없습니다. NFT 소유자만 메타데이터를 수정할 수 있습니다.');
      } else {
        onError(err.message || '메타데이터 업데이트에 실패했습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // URI 업데이트 (이미지 파일 또는 직접 URI)
  const handleUpdateTokenURI = async () => {
    if (!newTokenURI && !newImageFile) {
      onError('새 Token URI를 입력하거나 이미지 파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setUploadingImage(false);
    
    try {
      let finalURI = newTokenURI;
      
      // 이미지 파일이 있으면 IPFS에 업로드
      if (newImageFile) {
        setUploadingImage(true);
        
        try {
          finalURI = await uploadImageToPinata(newImageFile);
          console.log('✅ 이미지 IPFS 업로드 완료:', finalURI);
        } catch (uploadError) {
          console.error('❌ IPFS 업로드 실패:', uploadError);
          throw new Error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        }
        
        setUploadingImage(false);
      }

      // 온체인 업데이트
      const contract = await getContract(provider, 'dynamic');
      const tx = await contract.updateTokenURI(nft.tokenId, finalURI);
      const receipt = await tx.wait();
      
      // ✨ 로컬 메타데이터도 업데이트
      try {
        // 구 tokenURI에서 해시 추출
        const oldHash = nft.tokenURI.replace('ipfs://', '').replace(/^https?:\/\/.*\/ipfs\//, '');
        
        // 새 tokenURI에서 해시 추출
        const newHash = finalURI.replace('ipfs://', '');
        
        // 새 메타데이터 생성
        const updatedMetadata = {
          ...nft.metadata,
          image: `https://ipfs.io/ipfs/${newHash}` // 또는 finalURI 그대로
        };

        // 백엔드에 업데이트 요청
        await axios.put(
          `${API_BASE_URL}/api/nft/nft-metadata/${oldHash}`,
          {
            newMetadata: updatedMetadata,
            newHash: newHash
          },
          { timeout: 5000 }
        );
        
        console.log('✅ 로컬 메타데이터 업데이트 완료');
      } catch (localError) {
        console.warn('⚠️ 로컬 메타데이터 업데이트 실패 (온체인은 성공):', localError);
      }
    
      onSuccess('Token URI가 업데이트되었습니다! 새로고침하면 변경사항을 확인할 수 있습니다.', receipt.hash);
    
      // 초기화
      setNewTokenURI('');
      setNewImageFile(null);
      setImagePreview(null);
      
      await loadURIHistory();
      window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
      
    } catch (err) {
      console.error('URI 업데이트 실패:', err);
      if (err.message.includes('Not owner')) {
        onError('권한이 없습니다. NFT 소유자만 URI를 수정할 수 있습니다.');
      } else {
        onError(err.message || 'URI 업데이트에 실패했습니다.');
      }
    } finally {
      setIsProcessing(false);
      setUploadingImage(false);
    }
  };

  if (loadingMetadata) {
    return <div className="loading-small">메타데이터 로딩 중...</div>;
  }

  return (
    <div className="dynamic-nft-manager">
      {/* 현재 메타데이터 표시 */}
      <div className="info-box">
        <h3>현재 메타데이터</h3>
        {metadata ? (
          <pre className="metadata-display">{metadata}</pre>
        ) : (
          <p className="no-metadata">메타데이터가 없습니다. 아래에서 추가해주세요.</p>
        )}
      </div>

      {/* 메타데이터 편집 폼 */}
      <div className="action-form">
        <h4>메타데이터 편집</h4>
        <p className="info-text">
          필드명과 값을 자유롭게 입력하세요. JSON 형식으로 저장됩니다.
        </p>

        {/* 필드 목록 */}
        <div className="metadata-fields">
          {metadataFields.map((field, index) => (
            <div key={field.id} className="metadata-field-row">
              <div className="field-inputs">
                <div className="field-name-input">
                  <label>필드명</label>
                  <input
                    type="text"
                    value={field.fieldName}
                    onChange={(e) => updateFieldName(field.id, e.target.value)}
                    placeholder={
                      index === 0 ? "예: 전공" :
                      index === 1 ? "예: 졸업연도" :
                      "필드를 입력하세요"
                    }
                    disabled={isProcessing}
                  />
                </div>
                <div className="field-value-input">
                  <label>값</label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateFieldValue(field.id, e.target.value)}
                    placeholder={
                      index === 0 ? "예: 컴퓨터공학" :
                      index === 1 ? "예: 2025" :
                      "값을 입력하세요"
                    }
                    disabled={isProcessing}
                  />
                </div>
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => removeField(field.id)}
                  title="필드 삭제"
                  disabled={isProcessing}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 필드 추가 버튼 */}
        <button
          type="button"
          className="add-field-btn"
          onClick={addField}
          disabled={isProcessing}
        >
          ➕ 필드 추가
        </button>

        {/* 메타데이터 미리보기 */}
        {metadataFields.length > 0 && (
          <div className="metadata-preview-box">
            <h4>저장될 메타데이터 미리보기</h4>
            <pre>{JSON.stringify(getMetadataObject(), null, 2)}</pre>
          </div>
        )}

        <button
          onClick={handleUpdateMetadata}
          className="action-button"
          disabled={isProcessing}
        >
          {isProcessing ? '업데이트 중...' : '메타데이터 저장'}
        </button>
      </div>

      {/* 메타데이터 히스토리 */}
      {metadataHistory.length > 0 && (
        <div className="info-box">
          <h4>메타데이터 변경 히스토리</h4>
          <div className="metadata-history">
            {metadataHistory.map((meta, index) => (
              <div key={index} className="history-item">
                <div className="history-header">
                  <span className="history-index">#{index + 1}</span>
                  <span className="history-date">이전 버전</span>
                </div>
                <pre className="history-content">{meta}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이미지/URI 변경 */}
      <div className="action-form">
        <h4>이미지 변경 (Token URI)</h4>
        
        {/* 이미지 파일 업로드 옵션 */}
        <div className="form-group">
          <label>새 이미지 파일 업로드</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isProcessing}
          />
          <small>이미지를 선택하면 자동으로 IPFS에 업로드됩니다 (5MB 이하)</small>
        </div>

        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: 'white', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#495057', fontWeight: '600' }}>미리보기</span>
              <button
                onClick={handleRemoveImage}
                style={{
                  background: '#fa5252',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                disabled={isProcessing}
              >
                제거
              </button>
            </div>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ 
                width: '100%', 
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '6px',
                background: '#f8f9fa'
              }} 
            />
          </div>
        )}

        {/* 구분선 */}
        <div style={{ 
          margin: '20px 0', 
          textAlign: 'center', 
          color: '#868e96',
          position: 'relative'
        }}>
          <span style={{ 
            background: '#f8f9fa', 
            padding: '0 10px',
            position: 'relative',
            zIndex: 1,
            fontSize: '14px'
          }}>또는</span>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: '#dee2e6',
            zIndex: 0
          }}></div>
        </div>

        {/* 직접 URI 입력 옵션 */}
        <div className="form-group">
          <label>Token URI 직접 입력</label>
          <input
            type="text"
            value={newTokenURI}
            onChange={(e) => setNewTokenURI(e.target.value)}
            placeholder="ipfs://Qm... 또는 https://..."
            disabled={isProcessing || newImageFile !== null}
          />
          <small>이미 IPFS에 업로드된 URI를 직접 입력할 수 있습니다</small>
        </div>

        <button
          onClick={handleUpdateTokenURI}
          className="action-button"
          disabled={isProcessing || (!newTokenURI && !newImageFile)}
        >
          {uploadingImage ? 'IPFS 업로드 중...' : 
           isProcessing ? '업데이트 중...' : 
           'URI 업데이트'}
        </button>
      </div>

      {/* URI 히스토리 */}
      {uriHistory.length > 0 && (
        <div className="info-box">
          <h4>URI 변경 히스토리</h4>
          <div className="uri-history">
            {uriHistory.map((uri, index) => (
              <div key={index} className="uri-history-item">
                <span className="history-index">#{index + 1}</span>
                <code className="history-uri">{uri}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const NFTManagePage = () => {
  const [provider, setProvider] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [nft, setNft] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [fractionAmount, setFractionAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isProviderReady, setIsProviderReady] = useState(false);

  const [fractionName, setFractionName] = useState('');
  const [fractionSymbol, setFractionSymbol] = useState('');
  const [totalFractions, setTotalFractions] = useState('');
  const [buyoutPrice, setBuyoutPrice] = useState('');
  const [isFractionalized, setIsFractionalized] = useState(false);
  const [floorPrice, setFloorPrice] = useState(null);

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
  
  const checkFractionalStatus = useCallback(async (tokenId) => {
    try {
      const contract = await getContract(provider, 'fractional');
      const fractionalized = await contract.isFractionalized(tokenId);
      setIsFractionalized(fractionalized);
      
      try {
        const floor = await contract.floorPrice();
        const floorEth = ethers.formatEther(floor);
        setFloorPrice(floorEth);
        console.log(`🔍 NFT #${tokenId} 분할 상태:`, fractionalized);
        console.log(`💰 컨트랙트 최소 가격:`, floorEth, 'ETH');
      } catch (err) {
        console.warn('floorPrice 조회 실패:', err);
      }
      
      return fractionalized;
    } catch (err) {
      console.error('분할 상태 확인 실패:', err);
      return false;
    }
  }, [provider]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nftData = params.get('nft');
    
    if (nftData) {
      try {
        const parsedNft = JSON.parse(decodeURIComponent(nftData));
        
        // 로컬에서 최신 메타데이터 다시 조회
        if (parsedNft.tokenURI) {
          fetchNFTMetadata(parsedNft.tokenURI).then(freshMetadata => {
            if (freshMetadata) {
              parsedNft.metadata = freshMetadata;
            }
            setNft(parsedNft);
            console.log('📦 NFT 데이터 로드 (최신 메타데이터):', parsedNft);
          });
        } else {
          setNft(parsedNft);
          console.log('📦 NFT 데이터 로드:', parsedNft);
        }
        
        if (parsedNft.type === 'fractional' && provider) {
          checkFractionalStatus(parsedNft.tokenId).then(fractionalized => {
            if (fractionalized) {
              setActiveTab('tokenInfo');
            } else {
              setActiveTab('fractionalize');
            }
          });
        } else if (parsedNft.type === 'soulbound') {
          setActiveTab('burn');
        } else if (parsedNft.type === 'dynamic') {
          setActiveTab('dynamicManage');
        }
      } catch (err) {
        console.error('NFT 데이터 파싱 실패:', err);
        setError('NFT 정보를 불러올 수 없습니다.');
      }
    }
  }, [provider, checkFractionalStatus]);

  const handleSuccess = (message, hash) => {
    setError(null);
    setTxHash(hash);
    alert(message);
  };

  const handleError = (message) => {
    setError(message);
    setTxHash(null);
  };

  const handleTransfer = async () => {
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

  const handleTransferFractions = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
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

    if (!fractionAmount || Number(fractionAmount) <= 0) {
      setError('전송할 조각 개수를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const contract = await getContract(provider, 'fractional');
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const fractionData = await contract.fractionalizedNFTs(nft.tokenId);
      const tokenAddress = fractionData.fractionToken;
      
      console.log('🔍 조각 전송 시작:', {
        tokenAddress,
        recipient: recipientAddress,
        amount: fractionAmount
      });
      
      const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function symbol() view returns (string)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      
      const balance = await tokenContract.balanceOf(userAddress);
      const symbol = await tokenContract.symbol();
      
      console.log('💰 내 보유량:', balance.toString(), symbol);
      
      if (balance < fractionAmount) {
        throw new Error(
          `조각이 부족합니다.\n` +
          `보유량: ${balance.toString()}개\n` +
          `전송 시도: ${fractionAmount}개`
        );
      }
      
      console.log('📤 조각 전송 중...');
      const tx = await tokenContract.transfer(recipientAddress, fractionAmount);
      
      console.log('✅ 트랜잭션 전송됨:', tx.hash);
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      
      alert(`조각 전송 완료!\n\n${fractionAmount}개의 ${symbol} 조각을\n${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}에게 전송했습니다.`);
      
      setRecipientAddress('');
      setFractionAmount('');
      
    } catch (err) {
      console.error('조각 전송 실패:', err);
      
      let errorMessage = '조각 전송에 실패했습니다.';
      
      if (err.message.includes('조각이 부족합니다')) {
        errorMessage = err.message;
      } else if (err.code === 4001) {
        errorMessage = '사용자가 트랜잭션을 거부했습니다.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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

  const handleRedeem = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }
  
    if (!window.confirm('모든 조각을 소각하고 원본 NFT를 되찾으시겠습니까?')) {
      return;
    }
  
    setIsProcessing(true);
    setError(null);
    setTxHash(null);
  
    try {
      const contract = await getContract(provider, 'fractional');
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const fractionData = await contract.fractionalizedNFTs(nft.tokenId);
      const tokenAddress = fractionData.fractionToken;
      const totalFractions = fractionData.totalFractions;
      
      console.log('🔍 분할 정보:', {
        tokenAddress,
        totalFractions: totalFractions.toString()
      });
      
      const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      
      const balance = await tokenContract.balanceOf(userAddress);
      console.log('💰 내 보유량:', balance.toString());
      console.log('💰 필요량:', totalFractions.toString());
      
      if (balance < totalFractions) {
        throw new Error(
          `조각이 부족합니다.\n` +
          `필요: ${totalFractions.toString()}개\n` +
          `보유: ${balance.toString()}개`
        );
      }
      
      const contractAddress = contract.target || await contract.getAddress();
      const allowance = await tokenContract.allowance(userAddress, contractAddress);
      console.log('✅ 현재 Allowance:', allowance.toString());
      
      if (allowance < totalFractions) {
        console.log('⚠️ Approve 필요, 진행 중...');
        const approveTx = await tokenContract.approve(contractAddress, totalFractions);
        console.log('📤 Approve 트랜잭션:', approveTx.hash);
        await approveTx.wait();
        console.log('✅ Approve 완료!');
      }
      
      console.log('🔄 NFT 재결합 시작...');
      const tx = await contract.redeemNFT(nft.tokenId);
      
      console.log('✅ 트랜잭션 전송됨:', tx.hash);
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
  
      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('재결합 완료! 원본 NFT를 되찾았습니다!');
        window.close();
      }, 3000);
    } catch (err) {
      console.error('재결합 실패:', err);
      
      let errorMessage = 'NFT 재결합에 실패했습니다.';
      
      if (err.message.includes('조각이 부족합니다')) {
        errorMessage = err.message;
      } else if (err.message.includes('Must own all fractions')) {
        errorMessage = '모든 조각(100%)을 보유해야 재결합할 수 있습니다.';
      } else if (err.message.includes('NFT not fractionalized')) {
        errorMessage = '이 NFT는 분할되지 않았습니다.';
      } else if (err.code === 4001) {
        errorMessage = '사용자가 트랜잭션을 거부했습니다.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFractionalize = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }

    if (!fractionName || !fractionSymbol || !totalFractions || !buyoutPrice) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (Number(totalFractions) <= 0) {
      setError('총 조각 개수는 1 이상이어야 합니다.');
      return;
    }

    if (parseFloat(buyoutPrice) <= 0) {
      setError('매입 가격은 0보다 커야 합니다.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const contract = await getContract(provider, 'fractional');
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const buyoutPriceWei = ethers.parseEther(buyoutPrice);

      const contractAddress = contract.target || await contract.getAddress();
      
      console.log('NFT 분할 시작:', {
        tokenId: nft.tokenId,
        fractionName,
        fractionSymbol,
        totalFractions: Number(totalFractions),
        buyoutPrice: buyoutPriceWei.toString()
      });
      
      const nftContract = await getContract(provider, nft.type);
      
      const nftContractAddress = nftContract.target || await nftContract.getAddress();
      console.log('📍 NFT/Fractional 컨트랙트 주소:', nftContractAddress);
      
      const owner = await nftContract.ownerOf(nft.tokenId);
      console.log('✅ NFT 소유자:', owner);
      console.log('✅ 현재 주소:', address);
      console.log('✅ 소유자 일치:', owner.toLowerCase() === address.toLowerCase());
      
      const isApproved = await nftContract.isApprovedForAll(address, contractAddress);
      console.log('✅ Approve 상태:', isApproved);
      
      if (!isApproved && nftContractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
        console.log('⚠️ NFT가 컨트랙트에 approve되지 않았습니다. approve 진행...');
        const approveTx = await nftContract.setApprovalForAll(contractAddress, true);
        await approveTx.wait();
        console.log('✅ Approve 완료!');
      }

      console.log('🔍 컨트랙트 확인:');
      console.log('- fractionalizeNFT 함수 존재:', typeof contract.fractionalizeNFT === 'function');
      
      try {
        const floorPrice = await contract.floorPrice();
        const floorPriceEth = ethers.formatEther(floorPrice);
        console.log('💰 컨트랙트 최소 가격 (floorPrice):', floorPriceEth, 'ETH');
        console.log('💰 입력한 매입 가격 (buyoutPrice):', buyoutPrice, 'ETH');
        
        if (parseFloat(buyoutPrice) < parseFloat(floorPriceEth)) {
          throw new Error(`매입 가격이 최소 가격보다 낮습니다.\n최소 가격: ${floorPriceEth} ETH\n입력한 가격: ${buyoutPrice} ETH`);
        }
      } catch (e) {
        if (e.message.includes('최소 가격보다 낮습니다')) {
          throw e;
        }
        console.warn('- floorPrice 확인 실패:', e.message);
      }
      
      try {
        const alreadyFractionalized = await contract.isFractionalized(nft.tokenId);
        console.log('- 이미 분할됨:', alreadyFractionalized);
        if (alreadyFractionalized) {
          throw new Error('이 NFT는 이미 분할되었습니다.');
        }
      } catch (e) {
        if (e.message.includes('이미 분할되었습니다')) throw e;
        console.warn('- isFractionalized 함수 없음 또는 호출 실패');
      }
      
      console.log('📤 트랜잭션 전송 중...');
      
      try {
        const gasEstimate = await contract.fractionalizeNFT.estimateGas(
          nft.tokenId,
          fractionName,
          fractionSymbol,
          Number(totalFractions),
          buyoutPriceWei
        );
        console.log('✅ 예상 가스:', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ 가스 추정 실패:', gasError);
        
        if (gasError.data) {
          console.error('에러 데이터:', gasError.data);
        }
        if (gasError.error) {
          console.error('내부 에러:', gasError.error);
        }
        
        try {
          await contract.fractionalizeNFT.staticCall(
            nft.tokenId,
            fractionName,
            fractionSymbol,
            Number(totalFractions),
            buyoutPriceWei
          );
        } catch (staticError) {
          console.error('❌ StaticCall 에러:', staticError);
          
          if (staticError.data) {
            try {
              const errorData = staticError.data;
              console.error('상세 에러 데이터:', errorData);
              
              if (typeof errorData === 'string' && errorData.length > 10) {
                const selector = errorData.slice(0, 10);
                console.error('에러 선택자:', selector);
              }
            } catch {}
          }
          
          throw staticError;
        }
        
        throw gasError;
      }
      
      const tx = await contract.fractionalizeNFT(
        nft.tokenId,
        fractionName,
        fractionSymbol,
        Number(totalFractions),
        buyoutPriceWei
      );

      console.log('✅ 트랜잭션 전송됨:', tx.hash);
      console.log('⏳ 블록 확인 대기 중...');
      const receipt = await tx.wait();
      
      console.log('✅ 트랜잭션 확인됨!');
      setTxHash(receipt.hash);

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
        alert(`분할 완료!\n\nERC-20 토큰 주소:\n${fractionTokenAddress}\n\nTrust Wallet에 추가하거나 앱에서 조각을 전송할 수 있습니다.`);
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
  const isDynamic = nft.type === 'dynamic';

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
        <div className="info-banner success">
          ✅ 이 NFT는 분할되었습니다! 아래 탭에서 조각 정보를 확인하고 전송할 수 있습니다.
        </div>
      )}

      {isDynamic && (
        <div className="info-banner success">
          🔄 Dynamic NFT입니다! 메타데이터와 이미지를 동적으로 변경할 수 있습니다.
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs">
          {isDynamic && (
            <button className={`tab ${activeTab === 'dynamicManage' ? 'active' : ''}`} onClick={() => setActiveTab('dynamicManage')}>메타데이터 관리</button>
          )}
          {isFractional && !isFractionalized && (
            <button className={`tab ${activeTab === 'fractionalize' ? 'active' : ''}`} onClick={() => setActiveTab('fractionalize')}>분할(Split)</button>
          )}
          {!isSoulbound && !isFractionalized && (
            <button className={`tab ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => setActiveTab('transfer')}>전송(Transfer)</button>
          )}
          {!isFractionalized && (
            <button className={`tab ${activeTab === 'burn' ? 'active' : ''}`} onClick={() => setActiveTab('burn')}>소각(Burn)</button>
          )}
          {isFractional && isFractionalized && (
            <>
              <button className={`tab ${activeTab === 'tokenInfo' ? 'active' : ''}`} onClick={() => setActiveTab('tokenInfo')}>분할 토큰 정보</button>
              <button className={`tab ${activeTab === 'transferFractions' ? 'active' : ''}`} onClick={() => setActiveTab('transferFractions')}>조각 전송</button>
              <button className={`tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => setActiveTab('redeem')}>재결합</button>
              <button className={`tab ${activeTab === 'buyout' ? 'active' : ''}`} onClick={() => setActiveTab('buyout')}>매입/투표</button>
            </>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'dynamicManage' && isDynamic && (
            <DynamicNFTManager 
              nft={nft} 
              provider={provider}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}

          {activeTab === 'transfer' && !isSoulbound && !isFractionalized && (
            <div className="action-form">
              <div className="form-group">
                <label htmlFor="recipient">받는 주소</label>
                <input
                  id="recipient"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isProcessing}
                />
                <small>NFT를 받을 이더리움 주소를 입력하세요</small>
              </div>

              <button
                onClick={handleTransfer}
                className="action-button transfer"
                disabled={isProcessing}
              >
                {isProcessing ? '전송 중...' : '전송하기'}
              </button>
            </div>
          )}

          {activeTab === 'transferFractions' && isFractional && isFractionalized && (
            <div className="action-form">
              <div className="info-box">
                <h3>📤 조각 전송</h3>
                <p>보유한 조각 토큰을 다른 주소로 전송할 수 있습니다.</p>
                <p>Trust Wallet에 추가하지 않아도 앱에서 바로 전송 가능합니다.</p>
              </div>

              <div className="form-group">
                <label htmlFor="fractionRecipient">받는 주소</label>
                <input
                  id="fractionRecipient"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isProcessing}
                />
                <small>조각을 받을 이더리움 주소를 입력하세요</small>
              </div>

              <div className="form-group">
                <label htmlFor="fractionAmount">전송할 조각 개수</label>
                <input
                  id="fractionAmount"
                  type="number"
                  value={fractionAmount}
                  onChange={(e) => setFractionAmount(e.target.value)}
                  placeholder="예: 5"
                  min="1"
                  disabled={isProcessing}
                />
                <small>전송할 조각의 개수를 입력하세요</small>
              </div>

              <button
                onClick={handleTransferFractions}
                className="action-button transfer"
                disabled={isProcessing}
              >
                {isProcessing ? '전송 중...' : '조각 전송하기'}
              </button>

              <div className="info-note">
                <p>💡 <strong>참고:</strong></p>
                <p>• 분할 토큰 정보 탭에서 현재 보유량을 확인할 수 있습니다</p>
                <p>• 재결합하려면 모든 조각(100%)이 필요합니다</p>
              </div>
            </div>
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
            <div className="action-form">
              <div className="form-group">
                <label htmlFor="fractionName">조각 토큰 이름</label>
                <input
                  id="fractionName"
                  type="text"
                  value={fractionName}
                  onChange={(e) => setFractionName(e.target.value)}
                  placeholder="예: Fractional Art Token"
                  disabled={isProcessing}
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
                />
              </div>

              <div className="form-group">
                <label htmlFor="totalFractions">총 조각 개수</label>
                <input
                  id="totalFractions"
                  type="number"
                  value={totalFractions}
                  onChange={(e) => setTotalFractions(e.target.value)}
                  placeholder="예: 10"
                  min="1"
                  disabled={isProcessing}
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
                  placeholder={floorPrice ? `최소 ${floorPrice} ETH` : "예: 100"}
                  disabled={isProcessing}
                />
                {floorPrice && parseFloat(floorPrice) > 10 && (
                  <div className="warning-box floor-price-warning">
                    <p className="warning-title">
                      ⚠️ <strong>컨트랙트 최소 가격이 매우 높게 설정되어 있습니다: {floorPrice} ETH</strong>
                    </p>
                    <p className="warning-text">
                      • 테스트용이므로 그냥 {floorPrice} 입력해서 테스트하세요<br/>
                      • 또는 컨트랙트 Owner가 <code>setFloorPrice</code> 함수로 낮춰야 합니다
                    </p>
                  </div>
                )}
                {floorPrice && parseFloat(floorPrice) <= 10 && (
                  <small className="floor-price-warning">
                    ⚠️ 최소 가격: <strong>{floorPrice} ETH</strong> 이상 입력해주세요
                  </small>
                )}
                {!floorPrice && (
                  <small>누군가 이 가격을 지불하면 전체 NFT를 매입할 수 있습니다</small>
                )}
              </div>

              {totalFractions && buyoutPrice && (
                <div className="price-info-box">
                  <strong>조각당 가격:</strong> {(parseFloat(buyoutPrice) / Number(totalFractions)).toFixed(6)} ETH
                </div>
              )}

              <button
                onClick={handleFractionalize}
                className="action-button fractionalize"
                disabled={isProcessing}
              >
                {isProcessing ? '분할 중...' : 'NFT 분할하기'}
              </button>
            </div>
          )}

          {activeTab === 'tokenInfo' && isFractional && isFractionalized && (
            <div className="token-info-section">
              <FractionTokenInfo nft={nft} provider={provider} />
            </div>
          )}

          {activeTab === 'redeem' && isFractional && isFractionalized && (
            <div className="redeem-section">
              <div className="info-box">
                <h3>🔄 NFT 재결합</h3>
                <p>모든 조각 토큰을 소각하고 원본 NFT를 되찾을 수 있습니다.</p>
                <p><strong>조건:</strong> 모든 조각(100%)을 보유해야 합니다.</p>
              </div>

              <div className="redeem-info">
                <p>💡 재결합하면:</p>
                <p>• 모든 조각 토큰이 소각됩니다</p>
                <p>• 원본 NFT #{nft.tokenId}를 다시 소유하게 됩니다</p>
                <p>• 더 이상 분할 상태가 아닙니다</p>
              </div>

              <button onClick={handleRedeem} className="action-button redeem" disabled={isProcessing}>
                {isProcessing ? '재결합 중...' : '🔄 NFT 재결합하기'}
              </button>
            </div>
          )}

          {activeTab === 'buyout' && isFractional && isFractionalized && (
            <div className="vote-section">
              <div className="info-box">
                <h3>💰 매입 제안 & 투표</h3>
                <p>이 기능은 추후 구현 예정입니다.</p>
                <p>매입 제안을 하거나 다른 사람의 제안에 투표할 수 있습니다.</p>
              </div>
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