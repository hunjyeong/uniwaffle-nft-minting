// backend/routes/nft-storage-api.js
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 업로드 디렉토리 설정
const UPLOAD_DIR = path.join(__dirname, '../nft-uploads');

// 디렉토리가 없으면 생성
const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
};

// Multer 설정 (메모리 저장)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * NFT 이미지 및 메타데이터 Pinata 업로드
 * 로컬에는 메타데이터만 저장 (이미지는 IPFS 참조)
 */
router.post('/upload-nft', upload.single('image'), async (req, res) => {
  try {
    await ensureUploadDir();

    const { name, description, metadata } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // 1. 이미지를 Pinata에 업로드
    const imageFormData = new FormData();
    imageFormData.append('file', imageFile.buffer, imageFile.originalname);
    
    const pinataMetadata = JSON.stringify({
      name: `${name} - Image`
    });
    imageFormData.append('pinataMetadata', pinataMetadata);

    const imageUploadResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      imageFormData,
      {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${imageFormData._boundary}`,
          'Authorization': `Bearer ${process.env.PINATA_JWT}`
        }
      }
    );

    const imageIpfsHash = imageUploadResponse.data.IpfsHash;
    const imageIpfsUrl = `https://ipfs.io/ipfs/${imageIpfsHash}`;
    // console.log(`✅ Pinata 이미지 업로드: ${imageIpfsUrl}`);

    // 2. 메타데이터 JSON 생성 (IPFS 게이트웨이 URL 사용)
    // Created 타임스탬프로 각 NFT의 고유성 보장
    const createdTimestamp = new Date().toISOString();
    
    const nftMetadata = {
      name: name,
      description: description,
      image: imageIpfsUrl,
      ...(metadata ? JSON.parse(metadata) : {}),
      attributes: [
        ...(metadata && JSON.parse(metadata).attributes ? JSON.parse(metadata).attributes : []),
        {
          trait_type: "Created",
          value: createdTimestamp
        }
      ]
    };

    // console.log(`🕐 Created 타임스탬프: ${createdTimestamp}`);

    // 3. 메타데이터를 Pinata에 업로드
    const metadataUploadResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      nftMetadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PINATA_JWT}`
        }
      }
    );

    const metadataIpfsHash = metadataUploadResponse.data.IpfsHash;
    const tokenURI = `ipfs://${metadataIpfsHash}`;
    // console.log(`✅ Pinata 메타데이터 업로드: ${tokenURI}`);

    // 4. IPFS 해시를 파일명으로 로컬에 메타데이터 저장
    const metadataFilename = `${metadataIpfsHash}_metadata.json`;
    const metadataPath = path.join(UPLOAD_DIR, metadataFilename);

    await fs.writeFile(metadataPath, JSON.stringify(nftMetadata, null, 2));
    
    console.log(`로컬 메타데이터 저장: ${metadataFilename}`);
    console.log(`이미지는 IPFS에서만 참조: ${imageIpfsUrl}`);

    // 응답
    res.json({
      success: true,
      ipfs: {
        imageHash: imageIpfsHash,
        imageUrl: imageIpfsUrl,
        metadataHash: metadataIpfsHash,
        tokenURI: tokenURI
      },
      local: {
        metadataFilename: metadataFilename
      }
    });

  } catch (error) {
    console.error('❌ NFT 업로드 실패:', error);
    res.status(500).json({ 
      error: 'NFT 업로드 실패', 
      details: error.message 
    });
  }
});

/**
 * 저장된 NFT 메타데이터 조회 (IPFS 해시로)
 */
router.get('/nft-metadata/:metadataHash', async (req, res) => {
    try {
        const { metadataHash } = req.params;
        
        await ensureUploadDir();

        // 파일명 생성
        const metadataFilename = `${metadataHash}_metadata.json`;
        const metadataPath = path.join(UPLOAD_DIR, metadataFilename);

        // 메타데이터 읽기
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        res.json({
        success: true,
        metadata: metadata,
        source: 'local'
        });

    } catch (error) {
        console.log('로컬 메타데이터 없음, IPFS에서 가져와야 함');
        res.status(404).json({ 
        error: '로컬 메타데이터를 찾을 수 없습니다.',
        fallbackToIPFS: true
        });
    }
});

/**
 * 메타데이터 업데이트 (Dynamic NFT용)
 * 구 파일은 삭제하지 않고 새 파일만 생성
 */
router.put('/nft-metadata/:oldHash', async (req, res) => {
    try {
      const { oldHash } = req.params;
      const { newMetadata, newHash } = req.body;
      
      if (!newMetadata || !newHash) {
        return res.status(400).json({ error: 'newMetadata와 newHash가 필요합니다.' });
      }
      
      await ensureUploadDir();
      
      // 새 메타데이터 저장
      const newFilename = `${newHash}_metadata.json`;
      const newPath = path.join(UPLOAD_DIR, newFilename);
      await fs.writeFile(newPath, JSON.stringify(newMetadata, null, 2));
      
      console.log(`✅ 메타데이터 업데이트: ${oldHash} → ${newHash}`);
      console.log(`💾 새 파일 생성: ${newFilename}`);
      console.log(`📁 구 파일 유지: ${oldHash}_metadata.json`);

        // 구 파일 삭제 (선택사항)
        // const oldFilename = `${oldHash}_metadata.json`;
        // const oldPath = path.join(UPLOAD_DIR, oldFilename);
        // await fs.unlink(oldPath);
      
      res.json({ 
        success: true, 
        newFilename,
        oldFilename: `${oldHash}_metadata.json`
      });
      
    } catch (error) {
      console.error('❌ 메타데이터 업데이트 실패:', error);
      res.status(500).json({ 
        error: '메타데이터 업데이트 실패',
        details: error.message 
      });
    }
  });

/**
 * 저장된 NFT 파일 목록 조회
 */
router.get('/nft-files', async (req, res) => {
  try {
    await ensureUploadDir();
    const files = await fs.readdir(UPLOAD_DIR);
    
    // 메타데이터 파일만 필터링 (temp_ 제외)
    const metadataFiles = files.filter(f => 
      f.endsWith('_metadata.json') && !f.startsWith('temp_')
    );
    
    const nftList = [];

    for (const metadataFile of metadataFiles) {
      const metadataPath = path.join(UPLOAD_DIR, metadataFile);
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        
        nftList.push({
          metadataFile: metadataFile,
          metadata: metadata
        });
      } catch (err) {
        console.error(`메타데이터 읽기 실패: ${metadataFile}`);
      }
    }

    res.json({ 
      success: true,
      count: nftList.length,
      files: nftList 
    });
  } catch (error) {
    res.status(500).json({ error: '파일 목록 조회 실패' });
  }
});

export default router;