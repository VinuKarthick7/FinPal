// Force delete ALL achievements for barathgobi2007@gmail.com
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/finpal';

async function forceDeleteAllAchievements() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    
    // Find user
    const user = await db.collection('users').findOne({ email: 'barathgobi2007@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   User ID: ${user._id}\n`);
    
    // Find ALL achievements for this user
    const achievements = await db.collection('achievements').find({
      userId: user._id
    }).toArray();
    
    console.log(`📊 Found ${achievements.length} achievement(s) for this user:`);
    achievements.forEach(a => {
      console.log(`   - ${a.month}/${a.year}: Budget ₹${a.budgetAmount}, Spent ₹${a.totalExpenses}`);
    });
    
    if (achievements.length === 0) {
      console.log('\nℹ️  No achievements to delete');
      process.exit(0);
    }
    
    // Delete ALL achievements
    console.log('\n🗑️  Deleting ALL achievements...\n');
    
    const result = await db.collection('achievements').deleteMany({ 
      userId: user._id 
    });
    
    if (result.deletedCount > 0) {
      console.log(`✅ SUCCESS! Deleted ${result.deletedCount} achievement(s)`);
      console.log('\n📱 Action required:');
      console.log('   1. Refresh your FinPal page in the browser');
      console.log('   2. Achievement page should now show 0 stars');
      console.log('   3. The badge/star should be removed\n');
    } else {
      console.log('⚠️  Delete failed - no documents deleted\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

forceDeleteAllAchievements();
