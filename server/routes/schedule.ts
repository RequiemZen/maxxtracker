import express, { Request, Response } from 'express';
import { Schema } from 'mongoose';
import ScheduleItem from '../models/ScheduleItem';
import authMiddleware from '../middleware/authMiddleware';
import TemporaryScheduleItem from '../models/TemporaryScheduleItem';
import GeneralScheduleItem from '../models/GeneralScheduleItem';

const router = express.Router();

// Extend the Request type to include the user property (same as in middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: Schema.Types.ObjectId };
}

// @route   POST api/schedule
// @desc    Create a schedule item
// @access  Private
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { definitionId, description, date, status } = req.body;

  try {
    const newScheduleItem = new ScheduleItem({
      user: req.user?.id,
      definitionId,
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
// @desc    Get all relevant schedule items for a user on a specific date range
// @access  Private
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.query.userId || req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
    }

    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ msg: 'start_date and end_date are required query parameters' });
    }

    const startDateUTC = new Date(start_date as string);
    const endDateUTC = new Date(end_date as string);

    const generalItems = await GeneralScheduleItem.find({ user: targetUserId }).select('_id description weekDays');

    const temporaryDefinitions = await TemporaryScheduleItem.find({
      user: targetUserId,
      startDate: { $lte: endDateUTC },
      endDate: { $gte: startDateUTC },
    }).select('_id description startDate endDate createdAt');

    const actualEntries = await ScheduleItem.find({
      user: targetUserId,
      date: {
        $gte: startDateUTC,
        $lt: endDateUTC,
      },
    }).select('_id description date status reason definitionId');

    res.json({
      generalItems: Array.isArray(generalItems) ? generalItems : [],
      temporaryDefinitions: Array.isArray(temporaryDefinitions) ? temporaryDefinitions : [],
      actualEntries: Array.isArray(actualEntries) ? actualEntries : [],
    });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/schedule/:id
// @desc    Update or delete a schedule item based on status
// @access  Private
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { status, reason } = req.body;

  try {
    if (status === null || status === '') {
      const scheduleItem = await ScheduleItem.findOneAndDelete({
        _id: req.params.id,
        user: req.user?.id,
      });

      if (!scheduleItem) {
        return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
      }

      return res.json({ msg: 'Schedule item removed' });
    } else {
      const updateData: any = { status };
      if (reason !== undefined) {
        updateData.reason = reason;
      }

      let scheduleItem = await ScheduleItem.findOneAndUpdate(
        { _id: req.params.id, user: req.user?.id },
        { $set: updateData },
        { new: true }
      );

      if (!scheduleItem) {
        return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
      }

      res.json(scheduleItem);
    }
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Schedule item not found' });
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
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Schedule item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schedule/temporary
// @desc    Create a temporary schedule item definition
// @access  Private
router.post('/temporary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user?.id;
    const { description, startDate, endDate } = req.body;

    if (!user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }

    const newTemporaryScheduleItem = new TemporaryScheduleItem({
      user,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    const temporaryItem = await newTemporaryScheduleItem.save();
    res.status(201).json(temporaryItem);
  } catch (error) {
    console.error('Error creating temporary schedule item:', error);
    res.status(500).json({ message: 'Error creating temporary schedule item', error });
  }
});

// @route   GET api/schedule/temporary
// @desc    Get all temporary schedule item definitions for a user
// @access  Private
router.get('/temporary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.query.userId || req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
    }

    const temporaryDefinitions = await TemporaryScheduleItem.find({ user: targetUserId }).sort({ createdAt: 1 });
    res.json(temporaryDefinitions);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/schedule/debug/temporary
// @desc    Debug endpoint to show all temporary items
// @access  Private
router.get('/debug/temporary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.query.userId || req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
    }

    const temporaryDefinitions = await TemporaryScheduleItem.find({ user: targetUserId });

    // Преобразуем даты в ISO строки для удобства чтения
    const formattedDefinitions = temporaryDefinitions.map(def => ({
      _id: def._id,
      description: def.description,
      startDate: def.startDate.toISOString(),
      endDate: def.endDate.toISOString(),
      createdAt: def.createdAt.toISOString()
    }));

    res.json(formattedDefinitions);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/schedule/temporary/:id
// @desc    Update a temporary schedule item definition
// @access  Private
router.put('/temporary/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const definitionId = req.params.id;
    const userId = req.user?.id;
    const { description, startDate, endDate } = req.body;

    if (!userId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const updateFields: any = {};
    if (description !== undefined) updateFields.description = description;
    // Преобразуем даты в UTC Date объекты перед сохранением
    if (startDate !== undefined) updateFields.startDate = new Date(startDate);
    if (endDate !== undefined) updateFields.endDate = new Date(endDate);

    // Find and update the temporary definition, ensure it belongs to the user
    const updatedDefinition = await TemporaryScheduleItem.findOneAndUpdate(
      { _id: definitionId, user: userId },
      { $set: updateFields },
      { new: true } // Return the updated document
    ).select('_id description startDate endDate createdAt');

    if (!updatedDefinition) {
      return res.status(404).json({ msg: 'Temporary schedule item not found or user not authorized' });
    }

    // TODO: Decide if related ScheduleItem entries should be updated (e.g., description change)
    // If description changes, should old ScheduleItem entries also update their description?
    // For now, we are not updating existing ScheduleItem entries on definition edit.

    res.json(updatedDefinition);

  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Temporary schedule item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/schedule/temporary/:id
// @desc    Delete a temporary schedule definition and associated schedule items
// @access  Private
router.delete('/temporary/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const definitionId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find and delete the temporary definition, ensure it belongs to the user
    const deletedDefinition = await TemporaryScheduleItem.findOneAndDelete({ _id: definitionId, user: userId });

    if (!deletedDefinition) {
      return res.status(404).json({ msg: 'Temporary schedule item not found or user not authorized' });
    }

    // Delete all associated ScheduleItem entries
    await ScheduleItem.deleteMany({ definitionId: definitionId, user: userId });

    res.json({ msg: 'Temporary schedule item and associated entries deleted' });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router; 