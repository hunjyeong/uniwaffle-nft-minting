import { ethers } from 'ethers';
import {
  SOULBOUND_ADDRESS,
  NATIVENFT_ADDRESS,
  FRACTIONAL_ADDRESS,
  SOULBOUND_ABI,
  NATIVENFT_ABI,
  FRACTIONAL_ABI
} from '../config/contracts.js';

// 스마트 컨트랙트 인스턴스 가져오기
export const getContract = async (provider, contractType) => {
  const signer = await provider.getSigner();
  
  if (contractType === 'soulbound') {
    return new ethers.Contract(SOULBOUND_ADDRESS, SOULBOUND_ABI, signer);
  } else if (contractType === 'native') {
    return new ethers.Contract(NATIVENFT_ADDRESS, NATIVENFT_ABI, signer);
  } else if (contractType === 'fractional') {
    return new ethers.Contract(FRACTIONAL_ADDRESS, FRACTIONAL_ABI, signer);
  }
  
  throw new Error('Invalid contract type');
};

// NFT 민팅
export const mintNFT = async (provider, contractType, recipientAddress, tokenURI) => {
  try {
    const contract = await getContract(provider, contractType);
    
    console.log('민팅 시작:', {
      contractType,
      recipient: recipientAddress,
      tokenURI
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
    console.error('민팅 실패:', error);
    
    // 에러 메시지 개선
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('사용자가 트랜잭션을 거부했습니다.');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('가스비가 부족합니다. Sepolia ETH를 받으세요.');
    } else if (error.message.includes('Ownable: caller is not the owner')) {
      throw new Error('민팅 권한이 없습니다. 컨트랙트 소유자만 민팅할 수 있습니다.');
    }
    
    throw error;
  }
};

//  NFT 전송 (SBT 불가)
export const transferNFT = async (provider, contractType, fromAddress, toAddress, tokenId) => {
  try {
    if (contractType === 'soulbound') {
      throw new Error('Soulbound Token은 전송할 수 없습니다.');
    }

    const contract = await getContract(provider, 'native');
    
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

// NFT 소유자 확인
export const getTokenOwner = async (provider, contractType, tokenId) => {
  try {
    const contract = await getContract(provider, contractType);
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('소유자 조회 실패:', error);
    throw error;
  }
};

// NFT 메타데이터 URI 가져오기
export const getTokenURI = async (provider, contractType, tokenId) => {
  try {
    const contract = await getContract(provider, contractType);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Token URI 조회 실패:', error);
    throw error;
  }
};

// 사용자가 소유한 NFT 목록 가져오기
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