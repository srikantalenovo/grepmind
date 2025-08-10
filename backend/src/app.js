import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import 'dotenv/config';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://grepmind.sritechhub.com',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
