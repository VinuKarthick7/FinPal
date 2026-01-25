import React, { useState } from 'react';
import { Plus, Lock, Zap, TrendingDown, Share2, Users } from 'lucide-react';

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

  const totalExpenses = familyMode.members.reduce((sum, member) => sum + (member.monthlySpending || 0), 0);
  const budgetPercentage = (totalExpenses / familyMode.sharedBudget) * 100;

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-3xl p-6 shadow-lg">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Family Mode
          </h2>
          <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-green-700">Active</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">Connected Family • {familyMode.members.length} members</p>
      </div>

      {/* Family Head Badge */}
      <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{familyMode.members[0].avatar}</div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Family Head</p>
            <p className="text-lg font-bold text-gray-900">{familyMode.members[0].name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Lock size={12} className="text-green-600" />
              <span className="text-xs text-green-600 font-semibold">Secure • Admin</span>
            </div>
          </div>
          <div className="text-3xl">👑</div>
        </div>
      </div>

      {/* Shared Budget Overview */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 mb-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} />
            <span className="text-sm font-semibold opacity-90">Shared Family Budget</span>
          </div>
          <Lock size={16} className="opacity-70" />
        </div>
        <p className="text-3xl font-bold mb-1">₹ {familyMode.sharedBudget.toLocaleString('en-IN')}</p>
        <p className="text-xs opacity-80 mb-3">Monthly allocation</p>
        
        {/* Budget Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-green-300 to-green-100 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-80">Spent: ₹ {totalExpenses.toLocaleString('en-IN')}</span>
            <span className="text-xs font-bold opacity-90">{budgetPercentage.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Family Members Grid */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          Family Members
        </h3>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {familyMode.members.map((member) => (
            <div
              key={member.id}
              className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:bg-white/90"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl">{member.avatar}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        member.role === 'Father' 
                          ? 'bg-blue-100 text-blue-700'
                          : member.role === 'Mother'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {member.role}
                      </span>
                      {member.status === 'active' && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹ {(member.monthlySpending || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">/month</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect New Member Button */}
      <button
        onClick={() => setShowAddMember(!showAddMember)}
        className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mb-3"
      >
        <Plus size={20} />
        Connect Family Member
      </button>

      {/* Add Member Form */}
      {showAddMember && (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl p-4 mb-3 shadow-sm animate-in fade-in duration-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Invite by Email</p>
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="member@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddMember}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Send Invite
            </button>
            <button
              onClick={() => setShowAddMember(false)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">📊</div>
          <p className="text-xs font-semibold text-gray-700">Shared Budget</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">💳</div>
          <p className="text-xs font-semibold text-gray-700">Bills Split</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🔒</div>
          <p className="text-xs font-semibold text-gray-700">Secure Sync</p>
        </div>
      </div>

      {/* Security Footer */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200/50 rounded-xl p-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Lock size={14} className="text-green-600" />
          <Zap size={14} className="text-blue-600" />
          <Share2 size={14} className="text-purple-600" />
        </div>
        <p className="text-xs text-gray-600 font-medium">End-to-End Encrypted • Real-time Sync • Privacy Protected</p>
      </div>
    </div>
  );
};

export default FamilyMode;
