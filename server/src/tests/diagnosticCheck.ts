import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';

async function diagnosticCheck() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('\n👤 USER INFO:');
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`User ID Type: ${typeof user._id}`);
    console.log('');
    
    // Check budget for February 2026
    const budget = await Budget.findOne({
      user: user._id,
      month: 2,
      year: 2026
    });
    
    console.log('💰 BUDGET INFO:');
    if (budget) {
      console.log(`Budget ID: ${budget._id}`);
      console.log(`Month: ${budget.month}/${budget.year}`);
      console.log(`Total Budget: ₹${budget.totalBudget}`);
    } else {
      console.log('❌ No budget found for February 2026');
    }
    console.log('');
    
    // Check all transactions for this user
    const allTransactions = await Transaction.find({
      userId: user._id
    }).sort({ date: -1 }).limit(20);
    
    console.log(`📝 TOTAL TRANSACTIONS FOR USER: ${allTransactions.length}`);
    console.log('');
    
    // Check February 2026 transactions
    const startOfFeb = new Date(2026, 1, 1); // Month is 0-indexed in Date
    const endOfFeb = new Date(2026, 1, 28, 23, 59, 59);
    
    console.log('📅 DATE RANGE CHECK:');
    console.log(`Start: ${startOfFeb.toISOString()}`);
    console.log(`End: ${endOfFeb.toISOString()}`);
    console.log('');
    
    const febTransactions = await Transaction.find({
      userId: user._id,
      type: 'expense',
      date: { $gte: startOfFeb, $lte: endOfFeb }
    }).sort({ date: -1 });
    
    console.log(`💸 FEBRUARY 2026 EXPENSE TRANSACTIONS: ${febTransactions.length}`);
    console.log('');
    
    if (febTransactions.length > 0) {
      let total = 0;
      febTransactions.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.date.toLocaleDateString()} - ${t.category} - ₹${t.amount}`);
        total += t.amount;
      });
      console.log('');
      console.log(`✅ TOTAL FEBRUARY EXPENSES: ₹${total.toFixed(2)}`);
    } else {
      console.log('❌ NO TRANSACTIONS FOUND!');
      console.log('');
      console.log('Checking raw data...');
      
      // Check with different query
      const rawCheck = await Transaction.find({
        userId: user._id
      }).sort({ date: -1 }).limit(10);
      
      console.log(`\nRecent transactions (any date):`);
      rawCheck.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.date.toISOString()} - ${t.type} - ${t.category} - ₹${t.amount}`);
      });
    }
    
    // Try aggregate query
    console.log('\n🔬 AGGREGATE QUERY TEST:');
    const aggResult = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(user._id.toString()),
          type: 'expense',
          date: { $gte: startOfFeb, $lte: endOfFeb }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Aggregate Result:', aggResult);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnosticCheck();
