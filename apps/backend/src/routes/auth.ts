import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prismaClient';

const router: Router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_development';

// Login route
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Username and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
      return;
    }

    const payload = { userId: user.id, username: user.username };

    // Access token valid for 15 minutes
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    
    // Refresh token valid for 7 days
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
  }
});

// Refresh token route
router.post('/refresh', (req: Request, res: Response): void => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Refresh token is required' });
    return;
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid or expired refresh token' });
      return;
    }

    const payload = { userId: decoded.userId, username: decoded.username };

    // Generate new tokens
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
});

export default router;
