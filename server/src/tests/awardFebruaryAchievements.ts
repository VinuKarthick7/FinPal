import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import { achievementScheduler } from '../utils/achievementScheduler';

/**
 * Award February 2026 Achievements
 */

async function awardFebruaryAchievements() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    console.log('\n🎯 Awarding February 2026 Achievements...\n');
    
    await achievementScheduler.checkAllUsersAchievements(2, 2026);
    
    console.log('\n✅ Achievement check complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

awardFebruaryAchievements();
