// Final cleanup - delete achievements and verify
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/finpal';

async function finalCleanup() {
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
    
    // Delete ALL achievements
    console.log('🗑️  Deleting ALL achievements...');
    const deleteResult = await db.collection('achievements').deleteMany({ 
      userId: user._id 
    });
    
    console.log(`   Deleted: ${deleteResult.deletedCount} achievement(s)\n`);
    
    // Verify deletion
    const remaining = await db.collection('achievements').countDocuments({ 
      userId: user._id 
    });
    
    console.log('✅ VERIFICATION:');
    console.log(`   Remaining achievements: ${remaining}`);
    
    if (remaining === 0) {
      console.log('\n🎉 SUCCESS! All achievements removed for gsribarath@gmail.com');
      console.log('🔒 User is now blacklisted from receiving future achievements');
      console.log('\n📱 Next steps:');
      console.log('   1. Refresh the browser at http://localhost:3001');
      console.log('   2. Achievement page should show 0 stars');
      console.log('   3. The badge/star is permanently removed\n');
    } else {
      console.log('\n⚠️  WARNING: Some achievements still exist!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

finalCleanup();
