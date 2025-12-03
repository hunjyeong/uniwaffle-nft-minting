import { ethers } from 'ethers';
import {
  SOULBOUND_ABI,
  NATIVENFT_ABI,
  FRACTIONAL_ABI
} from '../config/contracts.js';

// 컨트랙트 주소 (체인별로 다를 수 있음)
// config/contracts.js에서 가져온 주소를 사용하거나 여기서 체인별로 관리
const CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  '0xaa36a7': {
    native: process.env.REACT_APP_NATIVENFT_ADDRESS || '',
    soulbound: process.env.REACT_APP_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_FRACTIONAL_ADDRESS || ''
  },
  // Ethereum Mainnet
  '0x1': {
    native: '',
    soulbound: '',
    fractional: ''
  },
  // Polygon
  '0x89': {
    native: '',
    soulbound: '',
    fractional: ''
  },
  // Arbitrum
  '0xa4b1': {
    native: '',
    soulbound: '',
    fractional: ''
  },
  // Optimism
  '0xa': {
    native: '',
    soulbound: '',
    fractional: ''
  },
  // Base
  '0x2105': {
    native: '',
    soulbound: '',
    fractional: ''
  }
};

// ABI 매핑
const getABI = (nftType) => {
  switch(nftType) {
    case 'soulbound':
      return SOULBOUND_ABI;
    case 'native':
      return NATIVENFT_ABI;
    case 'fractional':
      return FRACTIONAL_ABI;
    default:
      throw new Error('Invalid NFT type');
  }
};

/**
 * 컨트랙트 인스턴스 가져오기
 */
export const getContract = async (provider, nftType) => {
  try {
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);

    const contractAddress = CONTRACT_ADDRESSES[chainId]?.[nftType];
    
    if (!contractAddress || contractAddress === '') {
      throw new Error(`${chainId} 체인에서 ${nftType} 컨트랙트를 찾을 수 없습니다.`);
    }

    const abi = getABI(nftType);
    return new ethers.Contract(contractAddress, abi, signer);
  } catch (error) {
    console.error('컨트랙트 로드 실패:', error);
    throw error;
  }
};

/**
 * EVM 체인에서 NFT 민팅
 */
export const mintEvmNFT = async (provider, nftType, recipientAddress, tokenURI) => {
  try {
    const contract = await getContract(provider, nftType);
    
    console.log('민팅 시작:', {
      nftType,
      recipient: recipientAddress,
      tokenURI,
      contractAddress: await contract.getAddress()
    });
    
    // mintWithURI 함수 사용
    const tx = await contract.mintWithURI(recipientAddress, tokenURI);
    
    console.log('트랜잭션 전송됨:', tx.hash);
    console.log('트랜잭션 대기 중...');
    
    const receipt = await tx.wait();
    console.log('트랜잭션 완료:', receipt);
    
    // Transfer 이벤트에서 tokenId 추출
    let tokenId = null;
    
    // 이벤트 로그에서 tokenId 찾기
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'SoulboundMinted') {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
        if (parsedLog && parsedLog.name === 'NFTMinted') {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
        if (parsedLog && parsedLog.name === 'FractionalMinted') {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch (e) {
        // 파싱 실패한 로그는 무시
      }
    }
    
    // tokenId를 못 찾았으면 topics에서 추출
    if (!tokenId && receipt.logs.length > 0) {
      try {
        const transferLog = receipt.logs.find(log => log.topics.length >= 4);
        if (transferLog) {
          tokenId = ethers.toBigInt(transferLog.topics[3]).toString();
        }
      } catch (e) {
        console.warn('tokenId 추출 실패:', e);
      }
    }
    
    return {
      success: true,
      txHash: receipt.hash,
      tokenId: tokenId || 'Unknown',
      blockNumber: receipt.blockNumber
    };

  } catch (error) {
    console.error('EVM NFT 민팅 실패:', error);
    
    // 사용자가 거부한 경우
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('트랜잭션이 거부되었습니다.');
    }
    
    // 가스 부족
    if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
      throw new Error('가스비가 부족합니다.');
    }
    
    // 권한 없음
    if (error.message?.includes('Ownable: caller is not the owner')) {
      throw new Error('민팅 권한이 없습니다. 컨트랙트 소유자만 민팅할 수 있습니다.');
    }
    
    throw error;
  }
};

/**
 * NFT 전송 (SBT는 불가)
 */
export const transferNFT = async (provider, nftType, fromAddress, toAddress, tokenId) => {
  try {
    if (nftType === 'soulbound') {
      throw new Error('Soulbound Token은 전송할 수 없습니다.');
    }

    const contract = await getContract(provider, nftType);
    
    console.log('전송 시작:', { from: fromAddress, to: toAddress, tokenId });
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
 */
export const getTokenOwner = async (provider, nftType, tokenId) => {
  try {
    const contract = await getContract(provider, nftType);
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('소유자 조회 실패:', error);
    throw error;
  }
};

/**
 * NFT 메타데이터 URI 가져오기
 */
export const getTokenURI = async (provider, nftType, tokenId) => {
  try {
    const contract = await getContract(provider, nftType);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Token URI 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자가 소유한 NFT 목록 가져오기
 */
export const getEvmNFTs = async (provider, ownerAddress, nftType) => {
  try {
    const contract = await getContract(provider, nftType);
    
    // tokensOfOwner 함수로 소유한 토큰 ID 목록 가져오기
    const tokens = await contract.tokensOfOwner(ownerAddress);
    const tokenIds = tokens.map(token => token.toString());
    
    const nfts = [];
    
    for (let tokenId of tokenIds) {
      try {
        const tokenURI = await contract.tokenURI(tokenId);
        
        nfts.push({
          tokenId: tokenId,
          tokenURI: tokenURI,
          type: nftType
        });
      } catch (err) {
        console.error(`Token ${tokenId} 메타데이터 로드 실패:`, err);
      }
    }
    
    return nfts;
    
  } catch (error) {
    console.error('EVM NFT 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 체인의 컨트랙트 주소 설정
 */
export const setContractAddress = (chainId, nftType, address) => {
  if (!CONTRACT_ADDRESSES[chainId]) {
    CONTRACT_ADDRESSES[chainId] = {};
  }
  CONTRACT_ADDRESSES[chainId][nftType] = address;
};

/**
 * 현재 설정된 컨트랙트 주소 가져오기
 */
export const getContractAddress = (chainId, nftType) => {
  return CONTRACT_ADDRESSES[chainId]?.[nftType];
};