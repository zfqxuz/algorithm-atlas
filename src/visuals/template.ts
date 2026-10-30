export const ATLAS_TEMPLATE = `
<div class="visuals-toolbar">
  <label class="visuals-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.2"></circle>
      <path d="m15.2 15.2 4.4 4.4"></path>
    </svg>
    <input id="visualSearch" type="search" placeholder="搜索：注意力、页表、Fat-Tree、Raft…" autocomplete="off" aria-label="搜索动态演示">
  </label>
  <div class="visuals-levels" aria-label="按难度筛选">
    <span>难度</span>
    <button class="vfilter" type="button" data-level="all" aria-pressed="true">全部</button>
    <button class="vfilter" type="button" data-level="L1" aria-pressed="false">L1</button>
    <button class="vfilter" type="button" data-level="L2" aria-pressed="false">L2</button>
    <button class="vfilter" type="button" data-level="L3" aria-pressed="false">L3</button>
    <button class="vfilter" type="button" data-level="L4" aria-pressed="false">L4</button>
  </div>
  <button class="visuals-toolbar-button" id="randomVisual" type="button">随机播放 <span>↗</span></button>
</div>

<div class="visuals-layout">
  <aside class="visuals-domains" aria-label="按领域筛选">
    <div class="visuals-domains-head">DOMAINS / 领域</div>
    <div id="domainFilters"></div>
    <p class="visuals-note">每个演示都会自动播放；点击卡片进入可单步、可暂停的大图。键盘 <strong>/</strong> 搜索，<strong>Esc</strong> 关闭。</p>
  </aside>

  <div>
    <div class="visuals-results-head">
      <h2 id="visualsBrowseTitle">全部动态演示</h2>
      <p id="visualResultLabel">载入中…</p>
    </div>
    <div class="visuals-grid" id="visualGrid"></div>
    <div class="visuals-empty" id="visualEmpty" hidden>
      <h3>没有匹配的演示</h3>
      <p>换一个关键词，或清除领域/难度筛选再试。</p>
    </div>
    <div class="visuals-more">
      <p>想回到经典算法实验室？27 个可播放实验室仍在同一条图谱里。</p>
      <a href="#catalogue">回到算法实验室 →</a>
    </div>
  </div>
</div>

<div class="visual-modal" id="visualModal" hidden>
  <div class="visual-modal-panel" id="vmPanel" role="dialog" aria-modal="true" aria-labelledby="vmTitle">
    <button class="vm-close" id="vmClose" type="button" aria-label="关闭">×</button>
    <div class="visual-modal-visual" id="vmVisual"></div>
    <div class="visual-modal-copy">
      <div class="vm-meta">
        <span class="vm-domain" id="vmDomain"></span>
        <span class="vm-level" id="vmLevel"></span>
        <span class="vm-index" id="vmIndex"></span>
      </div>
      <h2 id="vmTitle"></h2>
      <div class="vm-en" id="vmEn"></div>
      <p class="vm-summary" id="vmSummary"></p>
      <div class="vm-block">
        <h3>核心机制 / Mechanism</h3>
        <p id="vmMechanism"></p>
      </div>
      <div class="vm-block">
        <h3>观察点 / What to notice</h3>
        <p id="vmObserve"></p>
      </div>
      <div class="vm-tags" id="vmTags"></div>
      <div class="vm-links" id="vmLinks"></div>
      <div class="vm-anim">
        <button id="vmPlay" type="button">暂停</button>
        <button id="vmStep" type="button">单步</button>
        <button id="vmReset" type="button">重置</button>
        <span class="vm-anim-label" id="vmAnimLabel">1 / 1</span>
      </div>
      <div class="vm-footer">
        <div class="vm-nav">
          <button id="vmPrev" type="button">← 上一张</button>
          <button id="vmNext" type="button">下一张 →</button>
        </div>
        <button class="vm-copy" id="vmCopy" type="button">复制链接</button>
      </div>
    </div>
  </div>
</div>
`;
