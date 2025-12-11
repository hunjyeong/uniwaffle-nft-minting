import { clusterApiUrl } from '@solana/web3.js';

// Solana 네트워크 설정
export const SOLANA_NETWORK = 'devnet'; // 'devnet', 'testnet', 'mainnet-beta'
export const SOLANA_RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// Metaplex 설정
export const METAPLEX_CONFIG = {
  network: SOLANA_NETWORK,
  commitment: 'confirmed',
};

// NFT 메타데이터 기본값
export const DEFAULT_NFT_METADATA = {
  sellerFeeBasisPoints: 500, // 5% 로열티
  creators: [], // 민팅 시 동적으로 설정
  collection: null,
  uses: null,
};

// IPFS 게이트�이 설정
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

// 지갑 설정
export const WALLET_CONFIG = {
  autoConnect: false,
  onError: (error) => {
    console.error('Wallet error:', error);
  },
};