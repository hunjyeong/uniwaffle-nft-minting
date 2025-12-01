// 컨트랙트 ABI와 주소를 중앙에서 관리
export const SOULBOUND_ADDRESS = process.env.REACT_APP_SOULBOUND_ADDRESS;
export const TRANSFERABLE_ADDRESS = process.env.REACT_APP_TRANSFERABLE_ADDRESS;

// Hardhat compile 후 생성된 ABI 가져오기
import SoulboundABI from '../../../artifacts/contracts/SoulboundToken.sol/SoulboundToken.json';
export const SOULBOUND_ABI = SoulboundABI.abi;