// const hre = require("hardhat");
import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("Deploying with account:", deployer.address);
    
    const SoulboundToken = await hre.ethers.getContractFactory("SoulboundToken");
    const sbt = await SoulboundToken.deploy(
        "MyCredential",
        "CRED",
        "ipfs://QmYourBaseURI/"
    );
    
    await sbt.waitForDeployment();
    const sbtAddress = await sbt.getAddress();
    
    console.log("SoulboundToken deployed to:", sbtAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
});
