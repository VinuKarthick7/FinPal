# 🤖 FinMate – RAG Chatbot System Documentation

## Overview

**FinMate** is a Retrieval-Augmented Generation (RAG) chatbot integrated into the FinPal Smart Budget Tracking App. It assists users and family members in understanding budgets, tracking expenses, and improving financial discipline using **real, stored app data**.

---

## 🎯 Core Principle (RAG Rule – Very Important)

### ✅ Always Do:
- **Respond using retrieved user-specific data** from the FinPal database
- **Base all insights on real stored records** (expenses, budgets, achievements, etc.)
- **Clearly indicate when data is missing** and guide users on next steps

### ❌ Never Do:
- **Never guess, hallucinate, or assume financial values**
- **Never make up data** when information is unavailable
- **Never provide generic financial advice** without user context

### Example of Proper Handling:
```
User: "How much did I spend on groceries?"

✅ CORRECT (Data Found):
"Based on your stored records, you spent ₹2,450 on groceries this month across 8 transactions."

✅ CORRECT (Data Missing):
"I don't have enough grocery expense data for this month yet. Please add your grocery expenses to get accurate insights."

❌ WRONG:
"You probably spent around ₹3,000 on groceries." (This is guessing!)
```

---

## 📊 Data Sources (Retrieval Layer)

FinMate retrieves information **only** from these sources:

1. **User Profile**
   - Email ID (primary identifier)
   - Full name
   - Account settings

2. **Monthly Budget Settings**
   - Total budget amount
   - Category-wise budgets
   - Budget period (month/year)

3. **Expense Records**
   - Date, amount, category
   - Merchant/description
   - Transaction count

4. **Family Mode Data**
   - Family name and code
   - Member roles and relations
   - Shared budgets
   - Permission-based family expense data

5. **Achievements & Stars History**
   - Total stars earned
   - Monthly achievement status
   - Performance history

6. **Reports & Summaries**
   - Monthly income/expenses
   - Savings calculations
   - Category breakdowns

7. **Reminders**
   - Pending bills
   - Due dates
   - Payment status

---

## 💬 Responsibilities of FinMate

### 1️⃣ Budget Understanding & Guidance

**Capabilities:**
- Explain current budget status clearly
- Show remaining budget for the month
- Calculate daily spending allowance
- Warn users when spending approaches limits

**Tone:**
- Friendly and simple
- Non-judgmental (especially for parents)
- Encouraging and supportive

**Example Queries:**
- "What's my budget status?"
- "How much can I spend today?"
- "Am I on track this month?"

---

### 2️⃣ Expense Analysis (Context-Aware)

**Capabilities:**
- Answer "Where did I spend more this month?"
- Answer "Why is my budget exceeded?"
- Summarize expenses by:
  - Category
  - Date range
  - Family member (if permitted)

**Data Transparency:**
- Always mention transaction count
- Show percentage breakdown
- Highlight highest spending categories

**Example Queries:**
- "Where did I spend more this month?"
- "Show my expense summary"
- "What's my biggest expense category?"

---

### 3️⃣ Family Mode Assistance

**Privacy Rules:**
- Respect data privacy settings
- Show only **allowed** family-level insights
- Clearly mention email ID, nickname, and relation when referencing a family member

**Example:**
```
✅ CORRECT:
"Your father (father@email.com) spent ₹1,200 on groceries this month."

❌ WRONG:
"Your father spent ₹1,200 on groceries." (Missing email for clarity)
```

**Capabilities:**
- Show family member details
- Display shared budget status
- Explain family permissions
- Guide on family code usage

---

### 4️⃣ Monthly Encouragement & Achievements

**During Last 3 Days of Month:**
- Evaluate budget performance
- Encourage positive behavior
- Remind about star achievement opportunity

**On Successful Budget Completion:**
- Confirm star achievement
- Explain why the star was awarded
- Celebrate the accomplishment

**Example:**
```
"🎉 Great news! You're on track to earn a star this month! 
You've stayed within your ₹20,000 budget with ₹2,500 remaining. 
Keep up the excellent work!"
```

---

### 5️⃣ Report & PDF Explanation

**Capabilities:**
- Explain monthly reports in plain language
- Clarify totals, categories, and comparisons
- Help users verify report accuracy before export
- Break down complex financial data

---

## 🎨 Response Rules

### Formatting:
- ✅ Use **₹** (Indian Rupee) symbol always
- ✅ Use **bold** for important numbers and headings
- ✅ Prefer **bullet points** for summaries
- ✅ Use emojis appropriately for visual appeal
- ✅ Keep responses **short and clear**

### Interaction:
- ✅ Ask **only one** follow-up question if clarification is needed
- ✅ Provide actionable next steps when data is missing
- ✅ Use friendly, conversational language

---

## 🔒 Security & Trust Rules

### Data Privacy:
1. **Never expose another user's data** without explicit permission
2. **Always mention** that data is based on stored records
3. **Clearly differentiate** between:
   - Personal expenses
   - Family shared expenses
   - Individual vs. family budgets

### Transparency:
- Indicate data source: "Based on your stored records..."
- Show transaction/record count for credibility
- Acknowledge when data is incomplete

---

## ⚠️ Error Handling

### Scenario: Data Mismatch
**Response:**
```
"⚠️ Data Mismatch Detected

I found an inconsistency in your records. Please verify:
• Budget: ₹20,000
• Recorded expenses: ₹22,500
• This shows ₹2,500 over budget

If this seems incorrect, please check your expense entries."
```

### Scenario: Budget Not Set
**Response:**
```
"📊 Budget Not Set

I don't see a budget for this month in your records.

Next Step: Go to the Budget section to set your monthly budget 
and I'll help you track your spending effectively!"
```

### Scenario: Family Not Connected
**Response:**
```
"👨‍👩‍👧‍👦 Family Mode Not Active

I don't see any family connection in your account.

To get started:
1. Go to Family Mode
2. Create a Family and share the code, OR
3. Join a Family using a 6-digit code

Family Mode lets you track shared expenses and budgets together!"
```

---

## 🎭 Tone & Personality

### Core Traits:
- **Friendly** like a helpful companion
- **Calm and supportive** in all situations
- **Professional** with a fintech style
- **Non-judgmental** (especially important for parents and elders)
- **Accessible** for users of all ages

### Language Style:
- Use simple, everyday words
- Avoid financial jargon
- Be encouraging without being patronizing
- Maintain professionalism while being warm

---

## 🚀 Technical Implementation

### Backend (Server)
**File:** `server/src/controllers/chatbotController.ts`

**Key Functions:**

1. **`retrieveUserData(userId, email)`**
   - Fetches all relevant user data from database
   - Returns structured object with budget, expenses, family, achievements, etc.

2. **`detectIntent(message)`**
   - Analyzes user message to determine intent
   - Returns intent type (BUDGET_STATUS, EXPENSE_ANALYSIS, etc.)

3. **`generateResponse(intent, data, userName)`**
   - Generates personalized response based on intent and retrieved data
   - Applies RAG principles (never guesses, uses real data only)

4. **`sendMessage(req, res)`**
   - Main chat endpoint
   - Orchestrates: Intent Detection → Data Retrieval → Response Generation

5. **`getChatContext(req, res)`**
   - Provides initial welcome message with user context
   - Called when chat page loads

### Frontend (Client)
**File:** `client/src/pages/finmate/FinMatePage.tsx`

**Features:**
- Full-page dedicated chat interface
- Contextual welcome message
- Quick action buttons for common queries
- Real-time message updates
- Mobile-responsive design
- Beautiful gradient UI with animations

**Navigation:**
- Accessible via "FinMate" button on Dashboard
- Icon: Bot with Sparkles
- Color: Indigo-to-Purple gradient

---

## 📱 User Experience Flow

### 1. User Opens FinMate
```
Dashboard → Click "FinMate" button → FinMate Page loads
```

### 2. Initial Welcome
```
FinMate: "Hi [Name]! 👋 I'm FinMate, your RAG-powered financial assistant.

🔍 I retrieve and analyze your REAL financial data from FinPal to provide 
accurate, personalized guidance. I never guess!

✅ Budget Status: On track! You have ₹5,000 remaining from your ₹20,000 budget.

💬 How can I help you today? Ask me about:
• Budget status & spending analysis
• Expense breakdown by category
• Family finances (if connected)
• Achievements & stars
• Bills & reminders"
```

### 3. User Interaction
```
User: "Where did I spend more this month?"

FinMate: [Retrieves data from database]
         [Analyzes expense records]
         [Generates response with real data]
```

### 4. Response Delivery
```
FinMate: "📉 Expense Analysis for February (Based on your stored records)

Total Spent: ₹15,000 across 42 transactions

Category Breakdown:
🔥 Groceries: ₹6,500 (43%)
📌 Transportation: ₹4,200 (28%)
• Utilities: ₹2,800 (19%)
• Entertainment: ₹1,500 (10%)

💡 Insight: Your highest spending is on Groceries. Consider reviewing 
if this aligns with your priorities."
```

---

## 🎯 Intent Detection System

FinMate recognizes these intents:

| Intent | Keywords | Example Query |
|--------|----------|---------------|
| `GREETING` | hi, hello, hey | "Hello FinMate" |
| `BUDGET_STATUS` | budget, status, remaining | "What's my budget status?" |
| `BUDGET_HELP` | set budget, create budget | "How do I set a budget?" |
| `EXPENSE_ANALYSIS` | spent, spending, where, more | "Where did I spend more?" |
| `EXPENSE_TOTAL` | total expense, how much | "How much did I spend?" |
| `EXPENSE_SUMMARY` | summary, overview | "Show expense summary" |
| `FAMILY_INFO` | family, member | "Show family info" |
| `ACHIEVEMENT_INFO` | star, achievement, reward | "How many stars do I have?" |
| `REMINDER_INFO` | bill, reminder, due, pending | "What bills are pending?" |
| `MONTHLY_SUMMARY` | report, summary, overview | "Show monthly summary" |
| `SAVINGS_INFO` | saving, save | "How much did I save?" |
| `HELP` | help, what can you do | "What can you help with?" |
| `GENERAL` | (fallback) | Any other query |

---

## 🌟 One-Line Purpose Statement (For PPT)

> **"FinMate is a RAG-based chatbot that retrieves real financial data from FinPal to provide accurate, personalized budget guidance and family expense insights."**

---

## ✅ Success Criteria

### FinMate is successful when it:
1. ✅ Never provides made-up financial data
2. ✅ Always retrieves and displays real user data
3. ✅ Clearly indicates when data is missing
4. ✅ Provides actionable next steps
5. ✅ Maintains a friendly, non-judgmental tone
6. ✅ Respects family data privacy
7. ✅ Encourages positive financial behavior
8. ✅ Uses simple, accessible language

---

## 📈 Future Enhancements

### Potential Additions:
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Voice input/output
- [ ] Predictive insights ("You might exceed budget by month-end")
- [ ] Spending pattern recognition
- [ ] Bill payment reminders via chat
- [ ] Export chat history
- [ ] Smart suggestions based on spending patterns
- [ ] Integration with bank SMS parsing

---

## 🛠️ Maintenance & Updates

### When to Update FinMate:
- New data sources are added (e.g., investments, loans)
- New features are added to FinPal
- User feedback indicates missing capabilities
- Intent detection needs improvement
- Response templates need refinement

### Testing Checklist:
- [ ] Test with no budget set
- [ ] Test with budget exceeded
- [ ] Test with no expenses
- [ ] Test with family mode enabled/disabled
- [ ] Test with 0 achievements
- [ ] Test with missing data scenarios
- [ ] Test quick action buttons
- [ ] Test mobile responsiveness

---

## 📞 Support & Contact

For issues or questions about FinMate:
1. Check stored data in database
2. Verify user authentication
3. Check API endpoints are working
4. Review chatbot controller logs
5. Test with different user scenarios

---

**Built with ❤️ for FinPal Users**

*Making financial management accessible, accurate, and friendly!*
