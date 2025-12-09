// backend/server.js - CORS 설정 수정
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nftStorageRouter from './routes/nft-storage-api.js';

const app = express();

// CORS 설정 (더 명확하게)
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// OPTIONS preflight 명시적 처리
// app.options('*', cors());

// JSON 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NFT 저장 API
app.use('/api/nft', nftStorageRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`백엔드 서버가 포트 ${PORT}에서 실행 중`);
  console.log(`NFT 파일은 nft-uploads 폴더에 저장됩니다`);
});