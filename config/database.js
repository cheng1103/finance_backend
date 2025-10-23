const mongoose = require('mongoose');

const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectDB = async () => {
  try {
    console.log('[Database] Connecting to MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

    console.log('[Database] Connection established successfully.');
    console.log(`[Database] Host: ${conn.connection.host}`);
    console.log(`[Database] Name: ${conn.connection.name}`);
    console.log(`[Database] State: ${conn.connection.readyState === 1 ? 'connected' : 'not connected'}`);

    mongoose.connection.on('connected', () => {
      console.log('[Database] Mongoose connection is open.');
    });

    mongoose.connection.on('error', (error) => {
      console.error('[Database] Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[Database] Mongoose connection disconnected.');
    });

    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('[Database] MongoDB connection closed due to application termination.');
        process.exit(0);
      } catch (shutdownError) {
        console.error('[Database] Error while closing MongoDB connection:', shutdownError);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB Atlas:', error.message);

    if (error.message.includes('authentication failed')) {
      console.error('[Database] Authentication failed. Check username and password.');
    } else if (error.message.includes('network')) {
      console.error('[Database] Network error. Verify network access and IP allow list.');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('[Database] Missing MONGODB_URI environment variable.');
    }

    console.error('[Database] Troubleshooting steps:');
    console.error('  1. Confirm the MONGODB_URI value inside your environment configuration.');
    console.error('  2. Ensure MongoDB Atlas credentials are correct.');
    console.error('  3. Verify the server IP is added to the Atlas allow list.');
    console.error('  4. Check that MongoDB Atlas is reachable from the current network.');

    process.exit(1);
  }
};

const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: state === 1 ? 'healthy' : 'unhealthy',
      state: states[state],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
};

module.exports = { connectDB, checkDBHealth };
