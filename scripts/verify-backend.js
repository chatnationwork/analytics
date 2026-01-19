const crypto = require('crypto');

const BASE_URL = 'http://localhost:3001/api/dashboard';

// Utilities
const generateEmail = () => `test_${crypto.randomBytes(4).toString('hex')}@example.com`;
const generatePassword = () => 'Password123!';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${method} ${endpoint} failed: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function verifyBackend() {
  console.log('🚀 Starting Backend Verification...\n');

  try {
    // 1. Signup
    const email = generateEmail();
    const password = generatePassword();
    console.log(`1. Testing Signup (${email})...`);
    
    // Signup returns token directly
    const signupData = await request('/auth/signup', 'POST', {
      email,
      password,
      name: 'Test User',
      organizationName: `Test Org ${crypto.randomBytes(2).toString('hex')}`,
    });
    
    // Check if signup returned token or if we need to login
    let token;
    if (signupData.accessToken || (signupData.data && signupData.data.accessToken)) {
      token = signupData.accessToken || signupData.data.accessToken;
      console.log('   ✅ Signup successful and returned token');
    } else {
        // If signup just returns user, we need to login
        console.log('   ✅ Signup successful (no token provided, logging in...)');
        const loginData = await request('/auth/login', 'POST', { email, password });
        token = loginData.accessToken || loginData.data.accessToken;
    }

    if (!token) throw new Error('Could not obtain access token');

    // 2. Get Profile
    console.log('\n2. Testing Get Profile (/auth/me)...');
    const profile = await request('/auth/me', 'GET', null, token);
    console.log('   ✅ Profile retrieved:', profile.data.email);

    // 3. Get Tenants
    console.log('\n3. Testing Get Tenants (/tenants)...');
    const tenants = await request('/tenants', 'GET', null, token);
    const tenantList = tenants.data || tenants; // Handle wrapped/unwrapped
    if (tenantList.length === 0) throw new Error('No tenants found after signup');
    const tenantId = tenantList[0].id;
    console.log(`   ✅ Tenants retrieved. Using Tenant ID: ${tenantId}`);

    // 4. Create CRM Integration
    console.log('\n4. Testing Create CRM Integration...');
    const crmDto = {
      name: 'Test CRM',
      apiUrl: 'https://crm.example.com',
      apiKey: 'test_api_key_123',
    };
    const crmIntegration = await request('/crm-integrations', 'POST', crmDto, token);
    const crmId = crmIntegration.data ? crmIntegration.data.id : crmIntegration.id;
    console.log('   ✅ CRM Integration created:', crmId);

    // 5. List CRM Integrations
    console.log('\n5. Testing List CRM Integrations...');
    const crmList = await request('/crm-integrations', 'GET', null, token);
    const listData = crmList.data || crmList;
    if (listData.length === 0) throw new Error('CRM List empty after creation');
    console.log(`   ✅ CRM Integrations listed: ${listData.length} found`);

    // 6. Generate API Key
    console.log('\n6. Testing Generate API Key...');
    const keyData = await request('/api-keys', 'POST', { name: 'Test Key' }, token);
    const apiKeyId = keyData.data ? keyData.data.id : keyData.id;
    const fullKey = keyData.data ? keyData.data.key : keyData.key;
    console.log('   ✅ API Key generated:', apiKeyId);
    console.log('   🔑 Full Key (shown once):', fullKey);

    // 7. List API Keys
    console.log('\n7. Testing List API Keys...');
    const keys = await request('/api-keys', 'GET', null, token);
    const keysList = keys.data || keys;
    if (keysList.length === 0) throw new Error('API Keys list empty after creation');
    console.log(`   ✅ API Keys listed: ${keysList.length} found`);

    // 8. Revoke API Key
    console.log('\n8. Testing Revoke API Key...');
    await request(`/api-keys/${apiKeyId}`, 'DELETE', null, token);
    console.log('   ✅ API Key revoked');

    // 9. Delete CRM Integration
    console.log('\n9. Testing Delete CRM Integration...');
    await request(`/crm-integrations/${crmId}`, 'DELETE', null, token);
    console.log('   ✅ CRM Integration deleted');

    console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

verifyBackend();
