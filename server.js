const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 存放目录
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// 确保目录存在
[PUBLIC_DIR, UPLOADS_DIR, DATA_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 简单持久化
function loadJSON(file, defaultValue) {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file,'utf8'));
  } catch {
    return defaultValue;
  }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let photos = loadJSON(PHOTOS_FILE, []); // array of {url, filename, uploadedAt}
let config = loadJSON(CONFIG_FILE, { maxPhotos: 10 });

function trimPhotos() {
  if (config.maxPhotos && photos.length > config.maxPhotos) {
    // 删除最早的多余文件（可以改为按需）
    const toRemove = photos.slice(0, photos.length - config.maxPhotos);
    toRemove.forEach(p => {
      const fp = path.join(UPLOADS_DIR, p.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });
    photos = photos.slice(photos.length - config.maxPhotos);
    saveJSON(PHOTOS_FILE, photos);
  }
}

// multer 配置（本地磁盘）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/', express.static(PUBLIC_DIR));

// 简单 admin 验证
function checkAdmin(req, res, next) {
  const pw = req.body.password || req.query.password || req.headers['x-admin-password'];
  if (pw && pw === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// API: 获取当前照片与配置
app.get('/api/photos', (req, res) => {
  res.json({ photos, config });
});

// API: 上传照片（管理员）
app.post('/api/upload', checkAdmin, upload.array('photos', 50), (req, res) => {
  const files = req.files || [];
  files.forEach(f => {
    const url = `/uploads/${f.filename}`;
    photos.push({ url, filename: f.filename, uploadedAt: new Date().toISOString() });
  });
  trimPhotos();
  saveJSON(PHOTOS_FILE, photos);
  io.emit('photos-updated', { photos, config });
  res.json({ ok: true, photos, config });
});

// API: 删除单张（管理员）
app.post('/api/delete', checkAdmin, (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  photos = photos.filter(p => p.filename !== filename);
  const fp = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  saveJSON(PHOTOS_FILE, photos);
  io.emit('photos-updated', { photos, config });
  res.json({ ok: true, photos });
});

// API: 设置配置（管理员），比如 maxPhotos
app.post('/api/config', checkAdmin, (req, res) => {
  const { maxPhotos } = req.body;
  if (typeof maxPhotos !== 'undefined') {
    config.maxPhotos = parseInt(maxPhotos) || 0;
    saveJSON(CONFIG_FILE, config);
    trimPhotos();
    saveJSON(PHOTOS_FILE, photos);
    io.emit('photos-updated', { photos, config });
  }
  res.json({ ok: true, config, photos });
});

// Socket.IO 连接（候选人/管理端可监听）
io.on('connection', (socket) => {
  // 连接后推送当前状态
  socket.emit('photos-updated', { photos, config });
});

// 启动
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
