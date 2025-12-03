import fs from 'fs';

const contracts = ['NativeNFT', 'SoulboundNFT', 'FractionalNFT'];

contracts.forEach(name => {
  try {
    const artifact = JSON.parse(
      fs.readFileSync(`./artifacts/contracts/${name}.sol/${name}.json`, 'utf8')
    );
    
    console.log(`\nexport const ${name.toUpperCase()}_ABI = ${JSON.stringify(artifact.abi, null, 2)};`);
  } catch (e) {
    console.error(`${name} not found`);
  }
});