import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Lock,
  Shield,
  Copy,
  Share2,
  Check,
  UserPlus,
  Sparkles,
  Heart,
  ChevronRight,
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'active' | 'pending';
}

const FamilyModePage: React.FC = () => {
  const navigate = useNavigate();
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'join'>('connect');
  const [connectedMembers] = useState<FamilyMember[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate a random 6-digit code
  const generateFamilyCode = () => {
    setIsGeneratingCode(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setFamilyCode(code);
      setIsGeneratingCode(false);
    }, 1200);
  };

  // Copy code to clipboard
  const copyToClipboard = async () => {
    if (familyCode) {
      await navigator.clipboard.writeText(familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Share code
  const shareCode = async () => {
    if (familyCode && navigator.share) {
      try {
        await navigator.share({
          title: 'FinPal Family Code',
          text: `Join my family on FinPal! Use code: ${familyCode}`,
        });
      } catch (error) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  // Handle join family
  const handleJoinFamily = () => {
    if (joinCode.length === 6) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Navigate or show connected state
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 25%, #172554 50%, #1E3A8A 75%, #0F172A 100%)' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Safe Area Container */}
      <div className="relative z-10 flex flex-col min-h-screen min-h-[100dvh] pb-safe">
        {/* Header */}
        <header className="px-4 pt-safe">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white active:scale-95 transition-transform"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-xl border border-white/10">
                <Users size={20} className="text-secondary-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Family Mode</h1>
            </div>

            <div className="w-11 h-11 flex items-center justify-center">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-secondary-500/20 rounded-full border border-secondary-500/30">
                <div className="w-2 h-2 bg-secondary-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider">Secure</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-6 overflow-y-auto">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-4 mb-6 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full border border-emerald-500/30 mb-4">
              <Heart size={14} className="text-emerald-400" />
              <span className="text-sm text-emerald-300">Manage finances as a family</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Family Mode</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Connect with your loved ones and track expenses together securely
            </p>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/50 mb-6 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('connect')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'connect'
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Connect Family
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Join Family
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'connect' ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Connect Family Card */}
                <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 mb-4 shadow-2xl">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-lg">
                      <UserPlus size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">Connect Family</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Generate a secure family code to connect members and manage expenses together.
                      </p>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary-500/10 rounded-xl border border-secondary-500/20 mb-5">
                    <Shield size={16} className="text-secondary-400" />
                    <span className="text-xs text-secondary-400 font-medium">
                      End-to-end encrypted • Your data stays private
                    </span>
                  </div>

                  {/* Generated Code Display */}
                  <AnimatePresence mode="wait">
                    {familyCode ? (
                      <motion.div
                        key="code"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mb-5"
                      >
                        <div className="text-center mb-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                            Your Family Code
                          </p>
                          <div className="relative inline-flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl blur-lg opacity-30"></div>
                            <div className="relative flex gap-2 p-4 bg-surface-800/80 rounded-2xl border border-white/20">
                              {familyCode.split('').map((digit, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="w-11 h-14 flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-b from-white/10 to-transparent rounded-xl border border-white/10"
                                >
                                  {digit}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="text-center text-xs text-gray-500 mb-4">
                          Share this code with family members to connect
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={copyToClipboard}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                              copied
                                ? 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30'
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                            }`}
                          >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copied!' : 'Copy Code'}
                          </button>
                          <button
                            onClick={shareCode}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl font-semibold text-sm text-white shadow-lg shadow-primary-500/25 active:scale-95 transition-transform"
                          >
                            <Share2 size={18} />
                            Share Code
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="generate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={generateFamilyCode}
                        disabled={isGeneratingCode}
                        className="w-full py-4 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl font-bold text-white shadow-lg shadow-primary-500/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-70"
                      >
                        {isGeneratingCode ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating Code...
                          </>
                        ) : (
                          <>
                            <Sparkles size={20} />
                            Create a Code
                          </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-400 px-1">What you can do together</h4>
                  {[
                    { icon: Users, title: 'Track Family Expenses', desc: 'See combined spending in one place' },
                    { icon: Lock, title: 'Shared Budgets', desc: 'Set and monitor family budget goals' },
                    { icon: Shield, title: 'Secure & Private', desc: 'Your financial data stays protected' },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50"
                    >
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/30 to-emerald-500/30 rounded-xl">
                        <feature.icon size={20} className="text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-white">{feature.title}</h5>
                        <p className="text-xs text-slate-500">{feature.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-600" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Join Family Card */}
                <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 mb-4 shadow-2xl">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                      <Users size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">Join Family</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Enter the 6-digit code shared by your family member to connect
                      </p>
                    </div>
                  </div>

                  {/* Code Input */}
                  <div className="mb-5">
                    <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3 text-center">
                      Enter Family Code
                    </label>
                    <div className="flex gap-2 justify-center">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          type="text"
                          maxLength={1}
                          value={joinCode[index] || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value) {
                              const newCode = joinCode.split('');
                              newCode[index] = value;
                              setJoinCode(newCode.join(''));
                              // Auto-focus next input
                              if (index < 5 && value) {
                                const nextInput = document.querySelector<HTMLInputElement>(
                                  `input[data-index="${index + 1}"]`
                                );
                                nextInput?.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !joinCode[index] && index > 0) {
                              const prevInput = document.querySelector<HTMLInputElement>(
                                `input[data-index="${index - 1}"]`
                              );
                              prevInput?.focus();
                            }
                          }}
                          data-index={index}
                          className="w-12 h-14 text-center text-xl font-bold text-white bg-slate-900/80 rounded-xl border-2 border-slate-600/50 focus:border-emerald-500 focus:outline-none transition-colors"
                          inputMode="numeric"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Join Button */}
                  <button
                    onClick={handleJoinFamily}
                    disabled={joinCode.length !== 6}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl font-bold text-white shadow-lg shadow-violet-500/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Users size={20} />
                    Join Family
                  </button>
                </div>

                {/* Help Text */}
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg mt-0.5">
                      <Lock size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-1">Don't have a code?</h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ask your family member who created the family group to share their 6-digit code with you.
                        You can also switch to "Connect Family" to create your own family group.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connected Members Section (if any) */}
          {connectedMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <h4 className="text-sm font-semibold text-gray-400 px-1 mb-3">Connected Members</h4>
              <div className="space-y-2">
                {connectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <div className="text-3xl">{member.avatar}</div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-white">{member.name}</h5>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                      member.status === 'active'
                        ? 'bg-secondary-500/20 text-secondary-400'
                        : 'bg-gold-500/20 text-gold-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        member.status === 'active' ? 'bg-secondary-400' : 'bg-gold-400'
                      }`}></div>
                      <span className="text-xs font-medium capitalize">{member.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </main>

        {/* Bottom Safe Area */}
        <div className="h-safe"></div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-surface-800 to-surface-900 rounded-3xl p-8 text-center border border-white/10 shadow-2xl max-w-sm w-full"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center shadow-lg shadow-secondary-500/30">
                <Check size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Successfully Connected!</h3>
              <p className="text-gray-400 text-sm">
                You're now part of the family. Start tracking expenses together!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FamilyModePage;
