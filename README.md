# NFT Minting

### Frontend
- React 18
- Ethers.js v6
- Web3Modal
- Pinata (IPFS)

### Smart Contract
- Solidity 0.8.28
- Hardhat
- OpenZeppelin Contracts
- Etherscan Verification

## 설치 방법
```bash
# 저장소 클론
git clone https://github.com/hunjyeong/uniwaffle-nft-minting.git
cd uniwaffle-nft-minting

# 의존성 설치
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:
```bash
# Hardhat 배포용
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
MNEMONIC=your twelve word mnemonic phrase
ETHERSCAN_API_KEY=your_etherscan_api_key

# 배포된 스마트 컨트랙트 주소
CONTRACT_ADDRESS=0x...

# Pinata API Keys (https://pinata.cloud)
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key
```

### 스마트 컨트랙트
```bash
# 컴파일
npx hardhat compile

# Sepolia 테스트넷 배포
npx hardhat run scripts/deploy.js --network sepolia

# 민팅
npx hardhat run scripts/mint.js --network sepolia

# 전송
npx hardhat run scripts/transfer-nft.js --network sepolia
```