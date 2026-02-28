// src/navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: ['finpal://', 'https://app.finpal.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          VerifyEmail: 'verify-email/:token',
        },
      },
      Main: {
        screens: {
          Dashboard: {
            screens: {
              DashboardMain: 'dashboard',
            },
          },
          Transactions: {
            screens: {
              TransactionsList: 'transactions',
              AddTransaction: 'transactions/add',
              TransactionDetails: 'transactions/:id',
            },
          },
          FinMate: {
            screens: {
              FinMateChat: 'finmate',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile',
              Budgets: 'budgets',
              Reminders: 'reminders',
              Reports: 'reports',
              Settings: 'settings',
            },
          },
        },
      },
    },
  },
};

// Deep link examples:
// finpal://verify-email/abc123 - Email verification
// finpal://transactions/add - Add transaction
// finpal://transactions/xyz789 - View transaction
// finpal://budgets - View budgets
// finpal://finmate - Open chatbot
