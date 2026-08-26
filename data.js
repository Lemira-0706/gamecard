/* ===== 数据层：localStorage 本地存储 ===== */
const DB = {
  key: 'plane_game_data_v1',
  // 数据骨架
  schema: {
    config: { apiUrl: '', apiKey: '', model: '', temperature: 0.8 },
    worldview: { name: '', core: '', rules: '', background: '' },
    planes: [],      // 位面系统（任务/信息）
    story: [],       // 故事线节点
    player: null,    // 宿主
    targets: [],     // 目标对象
    supporters: [],  // 配角
    npcs: [],        // NPC
    chats: {},       // { conversationId: [{role,content,name}] }
    currentChat: 'main',
  },

  data: null,

  init() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) {}
    if (!raw) { raw = JSON.parse(JSON.stringify(this.schema)); this.seed(raw); }
    this.data = raw;
    this.save();
  },

  seed(d) {
    d.worldview = { name: '示例：镜界', core: '人类意识可投射进多重位面，宿主被选定为「锚点」。', rules: '1. 位面任务必须完成，否则锚点松动。\n2. 目标对象情感值影响结局走向。', background: '一座漂浮于现实之上的都市，由无数镜像位面构成……' };
    d.player = { name: '锚点-07', alias: '宿主', age: '', ability: '意识投射', attrs: '感知 Lv.3\n意志 Lv.2', desc: '刚被选定的新晋宿主，对镜界一无所知。', avatar: '🧑' };
    d.targets = [{ id: this.uid(), name: '林晚', role: '关键目标', relation: '初次相遇', avatar: '⭐', desc: '镜界守护者，冷漠但内心有裂痕。', attrs: '好感度 30\n警戒度 60', tags: '守护者/谜团' }];
    d.supporters = [{ id: this.uid(), name: '苏鸣', role: '协助者', relation: '盟友', avatar: '👤', desc: '前代宿主留下的向导。', attrs: '信任度 80', tags: '向导' }];
    d.npcs = [{ id: this.uid(), name: '镜中侍者', role: '信息提供者', avatar: '🤖', desc: '位面系统的信使。', attrs: '' }];
    d.planes = [{ id: this.uid(), title: '初入镜界', content: '前往「中央广场」与林晚会面，获取第一块锚点碎片。', status: 'active', reward: '锚点碎片 ×1', from: '位面系统', time: this.now() }];
    d.story = [{ id: this.uid(), title: '序章 · 觉醒', summary: '宿主在深夜接到位面系统的召唤，意识被拉入镜界。', time: this.now(), important: true }];
    d.chats['main'] = [{ role: 'system', content: '—— 位面系统已连接 ——', name: '系统' }];
  },

  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); },
  uid() { return 'id_' + Math.random().toString(36).slice(2, 9); },
  now() { return new Date().toLocaleString('zh-CN', { hour12: false }); },

  // 通用增删改查
  list(name) { return this.data[name] || []; },
  add(name, item) { const arr = this.list(name); arr.unshift({ id: this.uid(), ...item }); this.save(); return arr[0]; },
  update(name, id, patch) { const arr = this.list(name); const t = arr.find(x => x.id === id); if (t) { Object.assign(t, patch); this.save(); } },
  remove(name, id) { this.data[name] = this.list(name).filter(x => x.id !== id); this.save(); },
  setOne(name, val) { this.data[name] = val; this.save(); },
};
