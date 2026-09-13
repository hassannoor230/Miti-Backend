const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  const email = 'test@example.com';
  const pass = 'TestPass123!';
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name: 'Test User', email, phone: '+447123456789', role: 'customer', isTemporaryPassword: false });
    await user.hashPassword(pass);
    await user.save();
    console.log('Created:', user._id);
  } else {
    await user.hashPassword(pass);
    user.isTemporaryPassword = false;
    await user.save();
    console.log('Updated:', user._id);
  }
  const ok = await user.comparePassword(pass);
  console.log('comparePassword:', ok);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });