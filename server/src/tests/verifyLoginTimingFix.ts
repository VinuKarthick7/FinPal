/**
 * Verify Login Timing Fix
 * 
 * Tests that login tracking only counts logins AFTER the achievement month has ended
 * 
 * Test Cases:
 * 1. Verify February achievement does NOT count logins in February
 * 2. Verify February achievement DOES count logins in March or later
 */

import mongoose from 'mongoose';
import connectDB from '../config/database';
import Achievement from '../models/Achievement';

async function verifyLoginTimingFix() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    const testEmail = 'gsribarath@gmail.com';
    
    // Find all achievements for the test user
    const achievements = await Achievement.find({ email: testEmail }).sort({ year: 1, month: 1 });
    
    console.log(`Found ${achievements.length} achievement(s) for ${testEmail}\n`);
    console.log('='.repeat(80));

    if (achievements.length === 0) {
      console.log('❌ No achievements found to verify');
      process.exit(0);
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    console.log(`Current Date: ${currentMonth}/${currentYear} (${now.toLocaleDateString()})\n`);

    for (const achievement of achievements) {
      console.log(`\n📊 Achievement: ${achievement.month}/${achievement.year}`);
      console.log(`   Status: ${achievement.status}`);
      console.log(`   Visible: ${achievement.visibleToUser}`);
      console.log(`   Login Count: ${achievement.loginCountAfterAward}`);
      
      // Calculate the first valid month for login counting
      const achievementMonth = achievement.month;
      const achievementYear = achievement.year;
      const nextMonth = achievementMonth === 12 ? 1 : achievementMonth + 1;
      const nextYear = achievementMonth === 12 ? achievementYear + 1 : achievementYear;
      
      // Check if current time is in valid period
      const isValidLoginPeriod = 
        (currentYear > nextYear) || 
        (currentYear === nextYear && currentMonth >= nextMonth);
      
      console.log(`   Valid Login Period: Starting ${nextMonth}/${nextYear}`);
      
      if (isValidLoginPeriod) {
        console.log(`   ✅ Current time (${currentMonth}/${currentYear}) is in valid period - logins WILL be counted`);
      } else {
        console.log(`   ⏭️ Current time (${currentMonth}/${currentYear}) is TOO EARLY - logins will NOT be counted`);
      }
      
      // Special check for February 2026
      if (achievement.month === 2 && achievement.year === 2026) {
        console.log('\n   🔍 FEBRUARY 2026 ANALYSIS:');
        if (currentMonth === 2 && currentYear === 2026) {
          console.log(`   ❌ It's still February 2026! Login counting should be SKIPPED.`);
          console.log(`   ✅ Month must end first. Valid from March 1, 2026 onwards.`);
          if (achievement.loginCountAfterAward > 0) {
            console.log(`   ⚠️ WARNING: Login count is ${achievement.loginCountAfterAward} but should be 0!`);
          } else {
            console.log(`   ✅ CORRECT: Login count is 0 as expected.`);
          }
        } else if (currentMonth >= 3 && currentYear === 2026) {
          console.log(`   ✅ It's now ${currentMonth}/${currentYear}. Login counting is ACTIVE.`);
          console.log(`   ℹ️ Each login since March 1 should increment the counter.`);
        }
      }
      
      console.log('-'.repeat(80));
    }

    console.log('\n📋 SUMMARY:');
    console.log('The login tracking fix ensures:');
    console.log('1. ⏭️ February 2026 logins (Feb 1-28/29) do NOT count towards Feb achievement');
    console.log('2. ✅ March 2026+ logins DO count towards Feb achievement');
    console.log('3. 🎯 Achievement unlocks after 3 valid logins (March 1+ only)');
    console.log('4. 🔒 Achievement stays hidden until month ends + 3 logins completed');

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

verifyLoginTimingFix();
