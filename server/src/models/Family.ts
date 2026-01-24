import mongoose, { Document, Schema } from 'mongoose';

// Family member interface
export interface IFamilyMember {
  userId: mongoose.Types.ObjectId;
  email: string;
  nickname: string;
  relation: 'Father' | 'Mother' | 'Son' | 'Daughter' | 'Spouse' | 'Grandparent' | 'Other';
  role: 'Admin' | 'Member' | 'Viewer';
  permissions: {
    canViewBudget: boolean;
    canEditBudget: boolean;
    canViewExpenses: boolean;
    canAddExpenses: boolean;
    canViewReminders: boolean;
    canManageMembers: boolean;
  };
  monthlySpendingLimit?: number;
  joinedAt: Date;
  status: 'active' | 'pending' | 'inactive';
  avatar?: string;
  lastActive?: Date;
}

// Family interface
export interface IFamily extends Document {
  _id: mongoose.Types.ObjectId;
  familyCode: string;
  familyName: string;
  createdBy: mongoose.Types.ObjectId;
  members: IFamilyMember[];
  sharedBudget: {
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
    categories: {
      name: string;
      allocated: number;
      spent: number;
    }[];
  };
  settings: {
    currency: string;
    timezone: string;
    notificationsEnabled: boolean;
    autoSyncEnabled: boolean;
    privacyLevel: 'open' | 'restricted' | 'private';
  };
  invitations: {
    email: string;
    relation: string;
    role: string;
    invitedBy: mongoose.Types.ObjectId;
    invitedAt: Date;
    expiresAt: Date;
    status: 'pending' | 'accepted' | 'expired' | 'declined';
  }[];
  lastSyncedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Generate unique 6-digit family code
const generateFamilyCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const familyMemberSchema = new Schema<IFamilyMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },
  relation: {
    type: String,
    enum: ['Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Grandparent', 'Other'],
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Member', 'Viewer'],
    default: 'Member',
  },
  permissions: {
    canViewBudget: { type: Boolean, default: true },
    canEditBudget: { type: Boolean, default: false },
    canViewExpenses: { type: Boolean, default: true },
    canAddExpenses: { type: Boolean, default: true },
    canViewReminders: { type: Boolean, default: true },
    canManageMembers: { type: Boolean, default: false },
  },
  monthlySpendingLimit: {
    type: Number,
    default: null,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'inactive'],
    default: 'active',
  },
  avatar: {
    type: String,
    default: null,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

const familySchema = new Schema<IFamily>(
  {
    familyCode: {
      type: String,
      unique: true,
      required: true,
      default: generateFamilyCode,
    },
    familyName: {
      type: String,
      required: [true, 'Family name is required'],
      trim: true,
      maxlength: 50,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [familyMemberSchema],
    sharedBudget: {
      amount: { type: Number, default: 0 },
      period: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
      categories: [{
        name: { type: String, required: true },
        allocated: { type: Number, default: 0 },
        spent: { type: Number, default: 0 },
      }],
    },
    settings: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      notificationsEnabled: { type: Boolean, default: true },
      autoSyncEnabled: { type: Boolean, default: true },
      privacyLevel: { type: String, enum: ['open', 'restricted', 'private'], default: 'restricted' },
    },
    invitations: [{
      email: { type: String, required: true, lowercase: true },
      relation: { type: String, required: true },
      role: { type: String, default: 'Member' },
      invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      invitedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true },
      status: { type: String, enum: ['pending', 'accepted', 'expired', 'declined'], default: 'pending' },
    }],
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
familySchema.index({ familyCode: 1 });
familySchema.index({ 'members.userId': 1 });
familySchema.index({ 'members.email': 1 });
familySchema.index({ createdBy: 1 });

// Pre-save hook to ensure unique family code
familySchema.pre('save', async function (next) {
  if (this.isNew) {
    let isUnique = false;
    while (!isUnique) {
      const existingFamily = await Family.findOne({ familyCode: this.familyCode });
      if (!existingFamily) {
        isUnique = true;
      } else {
        this.familyCode = generateFamilyCode();
      }
    }
  }
  next();
});

// Method to check if user is admin
familySchema.methods.isAdmin = function (userId: mongoose.Types.ObjectId): boolean {
  const member = this.members.find(
    (m: IFamilyMember) => m.userId.toString() === userId.toString()
  );
  return member?.role === 'Admin';
};

// Method to check if user is member
familySchema.methods.isMember = function (userId: mongoose.Types.ObjectId): boolean {
  return this.members.some(
    (m: IFamilyMember) => m.userId.toString() === userId.toString()
  );
};

export const Family = mongoose.model<IFamily>('Family', familySchema);

export default Family;
