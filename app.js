const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const defaultState = {
  selectedId: "",
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

// 复核输入草稿（按游戏记住，避免重渲染丢失）和提示语，不持久化
const reviewDrafts = {};
let reviewNotice = "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  disputeCount: document.querySelector("#disputeCount"),
  visibleCount: document.querySelector("#visibleCount")
};

function normalizeState(data) {
  data.games.forEach((game) => {
    if (!Array.isArray(game.disputeArchive)) game.disputeArchive = [];
  });
  if (!data.review) data.review = null;
  return data;
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return normalizeState(structuredClone(defaultState));
  try {
    return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const disputeCount = state.games.reduce((sum, game) => sum + game.disputes.length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  els.disputeCount.textContent = disputeCount;
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
                ${game.disputes.length ? `<span class="pill warn">${game.disputes.length}个争议待处理</span>` : ""}
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      ${renderArchiveSection(game)}
      ${renderReviewSection(game)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderArchiveSection(game) {
  if (!game.disputeArchive.length) return "";
  return `
    <section class="rule-section archive-section">
      <h3>争议归档</h3>
      <ul class="rule-list">
        ${game.disputeArchive
          .map(
            (entry) => `
              <li>
                <span>
                  <strong>${escapeHtml(entry.text)}</strong><br />
                  结论：${escapeHtml(entry.resolution)}（${escapeHtml(entry.resolvedAt)}归档，已转入容易忘的规则）
                </span>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderReviewSection(game) {
  const review = state.review && state.review.gameId === game.id ? state.review : null;
  const draft = reviewDrafts[game.id] || {};
  const players = review ? review.players : draft.players ?? game.minPlayers;
  const windowMinutes = review ? review.windowMinutes : draft.windowMinutes ?? 120;
  const allDone = review && review.items.every((item) => item.done);

  return `
    <section class="rule-section review-panel">
      <h3>开局冲突复核</h3>
      <div class="split">
        <label>
          实际人数
          <input id="reviewPlayersInput" type="number" min="1" max="12" value="${players}" />
        </label>
        <label>
          今晚窗口(分钟)
          <input id="reviewWindowInput" type="number" min="15" step="15" value="${windowMinutes}" />
        </label>
      </div>
      <button id="buildReviewBtn" type="button">${review ? "重新生成清单" : "生成复核清单"}</button>
      ${reviewNotice ? `<p class="review-notice">${escapeHtml(reviewNotice)}</p>` : ""}
      ${
        review
          ? `
            <ul class="review-list">
              ${
                review.items.map((item, index) => renderReviewItem(item, index)).join("") ||
                `<li class="review-item done"><span>无冲突项，可直接记录开局。</span></li>`
              }
            </ul>
            <button id="recordStartBtn" class="primary" type="button" ${allDone ? "" : "disabled"}>记录开局</button>
            <p class="review-hint">清单全部确认后才能记录开局；修改人数或窗口后需重新复核。</p>
          `
          : `<p class="review-hint">填写实际人数和今晚可用时长，生成待确认清单。</p>`
      }
    </section>
  `;
}

function renderReviewItem(item, index) {
  if (item.kind === "dispute") {
    return `
      <li class="review-item ${item.done ? "done" : ""}">
        <span>${escapeHtml(item.text)}</span>
        ${
          item.done
            ? `<span class="review-resolution">结论：${escapeHtml(item.resolution)}（已转入容易忘的规则，原争议已归档）</span>`
            : `
              <textarea rows="2" placeholder="填写处理结论，确认后转入容易忘的规则" data-resolution-for="${index}"></textarea>
              <button type="button" data-resolve-dispute="${index}">填写结论并归档</button>
            `
        }
      </li>
    `;
  }
  return `
    <li class="review-item ${item.done ? "done" : ""}">
      <label class="review-check">
        <input type="checkbox" data-confirm-item="${index}" ${item.done ? "checked" : ""} />
        <span>${escapeHtml(item.text)}</span>
      </label>
    </li>
  `;
}

function buildReviewItems(game, players, windowMinutes) {
  const items = [];
  if (players < game.minPlayers || players > game.maxPlayers) {
    items.push({
      id: "players",
      kind: "confirm",
      text: `实际人数${players}人不在支持范围${game.minPlayers}-${game.maxPlayers}人，确认仍要开局`,
      done: false
    });
  }
  if (game.duration > windowMinutes) {
    items.push({
      id: "duration",
      kind: "confirm",
      text: `预计时长${game.duration}分钟超过今晚窗口${windowMinutes}分钟，确认时间允许`,
      done: false
    });
  }
  game.disputes.forEach((text) => {
    items.push({
      id: `dispute-${items.length}`,
      kind: "dispute",
      text: `争议待处理：${text}`,
      disputeText: text,
      resolution: "",
      done: false
    });
  });
  return items;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    disputeArchive: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const buildButton = event.target.closest("#buildReviewBtn");
  const resolveButton = event.target.closest("[data-resolve-dispute]");
  const recordButton = event.target.closest("#recordStartBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (buildButton) {
    const players = Number(document.querySelector("#reviewPlayersInput").value);
    const windowMinutes = Number(document.querySelector("#reviewWindowInput").value);
    if (!players || !windowMinutes) return;
    reviewDrafts[game.id] = { players, windowMinutes };
    state.review = {
      gameId: game.id,
      players,
      windowMinutes,
      items: buildReviewItems(game, players, windowMinutes)
    };
    reviewNotice = "";
    renderAll();
  }

  if (resolveButton && state.review) {
    const index = Number(resolveButton.dataset.resolveDispute);
    const item = state.review.items[index];
    const textarea = document.querySelector(`[data-resolution-for="${index}"]`);
    const resolution = textarea?.value.trim();
    if (!item || !resolution) return;
    game.forgets.push(`争议结论｜${item.disputeText}：${resolution}`);
    game.disputeArchive.push({
      text: item.disputeText,
      resolution,
      resolvedAt: new Date().toISOString().slice(0, 10)
    });
    const disputeIndex = game.disputes.indexOf(item.disputeText);
    if (disputeIndex >= 0) game.disputes.splice(disputeIndex, 1);
    item.resolution = resolution;
    item.done = true;
    renderAll();
  }

  if (recordButton && state.review) {
    if (!state.review.items.every((item) => item.done)) return;
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    state.review = null;
    reviewNotice = "";
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    if (state.review?.gameId === game.id) state.review = null;
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

els.detailView.addEventListener("change", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  const confirmBox = event.target.closest("[data-confirm-item]");
  if (confirmBox && state.review) {
    state.review.items[Number(confirmBox.dataset.confirmItem)].done = confirmBox.checked;
    renderAll();
    return;
  }

  if (event.target.id === "reviewPlayersInput" || event.target.id === "reviewWindowInput") {
    const players = Number(document.querySelector("#reviewPlayersInput").value);
    const windowMinutes = Number(document.querySelector("#reviewWindowInput").value);
    reviewDrafts[game.id] = { players, windowMinutes };
    const review = state.review;
    if (review && review.gameId === game.id && (review.players !== players || review.windowMinutes !== windowMinutes)) {
      state.review = null;
      reviewNotice = "人数或时长已变化，请重新生成复核清单。";
      renderAll();
    }
  }
});

setDefaultDate();
renderAll();
