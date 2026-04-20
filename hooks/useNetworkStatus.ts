import { useState, useEffect } from 'react';

/**
 * 网络状态监控 Hook
 * 监听用户的在线/离线状态变化
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 处理网络连接恢复
    const handleOnline = () => {
      console.log('🌐 网络连接已恢复');
      setIsOnline(true);
    };

    // 处理网络连接断开
    const handleOffline = () => {
      console.log('📡 网络连接已断开');
      setIsOnline(false);
    };

    // 添加事件监听器
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 清理函数
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * 网络状态详细信息 Hook
 * 提供更详细的网络连接信息
 */
export function useNetworkInformation() {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    effectiveType: '4g', // 默认值
    downlink: 10, // 默认值 Mbps
    rtt: 100, // 默认值 ms
    saveData: false, // 默认值
  });

  useEffect(() => {
    // 检查浏览器是否支持 Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      // 更新网络信息
      const updateNetworkInfo = () => {
        setNetworkInfo({
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        });
      };

      // 初始更新
      updateNetworkInfo();

      // 监听网络变化
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }

    // 如果不支持 Network Information API，至少监听基本的在线/离线状态
    const handleOnline = () => setNetworkInfo(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setNetworkInfo(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkInfo;
}