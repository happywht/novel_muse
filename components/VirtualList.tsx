import React, { useRef, useState, useEffect } from 'react';
import { getGlobalConfig, DEFAULT_CONFIG } from '../config/global';

// 虚拟列表包装组件
// 注意： 由于 react-window 2.x API 变化较大，这里使用普通滚动作为回退方案
// 待 react-window 2.x 稳定后可切换回虚拟滚动

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualListInner<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enableVirtualScroll, setEnableVirtualScroll] = useState(true);

  useEffect(() => {
    // 从全局配置读取虚拟滚动开关
    getGlobalConfig().then((config) => {
      setEnableVirtualScroll(config.features.enableVirtualScrolling);
    });
  }, []);

  // 根据 enableVirtualScroll 开关决定是否使用虚拟滚动
  // 当前实现：当 enableVirtualScroll 为 false 时，使用简单滚动
  // 未来可以在此处集成真正的虚拟滚动库

  // 简单的滚动列表实现（不使用虚拟滚动）
  // 如果需要真正的虚拟滚动，可以考虑降级到 react-window 1.x 或使用 react-virtualized
  return (
    <div ref={containerRef} className={className} style={{ height, overflow: 'auto' }}>
      {items.map((item, index) => (
        <div key={index} style={{ minHeight: itemHeight }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export const VirtualList = VirtualListInner as <T>(
  props: VirtualListProps<T>
) => React.ReactElement;

// 判断是否需要虚拟滚动（列表长度阈值）
// 从全局配置中读取阈值，支持异步调用
export const shouldUseVirtualScroll = async (itemCount: number): Promise<boolean> => {
  try {
    const config = await getGlobalConfig();
    const threshold = config.performance.virtualScrollThreshold;
    return itemCount > threshold;
  } catch (error) {
    console.warn('Failed to read virtual scroll threshold from config, using default:', error);
    // 向后兼容：读取失败时使用默认值50
    return itemCount > DEFAULT_CONFIG.performance.virtualScrollThreshold;
  }
};
