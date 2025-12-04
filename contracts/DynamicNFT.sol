// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DynamicNFT
 * @dev NFT의 메타데이터(이미지, 속성)를 동적으로 변경할 수 있는 컨트랙트
 * 사용 사례: 레벨업 게임 아이템, 시간/조건에 따라 진화하는 캐릭터, 외부 데이터 반영
 */
contract DynamicNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public mintingPaused = false;
    
    // 동적 속성 관리
    struct TokenAttributes {
        uint256 level;          // 레벨
        uint256 experience;     // 경험치
        uint256 power;          // 파워
        uint256 lastUpdated;    // 마지막 업데이트 시간
        string status;          // 상태 (예: "active", "evolved")
    }
    
    mapping(uint256 => TokenAttributes) public tokenAttributes;
    mapping(uint256 => string[]) private tokenURIHistory; // URI 변경 이력
    
    // 권한 관리 (게임 서버 등이 속성 업데이트 가능)
    mapping(address => bool) public authorizedUpdaters;
    
    event AttributesUpdated(uint256 indexed tokenId, uint256 level, uint256 experience, uint256 power);
    event TokenEvolved(uint256 indexed tokenId, uint256 newLevel, string newURI);
    event URIUpdated(uint256 indexed tokenId, string newURI);
    event UpdaterAuthorized(address indexed updater, bool status);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _maxSupply,
        uint256 _mintPrice
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
    }
    
    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // ========================================
    // 민팅 함수
    // ========================================
    
    function mint(address to) external payable returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        // 초기 속성 설정
        tokenAttributes[tokenId] = TokenAttributes({
            level: 1,
            experience: 0,
            power: 10,
            lastUpdated: block.timestamp,
            status: "newborn"
        });
        
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
        
        return tokenId;
    }
    
    function mintWithAttributes(
        address to,
        uint256 level,
        uint256 power,
        string memory status
    ) external onlyOwner returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        tokenAttributes[tokenId] = TokenAttributes({
            level: level,
            experience: 0,
            power: power,
            lastUpdated: block.timestamp,
            status: status
        });
        
        return tokenId;
    }
    
    // ========================================
    // 동적 속성 업데이트 함수
    // ========================================
    
    function updateAttributes(
        uint256 tokenId,
        uint256 level,
        uint256 experience,
        uint256 power
    ) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TokenAttributes storage attrs = tokenAttributes[tokenId];
        attrs.level = level;
        attrs.experience = experience;
        attrs.power = power;
        attrs.lastUpdated = block.timestamp;
        
        emit AttributesUpdated(tokenId, level, experience, power);
    }
    
    function addExperience(uint256 tokenId, uint256 exp) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TokenAttributes storage attrs = tokenAttributes[tokenId];
        attrs.experience += exp;
        attrs.lastUpdated = block.timestamp;
        
        // 자동 레벨업 (100 경험치당 1레벨)
        uint256 newLevel = 1 + (attrs.experience / 100);
        if (newLevel > attrs.level) {
            attrs.level = newLevel;
            attrs.power += 10 * (newLevel - attrs.level);
        }
        
        emit AttributesUpdated(tokenId, attrs.level, attrs.experience, attrs.power);
    }
    
    function setStatus(uint256 tokenId, string memory status) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        tokenAttributes[tokenId].status = status;
        tokenAttributes[tokenId].lastUpdated = block.timestamp;
    }
    
    // ========================================
    // URI 동적 변경 (진화, 레벨업 등)
    // ========================================
    
    function evolveToken(uint256 tokenId, string memory newURI) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        // 이전 URI 저장
        string memory oldURI = tokenURI(tokenId);
        if (bytes(oldURI).length > 0) {
            tokenURIHistory[tokenId].push(oldURI);
        }
        
        // 새 URI 설정
        _setTokenURI(tokenId, newURI);
        
        TokenAttributes storage attrs = tokenAttributes[tokenId];
        attrs.lastUpdated = block.timestamp;
        
        emit TokenEvolved(tokenId, attrs.level, newURI);
    }
    
    function updateTokenURI(uint256 tokenId, string memory newURI) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory oldURI = tokenURI(tokenId);
        if (bytes(oldURI).length > 0) {
            tokenURIHistory[tokenId].push(oldURI);
        }
        
        _setTokenURI(tokenId, newURI);
        emit URIUpdated(tokenId, newURI);
    }
    
    // ========================================
    // 조회 함수
    // ========================================
    
    function getAttributes(uint256 tokenId) external view returns (
        uint256 level,
        uint256 experience,
        uint256 power,
        uint256 lastUpdated,
        string memory status
    ) {
        TokenAttributes memory attrs = tokenAttributes[tokenId];
        return (attrs.level, attrs.experience, attrs.power, attrs.lastUpdated, attrs.status);
    }
    
    function getURIHistory(uint256 tokenId) external view returns (string[] memory) {
        return tokenURIHistory[tokenId];
    }
    
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }
    
    // ========================================
    // 권한 관리
    // ========================================
    
    function setAuthorizedUpdater(address updater, bool status) external onlyOwner {
        authorizedUpdaters[updater] = status;
        emit UpdaterAuthorized(updater, status);
    }
    
    function pauseMinting(bool paused) external onlyOwner {
        mintingPaused = paused;
    }
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // ========================================
    // 필수 오버라이드
    // ========================================
    
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        virtual 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter;
    }
}