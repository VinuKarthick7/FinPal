import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

async function deleteFebruaryAchievement() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    console.log('\n🗑️ Deleting premature February 2026 achievement...\n');
    
    const result = await Achievement.deleteMany({
      month: 2,
      year: 2026
    });
    
    console.log(`✅ Deleted ${result.deletedCount} achievement(s) for February 2026`);
    console.log('💡 Achievement will be properly awarded on March 1, 2026 at 12:01 AM\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteFebruaryAchievement();
