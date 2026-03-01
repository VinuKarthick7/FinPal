import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { achievementScheduler } from '../utils/achievementScheduler';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import Achievement from '../models/Achievement';

/**
 * Manual Test Script to Check February 2026 Achievements
 * Run: npx ts-node src/tests/checkFebruaryAchievements.ts
 */

async function checkFebruaryAchievements() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const MONTH = 2; // February
    const YEAR = 2026;
    
    console.log('\n📊 FEBRUARY 2026 ACHIEVEMENT CHECK REPORT');
    console.log('==========================================\n');
    
    // Get all active users
    const users = await User.find({ isActive: true }).select('_id email');
    console.log(`Total active users: ${users.length}\n`);
    
    let eligibleCount = 0;
    let ineligibleCount = 0;
    const report: any[] = [];
    
    for (const user of users) {
      const userId = user._id.toString();
      const email = user.email;
      
      // Get budget
      const budget = await Budget.findOne({
        user: userId,
        month: MONTH,
        year: YEAR,
      });
      
      if (!budget) {
        ineligibleCount++;
        report.push({
          email,
          status: '❌ NO BUDGET',
          budgetAmount: 0,
          totalExpenses: 0,
          reason: 'No budget set for February 2026'
        });
        continue;
      }
      
      // Calculate expenses
      const startOfMonth = new Date(YEAR, MONTH - 1, 1);
      const endOfMonth = new Date(YEAR, MONTH, 0, 23, 59, 59);
      
      const transactions = await Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
          },
        },
      ]);
      
      const totalExpenses = transactions[0]?.totalExpenses || 0;
      const transactionCount = transactions[0]?.transactionCount || 0;
      const budgetAmount = budget.totalBudget;
      const savingsAmount = budgetAmount - totalExpenses;
      const utilization = (totalExpenses / budgetAmount) * 100;
      
      // Check existing achievement
      const existingAchievement = await Achievement.findOne({
        userId,
        month: MONTH,
        year: YEAR,
      });
      
      // Determine eligibility
      if (transactionCount === 0) {
        ineligibleCount++;
        report.push({
          email,
          status: '❌ NO ACTIVITY',
          budgetAmount,
          totalExpenses,
          transactionCount,
          reason: 'No transactions recorded',
          achievement: existingAchievement ? existingAchievement.status : 'none'
        });
      } else if (totalExpenses > budgetAmount) {
        ineligibleCount++;
        report.push({
          email,
          status: '❌ OVER BUDGET',
          budgetAmount,
          totalExpenses,
          transactionCount,
          exceeded: totalExpenses - budgetAmount,
          utilization: `${utilization.toFixed(1)}%`,
          reason: `Exceeded budget by ₹${(totalExpenses - budgetAmount).toFixed(2)}`,
          achievement: existingAchievement ? existingAchievement.status : 'none'
        });
      } else {
        eligibleCount++;
        report.push({
          email,
          status: '✅ ELIGIBLE',
          budgetAmount,
          totalExpenses,
          transactionCount,
          savings: savingsAmount,
          utilization: `${utilization.toFixed(1)}%`,
          achievement: existingAchievement ? existingAchievement.status : 'none'
        });
      }
    }
    
    // Print detailed report
    console.log('DETAILED USER REPORT:');
    console.log('---------------------\n');
    
    report.forEach((r, index) => {
      console.log(`${index + 1}. ${r.email}`);
      console.log(`   Status: ${r.status}`);
      if (r.budgetAmount > 0) {
        console.log(`   Budget: ₹${r.budgetAmount.toFixed(2)}`);
        console.log(`   Spent: ₹${r.totalExpenses.toFixed(2)}`);
        console.log(`   Transactions: ${r.transactionCount || 0}`);
        if (r.utilization) console.log(`   Utilization: ${r.utilization}`);
        if (r.savings !== undefined) console.log(`   Savings: ₹${r.savings.toFixed(2)}`);
        if (r.exceeded !== undefined) console.log(`   Over by: ₹${r.exceeded.toFixed(2)}`);
      }
      console.log(`   Current Achievement: ${r.achievement}`);
      if (r.reason) console.log(`   Reason: ${r.reason}`);
      console.log('');
    });
    
    // Summary
    console.log('\n==========================================');
    console.log('SUMMARY:');
    console.log(`✅ Eligible for Achievement: ${eligibleCount}`);
    console.log(`❌ Not Eligible: ${ineligibleCount}`);
    console.log(`📊 Total Users: ${users.length}`);
    console.log('==========================================\n');
    
    // Ask if user wants to award achievements now
    console.log('💡 To manually award achievements for February 2026, run:');
    console.log('   achievementScheduler.checkAllUsersAchievements(2, 2026);\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFebruaryAchievements();
