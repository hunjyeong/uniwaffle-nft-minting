export const CHAIN_TYPES = {
    EVM: 'evm'
  };
  
  export const SUPPORTED_CHAINS = {
    ETHEREUM_MAINNET: {
      id: 1,
      chainId: '0x1',
      type: CHAIN_TYPES.EVM,
      name: 'Ethereum Mainnet',
      shortName: 'Ethereum L1',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      explorer: 'https://etherscan.io',
      nativeCurrency: { 
        name: 'Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      icon: '⟠'
    },
    ETHEREUM_SEPOLIA: {
      id: 11155111,
      chainId: '0xaa36a7',
      type: CHAIN_TYPES.EVM,
      name: 'Ethereum Sepolia',
      shortName: 'Sepolia Testnet',
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: { 
        name: 'Sepolia Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      icon: '⟠',
      isTestnet: true
    },
    POLYGON: {
      id: 137,
      chainId: '0x89',
      type: CHAIN_TYPES.EVM,
      name: 'Polygon',
      shortName: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com',
      nativeCurrency: { 
        name: 'MATIC', 
        symbol: 'MATIC', 
        decimals: 18 
      },
      icon: '⬡',
      category: 'L2'
    },
    ARBITRUM: {
      id: 42161,
      chainId: '0xa4b1',
      type: CHAIN_TYPES.EVM,
      name: 'Arbitrum One',
      shortName: 'Arbitrum',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      nativeCurrency: { 
        name: 'Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      icon: '🔷',
      category: 'L2'
    },
    OPTIMISM: {
      id: 10,
      chainId: '0xa',
      type: CHAIN_TYPES.EVM,
      name: 'Optimism',
      shortName: 'Optimism',
      rpcUrl: 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      nativeCurrency: { 
        name: 'Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      icon: '🔴',
      category: 'L2'
    },
    BASE: {
      id: 8453,
      chainId: '0x2105',
      type: CHAIN_TYPES.EVM,
      name: 'Base',
      shortName: 'Base',
      rpcUrl: 'https://mainnet.base.org',
      explorer: 'https://basescan.org',
      nativeCurrency: { 
        name: 'Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      icon: '🔵',
      category: 'L2'
    }
  };
  
  // 체인을 카테고리별로 그룹화
  export const getChainsByCategory = () => {
    const categories = {
      'Ethereum L1': [],
      'Ethereum L2': []
    };
  
    Object.values(SUPPORTED_CHAINS).forEach(chain => {
      if (chain.category === 'L2') {
        categories['Ethereum L2'].push(chain);
      } else {
        categories['Ethereum L1'].push(chain);
      }
    });
  
    return categories;
  };
  
  // 체인 ID로 체인 정보 가져오기
  export const getChainById = (chainId) => {
    return Object.values(SUPPORTED_CHAINS).find(
      chain => chain.id === chainId || chain.chainId === chainId
    );
  };
  
  // EVM 체인만 필터링
  export const getEvmChains = () => {
    return Object.values(SUPPORTED_CHAINS);
  };