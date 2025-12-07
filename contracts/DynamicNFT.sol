// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DynamicNFT
 * @dev 사용자가 정의한 메타데이터를 JSON 문자열로 저장/수정 가능한 Dynamic NFT
 * 사용 사례: 부동산, 증명서, 게임 아이템 등 다양한 용도로 활용 가능
 */
contract DynamicNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public mintingPaused = false;
    
    // ✅ 사용자 정의 메타데이터를 JSON 문자열로 저장
    mapping(uint256 => string) public tokenMetadata;
    
    // 메타데이터 변경 이력
    mapping(uint256 => string[]) public metadataHistory;
    
    // URI 변경 이력 (기존 기능 유지)
    mapping(uint256 => string[]) private tokenURIHistory;
    
    event MetadataUpdated(uint256 indexed tokenId, string newMetadata, address updatedBy);
    event URIUpdated(uint256 indexed tokenId, string newURI);
    
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
    
    // ========================================
    // 민팅 함수
    // ========================================
    
    /**
     * @dev 일반 민팅 함수 (메타데이터 포함)
     * @param to 받는 주소
     * @param initialURI 초기 토큰 URI (이미지 등)
     * @param initialMetadata 초기 메타데이터 JSON 문자열
     * 예시: '{"주소":"1001 Blockchain Rd.","건축연도":"2022","면적":"150m²","유지보수이력":"None","판매이력":"2021 / $400,000"}'
     */
    function mint(
        address to, 
        string calldata initialURI,
        string calldata initialMetadata
    ) external payable returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        // URI 설정
        if (bytes(initialURI).length > 0) {
            _setTokenURI(tokenId, initialURI);
        }
        
        // ✅ 메타데이터 저장
        if (bytes(initialMetadata).length > 0) {
            tokenMetadata[tokenId] = initialMetadata;
        }
        
        // 환불 처리
        if (mintPrice > 0 && msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
        
        return tokenId;
    }
    
    // ========================================
    // 메타데이터 수정 함수 (소유자만 가능)
    // ========================================
    
    /**
     * @dev 메타데이터 업데이트 (소유자만 가능)
     * @param tokenId 토큰 ID
     * @param newMetadata 새로운 메타데이터 JSON 문자열
     */
    function updateMetadata(uint256 tokenId, string calldata newMetadata) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        // 이전 메타데이터를 히스토리에 저장
        if (bytes(tokenMetadata[tokenId]).length > 0) {
            metadataHistory[tokenId].push(tokenMetadata[tokenId]);
        }
        
        // 새 메타데이터 저장
        tokenMetadata[tokenId] = newMetadata;
        
        emit MetadataUpdated(tokenId, newMetadata, msg.sender);
    }
    
    // ========================================
    // URI 변경 함수 (소유자만 가능)
    // ========================================
    
    /**
     * @dev 토큰 URI 업데이트 (이미지 변경 등)
     */
    function updateTokenURI(uint256 tokenId, string memory newURI) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
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
    
    /**
     * @dev 메타데이터 조회
     */
    function getMetadata(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev 메타데이터 변경 이력 조회
     */
    function getMetadataHistory(uint256 tokenId) external view returns (string[] memory) {
        return metadataHistory[tokenId];
    }
    
    /**
     * @dev URI 변경 이력 조회
     */
    function getURIHistory(uint256 tokenId) external view returns (string[] memory) {
        return tokenURIHistory[tokenId];
    }
    
    /**
     * @dev 특정 주소가 소유한 모든 토큰 ID 조회
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }
    
    // ========================================
    // 관리자 함수
    // ========================================
    
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
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
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
}