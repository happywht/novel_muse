import React from 'react';
import { Cloud, Database, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface DataSourceIndicatorProps {
  useBackend: boolean;
  isOnline?: boolean;
  className?: string;
}

/**
 * 数据来源指示器组件
 * 显示当前数据存储模式（云端同步/本地模式）
 */
export function DataSourceIndicator({ useBackend, isOnline = true, className = '' }: DataSourceIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 数据存储模式指示 */}
      {useBackend ? (
        <div className="flex items-center text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
          <Cloud className="w-3 h-3 mr-1" />
          <span className="font-medium">云端同步</span>
        </div>
      ) : (
        <div className="flex items-center text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
          <Database className="w-3 h-3 mr-1" />
          <span className="font-medium">本地模式</span>
        </div>
      )}

      {/* 网络状态指示 */}
      {isOnline ? (
        <div className="flex items-center text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
          <Wifi className="w-3 h-3 mr-1" />
          <span className="font-medium">在线</span>
        </div>
      ) : (
        <div className="flex items-center text-xs text-gray-400 bg-gray-500/10 px-2 py-1 rounded-lg border border-gray-500/20">
          <WifiOff className="w-3 h-3 mr-1" />
          <span className="font-medium">离线</span>
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑型数据来源指示器
 * 用于空间有限的场景
 */
export function CompactDataSourceIndicator({ useBackend, isOnline = true, className = '' }: DataSourceIndicatorProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* 数据存储模式指示 */}
      {useBackend ? (
        <div className="flex items-center text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          <Cloud className="w-2.5 h-2.5 mr-1" />
          <span>云端</span>
        </div>
      ) : (
        <div className="flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
          <HardDrive className="w-2.5 h-2.5 mr-1" />
          <span>本地</span>
        </div>
      )}

      {/* 网络状态指示 */}
      {isOnline ? (
        <div className="flex items-center text-[10px] text-green-400">
          <Wifi className="w-2.5 h-2.5" />
        </div>
      ) : (
        <div className="flex items-center text-[10px] text-gray-400">
          <WifiOff className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  );
}