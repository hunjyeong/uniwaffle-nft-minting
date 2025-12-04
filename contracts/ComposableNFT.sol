// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title ComposableNFT
 * @dev NFT 안에 다른 NFT를 넣을 수 있는 조립형 NFT (ERC-998 개념)
 * 사용 사례: 캐릭터+장비, 자동차+부품, 집+가구 등
 */
contract ComposableNFT is ERC721URIStorage, ERC721Enumerable, Ownable, IERC721Receiver {
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public mintingPaused = false;
    
    // NFT 타입 정의
    enum NFTType {
        PARENT,      // 부모 NFT (다른 NFT를 담을 수 있음)
        CHILD        // 자식 NFT (부모에게 장착됨)
    }
    
    struct ComposableData {
        NFTType nftType;
        uint256 parentId;           // 자식인 경우, 부모 토큰 ID (0 = 독립)
        uint256[] childrenIds;      // 부모인 경우, 자식 토큰 ID들
        string category;            // 카테고리 (예: "weapon", "armor", "accessory")
        uint256 slotIndex;          // 슬롯 인덱스 (같은 카테고리 내 위치)
        bool isAttached;            // 부모에게 장착 여부
    }
    
    mapping(uint256 => ComposableData) public composableData;
    
    // 부모 NFT의 슬롯 제한 (카테고리별)
    mapping(uint256 => mapping(string => uint256)) public maxSlotsPerCategory; // parentId => category => maxSlots
    
    event ChildAttached(uint256 indexed parentId, uint256 indexed childId, string category);
    event ChildDetached(uint256 indexed parentId, uint256 indexed childId);
    event SlotLimitSet(uint256 indexed parentId, string category, uint256 maxSlots);
    
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
    
    function mintParent(address to, string memory category) external payable returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        composableData[tokenId] = ComposableData({
            nftType: NFTType.PARENT,
            parentId: 0,
            childrenIds: new uint256[](0),
            category: category,
            slotIndex: 0,
            isAttached: false
        });
        
        // 기본 슬롯 제한 설정
        maxSlotsPerCategory[tokenId]["weapon"] = 1;
        maxSlotsPerCategory[tokenId]["armor"] = 1;
        maxSlotsPerCategory[tokenId]["accessory"] = 3;
        
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
        
        return tokenId;
    }
    
    function mintChild(address to, string memory category) external payable returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        require(_tokenIdCounter < maxSupply || maxSupply == 0, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        composableData[tokenId] = ComposableData({
            nftType: NFTType.CHILD,
            parentId: 0,
            childrenIds: new uint256[](0),
            category: category,
            slotIndex: 0,
            isAttached: false
        });
        
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
        
        return tokenId;
    }
    
    // ========================================
    // 조립 함수 (Attach/Detach)
    // ========================================
    
    function attachChild(uint256 parentId, uint256 childId) external {
        require(ownerOf(parentId) == msg.sender, "Not parent owner");
        require(ownerOf(childId) == msg.sender, "Not child owner");
        require(composableData[parentId].nftType == NFTType.PARENT, "Not a parent NFT");
        require(composableData[childId].nftType == NFTType.CHILD, "Not a child NFT");
        require(!composableData[childId].isAttached, "Child already attached");
        
        string memory category = composableData[childId].category;
        uint256 currentCount = _countChildrenInCategory(parentId, category);
        require(currentCount < maxSlotsPerCategory[parentId][category], "Category slot full");
        
        // 자식 NFT를 컨트랙트로 이전 (실제로는 부모 소유로 간주)
        _transfer(msg.sender, address(this), childId);
        
        // 관계 설정
        composableData[childId].parentId = parentId;
        composableData[childId].isAttached = true;
        composableData[childId].slotIndex = currentCount;
        composableData[parentId].childrenIds.push(childId);
        
        emit ChildAttached(parentId, childId, category);
    }
    
    function detachChild(uint256 parentId, uint256 childId) external {
        require(ownerOf(parentId) == msg.sender, "Not parent owner");
        require(composableData[childId].parentId == parentId, "Not attached to this parent");
        require(composableData[childId].isAttached, "Child not attached");
        
        // 자식 NFT를 부모 소유자에게 반환
        _transfer(address(this), msg.sender, childId);
        
        // 관계 해제
        composableData[childId].parentId = 0;
        composableData[childId].isAttached = false;
        composableData[childId].slotIndex = 0;
        
        // 부모의 자식 목록에서 제거
        _removeChildFromParent(parentId, childId);
        
        emit ChildDetached(parentId, childId);
    }
    
    function detachAllChildren(uint256 parentId) external {
        require(ownerOf(parentId) == msg.sender, "Not parent owner");
        
        uint256[] memory children = composableData[parentId].childrenIds;
        for (uint256 i = 0; i < children.length; i++) {
            uint256 childId = children[i];
            
            _transfer(address(this), msg.sender, childId);
            
            composableData[childId].parentId = 0;
            composableData[childId].isAttached = false;
            composableData[childId].slotIndex = 0;
            
            emit ChildDetached(parentId, childId);
        }
        
        // 자식 목록 초기화
        delete composableData[parentId].childrenIds;
    }
    
    // ========================================
    // 조회 함수
    // ========================================
    
    function getChildren(uint256 parentId) external view returns (uint256[] memory) {
        require(composableData[parentId].nftType == NFTType.PARENT, "Not a parent NFT");
        return composableData[parentId].childrenIds;
    }
    
    function getChildrenByCategory(uint256 parentId, string memory category) 
        external 
        view 
        returns (uint256[] memory) 
    {
        require(composableData[parentId].nftType == NFTType.PARENT, "Not a parent NFT");
        
        uint256[] memory allChildren = composableData[parentId].childrenIds;
        uint256 count = 0;
        
        // 카운트
        for (uint256 i = 0; i < allChildren.length; i++) {
            if (keccak256(bytes(composableData[allChildren[i]].category)) == keccak256(bytes(category))) {
                count++;
            }
        }
        
        // 필터링
        uint256[] memory filtered = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allChildren.length; i++) {
            if (keccak256(bytes(composableData[allChildren[i]].category)) == keccak256(bytes(category))) {
                filtered[index++] = allChildren[i];
            }
        }
        
        return filtered;
    }
    
    function getParent(uint256 childId) external view returns (uint256) {
        return composableData[childId].parentId;
    }
    
    function isAttached(uint256 tokenId) external view returns (bool) {
        return composableData[tokenId].isAttached;
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
    // 내부 함수
    // ========================================
    
    function _countChildrenInCategory(uint256 parentId, string memory category) 
        internal 
        view 
        returns (uint256) 
    {
        uint256[] memory children = composableData[parentId].childrenIds;
        uint256 count = 0;
        
        for (uint256 i = 0; i < children.length; i++) {
            if (keccak256(bytes(composableData[children[i]].category)) == keccak256(bytes(category))) {
                count++;
            }
        }
        
        return count;
    }
    
    function _removeChildFromParent(uint256 parentId, uint256 childId) internal {
        uint256[] storage children = composableData[parentId].childrenIds;
        
        for (uint256 i = 0; i < children.length; i++) {
            if (children[i] == childId) {
                children[i] = children[children.length - 1];
                children.pop();
                break;
            }
        }
    }
    
    // ========================================
    // 관리자 함수
    // ========================================
    
    function setSlotLimit(uint256 parentId, string memory category, uint256 maxSlots) 
        external 
        onlyOwner 
    {
        maxSlotsPerCategory[parentId][category] = maxSlots;
        emit SlotLimitSet(parentId, category, maxSlots);
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
        // 부모 NFT가 전송될 때 자식들도 함께 이동 (논리적으로만)
        // 실제 자식 NFT는 컨트랙트에 남아있지만 소유권은 부모를 따름
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
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}