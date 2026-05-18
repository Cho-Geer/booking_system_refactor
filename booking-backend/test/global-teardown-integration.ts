module.exports = async () => {
  console.log('🧹 Starting integration test teardown...');

  // Stop PostgreSQL container
  if (global.__POSTGRES_CONTAINER__) {
    console.log('🐘 Stopping PostgreSQL container...');
    try {
      await global.__POSTGRES_CONTAINER__.stop();
      console.log('✅ PostgreSQL container stopped');
    } catch (error) {
      console.error('❌ Error stopping PostgreSQL container:', error);
    }
  }

  // Stop Redis container
  if (global.__REDIS_CONTAINER__) {
    console.log('🗃️ Stopping Redis container...');
    try {
      await global.__REDIS_CONTAINER__.stop();
      console.log('✅ Redis container stopped');
    } catch (error) {
      console.error('❌ Error stopping Redis container:', error);
    }
  }

  // Clean up test environment file
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '..', '.env.test');

  if (fs.existsSync(envFile)) {
    try {
      fs.unlinkSync(envFile);
      console.log('✅ Test environment file cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up test environment file:', error);
    }
  }

  console.log('✅ Integration test teardown completed');
};
