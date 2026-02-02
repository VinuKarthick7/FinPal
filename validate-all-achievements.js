const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/finpal');

const achievementSchema = new mongoose.Schema({}, { strict: false });
const Achievement = mongoose.model('Achievement', achievementSchema);

const budgetSchema = new mongoose.Schema({}, { strict: false });
const Budget = mongoose.model('Budget', budgetSchema);

const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function validateAllUsers() {
  try {
    console.log('🔍 Checking ALL users for invalid achievements...\n');
    console.log('=' .repeat(70));
    
    const users = await User.find({});
    console.log(`\n📊 Total users: ${users.length}\n`);
    
    let totalInvalidAchievements = 0;
    let usersWithInvalidAchievements = 0;
    
    for (const user of users) {
      const achievements = await Achievement.find({ userId: user._id });
      
      if (achievements.length === 0) continue;
      
      console.log(`\n👤 User: ${user.email}`);
      console.log('─'.repeat(70));
      
      const budgets = await Budget.find({ userId: user._id, period: 'monthly' });
      console.log(`   💰 Budgets: ${budgets.length}`);
      
      let invalidCount = 0;
      
      for (const ach of achievements) {
        const startOfMonth = new Date(ach.year, ach.month - 1, 1);
        const endOfMonth = new Date(ach.year, ach.month, 0, 23, 59, 59);
        
        // Check transaction count
        const transactionCount = await Transaction.countDocuments({
          userId: user._id,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        });
        
        // Check if budget existed
        const budget = await Budget.findOne({
          userId: user._id,
          period: 'monthly',
          createdAt: { $lte: endOfMonth },
        });
        
        const isInvalid = !budget || budget.totalBudget <= 0 || transactionCount === 0 || ach.totalExpenses > (budget?.totalBudget || 0);
        
        if (isInvalid) {
          invalidCount++;
          console.log(`   ❌ INVALID Achievement ${ach.month}/${ach.year}:`);
          console.log(`      - Transactions: ${transactionCount}`);
          console.log(`      - Budget exists: ${budget ? 'Yes (₹' + budget.totalBudget + ')' : 'No'}`);
          console.log(`      - Expenses: ₹${ach.totalExpenses}`);
          console.log(`      - Reason: ${!budget ? 'No budget' : transactionCount === 0 ? 'No app usage' : 'Budget exceeded'}`);
        }
      }
      
      if (invalidCount > 0) {
        usersWithInvalidAchievements++;
        totalInvalidAchievements += invalidCount;
        
        console.log(`\n   🗑️  Deleting ${invalidCount} invalid achievement(s)...`);
        await Achievement.deleteMany({
          userId: user._id,
          $or: [
            // No budget check - delete all achievements where user had no budget
            { budgetAmount: { $lte: 0 } },
          ]
        });
        
        // Additional check for 0 transactions
        for (const ach of achievements) {
          const startOfMonth = new Date(ach.year, ach.month - 1, 1);
          const endOfMonth = new Date(ach.year, ach.month, 0, 23, 59, 59);
          
          const transactionCount = await Transaction.countDocuments({
            userId: user._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          });
          
          if (transactionCount === 0) {
            await Achievement.deleteOne({ _id: ach._id });
          }
        }
        
        console.log(`   ✅ Cleanup complete for ${user.email}`);
      } else {
        console.log(`   ✅ All achievements valid (${achievements.length})`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`   Total users checked: ${users.length}`);
    console.log(`   Users with invalid achievements: ${usersWithInvalidAchievements}`);
    console.log(`   Total invalid achievements found: ${totalInvalidAchievements}`);
    console.log('\n✅ Validation complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

validateAllUsers();
