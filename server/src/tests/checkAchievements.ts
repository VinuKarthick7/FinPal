import mongoose from 'mongoose';
import config from '../config';
import Achievement from '../models/Achievement';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

async function checkAndRecover() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    // 1. Check existing achievements
    const allAchievements = await Achievement.find({}).lean();
    console.log('\n=== ALL ACHIEVEMENTS IN DB ===');
    console.log(`Total: ${allAchievements.length}`);
    for (const a of allAchievements) {
      console.log(`  ${a.email} - ${a.month}/${a.year} | status: ${a.status} | visible: ${a.visibleToUser} | logins: ${a.loginCountAfterAward}`);
    }

    // 2. Check users with budgets for February 2026
    const users = await User.find({}).select('_id email').lean();
    console.log(`\n=== CHECKING FEBRUARY 2026 ELIGIBILITY ===`);
    
    for (const user of users) {
      const budget = await Budget.findOne({ user: user._id, month: 2, year: 2026 }).lean();
      if (!budget) {
        console.log(`  ${user.email}: No budget for Feb 2026`);
        continue;
      }

      const startOfMonth = new Date(2026, 1, 1);  // Feb 1
      const endOfMonth = new Date(2026, 2, 0, 23, 59, 59);  // Feb 28

      const transactions = await Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(user._id),
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      const totalExpenses = transactions[0]?.totalExpenses || 0;
      const txCount = transactions[0]?.count || 0;
      const isEligible = txCount > 0 && totalExpenses <= budget.totalBudget;

      console.log(`  ${user.email}: Budget=₹${budget.totalBudget}, Spent=₹${totalExpenses}, Transactions=${txCount}, Eligible=${isEligible}`);

      // 3. If eligible but no achievement exists, re-create it
      if (isEligible) {
        const existing = await Achievement.findOne({ userId: user._id, month: 2, year: 2026 });
        if (!existing) {
          console.log(`  >>> RE-CREATING Feb 2026 achievement for ${user.email} (was deleted by bug)`);
          const savingsAmount = budget.totalBudget - totalExpenses;
          const budgetUtilization = Math.round((totalExpenses / budget.totalBudget) * 100);
          
          await Achievement.create({
            userId: user._id,
            email: user.email,
            month: 2,
            year: 2026,
            budgetAmount: budget.totalBudget,
            totalExpenses,
            achievementType: 'budget_success',
            status: 'finalized',
            earnedAt: new Date(),
            finalizedAt: new Date(),
            loginCountAfterAward: 3,  // User already did 3 logins
            visibleToUser: true,      // Make visible immediately
            popupShown: false,        // Allow popup to show
            metadata: {
              savingsAmount,
              budgetUtilization,
              message: 'Great job! You managed your budget well this month ⭐',
            },
          });
          console.log(`  ✅ Achievement re-created and set to VISIBLE for ${user.email}`);
        } else {
          console.log(`  Achievement already exists: visible=${existing.visibleToUser}, logins=${existing.loginCountAfterAward}`);
          // If it exists but not visible, force it visible since user already did 3 logins
          if (!existing.visibleToUser) {
            existing.visibleToUser = true;
            existing.loginCountAfterAward = 3;
            await existing.save();
            console.log(`  ✅ Force-unlocked existing achievement for ${user.email}`);
          }
        }
      }
    }

    // 4. Final state
    const finalAchievements = await Achievement.find({}).lean();
    console.log('\n=== FINAL ACHIEVEMENT STATE ===');
    for (const a of finalAchievements) {
      console.log(`  ${a.email} - ${a.month}/${a.year} | status: ${a.status} | visible: ${a.visibleToUser} | logins: ${a.loginCountAfterAward} | popupShown: ${a.popupShown}`);
    }
    console.log(`Total: ${finalAchievements.length}`);

    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkAndRecover();
