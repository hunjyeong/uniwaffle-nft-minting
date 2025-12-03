// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SoulboundNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    mapping(uint256 => string) private _tokenURIs;
    // mapping(address => bool) public hasMinted;
    mapping(address => uint256[]) private _ownedTokens;
    
    event SoulboundMinted(address indexed to, uint256 indexed tokenId);
    event SoulboundBurned(address indexed from, uint256 indexed tokenId);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }
    
    // function mint(address to) external onlyOwner returns (uint256) {
    //     require(!hasMinted[to], "Address already has a soulbound token");
        
    //     uint256 tokenId = _tokenIdCounter;
    //     _tokenIdCounter++;
        
    //     _safeMint(to, tokenId);
    //     hasMinted[to] = true;
        
    //     emit SoulboundMinted(to, tokenId);
    //     return tokenId;
    // }

    // function mintWithURI(address to, string memory uri) external onlyOwner returns (uint256) {
    //     require(!hasMinted[to], "Address already has a soulbound token");
        
    //     uint256 tokenId = _tokenIdCounter;
    //     _tokenIdCounter++;
        
    //     _safeMint(to, tokenId);
    //     _tokenURIs[tokenId] = uri;
    //     hasMinted[to] = true;
        
    //     emit SoulboundMinted(to, tokenId);
    //     return tokenId;
    // }

    function mint(address to) external onlyOwner returns (uint256) {
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _ownedTokens[to].push(tokenId);  // 선택사항
        
        emit SoulboundMinted(to, tokenId);
        return tokenId;
    }

    function mintWithURI(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        _ownedTokens[to].push(tokenId);
        
        emit SoulboundMinted(to, tokenId);
        return tokenId;
    }
    
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        require(
            from == address(0) || to == address(0),
            "Soulbound: Transfer not allowed"
        );
        
        return super._update(to, tokenId, auth);
    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory _tokenURI = _tokenURIs[tokenId];
        
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
            : "";
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    // function burn(uint256 tokenId) external {
    //     require(ownerOf(tokenId) == msg.sender, "Not token owner");
    //     hasMinted[msg.sender] = false;
    //     _burn(tokenId);
    // }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // _ownedTokens 배열에서 해당 tokenId 제거
        _removeTokenFromOwnerEnumeration(msg.sender, tokenId);
        
        _burn(tokenId);
        emit SoulboundBurned(msg.sender, tokenId);
    }
    
    function _removeTokenFromOwnerEnumeration(address owner, uint256 tokenId) private {
        uint256[] storage tokens = _ownedTokens[owner];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
    
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
