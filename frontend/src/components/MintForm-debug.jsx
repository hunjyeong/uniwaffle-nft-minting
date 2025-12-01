import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { uploadNFT } from '../utils/ipfs.js';
import { mintNFT } from '../utils/contract.js';

const MintForm = () => {
  const { account, provider, isConnected, isCorrectNetwork } = useWeb3();
  
  const [nftType, setNftType] = useState('soulbound');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  
  const [isMinting, setIsMinting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mintResult, setMintResult] = useState(null);
  const [error, setError] = useState(null);

  // 버튼 비활성화 조건
  const isButtonDisabled = isMinting || !isConnected || !isCorrectNetwork;

  // 디버깅 로그
  console.log('🔍 MintForm State:', {
    isConnected,
    isCorrectNetwork,
    account,
    provider: !!provider,
    isMinting,
    isButtonDisabled,
    name,
    description,
    hasImage: !!imageFile
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      setImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('먼저 지갑을 연결해주세요.');
      return;
    }
    
    if (!isCorrectNetwork) {
      setError('Sepolia 네트워크로 전환해주세요.');
      return;
    }

    if (!name || !description || !imageFile) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    const recipient = recipientAddress || account;
    setIsMinting(true);
    setError(null);
    setMintResult(null);
    setUploadProgress('');

    try {
      setUploadProgress('📤 이미지를 IPFS에 업로드 중...');
      const tokenURI = await uploadNFT(imageFile, name, description);
      
      setUploadProgress('✅ 업로드 완료! 민팅 중...');
      const result = await mintNFT(provider, nftType, recipient, tokenURI);
      
      setMintResult({
        ...result,
        tokenURI,
        recipient,
        nftType
      });
      
      setUploadProgress('');
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setRecipientAddress('');
      
    } catch (err) {
      console.error('민팅 실패:', err);
      setError(err.message || '민팅에 실패했습니다.');
      setUploadProgress('');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="mint-form-container">
      {/* 🔍 디버그 정보 */}
      <div style={{
        padding: '15px',
        background: isButtonDisabled ? '#ffe6e6' : '#e6ffe6',
        border: `3px solid ${isButtonDisabled ? '#ff0000' : '#00ff00'}`,
        marginBottom: '20px',
        fontFamily: 'monospace',
        fontSize: '14px',
        borderRadius: '8px'
      }}>
        <h4 style={{margin: '0 0 10px 0', color: '#333'}}>🔍 디버그 정보</h4>
        <div>✅ 지갑 연결: <strong style={{color: isConnected ? 'green' : 'red'}}>{isConnected ? 'YES ✓' : 'NO ✗'}</strong></div>
        <div>✅ Sepolia 네트워크: <strong style={{color: isCorrectNetwork ? 'green' : 'red'}}>{isCorrectNetwork ? 'YES ✓' : 'NO ✗'}</strong></div>
        <div>✅ 계정: <strong>{account ? account.slice(0, 10) + '...' : '없음'}</strong></div>
        <div>✅ Provider: <strong>{provider ? 'YES ✓' : 'NO ✗'}</strong></div>
        <div>✅ 민팅 중: <strong>{isMinting ? 'YES' : 'NO'}</strong></div>
        <div>✅ 이름: <strong>{name || '(비어있음)'}</strong></div>
        <div>✅ 설명: <strong>{description ? '입력됨' : '(비어있음)'}</strong></div>
        <div>✅ 이미지: <strong>{imageFile ? imageFile.name : '(선택 안 됨)'}</strong></div>
        <div style={{
          marginTop: '15px', 
          padding: '10px',
          background: isButtonDisabled ? '#ff000020' : '#00ff0020',
          borderRadius: '4px'
        }}>
          <strong style={{fontSize: '16px'}}>
            버튼 상태: {isButtonDisabled ? '❌ 비활성화됨' : '✅ 활성화됨'}
          </strong>
          {isButtonDisabled && (
            <div style={{marginTop: '5px', fontSize: '12px'}}>
              이유: {!isConnected ? '지갑 미연결' : !isCorrectNetwork ? '네트워크 불일치' : '민팅 중'}
            </div>
          )}
        </div>
      </div>

      <h2>🎨 NFT 민팅</h2>
      
      <form onSubmit={handleMint} className="mint-form">
        <div className="form-group">
          <label>NFT 타입</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="soulbound"
                checked={nftType === 'soulbound'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>🔒 Soulbound (전송 불가)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="transferable"
                checked={nftType === 'transferable'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>🔄 Transferable (전송 가능)</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">NFT 이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: OSDC Certificate"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="NFT에 대한 설명을 입력하세요"
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">이미지</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="recipient">
            받을 주소 (선택사항)
            <span className="hint">비워두면 자신에게 민팅됩니다</span>
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        {uploadProgress && (
          <div className="progress-message">
            {uploadProgress}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {mintResult && (
          <div className="success-message">
            <h3>✅ 민팅 성공!</h3>
            <p><strong>Token ID:</strong> {mintResult.tokenId}</p>
            <p><strong>받는 주소:</strong> {mintResult.recipient}</p>
            <p>
              <strong>트랜잭션:</strong>{' '}
              <a 
                href={`https://sepolia.etherscan.io/tx/${mintResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Etherscan에서 보기 →
              </a>
            </p>
          </div>
        )}

        <button 
          type="submit" 
          className="mint-button"
          disabled={isButtonDisabled}
          style={{
            opacity: isButtonDisabled ? 0.5 : 1,
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {isMinting ? '민팅 중...' : '🎨 민팅하기'}
        </button>
      </form>
    </div>
  );
};

export default MintForm;