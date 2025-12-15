import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import { Types } from 'mongoose';

// Helper: Get start/end of month
function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Helper: Get last N months' ranges
function getLastNMonthsRanges(date: Date, n: number) {
  const ranges = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    ranges.push(getMonthRange(d));
  }
  return ranges;
}

// Pure function for pattern detection
function detectPatterns(current: Record<string, number>, history: Record<string, number[]>) {
  const insights = [];
  // Monthly overspend
  const currentTotal = Object.values(current).reduce((a, b) => a + b, 0);
  const historyTotals = Object.values(history).map(arr => arr.reduce((a, b) => a + b, 0));
  const avgTotal = historyTotals.length ? historyTotals.reduce((a, b) => a + b, 0) / historyTotals.length : 0;
  if (avgTotal && currentTotal > avgTotal * 1.3) {
    insights.push({
      type: 'SPIKE',
      message: `Total spending increased by ${Math.round(((currentTotal - avgTotal) / avgTotal) * 100)}% compared to your last 3-month average.`,
      change: `+${Math.round(((currentTotal - avgTotal) / avgTotal) * 100)}%`,
      reason: 'Compared to last 3 months',
    });
  }
  // Category spike
  for (const cat in current) {
    const histArr = history[cat] || [];
    const avg = histArr.length ? histArr.reduce((a, b) => a + b, 0) / histArr.length : 0;
    if (avg && current[cat] > avg * 1.25) {
      insights.push({
        type: 'CATEGORY_INCREASE',
        category: cat,
        message: `${cat} spending increased by ${Math.round(((current[cat] - avg) / avg) * 100)}% compared to your last 3-month average.`,
        change: `+${Math.round(((current[cat] - avg) / avg) * 100)}%`,
        reason: 'Compared to last 3 months',
      });
    }
  }
  // Top category dominance
  const sorted = Object.entries(current).sort((a, b) => b[1] - a[1]);
  if (sorted.length && sorted[0][1] > currentTotal * 0.4) {
    insights.push({
      type: 'TOP_CATEGORY_DOMINANCE',
      category: sorted[0][0],
      message: `${sorted[0][0]} accounts for more than 40% of your spending this month.`,
      change: '',
      reason: 'Current month',
    });
  }
  return insights;
}

export const getMonthlyInsights = async (req: Request, res: Response) => {
  try {
    let userId: string | undefined = undefined;
    if (typeof req.query.userId === 'string') {
      userId = req.query.userId;
    } else if (Array.isArray(req.query.userId) && req.query.userId.length > 0 && typeof req.query.userId[0] === 'string') {
      userId = req.query.userId[0];
    } else if (req.user) {
      if (typeof req.user === 'string') {
        userId = req.user;
      } else if (typeof req.user === 'object' && req.user !== null && 'id' in req.user && typeof (req.user as any).id === 'string') {
        userId = (req.user as any).id;
      }
    }
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const now = new Date();
    const { start, end } = getMonthRange(now);
    // Current month aggregation
    const currentAgg = await Transaction.aggregate([
      { $match: { user: new Types.ObjectId(userId), type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    const current: Record<string, number> = {};
    let totalSpend = 0;
    currentAgg.forEach(row => {
      current[row._id] = row.total;
      totalSpend += row.total;
    });
    // Last 3 months aggregation
    const ranges = getLastNMonthsRanges(now, 3);
    const history: Record<string, number[]> = {};
    for (const r of ranges) {
      const histAgg = await Transaction.aggregate([
        { $match: { user: new Types.ObjectId(userId), type: 'expense', date: { $gte: r.start, $lte: r.end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]);
      histAgg.forEach(row => {
        if (!history[row._id]) history[row._id] = [];
        history[row._id].push(row.total);
      });
    }
    // Pattern detection
    const insights = detectPatterns(current, history);
    res.json({
      period: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalSpend,
      insights,
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
};
