import crypto from 'crypto';
import fs from 'fs';

const secret = 'mzJ2MpdQqFzNkEGxgJtcZh4q6rV2fGnnUB6Bizp713htkn9m9rpeiciw8FvVGaA2';
const message = '';

// AES-256 키 생성 (32바이트 = 256비트)
function getKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

// AES-256 암호화
function encrypt(text, secret) {
  const key = getKey(secret);
  const iv = crypto.randomBytes(16); // 초기화 벡터 (16바이트)
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // IV와 암호화된 텍스트를 함께 반환 (IV는 공개되어도 안전)
  return iv.toString('hex') + ':' + encrypted;
}

// AES-256 복호화
function decrypt(encryptedData, secret) {
  const key = getKey(secret);
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 사용 예제
const encrypted = encrypt(message, secret);
console.log('암호화된 텍스트:', encrypted);

const decrypted = decrypt(encrypted, secret);
console.log('복호화된 텍스트:', decrypted);

// fs.writeFileSync('asd.txt', encrypted);