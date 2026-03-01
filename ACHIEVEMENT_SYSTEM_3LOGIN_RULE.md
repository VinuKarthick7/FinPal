# Achievement System - Complete Implementation

## 🎯 Achievement Rules (FINAL VERSION)

### Rule #1: Award Timing
⏰ **Achievements are ONLY awarded at 12:01 AM on the 1st of every month**
- Month must be 100% complete before evaluation
- Awards for the month that just ended
- Immediately finalized after award

### Rule #2: Visibility (3-Login Unlock)
👁️ **Achievement stars appear ONLY after user logs in 3 times after award**
- Award happens at 12:01 AM (invisible)
- Login 1: Counter = 1/3 (still hidden)
- Login 2: Counter = 2/3 (still hidden)
- Login 3: Counter = 3/3 (✨ UNLOCKED - now visible!)

---

## 📅 Complete Timeline Example

### February 2026:

| Date & Time | Event | Achievement Visibility |
|------------|--------|------------------------|
| Feb 1-28 | User tracks expenses | ❌ No star yet - month in progress |
| Feb 28, 11:59 PM | Month ends | ❌ Still no star |
| **Mar 1, 12:01 AM** | **System awards achievement** | ❌ Awarded but HIDDEN |
| Mar 1, 8:00 AM | User logs in (1st time) | ❌ Counter: 1/3 - Still hidden |
| Mar 2, 9:00 AM | User logs in (2nd time) | ❌ Counter: 2/3 - Still hidden |
| Mar 3, 7:30 AM | User logs in (3rd time) | ✅ Counter: 3/3 - **VISIBLE!** 🌟 |

---

## 🏗️ Technical Implementation

### Database Schema (Achievement Model)

```typescript
{
  userId: ObjectId,
  email: string,
  month: number,      // 1-12
  year: number,
  budgetAmount: number,
  totalExpenses: number,
  status: 'finalized',
  earnedAt: Date,     // When awarded (12:01 AM)
  
  // 🆕 NEW: Visibility Control Fields
  loginCountAfterAward: number,    // 0, 1, 2, or 3+
  visibleToUser: boolean,          // false until 3 logins
  firstLoginAfterAward: Date,      // Timestamp of 1st login
  
  metadata: {
    savingsAmount: number,
    budgetUtilization: number,
    message: string
  }
}
```

### Core Functions

#### 1. Achievement Award (Scheduler)
**File:** `server/src/utils/achievementScheduler.ts`

- **Runs:** 12:01 AM on 1st of every month
- **Cron:** `'1 0 1 * *'`
- **Action:** Awards achievements for previous month
- **Initial State:** `loginCountAfterAward: 0, visibleToUser: false`

#### 2. Login Tracking
**File:** `server/src/utils/achievementVisibility.ts`

- **Triggered:** Every successful user login
- **Function:** `trackLoginForAchievements(userId)`
- **Process:**
  1. Find hidden achievements (`visibleToUser: false`)
  2. Increment `loginCountAfterAward`  
  3. If count >= 3: Set `visibleToUser: true`
  4. Save changes

#### 3. Achievement API
**File:** `server/src/controllers/achievementController.ts`

```typescript
// GET /api/achievements
// Returns ONLY visible achievements
Achievement.find({
  userId,
  visibleToUser: true  // ⭐ Only unlocked achievements
})

// GET /api/achievements/unlock-progress
// Shows progress toward unlocking hidden achievements
{
  hasHiddenAchievements: true,
  hiddenCount: 1,
  unlockProgress: [{
    month: 2,
    year: 2026,
    loginsCompleted: 2,
    loginsRequired: 3,
    loginsRemaining: 1,
    progress: 66.67,
    message: "Log in 1 more time(s) to unlock your achievement!"
  }]
}
```

---

## 🎮 User Experience Flow

### For Users:

1. **Track expenses all month**
   - Dashboard shows current month progress
   - No achievement star yet2. **Month ends (Feb 28, 11:59 PM)**
   - System prepares to evaluate
   
3. **12:01 AM on March 1**
   - System awards achievement (behind the scenes)
   - User doesn't see anything yet

4. **First login after award**
   - Counter: 1/3
   - Message: "Log in 2 more times to unlock your achievement!"
   - No star visible yet

5. **Second login**
   - Counter: 2/3
   - Message: "Log in 1 more time to unlock your achievement!"
   - Still no star
   
6. **Third login - THE MAGIC MOMENT! ✨**
   - Counter: 3/3
   - `visibleToUser` = `true`
   - ⭐ **STAR APPEARS ON DASHBOARD!**
   - Celebration animation/popup (optional)

---

## 🔧 API Endpoints

### 1. Get User Achievements
```http
GET /api/achievements
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    achievements: [
      {
        month: 2,
        year: 2026,
        budgetAmount: 2650,
        totalExpenses: 2239.95,
        savings: 410.05,
        status: "finalized",
        visibleToUser: true,  // ⭐ Only if unlocked
        metadata: {
          message: "Well done! Another month of smart spending ⭐"
        }
      }
    ]
  }
}
```

### 2. Get Unlock Progress
```http
GET /api/achievements/unlock-progress
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    hasHiddenAchievements: true,
    hiddenCount: 1,
    unlockProgress: [{
      month: 2,
      year: 2026,
      loginsCompleted: 2,
      loginsRequired: 3,
      loginsRemaining: 1,
      progress: 66.67,
      message: "Log in 1 more time(s) to unlock your achievement!"
    }]
  }
}
```

---

## 🧪 Testing

### Test Scripts

1. **Test 3-Login Unlock:**
   ```bash
   npx ts-node src/tests/test3LoginUnlock.ts
   ```
   Simulates 3 logins and verifies unlock behavior

2. **Force Update Existing Achievements:**
   ```bash
   npx ts-node src/tests/forceUpdateAchievements.ts
   ```
   Migrates existing achievements to new schema

3. **Simulate March 1 Award:**
   ```bash
   npx ts-node src/tests/simulateMarch1Award.ts
   ```
   Simulates achievement award at month end

---

## 📝 Migration Notes

### For Existing Deployments:

If you have existing achievements in the database, run this migration:

```bash
npm run ts-node src/tests/forceUpdateAchievements.ts
```

This adds the new visibility fields to all existing achievements:
- `loginCountAfterAward: 0`
- `visibleToUser: false`
- `firstLoginAfterAward: null`

---

## ✅ Verification Checklist

- [ ] Scheduler runs at 12:01 AM on 1st of month
- [ ] New achievements have `visibleToUser: false`
- [ ] Login increments `loginCountAfterAward`
- [ ] After 3rd login, `visibleToUser` becomes `true`
- [ ] API only returns achievements where `visibleToUser: true`
- [ ] Unlock progress endpoint shows correct data

---

## 🎯 Success Metrics

**February 2026 Example:**
- ✅ Achievement awarded: March 1, 12:01 AM
- ✅ Initial state: Hidden (visibleToUser=false)
- ✅ Login 1: Counter=1, Still hidden
- ✅ Login 2: Counter=2, Still hidden
- ✅ Login 3: Counter=3, **UNLOCKED!** ⭐
- ✅ Appears on dashboard after 3rd login

---

**Last Updated:** February 28, 2026  
**Status:** ✅ Production Ready  
**Version:** 2.0 (3-Login Unlock Rule)
