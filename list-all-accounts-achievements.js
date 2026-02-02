/**
 * List all accounts categorized by achievement status
 * Shows who has stars and who doesn't
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

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

async function listAllAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(80));
    console.log('📊 ALL ACCOUNTS - ACHIEVEMENT STATUS');
    console.log('═'.repeat(80));

    // Get all users
    const users = await User.find({}).sort({ email: 1 });
    console.log(`\nTotal Accounts: ${users.length}\n`);

    const withStars = [];
    const withoutStars = [];

    for (const user of users) {
      // Get achievements
      const achievements = await Achievement.find({
        userId: user._id,
        status: { $in: ['awarded', 'finalized'] }
      }).sort({ year: -1, month: -1 });

      // Get budgets
      const budgets = await Budget.find({ user: user._id });

      // Get transactions
      const transactionCount = await Transaction.countDocuments({ user: user._id });

      const userInfo = {
        email: user.email,
        name: user.name || 'N/A',
        userId: user._id.toString(),
        achievements: achievements.length,
        achievementDetails: achievements,
        budgets: budgets.length,
        transactions: transactionCount,
        createdAt: user.createdAt
      };

      if (achievements.length > 0) {
        withStars.push(userInfo);
      } else {
        withoutStars.push(userInfo);
      }
    }

    // Display accounts WITH stars
    console.log('═'.repeat(80));
    console.log(`⭐ ACCOUNTS WITH STARS (${withStars.length})`);
    console.log('═'.repeat(80));

    if (withStars.length === 0) {
      console.log('   No accounts with achievements\n');
    } else {
      withStars.forEach((user, i) => {
        console.log(`\n${i + 1}. ${user.email}`);
        console.log(`   User ID: ${user.userId}`);
        console.log(`   Total Stars: ⭐ ${user.achievements}`);
        console.log(`   Budgets: ${user.budgets} | Transactions: ${user.transactions}`);
        console.log(`   Account Age: ${Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
        
        if (user.achievementDetails.length > 0) {
          console.log('   Achievements:');
          user.achievementDetails.forEach(ach => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            console.log(`      ⭐ ${monthNames[ach.month - 1]} ${ach.year}: ₹${ach.totalExpenses}/₹${ach.budgetAmount} (${ach.status})`);
          });
        }
      });
    }

    // Display accounts WITHOUT stars
    console.log('\n\n═'.repeat(80));
    console.log(`❌ ACCOUNTS WITHOUT STARS (${withoutStars.length})`);
    console.log('═'.repeat(80));

    if (withoutStars.length === 0) {
      console.log('   All accounts have achievements!\n');
    } else {
      for (const user of withoutStars) {
        const idx = withoutStars.indexOf(user);
        console.log(`\n${idx + 1}. ${user.email}`);
        console.log(`   User ID: ${user.userId}`);
        console.log(`   Stars: 0`);
        console.log(`   Budgets: ${user.budgets} | Transactions: ${user.transactions}`);
        console.log(`   Account Age: ${Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
        
        // Check if eligible for January 2026
        const jan2026Budget = await Budget.findOne({
          user: user.userId,
          month: 1,
          year: 2026
        });

        if (jan2026Budget) {
          const startOfJan = new Date(2026, 0, 1);
          const endOfJan = new Date(2026, 0, 31, 23, 59, 59);

          const jan2026Transactions = await Transaction.aggregate([
            {
              $match: {
                user: new mongoose.Types.ObjectId(user.userId),
                type: 'expense',
                date: { $gte: startOfJan, $lte: endOfJan }
              }
            },
            {
              $group: {
                _id: null,
                totalExpenses: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            }
          ]);

          const totalExpenses = jan2026Transactions[0]?.totalExpenses || 0;
          const txCount = jan2026Transactions[0]?.count || 0;

          console.log(`   Jan 2026: Budget ₹${jan2026Budget.totalBudget}, Spent ₹${totalExpenses}, Txs: ${txCount}`);
          
          if (txCount > 0 && totalExpenses <= jan2026Budget.totalBudget) {
            console.log(`   ⚠️  ELIGIBLE for Jan 2026 star! (${totalExpenses} ≤ ${jan2026Budget.totalBudget})`);
          } else if (txCount === 0) {
            console.log(`   ❌ No app usage (0 transactions)`);
          } else if (totalExpenses > jan2026Budget.totalBudget) {
            console.log(`   ❌ Exceeded budget (₹${totalExpenses} > ₹${jan2026Budget.totalBudget})`);
          }
        }
      }
    }

    console.log('\n\n═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Accounts: ${users.length}`);
    console.log(`With Stars: ${withStars.length} (${((withStars.length / users.length) * 100).toFixed(1)}%)`);
    console.log(`Without Stars: ${withoutStars.length} (${((withoutStars.length / users.length) * 100).toFixed(1)}%)`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

listAllAccounts();
