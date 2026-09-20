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
      disputeArchive: [],
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
      disputeArchive: [],
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
      disputeArchive: [],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ],
  review: null
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";
if (!state.review || !state.games.some((game) => game.id === state.review.gameId)) {
  state.review = null;
}

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
  visibleCount: document.querySelector("#visibleCount"),
  reviewCount: document.querySelector("#reviewCount"),
  reviewPlayersInput: document.querySelector("#reviewPlayersInput"),
  reviewWindowInput: document.querySelector("#reviewWindowInput"),
  reviewPanel: document.querySelector("#reviewPanel")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const state = { ...structuredClone(defaultState), ...parsed };
    state.games.forEach((game) => {
      if (!Array.isArray(game.disputeArchive)) game.disputeArchive = [];
    });
    return state;
  } catch {
    return structuredClone(defaultState);
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

function getReviewGame() {
  return state.games.find((item) => item.id === state.review?.gameId) || null;
}

function buildReviewItems(game, players, windowMinutes) {
  const items = [];
  if (players < game.minPlayers || players > game.maxPlayers) {
    items.push({
      id: "players",
      type: "check",
      text: `人数 ${players} 人不在支持范围（${game.minPlayers}-${game.maxPlayers} 人）`,
      hint: "未确认前不得记为已玩",
      done: false
    });
  }
  if (game.duration > windowMinutes) {
    items.push({
      id: "duration",
      type: "check",
      text: `预计时长 ${game.duration} 分钟超过今晚窗口 ${windowMinutes} 分钟`,
      hint: "未确认前不得记为已玩",
      done: false
    });
  }
  game.disputes.forEach((dispute, index) => {
    items.push({
      id: `dispute-${index}`,
      type: "dispute",
      dispute,
      text: `争议待处理：${dispute}`,
      hint: "填写处理结论后转为容易忘的规则，原争议归档保留",
      done: false,
      resolution: ""
    });
  });
  return items;
}

function startReview(game, players, windowMinutes) {
  state.review = {
    gameId: game.id,
    players,
    windowMinutes,
    items: buildReviewItems(game, players, windowMinutes)
  };
}

function isReviewReady(review) {
  return Boolean(review) && review.items.every((item) => item.done);
}

function reviewNeedsRecheck(review, game) {
  if (!review || !game) return false;
  const pendingDisputes = review.items.filter((item) => item.type === "dispute" && !item.done).length;
  return (
    review.players !== Number(els.reviewPlayersInput.value) ||
    review.windowMinutes !== Number(els.reviewWindowInput.value) ||
    game.disputes.length !== pendingDisputes
  );
}

function syncReviewInputs() {
  const reviewGame = getReviewGame() || state.games.find((game) => game.id === state.selectedId);
  els.reviewPlayersInput.value = state.review ? state.review.players : reviewGame?.minPlayers ?? 2;
  els.reviewWindowInput.value = state.review ? state.review.windowMinutes : 180;
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
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  const pending = state.review ? state.review.items.filter((item) => !item.done).length : 0;
  els.reviewCount.textContent = state.review ? `${pending}项` : "-";
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
      ${renderReviewStatus(game)}
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
        <button id="reviewGameBtn" class="primary" type="button">复核开局</button>
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
  const archive = game.disputeArchive || [];
  return `
    <section class="rule-section archive-section">
      <h3>争议归档</h3>
      <ul class="rule-list">
        ${
          archive
            .map(
              (entry) => `
                <li>
                  <span>
                    <strong>${escapeHtml(entry.dispute)}</strong><br />
                    结论：${escapeHtml(entry.resolution)}<br />
                    <small>${escapeHtml(entry.date)} 归档</small>
                  </span>
                </li>
              `
            )
            .join("") || `<li><span>暂无归档。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderReviewStatus(game) {
  const review = state.review && state.review.gameId === game.id ? state.review : null;
  if (!review) {
    return `<p class="review-hint">复核通过后才能记录开局。</p>`;
  }
  const pending = review.items.filter((item) => !item.done).length;
  if (pending === 0) {
    return `<p class="review-hint ready">复核清单已全部确认，可以记录开局。</p>`;
  }
  return `<p class="review-hint pending">复核进行中：还有 ${pending} 项待确认，确认前不得记为已玩。</p>`;
}

function renderReviewPanel() {
  const game = getReviewGame();
  if (!state.review || !game) {
    els.reviewPanel.innerHTML = `<p class="empty">选择桌游后点击「复核开局」，生成本次待确认清单。</p>`;
    return;
  }
  const recheck = reviewNeedsRecheck(state.review, game);
  const ready = isReviewReady(state.review);
  const itemsHtml = state.review.items
    .map((item) => {
      if (item.type === "check") {
        return `
          <li class="review-item ${item.done ? "done" : ""}">
            <label class="review-check">
              <input type="checkbox" data-review-check="${item.id}" ${item.done ? "checked" : ""} />
              <span>${escapeHtml(item.text)}<small>${escapeHtml(item.hint)}</small></span>
            </label>
          </li>
        `;
      }
      return `
        <li class="review-item dispute ${item.done ? "done" : ""}">
          <span>${escapeHtml(item.text)}<small>${escapeHtml(item.hint)}</small></span>
          <textarea rows="2" data-review-resolution="${item.id}" placeholder="填写处理结论，确认后转为容易忘的规则" ${item.done ? "disabled" : ""}>${escapeHtml(item.resolution)}</textarea>
          <button type="button" data-review-resolve="${item.id}" ${item.done ? "disabled" : ""}>确认结论并归档</button>
        </li>
      `;
    })
    .join("");
  els.reviewPanel.innerHTML = `
    <div class="review-head">
      <span class="pill">${escapeHtml(game.name)}</span>
      <span class="pill">${state.review.players}人</span>
      <span class="pill">窗口${state.review.windowMinutes}分钟</span>
    </div>
    ${recheck ? `<p class="review-warning">人数或时长已变化，请重新复核生成清单。</p>` : ""}
    ${state.review.items.length === 0 ? `<p class="empty">没有待确认项，可以直接记录开局。</p>` : ""}
    <ul class="review-list">${itemsHtml}</ul>
    <button id="recordPlayBtn" class="primary" type="button" ${ready && !recheck ? "" : "disabled"}>记录开局（今天已玩）</button>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  renderReviewPanel();
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
  if (key === "disputes" && state.review?.gameId === game.id) {
    startReview(game, Number(els.reviewPlayersInput.value), Number(els.reviewWindowInput.value));
  }
  renderAll();
});

function handleReviewParamsChange() {
  const game = getReviewGame();
  if (!game) return;
  startReview(game, Number(els.reviewPlayersInput.value), Number(els.reviewWindowInput.value));
  renderAll();
}

els.reviewPlayersInput.addEventListener("change", handleReviewParamsChange);
els.reviewWindowInput.addEventListener("change", handleReviewParamsChange);

els.reviewPanel.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-review-check]");
  if (!checkbox || !state.review) return;
  const item = state.review.items.find((entry) => entry.id === checkbox.dataset.reviewCheck);
  if (!item) return;
  item.done = checkbox.checked;
  renderAll();
});

els.reviewPanel.addEventListener("input", (event) => {
  const textarea = event.target.closest("[data-review-resolution]");
  if (!textarea || !state.review) return;
  const item = state.review.items.find((entry) => entry.id === textarea.dataset.reviewResolution);
  if (!item) return;
  item.resolution = textarea.value.trim();
  saveState();
});

els.reviewPanel.addEventListener("click", (event) => {
  const resolveButton = event.target.closest("[data-review-resolve]");
  const recordButton = event.target.closest("#recordPlayBtn");
  if (!state.review) return;
  const game = state.games.find((item) => item.id === state.review.gameId);
  if (!game) return;

  if (resolveButton) {
    const item = state.review.items.find((entry) => entry.id === resolveButton.dataset.reviewResolve);
    if (!item || item.type !== "dispute") return;
    const resolution = (item.resolution || "").trim();
    if (!resolution) {
      alert("先填写处理结论，才能确认这条争议。");
      return;
    }
    const disputeIndex = game.disputes.indexOf(item.dispute);
    if (disputeIndex !== -1) {
      game.disputes.splice(disputeIndex, 1);
      game.disputeArchive.push({
        dispute: item.dispute,
        resolution,
        date: new Date().toISOString().slice(0, 10)
      });
    }
    game.forgets.push(`争议结论：${item.dispute} —— ${resolution}`);
    item.done = true;
    renderAll();
  }

  if (recordButton) {
    if (!isReviewReady(state.review) || reviewNeedsRecheck(state.review, game)) return;
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    state.review = null;
    renderAll();
  }
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const reviewButton = event.target.closest("#reviewGameBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    if (key === "disputes" && state.review?.gameId === game.id) {
      startReview(game, Number(els.reviewPlayersInput.value), Number(els.reviewWindowInput.value));
    }
    renderAll();
  }

  if (reviewButton) {
    startReview(game, Number(els.reviewPlayersInput.value), Number(els.reviewWindowInput.value));
    renderAll();
  }

  if (deleteButton) {
    if (state.review?.gameId === game.id) state.review = null;
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
syncReviewInputs();
renderAll();
