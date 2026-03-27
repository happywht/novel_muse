import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 参数类型定义
 */
export type ParameterType = 'slider' | 'select' | 'toggle';

/**
 * 下拉选项
 */
export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * 参数配置
 */
export interface ParameterConfig {
  key: string;
  label: string;
  type: ParameterType;
  // slider 专用
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // select 专用
  options?: SelectOption[];
  // 通用
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  description?: string;
}

interface ParameterControlProps {
  config: ParameterConfig;
  disabled?: boolean;
}

/**
 * 滑块控制组件
 */
const SliderControl: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}> = ({ value, min, max, step, unit, onChange, disabled }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, rgb(249, 115, 22) 0%, rgb(249, 115, 22) ${percentage}%, rgb(51, 65, 85) ${percentage}%, rgb(51, 65, 85) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

/**
 * 下拉选择组件
 */
const SelectControl: React.FC<{
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  disabled?: boolean;
}> = ({ value, options, onChange, disabled }) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
};

/**
 * 开关切换组件
 */
const ToggleControl: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${value ? 'bg-orange-500' : 'bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200
          ${value ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

/**
 * 参数控制主组件
 */
export const ParameterControl: React.FC<ParameterControlProps> = ({
  config,
  disabled = false,
}) => {
  const { type, label, description, value, onChange } = config;

  const renderControl = () => {
    switch (type) {
      case 'slider':
        return (
          <SliderControl
            value={value as number}
            min={config.min ?? 0}
            max={config.max ?? 100}
            step={config.step ?? 1}
            unit={config.unit}
            onChange={onChange as (value: number) => void}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <SelectControl
            value={value as string | number}
            options={config.options ?? []}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{label}</span>
            <ToggleControl
              value={value as boolean}
              onChange={onChange as (value: boolean) => void}
              disabled={disabled}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {type !== 'toggle' && (
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      {renderControl()}
      {description && (
        <p className="text-[10px] text-slate-500">{description}</p>
      )}
    </div>
  );
};

export default ParameterControl;
