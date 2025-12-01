// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TransferableNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    // 최대 발행량 (선택사항)
    uint256 public maxSupply;
    
    // 민팅 가격 (선택사항)
    uint256 public mintPrice;
    
    // 민팅 일시정지 기능
    bool public mintingPaused = false;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId, string uri);
    event NFTBurned(address indexed from, uint256 indexed tokenId);
    event MintingPaused(bool paused);
    event MintPriceChanged(uint256 newPrice);
    
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
    // 민팅 함수들
    // ========================================
    
    // Owner만 무료 민팅
    function mintTo(address to) external onlyOwner returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        emit NFTMinted(to, tokenId, "");
        return tokenId;
    }
    
    // Owner가 URI 지정하여 민팅
    function mintWithURI(address to, string memory uri) external onlyOwner returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }
    
    // 공개 민팅 (가격 지불)
    function publicMint() external payable returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        // 초과 금액 환불
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
        
        emit NFTMinted(msg.sender, tokenId, "");
        return tokenId;
    }
    
    // 배치 민팅 (여러 개 한번에)
    function batchMint(address to, uint256 quantity) external onlyOwner returns (uint256[] memory) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter + quantity <= maxSupply || maxSupply == 0, "Exceeds max supply");
        
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _safeMint(to, tokenId);
            tokenIds[i] = tokenId;
            emit NFTMinted(to, tokenId, "");
        }
        
        return tokenIds;
    }
    
    // ========================================
    // 소각 함수
    // ========================================
    
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender, 
                "Not token owner or approved");
        _burn(tokenId);
        emit NFTBurned(msg.sender, tokenId);
    }
    
    // ========================================
    // 메타데이터 관리
    // ========================================
    
    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
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
    
    // ========================================
    // 관리자 함수
    // ========================================
    
    function pauseMinting(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceChanged(newPrice);
    }
    
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply >= _tokenIdCounter, "Cannot set below current supply");
        maxSupply = newMaxSupply;
    }
    
    // 수익금 인출
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // ========================================
    // 조회 함수
    // ========================================
    
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }
    
    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter;
    }
    
    function remainingSupply() external view returns (uint256) {
        if (maxSupply == 0) return type(uint256).max;
        return maxSupply - _tokenIdCounter;
    }
    
    // ========================================
    // 필수 오버라이드
    // ========================================
    
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