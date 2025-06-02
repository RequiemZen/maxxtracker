import express, { Request, Response } from 'express';
import { Schema } from 'mongoose';
import ScheduleItem from '../models/ScheduleItem';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Extend the Request type to include the user property (same as in middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

// @route   POST api/schedule
// @desc    Create a schedule item
// @access  Private
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { description, date, status } = req.body;

  try {
    const newScheduleItem = new ScheduleItem({
      user: req.user?.id,
      description,
      date,
      status,
    });

    const scheduleItem = await newScheduleItem.save();

    res.json(scheduleItem);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/schedule
// @desc    Get all schedule items for a user (either authenticated or specified by userId), optionally filtered by date range
// @access  Private
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Use userId from query params if provided, otherwise use authenticated user's id
    const targetUserId = req.query.userId || req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
    }

    const { start_date, end_date } = req.query;

    let query: any = { user: targetUserId };

    // If start_date and end_date are provided, filter by date range
    if (start_date && end_date) {
      query.date = {
        $gte: new Date(start_date as string),
        $lt: new Date(end_date as string),
      };
    }

    // Also ensure we only fetch items for the target user
    query.user = targetUserId;

    const scheduleItems = await ScheduleItem.find(query).sort({ date: 1 });
    res.json(scheduleItems);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/schedule/:id
// @desc    Update or delete a schedule item based on status
// @access  Private
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { status, reason } = req.body; // Expecting 'status' and optional 'reason' fields

  try {
    // If status is null or empty, delete the item (equivalent to not marked)
    if (status === null || status === '') {
      const scheduleItem = await ScheduleItem.findOneAndDelete({
        _id: req.params.id,
        user: req.user?.id,
      });

      if (!scheduleItem) {
        return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
      }

      // Respond with success message for deletion
      return res.json({ msg: 'Schedule item removed (status reset)' });

    } else {
      // If status is provided, update the item
      const updateData: any = { status };
      if (reason !== undefined) {
        updateData.reason = reason;
      }

      let scheduleItem = await ScheduleItem.findOneAndUpdate(
        { _id: req.params.id, user: req.user?.id },
        { $set: updateData },
        { new: true } // Return the updated document
      );

      if (!scheduleItem) {
        return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
      }

      // Respond with the updated item
      res.json(scheduleItem);
    }

  } catch (err: any) {
    console.error(err.message);
    // Handle case where id is not a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/schedule/:id
// @desc    Delete a schedule item
// @access  Private
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scheduleItem = await ScheduleItem.findOneAndDelete({
      _id: req.params.id,
      user: req.user?.id,
    });

    if (!scheduleItem) {
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