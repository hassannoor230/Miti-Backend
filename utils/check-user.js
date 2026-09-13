const User = require("./models/User");
(async () => {
  const u = await User.findOne({ email: "emma.jones@example.com" }).select("-passwordHash");
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
