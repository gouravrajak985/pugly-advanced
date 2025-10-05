
import { createClient } from 'redis';

const redisClient = createClient({
  url: 'redis://localhost:6379', // or use env variable: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
  process.exit(1)
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
     process.exit(1);
  }
};

export { redisClient, connectRedis };
