import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Family, { IFamily, IFamilyMember } from '../models/Family';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Reminder from '../models/Reminder';
import Budget from '../models/Budget';

// Helper to get userId from request
const getUserId = (req: Request): mongoose.Types.ObjectId | undefined => {
  return (req.user as any)?._id;
};

// Get user's family or return null if not in a family
export const getMyFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    }).populate('members.userId', 'fullName email avatar');

    if (!family) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'You are not part of any family yet',
      });
    }

    // Update last active timestamp for user
    const memberIndex = family.members.findIndex(
      (m) => m.userId.toString() === userId?.toString()
    );
    if (memberIndex !== -1) {
      family.members[memberIndex].lastActive = new Date();
      await family.save();
    }

    res.status(200).json({
      success: true,
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new family
export const createFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is already in a family
    const existingFamily = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (existingFamily) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of a family. Leave your current family to create a new one.',
      });
    }

    const { familyName, nickname, relation, sharedBudget } = req.body;

    // Create new family with user as admin
    const family = new Family({
      familyName,
      createdBy: userId,
      members: [{
        userId: userId,
        email: user.email,
        nickname: nickname || user.fullName,
        relation: relation || 'Other',
        role: 'Admin',
        permissions: {
          canViewBudget: true,
          canEditBudget: true,
          canViewExpenses: true,
          canAddExpenses: true,
          canViewReminders: true,
          canManageMembers: true,
        },
        joinedAt: new Date(),
        status: 'active',
        avatar: user.avatar,
      }],
      sharedBudget: {
        amount: sharedBudget?.amount || 50000,
        period: sharedBudget?.period || 'monthly',
        categories: sharedBudget?.categories || [
          { name: 'Groceries', allocated: 10000, spent: 0 },
          { name: 'Utilities', allocated: 5000, spent: 0 },
          { name: 'Entertainment', allocated: 5000, spent: 0 },
          { name: 'Transport', allocated: 8000, spent: 0 },
          { name: 'Healthcare', allocated: 5000, spent: 0 },
          { name: 'Education', allocated: 10000, spent: 0 },
          { name: 'Other', allocated: 7000, spent: 0 },
        ],
      },
    });

    await family.save();

    res.status(201).json({
      success: true,
      message: 'Family created successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Join a family using 6-digit code
export const joinFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { familyCode, nickname, relation } = req.body;

    if (!familyCode || familyCode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid family code. Please enter a valid 6-digit code.',
      });
    }

    // Check if user is already in a family
    const existingFamily = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (existingFamily) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of a family. Leave your current family to join another.',
      });
    }

    // Find family by code
    const family = await Family.findOne({
      familyCode: familyCode.toUpperCase(),
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found. Please check the code and try again.',
      });
    }

    // Check if already a member
    if (family.members.some(m => m.userId.toString() === userId?.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this family.',
      });
    }

    // Add user as member
    const newMember: IFamilyMember = {
      userId: userId!,
      email: user.email,
      nickname: nickname || user.fullName,
      relation: relation || 'Other',
      role: 'Member',
      permissions: {
        canViewBudget: true,
        canEditBudget: false,
        canViewExpenses: true,
        canAddExpenses: true,
        canViewReminders: true,
        canManageMembers: false,
      },
      joinedAt: new Date(),
      status: 'active',
      avatar: user.avatar,
      lastActive: new Date(),
    };

    family.members.push(newMember);
    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: `Successfully joined ${family.familyName}!`,
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Invite a member to family
export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { email, relation, role } = req.body;

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Check if user has permission to invite
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    if (!currentMember?.permissions.canManageMembers) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite members',
      });
    }

    // Check if email is already a member
    if (family.members.some(m => m.email === email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'This person is already a member of your family',
      });
    }

    // Check for existing pending invitation
    const existingInvite = family.invitations.find(
      (inv) => inv.email === email.toLowerCase() && inv.status === 'pending'
    );

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: 'An invitation has already been sent to this email',
      });
    }

    // Add invitation
    family.invitations.push({
      email: email.toLowerCase(),
      relation: relation || 'Other',
      role: role || 'Member',
      invitedBy: userId!,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
    });

    await family.save();

    res.status(200).json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: { familyCode: family.familyCode },
    });
  } catch (error) {
    next(error);
  }
};

// Update member details
export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { memberId } = req.params;
    const { nickname, relation, role, permissions, monthlySpendingLimit } = req.body;

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Check permissions (only Admin can update other members)
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    const targetMember = family.members.find(
      (m) => m.userId.toString() === memberId
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // User can update their own profile, or Admin can update anyone
    const isSelf = memberId === userId?.toString();
    const isAdmin = currentMember?.role === 'Admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    // Update fields
    if (nickname) targetMember.nickname = nickname;
    if (relation) targetMember.relation = relation;
    
    // Only Admin can change roles and permissions
    if (isAdmin && !isSelf) {
      if (role) targetMember.role = role;
      if (permissions) targetMember.permissions = { ...targetMember.permissions, ...permissions };
      if (monthlySpendingLimit !== undefined) targetMember.monthlySpendingLimit = monthlySpendingLimit;
    }

    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from family
export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { memberId } = req.params;

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Check if user is admin
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    if (currentMember?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members',
      });
    }

    // Cannot remove yourself if you're the only admin
    const adminCount = family.members.filter(m => m.role === 'Admin').length;
    if (memberId === userId?.toString() && adminCount === 1) {
      return res.status(400).json({
        success: false,
        message: 'You cannot leave as you are the only admin. Transfer admin rights first.',
      });
    }

    // Remove member
    family.members = family.members.filter(
      (m) => m.userId.toString() !== memberId
    );

    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Leave family
export const leaveFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    // Check if user is the only admin
    const adminCount = family.members.filter(m => m.role === 'Admin').length;
    if (currentMember?.role === 'Admin' && adminCount === 1 && family.members.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'You cannot leave as you are the only admin. Transfer admin rights first or remove all other members.',
      });
    }

    // Remove user from family
    family.members = family.members.filter(
      (m) => m.userId.toString() !== userId?.toString()
    );

    // If no members left, deactivate family
    if (family.members.length === 0) {
      family.isActive = false;
    }

    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: 'You have left the family',
    });
  } catch (error) {
    next(error);
  }
};

// Update family settings & budget
export const updateFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { familyName, sharedBudget, settings } = req.body;

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Check if user has permission to edit budget
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    if (!currentMember?.permissions.canEditBudget) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update family settings',
      });
    }

    if (familyName) family.familyName = familyName;
    if (sharedBudget) {
      family.sharedBudget = {
        ...family.sharedBudget,
        ...sharedBudget,
      };
    }
    if (settings) {
      family.settings = {
        ...family.settings,
        ...settings,
      };
    }

    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: 'Family updated successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
};

// Get family dashboard with real data
export const getFamilyDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    }).populate('members.userId', 'fullName email avatar');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Get current month's date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all member IDs
    const memberIds = family.members.map(m => m.userId);

    // Fetch real transactions for all family members
    const transactions = await Transaction.find({
      user: { $in: memberIds },
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    // Calculate member-wise spending
    const memberSpending: Record<string, number> = {};
    const categorySpending: Record<string, number> = {};
    let totalFamilyExpenses = 0;
    let totalFamilyIncome = 0;

    transactions.forEach((tx) => {
      const memberId = tx.user.toString();
      
      if (tx.type === 'expense') {
        memberSpending[memberId] = (memberSpending[memberId] || 0) + tx.amount;
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
        totalFamilyExpenses += tx.amount;
      } else {
        totalFamilyIncome += tx.amount;
      }
    });

    // Convert transactions to plain objects with user as string
    const transactionsData = transactions.map(tx => {
      const txObj = tx.toObject();
      return {
        ...txObj,
        user: tx.user.toString(),
      };
    });

    // Get reminders for all members
    const reminders = await Reminder.find({
      user: { $in: memberIds },
      dueDate: { $gte: new Date() },
      isPaid: false,
    }).sort({ dueDate: 1 }).limit(10);

    // Prepare member data with real spending
    const membersWithSpending = family.members.map((member) => {
      const memberUser = member.userId as any;
      const memberObj = (member as any).toObject ? (member as any).toObject() : member;
      const memberIdStr = member.userId.toString();
      const spending = memberSpending[memberIdStr] || 0;
      
      return {
        ...memberObj,
        userId: memberIdStr,
        fullName: memberUser.fullName || member.nickname,
        email: memberUser.email || member.email,
        avatar: memberUser.avatar || member.avatar,
        monthlySpending: spending,
      };
    });

    // Update category spending in budget
    const updatedCategories = family.sharedBudget.categories.map(cat => {
      const spent = categorySpending[cat.name] || 0;
      const catObj = (cat as any).toObject ? (cat as any).toObject() : cat;
      return { ...catObj, spent };
    });

    const familyObj = family.toObject();
    const sharedBudgetObj = (family.sharedBudget as any).toObject 
      ? (family.sharedBudget as any).toObject() 
      : family.sharedBudget;

    res.status(200).json({
      success: true,
      data: {
        family: {
          ...familyObj,
          members: membersWithSpending,
          sharedBudget: {
            ...sharedBudgetObj,
            categories: updatedCategories,
          },
        },
        summary: {
          totalMembers: family.members.length,
          totalBudget: family.sharedBudget.amount,
          totalExpenses: totalFamilyExpenses,
          totalIncome: totalFamilyIncome,
          budgetUsedPercentage: family.sharedBudget.amount > 0 
            ? Math.round((totalFamilyExpenses / family.sharedBudget.amount) * 100)
            : 0,
          remainingBudget: family.sharedBudget.amount - totalFamilyExpenses,
          categoryBreakdown: Object.entries(categorySpending).map(([name, amount]) => ({
            name,
            amount,
            percentage: totalFamilyExpenses > 0 
              ? Math.round((amount / totalFamilyExpenses) * 100)
              : 0,
          })).sort((a, b) => b.amount - a.amount),
        },
        recentTransactions: transactionsData.slice(0, 20),
        upcomingReminders: reminders,
        lastSyncedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get member's expenses
export const getMemberExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { memberId } = req.params;
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Check permission
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    if (!currentMember?.permissions.canViewExpenses) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view expenses',
      });
    }

    // Build query
    const query: any = { user: memberId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    
    if (category) {
      query.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Regenerate family code
export const regenerateFamilyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Only admin can regenerate code
    const currentMember = family.members.find(
      (m) => m.userId.toString() === userId?.toString()
    );

    if (currentMember?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can regenerate the family code',
      });
    }

    // Generate new unique code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    let isUnique = false;

    while (!isUnique) {
      newCode = '';
      for (let i = 0; i < 6; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await Family.findOne({ familyCode: newCode });
      if (!existing) {
        isUnique = true;
      }
    }

    family.familyCode = newCode;
    family.lastSyncedAt = new Date();
    await family.save();

    res.status(200).json({
      success: true,
      message: 'Family code regenerated successfully',
      data: { familyCode: newCode },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyFamily,
  createFamily,
  joinFamily,
  inviteMember,
  updateMember,
  removeMember,
  leaveFamily,
  updateFamily,
  getFamilyDashboard,
  getMemberExpenses,
  regenerateFamilyCode,
};
