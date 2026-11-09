(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'pl-dialog ig-dialog';
  const EXAMPLE = `{
  "pets": [
    {
      "id": "myrole",
      "name": "我的角色",
      "size": 500,
      "balanceEnabled": false,
      "whisperEnabled": false,
      "workStatusEnabled": false,
      "fixedEnabled": true,
      "display": "none",
      "position": { "corner": "bottom-left", "marginX": 24, "marginY": 60 }
    }
  ],
  "animations": {
    "idle": ["待机"],
    "turn": ["待机"],
    "drag": ["待机"],
    "clicks": ["待机", "挥手"],
    "moves": { "default": { "minDist": 60, "maxDist": 240, "margin": 20, "leadSec": 1, "tailSec": 1 }, "actions": [] },
    "categories": [{ "id": "小动作", "weight": 70, "actions": ["待机", "挥手"], "noMirror": true }],
    "events": { "balance": ["待机", "待机", "待机", "待机", "待机", "待机"] }
  },
  "animationWeights": { "idle": 100, "turn": 0, "move": 0 }
}`;
  // 静态结构；示例文本用 textContent 写入
  dialog.innerHTML = `
    <header class="pl-head"><div><h2>添加新角色</h2><p>一个角色就是一个文件夹。准备好后点下面的「选择角色文件夹」，程序会检查并复制一份到自己的角色库，原文件夹不会被改动。</p></div><button id="ig-close" type="button" class="quiet">取消</button></header>
    <div class="pl-body ig-body">
      <h3 class="pl-sub">① 文件夹长这样 <small>名字随意，里面的文件名要照写</small></h3>
      <pre class="ig-tree" id="ig-tree"></pre>
      <h3 class="pl-sub">② 动作视频 <small>放在 animations 里</small></h3>
      <ul class="ig-list">
        <li>格式是 <b>WebM</b>（VP9，带透明通道），建议 960×720、24 帧/秒，同一角色的所有视频画布尺寸一致，人物脚底和位置对齐，切换动作才不会跳。</li>
        <li><b>文件名就是动作名</b>，例如 <code>待机.webm</code> 的动作名是「待机」。名字里不能有 <code>\\ / :</code> 和 <code>..</code>。</li>
      </ul>
      <h3 class="pl-sub">③ config.json <small>下面这些是必填的</small></h3>
      <ul class="ig-list">
        <li><code>pets</code> 里只放<b>一个</b>角色：<code>id</code> 用小写字母开头，只含小写字母、数字、<code>_</code>、<code>-</code>（最长 48 个字符），不能叫 <code>main</code>，也不能和已有角色重复；<code>name</code> 是显示名。</li>
        <li><code>animations</code> 里 <code>idle</code>（待机）、<code>turn</code>（转向）、<code>drag</code>（拖拽）、<code>clicks</code>（点击回应）<b>各至少写一个动作名</b>；还要有 <code>moves.actions</code>（可以是空列表）、<code>events.balance</code>（至少一个）、<code>categories</code>（放「小动作」随机池）。</li>
        <li>config 里提到的每一个动作名，<code>animations</code> 文件夹里都必须有同名的 <code>.webm</code>，缺一个就导入失败。</li>
        <li><code>fixedEnabled: true</code> 表示角色原地不走动，只播待机和小动作；想让它到处走再改成 false 并在 <code>moves.actions</code> 里写移动动作。</li>
      </ul>
      <h3 class="pl-sub">④ 人设.json <small>可选，没有也能导入</small></h3>
      <ul class="ig-list"><li>写 <code>characterId</code>（必须和上面的 id 一致）和 <code>whisperPrompt</code>（聊天时的角色设定，不能为空）。</li></ul>
      <h3 class="pl-sub">最小的 config.json 示例 <button id="ig-copy" type="button" class="pill ig-copy">复制示例</button></h3>
      <pre class="ig-code" id="ig-code"></pre>
      <p class="ig-tip">小提示：导入后可以在角色卡的「动作分类」里重新分配待机、转向、拖拽、点击回应，在「轮播编排」里排随机动作。想少写点，也可以复制一个已有角色的文件夹（在 <code>~\\.xiaoxiao2\\dsh-pet\\characters</code> 里）当模板来改。</p>
    </div>
    <footer class="pl-foot"><span id="ig-status" role="status" aria-live="polite"></span><button id="ig-pick" type="button" class="primary">选择角色文件夹</button></footer>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  $('ig-tree').textContent = [
    'my-role/                ← 你要选择的就是这个文件夹',
    '├─ config.json          ← 必需：角色设置',
    '├─ 人设.json            ← 可选：聊天用的人设',
    '└─ animations/          ← 必需：所有动作视频',
    '   ├─ 待机.webm',
    '   ├─ 挥手.webm',
    '   └─ ……'
  ].join('\n');
  $('ig-code').textContent = EXAMPLE;
  let onPick = null, timer = 0;
  const say = t => { const s = $('ig-status'); s.textContent = t; clearTimeout(timer); if (t) timer = setTimeout(() => { s.textContent = ''; }, 2200); };
  $('ig-close').onclick = () => dialog.close();
  $('ig-pick').onclick = () => { dialog.close(); if (onPick) onPick(); };
  $('ig-copy').onclick = async () => { try { await navigator.clipboard.writeText(EXAMPLE); say('已复制示例'); } catch { say('复制失败，请手动选中复制'); } };
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  window.openImportGuide = cb => { onPick = cb; if (!dialog.open) dialog.showModal(); $('ig-pick').focus(); };
})();
