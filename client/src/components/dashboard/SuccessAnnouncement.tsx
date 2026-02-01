/**
 * Success Announcement Popup
 * 
 * Monthly Budget Achievement Reward Popup
 * Appears ONCE when user successfully managed budget last month
 * Shows only when user's expenses ≤ budget
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { achievementApi } from '@/lib/api';

interface SuccessAnnouncementProps {
  monthName: string;
  year: number;
  savingsAmount?: number;
  budgetUtilization?: number;
  message?: string;
  announcementKey?: string; // Optional - kept for backwards compatibility
  onDismiss: () => void;
}

export const SuccessAnnouncement: React.FC<SuccessAnnouncementProps> = ({
  monthName,
  year,
  savingsAmount = 0,
  budgetUtilization = 0,
  onDismiss,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = async () => {
    try {
      // Extract month from monthName (e.g., "January" -> 1)
      const monthMap: { [key: string]: number } = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
      };
      const month = monthMap[monthName];

      if (month && year) {
        // Mark popup as shown in database (per user, per month)
        await achievementApi.markPopupShown(month, year);
        console.log(`✅ Marked reward popup as shown for ${monthName} ${year}`);
      }
    } catch (error) {
      console.error('Error marking popup as shown:', error);
    }
    
    onDismiss();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 sm:pt-12 p-4 overflow-y-auto">
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                width: `${8 + Math.random() * 8}px`,
                height: `${8 + Math.random() * 8}px`,
                backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 6)],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animation: `confetti-fall ${2 + Math.random() * 2}s linear ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Popup Modal - Top Centered */}
      <div 
        className="relative bg-gradient-to-b from-amber-50 via-yellow-50 to-orange-50 rounded-3xl shadow-2xl w-full max-w-sm mx-auto z-[10001] overflow-hidden mb-8"
        style={{ animation: 'popup-scale 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-200/80 hover:bg-gray-300 transition-colors z-10"
          type="button"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="p-6 pt-5">
          {/* Top Icons Row */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">🏆</span>
            <span className="text-4xl">⭐</span>
            <span className="text-4xl">🎊</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-center text-blue-600 leading-tight mb-1">
            YOU SUCCESSFULLY
          </h1>
          <h1 className="text-xl sm:text-2xl font-extrabold text-center text-blue-600 leading-tight mb-1">
            CRACKED
          </h1>
          <h1 className="text-xl sm:text-2xl font-extrabold text-center text-blue-600 leading-tight">
            THE BUDGET! 🎉
          </h1>

          {/* Congratulations */}
          <p className="text-center text-base font-bold text-gray-700 mt-3 mb-4">
            CONGRATULATIONS!
          </p>

          {/* Month Badge */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-amber-200 rounded-full px-4 py-2 shadow-sm">
              <span className="text-lg">✨</span>
              <span className="font-bold text-gray-800">{monthName} {year}</span>
              <span className="text-lg">⭐</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-8 mb-5">
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">You Saved</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(savingsAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">Budget Used</p>
              <p className="text-2xl font-bold text-orange-500">{budgetUtilization}%</p>
            </div>
          </div>

          {/* Motivational Quote */}
          <div className="text-center mb-4">
            <p className="text-sm italic text-gray-600 font-medium">
              "Excellent! You're building great financial habits ⭐"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100/80 px-6 py-4 border-t border-gray-200/50">
          <p className="text-center text-sm text-gray-600">
            Keep up the excellent work! Your financial discipline is inspiring! 💪
          </p>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes popup-scale {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessAnnouncement;
