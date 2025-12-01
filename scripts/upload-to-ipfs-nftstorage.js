import { NFTStorage, File, Blob } from 'nft.storage';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { config } from 'dotenv';

config();

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

export async function uploadFile(filePath) {
    console.log(`Uploading ${filePath} to IPFS...`);
    
    try {
        const content = await fs.promises.readFile(filePath);
        const fileName = path.basename(filePath);
        const mimeType = mime.getType(filePath) || 'application/octet-stream';
        
        const cid = await client.storeBlob(new File([content], fileName, { type: mimeType }));
        const fileUrl = `https://nftstorage.link/ipfs/${cid}`;
        
        console.log(`File uploaded: ${fileUrl}`);
        return {
            ipfsHash: cid,
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
        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        const cid = await client.storeBlob(metadataBlob);
        const metadataUrl = `https://nftstorage.link/ipfs/${cid}`;
        
        console.log(`Metadata uploaded: ${metadataUrl}`);
        return {
            ipfsHash: cid,
            url: metadataUrl
        };
    } catch (error) {
        console.error('Error uploading metadata:', error);
        throw error;
    }
}

export async function createNFTMetadata(name, description, imageUrl, attributes = []) {
    return {
        name: name,
        description: description,
        image: imageUrl,
        attributes: attributes
    };
}