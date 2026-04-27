module.exports = async () => {
  console.log('🧹 Starting global E2E test teardown...');
  
  // Stop PostgreSQL container if it exists
  if ((global as any).__POSTGRES_CONTAINER__) {
    console.log('🐘 Stopping PostgreSQL container...');
    try {
      await (global as any).__POSTGRES_CONTAINER__.stop();
      console.log('✅ PostgreSQL container stopped');
    } catch (error) {
      console.error('❌ Error stopping PostgreSQL container:', error);
    }
  }
  
  // Stop Redis container if it exists
  if ((global as any).__REDIS_CONTAINER__) {
    console.log('🗃️ Stopping Redis container...');
    try {
      await (global as any).__REDIS_CONTAINER__.stop();
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
  
  // Clean up any other test artifacts
  const coverageDir = path.join(__dirname, '..', 'coverage-e2e');
  if (fs.existsSync(coverageDir)) {
    try {
      fs.rmSync(coverageDir, { recursive: true, force: true });
      console.log('✅ E2E coverage directory cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up coverage directory:', error);
    }
  }
  
  console.log('✅ Global E2E test teardown completed');
};