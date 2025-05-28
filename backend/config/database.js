const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Mongoose 6 always behaves as if useCreateIndex is true and useFindAndModify is false
      // So, no need to specify them explicitly
      // For connection pooling, Mongoose handles this by default.
      // Default poolSize is 5. You can configure it if needed:
      // poolSize: 10, 
    });
    console.log('MongoDB Connected...');

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected.');
    });

  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB; 