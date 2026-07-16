import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { ipKeyGenerator } from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
});

app.set('trust proxy', 2);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(hpp());
app.use('/api', apiLimiter);
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'HEAD', 'OPTIONS']
}));
app.use((req, res, next) => {
  req.setTimeout(10000);
  res.setTimeout(10000);
  next();
});
app.use((req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  if (!isDev && !isLocalhost && !req.headers['cf-connecting-ip']) {
    return res.status(403).send('Direct access forbidden.');
  }
  next();
});
