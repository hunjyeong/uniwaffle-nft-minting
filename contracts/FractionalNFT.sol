// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FractionalNFT
 * @dev 고가의 NFT를 여러 조각(ERC-20 토큰)으로 분할하여 공동 소유 가능
 * 사용 사례: 고가 예술품 공동 투자, 부동산 NFT 지분 소유, 희귀 수집품 분할
 */

// 분할 토큰 (ERC-20)
contract FractionToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply_,
        address initialOwner
    ) ERC20(name, symbol) {
        _mint(initialOwner, totalSupply_);
    }
}

contract FractionalNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    uint256 public floorPrice;        // NFT 최소 가격
    uint256 public fractionSupply;    // 조각 개수
    
    struct FractionalizedNFT {
        uint256 tokenId;
        address fractionToken;        // ERC-20 토큰 주소
        uint256 totalFractions;       // 총 조각 수
        uint256 buyoutPrice;          // 완전 매입 가격
        bool isActive;                // 분할 활성화 여부
        address originalOwner;        // 원래 소유자
        uint256 createdAt;
    }
    
    mapping(uint256 => FractionalizedNFT) public fractionalizedNFTs;
    mapping(address => uint256) public tokenToNFT; // ERC-20 주소 → NFT ID
    
    // 매입 제안 관리
    struct BuyoutProposal {
        address buyer;
        uint256 price;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => BuyoutProposal) public buyoutProposals;
    
    event NFTFractionalized(uint256 indexed tokenId, address fractionToken, uint256 fractions);
    event NFTRedeemed(uint256 indexed tokenId, address redeemer);
    event BuyoutProposed(uint256 indexed tokenId, address buyer, uint256 price);
    event VoteCast(uint256 indexed tokenId, address voter, bool support, uint256 weight);
    event BuyoutExecuted(uint256 indexed tokenId, address buyer, uint256 price);
    event NFTBurned(address indexed from, uint256 indexed tokenId);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _floorPrice,
        uint256 _fractionSupply
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        floorPrice = _floorPrice;
        fractionSupply = _fractionSupply;
    }
    
    // ========================================
    // 민팅 함수
    // ========================================
    
    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }
    
    // ========================================
    // 🔥 소각 함수 (BURN)
    // ========================================
    
    /**
     * @dev NFT 소각 - 분할되지 않은 NFT만 소각 가능
     * @param tokenId 소각할 토큰 ID
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender, 
                "Not owner or approved");
        require(!fractionalizedNFTs[tokenId].isActive, 
                "Cannot burn fractionalized NFT. Redeem it first.");
        
        _burn(tokenId);
        emit NFTBurned(msg.sender, tokenId);
    }
    
    // ========================================
    // NFT 분할 (Fractionalize)
    // ========================================
    
    function fractionalizeNFT(
        uint256 tokenId,
        string memory fractionName,
        string memory fractionSymbol,
        uint256 totalFractions,
        uint256 buyoutPrice
    ) external nonReentrant returns (address) {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!fractionalizedNFTs[tokenId].isActive, "Already fractionalized");
        require(totalFractions > 0, "Invalid fraction count");
        require(buyoutPrice >= floorPrice, "Price below floor");
        
        // NFT를 컨트랙트로 이전
        _transfer(msg.sender, address(this), tokenId);
        
        // ERC-20 분할 토큰 생성
        FractionToken fractionToken = new FractionToken(
            fractionName,
            fractionSymbol,
            totalFractions,
            msg.sender  // 원래 소유자에게 모든 조각 발행
        );
        
        // 분할 정보 저장
        fractionalizedNFTs[tokenId] = FractionalizedNFT({
            tokenId: tokenId,
            fractionToken: address(fractionToken),
            totalFractions: totalFractions,
            buyoutPrice: buyoutPrice,
            isActive: true,
            originalOwner: msg.sender,
            createdAt: block.timestamp
        });
        
        tokenToNFT[address(fractionToken)] = tokenId;
        
        emit NFTFractionalized(tokenId, address(fractionToken), totalFractions);
        return address(fractionToken);
    }
    
    // ========================================
    // NFT 재결합 (Redeem)
    // ========================================
    
    function redeemNFT(uint256 tokenId) external nonReentrant {
        FractionalizedNFT storage fNFT = fractionalizedNFTs[tokenId];
        require(fNFT.isActive, "NFT not fractionalized");
        
        FractionToken fractionToken = FractionToken(fNFT.fractionToken);
        uint256 userBalance = fractionToken.balanceOf(msg.sender);
        
        require(userBalance == fNFT.totalFractions, "Must own all fractions");
        
        // 분할 토큰 소각
        require(
            fractionToken.transferFrom(msg.sender, address(this), fNFT.totalFractions),
            "Transfer failed"
        );
        
        // NFT 이전
        fNFT.isActive = false;
        _transfer(address(this), msg.sender, tokenId);
        
        emit NFTRedeemed(tokenId, msg.sender);
    }
    
    // ========================================
    // 매입 제안 및 투표
    // ========================================
    
    function proposeBuyout(uint256 tokenId) external payable nonReentrant {
        FractionalizedNFT storage fNFT = fractionalizedNFTs[tokenId];
        require(fNFT.isActive, "NFT not fractionalized");
        require(msg.value >= fNFT.buyoutPrice, "Insufficient buyout price");
        require(buyoutProposals[tokenId].deadline == 0 || 
                block.timestamp > buyoutProposals[tokenId].deadline, 
                "Active proposal exists");
        
        BuyoutProposal storage proposal = buyoutProposals[tokenId];
        proposal.buyer = msg.sender;
        proposal.price = msg.value;
        proposal.votesFor = 0;
        proposal.votesAgainst = 0;
        proposal.deadline = block.timestamp + 7 days;
        proposal.executed = false;
        
        emit BuyoutProposed(tokenId, msg.sender, msg.value);
    }
    
    function voteOnBuyout(uint256 tokenId, bool support) external {
        FractionalizedNFT storage fNFT = fractionalizedNFTs[tokenId];
        require(fNFT.isActive, "NFT not fractionalized");
        
        BuyoutProposal storage proposal = buyoutProposals[tokenId];
        require(block.timestamp <= proposal.deadline, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        FractionToken fractionToken = FractionToken(fNFT.fractionToken);
        uint256 votingPower = fractionToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit VoteCast(tokenId, msg.sender, support, votingPower);
    }
    
    function executeBuyout(uint256 tokenId) external nonReentrant {
        FractionalizedNFT storage fNFT = fractionalizedNFTs[tokenId];
        require(fNFT.isActive, "NFT not fractionalized");
        
        BuyoutProposal storage proposal = buyoutProposals[tokenId];
        require(block.timestamp > proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");
        
        proposal.executed = true;
        fNFT.isActive = false;
        
        // NFT를 구매자에게 이전
        _transfer(address(this), proposal.buyer, tokenId);
        
        // 조각 소유자들에게 비례 배분
        // (실제 구현에서는 claim 메커니즘 필요)
        
        emit BuyoutExecuted(tokenId, proposal.buyer, proposal.price);
    }
    
    // ========================================
    // 조회 함수
    // ========================================
    
    function getFractionToken(uint256 tokenId) external view returns (address) {
        return fractionalizedNFTs[tokenId].fractionToken;
    }
    
    function isFractionalized(uint256 tokenId) external view returns (bool) {
        return fractionalizedNFTs[tokenId].isActive;
    }
    
    function getBuyoutProposal(uint256 tokenId) external view returns (
        address buyer,
        uint256 price,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 deadline,
        bool executed
    ) {
        BuyoutProposal storage proposal = buyoutProposals[tokenId];
        return (
            proposal.buyer,
            proposal.price,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.deadline,
            proposal.executed
        );
    }
    
    // 투표 여부 확인 함수 추가
    function hasVoted(uint256 tokenId, address voter) external view returns (bool) {
        return buyoutProposals[tokenId].hasVoted[voter];
    }
    
    // 사용자의 조각 보유량 확인 (편의 함수)
    function getMyFractionBalance(uint256 tokenId, address owner) external view returns (uint256) {
        FractionalizedNFT storage fNFT = fractionalizedNFTs[tokenId];
        if (!fNFT.isActive) return 0;
        
        FractionToken fractionToken = FractionToken(fNFT.fractionToken);
        return fractionToken.balanceOf(owner);
    }
    
    // ========================================
    // 관리자 함수
    // ========================================
    
    function setFloorPrice(uint256 newFloorPrice) external onlyOwner {
        floorPrice = newFloorPrice;
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner()).transfer(balance);
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * 사용자가 소유한 NFT 목록 반환
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            try this.ownerOf(i) returns (address tokenOwner) {
                if (tokenOwner == owner) {
                    tokens[index] = i;
                    index++;
                }
            } catch {
                // 토큰이 존재하지 않거나 소각된 경우
                continue;
            }
        }
        
        return tokens;
    }
}