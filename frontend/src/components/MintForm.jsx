import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { uploadNFT } from '../utils/ipfs.js';
import { mintEvmNFT } from '../utils/EVMcontract.js';
import { CHAIN_TYPES } from '../config/chains.js';
import './MintForm.css';

const MintForm = () => {
  const { account, provider, isConnected, isCorrectNetwork, currentChain } = useWeb3();
  
  const [nftType, setNftType] = useState('native');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');

  const [metadataFields, setMetadataFields] = useState([
    { id: 1, fieldName: '', value: '' },
    { id: 2, fieldName: '', value: '' }
  ]);

  const [isMinting, setIsMinting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mintResult, setMintResult] = useState(null);
  const [error, setError] = useState(null);

  const isButtonDisabled = isMinting || !isConnected || !isCorrectNetwork;

  // 체인 변경 시 상태 초기화
  useEffect(() => {
    console.log('🔄 체인 변경 감지:', currentChain?.name);
    setMintResult(null);
    setError(null);
  }, [currentChain?.id, currentChain?.name]);

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
    
    let uploadResult = null;

    try {
      // 1단계: 이미지를 로컬 폴더 및 Pinata IPFS에 업로드
      setUploadProgress('이미지를 로컬 폴더 및 Pinata IPFS에 업로드 중...');
      console.log('📤 업로드 시작 - 로컬 저장 + Pinata 업로드');
      
      // Dynamic NFT의 경우 메타데이터 포함하여 업로드
      const additionalMetadata = nftType === 'dynamic' ? getMetadataObject() : null;
      uploadResult = await uploadNFT(imageFile, name, description, additionalMetadata);
      
      console.log('✅ 업로드 완료 - TokenURI:', uploadResult.tokenURI);
      console.log('💾 타임스탬프:', uploadResult.timestamp);
      
      // 2단계: 블록체인에 민팅
      setUploadProgress('업로드 완료! 블록체인에 민팅 중...');
      
      let result;
      if (currentChain?.type === CHAIN_TYPES.EVM) {
        const metadata = nftType === 'dynamic' 
          ? JSON.stringify(additionalMetadata) 
          : '';
        result = await mintEvmNFT(provider, nftType, recipient, uploadResult.tokenURI, metadata);
      } else {
        throw new Error('지원하지 않는 블록체인입니다.');
      }
      
      console.log('✅ 민팅 완료! Token ID:', result.tokenId);
      
      setMintResult({
        ...result,
        tokenURI: uploadResult.tokenURI,
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
      setMetadataFields([]);
      
      console.log('🎉 민팅 완료!', result);
      
    } catch (err) {
      console.error('❌ 민팅 실패:', err);
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
        <div className="chain-badge" key={currentChain.id}>
          <span>{currentChain.name}에서 민팅</span>
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
              <span>Soulbound Token</span>
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
            <label className="radio-label">
              <input
                type="radio"
                value="dynamic"
                checked={nftType === 'dynamic'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Dynamic NFT</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="composable"
                checked={nftType === 'composable'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Composable NFT</span>
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

        {/* Dynamic NFT 메타데이터 입력 */}
        {nftType === 'dynamic' && (
          <div className="dynamic-metadata-section">
            <h3>Dynamic 메타데이터</h3>
            <p className="info-text">
              필드명과 값을 자유롭게 입력하세요. 이 정보는 NFT 소유자가 나중에 수정할 수 있습니다.
            </p>

            {/* 필드 목록 */}
            <div className="metadata-fields">
              {metadataFields.map((field, index) => (
                <div key={field.id} className="metadata-field-row">
                  <div className="field-inputs">
                    <div className="field-name-input">
                      <label>필드</label>
                      <input
                        type="text"
                        value={field.fieldName}
                        onChange={(e) => updateFieldName(field.id, e.target.value)}
                        placeholder={
                          index === 0 ? "예: 전공" :
                          index === 1 ? "예: 졸업연도" :
                          "필드를 입력하세요"
                        }
                      />
                    </div>
                    <div className="field-value-input">
                      <label>내용</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                        placeholder={
                          index === 0 ? "예: 컴퓨터공학" :
                          index === 1 ? "예: 2025" :
                          "값을 입력하세요"
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="remove-field-btn"
                      onClick={() => removeField(field.id)}
                      title="필드 삭제"
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
            >
              ➕ 필드 추가
            </button>

            {/* 메타데이터 미리보기 */}
            {metadataFields.length > 0 && (
              <div className="metadata-preview-box">
                <h4>저장될 메타데이터</h4>
                <pre>{JSON.stringify(getMetadataObject(), null, 2)}</pre>
              </div>
            )}
          </div>
        )}

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
            <h3>민팅 성공!</h3>
            <p><strong>NFT 타입:</strong> {mintResult.nftType}</p>
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
    </div>
  );
};

export default MintForm;