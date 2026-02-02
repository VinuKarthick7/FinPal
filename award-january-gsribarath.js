/**
 * Award January 2026 achievement to gsribarath@gmail.com
 * User EARNED it: ₹2,400 spent ≤ ₹2,650 budget with 3 transactions
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
}, { timestamps: true });

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  month: Number,
  year: Number,
  totalBudget: Number,
  totalSpent: Number,
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  amount: Number,
  date: Date,
}, { timestamps: true });

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  month: Number,
  year: Number,
  budgetAmount: Number,
  totalExpenses: Number,
  achievementType: String,
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

async function awardJanuaryStar() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'gsribarath@gmail.com';
    const month = 1;
    const year = 2026;

    console.log(`🔍 Processing achievement for ${email} - ${month}/${year}\n`);

    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    // Get budget for January 2026
    const budget = await Budget.findOne({
      user: user._id,
      month: month,
      year: year,
    });

    if (!budget) {
      console.log('❌ No budget found for January 2026');
      return;
    }

    console.log(`💰 Budget: ₹${budget.totalBudget}`);

    // Calculate expenses for January 2026
    const startOfMonth = new Date(2026, 0, 1);
    const endOfMonth = new Date(2026, 0, 31, 23, 59, 59);

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
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const totalExpenses = transactions[0]?.totalExpenses || 0;
    const transactionCount = transactions[0]?.transactionCount || 0;
    const budgetAmount = budget.totalBudget;

    console.log(`💵 Total Expenses: ₹${totalExpenses}`);
    console.log(`📝 Transactions: ${transactionCount}`);

    // Check eligibility
    if (transactionCount === 0) {
      console.log('❌ No transactions - cannot award achievement');
      return;
    }

    if (totalExpenses > budgetAmount) {
      console.log(`❌ Exceeded budget (₹${totalExpenses} > ₹${budgetAmount})`);
      return;
    }

    const savingsAmount = budgetAmount - totalExpenses;
    const budgetUtilization = (totalExpenses / budgetAmount) * 100;

    console.log(`✅ ELIGIBLE! Saved ₹${savingsAmount} (${budgetUtilization.toFixed(1)}% utilization)\n`);

    // Check if achievement already exists
    const existing = await Achievement.findOne({
      userId: user._id,
      month: month,
      year: year,
    });

    if (existing) {
      console.log('⚠️  Achievement already exists:');
      console.log(`   Status: ${existing.status}`);
      console.log(`   Budget: ₹${existing.budgetAmount}`);
      console.log(`   Spent: ₹${existing.totalExpenses}`);
      console.log('\n   Updating to ensure correct data...\n');
    }

    // Create or update achievement
    const achievement = await Achievement.findOneAndUpdate(
      { userId: user._id, month: month, year: year },
      {
        userId: user._id,
        email: email,
        month: month,
        year: year,
        budgetAmount: budgetAmount,
        totalExpenses: totalExpenses,
        achievementType: 'budget_success',
        status: 'awarded',
        earnedAt: new Date(2026, 0, 31, 23, 59, 59), // End of January
        metadata: {
          savingsAmount: savingsAmount,
          budgetUtilization: Math.round(budgetUtilization),
          message: 'Great job! You managed your budget well this month ⭐',
        },
      },
      { upsert: true, new: true }
    );

    console.log('═'.repeat(60));
    console.log('⭐ ACHIEVEMENT AWARDED!');
    console.log('═'.repeat(60));
    console.log(`   User: ${email}`);
    console.log(`   Month: January 2026`);
    console.log(`   Budget: ₹${budgetAmount}`);
    console.log(`   Spent: ₹${totalExpenses}`);
    console.log(`   Saved: ₹${savingsAmount}`);
    console.log(`   Utilization: ${budgetUtilization.toFixed(1)}%`);
    console.log(`   Status: ${achievement.status}`);
    console.log(`   Message: ${achievement.metadata.message}`);
    console.log('═'.repeat(60));
    console.log('\n✅ Star awarded successfully! Refresh the app to see it.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

awardJanuaryStar();
