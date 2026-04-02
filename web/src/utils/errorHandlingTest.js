/**
 * 防御性编程测试工具
 * 用于测试safeRender函数对各种错误格式的处理能力
 */

// 模拟各种FastAPI错误格式
export const testErrorCases = {
  // 标准FastAPI 422错误
  fastAPIValidationError: {
    type: 'validation_error',
    loc: ['body', 'c'],
    msg: 'value is not a valid number',
    input: 0.1,
    ctx: {'limit_value': 'float'}
  },
  
  // FastAPI批量验证错误
  fastAPIBatchError: {
    detail: [
      { msg: 'field c is required', type: 'value_error.missing' },
      { msg: 'field lr must be greater than 0', type: 'value_error.number.not_gt' }
    ]
  },
  
  // 标准错误格式
  standardError: {
    detail: 'Internal server error'
  },
  
  // 自定义错误格式
  customError: {
    message: 'Custom error message',
    code: 'CUSTOM_ERROR'
  },
  
  // 嵌套错误
  nestedError: {
    error: {
      message: 'Nested error message',
      details: 'Additional error details'
    }
  },
  
  // 边界情况
  nullValue: null,
  undefinedValue: undefined,
  emptyString: '',
  numberValue: 42,
  booleanValue: true
};

// 测试safeRender函数
export const testSafeRender = (safeRenderFn) => {
  console.group('🧪 防御性编程测试');
  
  Object.entries(testErrorCases).forEach(([caseName, errorData]) => {
    try {
      const result = safeRenderFn(errorData, 'DEFAULT_FALLBACK');
      console.log(`✅ ${caseName}:`, result);
      
      // 验证结果确实是字符串
      if (typeof result !== 'string') {
        console.error(`❌ ${caseName}: 结果不是字符串类型`);
      }
    } catch (err) {
      console.error(`❌ ${caseName}: 抛出异常`, err);
    }
  });
  
  console.groupEnd();
};
