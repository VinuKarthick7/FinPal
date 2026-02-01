/**
 * Deep verification for gsribarath@gmail.com
 * Check if they actually have budget and transactions for January 2026
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

// Define schemas
const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  month: Number,
  year: Number,
  budgetAmount: Number,
  totalExpenses: Number,
  status: String,
  earnedAt: Date,
}, { timestamps: true });

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  period: String,
  totalBudget: Number,
  isActive: Boolean,
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  amount: Number,
  date: Date,
  category: String,
  description: String,
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

async function verifyUser() {
  try {
    console.log('\n🔍 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const testEmail = 'gsribarath@gmail.com';
    
    console.log('════════════════════════════════════════════════════════════');
    console.log(`  DETAILED VERIFICATION: ${testEmail}`);
    console.log('════════════════════════════════════════════════════════════\n');

    // Find user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log(`❌ User ${testEmail} not found in database`);
      return;
    }

    console.log(`👤 User Found: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user._id}\n`);

    // Check ALL budgets
    console.log('─'.repeat(60));
    console.log('💰 BUDGET CHECK:');
    console.log('─'.repeat(60));
    
    const allBudgets = await Budget.find({ userId: user._id });
    console.log(`Total budgets: ${allBudgets.length}`);
    
    if (allBudgets.length > 0) {
      allBudgets.forEach((budget, i) => {
        console.log(`\n  Budget #${i + 1}:`);
        console.log(`    Amount: ₹${budget.totalBudget}`);
        console.log(`    Period: ${budget.period}`);
        console.log(`    Active: ${budget.isActive}`);
        console.log(`    Created: ${budget.createdAt}`);
      });
    } else {
      console.log('  ❌ No budgets found');
    }

    // Check January 2026 transactions
    console.log('\n' + '─'.repeat(60));
    console.log('📝 JANUARY 2026 TRANSACTIONS:');
    console.log('─'.repeat(60));
    
    const janStart = new Date(2026, 0, 1); // January 1, 2026
    const janEnd = new Date(2026, 0, 31, 23, 59, 59); // January 31, 2026
    
    const janTransactions = await Transaction.find({
      userId: user._id,
      type: 'expense',
      date: { $gte: janStart, $lte: janEnd }
    }).sort({ date: 1 });

    console.log(`Total expense transactions in January 2026: ${janTransactions.length}`);
    
    if (janTransactions.length > 0) {
      let totalExpenses = 0;
      console.log('\n  Transactions:');
      janTransactions.forEach((txn, i) => {
        totalExpenses += txn.amount;
        console.log(`    ${i + 1}. ${txn.date.toISOString().split('T')[0]} - ₹${txn.amount} - ${txn.category || 'N/A'} - ${txn.description || 'N/A'}`);
      });
      console.log(`\n  📊 Total Spent in January 2026: ₹${totalExpenses}`);
    } else {
      console.log('  ❌ No transactions found in January 2026');
    }

    // Check achievements
    console.log('\n' + '─'.repeat(60));
    console.log('⭐ ACHIEVEMENTS:');
    console.log('─'.repeat(60));
    
    const achievements = await Achievement.find({ userId: user._id });
    console.log(`Total achievements: ${achievements.length}`);
    
    if (achievements.length > 0) {
      achievements.forEach((ach) => {
        console.log(`\n  ${ach.month}/${ach.year}:`);
        console.log(`    Budget: ₹${ach.budgetAmount}`);
        console.log(`    Spent: ₹${ach.totalExpenses}`);
        console.log(`    Status: ${ach.status}`);
        console.log(`    Earned: ${ach.earnedAt}`);
      });
    } else {
      console.log('  ❌ No achievements found');
    }

    // DECISION
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 VERDICT:');
    console.log('═'.repeat(60));

    if (allBudgets.length > 0 && janTransactions.length > 0) {
      const budget = allBudgets[0];
      const totalExpenses = janTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      console.log(`\n✅ Budget exists: ₹${budget.totalBudget}`);
      console.log(`✅ Transactions tracked: ${janTransactions.length}`);
      console.log(`✅ Total spent: ₹${totalExpenses}`);
      
      if (totalExpenses <= budget.totalBudget) {
        console.log(`✅ STAYED WITHIN BUDGET!`);
        console.log('\n🏆 USER DESERVES STAR FOR JANUARY 2026!');
        console.log('\n🔧 Restoring achievement...\n');
        
        // Restore achievement
        const restored = await Achievement.findOneAndUpdate(
          { 
            userId: user._id, 
            email: user.email,
            month: 1, 
            year: 2026 
          },
          {
            userId: user._id,
            email: user.email,
            month: 1,
            year: 2026,
            budgetAmount: budget.totalBudget,
            totalExpenses: totalExpenses,
            status: 'awarded',
            earnedAt: new Date(2026, 1, 1), // Feb 1, 2026
          },
          { upsert: true, new: true }
        );
        
        console.log('✅ ACHIEVEMENT RESTORED!');
        console.log(`   Month: January 2026`);
        console.log(`   Budget: ₹${restored.budgetAmount}`);
        console.log(`   Spent: ₹${restored.totalExpenses}`);
        console.log(`   Saved: ₹${restored.budgetAmount - restored.totalExpenses}`);
        
      } else {
        console.log(`❌ EXCEEDED BUDGET (₹${totalExpenses} > ₹${budget.totalBudget})`);
        console.log('\n❌ NO STAR - Budget exceeded');
      }
    } else {
      console.log('\n❌ CANNOT AWARD STAR:');
      if (allBudgets.length === 0) console.log('   - No budget set');
      if (janTransactions.length === 0) console.log('   - No transactions tracked (no app usage)');
    }

    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyUser();
