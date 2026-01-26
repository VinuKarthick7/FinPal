import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, TrendingUp, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FamilyModeCardProps {
  onClick?: () => void;
}

const FamilyModeCard: React.FC<FamilyModeCardProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/family');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 rounded-2xl cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-2xl"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
      </div>

      <div className="relative p-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm tracking-wide uppercase opacity-90">{t('family.title')}</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{t('family.connectYourFamily')}</h3>
            <p className="text-sm opacity-90">{t('family.trackExpensesTogether')}</p>
          </div>
          <div className="p-2 bg-white/10 backdrop-blur-sm rounded-full animate-pulse">
            <div className="w-2 h-2 bg-secondary-300 rounded-full"></div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center gap-1 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">{t('family.secure')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">{t('family.shared')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">{t('family.private')}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg p-3 group-hover:bg-white/30 transition-colors">
          <span className="text-sm font-semibold">{t('family.enableFamilyMode')}</span>
          <div className="p-1.5 bg-white/30 rounded-full group-hover:translate-x-1 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Bottom badge */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-xs">👨</div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 border-2 border-white flex items-center justify-center text-xs">👩</div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 border-2 border-white flex items-center justify-center text-xs">👦</div>
          </div>
          <span className="text-xs opacity-90">{t('family.moreFamilyMembers', { count: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

export default FamilyModeCard;
