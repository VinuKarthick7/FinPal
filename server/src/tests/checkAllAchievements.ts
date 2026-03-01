import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

async function checkAllAchievements() {
  try {
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    
    // Get ALL achievements for this user (regardless of visibility)
    const all = await Achievement.find({ email }).sort({ year: 1, month: 1 });
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ALL ACHIEVEMENTS IN DATABASE                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log(`User: ${email}`);
    console.log(`Total in DB: ${all.length}\n`);
    
    all.forEach((a, i) => {
      console.log(`${i + 1}. ${a.month}/${a.year}`);
      console.log(`   Status: ${a.status}`);
      console.log(`   Visible: ${a.visibleToUser ? '✅ YES' : '❌ NO'}`);
      console.log(`   Login Count: ${a.loginCountAfterAward}/3`);
      console.log(`   Budget: ₹${a.budgetAmount}, Spent: ₹${a.totalExpenses}`);
      console.log('');
    });
    
    const visible = all.filter(a => a.visibleToUser);
    console.log('─'.repeat(60));
    console.log(`\nVISIBLE TO USER: ${visible.length}`);
    visible.forEach(a => console.log(`  - ${a.month}/${a.year}`));
    
    console.log('\n─'.repeat(60));
    console.log('\n🔍 API RESPONSE (what frontend should see):');
    console.log(`   Total Stars: ${visible.length}`);
    console.log(`   This Year (2026): ${visible.filter(a => a.year === 2026).length}`);
    console.log(`   Expected: Only January 2026 star\n`);
    
    if (visible.length !== 1) {
      console.log('❌ ERROR: Wrong number of visible achievements!');
    } else {
      console.log('✅ Database is correct - frontend needs to refresh!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllAchievements();
