/**
 * 认证中间件测试脚本
 * 用于验证 API Key 认证是否正常工作
 */

const API_BASE = 'http://localhost:3001/api';
const TEST_API_KEY = 'test-api-key-12345';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const tests: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean>): Promise<void> {
  try {
    const passed = await fn();
    tests.push({
      name,
      passed,
      message: passed ? '✅ PASSED' : '❌ FAILED',
    });
  } catch (error) {
    tests.push({
      name,
      passed: false,
      message: `❌ ERROR: ${error}`,
    });
  }
}

// 测试 1: 健康检查端点应该公开访问
async function testHealthEndpointPublic(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  return response.status === 200 && data.status === 'ok';
}

// 测试 2: 没有 API Key 的请求应该返回 401
async function testNoApiKeyRejected(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/projects`);
  return response.status === 401;
}

// 测试 3: 无效的 API Key 应该返回 401
async function testInvalidApiKeyRejected(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/projects`, {
    headers: { 'x-api-key': 'invalid-key' },
  });
  return response.status === 401;
}

// 测试 4: 有效的 API Key 应该成功
async function testValidApiKeyAccepted(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/projects`, {
    headers: { 'x-api-key': TEST_API_KEY },
  });
  // 可能是 200（成功）或 404（没有项目），但不应该是 401
  return response.status !== 401;
}

// 测试 5: 错误响应格式
async function testErrorResponseFormat(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/projects`);
  const data = await response.json();
  return (
    response.status === 401 &&
    data.error !== undefined &&
    data.code !== undefined
  );
}

async function runTests() {
  console.log('🔐 API 认证中间件测试\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Test API Key: ${TEST_API_KEY}\n`);
  console.log('运行测试...\n');

  await test('健康检查端点应该公开访问', testHealthEndpointPublic);
  await test('没有 API Key 的请求应该返回 401', testNoApiKeyRejected);
  await test('无效的 API Key 应该返回 401', testInvalidApiKeyRejected);
  await test('有效的 API Key 应该成功', testValidApiKeyAccepted);
  await test('错误响应格式应该包含 error 和 code', testErrorResponseFormat);

  console.log('\n测试结果:\n');
  tests.forEach((test) => {
    console.log(`${test.message} - ${test.name}`);
  });

  const passedCount = tests.filter((t) => t.passed).length;
  console.log(`\n总计: ${passedCount}/${tests.length} 通过`);

  if (passedCount === tests.length) {
    console.log('\n✅ 所有测试通过！');
  } else {
    console.log('\n❌ 部分测试失败，请检查配置');
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ 服务器未运行，请先启动服务器：');
    console.error('   cd server && npm run dev\n');
    console.error('并确保在 .env 文件中配置了 TEST_API_KEY:');
    console.error('   API_KEYS=test-api-key-12345\n');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);
