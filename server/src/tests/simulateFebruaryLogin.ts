/**
 * Simulate Login During February 2026
 * 
 * Tests what happens when user logs in on Feb 28, 2026:
 * - January achievement SHOULD count the login (month ended)
 * - February achievement should NOT count the login (month not ended yet)
 */

import mongoose from 'mongoose';
import connectDB from '../config/database';
import Achievement from '../models/Achievement';
import { trackLoginForAchievements } from '../utils/achievementVisibility';

async function simulateFebruaryLogin() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    const testEmail = 'gsribarath@gmail.com';
    const testUserId = '69745a7b249a568708ef9cf7';
    
    console.log('📅 CURRENT DATE: February 28, 2026');
    console.log('🧪 Simulating login for:', testEmail);
    console.log('='.repeat(80));

    // Show before state
    console.log('\n📊 BEFORE LOGIN:');
    const beforeAchievements = await Achievement.find({ 
      userId: new mongoose.Types.ObjectId(testUserId) 
    }).sort({ year: 1, month: 1 });
    
    for (const ach of beforeAchievements) {
      console.log(`   ${ach.month}/${ach.year}: Status=${ach.status}, Visible=${ach.visibleToUser}, LoginCount=${ach.loginCountAfterAward}`);
    }

    // Simulate login by calling trackLoginForAchievements
    console.log('\n🔄 Simulating login...');
    await trackLoginForAchievements(testUserId);

    // Show after state
    console.log('\n📊 AFTER LOGIN:');
    const afterAchievements = await Achievement.find({ 
      userId: new mongoose.Types.ObjectId(testUserId) 
    }).sort({ year: 1, month: 1 });
    
    for (const ach of afterAchievements) {
      const before = beforeAchievements.find(b => b.month === ach.month && b.year === ach.year);
      const countChanged = before && before.loginCountAfterAward !== ach.loginCountAfterAward;
      const emoji = countChanged ? '📈' : '⏸️';
      console.log(`   ${emoji} ${ach.month}/${ach.year}: Status=${ach.status}, Visible=${ach.visibleToUser}, LoginCount=${ach.loginCountAfterAward}`);
      
      if (countChanged) {
        console.log(`      ✅ Count increased: ${before?.loginCountAfterAward} → ${ach.loginCountAfterAward}`);
      }
    }

    console.log('\n📋 EXPECTED BEHAVIOR:');
    console.log('✅ January 2026: Count should increase (1/3) - month already ended');
    console.log('⏭️ February 2026: Count should stay 0 - month not ended yet, opens March 1');
    
    // Verify expectations
    console.log('\n🔍 VERIFICATION:');
    const janAch = afterAchievements.find(a => a.month === 1 && a.year === 2026);
    const febAch = afterAchievements.find(a => a.month === 2 && a.year === 2026);
    
    let allCorrect = true;
    
    if (janAch) {
      if (janAch.loginCountAfterAward === 1 && !janAch.visibleToUser) {
        console.log('✅ January: Login counted (1/3), still hidden - CORRECT');
      } else {
        console.log(`❌ January: Expected count=1, visible=false, got count=${janAch.loginCountAfterAward}, visible=${janAch.visibleToUser}`);
        allCorrect = false;
      }
    }
    
    if (febAch) {
      if (febAch.loginCountAfterAward === 0 && !febAch.visibleToUser) {
        console.log('✅ February: Login NOT counted (0/3), hidden - CORRECT');
      } else {
        console.log(`❌ February: Expected count=0, visible=false, got count=${febAch.loginCountAfterAward}, visible=${febAch.visibleToUser}`);
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log('\n🎉 ALL TESTS PASSED! Login timing logic is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the logic.');
    }

  } catch (error) {
    console.error('❌ Error during simulation:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

simulateFebruaryLogin();
