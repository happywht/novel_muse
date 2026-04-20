import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmDialog } from '@/components/modules/shared/common/ConfirmDialog';
import type { ConfirmOptions } from '@/components/modules/shared/common/ConfirmDialog';

/**
 * 确认对话框状态
 */
interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

/**
 * 默认状态
 */
const initialState: ConfirmState = {
  isOpen: false,
  message: '',
  resolve: () => {},
};

/**
 * Context 类型定义
 */
interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * useConfirm Hook
 *
 * 提供命令式确认对话框功能，返回 Promise 以支持 async/await 语法。
 * 必须在 ConfirmDialogProvider 内部使用。
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { confirm } = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: '删除角色',
 *       message: '确定要删除此角色吗？此操作不可撤销。',
 *       variant: 'danger',
 *       confirmText: '删除',
 *     });
 *
 *     if (confirmed) {
 *       // 执行删除操作
 *     }
 *   };
 *
 *   return <button onClick={handleDelete}>删除</button>;
 * }
 * ```
 */
export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm 必须在 ConfirmDialogProvider 内部使用');
  }
  return context;
}

/**
 * ConfirmDialogProvider 属性
 */
interface ConfirmDialogProviderProps {
  children: React.ReactNode;
}

/**
 * 确认对话框 Provider 组件
 *
 * 在应用根部包裹此组件，使所有子组件都能使用 useConfirm Hook。
 *
 * @example
 * ```tsx
 * // 在 App.tsx 中
 * import { ConfirmDialogProvider } from './hooks/useConfirm';
 *
 * function App() {
 *   return (
 *     <ConfirmDialogProvider>
 *       <YourApp />
 *     </ConfirmDialogProvider>
 *   );
 * }
 * ```
 */
export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [state, setState] = useState<ConfirmState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      stateRef.current.resolve(true);
    } finally {
      setIsLoading(false);
      setState(initialState);
    }
  }, []);

  const handleCancel = useCallback(() => {
    stateRef.current.resolve(false);
    setState(initialState);
    setIsLoading(false);
  }, []);

  const contextValue: ConfirmContextValue = {
    confirm,
  };

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        icon={state.icon}
        closeOnBackdrop={state.closeOnBackdrop}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export default useConfirm;
