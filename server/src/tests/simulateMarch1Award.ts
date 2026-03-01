import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import { achievementScheduler } from '../utils/achievementScheduler';
import Achievement from '../models/Achievement';

/**
 * SIMULATION: What happens on March 1, 2026 at 12:01 AM
 * This simulates the automatic achievement award process
 */

async function simulateMarch1Award() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  SIMULATION: March 1, 2026 at 12:01 AM                ║');
    console.log('║  Automated Achievement Award Process                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📅 Current Date: March 1, 2026');
    console.log('⏰ Time: 12:01 AM');
    console.log('🎯 Action: Award achievements for February 2026 (completed month)');
    console.log('');
    
    // Check if any achievement exists for February 2026
    const existingAchievements = await Achievement.find({
      month: 2,
      year: 2026
    });
    
    if (existingAchievements.length > 0) {
      console.log(`⚠️ WARNING: Found ${existingAchievements.length} existing achievement(s) for February 2026`);
      console.log('   These will be replaced by the new check.\n');
    } else {
      console.log('✅ No existing achievements found for February 2026\n');
    }
    
    console.log('🚀 Starting achievement check for February 2026...\n');
    console.log('─'.repeat(60));
    
    // Run the achievement check for February 2026
    await achievementScheduler.checkAllUsersAchievements(2, 2026);
    
    console.log('─'.repeat(60));
    console.log('\n🏆 Finalizing achievements...\n');
    
    // Finalize the achievements
    await achievementScheduler.finalizeMonthlyAchievements(2, 2026);
    
    console.log('\n─'.repeat(60));
    
    // Check final status
    const finalAchievements = await Achievement.find({
      month: 2,
      year: 2026
    });
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('─'.repeat(60));
    
    if (finalAchievements.length === 0) {
      console.log('❌ No achievements awarded for February 2026');
      console.log('   Reason: No users met the criteria');
    } else {
      console.log(`✅ ${finalAchievements.length} achievement(s) awarded for February 2026\n`);
      
      finalAchievements.forEach((ach, index) => {
        console.log(`${index + 1}. ${ach.email}`);
        console.log(`   Budget: ₹${ach.budgetAmount}`);
        console.log(`   Spent: ₹${ach.totalExpenses}`);
        console.log(`   Saved: ₹${(ach.budgetAmount - ach.totalExpenses).toFixed(2)}`);
        console.log(`   Status: ${ach.status}`);
        console.log(`   Earned At: ${ach.earnedAt}`);
        if (ach.finalizedAt) {
          console.log(`   Finalized At: ${ach.finalizedAt}`);
        }
        console.log(`   Message: ${ach.metadata?.message}`);
        console.log('');
      });
    }
    
    console.log('─'.repeat(60));
    console.log('\n💡 SCHEDULER CONFIGURATION:');
    console.log('   ⏰ Runs at: 12:01 AM on the 1st of every month');
    console.log('   🎯 Awards for: The month that just ended');
    console.log('   ✅ Status: Immediately finalized');
    console.log('   🌟 Next award: April 1, 2026 at 12:01 AM (for March)');
    console.log('\n✅ Simulation complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

simulateMarch1Award();
