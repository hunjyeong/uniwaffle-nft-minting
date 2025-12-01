import axios from 'axios';
import { PINATA_JWT, PINATA_GATEWAY } from '../config/contracts.js';

/**
 * 이미지를 Pinata에 업로드
 * @param {File} file - 업로드할 이미지 파일
 * @returns {Promise<string>} IPFS URL
 */
export const uploadImageToPinata = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );

    const ipfsHash = response.data.IpfsHash;
    return `https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`;
  } catch (error) {
    console.error('이미지 업로드 실패:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

/**
 * 메타데이터를 Pinata에 업로드
 * @param {Object} metadata - NFT 메타데이터
 * @returns {Promise<string>} 메타데이터 IPFS URL
 */
export const uploadMetadataToPinata = async (metadata) => {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );

    const ipfsHash = response.data.IpfsHash;
    return `https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`;
  } catch (error) {
    console.error('메타데이터 업로드 실패:', error);
    throw new Error('메타데이터 업로드에 실패했습니다.');
  }
};

/**
 * NFT 전체 업로드 프로세스 (이미지 + 메타데이터)
 * @param {File} imageFile - 이미지 파일
 * @param {string} name - NFT 이름
 * @param {string} description - NFT 설명
 * @returns {Promise<string>} 메타데이터 URI
 */
export const uploadNFT = async (imageFile, name, description) => {
  try {
    // 1. 이미지 업로드
    console.log('이미지 업로드 중...');
    const imageUrl = await uploadImageToPinata(imageFile);
    console.log('이미지 업로드 완료:', imageUrl);

    // 2. 메타데이터 생성
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes: [
        {
          trait_type: "Created",
          value: new Date().toISOString()
        }
      ]
    };

    // 3. 메타데이터 업로드
    console.log('메타데이터 업로드 중...');
    const metadataUrl = await uploadMetadataToPinata(metadata);
    console.log('메타데이터 업로드 완료:', metadataUrl);

    return metadataUrl;
  } catch (error) {
    console.error('NFT 업로드 실패:', error);
    throw error;
  }
};