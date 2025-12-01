import { ethers } from 'ethers';
import {
  SOULBOUND_ADDRESS,
  TRANSFERABLE_ADDRESS,
  SOULBOUND_ABI,
  TRANSFERABLE_ABI
} from '../config/contracts';

/**
 * 스마트 컨트랙트 인스턴스 가져오기
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} contractType - 'soulbound' 또는 'transferable'
 * @returns {ethers.Contract} 컨트랙트 인스턴스
 */
export const getContract = async (provider, contractType) => {
  const signer = await provider.getSigner();
  
  if (contractType === 'soulbound') {
    return new ethers.Contract(SOULBOUND_ADDRESS, SOULBOUND_ABI, signer);
  } else if (contractType === 'transferable') {
    return new ethers.Contract(TRANSFERABLE_ADDRESS, TRANSFERABLE_ABI, signer);
  }
  
  throw new Error('Invalid contract type');
};

/**
 * NFT 민팅
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} contractType - 'soulbound' 또는 'transferable'
 * @param {string} recipientAddress - NFT를 받을 주소
 * @param {string} tokenURI - 메타데이터 URI
 * @returns {Promise<Object>} 민팅 결과 (txHash, tokenId)
 */
export const mintNFT = async (provider, contractType, recipientAddress, tokenURI) => {
  try {
    const contract = await getContract(provider, contractType);
    
    console.log('민팅 트랜잭션 전송 중...');
    const tx = await contract.mint(recipientAddress, tokenURI);
    
    console.log('트랜잭션 대기 중...', tx.hash);
    const receipt = await tx.wait();
    
    // Transfer 이벤트에서 tokenId 추출
    const transferEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id('Transfer(address,address,uint256)')
    );
    
    const tokenId = transferEvent ? 
      ethers.toBigInt(transferEvent.topics[3]).toString() : 
      null;
    
    return {
      success: true,
      txHash: receipt.hash,
      tokenId,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('민팅 실패:', error);
    throw error;
  }
};

/**
 * NFT 전송 (TransferableNFT만 가능)
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} fromAddress - 보내는 주소
 * @param {string} toAddress - 받는 주소
 * @param {string} tokenId - NFT Token ID
 * @returns {Promise<Object>} 전송 결과
 */
export const transferNFT = async (provider, fromAddress, toAddress, tokenId) => {
  try {
    const contract = await getContract(provider, 'transferable');
    
    console.log('전송 트랜잭션 전송 중...');
    const tx = await contract.transferFrom(fromAddress, toAddress, tokenId);
    
    console.log('트랜잭션 대기 중...', tx.hash);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('전송 실패:', error);
    throw error;
  }
};

/**
 * NFT 소유자 확인
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} contractType - 'soulbound' 또는 'transferable'
 * @param {string} tokenId - NFT Token ID
 * @returns {Promise<string>} 소유자 주소
 */
export const getTokenOwner = async (provider, contractType, tokenId) => {
  try {
    const contract = await getContract(provider, contractType);
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('소유자 조회 실패:', error);
    throw error;
  }
};

/**
 * NFT 메타데이터 URI 가져오기
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} contractType - 'soulbound' 또는 'transferable'
 * @param {string} tokenId - NFT Token ID
 * @returns {Promise<string>} Token URI
 */
export const getTokenURI = async (provider, contractType, tokenId) => {
  try {
    const contract = await getContract(provider, contractType);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Token URI 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자가 소유한 NFT 목록 가져오기
 * @param {ethers.BrowserProvider} provider - Ethers provider
 * @param {string} contractType - 'soulbound' 또는 'transferable'
 * @param {string} ownerAddress - 소유자 주소
 * @returns {Promise<Array>} Token ID 배열
 */
export const getTokensOfOwner = async (provider, contractType, ownerAddress) => {
  try {
    const contract = await getContract(provider, contractType);
    const tokens = await contract.tokensOfOwner(ownerAddress);
    return tokens.map(token => token.toString());
  } catch (error) {
    console.error('토큰 목록 조회 실패:', error);
    throw error;
  }
};