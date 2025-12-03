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
git clone https://github.com/hunjyeong/uniwaffle-nft-minting.git
cd uniwaffle-nft-minting

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
SOULBOUND_ADDRESS=0x...

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
npx hardhat run scripts/deploy-native.js --network sepolia

# 배포된 컨트랙트 주소를 frontend/.env에 추가
REACT_APP_SEPOLIA_NATIVE_ADDRESS=??
REACT_APP_SEPOLIA_SOULBOUND_ADDRESS=??

# 서버 재시작
cd frontend
npm start
```