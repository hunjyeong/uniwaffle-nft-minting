import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { uploadNFT } from '../utils/ipfs.js';
import { mintEvmNFT } from '../utils/EVMcontract.js';
import { CHAIN_TYPES } from '../config/chains.js';

const MintForm = () => {
  const { account, provider, isConnected, isCorrectNetwork, currentChain } = useWeb3();
  
  const [nftType, setNftType] = useState('native');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  
  const [isMinting, setIsMinting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mintResult, setMintResult] = useState(null);
  const [error, setError] = useState(null);

  const isButtonDisabled = isMinting || !isConnected || !isCorrectNetwork;

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
      setError(`${currentChain?.name} 네트워크로 전환해주세요.`);
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
      setUploadProgress('이미지를 IPFS에 업로드 중...');
      const tokenURI = await uploadNFT(imageFile, name, description);
      
      setUploadProgress('업로드 완료! 민팅 중...');
      
      let result;
      if (currentChain?.type === CHAIN_TYPES.EVM) {
        result = await mintEvmNFT(provider, nftType, recipient, tokenURI);
      } else {
        throw new Error('지원하지 않는 블록체인입니다.');
      }
      
      setMintResult({
        ...result,
        tokenURI,
        recipient,
        nftType,
        chain: currentChain.name
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
      <h2>NFT Minting</h2>
      
      {currentChain && (
        <div className="chain-badge">
          <span>{currentChain.name}에서 민팅</span>
        </div>
      )}

      {!isConnected && (
        <div className="info-message">
          💡 먼저 상단에서 지갑을 연결해주세요
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="warning-message">
          ⚠️ 올바른 네트워크로 전환해주세요
        </div>
      )}
      
      <form onSubmit={handleMint} className="mint-form">
        <div className="form-group">
          <label>NFT Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="native"
                checked={nftType === 'native'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Native NFT</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="soulbound"
                checked={nftType === 'soulbound'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Soulbound Token (전송 불가)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="fractional"
                checked={nftType === 'fractional'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Fractional NFT</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">NFT Name</label>
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
            <h3>민팅 성공! 🎉</h3>
            <p><strong>체인:</strong> {mintResult.chain}</p>
            {mintResult.tokenId && (
              <p><strong>Token ID:</strong> {mintResult.tokenId}</p>
            )}
            <p><strong>받는 주소:</strong> {mintResult.recipient}</p>
            <p>
              <strong>트랜잭션:</strong>{' '}
              <a 
                href={`${currentChain?.explorer}/tx/${mintResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explorer에서 보기 →
              </a>
            </p>
          </div>
        )}

        <button 
          type="submit" 
          className="mint-button"
          disabled={isButtonDisabled}
        >
          {isMinting ? '민팅 중...' : '민팅하기'}
        </button>
      </form>

      <style jsx>{`
        .mint-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        h2 {
          margin-bottom: 20px;
          color: #212529;
        }

        .chain-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          background: #e7f5ff;
          border: 2px solid #74c0fc;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
          color: #1864ab;
        }

        .chain-icon {
          font-size: 20px;
        }

        .info-message {
          padding: 12px 16px;
          background: #e7f5ff;
          color: #1864ab;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .warning-message {
          padding: 12px 16px;
          background: #fff3bf;
          color: #f59f00;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .mint-form {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #495057;
        }

        .hint {
          display: block;
          font-size: 12px;
          font-weight: 400;
          color: #868e96;
          margin-top: 4px;
        }

        input[type="text"],
        textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        input[type="text"]:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        input[type="file"] {
          width: 100%;
          padding: 8px;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .radio-label:hover {
          background: #f8f9fa;
          border-color: #667eea;
        }

        .radio-label input[type="radio"] {
          cursor: pointer;
        }

        .image-preview {
          margin-top: 12px;
          text-align: center;
        }

        .image-preview img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          border: 2px solid #e9ecef;
        }

        .progress-message {
          padding: 12px;
          background: #e7f5ff;
          border-radius: 8px;
          color: #1864ab;
          font-weight: 600;
          text-align: center;
          margin-bottom: 16px;
        }

        .error-message {
          padding: 12px;
          background: #ffe0e0;
          color: #c92a2a;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .success-message {
          padding: 16px;
          background: #d3f9d8;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .success-message h3 {
          margin: 0 0 12px 0;
          color: #2b8a3e;
        }

        .success-message p {
          margin: 8px 0;
          color: #2b8a3e;
        }

        .success-message a {
          color: #1864ab;
          text-decoration: underline;
        }

        .mint-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .mint-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .mint-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MintForm;