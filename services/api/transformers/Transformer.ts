/**
 * 转换器基类
 *
 * 提供前后端数据模型之间的双向转换能力
 */

/**
 * 转换器接口
 */
export interface Transformer<From, To> {
  /**
   * 从源类型转换为目标类型
   */
  transform(data: From): To;

  /**
   * 从目标类型转换为源类型（反向转换）
   */
  transformReverse(data: To): From;
}

/**
 * 转换器抽象基类
 * 提供通用的批量转换能力
 */
export abstract class BaseTransformer<From, To> implements Transformer<From, To> {
  /**
   * 转换单个对象（子类必须实现）
   */
  abstract transform(data: From): To;

  /**
   * 反向转换单个对象（子类必须实现）
   */
  abstract transformReverse(data: To): From;

  /**
   * 批量转换数组
   */
  transformArray(data: From[]): To[] {
    return data.map(item => this.transform(item));
  }

  /**
   * 批量反向转换数组
   */
  transformReverseArray(data: To[]): From[] {
    return data.map(item => this.transformReverse(item));
  }

  /**
   * 安全转换（处理 null/undefined）
   */
  transformSafe(data: From | null | undefined): To | null {
    if (data == null) return null;
    return this.transform(data);
  }

  /**
   * 安全反向转换
   */
  transformReverseSafe(data: To | null | undefined): From | null {
    if (data == null) return null;
    return this.transformReverse(data);
  }
}
