// src/screens/dashboard/DashboardScreen.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react-native';
import apiClient from '../../api/client';
import { authStore } from '../../store/authStore';

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savings: number;
  budgetUsage: number;
  recentTransactions: any[];
  categoryBreakdown: any[];
}

const DashboardScreen = () => {
  const { user } = authStore();

  // Fetch dashboard data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>('/dashboard');
      return response.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.fullName}</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.balanceCard]}>
          <View style={styles.statIcon}>
            <Wallet color="#10b981" size={24} />
          </View>
          <Text style={styles.statLabel}>Total Balance</Text>
          <Text style={styles.statValue}>
            {formatCurrency(data?.balance || 0)}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.statCard, styles.smallCard, styles.incomeCard]}>
            <View style={styles.statIconSmall}>
              <ArrowDownRight color="#22c55e" size={20} />
            </View>
            <Text style={styles.statLabelSmall}>Income</Text>
            <Text style={styles.statValueSmall}>
              {formatCurrency(data?.totalIncome || 0)}
            </Text>
          </View>

          <View style={[styles.statCard, styles.smallCard, styles.expenseCard]}>
            <View style={styles.statIconSmall}>
              <ArrowUpRight color="#ef4444" size={20} />
            </View>
            <Text style={styles.statLabelSmall}>Expenses</Text>
            <Text style={styles.statValueSmall}>
              {formatCurrency(data?.totalExpenses || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Budget Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Overview</Text>
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>Monthly Budget</Text>
            <Text style={styles.budgetPercentage}>
              {Math.round((data?.budgetUsage || 0) * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(data?.budgetUsage || 0) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {data?.recentTransactions?.map((transaction, index) => (
          <View key={index} style={styles.transactionCard}>
            <View style={styles.transactionLeft}>
              <View
                style={[
                  styles.transactionIcon,
                  transaction.type === 'expense'
                    ? styles.expenseIcon
                    : styles.incomeIcon,
                ]}
              >
                {transaction.type === 'expense' ? (
                  <ArrowUpRight color="#ef4444" size={16} />
                ) : (
                  <ArrowDownRight color="#22c55e" size={16} />
                )}
              </View>
              <View>
                <Text style={styles.transactionCategory}>
                  {transaction.category}
                </Text>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                transaction.type === 'expense'
                  ? styles.expenseAmount
                  : styles.incomeAmount,
              ]}
            >
              {transaction.type === 'expense' ? '-' : '+'}
              {formatCurrency(transaction.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        {data?.categoryBreakdown?.map((category, index) => (
          <View key={index} style={styles.categoryCard}>
            <View style={styles.categoryLeft}>
              <View style={styles.categoryDot} />
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
            <Text style={styles.categoryAmount}>
              {formatCurrency(category.amount)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statsContainer: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceCard: {
    backgroundColor: '#ecfdf5',
  },
  smallCard: {
    flex: 1,
  },
  incomeCard: {
    backgroundColor: '#f0fdf4',
  },
  expenseCard: {
    backgroundColor: '#fef2f2',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
  statLabelSmall: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  budgetPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseIcon: {
    backgroundColor: '#fee2e2',
  },
  incomeIcon: {
    backgroundColor: '#dcfce7',
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  incomeAmount: {
    color: '#22c55e',
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});

export default DashboardScreen;
