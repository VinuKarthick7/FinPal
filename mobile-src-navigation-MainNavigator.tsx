// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, DollarSign, PlusCircle, MessageCircle, User } from 'lucide-react-native';
import { TouchableOpacity, StyleSheet } from 'react-native';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import ChatbotScreen from '../screens/chatbot/ChatbotScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AddTransactionScreen from '../screens/transactions/AddTransactionScreen';
import BudgetsScreen from '../screens/budgets/BudgetsScreen';
import RemindersScreen from '../screens/reminders/RemindersScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dashboard Stack
const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="DashboardMain"
      component={DashboardScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

// Transactions Stack
const TransactionsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="TransactionsList"
      component={TransactionsScreen}
      options={{ title: 'Transactions' }}
    />
    <Stack.Screen
      name="AddTransaction"
      component={AddTransactionScreen}
      options={{ title: 'Add Transaction', presentation: 'modal' }}
    />
  </Stack.Navigator>
);

// Chatbot Stack
const ChatbotStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="FinMateChat"
      component={ChatbotScreen}
      options={{ title: 'FinMate AI' }}
    />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen
      name="Budgets"
      component={BudgetsScreen}
      options={{ title: 'Budgets' }}
    />
    <Stack.Screen
      name="Reminders"
      component={RemindersScreen}
      options={{ title: 'Reminders' }}
    />
    <Stack.Screen
      name="Reports"
      component={ReportsScreen}
      options={{ title: 'Reports' }}
    />
    <Stack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </Stack.Navigator>
);

// Custom Add Button Component
const AddButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={styles.addButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <PlusCircle color="#ffffff" size={32} />
  </TouchableOpacity>
);

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          tabBarLabel: 'Home',
        }}
      />
      
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
        }}
      />
      
      <Tab.Screen
        name="AddButton"
        component={AddTransactionScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <AddButton onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={[props.style, styles.addButtonContainer]}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Transactions', { screen: 'AddTransaction' });
          },
        })}
      />
      
      <Tab.Screen
        name="FinMate"
        component={ChatbotStack}
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButtonContainer: {
    top: -20,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default MainNavigator;
