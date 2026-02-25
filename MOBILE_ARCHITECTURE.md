# FinPal Mobile App - Complete Architecture Plan

## 📱 Platform Strategy

### Technology Stack
- **Framework**: React Native (0.73+)
- **Language**: TypeScript
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand (consistent with web app)
- **API Client**: Axios
- **UI Components**: React Native Paper + Custom Components
- **Charts**: react-native-chart-kit / Victory Native
- **Animations**: React Native Reanimated 3
- **Backend**: Existing Node.js + Express + MongoDB

### Platform Support
- ✅ Android (API 26+, Android 8.0+)
- ✅ iOS (iOS 13.0+)

---

## 🏗️ Project Structure

```
mobile/
├── android/                      # Android native code
├── ios/                          # iOS native code
├── src/
│   ├── navigation/               # Navigation configuration
│   │   ├── AppNavigator.tsx     # Root navigator
│   │   ├── AuthNavigator.tsx    # Auth stack
│   │   ├── MainNavigator.tsx    # Main tab navigator
│   │   └── types.ts             # Navigation types
│   │
│   ├── screens/                  # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── expenses/
│   │   │   ├── AddExpenseScreen.tsx
│   │   │   └── ExpenseListScreen.tsx
│   │   ├── budget/
│   │   │   └── BudgetScreen.tsx
│   │   ├── family/
│   │   │   └── FamilyModeScreen.tsx
│   │   ├── finmate/
│   │   │   └── FinMateScreen.tsx
│   │   ├── achievements/
│   │   │   └── AchievementsScreen.tsx
│   │   ├── reminders/
│   │   │   └── RemindersScreen.tsx
│   │   ├── reports/
│   │   │   └── ReportsScreen.tsx
│   │   ├── profile/
│   │   │   └── ProfileScreen.tsx
│   │   └── transactions/
│   │       └── TransactionsScreen.tsx
│   │
│   ├── components/               # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── CategoryBreakdown.tsx
│   │   │   ├── BudgetProgress.tsx
│   │   │   └── TransactionList.tsx
│   │   ├── finmate/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── TypingIndicator.tsx
│   │   └── family/
│   │       ├── FamilyMemberCard.tsx
│   │       └── FamilyStats.tsx
│   │
│   ├── services/                 # API services
│   │   ├── api.ts               # Axios instance
│   │   ├── authService.ts
│   │   ├── expenseService.ts
│   │   ├── budgetService.ts
│   │   ├── familyService.ts
│   │   ├── chatbotService.ts
│   │   └── notificationService.ts
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── expenseStore.ts
│   │   ├── budgetStore.ts
│   │   └── familyStore.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useBiometric.ts
│   │   ├── useNotifications.ts
│   │   └── useOfflineSync.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── storage.ts           # Secure storage
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── navigation.ts
│   │
│   ├── theme/                    # Theme configuration
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   ├── i18n/                     # Internationalization
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   └── App.tsx                   # Root component
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── __tests__/                    # Test files
├── .env.example
├── .gitignore
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 Navigation Flow

### Auth Flow (Stack Navigator)
```
AuthStack
├── Login
├── Register
└── ForgotPassword
```

### Main Flow (Bottom Tab Navigator)
```
MainTabs
├── Dashboard (Stack)
│   └── Home
├── Expenses (Stack)
│   ├── ExpenseList
│   └── AddExpense
├── FinMate (Stack)
│   └── Chat
├── Budget (Stack)
│   └── BudgetOverview
└── More (Stack)
    ├── Profile
    ├── Family
    ├── Achievements
    ├── Reminders
    └── Reports
```

### Deep Linking
```
finpal://
├── login
├── dashboard
├── expenses/add
├── expenses/:id
├── finmate
├── budget
├── family
└── profile
```

---

## 📡 API Integration

### API Client Configuration
```typescript
// Reuse existing backend endpoints
Base URL: process.env.API_URL (configurable)

Headers:
- Authorization: Bearer {token}
- Content-Type: application/json

Endpoints:
- /api/auth/*          → Authentication
- /api/dashboard       → Dashboard data
- /api/expenses        → Expense management
- /api/budgets         → Budget operations
- /api/family          → Family mode
- /api/chatbot         → FinMate AI
- /api/achievements    → Achievements
- /api/reminders       → Reminders
- /api/reports         → Report generation
- /api/transactions    → Transaction history
```

### Offline Sync Strategy
1. **Local Storage**: AsyncStorage + SQLite
2. **Queue System**: Pending operations queue
3. **Sync on Reconnect**: Auto-sync when online
4. **Conflict Resolution**: Last-write-wins

---

## 🎨 UI/UX Design

### Design System

**Colors** (Fintech Theme)
```typescript
primary: '#3B82F6'      // Blue
secondary: '#10B981'    // Green (profit)
error: '#EF4444'        // Red (loss)
warning: '#F59E0B'      // Orange
background: '#F9FAFB'   // Light gray
surface: '#FFFFFF'
text: '#1F2937'
textSecondary: '#6B7280'
```

**Typography**
```typescript
heading1: { fontSize: 32, fontWeight: '700' }
heading2: { fontSize: 24, fontWeight: '600' }
heading3: { fontSize: 20, fontWeight: '600' }
body: { fontSize: 16, fontWeight: '400' }
caption: { fontSize: 14, fontWeight: '400' }
```

**Spacing**
```typescript
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
```

### Key Screens Layout

#### Dashboard
- Header with greeting & profile avatar
- Stats cards (Income, Expenses, Savings)
- Category breakdown chart
- Recent transactions
- Quick actions (Add Expense, View Budget)

#### FinMate Chat
- Chat history (scrollable)
- Message bubbles (user vs AI)
- Input field with send button
- Typing indicator
- Voice input button (future)

#### Add Expense
- Amount input (prominent)
- Category picker
- Merchant field
- Date picker
- Notes field
- Photo attachment (future)
- Submit button

---

## 🔒 Security Implementation

### Token Management
```typescript
// Secure storage for JWT tokens
import * as SecureStore from 'expo-secure-store'

Store:
- accessToken
- refreshToken
- userId
- userEmail

Auto-refresh on 401 errors
```

### Biometric Authentication
```typescript
// Using expo-local-authentication
Features:
- Fingerprint
- Face ID
- PIN fallback

Enable in Settings → Optional feature
```

### Data Encryption
- HTTPS enforced for all API calls
- Certificate pinning (production)
- Sensitive data encrypted at rest
- No plaintext storage of credentials

---

## 📲 Mobile-Specific Features

### Push Notifications
```typescript
Service: Firebase Cloud Messaging (FCM)

Notification Types:
1. Expense Alert: "You spent $X at [merchant]"
2. Budget Warning: "80% of monthly budget used"
3. Budget Exceeded: "Monthly budget exceeded!"
4. Monthly Summary: "Your January report is ready"
5. Achievement Unlocked: "You earned [achievement]!"
6. Family Activity: "[Member] added an expense"
7. Reminder: "[Reminder title] is due tomorrow"

Implementation:
- Request permission on app start
- Store FCM token on backend
- Handle foreground/background notifications
- Deep link to relevant screen
```

### Biometric Auth
```typescript
Features:
- Login with fingerprint/Face ID
- Optional (user preference)
- Fallback to password
- Re-auth for sensitive actions

Use Cases:
- App login
- View reports
- Delete transactions
- Family settings
```

### Camera Integration (Future)
```typescript
Bill Scanning:
- Capture receipt image
- OCR to extract: amount, merchant, date
- Auto-fill expense form
- Store image reference

Implementation:
- expo-camera
- Google Vision API / Tesseract
```

### Offline Mode
```typescript
Features:
- Cache dashboard data
- Queue expense additions
- Sync when online
- Visual indicator (offline mode)

Storage:
- AsyncStorage for small data
- SQLite for transactions/expenses
```

---

## 📦 State Management

### Zustand Stores (Migrated from Web)

```typescript
// authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  biometricLogin: () => Promise<void>
}

// expenseStore.ts
interface ExpenseState {
  expenses: Expense[]
  isLoading: boolean
  fetchExpenses: () => Promise<void>
  addExpense: (expense: CreateExpenseDto) => Promise<void>
  syncOfflineExpenses: () => Promise<void>
}

// budgetStore.ts
interface BudgetState {
  budgets: Budget[]
  currentBudget: Budget | null
  fetchBudgets: () => Promise<void>
  updateBudget: (id: string, data: UpdateBudgetDto) => Promise<void>
}

// familyStore.ts
interface FamilyState {
  family: Family | null
  members: FamilyMember[]
  fetchFamily: () => Promise<void>
  inviteMember: (email: string) => Promise<void>
}
```

---

## 🚀 Deployment Strategy

### Android (Google Play Store)

**Build Configuration**
```bash
# App signing
- Generate keystore
- Configure gradle signing
- Enable ProGuard/R8 (minification)

# Build types
- Debug: Development testing
- Release: Production build

# App versioning
versionCode: Numeric (auto-increment)
versionName: "1.0.0" (Semantic versioning)
```

**Bundle Optimization**
- Enable Hermes engine
- Split APKs by ABI
- Enable ProGuard
- Remove unused resources

**Play Store Listing**
- App name: FinPal - AI Finance Tracker
- Category: Finance
- Screenshots: 5-8 images
- Privacy policy URL
- Target audience: 18+

### iOS (Apple App Store)

**Build Configuration**
```bash
# Xcode setup
- Configure signing certificates
- Set up provisioning profiles
- App Store Connect access

# Build types
- Debug: Development
- Release: Production

# App versioning
CFBundleVersion: Build number
CFBundleShortVersionString: "1.0.0"
```

**Bundle Optimization**
- Dead code stripping
- Bitcode enabled (if applicable)
- Optimize images

**App Store Listing**
- App name: FinPal - AI Finance
- Category: Finance
- Screenshots: 3-10 per device type
- Privacy policy
- Age rating: 4+

### CI/CD Pipeline

**GitHub Actions / Bitrise**
```yaml
Workflow:
1. Pull Request:
   - Run tests
   - Lint check
   - Type check

2. Merge to main:
   - Build Android APK
   - Build iOS IPA
   - Run E2E tests

3. Tag release:
   - Build production bundles
   - Upload to Google Play (Internal Testing)
   - Upload to TestFlight
   - Create GitHub release
```

**Fastlane Integration**
```ruby
# Android
lane :android_deploy do
  gradle(task: "assembleRelease")
  upload_to_play_store(track: 'internal')
end

# iOS
lane :ios_deploy do
  build_app(scheme: "FinPal")
  upload_to_testflight
end
```

---

## 🧪 Testing Strategy

### Testing Pyramid

**Unit Tests** (Jest)
- Utility functions
- Store logic
- API service functions

**Integration Tests**
- API integration
- Storage operations
- Navigation flows

**E2E Tests** (Detox)
- Login flow
- Add expense
- Dashboard interaction
- FinMate chat

---

## 📊 Analytics & Monitoring

### Analytics Events
```typescript
Track:
- Screen views
- User actions (add expense, create budget)
- Feature usage (FinMate queries, reports)
- Errors and crashes

Tools:
- Firebase Analytics
- Sentry (error tracking)
```

---

## 🔧 Environment Configuration

### .env Files
```bash
# .env.development
API_URL=http://localhost:5000
ENVIRONMENT=development

# .env.production
API_URL=https://api.finpal.com
ENVIRONMENT=production
SENTRY_DSN=https://...
```

---

## 📈 Performance Optimization

### Best Practices
1. **Lazy Loading**: Code splitting for screens
2. **Image Optimization**: Use react-native-fast-image
3. **List Performance**: FlatList with proper keys
4. **Memoization**: React.memo, useMemo, useCallback
5. **Bundle Size**: Analyze with react-native-bundle-visualizer
6. **Animations**: Use native driver when possible

---

## 🎯 Migration Checklist

### Phase 1: Setup (Week 1)
- [x] Create architecture plan
- [ ] Initialize React Native project
- [ ] Setup folder structure
- [ ] Configure TypeScript
- [ ] Setup navigation
- [ ] Configure state management

### Phase 2: Core Features (Week 2-3)
- [ ] Authentication screens
- [ ] Dashboard screen
- [ ] Expense management
- [ ] Budget tracking
- [ ] API integration

### Phase 3: Advanced Features (Week 4-5)
- [ ] FinMate chatbot
- [ ] Family mode
- [ ] Achievements
- [ ] Reminders
- [ ] Reports (PDF generation)

### Phase 4: Mobile Enhancements (Week 6)
- [ ] Push notifications
- [ ] Biometric auth
- [ ] Offline mode
- [ ] Camera integration prep

### Phase 5: Testing & Polish (Week 7)
- [ ] Unit tests
- [ ] E2E tests
- [ ] UI/UX refinement
- [ ] Performance optimization

### Phase 6: Deployment (Week 8)
- [ ] Android build config
- [ ] iOS build config
- [ ] CI/CD setup
- [ ] Store submissions

---

## 🔗 Backend Changes (Minimal)

### API Enhancements
1. **Push Notification Endpoint**
   ```typescript
   POST /api/notifications/register
   Body: { fcmToken: string }
   ```

2. **Batch Operations** (for offline sync)
   ```typescript
   POST /api/expenses/batch
   Body: { expenses: Expense[] }
   ```

3. **Mobile-specific Headers**
   ```typescript
   X-Platform: "mobile"
   X-App-Version: "1.0.0"
   ```

### No Breaking Changes
- ✅ All existing endpoints remain the same
- ✅ Same authentication flow
- ✅ Same data models
- ✅ MongoDB structure unchanged

---

## 📱 Package Dependencies

### Core Dependencies
```json
{
  "react": "18.2.0",
  "react-native": "0.73.0",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "@react-navigation/bottom-tabs": "^6.5.11",
  "zustand": "^4.4.7",
  "axios": "^1.6.5",
  "react-native-paper": "^5.11.4",
  "react-native-reanimated": "^3.6.1",
  "react-native-gesture-handler": "^2.14.1",
  "react-native-safe-area-context": "^4.8.2",
  "react-native-screens": "^3.29.0",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "^14.1.0",
  "date-fns": "^3.2.0",
  "react-hook-form": "^7.49.3",
  "i18next": "^23.7.16",
  "react-i18next": "^14.0.0"
}
```

### Mobile-Specific
```json
{
  "expo-secure-store": "^12.8.1",
  "expo-local-authentication": "^13.8.0",
  "@react-native-firebase/app": "^19.0.1",
  "@react-native-firebase/messaging": "^19.0.1",
  "react-native-push-notification": "^8.1.1",
  "react-native-permissions": "^4.0.3",
  "react-native-camera": "^4.2.1",
  "react-native-image-picker": "^7.1.0",
  "react-native-pdf": "^6.7.3"
}
```

---

## 🎓 Key Conversion Notes

### Web vs Mobile Differences

| Feature | Web (React) | Mobile (React Native) |
|---------|-------------|----------------------|
| Routing | react-router-dom | React Navigation |
| Styling | Tailwind CSS | StyleSheet / Styled Components |
| Storage | localStorage | AsyncStorage / SecureStore |
| UI Components | HTML divs | View, Text, TouchableOpacity |
| Lists | HTML lists | FlatList, SectionList |
| Forms | HTML forms | TextInput + validation |
| PDF | jsPDF (client) | react-native-pdf / RN Print |
| Charts | Recharts | react-native-chart-kit |

---

## 🏁 Success Metrics

### KPIs to Track
- ✅ App store rating: Target 4.5+
- ✅ Crash-free rate: >99.5%
- ✅ Daily active users (DAU)
- ✅ Feature adoption rates
- ✅ API response times
- ✅ Offline sync success rate
- ✅ Push notification engagement

---

## 📞 Support & Maintenance

### Post-Launch
1. Monitor crash reports (Sentry)
2. Track analytics (Firebase)
3. Gather user feedback
4. Regular updates (bi-weekly sprints)
5. Security patches
6. OS version compatibility

---

**Architecture Plan Completed** ✅  
Ready for implementation!
