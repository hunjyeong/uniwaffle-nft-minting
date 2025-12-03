export const SOULBOUND_ADDRESS = process.env.REACT_APP_SOULBOUND_ADDRESS;
export const NATIVENFT_ADDRESS = process.env.REACT_APP_NATIVENFT_ADDRESS;
export const FRACTIONAL_ADDRESS = process.env.REACT_APP_FRACTIONAL_ADDRESS;

// Hardhat compile 후 생성된 ABI 가져오기
// import SoulboundABI from '../../../artifacts/contracts/SoulboundToken.sol/SoulboundToken.json';
// export const SOULBOUND_ABI = SoulboundABI.abi;

// 네트워크 설정
export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
export const SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL;

// Pinata 설정
export const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;
export const PINATA_GATEWAY = process.env.REACT_APP_PINATA_GATEWAY;

// 컨트랙트 ABI (필요한 함수만)
export const SOULBOUND_ABI = [
    "function mint(address to) public returns (uint256)",
    "function mintWithURI(address to, string memory uri) public returns (uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function balanceOf(address owner) public view returns (uint256)",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokensOfOwner(address owner) public view returns (uint256[])",
    "function totalSupply() public view returns (uint256)",
    "event SoulboundMinted(address indexed to, uint256 indexed tokenId)"
];
  
export const NATIVENFT_ABI = [
    "function mint(address to) public returns (uint256)",
    "function mintTo(address to) public returns (uint256)",
    "function mintWithURI(address to, string memory uri) public returns (uint256)",
    "function publicMint() public payable returns (uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function balanceOf(address owner) public view returns (uint256)",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokensOfOwner(address owner) public view returns (uint256[])",
    "function transferFrom(address from, address to, uint256 tokenId) public",
    "function totalSupply() public view returns (uint256)",
    "function mintPrice() public view returns (uint256)",
    "event NFTMinted(address indexed to, uint256 indexed tokenId, string uri)"
];

export const FRACTIONAL_ABI = [
    "function mint(address to) public returns (uint256)",
    "function mintWithURI(address to, string memory uri) public returns (uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function balanceOf(address owner) public view returns (uint256)",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokensOfOwner(address owner) public view returns (uint256[])",
    "function transferFrom(address from, address to, uint256 tokenId) public",
    "function totalSupply() public view returns (uint256)",
    "event FractionalMinted(address indexed to, uint256 indexed tokenId)"
];