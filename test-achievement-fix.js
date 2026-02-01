/**
 * Test Achievement Fix - Verify NO BUDGET = NO STAR rule
 * 
 * This script tests that users without budgets do NOT receive achievements
 */

const mongoose = require('mongoose');

// MongoDB connection
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
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

async function testAchievementFix() {
  try {
    console.log('\n🔍 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test user from the problem report
    const testEmail = 'gsribarath@gmail.com';
    
    console.log(`📧 Testing user: ${testEmail}`);
    console.log('─'.repeat(60));

    // Find user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log(`⚠️  User ${testEmail} not found in database`);
      console.log('\nTesting with ALL users instead...\n');
      
      // Test all users
      const allUsers = await User.find({});
      
      for (const testUser of allUsers) {
        await validateUserAchievements(testUser);
      }
    } else {
      await validateUserAchievements(user);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ACHIEVEMENT VALIDATION COMPLETE');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function validateUserAchievements(user) {
  console.log(`\n👤 User: ${user.email}`);
  console.log('─'.repeat(60));

  // Check if user has any budgets
  const budgets = await Budget.find({ 
    userId: user._id,
    period: 'monthly' 
  });

  console.log(`💰 Budgets found: ${budgets.length}`);
  
  if (budgets.length > 0) {
    budgets.forEach(budget => {
      console.log(`   - Budget: ₹${budget.totalBudget} (Active: ${budget.isActive})`);
      console.log(`     Created: ${budget.createdAt.toISOString().split('T')[0]}`);
    });
  }

  // Check achievements
  const achievements = await Achievement.find({ 
    userId: user._id,
    email: user.email 
  });

  console.log(`⭐ Achievements found: ${achievements.length}`);

  if (achievements.length === 0) {
    console.log('   ✅ CORRECT: No achievements (user has no/insufficient budget)');
    return;
  }

  // Validate each achievement
  let invalidCount = 0;
  let validCount = 0;

  for (const achievement of achievements) {
    const endOfMonth = new Date(achievement.year, achievement.month, 0, 23, 59, 59);
    
    // Check if budget existed for that month
    const monthBudget = await Budget.findOne({
      userId: user._id,
      period: 'monthly',
      createdAt: { $lte: endOfMonth },
    });
// Check if user actually tracked expenses (used the app)
    const startOfMonth = new Date(achievement.year, achievement.month - 1, 1);
    const monthEndDate = new Date(achievement.year, achievement.month, 0, 23, 59, 59);
    const transactionCount = await Transaction.countDocuments({
      userId: user._id,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: monthEndDate },
    });

    const isValid = monthBudget && 
                    monthBudget.totalBudget > 0 && 
                    achievement.totalExpenses <= monthBudget.totalBudget &&
                    transactionCount > 0; // 🚫 MUST have tracked expenses

    if (isValid) {
      validCount++;
      console.log(`   ✅ VALID: ${getMonthName(achievement.month)} ${achievement.year}`);
      console.log(`      Budget: ₹${monthBudget.totalBudget}, Spent: ₹${achievement.totalExpenses}`);
      console.log(`      Transactions tracked: ${transactionCount}`);
    } else {
      invalidCount++;
      console.log(`   ❌ INVALID: ${getMonthName(achievement.month)} ${achievement.year}`);
      
      if (!monthBudget || monthBudget.totalBudget <= 0) {
        console.log(`      Reason: NO BUDGET EXISTS for this month`);
      } else if (transactionCount === 0) {
        console.log(`      Reason: NO APP USAGE - User did not track any expenses`);
      } else {
        console.log(`      Reason: Budget exceeded (₹${achievement.totalExpenses} > ₹${monthBudget.totalBudget})`);
      }

      // DELETE INVALID ACHIEVEMENT
      console.log(`      🗑️  Deleting invalid achievement...`);
      await Achievement.deleteOne({ _id: achievement._id });
      console.log(`      ✅ Deleted`);
    }
  }

  console.log(`\n📊 Summary for ${user.email}:`);
  console.log(`   Valid achievements: ${validCount}`);
  console.log(`   Invalid achievements removed: ${invalidCount}`);
  
  if (invalidCount > 0) {
    console.log(`   ⚠️  ACTION: ${invalidCount} invalid achievement(s) were DELETED`);
  }
}

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || `Month ${month}`;
}

// Run the test
testAchievementFix();
