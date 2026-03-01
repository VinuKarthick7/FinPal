import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';
import { User } from '../models/User';

async function checkAndFixAchievements() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  CURRENT ACHIEVEMENT STATUS (Feb 28, 2026)             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    const allAchievements = await Achievement.find({ userId: user._id }).sort({ year: 1, month: 1 });
    
    console.log(`Total achievements: ${allAchievements.length}\n`);
    
    allAchievements.forEach((ach, idx) => {
      console.log(`${idx + 1}. ${getMonthName(ach.month)} ${ach.year}`);
      console.log(`   Status: ${ach.status}`);
      console.log(`   Visible: ${ach.visibleToUser ? '✅ YES (SHOWING ON DASHBOARD)' : '❌ NO (HIDDEN)'}`);
      console.log(`   Login Count: ${ach.loginCountAfterAward}`);
      console.log(`   Earned At: ${ach.earnedAt}`);
      console.log(`   Budget: ₹${ach.budgetAmount}, Spent: ₹${ach.totalExpenses}`);
      console.log('');
    });
    
    console.log('─'.repeat(60));
    console.log('\n⚠️  RULE CHECK:\n');
    console.log('Today is: February 28, 2026');
    console.log('February is NOT over yet!');
    console.log('\n❌ February achievement should be HIDDEN because:');
    console.log('   1. Month has not ended (still Feb 28)');
    console.log('   2. Award time is March 1, 12:01 AM');
    console.log('   3. Then requires 3 logins after that');
    console.log('\n✅ January achievement SHOULD be visible IF:');
    console.log('   1. It was awarded on Feb 1, 12:01 AM');
    console.log('   2. User logged in 3+ times since then');
    console.log('');
    
    // Fix visibility
    console.log('─'.repeat(60));
    console.log('\n🔧 FIXING VISIBILITY...\n');
    
    let fixed = 0;
    
    for (const ach of allAchievements) {
      const monthName = getMonthName(ach.month);
      
      // Check if this achievement should be visible
      // Rule: Only visible if month has ended AND 3 logins completed
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-12
      const currentYear = today.getFullYear();
      
      // Achievement is for a future month = should be HIDDEN
      if (ach.year > currentYear || (ach.year === currentYear && ach.month >= currentMonth)) {
        if (ach.visibleToUser) {
          console.log(`❌ FIXING: ${monthName} ${ach.year} is current/future month - HIDING IT`);
          ach.visibleToUser = false;
          ach.loginCountAfterAward = 0;
          await ach.save();
          fixed++;
        } else {
          console.log(`✅ OK: ${monthName} ${ach.year} is correctly hidden (current/future month)`);
        }
      } else {
        // Achievement is for a past month
        console.log(`📅 ${monthName} ${ach.year} is a past month`);
        console.log(`   Current visibility: ${ach.visibleToUser ? 'Visible' : 'Hidden'}`);
        console.log(`   Login count: ${ach.loginCountAfterAward}/3`);
      }
    }
    
    console.log('\n─'.repeat(60));
    console.log(`\n✅ Fixed ${fixed} achievement(s)\n`);
    
    // Show final status
    console.log('FINAL STATUS:');
    const finalAchs = await Achievement.find({ userId: user._id }).sort({ year: 1, month: 1 });
    finalAchs.forEach((ach) => {
      console.log(`${getMonthName(ach.month)} ${ach.year}: ${ach.visibleToUser ? '✅ VISIBLE' : '❌ HIDDEN'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

checkAndFixAchievements();
