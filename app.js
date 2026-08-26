/* ===== 主逻辑 ===== */
const content = document.getElementById('content');
let currentModule = 'chat';
let editingCard = null; // {module, id}

/* ---------- 工具 ---------- */
function el(html) { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstChild; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function avatarOf(item) { return item.avatar || '🎴'; }

/* ---------- 路由 ---------- */
const routes = {
  chat: renderChat,
  worldview: () => renderSingle('worldview', '世界观设定', '🌌 整个游玩的背景根基，所有模块受其约束。'),
  planes: () => renderList('planes', '位面系统', '🎴 向宿主下发任务、传达信息的核心存在。', ['title', 'content', 'status', 'reward', 'from'], { title: '新任务', content: '', status: 'active', reward: '', from: '位面系统' }),
  story: () => renderList('story', '故事线', '📖 整个事件的重要发展走向。', ['title', 'summary', 'important', 'time'], { title: '新节点', summary: '', important: false, time: DB.now() }),
  player: () => renderSingle('player', '玩家（宿主）', '🧑 操控的核心角色。', true),
  targets: () => renderList('targets', '目标对象', '⭐ 除宿主外最重要的角色。', ['name', 'role', 'relation', 'desc', 'attrs', 'tags'], { name: '新角色', role: '目标对象', relation: '', avatar: '⭐', desc: '', attrs: '', tags: '' }),
  supporters: () => renderList('supporters', '配角', '👥 推动剧情的重要配角。', ['name', 'role', 'relation', 'desc', 'attrs', 'tags'], { name: '新配角', role: '配角', relation: '', avatar: '👤', desc: '', attrs: '', tags: '' }),
  npcs: () => renderList('npcs', 'NPC', '🤖 场景中的普通存在。', ['name', 'role', 'desc', 'attrs'], { name: '新NPC', role: '', avatar: '🤖', desc: '', attrs: '' }),
};

function navigate(module) {
  currentModule = module;
  document.querySelectorAll('.module-item').forEach(b => b.classList.toggle('active', b.dataset.module === module));
  (routes[module] || renderChat)();
}

/* ---------- 通用：单对象卡片（世界观/玩家） ---------- */
function renderSingle(module, title, desc, isPlayer) {
  const obj = DB.data[module] || {};
  content.innerHTML = '';
  const page = el(`<div class="page"><div class="page-head"><div><h2>${title}</h2><div class="desc">${desc}</div></div></div></div>`);
  const grid = el(`<div class="card-grid"></div>`);
  const card = el(`<div class="card" style="grid-column:1/-1;cursor:default"><div class="detail-head"><div class="big-avatar">${avatarOf(obj)}</div><div><h2 style="font-size:18px">${escapeHtml(obj.name || title)}</h2><div class="desc">${escapeHtml(obj.core || obj.alias || '')}</div></div><button class="primary-btn" id="edit-single" style="margin-left:auto">编辑</button></div>
    ${Object.entries(obj).filter(([k]) => !['id','name','core','alias','avatar'].includes(k)).map(([k, v]) => `<div class="detail-section"><h4>${fieldLabel(k)}</h4><p>${escapeHtml(v) || '<span style="color:#aab">（空）</span>'}</p></div>`).join('')}
  </div>`);
  grid.appendChild(card);
  page.appendChild(grid);
  content.appendChild(page);
  card.querySelector('#edit-single').onclick = () => openCardEditor(module, obj, isPlayer);
}

/* ---------- 通用：列表卡片 ---------- */
function renderList(module, title, desc, fields, template) {
  content.innerHTML = '';
  const page = el(`<div class="page"><div class="page-head"><div><h2>${title}</h2><div class="desc">${desc}</div></div></div></div>`);
  const toolbar = el(`<div class="toolbar"><input class="search-input" placeholder="搜索…"><button class="primary-btn" id="add-btn">+ 新建卡片</button></div>`);
  const grid = el(`<div class="card-grid"></div>`);
  page.appendChild(toolbar); page.appendChild(grid);
  content.appendChild(page);

  const render = () => {
    const kw = toolbar.querySelector('.search-input').value.toLowerCase();
    const arr = DB.list(module).filter(it => !kw || JSON.stringify(it).toLowerCase().includes(kw));
    grid.innerHTML = arr.length ? '' : `<div class="c-empty">暂无数据，点击右上角新建卡片</div>`;
    arr.forEach(it => {
      const isPlane = module === 'planes';
      const statusCls = isPlane ? `status-${it.status || 'active'}` : '';
      const c = el(`<div class="card ${isPlane ? 'task-card ' + statusCls : ''}">
        <div class="c-avatar">${avatarOf(it)}</div>
        <h3>${escapeHtml(it.name || it.title || '未命名')}</h3>
        <div class="c-meta">${escapeHtml(it.summary || it.content || it.desc || it.role || '')}</div>
        ${isPlane ? `<div class="t-status" style="margin-top:10px;display:inline-block">${statusText(it.status)}</div>` : ''}
      </div>`);
      c.onclick = () => openCardEditor(module, it, false, fields);
      grid.appendChild(c);
    });
  };
  toolbar.querySelector('.search-input').oninput = render;
  toolbar.querySelector('#add-btn').onclick = () => openCardEditor(module, { ...template, id: DB.uid() }, false, fields, true);
  render();
}

function statusText(s) { return ({ active: '进行中', done: '已完成', pending: '待触发' })[s] || '进行中'; }
function fieldLabel(k) { return ({ name: '名称', core: '核心设定', rules: '运行规则', background: '背景描述', title: '标题', content: '内容', status: '状态', reward: '奖励', from: '来源', summary: '摘要', important: '关键节点', time: '时间', role: '身份', relation: '关系', desc: '描述', attrs: '属性', tags: '标签', ability: '能力', alias: '称号', age: '年龄' })[k] || k; }

/* ---------- 卡片编辑器 ---------- */
const FIELD_DEFS = {
  worldview: ['name|名称', 'core|核心设定|textarea', 'rules|运行规则|textarea', 'background|背景描述|textarea'],
  player: ['name|名称', 'alias|称号', 'age|年龄', 'ability|能力', 'attrs|属性|textarea', 'desc|描述|textarea'],
  planes: ['title|标题', 'content|内容|textarea', 'status|状态(active/done/pending)', 'reward|奖励', 'from|来源', 'time|时间'],
  story: ['title|标题', 'summary|摘要|textarea', 'important|是否关键节点(true/false)', 'time|时间'],
  targets: ['name|名称', 'avatar|头像emoji', 'role|身份', 'relation|与宿主关系', 'attrs|属性|textarea', 'tags|标签', 'desc|描述|textarea'],
  supporters: ['name|名称', 'avatar|头像emoji', 'role|身份', 'relation|关系', 'attrs|属性|textarea', 'tags|标签', 'desc|描述|textarea'],
  npcs: ['name|名称', 'avatar|头像emoji', 'role|身份', 'attrs|属性|textarea', 'desc|描述|textarea'],
};

function openCardEditor(module, item, isPlayer, fields, isNew) {
  editingCard = { module, id: item.id, isNew: !!isNew };
  document.getElementById('card-title').textContent = (isNew ? '新建' : '编辑') + ' · ' + (item.name || item.title || '');
  const defs = FIELD_DEFS[module] || (fields || []).map(f => `${f}|${fieldLabel(f)}`);
  const body = document.getElementById('card-body');
  body.innerHTML = '';
  defs.forEach(def => {
    const [key, label, type] = def.split('|');
    const wrap = el(`<div class="field"><label>${label}</label></div>`);
    const val = item[key] ?? '';
    if (type === 'textarea') {
      wrap.innerHTML += `<textarea class="text-input" data-key="${key}" rows="3">${escapeHtml(val)}</textarea>`;
    } else {
      wrap.innerHTML += `<input class="text-input" data-key="${key}" value="${escapeHtml(val)}">`;
    }
    body.appendChild(wrap);
  });
  document.getElementById('card-delete').style.display = (isNew || isPlayer) ? 'none' : 'block';
  document.getElementById('card-modal').hidden = false;
}

function closeCard() { document.getElementById('card-modal').hidden = true; editingCard = null; }

function saveCard() {
  if (!editingCard) return;
  const { module, id, isNew } = editingCard;
  const inputs = document.querySelectorAll('#card-body [data-key]');
  const data = {};
  inputs.forEach(i => { data[i.dataset.key] = i.value; });
  if (isNew) { DB.add(module, data); }
  else if (Array.isArray(DB.data[module])) { DB.update(module, id, data); }
  else { DB.setOne(module, { ...(DB.data[module] || {}), ...data }); }
  closeCard();
  (routes[module] || (() => { }))();
}

/* ---------- 对话界面（微信风格） ---------- */
function renderChat() {
  const cid = DB.data.currentChat || 'main';
  if (!DB.chats[cid]) DB.chats[cid] = [];
  const msgs = DB.chats[cid];
  content.innerHTML = '';
  const wrap = el(`<div class="chat-wrap">
    <div class="chat-header"><span id="chat-target">位面系统</span><span class="sub">· 对话即推进剧情</span></div>
    <div class="chat-scroll" id="chat-scroll"></div>
    <div class="chat-input-area">
      <textarea id="msg-input" rows="1" placeholder="输入消息…  (Enter 发送 / Shift+Enter 换行)"></textarea>
      <button class="send-btn" id="send-btn">发送</button>
    </div>
  </div>`);
  content.appendChild(wrap);
  const scroll = wrap.querySelector('#chat-scroll');

  const paint = () => {
    scroll.innerHTML = '';
    msgs.forEach(m => {
      const who = m.role === 'user' ? 'me' : (m.role === 'system' ? 'system' : 'other');
      const showName = m.name && m.role !== 'user' ? `<div class="name">${escapeHtml(m.name)}</div>` : '';
      const av = m.role === 'user' ? '🧑' : (m.avatar || '🎴');
      scroll.insertAdjacentHTML('beforeend', `<div class="msg ${who}">
        ${who === 'me' ? '' : `<div class="avatar">${av}</div>`}
        <div class="bubble">${showName}<div class="text">${escapeHtml(m.content)}</div></div>
      </div>`);
    });
    scroll.scrollTop = scroll.scrollHeight;
  };
  paint();

  const input = wrap.querySelector('#msg-input');
  const sendBtn = wrap.querySelector('#send-btn');
  const send = async () => {
    const text = input.value.trim(); if (!text) return;
    input.value = ''; input.style.height = 'auto';
    msgs.push({ role: 'user', content: text, name: DB.data.player?.name || '宿主' });
    paint(); save();
    await callAI(); paint();
  };
  sendBtn.onclick = send;
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
}

/* ---------- API 调用 ---------- */
async function callAI() {
  const cfg = DB.data.config;
  const cid = DB.data.currentChat || 'main';
  const msgs = DB.chats[cid];
  // 自动生成系统提示词（汇总世界观+角色）
  const systemPrompt = buildSystemPrompt();

  if (!cfg.apiUrl || !cfg.apiKey) {
    // 未配置：模拟回复，保证离线可用
    await sleep(600);
    msgs.push({ role: 'assistant', content: '（尚未配置 API，当前为离线演示模式）\n\n位面系统：「检测到宿主的意识波动——请先前往 ⚙ 设置中填入 API 地址与密钥，我将为你开启真实的镜界。」', name: '位面系统', avatar: '🎴' });
    save(); return;
  }

  // 构造 messages
  const messages = [{ role: 'system', content: systemPrompt }];
  msgs.filter(m => m.role !== 'system' || m._keep).forEach(m => {
    if (m.role === 'system') return;
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  });

  // 显示"正在输入"
  msgs.push({ role: 'assistant', content: '...', _typing: true, name: '位面系统', avatar: '🎴' });
  renderChat();

  try {
    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model || 'gpt-4o', temperature: parseFloat(cfg.temperature) || 0.8, messages }),
    });
    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content || '(模型未返回内容)';
    // 移除 typing 占位
    const idx = msgs.findIndex(m => m._typing); if (idx >= 0) msgs.splice(idx, 1);
    // 尝试解析结构化指令（如更新好感度、完成任务等）
    parseGameCommands(reply);
    msgs.push({ role: 'assistant', content: reply, name: '位面系统', avatar: '🎴' });
  } catch (e) {
    const idx = msgs.findIndex(m => m._typing); if (idx >= 0) msgs.splice(idx, 1);
    msgs.push({ role: 'assistant', content: '⚠ 调用失败：' + e.message + '\n\n请检查 API 设置（地址/密钥/模型/CORS）。', name: '系统', avatar: '⚠' });
  }
  save();
}

function buildSystemPrompt() {
  const d = DB.data;
  const wp = d.worldview || {};
  const chars = [...d.targets, ...d.supporters, ...d.npcs].map(c => `- ${c.name}（${c.role || ''}）：${c.desc || ''}`).join('\n');
  return `你是一个互动叙事游戏的核心引擎，扮演【位面系统】与所有角色。请始终代入世界观，驱动剧情发展。
【世界观】${wp.name || '未命名'}：${wp.core || ''}
【规则】${wp.rules || '无'}
【背景】${wp.background || ''}
【宿主】${d.player?.name || '宿主'}：${d.player?.desc || ''}，能力：${d.player?.ability || ''}
【主要角色】
${chars || '（暂无）'}
【当前任务】${d.planes.filter(p => p.status === 'active').map(p => p.title).join('、') || '无'}
【输出要求】
1. 用"位面系统"口吻下发任务、提示信息时，以【位面系统】开头；角色对话用引号，并标注说话人。
2. 剧情描写生动，给用户（宿主）留下明确可选择的行动空间。
3. 可在回复末尾用隐藏指令块影响游戏状态（用户不可见，但你会遵守）：
   [CMD]{"type":"set_relation","target":"角色名","value":"新关系"}[/CMD]
   [CMD]{"type":"add_story","title":"节点标题","summary":"摘要"}[/CMD]
   [CMD]{"type":"finish_task","id":"任务标题"}[/CMD]
请现在开始，根据宿主的最新行动推进剧情。`;
}

// 解析 [CMD] 指令块（在渲染前剥离）
function parseGameCommands(reply) {
  const re = /\[CMD\]([\s\S]*?)\[\/CMD\]/g; let m;
  while ((m = re.exec(reply)) !== null) {
    try {
      const cmd = JSON.parse(m[1]);
      if (cmd.type === 'set_relation') {
        const t = DB.list('targets').find(x => x.name === cmd.target) || DB.list('supporters').find(x => x.name === cmd.target);
        if (t) DB.update(t._m || 'targets', t.id, { relation: cmd.value });
      } else if (cmd.type === 'add_story') {
        DB.add('story', { title: cmd.title, summary: cmd.summary, important: !!cmd.important, time: DB.now() });
      } else if (cmd.type === 'finish_task') {
        const p = DB.list('planes').find(x => x.title === cmd.id);
        if (p) DB.update('planes', p.id, { status: 'done' });
      }
    } catch (e) { console.warn('指令解析失败', e); }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------- 保存 ---------- */
function save() { DB.save(); }

/* ---------- 弹窗事件 ---------- */
document.getElementById('btn-api').onclick = () => {
  const cfg = DB.data.config;
  document.getElementById('cfg-url').value = cfg.apiUrl || '';
  document.getElementById('cfg-key').value = cfg.apiKey || '';
  document.getElementById('cfg-model').value = cfg.model || '';
  document.getElementById('cfg-temp').value = cfg.temperature ?? 0.8;
  document.getElementById('api-modal').hidden = false;
};
document.getElementById('close-api').onclick = () => document.getElementById('api-modal').hidden = true;
document.getElementById('api-save').onclick = () => {
  DB.data.config = {
    apiUrl: document.getElementById('cfg-url').value.trim(),
    apiKey: document.getElementById('cfg-key').value.trim(),
    model: document.getElementById('cfg-model').value.trim(),
    temperature: parseFloat(document.getElementById('cfg-temp').value) || 0.8,
  };
  DB.save(); document.getElementById('api-modal').hidden = true;
  toast('API 设置已保存到本地');
};
document.getElementById('api-test').onclick = async () => {
  const url = document.getElementById('cfg-url').value.trim();
  const key = document.getElementById('cfg-key').value.trim();
  if (!url || !key) return toast('请先填写地址和密钥', true);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify({ model: document.getElementById('cfg-model').value || 'gpt-4o', messages: [{ role: 'user', content: 'ping' }] }) });
    toast(r.ok ? '连接成功 ✓' : ('状态码 ' + r.status), !r.ok);
  } catch (e) { toast('连接失败：' + e.message, true); }
};

document.getElementById('close-card').onclick = closeCard;
document.getElementById('card-save').onclick = saveCard;
document.getElementById('card-delete').onclick = () => {
  if (!editingCard) return;
  const { module, id } = editingCard;
  if (Array.isArray(DB.data[module])) DB.remove(module, id);
  closeCard(); (routes[module] || (() => { }))();
};
document.getElementById('card-modal').addEventListener('click', e => { if (e.target.id === 'card-modal') closeCard(); });

document.getElementById('btn-newchat').onclick = () => {
  const id = 'chat_' + Date.now();
  DB.chats[id] = [{ role: 'system', content: '—— 新的位面对话已开启 ——', name: '系统' }];
  DB.data.currentChat = id; DB.save();
  navigate('chat');
};

/* ---------- toast ---------- */
function toast(msg, err) {
  const t = el(`<div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${err ? '#ff4d4f' : '#2b6cff'};color:#fff;padding:9px 20px;border-radius:24px;font-size:13px;z-index:200;box-shadow:0 6px 20px rgba(0,0,0,.2)">${escapeHtml(msg)}</div>`);
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

/* ---------- 启动 ---------- */
DB.init();
document.querySelectorAll('.module-item').forEach(b => b.onclick = () => navigate(b.dataset.module));
navigate('chat');
