import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

export default {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.REACT_APP_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : []
    },
    mainnet: {
      url: process.env.REACT_APP_MAINNET_RPC_URL || "https://ethereum.publicnode.com",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : []
    },
    polygon: {
      url: process.env.REACT_APP_POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : [],
      chainId: 137
    },
    arbitrum: {
      url: process.env.REACT_APP_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : [],
      chainId: 42161
    },
    optimism: {
      url: process.env.REACT_APP_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : [],
      chainId: 10
    },
    base: {
      url: process.env.REACT_APP_BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : [],
      chainId: 8453
    },
    baseSepolia : {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.REACT_APP_MNEMONIC 
        ? {
            mnemonic: process.env.REACT_APP_MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
          }
        : [],
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || ""
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};