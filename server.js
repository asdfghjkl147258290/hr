const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const methodOverride = require('method-override');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: [
    { id: 1, title: '示例：前端工程师', location: '远程', description: '负责网站前端开发，要求熟悉 React 或 Vue。', posted_at: new Date().toISOString() },
    { id: 2, title: '示例：后端工程师', location: '北京', description: '负责 API 设计与实现，熟悉 Node.js。', posted_at: new Date().toISOString() }
  ] }, null, 2));
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    return { jobs: [] };
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'changeme';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }));

function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// Public
app.get('/', (req, res) => res.redirect('/jobs'));
app.get('/jobs', (req, res) => {
  const data = readData();
  res.render('jobs', { jobs: data.jobs });
});
app.get('/api/jobs', (req, res) => {
  const data = readData();
  res.json(data.jobs);
});

// Admin auth
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});
app.post('/admin/login', (req, res) => {
  const pw = req.body.password;
  if (pw === process.env.ADMIN_PASSWORD || pw === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: '密码错误' });
});
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Admin UI
app.get('/admin', ensureAdmin, (req, res) => {
  const data = readData();
  res.render('admin/index', { jobs: data.jobs });
});
app.get('/admin/new', ensureAdmin, (req, res) => {
  res.render('admin/form', { job: null });
});
app.post('/admin/jobs', ensureAdmin, (req, res) => {
  const data = readData();
  const id = data.jobs.length ? Math.max(...data.jobs.map(j=>j.id)) + 1 : 1;
  const job = {
    id,
    title: req.body.title || '(未命名)',
    location: req.body.location || '',
    description: req.body.description || '',
    posted_at: new Date().toISOString()
  };
  data.jobs.unshift(job);
  writeData(data);
  res.redirect('/admin');
});
app.get('/admin/jobs/:id/edit', ensureAdmin, (req, res) => {
  const data = readData();
  const job = data.jobs.find(j=>j.id==req.params.id);
  if (!job) return res.status(404).send('Not found');
  res.render('admin/form', { job });
});
app.put('/admin/jobs/:id', ensureAdmin, (req, res) => {
  const data = readData();
  const job = data.jobs.find(j=>j.id==req.params.id);
  if (!job) return res.status(404).send('Not found');
  job.title = req.body.title || job.title;
  job.location = req.body.location || job.location;
  job.description = req.body.description || job.description;
  writeData(data);
  res.redirect('/admin');
});
app.delete('/admin/jobs/:id', ensureAdmin, (req, res) => {
  const data = readData();
  data.jobs = data.jobs.filter(j=>j.id!=req.params.id);
  writeData(data);
  res.redirect('/admin');
});

// Simple health
app.get('/health', (req, res) => res.send('ok'));

app.listen(PORT, () => console.log(`HR app listening on port ${PORT}`));
