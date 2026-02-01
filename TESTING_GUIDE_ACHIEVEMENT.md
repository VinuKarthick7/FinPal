# 🧪 Testing the Budget Success Reward System

## Quick Test Guide

### Method 1: Create Test Achievement via API

Use this curl command or API client (Postman/Thunder Client):

```bash
# 1. Login first to get auth token
POST http://localhost:5000/api/auth/login
{
  "email": "your-email@example.com",
  "password": "your-password"
}

# Copy the token from response

# 2. Create a test achievement for last month
# (This simulates earning a star last month)
```

**Direct MongoDB Insert (Easiest for Testing):**

```javascript
// Open MongoDB Compass or mongo shell
// Connect to your FinPal database

// Replace USER_ID with your actual user ObjectId
// Replace EMAIL with your email

db.achievements.insertOne({
  userId: ObjectId("YOUR_USER_ID_HERE"),
  email: "your-email@example.com",
  month: 1,  // January (if testing in February)
  year: 2026,
  budgetAmount: 20000,
  totalExpenses: 15000,
  achievementType: "budget_success",
  status: "awarded",
  earnedAt: new Date("2026-01-31"),
  metadata: {
    savingsAmount: 5000,
    budgetUtilization: 75,
    message: "Great job! You managed your budget well this month ⭐"
  },
  createdAt: new Date("2026-01-31"),
  updatedAt: new Date("2026-01-31")
});
```

**To find your USER_ID:**
```javascript
// In MongoDB
db.users.findOne({ email: "your-email@example.com" })
// Copy the _id field
```

### Method 2: Wait for Automatic Award

1. **Set a Budget:**
   - Login to FinPal
   - Go to Budget section
   - Create monthly budget: ₹20,000

2. **Add Expenses (Less than Budget):**
   - Add expenses totaling ₹15,000
   - Ensure they're dated in current month

3. **Wait for Month End:**
   - System runs automatically on last 3 days at 6:00 AM
   - Or wait until last day at 11:30 PM

4. **Check Next Month:**
   - Login on 1st day of new month
   - You'll see the success announcement!

### Method 3: Manual Trigger (Development)

**Add a test route to the server (for development only):**

Create file: `server/src/routes/test.ts`

```typescript
import express from 'express';
import { protect } from '../middleware/auth';
import { achievementScheduler } from '../utils/achievementScheduler';

const router = express.Router();

// DEVELOPMENT ONLY - Remove in production
router.post('/trigger-achievement-check', protect, async (req, res) => {
  try {
    const userId = (req as any).user._id.toString();
    const email = (req as any).user.email;
    
    const achievement = await achievementScheduler.checkUserBudgetAchievement(
      userId,
      email
    );
    
    if (achievement) {
      res.json({
        success: true,
        message: 'Achievement awarded!',
        achievement
      });
    } else {
      res.json({
        success: false,
        message: 'No achievement earned (check budget vs expenses)'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default router;
```

Then in `server/src/routes/index.ts`:
```typescript
import testRoutes from './test';
// ...
router.use('/test', testRoutes);  // Only in development!
```

**Use the route:**
```bash
POST http://localhost:5000/api/test/trigger-achievement-check
Authorization: Bearer YOUR_TOKEN
```

### Viewing the Announcement

1. **First, clear localStorage** (to reset "seen" status):
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Find and delete key starting with `announcement_seen_`
   - Or run in console: `localStorage.clear()`

2. **Refresh Dashboard:**
   - If you have an achievement from last month
   - And haven't dismissed it yet
   - You'll see the success announcement!

3. **Test Dismissal:**
   - Click the X button
   - Refresh page
   - Announcement should not appear again
   - Check localStorage for new key

### Testing Different Scenarios

#### Scenario 1: User With Budget Success
```javascript
// MongoDB insert
{
  userId: ObjectId("USER_ID"),
  email: "test@example.com",
  month: 1,  // Last month
  year: 2026,
  budgetAmount: 20000,
  totalExpenses: 15000,  // Under budget ✅
  status: "awarded",
  metadata: {
    savingsAmount: 5000,
    budgetUtilization: 75
  }
}

// Expected: See announcement with 75% utilization, ₹5,000 saved
```

#### Scenario 2: User Just At Budget
```javascript
{
  totalExpenses: 20000,  // Exactly at budget ✅
  budgetAmount: 20000,
  // ...
  metadata: {
    savingsAmount: 0,
    budgetUtilization: 100
  }
}

// Expected: See announcement with 100% utilization, ₹0 saved
```

#### Scenario 3: User Over Budget
```javascript
{
  totalExpenses: 22000,  // Over budget ❌
  budgetAmount: 20000,
  status: "pending"  // Won't be awarded
}

// Expected: No announcement shown
```

### Debugging Checklist

**Announcement Not Showing:**
- [ ] Check if achievement exists for last month
- [ ] Verify achievement status is 'awarded' or 'finalized'
- [ ] Check localStorage doesn't have dismissal key
- [ ] Verify API call succeeds (Network tab)
- [ ] Check browser console for errors

**API Response Check:**
```javascript
// In browser console
fetch('/api/achievements/announcement', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => r.json())
.then(console.log)
```

Expected response if should show:
```json
{
  "success": true,
  "data": {
    "showAnnouncement": true,
    "achievement": { ... },
    "monthName": "January",
    "announcementKey": "announcement_seen_USER_ID_1_2026"
  }
}
```

Expected response if shouldn't show:
```json
{
  "success": true,
  "data": {
    "showAnnouncement": false
  }
}
```

### Quick MongoDB Queries

**Check all achievements:**
```javascript
db.achievements.find({ email: "your-email@example.com" })
  .sort({ year: -1, month: -1 })
```

**Check specific month:**
```javascript
db.achievements.findOne({
  email: "your-email@example.com",
  month: 1,
  year: 2026
})
```

**Update achievement status:**
```javascript
db.achievements.updateOne(
  { email: "your-email@example.com", month: 1, year: 2026 },
  { $set: { status: "awarded" } }
)
```

**Delete test achievement:**
```javascript
db.achievements.deleteOne({
  email: "your-email@example.com",
  month: 1,
  year: 2026
})
```

### Automated Testing Script

Create file: `test-achievement.js`

```javascript
// Run with: node test-achievement.js

const axios = require('axios');

async function testAchievementSystem() {
  const BASE_URL = 'http://localhost:5000/api';
  
  // 1. Login
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'your-email@example.com',
    password: 'your-password'
  });
  
  const token = loginRes.data.token;
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  
  // 2. Check announcement
  const announcementRes = await axios.get(
    `${BASE_URL}/achievements/announcement`,
    config
  );
  
  console.log('Announcement Check:', announcementRes.data);
  
  // 3. Get all achievements
  const achievementsRes = await axios.get(
    `${BASE_URL}/achievements`,
    config
  );
  
  console.log('All Achievements:', achievementsRes.data);
  
  // 4. Get stats
  const statsRes = await axios.get(
    `${BASE_URL}/achievements/stats`,
    config
  );
  
  console.log('Achievement Stats:', statsRes.data);
}

testAchievementSystem()
  .then(() => console.log('Test complete!'))
  .catch(err => console.error('Test failed:', err.message));
```

### Visual Verification

**What to look for in the announcement:**

✅ Yellow/amber gradient background  
✅ Confetti particles falling (first 3 seconds)  
✅ Trophy + Star + Party Popper icons  
✅ Large "YOU SUCCESSFULLY CRACKED THE BUDGET! 🎉"  
✅ "CONGRATULATIONS!" text  
✅ Month badge (e.g., "January 2026")  
✅ Savings amount display (if > 0)  
✅ Budget utilization percentage  
✅ Motivational message  
✅ Close (X) button in top right  
✅ Smooth fade-in animation  
✅ Pulsing glow effect  

**Icons should animate:**
- Trophy: Slight rotation and scale
- Star: Pulsing scale effect
- Party Popper: Slight rotation and scale

### Performance Check

**Announcement should:**
- Load in < 500ms
- Animate smoothly (60fps)
- Dismiss smoothly when clicked
- Not lag on mobile devices
- Not block page interaction

**Monitor in DevTools:**
- Performance tab → Record
- Check frame rate during animation
- Verify no memory leaks
- Check localStorage writes

---

## 🎉 Success!

If everything works:
1. ✅ Announcement appears on dashboard
2. ✅ Shows correct month and data
3. ✅ Confetti animates for 3 seconds
4. ✅ Can be dismissed
5. ✅ Doesn't reappear after dismissal
6. ✅ Looks great on mobile and desktop

**You've successfully implemented the Budget Success Reward System!** 🌟

---

## 📞 Troubleshooting Support

**Common Issues:**

1. **"showAnnouncement: false" when should be true**
   - Check month calculation in backend
   - Verify achievement exists in DB
   - Confirm status is awarded/finalized

2. **Confetti not showing**
   - Check browser supports CSS animations
   - Verify showConfetti state is true
   - Check for CSS conflicts

3. **Announcement shows every time**
   - localStorage may not be working
   - Check browser allows localStorage
   - Verify dismissal logic runs

4. **Star not in achievements page**
   - Check Achievement model query
   - Verify status filter includes 'awarded'
   - Check sort order

---

**Happy Testing! 🚀**
