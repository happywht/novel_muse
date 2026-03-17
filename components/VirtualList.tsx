import React from 'react';

// 虚拟列表包装组件
// 如果react-window可用则使用它，否则回退到普通列表

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  height,
  renderItem,
  className = ''
}: VirtualListProps<T>) => {
  // 尝试使用react-window，如果不可用则回退到普通渲染
  try {
    // 动态导入react-window（如果已安装）
    // 注意：需要在项目中运行: npm install react-window @types/react-window
    const { FixedSizeList } = require('react-window');
    
    return (
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        className={className}
      >
        {({ index, style }: { index: number; style: React.CSSProperties }) => (
          <div style={style}>
            {renderItem(items[index], index)}
          </div>
        )}
      </FixedSizeList>
    );
  } catch (error) {
    // react-window未安装，回退到普通渲染（带性能提示）
    console.warn('react-window未安装，使用普通列表渲染。建议运行: npm install react-window @types/react-window');
    
    return (
      <div className={className} style={{ height, overflowY: 'auto' }}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }
};

// 判断是否需要虚拟滚动（列表长度阈值）
export const shouldUseVirtualScroll = (itemCount: number): boolean => {
  return itemCount > 50; // 超过50项建议使用虚拟滚动
};
