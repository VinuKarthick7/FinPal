const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/finpal');

const achievementSchema = new mongoose.Schema({}, { strict: false });
const Achievement = mongoose.model('Achievement', achievementSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    console.log('🔍 Checking ahiruthik20@gmail.com...\n');
    
    // Find user
    const user = await User.findOne({ email: 'ahiruthik20@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(0);
    }
    
    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Verified: ${user.isVerified}`);
    
    // Check achievements
    console.log('\n⭐ Checking achievements...\n');
    const achievements = await Achievement.find({ 
      $or: [
        { userId: user._id },
        { email: 'ahiruthik20@gmail.com' }
      ]
    });
    
    if (achievements.length === 0) {
      console.log('✅ CORRECT: No achievements found (new user should have 0 stars)');
    } else {
      console.log(`❌ PROBLEM: Found ${achievements.length} achievement(s)!`);
      achievements.forEach((ach, i) => {
        console.log(`\n   Achievement ${i + 1}:`);
        console.log(`   Month/Year: ${ach.month}/${ach.year}`);
        console.log(`   Status: ${ach.status}`);
        console.log(`   Budget: ${ach.budgetAmount}`);
        console.log(`   Expenses: ${ach.totalExpenses}`);
        console.log(`   Created: ${ach.createdAt}`);
        console.log(`   Earned: ${ach.earnedAt}`);
        console.log(`   ID: ${ach._id}`);
      });
      
      console.log('\n\n❌ DELETING THESE INVALID ACHIEVEMENTS...');
      const result = await Achievement.deleteMany({ userId: user._id });
      console.log(`✅ Deleted ${result.deletedCount} achievement(s)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
