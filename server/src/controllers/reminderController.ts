import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Reminder } from '../models';

// @desc    Get all reminders for user
// @route   GET /api/reminders
// @access  Private
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { upcoming } = req.query;

    const query: any = { user: userId };

    // Filter for upcoming unpaid reminders
    if (upcoming === 'true') {
      query.isPaid = false;
      query.dueDate = { $gte: new Date() };
    }

    const reminders = await Reminder.find(query).sort({ dueDate: 1 });

    // Calculate days until due for each reminder
    const remindersWithDays = reminders.map((reminder) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(reminder.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...reminder.toObject(),
        daysUntilDue,
      };
    });

    res.json({
      success: true,
      data: remindersWithDays,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reminders',
    });
  }
};

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
export const getReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
      return;
    }

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reminder',
    });
  }
};

// @desc    Create reminder
// @route   POST /api/reminders
// @access  Private
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const userId = (req as any).user._id;
    const { title, amount, dueDate, type, recurring, recurringPeriod, notes } = req.body;

    const reminder = await Reminder.create({
      user: userId,
      title,
      amount,
      dueDate,
      type: type || 'bill',
      recurring: recurring || false,
      recurringPeriod,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create reminder',
    });
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
export const updateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { title, amount, dueDate, type, recurring, recurringPeriod, notes } = req.body;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { title, amount, dueDate, type, recurring, recurringPeriod, notes },
      { new: true, runValidators: true }
    );

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update reminder',
    });
  }
};

// @desc    Mark reminder as paid
// @route   PATCH /api/reminders/:id/pay
// @access  Private
export const markReminderPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { isPaid: true, paidDate: new Date() },
      { new: true }
    );

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
      return;
    }

    // If recurring, create next reminder
    if (reminder.recurring && reminder.recurringPeriod) {
      const nextDueDate = new Date(reminder.dueDate);
      switch (reminder.recurringPeriod) {
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }

      await Reminder.create({
        user: userId,
        title: reminder.title,
        amount: reminder.amount,
        dueDate: nextDueDate,
        type: reminder.type,
        recurring: reminder.recurring,
        recurringPeriod: reminder.recurringPeriod,
        notes: reminder.notes,
      });
    }

    res.json({
      success: true,
      message: 'Reminder marked as paid',
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark reminder as paid',
    });
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete reminder',
    });
  }
};
