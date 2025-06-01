import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Extend the Request type to include the user property (for future middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    // Create new user
    user = new User({
      username,
      password
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Generate JWT token
    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '365d' },
      (err: any, token: string | undefined) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Generate JWT token
    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '365d' },
      (err: any, token: string | undefined) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/auth/users
// @desc    Get all users (for viewing purposes)
// @access  Private
router.get('/users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Find all users and select only the id and username fields
    const users = await User.find().select('_id username');
    res.json(users);

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router; 