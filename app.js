(() => {
  const STORAGE_KEY = "h5_t1_unified_current_session";
  const CSV_FIELDS = [
    "participant_id",
    "project_number",
    "condition",
    "T1_reading_time",
    "start_time",
    "end_time",
  ];

  const PROJECTS = {
    project1: {
      number: "项目一",
      condition: "长卷-解释型",
      sourceId: "019ed411-de9e-73a2-82a7-b95be434eb8d",
      mode: "scroll",
      image: "./assets/scroll-explain.png",
    },
    project2: {
      number: "项目二",
      condition: "长卷-行动型",
      sourceId: "019ed4da-0c5a-7603-a035-2257bc47d1ea",
      mode: "scroll",
      image: "./assets/scroll-action.png",
    },
    project3: {
      number: "项目三",
      condition: "分页-解释型",
      sourceId: "019ed96e-b8da-7790-a523-314e6d61a58f",
      mode: "paged",
      pages: Array.from({ length: 6 }, (_, index) => `./assets/paged-explain-${index}.png`),
    },
    project4: {
      number: "项目四",
      condition: "分页-行动型",
      sourceId: "019edf35-4569-7fb2-9028-ae24e8812fc6",
      mode: "paged",
      pages: Array.from({ length: 6 }, (_, index) => `./assets/paged-action-${index}.png`),
    },
  };

  const app = document.querySelector("#app");
  let state = loadState() || createEmptyState();
  let pagerCleanup = null;
  let finishing = false;

  function createEmptyState() {
    return {
      participant_id: "",
      project_key: "",
      current_step: "participant",
      t1: {},
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getProject() {
    return PROJECTS[state.project_key] || null;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function roundedMs(value) {
    return Math.max(0, Math.round(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setTheme(mode) {
    document.body.classList.toggle("theme-paged", mode === "paged");
  }

  function setScreen(html) {
    if (pagerCleanup) {
      pagerCleanup();
      pagerCleanup = null;
    }
    app.innerHTML = html;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function renderParticipantPage() {
    setTheme("scroll");
    setScreen(`
      <section class="screen">
        <div class="content-panel">
          <p class="copy">请输入您的受试者编号。该编号将用于匹配 H5 实验数据与后续调查问卷数据，请务必填写与调查问卷中一致的编号。</p>
          <div class="field">
            <input class="participant-input" id="participantIdInput" type="text" autocomplete="off" placeholder="请输入受试者编号，例如 P001" />
            <p class="error" id="participantError"></p>
          </div>
          <div class="actions">
            <button class="primary-button" id="confirmParticipant" type="button">确认并进入实验</button>
          </div>
        </div>
      </section>
    `);

    const input = document.querySelector("#participantIdInput");
    const error = document.querySelector("#participantError");
    if (state.participant_id) input.value = state.participant_id;

    const submit = () => {
      const participantId = input.value.trim();
      if (!participantId) {
        error.textContent = "请输入受试者编号";
        input.focus();
        return;
      }
      state = createEmptyState();
      state.participant_id = participantId;
      state.current_step = "project_select";
      saveState();
      renderProjectSelectionPage();
    };

    document.querySelector("#confirmParticipant").addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
  }

  function renderProjectSelectionPage() {
    setTheme("scroll");
    state.current_step = "project_select";
    saveState();
    setScreen(`
      <section class="screen">
        <div class="content-panel">
          <h1 class="title">请选择项目</h1>
          <div class="actions project-actions">
            ${Object.entries(PROJECTS)
              .map(
                ([key, project]) =>
                  `<button class="primary-button project-button" data-project-key="${key}" type="button">${project.number}</button>`,
              )
              .join("")}
          </div>
        </div>
      </section>
    `);

    document.querySelectorAll(".project-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.project_key = button.dataset.projectKey;
        state.current_step = "guide";
        state.t1 = {};
        saveState();
        renderGuidePage();
      });
    });
  }

  function renderGuidePage() {
    const project = getProject();
    if (!project) return renderProjectSelectionPage();
    setTheme(project.mode);
    state.current_step = "guide";
    saveState();

    const materialNoun = project.mode === "paged" ? "一组" : "一张";
    const readingNoun = project.mode === "paged" ? "这组信息图" : "这张信息图";
    const swipeInstruction =
      project.mode === "paged" ? "\n\n阅读时请左滑进入下一页、右滑返回上一页。" : "";

    setScreen(`
      <section class="screen">
        <div class="content-panel">
          <p class="copy">本实验是研究移动端健康信息图阅读形式与内容结构匹配问题。接下来，你会看到${materialNoun}讲解“数字眼疲劳”的信息图，请你仔细阅读${readingNoun}。

阅读完成后，请闭卷完成理解题、情境判断题以及材料感知题。${swipeInstruction}

接下来请跟随指引完成实验。如果你已经准备好，请点击下方按钮开始。</p>
          <div class="actions">
            <button class="primary-button" id="startT1" type="button">点击开始</button>
          </div>
        </div>
      </section>
    `);

    document.querySelector("#startT1").addEventListener("click", () => {
      state.t1 = {
        start_ts: Date.now(),
        start_time: nowIso(),
        page_index: 0,
      };
      state.current_step = "reading";
      saveState();
      renderReadingPage();
    });
  }

  function renderReadingPage() {
    const project = getProject();
    if (!project || !state.t1.start_ts) return renderGuidePage();
    setTheme(project.mode);
    state.current_step = "reading";
    saveState();
    if (project.mode === "paged") renderPagedReading(project);
    else renderScrollReading(project);
  }

  function renderScrollReading(project) {
    setScreen(`
      <section class="screen screen--material">
        <header class="material-header">
          <p class="material-title">请仔细阅读信息图，阅读完成后点击底部按钮。</p>
        </header>
        <div class="material-wrap">
          <img class="material-image tracked-image" src="${project.image}" alt="数字眼疲劳信息图" draggable="false" />
        </div>
        ${missingMarkup()}
        <footer class="material-footer">
          <div class="actions">
            <button class="primary-button finish-reading" type="button">结束阅读</button>
          </div>
        </footer>
      </section>
    `);
    wireImageMissingMessage();
    document.querySelector(".finish-reading").addEventListener("click", finishReading);
  }

  function renderPagedReading(project) {
    const initialPage = clamp(Number(state.t1.page_index) || 0, 0, project.pages.length);
    const pageMarkup = project.pages
      .map(
        (src, index) => `
          <section class="page-slide" data-page-index="${index}" aria-label="第 ${index + 1} 页，共 6 页">
            <img class="page-image tracked-image" src="${src}" alt="数字眼疲劳信息图第 ${index + 1} 页" draggable="false" />
          </section>`,
      )
      .join("");

    setScreen(`
      <section class="material-screen">
        <div class="pager" id="materialPager">
          ${pageMarkup}
          <section class="page-slide end-reading-slide" data-page-index="6" aria-label="结束阅读">
            <div class="actions">
              <button class="primary-button finish-reading" type="button">结束阅读</button>
            </div>
          </section>
        </div>
        ${missingMarkup()}
      </section>
    `);

    wireImageMissingMessage();
    document.querySelector(".finish-reading").addEventListener("click", finishReading);
    pagerCleanup = wirePager(initialPage, project.pages.length, (pageIndex) => {
      state.t1.page_index = pageIndex;
      saveState();
    });
  }

  function missingMarkup() {
    return `<div class="material-missing" id="materialMissing" hidden>未能加载实验材料，请确认 assets 文件夹中的图片完整。</div>`;
  }

  function wireImageMissingMessage() {
    const missing = document.querySelector("#materialMissing");
    document.querySelectorAll(".tracked-image").forEach((image) => {
      image.addEventListener("error", () => {
        if (missing) missing.hidden = false;
      });
    });
  }

  function wirePager(initialPage, maxPage, onPageChange) {
    const pager = document.querySelector("#materialPager");
    let currentPage = clamp(initialPage, 0, maxPage);
    let scrollTimer = null;
    let mouseDrag = null;

    const settle = () => {
      const width = pager.clientWidth || 1;
      const nextPage = clamp(Math.round(pager.scrollLeft / width), 0, maxPage);
      pager.scrollTo({ left: nextPage * width, behavior: "smooth" });
      if (nextPage !== currentPage) {
        currentPage = nextPage;
        onPageChange(currentPage);
      }
    };

    const onScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settle, 90);
    };
    const onPointerDown = (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      mouseDrag = { x: event.clientX, scrollLeft: pager.scrollLeft };
      pager.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
      if (!mouseDrag || event.pointerType !== "mouse") return;
      pager.scrollLeft = mouseDrag.scrollLeft - (event.clientX - mouseDrag.x);
    };
    const onPointerUp = (event) => {
      if (!mouseDrag || event.pointerType !== "mouse") return;
      mouseDrag = null;
      if (pager.hasPointerCapture(event.pointerId)) pager.releasePointerCapture(event.pointerId);
      settle();
    };
    const onResize = () => {
      pager.scrollLeft = currentPage * pager.clientWidth;
    };

    pager.addEventListener("scroll", onScroll, { passive: true });
    pager.addEventListener("pointerdown", onPointerDown);
    pager.addEventListener("pointermove", onPointerMove);
    pager.addEventListener("pointerup", onPointerUp);
    pager.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);

    return () => {
      window.clearTimeout(scrollTimer);
      pager.removeEventListener("scroll", onScroll);
      pager.removeEventListener("pointerdown", onPointerDown);
      pager.removeEventListener("pointermove", onPointerMove);
      pager.removeEventListener("pointerup", onPointerUp);
      pager.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }

  function finishReading(event) {
    if (finishing) return;
    finishing = true;
    event.currentTarget.disabled = true;
    const endTs = Date.now();
    state.t1.end_ts = endTs;
    state.t1.end_time = nowIso();
    state.t1.reading_time_ms = roundedMs(endTs - (state.t1.start_ts || endTs));
    state.current_step = "completed";
    saveState();
    exportCsv();
    renderCompletionPage();
  }

  function renderCompletionPage() {
    const project = getProject();
    if (!project) return renderProjectSelectionPage();
    setTheme(project.mode);
    state.current_step = "completed";
    saveState();
    setScreen(`
      <section class="screen">
        <div class="content-panel">
          <h1 class="title">阅读结束，数据已导出</h1>
          <p class="copy">感谢您的参与和配合！</p>
          <div class="actions">
            <button class="primary-button" id="exportAgain" type="button">再次导出数据</button>
            <button class="secondary-button" id="restartExperiment" type="button">重新开始新受试者</button>
          </div>
          <p class="debug-note">导出文件为 CSV，可使用 Excel 打开。</p>
        </div>
      </section>
    `);

    document.querySelector("#exportAgain").addEventListener("click", exportCsv);
    document.querySelector("#restartExperiment").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      state = createEmptyState();
      finishing = false;
      renderParticipantPage();
    });
  }

  function exportCsv() {
    const project = getProject();
    if (!project) return;
    const row = {
      participant_id: state.participant_id,
      project_number: project.number,
      condition: project.condition,
      T1_reading_time: state.t1.reading_time_ms ?? "",
      start_time: state.t1.start_time || "",
      end_time: state.t1.end_time || "",
    };
    const csv = `${CSV_FIELDS.join(",")}\r\n${CSV_FIELDS.map((field) => csvEscape(row[field])).join(",")}\r\n`;
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(state.participant_id || "unknown")}_${project.condition}_T1实验数据.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function sanitizeFilename(value) {
    return value.replace(/[\\/:*?"<>|]/g, "_");
  }

  function resumeFromState() {
    if (!state.participant_id) return renderParticipantPage();
    switch (state.current_step) {
      case "project_select":
        renderProjectSelectionPage();
        break;
      case "guide":
        renderGuidePage();
        break;
      case "reading":
        renderReadingPage();
        break;
      case "completed":
        renderCompletionPage();
        break;
      default:
        renderProjectSelectionPage();
    }
  }

  resumeFromState();
})();
