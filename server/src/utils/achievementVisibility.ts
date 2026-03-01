import Achievement from '../models/Achievement';
import mongoose from 'mongoose';

/**
 * Achievement Visibility Tracker
 * 
 * Controls when achievements become visible to users based on login count.
 * Rule: Achievement stars appear only after user logs in 3 times after 12:01 AM on 1st of month.
 */

const REQUIRED_LOGINS = 3; // Number of logins required to unlock achievement visibility

/**
 * Track user login and update achievement visibility
 * Called every time a user successfully logs in
 * 
 * CRITICAL RULE: Only count logins that occur AFTER the achievement month has ended
 * Example: February achievement can only start counting logins on March 1 or later
 */
export async function trackLoginForAchievements(userId: string | mongoose.Types.ObjectId): Promise<void> {
  try {
    console.log(`[trackLogin] Checking achievements for userId: ${userId}`);
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Find all awarded/finalized achievements that are not yet visible to this user
    // Both 'awarded' and 'finalized' statuses should be tracked
    const hiddenAchievements = await Achievement.find({
      userId: new mongoose.Types.ObjectId(userId.toString()),
      status: { $in: ['awarded', 'finalized'] }, // Include both statuses
      visibleToUser: false,
    });

    console.log(`[trackLogin] Found ${hiddenAchievements.length} hidden achievement(s)`);

    if (hiddenAchievements.length === 0) {
      console.log(`[trackLogin] No hidden achievements to process`);
      return; // No hidden achievements to process
    }

    console.log(`🔓 Tracking login for ${hiddenAchievements.length} hidden achievement(s)...`);

    for (const achievement of hiddenAchievements) {
      // CRITICAL CHECK: Only count logins that occur AFTER the achievement month has ended
      // Example: February 2026 achievement should only count logins from March 2026 onwards
      const achievementMonth = achievement.month; // 1-12
      const achievementYear = achievement.year;
      
      // Calculate the first valid month for login counting (the month AFTER the achievement)
      const nextMonth = achievementMonth === 12 ? 1 : achievementMonth + 1;
      const nextYear = achievementMonth === 12 ? achievementYear + 1 : achievementYear;
      
      // Check if current login is in the valid counting period
      const isValidLoginPeriod = 
        (currentYear > nextYear) || 
        (currentYear === nextYear && currentMonth >= nextMonth);
      
      if (!isValidLoginPeriod) {
        console.log(`⏭️ Skipping ${achievement.email} - ${getMonthName(achievement.month)} ${achievement.year}: Login too early (current: ${currentMonth}/${currentYear}, valid from: ${nextMonth}/${nextYear})`);
        continue; // Skip this achievement - month hasn't ended yet
      }
      
      // Increment login count
      achievement.loginCountAfterAward += 1;

      // Set first login timestamp if not already set
      if (!achievement.firstLoginAfterAward) {
        achievement.firstLoginAfterAward = new Date();
      }

      // Check if we've reached the required number of logins
      if (achievement.loginCountAfterAward >= REQUIRED_LOGINS) {
        achievement.visibleToUser = true;
        console.log(`✨ Achievement unlocked! ${achievement.email} - ${getMonthName(achievement.month)} ${achievement.year} (${achievement.loginCountAfterAward} logins)`);
      } else {
        console.log(`🔒 Achievement progress: ${achievement.loginCountAfterAward}/${REQUIRED_LOGINS} logins - ${achievement.email}`);
      }

      await achievement.save();
    }
  } catch (error) {
    console.error('Error tracking login for achievements:', error);
    // Don't throw - this should not block login
  }
}

/**
 * Get visible achievements for a user
 * Only returns achievements where visibleToUser = true
 */
export async function getVisibleAchievements(userId: string | mongoose.Types.ObjectId) {
  return await Achievement.find({
    userId: new mongoose.Types.ObjectId(userId.toString()),
    visibleToUser: true,
  }).sort({ year: -1, month: -1 });
}

/**
 * Get achievement unlock progress for a user
 * Returns info about hidden achievements and how many more logins needed
 */
export async function getAchievementUnlockProgress(userId: string | mongoose.Types.ObjectId) {
  const hiddenAchievements = await Achievement.find({
    userId: new mongoose.Types.ObjectId(userId.toString()),
    status: 'finalized',
    visibleToUser: false,
  }).sort({ year: -1, month: -1 });

  return hiddenAchievements.map(ach => ({
    month: ach.month,
    year: ach.year,
    loginsCompleted: ach.loginCountAfterAward,
    loginsRequired: REQUIRED_LOGINS,
    loginsRemaining: Math.max(0, REQUIRED_LOGINS - ach.loginCountAfterAward),
    progress: Math.min(100, (ach.loginCountAfterAward / REQUIRED_LOGINS) * 100),
  }));
}

// Helper: Get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
