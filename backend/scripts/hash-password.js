const bcrypt = require('bcrypt');

// Hash password for demo account
const hashPassword = async () => {
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password for "password123":', hashedPassword);
};

hashPassword();