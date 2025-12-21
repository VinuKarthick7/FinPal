import { Request, Response } from 'express';
import { classifyExpense } from '../utils/classifier';

const categories = [
  'Food', 'Travel', 'Rent', 'Utilities', 'Shopping', 'Health', 'Education', 'Other'
];

/**
 * Controller to handle expense categorization
 */
export const categorizeExpense = async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    // Call AI utility to classify the expense
    const category = await classifyExpense(description, categories);

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error categorizing expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};