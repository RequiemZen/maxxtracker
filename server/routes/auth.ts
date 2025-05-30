import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Schema } from 'mongoose';
import User from '../models/User';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Extend the Request type to include the user property (for future middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

// @route   POST api/auth/login
// @desc    Authenticate or Register user by username & get token
// @access  Public
router.post('/login', async (req: Request, res: Response) => {
  const { username } = req.body;

  try {
    let user = await User.findOne({ username });

    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({ username });
      await user.save();
    }

    // Generate JWT token
    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }, // Token expires in 1 hour
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