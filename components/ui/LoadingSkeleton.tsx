import React from 'react';

/**
 * 快速骨架屏组件
 * 用于应用启动时的加载状态显示，优化用户体验
 */
export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* 动画加载图标 */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>

        {/* 主要加载文本 */}
        <p className="text-gray-400 text-lg mb-2">正在加载 Muse...</p>

        {/* 辅助说明文本 */}
        <p className="text-gray-500 text-sm mt-2">初次加载可能需要几秒钟</p>

        {/* 额外的加载提示 */}
        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>检测后端服务</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <span>加载项目数据</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span>准备创作环境</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 轻量级加载指示器
 * 用于内容区域的局部加载状态
 */
export function ContentLoader({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  );
}