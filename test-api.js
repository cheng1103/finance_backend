// API测试脚本
const http = require('http');

// 测试配置
const API_BASE = 'http://localhost:3001';
const TEST_USER = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '+60123456789',
  password: 'Test123456'
};

// 通用HTTP请求函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试函数
async function testAPI() {
  console.log('🚀 开始API集成测试...\n');

  try {
    // 1. 测试健康检查
    console.log('📊 测试1: 健康检查');
    const healthOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const healthResponse = await makeRequest(healthOptions);
    console.log(`状态码: ${healthResponse.status}`);
    console.log(`响应: ${JSON.stringify(healthResponse.data, null, 2)}`);
    
    if (healthResponse.status === 200) {
      console.log('✅ 健康检查通过\n');
    } else {
      console.log('❌ 健康检查失败\n');
      return;
    }

    // 2. 测试用户注册
    console.log('📊 测试2: 用户注册');
    const registerOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const registerResponse = await makeRequest(registerOptions, TEST_USER);
    console.log(`状态码: ${registerResponse.status}`);
    console.log(`响应: ${JSON.stringify(registerResponse.data, null, 2)}`);
    
    let authToken = null;
    if (registerResponse.status === 201 && registerResponse.data.data?.token) {
      authToken = registerResponse.data.data.token;
      console.log('✅ 用户注册成功\n');
    } else {
      console.log('❌ 用户注册失败\n');
    }

    // 3. 测试用户登录（如果注册失败的话）
    if (!authToken) {
      console.log('📊 测试3: 用户登录（使用已存在用户）');
      const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const loginResponse = await makeRequest(loginOptions, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      console.log(`状态码: ${loginResponse.status}`);
      console.log(`响应: ${JSON.stringify(loginResponse.data, null, 2)}`);
      
      if (loginResponse.status === 200 && loginResponse.data.data?.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ 用户登录成功\n');
      } else {
        console.log('❌ 用户登录失败\n');
      }
    }

    // 4. 测试贷款计算
    console.log('📊 测试4: 贷款计算');
    const calculateOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/calculator/calculate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const calculateData = {
      amount: 25000,
      term: 36,
      interestRate: 4.88
    };

    const calculateResponse = await makeRequest(calculateOptions, calculateData);
    console.log(`状态码: ${calculateResponse.status}`);
    console.log(`响应: ${JSON.stringify(calculateResponse.data, null, 2)}`);
    
    if (calculateResponse.status === 200) {
      console.log('✅ 贷款计算成功\n');
    } else {
      console.log('❌ 贷款计算失败\n');
    }

    // 5. 测试贷款申请
    console.log('📊 测试5: 贷款申请');
    const applyOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/loans/apply',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    const applicationData = {
      personalInfo: {
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        email: TEST_USER.email,
        phone: TEST_USER.phone
      },
      loanDetails: {
        amount: 25000,
        purpose: 'home-improvement',
        term: 36
      },
      financialInfo: {
        annualIncome: 60000,
        employmentStatus: 'full-time',
        creditScore: 'good'
      }
    };

    const applyResponse = await makeRequest(applyOptions, applicationData);
    console.log(`状态码: ${applyResponse.status}`);
    console.log(`响应: ${JSON.stringify(applyResponse.data, null, 2)}`);
    
    if (applyResponse.status === 201) {
      console.log('✅ 贷款申请成功\n');
    } else {
      console.log('❌ 贷款申请失败\n');
    }

    // 6. 测试获取利率信息
    console.log('📊 测试6: 获取利率信息');
    const ratesOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/calculator/rates',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const ratesResponse = await makeRequest(ratesOptions);
    console.log(`状态码: ${ratesResponse.status}`);
    console.log(`响应: ${JSON.stringify(ratesResponse.data, null, 2)}`);
    
    if (ratesResponse.status === 200) {
      console.log('✅ 获取利率信息成功\n');
    } else {
      console.log('❌ 获取利率信息失败\n');
    }

    console.log('🎉 API集成测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.log('\n💡 请确保：');
    console.log('1. 后端服务已启动 (npm run dev)');
    console.log('2. MongoDB服务正在运行');
    console.log('3. 端口3001未被其他程序占用');
  }
}

// 检查服务器是否可达
function checkServerHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

// 主执行函数
async function main() {
  console.log('🔍 检查后端服务状态...');
  
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    console.log('❌ 无法连接到后端服务');
    console.log('💡 请确保后端服务已启动：');
    console.log('   cd finance_backend');
    console.log('   npm run dev');
    console.log('   或运行 start.bat');
    return;
  }

  console.log('✅ 后端服务运行正常');
  console.log('');
  
  await testAPI();
}

// 运行测试
main();



