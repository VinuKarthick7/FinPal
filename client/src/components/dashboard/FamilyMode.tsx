import React, { useState } from 'react';
import { Plus, Lock, Zap, TrendingDown, Share2, Users, Shield, CheckCircle, UserPlus } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  role: 'Father' | 'Mother' | 'Child';
  avatar: string;
  email?: string;
  joinedDate?: string;
  monthlySpending?: number;
  status: 'active' | 'pending';
}

interface FamilyModeState {
  isEnabled: boolean;
  familyHead: string;
  members: FamilyMember[];
  sharedBudget: number;
  monthlyExpenses: number;
  familyCode?: string;
}

const FamilyMode: React.FC = () => {
  const [familyMode, setFamilyMode] = useState<FamilyModeState>({
    isEnabled: true,
    familyHead: 'Father',
    members: [
      {
        id: '1',
        name: 'Rahul Kumar',
        role: 'Father',
        avatar: '👨‍💼',
        email: 'rahul@example.com',
        joinedDate: '2024-01-15',
        monthlySpending: 15000,
        status: 'active',
      },
      {
        id: '2',
        name: 'Priya Kumar',
        role: 'Mother',
        avatar: '👩‍💼',
        email: 'priya@example.com',
        joinedDate: '2024-01-16',
        monthlySpending: 8000,
        status: 'active',
      },
      {
        id: '3',
        name: 'Aditya Kumar',
        role: 'Child',
        avatar: '👦',
        email: 'aditya@example.com',
        joinedDate: '2024-02-01',
        monthlySpending: 2500,
        status: 'active',
      },
    ],
    sharedBudget: 50000,
    monthlyExpenses: 25500,
    familyCode: 'FAM-2024-001',
  });

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMember = () => {
    if (newMemberEmail) {
      console.log('Inviting member:', newMemberEmail);
      setShowAddMember(false);
      setNewMemberEmail('');
    }
  };

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = familyMode.members.reduce((sum, member) => sum + (member.monthlySpending || 0), 0);
  const budgetPercentage = (totalExpenses / familyMode.sharedBudget) * 100;

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-3xl p-6 shadow-xl">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
              Family Mode
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage together, save together</p>
          </div>
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-100 to-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-green-700">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={14} className="text-purple-600" />
          <span className="font-semibold">{familyMode.members.length} Connected Members</span>
          <span className="text-gray-400">•</span>
          <Lock size={12} className="text-green-600" />
          <span className="font-medium">End-to-End Encrypted</span>
        </div>
      </div>

      {/* Family Head Badge */}
      <div className="bg-white/70 backdrop-blur-md border-2 border-white/80 rounded-2xl p-4 mb-4 shadow-md hover:shadow-lg transition-all hover:scale-[1.01]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="text-4xl">{familyMode.members[0].avatar}</div>
            <div className="absolute -bottom-1 -right-1 text-xl">👑</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Family Head</p>
              <CheckCircle size={12} className="text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{familyMode.members[0].name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield size={12} className="text-green-600" />
              <span className="text-xs text-green-700 font-bold">Admin Access • Full Control</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Budget Overview */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-2xl p-5 mb-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <TrendingDown size={18} />
            </div>
            <span className="text-sm font-bold opacity-95">Shared Family Budget</span>
          </div>
          <Lock size={16} className="opacity-80" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold">₹</span>
          <p className="text-3xl font-bold">{formatRupees(familyMode.sharedBudget)}</p>
        </div>
        <p className="text-xs opacity-90 mb-4">Monthly allocation for the family</p>
        
        {/* Budget Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden backdrop-blur-sm border border-white/30">
            <div 
              className="h-full bg-gradient-to-r from-green-400 via-green-300 to-yellow-200 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-90 font-medium">Spent: ₹ {formatRupees(totalExpenses)}</span>
            <span className="text-xs font-bold opacity-95 bg-white/20 px-2 py-0.5 rounded-full">{budgetPercentage.toFixed(1)}% used</span>
          </div>
        </div>
      </div>

      {/* Family Members Grid */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          Family Members
        </h3>
        
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
          {familyMode.members.map((member) => (
            <div
              key={member.id}
              className="bg-white/80 backdrop-blur-md border border-white/90 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:bg-white/95 hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl relative">
                    {member.avatar}
                    {member.status === 'active' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        member.role === 'Father' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : member.role === 'Mother'
                          ? 'bg-pink-100 text-pink-700 border border-pink-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg font-bold text-gray-900">₹</span>
                    <span className="text-sm font-bold text-gray-900">{formatRupees(member.monthlySpending || 0)}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">/month</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect New Member Button */}
      <button
        onClick={() => setShowAddMember(!showAddMember)}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] mb-3"
      >
        <UserPlus size={20} />
        <span>Connect Family Member</span>
      </button>

      {/* Add Member Form */}
      {showAddMember && (
        <div className="bg-white/80 backdrop-blur-md border-2 border-green-200 rounded-xl p-4 mb-3 shadow-md animate-in fade-in zoom-in duration-200">
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <UserPlus size={16} className="text-green-600" />
            Invite Family Member by Email
          </p>
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="family@example.com"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddMember}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
            >
              Send Invite
            </button>
            <button
              onClick={() => setShowAddMember(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 px-3 rounded-lg text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all hover:scale-[1.05]">
          <div className="text-2xl mb-1.5">📊</div>
          <p className="text-xs font-bold text-gray-700">Shared Budget</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all hover:scale-[1.05]">
          <div className="text-2xl mb-1.5">💳</div>
          <p className="text-xs font-bold text-gray-700">Bills Split</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all hover:scale-[1.05]">
          <div className="text-2xl mb-1.5">🔒</div>
          <p className="text-xs font-bold text-gray-700">Secure Sync</p>
        </div>
      </div>

      {/* Security Footer */}
      <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 border-2 border-green-200/60 rounded-xl p-4 text-center shadow-inner">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-1.5 bg-green-100 rounded-lg">
            <Lock size={14} className="text-green-600" />
          </div>
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Zap size={14} className="text-blue-600" />
          </div>
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Share2 size={14} className="text-purple-600" />
          </div>
        </div>
        <p className="text-xs text-gray-700 font-bold mb-2">End-to-End Encrypted • Real-time Sync • Privacy Protected</p>
        {familyMode.familyCode && (
          <div className="bg-white/80 rounded-lg px-3 py-2 border border-green-200">
            <p className="text-xs text-gray-600 font-medium">Family ID: <span className="font-bold text-green-700">{familyMode.familyCode}</span></p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #a855f7, #3b82f6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #9333ea, #2563eb);
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FamilyMode;
