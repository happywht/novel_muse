/**
 * Storage & Sync Configuration Tab
 * Configure storage backend, auto-save, and sync settings
 */

import React, { useState } from 'react';
import { Database, Save, RotateCcw } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface StorageTabProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const StorageTab: React.FC<StorageTabProps> = ({ showToast }) => {
  const { globalConfig, updateGlobalConfig } = useProjectStore();
  const [editing, setEditing] = useState(false);

  // 本地临时状态
  const [localConfig, setLocalConfig] = useState({
    backend: globalConfig.storage.backend,
    autoSaveInterval: globalConfig.storage.autoSaveInterval,
    backendSyncEnabled: globalConfig.storage.backendSync.enabled,
    backendSyncInterval: globalConfig.storage.backendSync.interval,
  });

  const handleSave = async () => {
    try {
      await updateGlobalConfig({
        storage: {
          ...globalConfig.storage,
          backend: localConfig.backend,
          autoSaveInterval: localConfig.autoSaveInterval,
          backendSync: {
            enabled: localConfig.backendSyncEnabled,
            interval: localConfig.backendSyncInterval,
          },
        },
      });

      showToast('存储配置已保存！', 'success');
      setEditing(false);
    } catch (error) {
      showToast('保存失败：' + (error as Error).message, 'error');
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm('确定要重置为默认配置吗？');
    if (confirmed) {
      setLocalConfig({
        backend: 'indexeddb',
        autoSaveInterval: 2000,
        backendSyncEnabled: true,
        backendSyncInterval: 30000,
      });
      showToast('已恢复为默认配置', 'success');
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Storage Backend */}
      <div>
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Database size={16} className="text-muse-400" /> 存储后端
        </h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
            <input
              type="radio"
              name="backend"
              value="indexeddb"
              checked={localConfig.backend === 'indexeddb'}
              onChange={(e) => setLocalConfig({ ...localConfig, backend: e.target.value as any })}
              disabled={!editing}
              className="w-4 h-4 text-muse-500"
            />
            <div>
              <div className="text-sm font-medium text-white">IndexedDB (本地)</div>
              <div className="text-xs text-slate-400">数据存储在浏览器本地，离线可用</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
            <input
              type="radio"
              name="backend"
              value="mysql"
              checked={localConfig.backend === 'mysql'}
              onChange={(e) => setLocalConfig({ ...localConfig, backend: e.target.value as any })}
              disabled={!editing}
              className="w-4 h-4 text-muse-500"
            />
            <div>
              <div className="text-sm font-medium text-white">MySQL (云端)</div>
              <div className="text-xs text-slate-400">数据存储在云端服务器，多设备同步</div>
            </div>
          </label>
        </div>
      </div>

      {/* Auto Save */}
      <div>
        <h4 className="text-sm font-bold text-white mb-4">自动保存</h4>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">保存间隔 (毫秒)</label>
          <input
            type="number"
            min="1000"
            max="10000"
            step="500"
            value={localConfig.autoSaveInterval}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, autoSaveInterval: parseInt(e.target.value) })
            }
            disabled={!editing}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                            focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1">推荐值：2000ms (2秒)</p>
        </div>
      </div>

      {/* Backend Sync */}
      <div>
        <h4 className="text-sm font-bold text-white mb-4">后端同步</h4>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.backendSyncEnabled}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, backendSyncEnabled: e.target.checked })
                }
                disabled={!editing}
                className="w-4 h-4 text-muse-500 rounded"
              />
              <span className="text-sm text-white">启用后端同步</span>
            </label>
          </div>

          {localConfig.backendSyncEnabled && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                同步间隔 (毫秒)
              </label>
              <input
                type="number"
                min="5000"
                max="120000"
                step="5000"
                value={localConfig.backendSyncInterval}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, backendSyncInterval: parseInt(e.target.value) })
                }
                disabled={!editing}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                    focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">推荐值：30000ms (30秒)</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-700">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 bg-muse-600 hover:bg-muse-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={16} /> 保存配置
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-colors"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              编辑配置
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={16} /> 重置
            </button>
          </>
        )}
      </div>
    </div>
  );
};
