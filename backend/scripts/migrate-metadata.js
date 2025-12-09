// backend/scripts/migrate-metadata.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../nft-uploads');

async function migrateMetadataFiles() {
  console.log('🔄 메타데이터 파일 마이그레이션 시작...\n');

  try {
    const files = await fs.readdir(UPLOAD_DIR);
    
    // 기존 형식의 메타데이터 파일만 필터링 (이름_숫자_metadata.json)
    const oldFormatFiles = files.filter(f => 
      f.endsWith('_metadata.json') && 
      !f.match(/^Qm[a-zA-Z0-9]+_metadata\.json$/) // 이미 새 형식이 아닌 것
    );

    console.log(`📁 발견된 기존 형식 파일: ${oldFormatFiles.length}개\n`);

    for (const oldFilename of oldFormatFiles) {
      try {
        const oldPath = path.join(UPLOAD_DIR, oldFilename);
        
        // 메타데이터 읽기
        const metadataContent = await fs.readFile(oldPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        console.log(`📤 처리 중: ${oldFilename}`);
        console.log(`   이름: ${metadata.name}`);

        // Pinata에 메타데이터 업로드하여 IPFS 해시 얻기
        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinJSONToIPFS',
          metadata,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PINATA_JWT}`
            }
          }
        );

        const metadataHash = response.data.IpfsHash;
        const newFilename = `${metadataHash}_metadata.json`;
        const newPath = path.join(UPLOAD_DIR, newFilename);

        // 새 파일명으로 복사 (원본은 유지)
        await fs.copyFile(oldPath, newPath);

        console.log(`   ✅ 새 파일 생성: ${newFilename}`);
        console.log(`   🔗 IPFS: ipfs://${metadataHash}\n`);

        // 잠시 대기 (rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ 실패: ${oldFilename}`, error.message, '\n');
      }
    }

    console.log('\n✨ 마이그레이션 완료!');
    console.log('⚠️  원본 파일은 삭제되지 않았습니다. 확인 후 수동으로 삭제하세요.');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}

migrateMetadataFiles();