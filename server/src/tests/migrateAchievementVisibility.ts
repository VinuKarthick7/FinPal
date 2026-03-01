import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

/**
 * Migration Script: Add visibility tracking fields to existing achievements
 * 
 * Adds loginCountAfterAward and visibleToUser fields to all existing achievements
 */

async function migrateAchievements() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Achievement Visibility Fields Migration               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    // Find all achievements that don't have the new fields
    const achievements = await Achievement.find({});
    
    console.log(`Found ${achievements.length} total achievement(s)\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const ach of achievements) {
      // Check if fields already exist
      const hasFields = 
        ach.loginCountAfterAward !== undefined && 
        ach.visibleToUser !== undefined;
      
      if (hasFields) {
        console.log(`✓ ${ach.email} - ${ach.month}/${ach.year} - Already has  fields (skipped)`);
        skipped++;
        continue;
      }
      
      // Add the new fields
      ach.loginCountAfterAward = 0;
      ach.visibleToUser = false;
      
      await ach.save();
      
      console.log(`✅ ${ach.email} - ${ach.month}/${ach.year} - Added visibility fields`);
      updated++;
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log(`\n📊 MIGRATION SUMMARY:`);
    console.log(`   Total achievements: ${achievements.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already had fields): ${skipped}`);
    console.log('\n✅ Migration complete!\n');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const hiddenCount = await Achievement.countDocuments({ visibleToUser: false });
    console.log(`   Achievements with visibleToUser=false: ${hiddenCount}`);
    
    const visibleCount = await Achievement.countDocuments({ visibleToUser: true });
    console.log(`   Achievements with visibleToUser=true: ${visibleCount}`);
    
    console.log('\n✅ Verification complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateAchievements();
