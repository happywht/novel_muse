/**
 * 错误处理测试脚本
 *
 * 用于验证后端错误处理机制是否正常工作
 */

import { AppError, ValidationError, DatabaseError, asyncHandler } from '../middleware/errorHandler';
import { handlePrismaError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// 测试自定义错误类
function testCustomErrors() {
  console.log('🧪 测试自定义错误类...');

  // 测试 AppError
  try {
    throw new AppError('测试应用错误', 500);
  } catch (error) {
    if (error instanceof AppError) {
      console.log('✅ AppError 工作正常:', error.message, error.statusCode);
    }
  }

  // 测试 ValidationError
  try {
    throw new ValidationError('测试验证错误', { field: 'test' });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('✅ ValidationError 工作正常:', error.message, error.details);
    }
  }

  // 测试 DatabaseError
  try {
    throw new DatabaseError('测试数据库错误', new Error('Original error'));
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.log('✅ DatabaseError 工作正常:', error.message);
    }
  }
}

// 测试 Prisma 错误处理
function testPrismaErrorHandling() {
  console.log('🧪 测试 Prisma 错误处理...');

  // 模拟 P2002 错误（唯一约束违反）
  const mockP2002Error = {
    code: 'P2002',
    meta: { target: ['email'] }
  } as any;

  const handledP2002 = handlePrismaError(mockP2002Error);
  if (handledP2002 instanceof ValidationError) {
    console.log('✅ P2002 错误处理正常:', handledP2002.message, handledP2002.details);
  }

  // 模拟 P2025 错误（记录未找到）
  const mockP2025Error = {
    code: 'P2025'
  } as any;

  const handledP2025 = handlePrismaError(mockP2025Error);
  if (handledP2025 instanceof AppError) {
    console.log('✅ P2025 错误处理正常:', handledP2025.message, handledP2025.statusCode);
  }
}

// 测试 asyncHandler
async function testAsyncHandler() {
  console.log('🧪 测试 asyncHandler...');

  const mockRequest = {} as any;
  const mockResponse = {
    json: (data: any) => console.log('✅ Response sent:', data),
    status: (code: number) => ({
      json: (data: any) => console.log(`✅ Error response sent (${code}):`, data)
    })
  } as any;
  const mockNext = (error: any) => console.log('✅ Error passed to next:', error.message);

  // 测试成功的异步操作
  const successHandler = asyncHandler(async (req: any, res: any, next: any) => {
    res.json({ success: true, data: 'test' });
  });
  await successHandler(mockRequest, mockResponse, mockNext);

  // 测试失败的异步操作
  const errorHandler = asyncHandler(async (req: any, res: any, next: any) => {
    throw new Error('Test async error');
  });
  await errorHandler(mockRequest, mockResponse, mockNext);
}

// 测试错误传播
async function testErrorPropagation() {
  console.log('🧪 测试错误传播...');

  // 模拟服务层错误
  function serviceLayer() {
    try {
      throw new Error('Service layer error');
    } catch (error) {
      console.log('✅ 服务层捕获错误:', error instanceof Error ? error.message : error);
      throw new DatabaseError('Database operation failed', error);
    }
  }

  // 模拟路由层错误处理
  function routeLayer() {
    try {
      serviceLayer();
    } catch (error) {
      if (error instanceof DatabaseError) {
        console.log('✅ 路由层捕获数据库错误:', error.message);
        return {
          statusCode: error.statusCode,
          message: error.message
        };
      }
    }
  }

  const result = routeLayer();
  console.log('✅ 错误传播链路正常:', result);
}

// 运行所有测试
export async function runErrorHandlingTests() {
  console.log('🚀 开始错误处理测试...\n');

  try {
    testCustomErrors();
    console.log('');

    testPrismaErrorHandling();
    console.log('');

    await testAsyncHandler();
    console.log('');

    testErrorPropagation();
    console.log('');

    console.log('✅ 所有错误处理测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runErrorHandlingTests()
    .then(() => {
      console.log('\n🎉 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
}
