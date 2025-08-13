import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import clusterRoutes from './routes/clusterRoutes.js';
import resourcesRoutes from './routes/resourcesRoutes.js';
import 'dotenv/config';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://grepmind.sritechhub.com',
  credentials: true
//  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role'], // allow RBAC header
//  exposedHeaders: ['x-request-id'],
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/cluster', clusterRoutes);
app.use('/api/resources', resourcesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
