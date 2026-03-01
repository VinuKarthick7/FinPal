import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import { trackLoginForAchievements } from '../utils/achievementVisibility';
import Achievement from '../models/Achievement';
import { User } from '../models/User';

/**
 * Test the 3-Login Unlock Rule
 * Simulates user logging in 3 times and tracks achievement visibility
 */

async function test3LoginUnlock() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Testing 3-Login Achievement Unlock Rule               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log(`👤 User: ${email}`);
    console.log(`🆔 User ID: ${user._id}\n`);
    
    // Check current achievement status
    const achievement = await Achievement.findOne({
      userId: user._id,
      month: 2,
      year: 2026
    });
    
    if (!achievement) {
      console.log('❌ No February 2026 achievement found!');
      console.log('   Run: npx ts-node src/tests/simulateMarch1Award.ts first\n');
      process.exit(1);
    }
    
    console.log('📊 INITIAL STATE:');
    console.log(`   Month/Year: ${achievement.month}/${achievement.year}`);
    console.log(`   Status: ${achievement.status}`);
    console.log(`   Login Count: ${achievement.loginCountAfterAward}`);
    console.log(`   Visible: ${achievement.visibleToUser ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    // If already visible, reset for testing
    if (achievement.visibleToUser) {
      console.log('⚠️  Achievement is already visible. Resetting for test...');
      achievement.loginCountAfterAward = 0;
      achievement.visibleToUser = false;
      achievement.firstLoginAfterAward = undefined;
      await achievement.save();
      console.log('✅ Reset complete\n');
    }
    
    console.log('─'.repeat(60));
    console.log('SIMULATING USER LOGINS:');
    console.log('─'.repeat(60));
    console.log('');
    
    // Simulate 3 logins
    for (let i = 1; i <= 3; i++) {
      console.log(`🔐 LOGIN #${i}`);
      console.log(`   Time: ${new Date().toLocaleString()}`);
      
      // Check before tracking
      const beforeAch = await Achievement.findOne({
        userId: user._id,
        month: 2,
        year: 2026
      });
      console.log(`   Before tracking: Count=${beforeAch?.loginCountAfterAward}, Visible=${beforeAch?.visibleToUser}`);
      
      // Track login
      await trackLoginForAchievements(user._id);
      
      // Check status after this login
      const updatedAch = await Achievement.findOne({
        userId: user._id,
        month: 2,
        year: 2026
      });
      
      console.log(`   After tracking: Count=${updatedAch?.loginCountAfterAward}, Visible=${updatedAch?.visibleToUser}`);
      
      if (updatedAch) {
        console.log(`   Login Count: ${updatedAch.loginCountAfterAward}/3`);
        console.log(`   Visible: ${updatedAch.visibleToUser ? '✅ YES - UNLOCKED!' : '❌ NO - LOCKED'}`);
        
        if (!updatedAch.visibleToUser) {
          const remaining = 3 - updatedAch.loginCountAfterAward;
          console.log(`   💡 ${remaining} more login(s) needed to unlock`);
        } else {
          console.log(`   🎉 Achievement is now visible to ${email}!`);
        }
      }
      
      console.log('');
      
      // Small delay between logins
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('─'.repeat(60));
    
    // Final status
    const finalAch = await Achievement.findOne({
      userId: user._id,
      month: 2,
      year: 2026
    });
    
    console.log('\n✅ FINAL STATE:');
    console.log(`   Month/Year: ${finalAch?.month}/${finalAch?.year}`);
    console.log(`   Status: ${finalAch?.status}`);
    console.log(`   Login Count: ${finalAch?.loginCountAfterAward}`);
    console.log(`   Visible: ${finalAch?.visibleToUser ? '✅ YES' : '❌ NO'}`);
    console.log(`   First Login: ${finalAch?.firstLoginAfterAward ? finalAch.firstLoginAfterAward.toLocaleString() : 'N/A'}`);
    console.log('');
    
    if (finalAch?.visibleToUser) {
      console.log('🌟 SUCCESS! Achievement is now visible on the dashboard!');
    } else {
      console.log('❌ FAILED! Achievement should be visible after 3 logins.');
    }
    
    console.log('\n📝 NOTES:');
    console.log('   - Achievement awarded at: March 1, 2026 12:01 AM');
    console.log('   - Visibility rule: Must login 3 times after award');
    console.log('   - Each login increments the counter');
    console.log('   - Achievement appears on dashboard after 3rd login');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test3LoginUnlock();
