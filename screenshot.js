const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const fileUrl = 'file://' + path.resolve(__dirname, 'index.html');
  
  // 注入 localStorage 初始数据（模拟已配置状态）
  await page.goto(fileUrl);
  await page.evaluate(() => {
    // 触发 DB 初始化后再注入示例数据由 data.js seed 自动完成
  });
  await new Promise(r => setTimeout(r, 800));

  // 截图1：对话界面
  await page.screenshot({ path: path.resolve(__dirname, 'preview-chat.png') });

  // 截图2：位面系统（任务卡片）
  await page.click('.module-item[data-module="planes"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve(__dirname, 'preview-planes.png') });

  // 截图3：角色卡片（目标对象）
  await page.click('.module-item[data-module="targets"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve(__dirname, 'preview-characters.png') });

  await browser.close();
  console.log('done');
})();
