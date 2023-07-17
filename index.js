//required modules

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Connecting  to MongoDB
mongoose.connect('mongodb+srv://root:pp123@cluster0.70nqoe4.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define user schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  resetToken: String,
  resetTokenExpiration: Date,
});

const User = mongoose.model('User', userSchema);

// Register a new user using post
app.post('/stack/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password for security purpose
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// create User login using post
app.post('/stack/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found check your email' });
      }
  
      // Check if the password is correct
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password check your password' });
      }
  
      // Generate a JWT token
      const token = jwt.sign({ userId: user._id }, 'your-secret-key');
  
      // res.json({ token });
      res.json({ message: 'Signin successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// create forget password by post
app.post('/stack/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found check email' });
    }

    // Generate password reset token
    const resetToken = jwt.sign({ userId: user._id }, 'your-secret-key', {
      expiresIn: '1h',
    });

    // Update user's reset token and expiration
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'nestor41@ethereal.email',
            pass: 'UtZBFMWwTswYRFhDEV'
        },
      });
  
      const mailOptions = {
        from: 'nestor41@ethereal.email',
        to: user.email,
        subject: 'Password Reset',
        text: `You are receiving this email because you requested a password reset. Click the following link to reset your password: http://localhost:3000/reset-password/${resetToken}`,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.json({ message: 'Password reset email sent',resetToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// Reset password
app.post('/stack/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Find the user by reset token
    const user = await User.findOne({
      resetToken,
      resetTokenExpiration: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and reset token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users
app.get('/stack/users', async (req, res) => {
  try {
    // Find all users
    const users = await User.find();

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// creating a  question schema
const questionSchema = new mongoose.Schema({
  title: String,
  content: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  views: {
    type: Number,
    default: 0,
  },
  votes: {
    type: Number,
    default: 0,
  },
});

questionSchema.index({ title: 'text', content: 'text' });

const Question = mongoose.model('Question', questionSchema);

// Create a new question
app.post('/stack/questions', async (req, res) => {
  try {
    const { title, content, userId } = req.body;

    const newQuestion = new Question({
      title,
      content,
      user: userId,
    });

    await newQuestion.save();

    res.status(201).json({ message: 'Question created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all questions
app.get('/stack/questions', async (req, res) => {
  try {
    const questions = await Question.find().populate('user', 'username');

    res.json({ questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upvote a question
app.put('/stack/questions/:questionId/upvote', async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.votes += 1;
    await question.save();

    res.json({ message: 'Question upvoted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Increment views for a question
app.put('/stack/questions/:questionId/increment-views', async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.views += 1;
    await question.save();

    res.json({ message: 'Question views incremented successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/stack/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    // Find questions with similar keywords
    const questions = await Question.find({
      $text: { $search: keyword },
    });

    res.json({ questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const companies = [
  {
    company: 'ZOHO',
    Role: 'Web Developer',
    openings: '80'
  },
  {
    company: 'ZOHO',
    Role: 'Front-end Developer',
    openings: '120'
  },
  {
    company: 'CTS',
    Role: 'Backend Developer',
    openings: '60'
  },
  {
    company: 'Infosys',
    Role: 'Java Developer',
    openings: '500'
  },
  {
    company: 'CTS',
    Role: 'Accountant',
    openings: '10'
  },
  {
    company: 'TCS',
    Role: 'Manager',
    openings: '2'
  },
  {
    company: 'HCL',
    Role: 'Team Manager',
    openings: '6'
  },
  {
    company: 'Paragon',
    Role: 'Team Lead',
    openings: '8'
  }
];

app.get('/stack/companies', async (req, res) => {
  try {
    res.json({ companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//creating stack overflow page

app.get('/stackoverflow',(req,res)=>{
  res.send('Welcome to stackoverflow')
})

// //for logout
// app.post('/stack/logout', (req, res) => {

//   req.session.destroy((error) => {
//     if (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Logout failed' });
//     } else {
//       res.sendStatus(200);
//     }
//   });
// });
// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});

