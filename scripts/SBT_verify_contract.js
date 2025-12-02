import hre from "hardhat";

async function main() {
    const contractAddress = "0xBfC7c1e9928DF24803369f49478Dfa0333055f17";
    
    // 컨트랙트 코드 확인
    const code = await hre.ethers.provider.getCode(contractAddress);
    
    console.log("Contract Address:", contractAddress);
    console.log("Has Code:", code !== "0x");
    console.log("Code Length:", code.length);
    
    if (code !== "0x") {
        console.log("\n✅ 컨트랙트가 정상적으로 배포되었습니다!");
        
        // 컨트랙트 함수 호출 테스트
        const SBT = await hre.ethers.getContractAt("SoulboundToken", contractAddress);
        
        const totalSupply = await SBT.totalSupply();
        console.log("Total Supply:", totalSupply.toString());
        
    } else {
        console.log("\n❌ 컨트랙트가 배포되지 않았습니다.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
