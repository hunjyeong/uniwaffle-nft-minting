export const CHAIN_TYPES = {
  EVM: 'EVM',
  SOLANA: 'SOLANA',
  // 필요시 추가
};

export const SUPPORTED_CHAINS = {
  ETHEREUM_MAINNET: {
    id: 'ethereum',
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum Mainnet',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL || 'https://ethereum.publicnode.com',
    explorer: 'https://etherscan.io',
    isTestnet: false
  },
  
  ETHEREUM_SEPOLIA: {
    id: 'sepolia',
    chainId: '0xaa36a7',
    name: 'Sepolia Testnet',
    shortName: 'Sepolia Testnet',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true
  },

  POLYGON: {
    id: 'polygon',
    chainId: '0x89',
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    isTestnet: false
  },

  ARBITRUM: {
    id: 'arbitrum',
    chainId: '0xa4b1',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    isTestnet: false
  },

  OPTIMISM: {
    id: 'optimism',
    chainId: '0xa',
    name: 'Optimism',
    shortName: 'Optimism',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    isTestnet: false
  },

  BASE: {
    id: 'base',
    chainId: '0x2105',
    name: 'Base',
    shortName: 'Base',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28871.png',
    type: CHAIN_TYPES.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrl: process.env.REACT_APP_BASE_RPC_URL || 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    isTestnet: false
  }
};

// 카테고리별 체인 그룹화
export const getChainsByCategory = () => {
  return {
    'Ethereum L1': [
      SUPPORTED_CHAINS.ETHEREUM_MAINNET,
      SUPPORTED_CHAINS.ETHEREUM_SEPOLIA
    ],
    'Ethereum L2': [
      SUPPORTED_CHAINS.POLYGON,
      SUPPORTED_CHAINS.ARBITRUM,
      SUPPORTED_CHAINS.OPTIMISM,
      SUPPORTED_CHAINS.BASE
    ]
  };
};

// chainId로 체인 찾기
export const getChainById = (chainId) => {
  return Object.values(SUPPORTED_CHAINS).find(
    chain => chain.chainId === chainId
  );
};