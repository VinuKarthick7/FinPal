/**
 * Manually restore star for gsribarath@gmail.com for January 2026
 * User confirmed to have passed budget correctly
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  month: Number,
  year: Number,
  budgetAmount: Number,
  totalExpenses: Number,
  status: String,
  achievementType: String,
  earnedAt: Date,
  metadata: {
    savingsAmount: Number,
    budgetUtilization: Number,
    message: String,
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const User = mongoose.model('User', userSchema);

async function restoreStar() {
  try {
    console.log('\n🔧 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const email = 'gsribarath@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log(`  RESTORING STAR FOR: ${email}`);
    console.log('════════════════════════════════════════════════════════════\n');

    // Create achievement for January 2026
    // You confirmed they passed correctly, so awarding the star
    const achievement = await Achievement.findOneAndUpdate(
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
        budgetAmount: 1, // Placeholder - will be validated on next login
        totalExpenses: 0, // Placeholder
        status: 'awarded',
        achievementType: 'budget_success',
        earnedAt: new Date(2026, 1, 1),
        metadata: {
          savingsAmount: 1,
          budgetUtilization: 0,
          message: 'Great job! You managed your budget well this month ⭐'
        }
      },
      { upsert: true, new: true }
    );

    console.log('✅ STAR RESTORED FOR JANUARY 2026!');
    console.log(`\n   User: ${email}`);
    console.log(`   Month: January 2026`);
    console.log(`   Status: ${achievement.status}`);
    console.log(`   Achievement ID: ${achievement._id}`);
    
    console.log('\n⭐ gsribarath@gmail.com now has 1 star for January 2026!');
    console.log('\n════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

restoreStar();
