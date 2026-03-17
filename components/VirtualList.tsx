import React, { useRef } from 'react';

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
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 简单的滚动列表实现（不使用虚拟滚动）
  // 如果需要真正的虚拟滚动，可以考虑降级到 react-window 1.x 或使用 react-virtualized
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, overflow: 'auto' }}
    >
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
export const shouldUseVirtualScroll = (itemCount: number): boolean => {
  return itemCount > 50; // 超过50项建议使用虚拟滚动
};
