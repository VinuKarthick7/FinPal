/**
 * Test Complete 3-Login Unlock Flow
 * 
 * Simulates 3 logins to fully unlock January 2026 achievement
 * Verifies February stays locked during February
 */

import mongoose from 'mongoose';
import connectDB from '../config/database';
import Achievement from '../models/Achievement';
import { trackLoginForAchievements } from '../utils/achievementVisibility';

async function testCompleteUnlockFlow() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    const testUserId = '69745a7b249a568708ef9cf7';
    
    console.log('🧪 TESTING 3-LOGIN UNLOCK FLOW');
    console.log('📅 Current Date: February 28, 2026');
    console.log('='.repeat(80));

    // Show initial state
    let achievements = await Achievement.find({ 
      userId: new mongoose.Types.ObjectId(testUserId) 
    }).sort({ year: 1, month: 1 });
    
    console.log('\n📊 INITIAL STATE:');
    for (const ach of achievements) {
      console.log(`   ${ach.month}/${ach.year}: LoginCount=${ach.loginCountAfterAward}/3, Visible=${ach.visibleToUser}`);
    }

    // Determine how many more logins needed for January
    const janAch = achievements.find(a => a.month === 1 && a.year === 2026);
    if (!janAch) {
      console.log('\n❌ January 2026 achievement not found!');
      return;
    }

    const loginsNeeded = Math.max(0, 3 - janAch.loginCountAfterAward);
    console.log(`\n🎯 January needs ${loginsNeeded} more login(s) to unlock`);

    // Simulate the required number of logins
    for (let i = 1; i <= loginsNeeded; i++) {
      console.log(`\n🔄 Login ${janAch.loginCountAfterAward + i}/3...`);
      await trackLoginForAchievements(testUserId);
      
      // Check state after this login
      achievements = await Achievement.find({ 
        userId: new mongoose.Types.ObjectId(testUserId) 
      }).sort({ year: 1, month: 1 });
      
      const jan = achievements.find(a => a.month === 1 && a.year === 2026);
      const feb = achievements.find(a => a.month === 2 && a.year === 2026);
      
      console.log(`   January: ${jan?.loginCountAfterAward}/3, Visible=${jan?.visibleToUser}`);
      console.log(`   February: ${feb?.loginCountAfterAward}/3, Visible=${feb?.visibleToUser}`);
      
      if (jan?.visibleToUser) {
        console.log('   🎉 JANUARY UNLOCKED!');
      }
    }

    // Final state verification
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL STATE:');
    console.log('='.repeat(80));
    
    achievements = await Achievement.find({ 
      userId: new mongoose.Types.ObjectId(testUserId) 
    }).sort({ year: 1, month: 1 });
    
    let allCorrect = true;
    
    for (const ach of achievements) {
      const month = ach.month === 1 ? 'January' : 'February';
      console.log(`\n${month} 2026:`);
      console.log(`   Status: ${ach.status}`);
      console.log(`   Login Count: ${ach.loginCountAfterAward}/3`);
      console.log(`   Visible: ${ach.visibleToUser ? '✅ YES' : '🔒 NO'}`);
      
      if (ach.month === 1) {
        if (ach.loginCountAfterAward >= 3 && ach.visibleToUser) {
          console.log(`   ✅ PASS: January unlocked after 3 logins`);
        } else {
          console.log(`   ❌ FAIL: January should be unlocked`);
          allCorrect = false;
        }
      } else if (ach.month === 2) {
        if (ach.loginCountAfterAward === 0 && !ach.visibleToUser) {
          console.log(`   ✅ PASS: February still locked (month not ended)`);
        } else {
          console.log(`   ❌ FAIL: February should be locked`);
          allCorrect = false;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    if (allCorrect) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('\n✅ January star is now visible on achievements page');
      console.log('🔒 February star will unlock on March 1 + 3 logins');
    } else {
      console.log('⚠️ Some tests failed');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testCompleteUnlockFlow();
