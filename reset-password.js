const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// MongoDB connection string - update if different
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function resetPassword() {
  try {
    console.log('🔐 FinPal Password Reset Tool\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user email
    const email = (await question('Enter email address: ')).toLowerCase().trim();
    
    // Find user
    const User = mongoose.model('User', new mongoose.Schema({
      fullName: String,
      email: String,
      phone: String,
      password: String,
      avatar: String,
      isVerified: Boolean,
      googleId: String,
      appleId: String,
      aiConsent: Boolean,
    }, { timestamps: true }));

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      rl.close();
      await mongoose.disconnect();
      return;
    }

    console.log(`\n✅ Found user: ${user.fullName} (${user.email})`);
    console.log(`   Account created via: ${user.googleId ? 'Google OAuth' : user.appleId ? 'Apple OAuth' : 'Email/Password'}`);
    console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}\n`);

    // Get new password
    const newPassword = await question('Enter new password (min 8 characters): ');
    
    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    const confirmPassword = await question('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    // Hash password with bcrypt (same as the app uses)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    user.password = hashedPassword;
    user.isVerified = true; // Ensure account is verified
    await user.save();

    console.log('\n✅ Password updated successfully!');
    console.log(`✅ Account verified: Yes`);
    console.log(`\nYou can now login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: (the one you just set)\n`);

    rl.close();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await mongoose.disconnect();
  }
}

resetPassword();
