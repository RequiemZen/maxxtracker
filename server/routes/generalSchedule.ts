import express, { Request, Response } from 'express';
import { Schema } from 'mongoose';
import GeneralScheduleItem from '../models/GeneralScheduleItem';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Extend the Request type to include the user property (same as in middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

// @route   POST api/general-schedule
// @desc    Create a general schedule item
// @access  Private
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { description } = req.body;

  try {
    const newGeneralScheduleItem = new GeneralScheduleItem({
      user: req.user?.id,
      description,
    });

    const generalScheduleItem = await newGeneralScheduleItem.save();

    res.json(generalScheduleItem);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/general-schedule
// @desc    Get all general schedule items for a user
// @access  Private
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const generalScheduleItems = await GeneralScheduleItem.find({ user: req.user?.id }).sort({ createdAt: 1 });
    res.json(generalScheduleItems);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/general-schedule/:id
// @desc    Delete a general schedule item
// @access  Private
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const generalScheduleItem = await GeneralScheduleItem.findOneAndDelete({
      _id: req.params.id,
      user: req.user?.id,
    });

    if (!generalScheduleItem) {
      return res.status(404).json({ msg: 'Schedule item not found' });
    }

    res.json({ msg: 'Schedule item removed' });
  } catch (err: any) {
    console.error(err.message);
    // Handle case where id is not a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Schedule item not found' });
    }
    res.status(500).send('Server Error');
  }
});

export default router; 