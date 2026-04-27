import { test, expect } from '@playwright/test';

// Backend API tests require separate backend instance - all tests skipped
test.describe.skip('Backend Register API Test (Direct)', () => {
  test.skip('should register a new user successfully via API', 'Backend API tests require separate backend instance', async ({ request }) => {
    const uniqueEmail = `api-test-user-${Date.now()}@example.com`;
    const password = 'Test@Pass123';
    const name = 'API Test User';

    console.log('\n🧪 Testing backend registration API directly...');
    console.log(`📧 Email: ${uniqueEmail}`);
    console.log(`👤 Name: ${name}`);

    // Call the register endpoint directly
    const registerResponse = await request.post('http://localhost:3000/v1/auth/register', {
      data: {
        email: uniqueEmail,
        password: password,
        name: name
      }
    });

    console.log(`📊 Register response status: ${registerResponse.status()}`);
    
    const registerBody = await registerResponse.json();
    console.log('📦 Register response:', JSON.stringify(registerBody, null, 2));

    // Verify registration success
    expect(registerResponse.status()).toBe(201);
    expect(registerBody.user).toBeDefined();
    expect(registerBody.user.email).toBe(uniqueEmail);
    expect(registerBody.user.name).toBe(name);
    expect(registerBody.user.id).toBeDefined();
    expect(registerBody.user.role).toBeDefined();
    expect(registerBody.user.createdAt).toBeDefined();
    
    console.log('✅ User registered successfully!');
    console.log(` User ID: ${registerBody.user.id}`);
    console.log(`🎭 Role: ${registerBody.user.role}`);

    // Now try to login with the created user
    console.log('\n🔐 Testing login with newly created user...');
    
    const loginResponse = await request.post('http://localhost:3000/v1/auth/login', {
      data: {
        email: uniqueEmail,
        password: password
      }
    });

    console.log(`📊 Login response status: ${loginResponse.status()}`);
    
    const loginBody = await loginResponse.json();
    console.log('📦 Login response:', JSON.stringify(loginBody, null, 2));

    // Verify login success
    expect(loginResponse.status()).toBe(200);
    expect(loginBody.access_token).toBeDefined();
    expect(loginBody.refresh_token).toBeDefined();
    expect(loginBody.user.email).toBe(uniqueEmail);
    expect(loginBody.user.name).toBe(name);
    
    console.log('✅ Login successful!');
    console.log(`🔑 Access token received: ${loginBody.access_token.substring(0, 20)}...`);
    console.log(`🔑 Refresh token received: ${loginBody.refresh_token.substring(0, 20)}...`);

    console.log('\n✅✅✅ FULL REGISTRATION FLOW TEST PASSED! ✅✅✅');
    console.log('✅ User created via API');
    console.log('✅ User can login with credentials');
    console.log('✅ JWT tokens generated successfully');
  });

  test.skip('should reject duplicate email registration', 'Backend API tests require separate backend instance', async ({ request }) => {
    const duplicateEmail = `duplicate-api-${Date.now()}@example.com`;
    const password = 'Test@Pass123';

    console.log('\n🧪 Testing duplicate email rejection...');

    // First registration
    const firstResponse = await request.post('http://localhost:3000/v1/auth/register', {
      data: {
        email: duplicateEmail,
        password: password,
        name: 'First User'
      }
    });

    expect(firstResponse.status()).toBe(201);
    console.log('✅ First registration successful');

    // Second registration with same email
    const secondResponse = await request.post('http://localhost:3000/v1/auth/register', {
      data: {
        email: duplicateEmail,
        password: password,
        name: 'Second User'
      }
    });

    console.log(`📊 Second registration status: ${secondResponse.status()}`);
    const secondBody = await secondResponse.json();
    console.log('📦 Error response:', JSON.stringify(secondBody, null, 2));

    expect(secondResponse.status()).toBe(400);
    console.log('✅ Duplicate email correctly rejected');
  });

  test.skip('should reject weak password', 'Backend API tests require separate backend instance', async ({ request }) => {
    console.log('\n🧪 Testing weak password rejection...');

    const response = await request.post('http://localhost:3000/v1/auth/register', {
      data: {
        email: `weak-${Date.now()}@example.com`,
        password: 'weak',
        name: 'Weak Password User'
      }
    });

    console.log(`📊 Weak password response status: ${response.status()}`);
    const body = await response.json();
    console.log('📦 Error response:', JSON.stringify(body, null, 2));

    expect(response.status()).toBe(400);
    console.log('✅ Weak password correctly rejected');
  });

  test.skip('should reject invalid email format', 'Backend API tests require separate backend instance', async ({ request }) => {
    console.log('\n🧪 Testing invalid email rejection...');

    const response = await request.post('http://localhost:3000/v1/auth/register', {
      data: {
        email: 'not-an-email',
        password: 'Test@Pass123',
        name: 'Invalid Email User'
      }
    });

    console.log(`📊 Invalid email response status: ${response.status()}`);
    const body = await response.json();
    console.log('📦 Error response:', JSON.stringify(body, null, 2));

    expect(response.status()).toBe(400);
    console.log('✅ Invalid email correctly rejected');
  });
});
