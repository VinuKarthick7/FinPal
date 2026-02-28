// src/services/notificationService.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import DeviceInfo from 'react-native-device-info';

class NotificationService {
  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Request permission (iOS)
      await this.requestPermission();

      // Get FCM token
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);

      // Register device with backend
      await this.registerDevice(token);

      // Handle foreground messages
      messaging().onMessage(this.handleForegroundMessage);

      // Handle background/quit state messages
      messaging().setBackgroundMessageHandler(this.handleBackgroundMessage);

      // Handle notification tap (app opened from quit state)
      messaging().onNotificationOpenedApp(this.handleNotificationOpen);

      // Check if app was opened from a notification (quit state)
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        this.handleNotificationOpen(initialNotification);
      }

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Notification permission granted');
        } else {
          console.log('❌ Notification permission denied');
        }

        return enabled;
      } else {
        // Android permissions are granted by default
        return true;
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }

  /**
   * Register device with backend
   */
  async registerDevice(fcmToken: string): Promise<void> {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const platform = Platform.OS;
      const appVersion = DeviceInfo.getVersion();

      await apiClient.post('/notifications/register-device', {
        deviceId,
        fcmToken,
        platform,
        appVersion,
      });

      console.log('✅ Device registered for push notifications');
    } catch (error) {
      console.error('❌ Failed to register device:', error);
    }
  }

  /**
   * Handle foreground messages (app is open)
   */
  handleForegroundMessage = async (
    message: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    console.log('📬 Foreground message received:', message);

    // Display local notification
    await this.displayNotification(
      message.notification?.title || 'FinPal',
      message.notification?.body || '',
      message.data
    );
  };

  /**
   * Handle background messages (app in background or quit)
   */
  handleBackgroundMessage = async (
    message: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    console.log('📬 Background message received:', message);
    // Background messages are automatically displayed by FCM
  };

  /**
   * Handle notification tap (app opened from notification)
   */
  handleNotificationOpen = (
    message: FirebaseMessagingTypes.RemoteMessage
  ): void => {
    console.log('🔔 Notification opened:', message);

    // Navigate to appropriate screen based on notification type
    const { type, id } = message.data || {};

    // TODO: Implement navigation based on notification type
    switch (type) {
      case 'expense-alert':
        // Navigate to transaction details
        break;
      case 'budget-warning':
        // Navigate to budget screen
        break;
      case 'reminder':
        // Navigate to reminder details
        break;
      case 'achievement':
        // Navigate to achievements
        break;
      case 'family-update':
        // Navigate to family dashboard
        break;
      default:
        // Navigate to dashboard
        break;
    }
  };

  /**
   * Display local notification
   */
  async displayNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      // Create notification channel (Android)
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'finpal-default',
          name: 'FinPal Notifications',
          importance: AndroidImportance.HIGH,
        });
      }

      // Display notification
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: 'finpal-default',
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (error) {
      console.error('Failed to display notification:', error);
    }
  }

  /**
   * Send notification types
   */
  async sendExpenseAlert(amount: number, category: string, merchant: string): Promise<void> {
    // This would typically be triggered by the backend
    await this.displayNotification(
      'Expense Added',
      `₹${amount.toLocaleString('en-IN')} spent on ${category} at ${merchant}`,
      { type: 'expense-alert' }
    );
  }

  async sendBudgetWarning(category: string, percentage: number): Promise<void> {
    await this.displayNotification(
      'Budget Warning',
      `⚠️ You've used ${percentage}% of your ${category} budget`,
      { type: 'budget-warning', category }
    );
  }

  async sendReminderNotification(title: string, amount: number, dueDate: string): Promise<void> {
    await this.displayNotification(
      'Bill Reminder',
      `💡 ${title} - ₹${amount.toLocaleString('en-IN')} due on ${dueDate}`,
      { type: 'reminder' }
    );
  }

  async sendAchievementNotification(title: string): Promise<void> {
    await this.displayNotification(
      'Achievement Unlocked!',
      `🌟 Congratulations! You earned "${title}" badge`,
      { type: 'achievement' }
    );
  }

  /**
   * Schedule local notification (for reminders)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<string> {
    try {
      // Create trigger
      const trigger = {
        type: notifee.TriggerType.TIMESTAMP,
        timestamp: triggerDate.getTime(),
      };

      // Schedule notification
      const notificationId = await notifee.createTriggerNotification(
        {
          title,
          body,
          data,
          android: {
            channelId: 'finpal-default',
            smallIcon: 'ic_notification',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger as any
      );

      console.log('✅ Scheduled notification:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
      console.log('✅ Cancelled notification:', notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Get badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await notifee.getBadgeCount();
    }
    return 0;
  }

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(count);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await notifee.cancelAllNotifications();
    console.log('✅ Cleared all notifications');
  }
}

export default new NotificationService();
