/**
 * Complete account details check for gsribarath@gmail.com
 * After budget query fix - should show USER-SPECIFIC data
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

// Define schemas
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  createdAt: Date,
}, { timestamps: true });

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  month: Number,
  year: Number,
  totalBudget: Number,
  totalSpent: Number,
  categoryBudgets: Array,
  alertThreshold: Number,
  createdAt: Date,
  updatedAt: Date,
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  amount: Number,
  category: String,
  merchant: String,
  date: Date,
  createdAt: Date,
}, { timestamps: true });

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  month: Number,
  year: Number,
  budgetAmount: Number,
  totalExpenses: Number,
  status: String,
  earnedAt: Date,
  metadata: {
    savingsAmount: Number,
    budgetUtilization: Number,
    message: String,
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Achievement = mongoose.model('Achievement', achievementSchema);

async function checkAccount() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'gsribarath@gmail.com';
    
    console.log('═'.repeat(80));
    console.log(`🔍 COMPLETE ACCOUNT DETAILS: ${email}`);
    console.log('═'.repeat(80));

    // 1. USER INFO
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('\n👤 USER INFORMATION:');
    console.log('─'.repeat(80));
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}`);

    // 2. ALL BUDGETS (User-specific by month/year)
    console.log('\n💰 BUDGETS (USER-SPECIFIC BY MONTH/YEAR):');
    console.log('─'.repeat(80));
    
    const allBudgets = await Budget.find({ user: user._id }).sort({ year: -1, month: -1 });
    
    if (allBudgets.length === 0) {
      console.log('   ❌ No budgets found for this user');
    } else {
      console.log(`   Total Budgets: ${allBudgets.length}\n`);
      allBudgets.forEach((budget, i) => {
        console.log(`   Budget #${i + 1}:`);
        console.log(`     Month/Year: ${budget.month}/${budget.year}`);
        console.log(`     Total Budget: ₹${budget.totalBudget}`);
        console.log(`     Total Spent: ₹${budget.totalSpent}`);
        console.log(`     Alert Threshold: ${budget.alertThreshold}%`);
        console.log(`     Categories: ${budget.categoryBudgets?.length || 0}`);
        console.log(`     Created: ${budget.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // 3. JANUARY 2026 SPECIFIC CHECK
    console.log('\n📅 JANUARY 2026 SPECIFIC DATA:');
    console.log('─'.repeat(80));
    
    const jan2026Budget = await Budget.findOne({
      user: user._id,
      month: 1,
      year: 2026
    });

    if (jan2026Budget) {
      console.log(`   ✅ Budget Found:`);
      console.log(`      Amount: ₹${jan2026Budget.totalBudget}`);
      console.log(`      Spent: ₹${jan2026Budget.totalSpent}`);
      console.log(`      Created: ${jan2026Budget.createdAt.toLocaleString()}`);
    } else {
      console.log('   ❌ No budget set for January 2026');
    }

    // Get Jan 2026 transactions
    const startOfJan = new Date(2026, 0, 1);
    const endOfJan = new Date(2026, 0, 31, 23, 59, 59);

    const jan2026Transactions = await Transaction.find({
      user: user._id,
      type: 'expense',
      date: { $gte: startOfJan, $lte: endOfJan }
    }).sort({ date: -1 });

    console.log(`\n   📝 Transactions: ${jan2026Transactions.length}`);
    
    if (jan2026Transactions.length > 0) {
      let totalExpenses = 0;
      jan2026Transactions.forEach((t, i) => {
        totalExpenses += t.amount;
        console.log(`      ${i + 1}. ${t.merchant}: ₹${t.amount} (${t.category})`);
        console.log(`         Date: ${t.date.toLocaleString()}`);
      });
      console.log(`\n   💵 Total Expenses: ₹${totalExpenses}`);
      
      if (jan2026Budget) {
        const remaining = jan2026Budget.totalBudget - totalExpenses;
        const utilization = ((totalExpenses / jan2026Budget.totalBudget) * 100).toFixed(1);
        console.log(`   💰 Remaining Budget: ₹${remaining}`);
        console.log(`   📊 Utilization: ${utilization}%`);
        console.log(`   ${totalExpenses <= jan2026Budget.totalBudget ? '✅ WITHIN BUDGET' : '❌ EXCEEDED BUDGET'}`);
      }
    } else {
      console.log('      No expense transactions found');
    }

    // 4. ALL TRANSACTIONS
    console.log('\n\n📝 ALL TRANSACTIONS:');
    console.log('─'.repeat(80));
    
    const allTransactions = await Transaction.find({ user: user._id }).sort({ date: -1 }).limit(20);
    
    if (allTransactions.length === 0) {
      console.log('   No transactions found');
    } else {
      console.log(`   Total Transactions: ${allTransactions.length} (showing last 20)\n`);
      
      const monthGroups = {};
      allTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthGroups[monthYear]) monthGroups[monthYear] = [];
        monthGroups[monthYear].push(t);
      });

      Object.keys(monthGroups).forEach(monthYear => {
        const txs = monthGroups[monthYear];
        const total = txs.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
        console.log(`   ${monthYear}: ${txs.length} transactions, ₹${total} total`);
        txs.forEach(t => {
          console.log(`      - ${t.merchant}: ₹${t.amount} (${t.type})`);
        });
        console.log('');
      });
    }

    // 5. ACHIEVEMENTS
    console.log('\n⭐ ACHIEVEMENTS:');
    console.log('─'.repeat(80));
    
    const achievements = await Achievement.find({ 
      userId: user._id,
      email: email 
    }).sort({ year: -1, month: -1 });

    if (achievements.length === 0) {
      console.log('   No achievements found');
    } else {
      console.log(`   Total Stars: ${achievements.length}\n`);
      achievements.forEach((ach, i) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log(`   ⭐ ${i + 1}. ${monthNames[ach.month - 1]} ${ach.year}`);
        console.log(`      Budget: ₹${ach.budgetAmount}`);
        console.log(`      Spent: ₹${ach.totalExpenses}`);
        console.log(`      Saved: ₹${ach.budgetAmount - ach.totalExpenses}`);
        console.log(`      Status: ${ach.status}`);
        console.log(`      Earned: ${ach.earnedAt?.toLocaleString() || 'N/A'}`);
        if (ach.metadata?.message) {
          console.log(`      Message: ${ach.metadata.message}`);
        }
        console.log('');
      });
    }

    // 6. SUMMARY
    console.log('\n📊 ACCOUNT SUMMARY:');
    console.log('═'.repeat(80));
    console.log(`   Email: ${email}`);
    console.log(`   Total Budgets: ${allBudgets.length}`);
    console.log(`   Total Transactions: ${allTransactions.length}`);
    console.log(`   Total Achievements: ${achievements.length}`);
    console.log(`   Account Age: ${Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
    
    console.log('\n✅ Check complete!');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAccount();
