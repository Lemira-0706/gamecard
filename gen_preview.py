"""生成界面预览图（不依赖浏览器，用 Pillow 精确还原蓝白简约界面）"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1280, 900
BLUE = (43, 108, 255)
BLUE_DEEP = (27, 79, 214)
BLUE_SOFT = (234, 241, 255)
BG = (245, 247, 251)
CARD = (255, 255, 255)
LINE = (230, 234, 240)
TEXT = (31, 39, 51)
SOFT = (122, 134, 154)

def font(sz):
    for p in ["/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
              "/usr/share/fonts/wenquanyi/wqy-microhei/wqy-microhei.ttc"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def rounded(draw, box, r, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def text(draw, xy, s, sz, color=TEXT, anchor="la"):
    draw.text(xy, s, font=font(sz), fill=color, anchor=anchor)

def make_chat():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # 顶栏
    d.rectangle([0, 0, W, 52], fill=BLUE)
    text(d, (30, 26), "☰", 22, (255, 255, 255))
    text(d, (60, 26), "位面", 20, (255, 255, 255))
    text(d, (W - 40, 26), "⚙", 20, (255, 255, 255))
    # 侧边栏
    d.rectangle([0, 52, 220, H], fill=CARD)
    d.line([(220, 52), (220, H)], fill=LINE, width=1)
    items = [("💬 对话", True), ("🌌 世界观", False), ("🎴 位面系统", False),
             ("📖 故事线", False), ("🧑 玩家(宿主)", False), ("⭐ 目标对象", False),
             ("👥 配角", False), ("🤖 NPC", False)]
    y = 90
    text(d, (24, y - 22), "游戏模块", 13, SOFT)
    for name, active in items:
        if active:
            d.rounded_rectangle([12, y, 208, y + 40], radius=10, fill=BLUE)
            text(d, (30, y + 20), name, 15, (255, 255, 255))
        else:
            text(d, (30, y + 20), name, 15, TEXT)
        y += 46
    # 对话头
    d.rectangle([220, 52, W, 104], fill=CARD)
    d.line([(220, 104), (W, 104)], fill=LINE)
    text(d, (250, 78), "位面系统", 17, TEXT)
    text(d, (380, 78), "· 对话即推进剧情", 13, SOFT)
    # 消息区
    my, mx = 130, 250
    # 系统消息
    d.rounded_rectangle([mx + 260, my, mx + 700, my + 36], radius=18, fill=BLUE_SOFT)
    text(d, (mx + 480, my + 18), "—— 位面系统已连接 ——", 13, BLUE_DEEP, "mm")
    # 对方消息
    ay = my + 56
    d.ellipse([mx, ay, mx + 42, ay + 42], fill=BLUE_SOFT)
    text(d, (mx + 21, ay + 21), "🎴", 18, anchor="mm")
    d.rounded_rectangle([mx + 56, ay, mx + 560, ay + 90], radius=12, fill=CARD, outline=LINE)
    text(d, (mx + 74, ay + 20), "位面系统", 11, SOFT)
    text(d, (mx + 74, ay + 42), "宿主，欢迎来到镜界。你的第一项任务已就绪：", 14, TEXT)
    text(d, (mx + 74, ay + 68), "前往「中央广场」与林晚会面。", 14, TEXT)
    # 我方消息
    by = ay + 110
    bx = mx + 620
    d.ellipse([bx, by, bx + 42, by + 42], fill=BLUE)
    text(d, (bx + 21, by + 21), "🧑", 18, anchor="mm")
    d.rounded_rectangle([bx - 300, by, bx - 14, by + 44], radius=12, fill=BLUE)
    text(d, (bx - 160, by + 22), "我这就出发。林晚会是敌是友？", 14, (255, 255, 255), "mm")
    # 对方回复
    cy = by + 64
    d.ellipse([mx, cy, mx + 42, cy + 42], fill=BLUE_SOFT)
    text(d, (mx + 21, cy + 21), "🎴", 18, anchor="mm")
    d.rounded_rectangle([mx + 56, cy, mx + 600, cy + 90], radius=12, fill=CARD, outline=LINE)
    text(d, (mx + 74, cy + 20), "位面系统", 11, SOFT)
    text(d, (mx + 74, cy + 42), "她的警戒度尚高……用你的感知，慢慢靠近吧。", 14, TEXT)
    text(d, (mx + 74, cy + 66), "【好感度 +5】", 13, BLUE)
    # 输入区
    d.rectangle([220, H - 74, W, H], fill=CARD)
    d.line([(220, H - 74), (W, H - 74)], fill=LINE)
    d.rounded_rectangle([mx, H - 60, W - 80, H - 14], radius=12, fill=BG, outline=LINE)
    text(d, (mx + 16, H - 37), "输入消息…  (Enter 发送 / Shift+Enter 换行)", 13, SOFT)
    d.rounded_rectangle([W - 68, H - 60, W - 16, H - 14], radius=12, fill=BLUE)
    text(d, (W - 42, H - 37), "发送", 14, (255, 255, 255), "mm")
    return img

def make_cards(title, items, tags=None):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 52], fill=BLUE)
    text(d, (30, 26), "☰", 22, (255, 255, 255))
    text(d, (60, 26), "位面", 20, (255, 255, 255))
    # 侧边栏（简化，当前模块高亮）
    d.rectangle([0, 52, 220, H], fill=CARD)
    d.line([(220, 52), (220, H)], fill=LINE)
    mods = ["💬 对话", "🌌 世界观", "🎴 位面系统", "📖 故事线", "🧑 玩家", "⭐ 目标对象", "👥 配角", "🤖 NPC"]
    y = 90
    for i, m in enumerate(mods):
        active = (m == title)
        if active:
            d.rounded_rectangle([12, y, 208, y + 40], radius=10, fill=BLUE)
            text(d, (30, y + 20), m, 15, (255, 255, 255))
        else:
            text(d, (30, y + 20), m, 15, TEXT)
        y += 46
    # 页面头
    text(d, (250, 82), title, 22, TEXT)
    text(d, (250, 112), "点击卡片编辑 · 右上角新建", 13, SOFT)
    # 卡片网格
    cx, cy = 250, 150
    cw, ch = 290, 150
    gap = 20
    for i, it in enumerate(items):
        x = cx + (i % 3) * (cw + gap)
        y = cy + (i // 3) * (ch + gap)
        rounded(d, [x, y, x + cw, y + ch], 14, fill=CARD, outline=LINE, width=1)
        # 头像
        d.rounded_rectangle([x + 16, y + 16, x + 62, y + 62], radius=10, fill=BLUE_SOFT)
        text(d, (x + 39, y + 39), it[0], 22, anchor="mm")
        # tag
        if tags and i < len(tags):
            tw = d.textlength(tags[i], font=font(12))
            rounded(d, [x + cw - tw - 34, y + 20, x + cw - 16, y + 44], 12, fill=BLUE_SOFT)
            text(d, (x + cw - 25 - tw / 2, y + 32), tags[i], 12, BLUE, "mm")
        text(d, (x + 76, y + 26), it[1], 16, TEXT)
        text(d, (x + 76, y + 50), it[2], 12, SOFT)
        text(d, (x + 16, y + 88), it[3], 13, TEXT)
    return img

chat = make_chat()
chat.save("preview-chat.png")

planes = make_cards("🎴 位面系统 · 任务", [
    ("🎴", "初入镜界", "进行中 · 主线", "前往中央广场与林晚会面，获取锚点碎片 ×1"),
    ("🎴", "锚点共鸣", "待触发", "收集 3 块碎片后解锁深层位面"),
    ("✅", "觉醒仪式", "已完成", "完成初次意识投射，奖励：感知 Lv+1"),
], tags=["进行中", "待触发", "已完成"])

chars = make_cards("⭐ 目标对象 · 角色", [
    ("⭐", "林晚", "关键目标 · 好感度 30", "镜界守护者，冷漠但内心有裂痕……"),
    ("⭐", "沈昼", "关键目标 · 好感度 15", "来自敌对位面的观察者"),
    ("👤", "苏鸣", "协助者 · 信任度 80", "前代宿主留下的向导"),
    ("🤖", "镜中侍者", "信息提供者", "位面系统的信使，随处可见"),
], tags=["⭐ 目标", "⭐ 目标", "👥 配角", "🤖 NPC"])

planes.save("preview-planes.png")
chars.save("preview-characters.png")
print("预览图已生成")
