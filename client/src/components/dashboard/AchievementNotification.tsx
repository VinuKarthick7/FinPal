import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AchievementNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    month: number;
    year: number;
    budgetAmount: number;
    totalExpenses: number;
    metadata?: {
      savingsAmount?: number;
      budgetUtilization?: number;
      message?: string;
    };
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  isOpen,
  onClose,
  achievement,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);
      triggerConfetti();
      
      // Auto close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, showConfetti, onClose]);

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
    });

    fire(0.2, {
      spread: 60,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Notification Card */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0, opacity: 0, rotateY: 180 }}
              transition={{ 
                type: 'spring', 
                stiffness: 200, 
                damping: 20,
                duration: 0.6 
              }}
              className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-amber-500/30 pointer-events-auto relative overflow-hidden"
            >
              {/* Animated Background Stars */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    initial={{ 
                      x: Math.random() * 100 + '%', 
                      y: Math.random() * 100 + '%',
                      opacity: 0 
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.1 
                    }}
                  />
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Content */}
              <div className="relative text-center">
                {/* Sparkle Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center mb-4"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ 
                        rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 1.5, repeat: Infinity }
                      }}
                      className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl"
                    />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                      <Star className="w-12 h-12 text-white fill-white" />
                    </div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Achievement Unlocked! 🎉
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-white/90 mb-6"
                >
                  {achievement.metadata?.message || 'Great job! You managed your budget well this month ⭐'}
                </motion.p>

                {/* Achievement Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-semibold text-lg">
                      {MONTH_NAMES[achievement.month - 1]} {achievement.year}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Budget:</span>
                      <span className="text-white font-semibold">{formatCurrency(achievement.budgetAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Spent:</span>
                      <span className="text-white font-semibold">{formatCurrency(achievement.totalExpenses)}</span>
                    </div>
                    {achievement.metadata?.savingsAmount && achievement.metadata.savingsAmount > 0 && (
                      <div className="flex justify-between items-center pt-3 border-t border-white/20">
                        <span className="text-emerald-400 font-medium">Saved:</span>
                        <span className="text-emerald-400 font-bold text-lg">
                          {formatCurrency(achievement.metadata.savingsAmount)}
                        </span>
                      </div>
                    )}
                    {achievement.metadata?.budgetUtilization && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                          <span>Budget Utilization</span>
                          <span>{achievement.metadata.budgetUtilization}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.metadata.budgetUtilization}%` }}
                            transition={{ delay: 0.8, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/60 text-sm"
                >
                  Keep up the great work! 💪
                </motion.p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AchievementNotification;
