import { BookOpen, Map, Swords, Crown } from 'lucide-react';

export const STRUCTURE_TEMPLATES = [
  {
    id: 'SAVE_THE_CAT',
    name: '救猫咪 (Save the Cat)',
    icon: BookOpen,
    color: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 hover:border-rose-400/60',
    accentColor: 'text-rose-400',
    description: '好莱坞经典的15节拍叙事结构，适合商业化、高可读性的故事。',
    content:
      '1. 开场画面 (Opening Image): \n2. 主题呈现 (Theme Stated): \n3. 铺垫 (Set-up): \n4. 催化剂 (Catalyst): \n5. 争辩 (Debate): \n6. 进入第二幕 (Break into Two): \n7. B故事 (B Story): \n8. 游戏时间 (Fun and Games): \n9. 中点 (Midpoint): \n10. 坏人逼近 (Bad Guys Close In): \n11. 一无所有 (All Is Lost): \n12. 灵魂黑夜 (Dark Night of the Soul): \n13. 进入第三幕 (Break into Three): \n14. 结局 (Finale): \n15. 终场画面 (Final Image):',
  },
  {
    id: 'HERO_JOURNEY',
    name: "英雄之旅 (Hero's Journey)",
    icon: Map,
    color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-400/60',
    accentColor: 'text-amber-400',
    description: '约瑟夫·坎贝尔的经典12阶段原型旅程，适合奇幻与冒险题材。',
    content:
      '1. 平凡世界: \n2. 冒险召唤: \n3. 拒绝召唤: \n4. 遇见导师: \n5. 跨越门槛: \n6. 试炼、盟友与敌人: \n7. 接近洞穴深处: \n8. 严峻考验 (磨难): \n9. 获得嘉奖 (宝剑): \n10. 归路: \n11. 复活 (高潮): \n12. 满载而归:',
  },
  {
    id: 'THREE_ACT',
    name: '三幕式结构 (Three Act)',
    icon: Swords,
    color: 'from-sky-500/20 to-sky-600/5 border-sky-500/30 hover:border-sky-400/60',
    accentColor: 'text-sky-400',
    description: '最经典的戏剧理论框架：铺垫、对抗、结局。简洁有力。',
    content:
      '第一幕 (铺垫): \n- 激励事件: \n- 情节点一: \n\n第二幕 (对抗): \n- 试图解决问题: \n- 中点转折: \n- 一无所有时刻: \n- 情节点二: \n\n第三幕 (结局): \n- 高潮对决: \n- 新的平衡:',
  },
  {
    id: 'GOLDEN_THREE',
    name: '网文黄金三章',
    icon: Crown,
    color: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 hover:border-violet-400/60',
    accentColor: 'text-violet-400',
    description: '网络文学的黄金法则：前三章定生死，快速抓住读者。',
    content: '第一章：引入主角与冲突\n第二章：建立世界观与背景\n第三章：埋下伏笔与揭示秘密',
  },
];

export const BEAT_TAGS = [
  {
    id: 'INCITING_INCIDENT',
    label: '激励事件',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    activeColor: 'bg-rose-600 text-white',
  },
  {
    id: 'PLOT_POINT_1',
    label: '情节点一',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    activeColor: 'bg-amber-600 text-white',
  },
  {
    id: 'MIDPOINT',
    label: '中点转折',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'PLOT_POINT_2',
    label: '情节点二',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'CLIMAX',
    label: '全书高潮',
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
    activeColor: 'bg-red-600 text-white',
  },
  {
    id: 'RESOLUTION',
    label: '大结局',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    activeColor: 'bg-emerald-600 text-white',
  },
  {
    id: 'OTHER',
    label: '其它',
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    activeColor: 'bg-slate-600 text-white',
  },
];
