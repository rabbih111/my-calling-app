const express = require('express');
const axios = require('axios'); // HTTP রিকোয়েস্টের জন্য
const app = express();
const PORT = 3000;
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.json());

// রিচার্জ এন্ডপয়েন্ট
app.post('/recharge', async (req, res) => {
  const { userId, amount } = req.body;

  try {
    // CryptoMass API-তে পেমেন্ট রিকোয়েস্ট
    const response = await axios.post('https://api.cryptomass.com/payment', {
      apiKey: 'lEzmyLShI4M1YN3pkjtZOjai9tA3FL4FMPj6ZU06P2fkASBdIRCgPv1JryHtXaQ359iPyQqGp8PM2KR7ZfHwrlC7flpKOTMvQgyJCu79vEIYQ202EwfLTYABM0HtGD4P', // এখানে আপনার API Key বসান
      userId: userId,
      amount: amount,
      currency: 'BTC', // পেমেন্টের মুদ্রা
    });

    // পেমেন্ট সফল হলে
    if (response.data.success) {
      res.json({ message: 'Recharge successful!', transactionId: response.data.transactionId });
    } else {
      res.status(400).json({ message: 'Recharge failed!', error: response.data.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
const mongoose = require('mongoose');

// MongoDB সংযোগ
mongoose.connect('mongodb://localhost:27017/callingApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// ইউজার স্কিমা
const userSchema = new mongoose.Schema({
  userId: String,
  balance: Number,
  callHistory: Array,
});

const User = mongoose.model('User', userSchema);

// রিচার্জে ব্যালেন্স আপডেট করা
app.post('/recharge', async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (user) {
      user.balance += amount;
      await user.save();
      res.json({ message: 'Balance updated successfully!' });
    } else {
      res.status(404).json({ message: 'User not found!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});


// নতুন ইউজার রেজিস্ট্রেশন
app.post('/register', async (req, res) => {
    const { userId, password } = req.body;
  
    try {
      // চেক করুন ইউজার ইতিমধ্যে আছে কি না
      const existingUser = await User.findOne({ userId });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists!' });
      }
  
      // নতুন ইউজার তৈরি
      const newUser = new User({
        userId,
        password, // সাধারণত পাসওয়ার্ড এনক্রিপ্ট করতে হবে (পরে আমরা bcrypt ব্যবহার করব)
        balance: 0,
        callHistory: [],
      });
  
      await newUser.save();
      res.json({ message: 'Registration successful!' });
    } catch (error) {
      res.status(500).json({ message: 'Server error!', error: error.message });
    }
  });


  // ইউজার লগইন
app.post('/login', async (req, res) => {
    const { userId, password } = req.body;
  
    try {
      // ইউজার খুঁজুন
      const user = await User.findOne({ userId });
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials!' });
      }
  
      res.json({ message: 'Login successful!', userId, balance: user.balance });
    } catch (error) {
      res.status(500).json({ message: 'Server error!', error: error.message });
    }
  });

  
  // কল হিস্টোরি সংরক্ষণ করা
app.post('/call-history', async (req, res) => {
    const { userId, callDetails } = req.body;
  
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }
  
      user.callHistory.push(callDetails);
      await user.save();
  
      res.json({ message: 'Call history updated!' });
    } catch (error) {
      res.status(500).json({ message: 'Server error!', error: error.message });
    }
  });
  
  // কল হিস্টোরি রিটার্ন করা
  app.get('/call-history/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }
  
      res.json(user.callHistory);
    } catch (error) {
      res.status(500).json({ message: 'Server error!', error: error.message });
    }
  });

  
  // কল চার্জিং সিস্টেম
const CALL_RATE_PER_MINUTE = 0.05;  // প্রতি মিনিটের কল চার্জ (ডলার)

// কল স্টার্ট হওয়া
app.post('/start-call', async (req, res) => {
  const { userId, durationInMinutes } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // কলের চার্জ হিসাব করা
    const callCost = durationInMinutes * CALL_RATE_PER_MINUTE;

    // ইউজারের ব্যালেন্স চেক করা
    if (user.balance < callCost) {
      return res.status(400).json({ message: 'Insufficient balance!' });
    }

    // ব্যালেন্স কেটে নেওয়া
    user.balance -= callCost;
    await user.save();

    // কল হিস্টোরিতে সংরক্ষণ
    user.callHistory.push(`Called for ${durationInMinutes} minutes, cost: $${callCost}`);
    await user.save();

    res.json({ message: 'Call started!', remainingBalance: user.balance });
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});


const bcrypt = require('bcryptjs');

// রেজিস্ট্রেশন সময় পাসওয়ার্ড এনক্রিপ্ট করা
app.post('/register', async (req, res) => {
  const { userId, password } = req.body;

  try {
    // চেক করুন ইউজার ইতিমধ্যে আছে কি না
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists!' });
    }

    // পাসওয়ার্ড এনক্রিপ্ট করা
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      userId,
      password: hashedPassword,
      balance: 0,
      callHistory: [],
    });

    await newUser.save();
    res.json({ message: 'Registration successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});

// লগইন সময় পাসওয়ার্ড চেক করা
app.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    res.json({ message: 'Login successful!', userId, balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});


const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key'; // এটি গোপন রাখতে হবে

// লগইন সময় JWT টোকেন জেনারেট করা
app.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials!' });
    }

    // JWT টোকেন জেনারেট করা
    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful!', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error!', error: error.message });
  }
});

// JWT ভ্যালিডেশন
const authenticate = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'Access denied, token missing!' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token!' });
  }
};

// JWT সুরক্ষা যোগ করা
app.post('/start-call', authenticate, async (req, res) => {
  // কল স্টার্ট কোড এখানে থাকবে
});
