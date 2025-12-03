import pinataSDK from '@pinata/sdk';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from 'dotenv';

config();

// Pinata 클라이언트 초기화
const pinata = new pinataSDK({ pinataJWTKey: process.env.REACT_APP_PINATA_JWT });

export async function uploadFile(filePath) {
    console.log(`Uploading ${filePath} to IPFS...`);
    
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        
        // Buffer를 Stream으로 변환
        const readableStream = Readable.from(fileBuffer);
        
        const options = {
            pinataMetadata: {
                name: fileName
            }
        };
        
        const result = await pinata.pinFileToIPFS(readableStream, options);
        const fileUrl = `https://${process.env.REACT_APP_PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${result.IpfsHash}`;
        
        console.log(`File uploaded: ${fileUrl}`);
        return {
            ipfsHash: result.IpfsHash,
            url: fileUrl
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

export async function uploadMetadata(metadata) {
    console.log('Uploading metadata to IPFS...');
    
    try {
        const result = await pinata.pinJSONToIPFS(metadata);
        const metadataUrl = `https://${process.env.REACT_APP_PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${result.IpfsHash}`;
        
        console.log(`Metadata uploaded: ${metadataUrl}`);
        return {
            ipfsHash: result.IpfsHash,
            url: metadataUrl
        };
    } catch (error) {
        console.error('Error uploading metadata:', error);
        throw error;
    }
}

export async function createNFTMetadata(name, description, imageUrl, attributes = []) {
    return {
        name,
        description,
        image: imageUrl,
        attributes
    };
}