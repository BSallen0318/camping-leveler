const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 배경
  ctx.fillStyle = '#f5f3e7';
  ctx.fillRect(0, 0, size, size);
  
  const center = size / 2;
  const scale = size / 512;
  
  // 외곽 링
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(center, center, 220 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = '#e0e8d9';
  ctx.beginPath();
  ctx.arc(center, center, 200 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  // 중앙 링
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(center, center, 160 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = '#f5f3e7';
  ctx.beginPath();
  ctx.arc(center, center, 140 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  // 내부 링
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(center, center, 100 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = '#e0e8d9';
  ctx.beginPath();
  ctx.arc(center, center, 80 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  // 중앙 버블
  ctx.fillStyle = '#3cb371';
  ctx.beginPath();
  ctx.arc(center, center, 60 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  // 테두리
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(center, center, 60 * scale, 0, 2 * Math.PI);
  ctx.stroke();
  
  // 수평선
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  
  ctx.beginPath();
  ctx.moveTo(180 * scale, center);
  ctx.lineTo(332 * scale, center);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(center, 180 * scale);
  ctx.lineTo(center, 332 * scale);
  ctx.stroke();
  
  // 각도 표시
  ctx.fillStyle = '#3cb371';
  ctx.beginPath();
  ctx.arc(center, 180 * scale, 8 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(center, 332 * scale, 8 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(180 * scale, center, 8 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(332 * scale, center, 8 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

async function generateIcons() {
  try {
    // 192x192 아이콘 생성
    const icon192 = generateIcon(192);
    fs.writeFileSync(path.join(__dirname, '../public/icon-192.png'), icon192);
    
    // 512x512 아이콘 생성
    const icon512 = generateIcon(512);
    fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), icon512);
    
    console.log('✅ PWA 아이콘이 성공적으로 생성되었습니다!');
    console.log('📁 public/icon-192.png');
    console.log('📁 public/icon-512.png');
  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류 발생:', error);
  }
}

generateIcons(); 