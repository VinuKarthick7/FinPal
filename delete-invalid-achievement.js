// Direct MongoDB cleanup script
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/finpal';

async function deleteInvalidAchievement() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    
    // Find user
    const user = await db.collection('users').findOne({ email: 'gsribarath@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   User ID: ${user._id}\n`);
    
    // Find achievement
    const achievement = await db.collection('achievements').findOne({
      userId: user._id,
      month: 1,
      year: 2026
    });
    
    if (!achievement) {
      console.log('ℹ️  No achievement found for January 2026');
      process.exit(0);
    }
    
    console.log('📊 Achievement Details:');
    console.log(`   Month/Year: ${achievement.month}/${achievement.year}`);
    console.log(`   Budget (stored): ₹${achievement.budgetAmount}`);
    console.log(`   Spent (stored): ₹${achievement.totalExpenses}`);
    console.log(`   Exceeded: ₹${achievement.totalExpenses - achievement.budgetAmount}`);
    console.log(`   Formula: ${achievement.totalExpenses} <= ${achievement.budgetAmount} = ${achievement.totalExpenses <= achievement.budgetAmount}`);
    
    // Check current budget status
    const currentBudget = await db.collection('budgets').findOne({
      userId: user._id,
      isActive: true
    });
    
    // Count current transactions for Jan 2026
    const startOfJan = new Date(2026, 0, 1);
    const endOfJan = new Date(2026, 1, 0, 23, 59, 59);
    const transactionCount = await db.collection('transactions').countDocuments({
      userId: user._id,
      type: 'expense',
      date: { $gte: startOfJan, $lte: endOfJan }
    });
    
    console.log(`\n🔍 Current Status:`);
    console.log(`   Active Budget: ${currentBudget ? '₹' + currentBudget.totalBudget : 'NONE'}`);
    console.log(`   Jan 2026 Transactions: ${transactionCount}`);
    
    // Delete if no active budget OR if exceeded budget
    const shouldDelete = !currentBudget || achievement.totalExpenses > achievement.budgetAmount;
    
    if (shouldDelete) {
      console.log(`\n❌ INVALID - ${!currentBudget ? 'No active budget' : 'User exceeded budget'}!`);
      console.log('🗑️  Deleting achievement...\n');
      
      const result = await db.collection('achievements').deleteOne({ _id: achievement._id });
      
      if (result.deletedCount > 0) {
        console.log('✅ SUCCESS! Deleted 1 invalid achievement');
        console.log('\n📱 Action required:');
        console.log('   1. Refresh your FinPal page in the browser');
        console.log('   2. Achievement page should now show 0 stars\n');
      } else {
        console.log('⚠️  Delete failed - no documents deleted\n');
      }
    } else {
      console.log(`\n✅ VALID - User stayed within budget`);
      console.log('   No action needed\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

deleteInvalidAchievement();
