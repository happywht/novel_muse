/**
 * 初始状态定义
 *
 * 定义项目的默认初始状态和常量
 */

import { ProjectState } from '../types';

/**
 * 默认项目初始状态
 */
export const INITIAL_PROJECT: ProjectState = {
  id: 'default-project',
  lastModified: Date.now(),
  title: '',
  genre: '',
  premise: '',
  creativeSettings: {
    tone: '史诗',
    style: '',
    creativity: 0.8,
    targetAudience: '',
    promptProfile: 'WEB_NOVEL',
    styleTags: [],
    referenceText: '',
  },
  worldGenConfig: {
    detailLevel: 'Standard',
    focus: 'Balanced',
  },
  characters: [],
  worldSettings: [],
  plotOutline: '',
  plotHistory: [],
  drafts: [],
  chapters: [],
  customPrompts: {},
  plotNodes: [],
  echoes: [],
  timeline: [],
  currentWorldDate: '元年',
};
