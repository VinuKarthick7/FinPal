import Transaction from '../models/Transaction';
import { Types } from 'mongoose';

/**
 * Generates a sanitized, aggregated financial summary for AI insights
 * @param userId - The user ID
 * @returns Aggregated summary object
 */
export const generateFinancialSummary = async (userId: string) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Aggregate expenses for last 3 months
  const expenses = await Transaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: threeMonthsAgo, $lte: now },
      },
    },
    {
      $group: {
        _id: { category: '$category', month: { $month: '$date' }, year: { $year: '$date' } },
        total: { $sum: '$amount' },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  // Calculate monthly averages and distributions
  const monthlyTotals: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  let totalSpent = 0;

  expenses.forEach((exp) => {
    const monthKey = `${exp._id.year}-${exp._id.month}`;
    if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
    monthlyTotals[monthKey] += exp.total;
    totalSpent += exp.total;

    if (!categoryTotals[exp._id.category]) categoryTotals[exp._id.category] = 0;
    categoryTotals[exp._id.category] += exp.total;
  });

  const numMonths = Object.keys(monthlyTotals).length;
  const monthlyAverage = numMonths > 0 ? totalSpent / numMonths : 0;

  // Category distribution as percentages
  const categoryDistribution: Record<string, number> = {};
  Object.keys(categoryTotals).forEach((cat) => {
    categoryDistribution[cat] = Math.round((categoryTotals[cat] / totalSpent) * 100);
  });

  // Category trends (simplified: compare first and last month)
  const categoryTrend: Record<string, string> = {};
  const months = Object.keys(monthlyTotals).sort();
  if (months.length >= 2) {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    // Note: This is a simplification; in reality, you'd compare per category per month
    // For now, assume overall trend
  }

  // Anomalies (simple: categories above 30%)
  const anomalies: string[] = [];
  Object.entries(categoryDistribution).forEach(([cat, pct]) => {
    if (pct > 30) {
      anomalies.push(`${cat} spending is ${pct}% of total, which is high`);
    }
  });

  return {
    period: 'last_3_months',
    monthly_average: Math.round(monthlyAverage),
    category_distribution: categoryDistribution,
    category_trend: categoryTrend, // Placeholder
    anomalies,
  };
};