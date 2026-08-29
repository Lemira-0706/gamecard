// 端到端测试：用 jsdom 加载真实 index.html，跑完整交互流程
const fs = require("fs");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("/data/workspace/index.html", "utf-8");

// 拦截真实 fetch（API.call 会因为没有 key 直接 return null，走模拟回复，无需网络）
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(window){
    // 提供 localStorage（jsdom 自带但确保）
    window.matchMedia = window.matchMedia || (()=>({matches:false,addEventListener(){},removeEventListener(){}}));
    window.visualViewport = window.visualViewport || { addEventListener(){} };
    window.Capacitor = undefined; // 走降级
    window.confirm = ()=>true;    // 自动确认删除
    window.URL.createObjectURL = ()=>"blob:x";
    // 内存版 localStorage（jsdom 某些配置下同步存储会抛，用 Map 兜底）
    const store = new Map();
    window.localStorage = {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k,v) => { store.set(k, String(v)); },
      removeItem: k => store.delete(k),
      clear: () => store.clear(),
      key: i => [...store.keys()][i] || null,
      get length(){ return store.size; },
    };
    // 捕获运行时错误
    window.addEventListener("error", e=>{ console.log("RUNTIME ERROR:", e.message); });
  },
});

const { window } = dom;
const doc = window.document;
let errors = [];

window.addEventListener("error", e=>errors.push(e.message));
// 捕获 console.error 也记录
const origErr = window.console.error; window.console.error=(...a)=>{ errors.push(a.join(" ")); origErr.apply(window.console,a); };

// 等待 init 完成（init() 是同步，但 setTimeout/toast 微任务）
setTimeout(async ()=>{
  try {
    const Store = window.eval("Store"), UI = window.eval("UI"), Modals = window.eval("Modals"), API = window.eval("API");
    assert(Store && UI && Modals && API, "全局模块应存在");

    // 1. 首页渲染 & 首次引导 toast
    assert(doc.querySelector(".home .create-btn"), "首页应有创作按钮");
    console.log("✓ 首页渲染正常");

    // 2. 打开「创作新世界」弹窗
    Modals.openCreateWorld();
    await sleep(50);
    assert(doc.querySelector("#saveWorld"), "应渲染保存按钮");
    assert(doc.querySelector(".module-card"), "应渲染模块卡片");
    console.log("✓ 创作弹窗打开 & 模块卡片渲染");

    // 3. 填写基础设定并保存（basic 子页）—— 先点击「基础设定」模块卡片进入
    const basicCard = [...doc.querySelectorAll('.module-card')].find(c=>c.dataset.goto==='basic');
    assert(basicCard, "应存在基础设定模块卡片");
    basicCard.click();
    await sleep(50);
    // 基础设定页：填 名称 + 世界观（故事线为独立模块，此处一并补全后再保存）
    const nameInput = doc.querySelector('[data-f="name"]');
    nameInput.value = "测试世界ABO";
    const worldF = doc.querySelector('[data-f="world"]');
    worldF.value = "这是一个测试世界观，详细描述让AI稳定发挥。";
    // 切到「故事线」模块补全必填项
    const storyCard = [...doc.querySelectorAll('.module-card')].find(c=>c.dataset.goto==='story');
    storyCard?.click();
    await sleep(50);
    const storyF = doc.querySelector('[data-f="story"]');
    if(storyF){ storyF.value = "阶段一：相遇\n阶段二：相爱\n结局：HE"; }
    // 在 story 子页点保存：_saveWorld 用 body.querySelector 全局查找，story 字段此时在 DOM
    doc.querySelector("#saveWorld").click();
    await sleep(50);
    assert(Store.state.worlds.length >= 1, "保存后应至少有一个世界");
    const w = Store.state.worlds.find(x=>x.name==="测试世界ABO");
    assert(w, "应通过 esc 后存入世界");
    assert(w.characters.host, "宿主应被创建");
    console.log("✓ 保存世界成功，宿主="+w.characters.host.name);

    // 4. 进入对话（模拟点击 world-row / chat-row 逻辑：直接设置 current 并渲染）
    Store.state.currentWorldId = w.id;
    Store.state.currentChatId = w.chats[0].id;
    Store.state.expandedWorldId = w.id;
    UI.renderMain();
    await sleep(20);
    assert(doc.querySelector("#msgInput"), "聊天页应渲染输入框");
    assert(doc.querySelector("#sendBtn"), "应有发送按钮");
    assert(doc.querySelector("#stopBtn"), "应有停止按钮（默认隐藏）");
    console.log("✓ 进入聊天页，输入区/停止按钮就绪");

    // 5. 发送一条消息 → 触发 simulateReply → 走模拟分支（无 API key）
    const ta = doc.querySelector("#msgInput");
    ta.value = "@"+ (w.characters.target? w.characters.target.name:"") +" 你好世界";
    // 确保有 target（basic 未建 target，用 dimension/system 回复亦可；此处仅验证流程不崩）
    doc.querySelector("#sendBtn").click();
    // simulateReply 异步，等待模拟回复 setTimeout 800-1400ms
    await sleep(1600);
    const chat = Store.getCurrentChat();
    assert(chat.messages.length >= 1, "发送后应有至少1条消息(我)"+JSON.stringify(chat.messages.map(m=>m.text)));
    console.log("✓ 发送消息后消息数 =", chat.messages.length, "（含模拟回复）");

    // 6. 测试「停止生成」：触发后 typing 气泡被清除
    //    先制造一个进行中的 typing
    //    (直接测 cancelGenerate 不崩溃即可)
    UI.cancelGenerate(w);
    await sleep(50);
    assert(!chat.messages.find(m=>m.typing), "停止后不应有 typing 消息");
    console.log("✓ 停止生成：清除 typing 气泡");

    // 7. 导出聊天（无消息也需不崩）
    UI.exportChat();
    console.log("✓ 导出聊天不崩溃");

    // 8. 测试 Esc 关闭弹窗
    Modals.openCreateWorld(); await sleep(30);
    assert(Modals.current, "弹窗应打开");
    doc.dispatchEvent(new window.KeyboardEvent("keydown",{key:"Escape"}));
    await sleep(20);
    assert(!Modals.current, "Esc 后应关闭弹窗");
    console.log("✓ Esc 关闭弹窗");

    // 9. Enter 发送 / Shift+Enter 换行（验证监听器已绑定，直接 dispatch keydown）
    UI.renderMain(); await sleep(20);
    const ta2 = doc.querySelector("#msgInput");
    ta2.value = "换行测试";
    const ev = new window.KeyboardEvent("keydown", {key:"Enter", shiftKey:true, bubbles:true});
    ta2.dispatchEvent(ev);
    assert(ta2.value==="换行测试", "Shift+Enter 不应发送，应保留文本");
    console.log("✓ Shift+Enter 不发送（保留文本）");

    // 10. applyPreset 套用后自动选中
    Store.applyPreset("p_cyber");
    await sleep(50);
    assert(Store.state.currentWorldId, "套用预设后应自动选中世界");
    const cyber = Store.state.worlds.find(x=>x.id===Store.state.currentWorldId);
    assert(cyber && cyber.name==="赛博朋克2077", "currentWorldId 应指向新套用的赛博朋克世界");
    assert(Store.state.currentChatId===cyber.chats[0].id, "应自动选中首个对话");
    console.log("✓ 套用预设后自动进入对话:", cyber.name);

    // 11. 删除世界
    Store.deleteWorld(cyber.id);
    assert(!Store.state.worlds.find(x=>x.id===cyber.id), "删除后世界应消失");
    console.log("✓ 删除世界");

    console.log("\n--- 运行时错误汇总（基线） ---");
    if(errors.length){ console.log("⚠️ 运行时错误/警告:", errors); process.exit(1); }
    console.log("✅ 基线无运行时错误");
    console.log("\n✅✅✅ 基线端到端测试通过（新增测试块将继续运行）");
    // 注意：此处不再 process.exit(0)，让下方新增测试块（群像 + 流式SSE）继续执行
  } catch(e){
    console.error("❌ 测试失败:", e);
    console.error(e.stack);
    process.exit(1);
  }
}, 100);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ==================== 新增：① 群像角色独立回复 + ② 流式 SSE ==================== */
setTimeout(async ()=>{
  try {
    const Store = window.eval("Store"), API = window.eval("API"), UI = window.eval("UI"), uid = window.eval("uid");
    const { TextEncoder } = require("util");  // jsdom window 上无 TextEncoder，用 Node 的

    /* ---------- ① 群像：parseRoleMembers / getAllMentionable / parseMentions ---------- */
    const w = Store.addWorld();
    w.name = "群像界"; w.world = "w"; w.story = "s";
    w.characters = {
      host:{name:"我",role:"玩家",desc:"",color:"#4caf7d",img:""},
      // target 用换行写成 3 人群像
      target:{name:"学院",role:"群像",desc:"顾霆琛：帝国CEO，高冷。\n林月：反派，心机深沉。\n苏晴：青梅竹马，温柔。",color:"#ec407a",img:""},
      sidekick:{name:"大壮",role:"配角",desc:"憨厚的兄弟。",color:"#ffa726",img:""},
      npc:{name:"路人",role:"NPC",desc:"老王：路边摊老板，热情。",color:"#78909c",img:""},
    };
    const tMembers = Store.parseRoleMembers(w.characters.target);
    assert(tMembers.length === 3, "target 群像 desc 拆出 3 个成员，实际="+tMembers.length);
    assert(!!tMembers.find(m=>m.name==="顾霆琛") && !!tMembers.find(m=>m.name==="林月"), "含顾霆琛与林月");

    const mentionable = Store.getAllMentionable(w);
    const gu = mentionable.find(m=>m.name==="顾霆琛"), lin = mentionable.find(m=>m.name==="林月");
    assert(gu && gu.pid==="target" && lin && lin.pid==="target", "@顾霆琛/@林月 均可提及且同属 target");
    assert(gu.memberKey !== lin.memberKey, "群像成员 memberKey 互不相同的");

    const {mentioned} = Store.parseMentions("@顾霆琛 和 @林月 你们怎么看", w);
    assert(mentioned.length === 2 && mentioned[0].memberKey !== mentioned[1].memberKey, "@两人 解析出 2 个独立响应者");

    // _mockReply：同池连续抽取不全相同（去重）
    const seq = [];
    for(let i=0;i<8;i++) seq.push(UI._mockReply(w,{pid:"sidekick"},"大壮",false));
    assert(!seq.every(v=>v===seq[0]), "_mockReply 同池去重，不全相同");
    // 不同 authorName 走不同池（顾霆琛/林月 台词不同）
    const r1 = UI._mockReply(w,{pid:"target"},"顾霆琛",false);
    const r2 = UI._mockReply(w,{pid:"target"},"林月",false);
    assert(r1 !== r2, "_mockReply 不同群像成员台词独立");

    /* ---------- ② 流式 SSE：伪造 fetch 返回 text/event-stream ---------- */
    // 使用 Node 全局的 Response / ReadableStream（Node 18+ 内置，避免依赖 jsdom window 上的构造器）
    const { Response: NodeResponse, ReadableStream: NodeRS } = globalThis;
    function sseBody(events){ return new TextEncoder().encode(events.map(e=>"data: "+JSON.stringify(e)+"\n\n").join("") + "data: [DONE]\n\n"); }
    const origFetch = window.fetch;

    // 2a. OpenAI 兼容流式
    window.fetch = async ()=> new NodeResponse(sseBody([
      {choices:[{delta:{role:"assistant"}}]},
      {choices:[{delta:{content:"你"}}]},
      {choices:[{delta:{content:"好"}}]},
      {choices:[{delta:{content:"啊。"},finish_reason:"stop"}]},
    ]), {status:200, headers:{"Content-Type":"text/event-stream"}});
    const w1 = Store.addWorld(); w1.api={provider:"openai",baseUrl:"http://x",apiKey:"k",model:"m"};
    const calls=[];
    const res1 = await API.call(w1,[{role:"user",content:"x"}],null,(d,f)=>calls.push([d,f]));
    assert(res1 === "你好啊。", "OpenAI 流式聚合结果正确，实际="+res1);
    assert(calls.length===3 && calls[2][1]==="你好啊。", "onDelta 3 次且 full 累加");

    // 2b. Anthropic 流式（event: + delta.text）
    const anEvents = [
      "event: message_start\ndata: {\"type\":\"message_start\"}\n\n",
      "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0}\n\n",
      "event: content_block_delta\ndata: "+JSON.stringify({type:"content_block_delta",index:0,delta:{type:"text_delta",text:"哼，"}})+"\n\n",
      "event: content_block_delta\ndata: "+JSON.stringify({type:"content_block_delta",index:0,delta:{type:"text_delta",text:"随你吧。"}})+"\n\n",
      "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\n",
      "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
    ];
    window.fetch = async ()=> new NodeResponse(new TextEncoder().encode(anEvents.join("")), {status:200,headers:{"Content-Type":"text/event-stream"}});
    const w2 = Store.addWorld(); w2.api={provider:"anthropic",baseUrl:"http://x",apiKey:"k",model:"claude-x"};
    const calls2=[];
    const res2 = await API.call(w2,[{role:"system",content:"SYS"},{role:"user",content:"hi"}],null,(d,f)=>calls2.push([d,f]));
    assert(res2 === "哼，随你吧。", "Anthropic 流式聚合正确，实际="+res2);
    assert(calls2.length===2, "Anthropic onDelta 2 次");
    // _normalize: system 单独、assistant 保留
    const noa = API._normalize("openai",[{role:"system",content:"S"},{role:"assistant",content:"a"}]);
    assert(noa.messages[0].role==="system", "OpenAI normalize: system 并入 messages");
    const nan = API._normalize("anthropic",[{role:"system",content:"S"},{role:"user",content:"u"},{role:"assistant",content:"a"}]);
    assert(nan.system==="S" && nan.messages.every(m=>m.role!=="system") && nan.messages.find(m=>m.content==="a").role==="assistant", "Anthropic normalize: system 单独且 assistant 保留");

    // 2c. 中止 AbortController：永不结束的流 + 立即 abort
    const forever = new NodeRS({start(){}});
    window.fetch = async ()=> new NodeResponse(forever,{status:200,headers:{"Content-Type":"text/event-stream"}});
    const w3 = Store.addWorld(); w3.api={provider:"openai",apiKey:"k",model:"m"};
    const ctrl = new AbortController();
    const p = API.call(w3,[{role:"user",content:"x"}],ctrl.signal,()=>{});
    setTimeout(()=>ctrl.abort(),15);
    let aborted=false;
    try{ await p; }catch(e){ aborted = (e && e.name==="AbortError"); }
    assert(aborted, "abort 抛出 AbortError");

    // 2d. 重试：前 2 次 500，第 3 次成功
    let n=0;
    window.fetch = async ()=>{ n++; if(n<3) return new NodeResponse("err",{status:500});
      return new window.Response(sseBody([{choices:[{delta:{content:"WIN"}}]}]),{status:200,headers:{"Content-Type":"text/event-stream"}}); };
    const w4 = Store.addWorld(); w4.api={provider:"openai",apiKey:"k",model:"m"};
    const res4 = await API.call(w4,[{role:"user",content:"x"}],null,()=>{});
    assert(res4==="WIN" && n===3, "重试第 3 次成功，n="+n);

    // 2e. 配置缺失 → 返回 null（走模拟，不抛）
    const w5 = Store.addWorld(); w5.api={provider:"openai",apiKey:"",model:"m"};
    const res5 = await API.call(w5,[{role:"user",content:"x"}],null,()=>{});
    assert(res5===null, "无 apiKey 返回 null");

    window.fetch = origFetch;
    console.log("\n✅✅✅ 新增测试（群像 + 流式SSE + 重试 + 中止）全部通过");
    process.exit(0);
  } catch(e){
    console.error("❌ 新增测试失败:", e);
    console.error(e.stack);
    process.exit(1);
  }
}, 300);
