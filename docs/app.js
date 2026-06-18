    const OAUTH_CLIENT_ID = "851780710057-jilmd0lqqm402i2gsnpf9o5t3plf1vkr.apps.googleusercontent.com";
    const SPREADSHEET_ID = "1gNt24it0OKAaxJJb-pyXDtpd0PmfT3H1irdJUk-lPEk";
    const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdqQa1bmu-sLxzmfuK5-e0Jf83uIIXLZJPaWsngEUJ6alXTqw/viewform?usp=header";
    const RESPONSE_TAB_NAME = "Form Responses 1";
    const DISCUSSION_TAB_NAME = "discussion";
    const CASE_REVIEW_TAB_NAME = "case_review";
    const STORAGE_KEY = "cdcf-simple-config";
    const ROSTER_CACHE_KEY = "cdcf-roster-cache";
    const EDITOR_CACHE_KEY = "cdcf-editor-cache";
    const RIGHT_TAB_KEY = "cdcf-right-tab";
    const ZOOM_CACHE_KEY = "cdcf-pane-zoom";
    const SPLIT_CACHE_KEY_PREFIX = "cdcf-pane-split-v3";
    const DISCUSSION_SPLIT_CACHE_KEY = "cdcf-pane-split-discussion-v2";
    const CASE_REVIEW_PANE_CACHE_KEY = "cdcf-case-review-pane-width-v1";
    const MODE_CACHE_KEY = "cdcf-mode";
    const DISCUSSION_FILTER_KEY = "cdcf-discussion-filter";
    const PREVIEW_FIT_KEY = "cdcf-preview-fit";
    const PREVIEW_FIT_CROP_X = 72;
    const PREVIEW_FIT_CROP_Y = 36;
    const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
    const DISCUSSION_FILTERS = ["all", "diff", "flag"];
    const NON_REVIEW_HEADERS = new Set([
      "timestamp",
      "articleid",
      "article_id",
      "uuid",
      "caseid",
      "case_id",
      "article_title",
      "title",
      "articletitle",
      "drop_in_article_text",
      "clean_text",
      "article_text",
      "link_to_article",
      "article_link",
      "link",
      "url",
      "edit_response_url",
      "edit_response_link",
      "link_to_edit_response",
      "link_to_edit_reponse"
    ]);
    let accessToken = "";
    let tokenClient = null;
    let authRequestMode = "manual";
    let rosterRows = [];
    let currentRosterIndex = -1;
    let discussionCases = [];
    let discussionResponsesByCaseId = new Map();
    let currentDiscussionIndex = -1;
    let discussionHeaders = [];
    let discussionAttributeStartIndex = -1;
    let currentDiscussionItems = [];
    let currentDiscussionDiffs = [];
    let currentDiscussionDiffIndex = 0;
    let currentDiscussionFilter = normalizeDiscussionFilter(localStorage.getItem(DISCUSSION_FILTER_KEY));
    let discussionNoteRequestId = 0;
    let caseReviewNoteRequestId = 0;
    let selectedCaseReviewAttribute = "";
    let messageTimer = 0;
    let zoomState = { article: 1, right: 1, editor: 1 };
    let currentMode = "annotation";
    let previewFitEnabled = true;

    const els = {};
    [
      "status",
      "sign-in",
      "mode-annotation",
      "mode-discussion",
      "client-id",
      "spreadsheet-id",
      "roster-tab-name",
      "form-url",
      "article-select",
      "jump-id",
      "jump-go",
      "nav-prev",
      "nav-next",
      "article-position",
      "message",
      "article-frame-title",
      "article-frame-link",
      "article-refresh",
      "case-copy-id",
      "article-copy-link",
      "article-open-link",
      "article-frame-wrap",
      "article-frame",
      "article-zoom-out",
      "article-zoom-reset",
      "article-zoom-in",
      "pane-divider",
      "review-pane-divider",
      "tab-preview",
      "tab-form",
      "preview-fit",
      "form-open-link",
      "right-content",
      "preview-frame-wrap",
      "preview-frame",
      "form-frame",
      "case-review-case-id",
      "case-review-case-select",
      "case-review-add-case",
      "case-review-flags",
      "case-review-note-panel",
      "case-review-note-attribute",
      "case-review-note",
      "case-review-note-save",
      "discussion-edit-panel",
      "discussion-edit-title",
      "discussion-edit-open",
      "discussion-edit-empty",
      "discussion-edit-frame",
      "editor-panel",
      "discussion-panel",
      "discussion-filter-bar",
      "discussion-filter-all",
      "discussion-filter-diff",
      "discussion-filter-flag",
      "discussion-empty",
      "discussion-manual-card",
      "manual-attribute-select",
      "manual-discussion-note",
      "manual-discussion-save",
      "discussion-diff-card",
      "diff-prev",
      "diff-next",
      "diff-count",
      "diff-attribute",
      "diff-source",
      "cheng-answer",
      "briana-answer",
      "discussion-note",
      "discussion-save",
      "discussion-resolve-flag",
      "clean-text-editor",
      "editor-zoom-out",
      "editor-zoom-reset",
      "editor-zoom-in",
      "right-zoom-out",
      "right-zoom-reset",
      "right-zoom-in"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });

    init();

    function init() {
      const config = loadConfig();
      els["client-id"].value = config.clientId || OAUTH_CLIENT_ID;
      els["spreadsheet-id"].value = config.spreadsheetId || SPREADSHEET_ID;
      els["roster-tab-name"].value = config.rosterTabName || "article_roster";
      els["form-url"].value = config.formUrl || FORM_URL;

      els["sign-in"].addEventListener("click", signIn);
      els["mode-annotation"].addEventListener("click", () => setMode("annotation"));
      els["mode-discussion"].addEventListener("click", () => setMode("discussion"));
      els["article-select"].addEventListener("change", handleRosterSelect);
      els["jump-go"].addEventListener("click", jumpToCurrentModeItem);
      els["jump-id"].addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          jumpToCurrentModeItem();
        }
      });
      els["nav-prev"].addEventListener("click", () => moveCurrentModeItem(-1));
      els["nav-next"].addEventListener("click", () => moveCurrentModeItem(1));
      els["article-refresh"].addEventListener("click", refreshArticleFrame);
      els["case-copy-id"].addEventListener("click", copyCurrentCaseId);
      els["article-copy-link"].addEventListener("click", copyCurrentArticleLink);
      els["tab-preview"].addEventListener("click", () => setRightTab("preview"));
      els["tab-form"].addEventListener("click", () => setRightTab("form"));
      els["preview-fit"].addEventListener("click", () => setPreviewFit(!previewFitEnabled));
      els["case-review-case-id"].addEventListener("change", handleCaseReviewCaseInput);
      els["case-review-case-select"].addEventListener("change", handleCaseReviewCaseSelect);
      els["case-review-add-case"].addEventListener("click", addCaseReviewCase);
      els["case-review-flags"].addEventListener("click", handleCaseReviewAttributeClick);
      els["case-review-flags"].addEventListener("change", handleCaseReviewFlagChange);
      els["case-review-note-save"].addEventListener("click", saveCaseReviewNote);
      els["clean-text-editor"].addEventListener("input", saveCurrentEditorDraft);
      els["article-zoom-out"].addEventListener("click", () => changePaneZoom("article", -0.1));
      els["article-zoom-in"].addEventListener("click", () => changePaneZoom("article", 0.1));
      els["article-zoom-reset"].addEventListener("click", () => setPaneZoom("article", 1));
      els["editor-zoom-out"].addEventListener("click", () => changePaneZoom("editor", -0.1));
      els["editor-zoom-in"].addEventListener("click", () => changePaneZoom("editor", 0.1));
      els["editor-zoom-reset"].addEventListener("click", () => setPaneZoom("editor", 1));
      els["right-zoom-out"].addEventListener("click", () => changePaneZoom("right", -0.1));
      els["right-zoom-in"].addEventListener("click", () => changePaneZoom("right", 0.1));
      els["right-zoom-reset"].addEventListener("click", () => setPaneZoom("right", 1));
      els["diff-prev"].addEventListener("click", () => moveDiscussionDiff(-1));
      els["diff-next"].addEventListener("click", () => moveDiscussionDiff(1));
      els["discussion-filter-bar"].addEventListener("click", handleDiscussionFilterClick);
      els["discussion-save"].addEventListener("click", saveDiscussionNote);
      els["discussion-resolve-flag"].addEventListener("click", resolveCurrentDiscussionFlag);
      els["manual-discussion-save"].addEventListener("click", saveManualDiscussionNote);
      els["pane-divider"].addEventListener("pointerdown", startPaneResize);
      els["pane-divider"].addEventListener("dblclick", () => setPaneSplit(defaultPaneSplit()));
      els["review-pane-divider"].addEventListener("pointerdown", startReviewPaneResize);
      els["review-pane-divider"].addEventListener("dblclick", () => setReviewPaneWidth(defaultReviewPaneWidth()));
      restorePreviewFit();
      restorePaneZoom();
      restorePaneSplit();
      restoreReviewPaneWidth();
      showArticlePlaceholder();
      loadFormFrame();
      setRightTab(localStorage.getItem(RIGHT_TAB_KEY) === "form" ? "form" : "preview");
      restoreRosterCache();
      setMode(localStorage.getItem(MODE_CACHE_KEY) === "discussion" ? "discussion" : "annotation", false);
      window.setTimeout(trySilentSignIn, 600);
    }

    function loadConfig() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function saveConfig() {
      const config = currentConfig();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      tokenClient = null;
      showMessage("Config saved in this browser.", "ok");
    }

    function currentConfig() {
      return {
        clientId: els["client-id"].value.trim(),
        spreadsheetId: els["spreadsheet-id"].value.trim() || SPREADSHEET_ID,
        rosterTabName: els["roster-tab-name"].value.trim() || "article_roster",
        formUrl: els["form-url"].value.trim() || FORM_URL
      };
    }

    function handleRosterSelect() {
      const index = Number(els["article-select"].value);
      if (currentMode === "discussion") {
        selectDiscussionCaseByIndex(index);
        return;
      }
      selectArticleByIndex(index, false);
    }

    function jumpToCurrentModeItem() {
      if (currentMode === "discussion") {
        jumpToDiscussionCase();
        return;
      }
      jumpToArticle();
    }

    function moveCurrentModeItem(delta) {
      if (currentMode === "discussion") {
        moveDiscussionCase(delta);
        return;
      }
      moveArticle(delta);
    }

    function setMode(mode, persist = true) {
      const nextMode = mode === "discussion" ? "discussion" : "annotation";
      currentMode = nextMode;
      document.body.dataset.mode = nextMode;
      restorePaneSplit();
      restoreReviewPaneWidth();
      const useDiscussion = nextMode === "discussion";
      els["mode-annotation"].classList.toggle("active", !useDiscussion);
      els["mode-discussion"].classList.toggle("active", useDiscussion);
      els["mode-annotation"].setAttribute("aria-selected", String(!useDiscussion));
      els["mode-discussion"].setAttribute("aria-selected", String(useDiscussion));
      if (persist) {
        localStorage.setItem(MODE_CACHE_KEY, nextMode);
      }

      setModeControls(useDiscussion);
      if (useDiscussion) {
        saveCurrentEditorDraft();
        showDiscussionPlaceholder();
        showDiscussionRightPlaceholder();
        if (accessToken) {
          loadDiscussionCases();
        } else {
          renderDiscussionOptions();
        }
        return;
      }

      els["discussion-panel"].classList.add("hidden");
      renderRosterOptions();
      renderCaseReviewFlags();
      loadFormFrame();
      setRightTab(localStorage.getItem(RIGHT_TAB_KEY) === "form" ? "form" : "preview");
      const article = currentArticle();
      if (article) {
        els["article-select"].value = String(currentRosterIndex);
        showAnnotationEditor(article);
        refreshCaseReviewForArticle();
      } else {
        showArticlePlaceholder();
      }
    }

    function setModeControls(useDiscussion) {
      ["article-select", "jump-id", "jump-go", "nav-prev", "nav-next"].forEach((id) => {
        els[id].disabled = false;
      });
      ["article-refresh", "tab-preview", "tab-form"].forEach((id) => {
        els[id].disabled = useDiscussion;
      });
      els["form-open-link"].setAttribute("aria-disabled", String(useDiscussion));
      els["jump-id"].placeholder = useDiscussion ? "A109-C01" : "A050";
    }

    function signIn() {
      requestGoogleToken("manual");
    }

    function requestGoogleToken(mode) {
      const config = currentConfig();
      if (!config.clientId) {
        if (mode === "manual") {
          showMessage("Google sign-in is not configured correctly.", "error");
        }
        return;
      }
      if (!window.google || !google.accounts || !google.accounts.oauth2) {
        if (mode === "manual") {
          showMessage("Google Identity Services did not load. Open this page from GitHub Pages or localhost.", "error");
        }
        return;
      }
      authRequestMode = mode;
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: SCOPE,
          callback: (response) => {
            if (response.error) {
              if (authRequestMode === "manual") {
                showMessage(response.error, "error");
              } else {
                els.status.textContent = "Not connected";
                els.status.className = "status";
                showMessage("Sign in when you are ready to connect Google Sheets.", "warn");
              }
              return;
            }
            accessToken = response.access_token;
            els.status.textContent = "Connected";
            els.status.className = "status ok";
            const message = authRequestMode === "silent"
              ? "Google sign-in restored. You can read and write the shared sheet."
              : "Signed in. Google will use this user's permission to write the sheet.";
            showMessage(message, "ok");
            if (currentMode === "annotation") {
              loadRosterRows();
              loadResponseHeaders();
            } else {
              loadDiscussionCases();
            }
          }
        });
      }
      const prompt = mode === "silent" || accessToken ? "" : "consent";
      tokenClient.requestAccessToken({ prompt });
    }

    function trySilentSignIn() {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (accessToken) {
          window.clearInterval(timer);
          return;
        }
        if (window.google && google.accounts && google.accounts.oauth2) {
          window.clearInterval(timer);
          requestGoogleToken("silent");
          return;
        }
        if (Date.now() - startedAt > 5000) {
          window.clearInterval(timer);
        }
      }, 250);
    }

    async function loadRosterRows() {
      try {
        requireToken();
        const config = currentConfig();
        const previousArticle = currentArticle();
        const previousId = normalizeArticleId(previousArticle && previousArticle.id ? previousArticle.id : els["jump-id"].value);
        const previousIndex = currentRosterIndex;
        const data = await sheetsFetch(`/values/${encodeURIComponent(`${quoteSheet(config.rosterTabName)}!A1:Z500`)}`);
        const rows = data.values || [];
        rosterRows = parseRosterRows(rows);
        currentRosterIndex = -1;
        renderRosterOptions();
        if (rosterRows.length) {
          const idIndex = previousId
            ? rosterRows.findIndex((row) => normalizeArticleId(row.id) === previousId)
            : -1;
          const fallbackIndex = previousIndex >= 0
            ? Math.min(previousIndex, rosterRows.length - 1)
            : 0;
          selectArticleByIndex(idIndex >= 0 ? idIndex : fallbackIndex, false);
        }
        saveRosterCache();
        showMessage(`Loaded ${rosterRows.length} article roster row(s).`, "ok");
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    async function loadResponseHeaders() {
      try {
        requireToken();
        const data = await sheetsFetch(`/values/${encodeURIComponent(`${quoteSheet(RESPONSE_TAB_NAME)}!A1:ZZ1`)}`);
        parseResponseHeaders(data.values || []);
        renderCaseReviewFlags();
        await ensureCaseReviewHeaders();
        await refreshCaseReviewForArticle();
      } catch (error) {
        renderCaseReviewEmpty(error.message);
      }
    }

    async function loadDiscussionCases() {
      try {
        requireToken();
        const previousCase = currentDiscussionCase();
        const previousId = normalizeCaseId(previousCase && previousCase.caseId ? previousCase.caseId : els["jump-id"].value);
        const previousIndex = currentDiscussionIndex;
        const data = await sheetsFetch(`/values/${encodeURIComponent(`${quoteSheet(RESPONSE_TAB_NAME)}!A1:ZZ1000`)}`);
        const rows = data.values || [];
        discussionCases = parseDiscussionCases(rows);
        currentDiscussionIndex = -1;
        renderDiscussionOptions();
        if (discussionCases.length) {
          const idIndex = previousId
            ? discussionCases.findIndex((row) => normalizeCaseId(row.caseId) === previousId)
            : -1;
          const fallbackIndex = previousIndex >= 0
            ? Math.min(previousIndex, discussionCases.length - 1)
            : 0;
          selectDiscussionCaseByIndex(idIndex >= 0 ? idIndex : fallbackIndex);
        } else {
          showDiscussionPlaceholder();
          showDiscussionRightPlaceholder();
          showDiscussionEditPlaceholder();
          showDiscussionEmpty("No Cheng discussion cases found.");
        }
        showMessage(`Loaded ${discussionCases.length} Cheng discussion case(s).`, "ok");
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    async function sheetsFetch(path, options = {}) {
      const config = currentConfig();
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(body.error && body.error.message ? body.error.message : response.statusText);
      }
      return body;
    }

    function parseDiscussionCases(rows) {
      if (!rows.length) {
        discussionHeaders = [];
        discussionResponsesByCaseId = new Map();
        discussionAttributeStartIndex = -1;
        return [];
      }
      discussionHeaders = rows[0].map((header) => String(header || "").trim());
      const headers = discussionHeaders.map(normalizeHeader);
      const articleIdIndex = findHeaderIndex(headers, ["articleid", "article_id"]);
      const caseIdIndex = findHeaderIndex(headers, ["caseid", "case_id"]);
      const titleIndex = findHeaderIndex(headers, ["article_title", "title", "articletitle"]);
      const cleanTextIndex = findHeaderIndex(headers, ["drop_in_article_text", "clean_text", "article_text"]);
      const linkIndex = findHeaderIndex(headers, ["link_to_article", "article_link", "link", "url"]);
      const editUrlIndex = findHeaderIndex(headers, ["edit_response_url", "edit_response_link", "link_to_edit_response", "link_to_edit_reponse"]);
      discussionAttributeStartIndex = findHeaderIndex(headers, ["year_drowning_occurred"]);
      if (caseIdIndex === -1) {
        throw new Error(`${RESPONSE_TAB_NAME} is missing a caseID column.`);
      }
      if (discussionAttributeStartIndex === -1) {
        throw new Error(`${RESPONSE_TAB_NAME} is missing a Year drowning occurred column.`);
      }

      const responses = rows.slice(1)
        .map((row, offset) => ({
          rowNumber: offset + 2,
          articleId: cellValue(row, articleIdIndex),
          caseId: cellValue(row, caseIdIndex),
          title: cellValue(row, titleIndex),
          cleanText: cellValue(row, cleanTextIndex),
          link: cellValue(row, linkIndex),
          editUrl: cellValue(row, editUrlIndex),
          values: row
        }))
        .filter((row) => row.caseId);

      discussionResponsesByCaseId = new Map();
      responses.forEach((row) => {
        discussionResponsesByCaseId.set(normalizeCaseId(row.caseId), row);
      });
      return responses.filter((row) => !isBrianaCaseId(row.caseId));
    }

    function parseResponseHeaders(rows) {
      if (!rows.length) {
        discussionHeaders = [];
        discussionAttributeStartIndex = -1;
        return;
      }
      discussionHeaders = rows[0].map((header) => String(header || "").trim());
      const headers = discussionHeaders.map(normalizeHeader);
      discussionAttributeStartIndex = findHeaderIndex(headers, ["year_drowning_occurred"]);
      if (discussionAttributeStartIndex === -1) {
        throw new Error(`${RESPONSE_TAB_NAME} is missing a Year drowning occurred column.`);
      }
    }

    function parseRosterRows(rows) {
      if (!rows.length) {
        return [];
      }
      const headers = rows[0].map(normalizeHeader);
      const idIndex = findHeaderIndex(headers, ["articleid", "article_id", "id"]);
      const titleIndex = findHeaderIndex(headers, ["article_title", "title", "articletitle"]);
      const linkIndex = findHeaderIndex(headers, ["link_to_article", "article_link", "link", "url"]);

      return rows.slice(1)
        .filter((row) => row.some((cell) => String(cell || "").trim()))
        .map((row) => ({
          id: row[idIndex] || "",
          title: row[titleIndex] || "",
          link: row[linkIndex] || ""
        }));
    }

    function renderRosterOptions() {
      els["article-select"].innerHTML = rosterRows.map((row, index) => {
        const labelParts = [row.id, row.title].filter(Boolean);
        return `<option value="${index}">${escapeHtml(labelParts.join(" - ") || `Article ${index + 1}`)}</option>`;
      }).join("");
      updateArticlePosition();
    }

    function selectArticleByIndex(index, openExternal = false) {
      if (!rosterRows.length) {
        showMessage("Load roster first.", "warn");
        return;
      }
      saveCurrentEditorDraft();
      const requestedIndex = Number.isFinite(index) ? index : 0;
      const boundedIndex = Math.max(0, Math.min(rosterRows.length - 1, requestedIndex));
      const article = rosterRows[boundedIndex];
      currentRosterIndex = boundedIndex;
      els["article-select"].value = String(boundedIndex);
      els["jump-id"].value = article.id || "";
      showAnnotationEditor(article);
      if (openExternal && article.link) {
        window.open(article.link, "cdcf_article_window", "noopener");
      }
      loadEditorDraft(article);
      updateArticlePosition();
      saveRosterCache();
      refreshCaseReviewForArticle();
    }

    function jumpToArticle() {
      const target = normalizeArticleId(els["jump-id"].value);
      const index = rosterRows.findIndex((row) => normalizeArticleId(row.id) === target);
      if (index === -1) {
        showMessage(`Article not found: ${els["jump-id"].value}`, "error");
        return;
      }
      selectArticleByIndex(index, false);
    }

    function moveArticle(delta) {
      if (!rosterRows.length) {
        showMessage("Load roster first.", "warn");
        return;
      }
      const baseIndex = currentRosterIndex === -1 ? 0 : currentRosterIndex;
      selectArticleByIndex(baseIndex + delta, false);
    }

    function updateArticlePosition() {
      if (!rosterRows.length || currentRosterIndex === -1) {
        els["article-position"].textContent = rosterRows.length ? `${rosterRows.length} articles loaded` : "No roster loaded";
        return;
      }
      const article = rosterRows[currentRosterIndex];
      els["article-position"].textContent = `${currentRosterIndex + 1} / ${rosterRows.length}  ${article.id || ""}`;
    }

    function renderDiscussionOptions() {
      if (!discussionCases.length) {
        els["article-select"].innerHTML = `<option value="">No discussion cases loaded</option>`;
        updateDiscussionPosition();
        return;
      }
      els["article-select"].innerHTML = discussionCases.map((row, index) => {
        const labelParts = [row.caseId, row.title].filter(Boolean);
        return `<option value="${index}">${escapeHtml(labelParts.join(" - ") || `Case ${index + 1}`)}</option>`;
      }).join("");
      if (currentDiscussionIndex >= 0) {
        els["article-select"].value = String(currentDiscussionIndex);
      }
      updateDiscussionPosition();
    }

    function selectDiscussionCaseByIndex(index) {
      if (!discussionCases.length) {
        showMessage("Sign in to load discussion cases.", "warn");
        return;
      }
      const requestedIndex = Number.isFinite(index) ? index : 0;
      const boundedIndex = Math.max(0, Math.min(discussionCases.length - 1, requestedIndex));
      const discussionCase = discussionCases[boundedIndex];
      currentDiscussionIndex = boundedIndex;
      els["article-select"].value = String(boundedIndex);
      els["jump-id"].value = discussionCase.caseId || "";
      showDiscussionCaseContent(discussionCase);
      renderDiscussionEditResponse(discussionCase);
      renderDiscussionDiffs(discussionCase);
      updateDiscussionPosition();
    }

    function jumpToDiscussionCase() {
      const target = normalizeCaseId(els["jump-id"].value);
      const index = discussionCases.findIndex((row) => normalizeCaseId(row.caseId) === target);
      if (index === -1) {
        showMessage(`Case not found: ${els["jump-id"].value}`, "error");
        return;
      }
      selectDiscussionCaseByIndex(index);
    }

    function moveDiscussionCase(delta) {
      if (!discussionCases.length) {
        showMessage("Sign in to load discussion cases.", "warn");
        return;
      }
      const baseIndex = currentDiscussionIndex === -1 ? 0 : currentDiscussionIndex;
      selectDiscussionCaseByIndex(baseIndex + delta);
    }

    function currentDiscussionCase() {
      if (currentDiscussionIndex < 0) {
        return null;
      }
      return discussionCases[currentDiscussionIndex] || null;
    }

    function updateDiscussionPosition() {
      if (!discussionCases.length || currentDiscussionIndex === -1) {
        els["article-position"].textContent = discussionCases.length ? `${discussionCases.length} cases loaded` : "No discussion cases loaded";
        return;
      }
      const discussionCase = discussionCases[currentDiscussionIndex];
      els["article-position"].textContent = `${currentDiscussionIndex + 1} / ${discussionCases.length}  ${discussionCase.caseId || ""}`;
    }

    function showAnnotationEditor(article) {
      const title = article.title || article.id || "Article";
      const link = article.link || "";
      const defaultCaseId = defaultCaseIdForArticle(article);
      els["case-review-case-id"].value = defaultCaseId;
      renderCaseReviewCaseOptions([defaultCaseId], defaultCaseId);
      els["article-frame"].removeAttribute("srcdoc");
      els["article-frame"].src = "about:blank";
      els["article-frame-title"].textContent = title;
      els["article-frame-title"].title = title;
      els["article-frame-link"].textContent = link;
      els["article-frame-link"].title = link;
      if (link) {
        els["article-copy-link"].disabled = false;
        els["article-open-link"].href = link;
        els["article-open-link"].setAttribute("aria-disabled", "false");
        els["preview-frame"].src = link;
        if (currentMode === "annotation") {
          setRightTab("preview");
        }
      } else {
        els["article-copy-link"].disabled = true;
        els["article-open-link"].removeAttribute("href");
        els["article-open-link"].setAttribute("aria-disabled", "true");
        els["preview-frame"].src = "about:blank";
      }
    }

    function defaultCaseIdForArticle(article) {
      const articleId = normalizeArticleId(article && article.id);
      return articleId ? `${articleId}-C01` : "";
    }

    function loadArticleFrame(link, title, openExternal = false, articleId = "") {
      if (!link) {
        showMessage("This roster row has no article link.", "warn");
        return;
      }
      els["article-frame"].removeAttribute("srcdoc");
      els["article-frame-title"].textContent = title || articleId || "Article";
      els["article-frame-title"].title = title || articleId || "Article";
      els["article-frame-link"].textContent = link;
      els["article-frame-link"].title = link;
      els["article-copy-link"].disabled = false;
      els["article-open-link"].href = link;
      els["article-open-link"].setAttribute("aria-disabled", "false");
      els["article-frame"].src = link;
      if (openExternal) {
        window.open(link, "cdcf_article_window", "noopener");
      }
      showMessage(`Selected: ${articleId || title || link}`, "ok");
    }

    function refreshArticleFrame() {
      const article = currentArticle();
      if (!article || !article.link) {
        showMessage("No article selected.", "warn");
        return;
      }
      els["preview-frame"].src = withCacheBust(article.link);
      setRightTab("preview");
      showMessage(`Refreshing: ${article.id || article.title || "article"}`, "ok");
    }

    async function copyCurrentArticleLink() {
      const article = currentArticle();
      const link = currentMode === "annotation" && article && article.link
        ? article.link
        : els["article-open-link"].getAttribute("href");
      if (!link || link === "#") {
        showMessage("No article link to copy.", "warn");
        return;
      }
      try {
        await copyText(link);
        showMessage("Article link copied.", "ok");
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    async function copyCurrentCaseId() {
      const caseId = currentCaseReviewCaseId();
      if (!caseId) {
        showMessage("No case ID to copy.", "warn");
        return;
      }
      try {
        await copyText(caseId);
        showMessage("Case ID copied.", "ok");
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) {
        throw new Error("Could not copy article link.");
      }
    }

    function restoreRosterCache() {
      try {
        const cached = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY) || "{}");
        if (!Array.isArray(cached.rows) || !cached.rows.length) {
          return;
        }
        rosterRows = cached.rows.map((row) => ({
          id: String(row.id || ""),
          title: String(row.title || ""),
          link: String(row.link || "")
        }));
        renderRosterOptions();
        const cachedIndex = Number.isInteger(cached.currentIndex) ? cached.currentIndex : 0;
        selectArticleByIndex(cachedIndex, false);
        const savedAt = cached.savedAt ? new Date(cached.savedAt).toLocaleString() : "";
        showMessage(`Restored ${rosterRows.length} cached article(s)${savedAt ? ` from ${savedAt}` : ""}. Google Sheets will refresh after sign-in.`, "ok");
      } catch {
        localStorage.removeItem(ROSTER_CACHE_KEY);
      }
    }

    function saveRosterCache() {
      if (!rosterRows.length) {
        localStorage.removeItem(ROSTER_CACHE_KEY);
        return;
      }
      const payload = {
        rows: rosterRows,
        currentIndex: currentRosterIndex,
        savedAt: Date.now()
      };
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(payload));
    }

    function setRightTab(tabName) {
      if (currentMode === "discussion") {
        showDiscussionRightPlaceholder();
        return;
      }
      const useForm = tabName === "form";
      els["tab-preview"].classList.toggle("active", !useForm);
      els["tab-form"].classList.toggle("active", useForm);
      els["tab-preview"].setAttribute("aria-selected", String(!useForm));
      els["tab-form"].setAttribute("aria-selected", String(useForm));
      els["preview-frame-wrap"].classList.toggle("hidden", useForm);
      els["form-frame"].classList.toggle("hidden", !useForm);
      els["preview-fit"].classList.toggle("hidden", useForm);
      els["discussion-panel"].classList.add("hidden");
      els["editor-panel"].classList.remove("hidden");
      localStorage.setItem(RIGHT_TAB_KEY, useForm ? "form" : "preview");
    }

    function restorePreviewFit() {
      const cached = localStorage.getItem(PREVIEW_FIT_KEY);
      previewFitEnabled = cached === null ? true : cached === "1";
      updatePreviewFitButton();
    }

    function setPreviewFit(enabled) {
      previewFitEnabled = Boolean(enabled);
      localStorage.setItem(PREVIEW_FIT_KEY, previewFitEnabled ? "1" : "0");
      updatePreviewFitButton();
      applyPaneZoom("right");
    }

    function updatePreviewFitButton() {
      els["preview-fit"].classList.toggle("active", previewFitEnabled);
      els["preview-fit"].setAttribute("aria-pressed", String(previewFitEnabled));
      els["preview-fit"].title = previewFitEnabled
        ? "Show original article preview"
        : "Fit article preview";
    }

    function currentArticle() {
      if (currentRosterIndex < 0) {
        return null;
      }
      return rosterRows[currentRosterIndex] || null;
    }

    function editorCacheKey(article) {
      if (!article) {
        return "";
      }
      const normalizedId = normalizeArticleId(article.id);
      return normalizedId || `row-${currentRosterIndex + 1}`;
    }

    function loadEditorCache() {
      try {
        const cache = JSON.parse(localStorage.getItem(EDITOR_CACHE_KEY) || "{}");
        return cache && typeof cache === "object" && !Array.isArray(cache) ? cache : {};
      } catch {
        return {};
      }
    }

    function saveEditorCache(cache) {
      localStorage.setItem(EDITOR_CACHE_KEY, JSON.stringify(cache));
    }

    function loadEditorDraft(article) {
      const key = editorCacheKey(article);
      const cache = loadEditorCache();
      els["clean-text-editor"].value = key ? cache[key] || "" : "";
    }

    function saveCurrentEditorDraft() {
      const article = currentArticle();
      const key = editorCacheKey(article);
      if (!key || !els["clean-text-editor"]) {
        return;
      }
      const cache = loadEditorCache();
      cache[key] = els["clean-text-editor"].value;
      saveEditorCache(cache);
    }

    function restorePaneZoom() {
      try {
        const cached = JSON.parse(localStorage.getItem(ZOOM_CACHE_KEY) || "{}");
        zoomState.article = sanitizeZoom(cached.article, 1);
        zoomState.right = sanitizeZoom(cached.right, 1);
        zoomState.editor = sanitizeZoom(cached.editor, 1);
      } catch {
        zoomState = { article: 1, right: 1, editor: 1 };
      }
      applyPaneZoom("article");
      applyPaneZoom("right");
      applyPaneZoom("editor");
    }

    function changePaneZoom(pane, delta) {
      setPaneZoom(pane, zoomState[pane] + delta);
    }

    function setPaneZoom(pane, value) {
      zoomState[pane] = sanitizeZoom(value, 1);
      applyPaneZoom(pane);
      localStorage.setItem(ZOOM_CACHE_KEY, JSON.stringify(zoomState));
    }

    function applyPaneZoom(pane) {
      const zoom = zoomState[pane];
      if (pane === "editor") {
        els["clean-text-editor"].style.fontSize = `${zoom}em`;
        els["editor-zoom-reset"].textContent = `${Math.round(zoom * 100)}%`;
        return;
      }
      const targets = pane === "article"
        ? [els["article-frame"]]
        : [els["preview-frame"], els["form-frame"], els["discussion-panel"]];
      targets.forEach((target) => {
        const usePreviewFit = target === els["preview-frame"] && previewFitEnabled;
        const cropX = usePreviewFit ? PREVIEW_FIT_CROP_X : 0;
        const cropY = usePreviewFit ? PREVIEW_FIT_CROP_Y : 0;
        target.style.position = usePreviewFit ? "absolute" : "";
        target.style.left = usePreviewFit ? `-${cropX}px` : "";
        target.style.top = usePreviewFit ? `-${cropY}px` : "";
        target.style.width = `calc(${100 / zoom}% + ${cropX / zoom}px)`;
        target.style.height = `calc(${100 / zoom}% + ${cropY / zoom}px)`;
        target.style.transform = `scale(${zoom})`;
      });
      const label = pane === "article" ? els["article-zoom-reset"] : els["right-zoom-reset"];
      label.textContent = `${Math.round(zoom * 100)}%`;
    }

    function sanitizeZoom(value, fallback) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      return Math.max(0.6, Math.min(1.8, Math.round(numeric * 10) / 10));
    }

    function restorePaneSplit() {
      const cached = Number(localStorage.getItem(splitCacheKey()));
      setPaneSplit(Number.isFinite(cached) ? cached : defaultPaneSplit(), false);
    }

    function setPaneSplit(percent, persist = true) {
      const bounds = paneSplitBounds();
      const bounded = Math.max(bounds.min, Math.min(bounds.max, Math.round(percent * 10) / 10));
      document.querySelector(".viewer-grid").style.setProperty("--left-pane", `${bounded}%`);
      if (persist) {
        localStorage.setItem(splitCacheKey(), String(bounded));
      }
    }

    function splitCacheKey() {
      return currentMode === "discussion" ? DISCUSSION_SPLIT_CACHE_KEY : `${SPLIT_CACHE_KEY_PREFIX}-${currentMode}`;
    }

    function defaultPaneSplit() {
      return currentMode === "annotation" ? 34 : 34;
    }

    function paneSplitBounds() {
      return currentMode === "discussion" ? { min: 25, max: 45 } : { min: 30, max: 70 };
    }

    function startPaneResize(event) {
      event.preventDefault();
      els["pane-divider"].classList.add("dragging");
      document.body.classList.add("resizing-panes");
      const grid = document.querySelector(".viewer-grid");
      const rect = grid.getBoundingClientRect();
      const update = (moveEvent) => {
        const dividerOffset = els["pane-divider"].offsetWidth / 2;
        const percent = ((moveEvent.clientX - rect.left - dividerOffset) / rect.width) * 100;
        setPaneSplit(percent);
      };
      const stop = () => {
        els["pane-divider"].classList.remove("dragging");
        document.body.classList.remove("resizing-panes");
        window.removeEventListener("pointermove", update);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", update);
      window.addEventListener("pointerup", stop);
      update(event);
    }

    function restoreReviewPaneWidth() {
      if (currentMode !== "annotation") {
        return;
      }
      const cached = Number(localStorage.getItem(CASE_REVIEW_PANE_CACHE_KEY));
      setReviewPaneWidth(Number.isFinite(cached) ? cached : defaultReviewPaneWidth(), false);
    }

    function defaultReviewPaneWidth() {
      return 280;
    }

    function reviewPaneWidthBounds() {
      const grid = document.querySelector(".viewer-grid");
      const rect = grid.getBoundingClientRect();
      const maxFromViewport = Math.round(rect.width * 0.42);
      return {
        min: 240,
        max: Math.max(280, Math.min(620, maxFromViewport))
      };
    }

    function setReviewPaneWidth(width, persist = true) {
      if (currentMode !== "annotation") {
        return;
      }
      const bounds = reviewPaneWidthBounds();
      const bounded = Math.max(bounds.min, Math.min(bounds.max, Math.round(Number(width) || defaultReviewPaneWidth())));
      document.querySelector(".viewer-grid").style.setProperty("--review-pane", `${bounded}px`);
      if (persist) {
        localStorage.setItem(CASE_REVIEW_PANE_CACHE_KEY, String(bounded));
      }
    }

    function startReviewPaneResize(event) {
      if (currentMode !== "annotation") {
        return;
      }
      event.preventDefault();
      els["review-pane-divider"].classList.add("dragging");
      document.body.classList.add("resizing-panes");
      const grid = document.querySelector(".viewer-grid");
      const rect = grid.getBoundingClientRect();
      const update = (moveEvent) => {
        const dividerOffset = els["review-pane-divider"].offsetWidth / 2;
        const width = rect.right - moveEvent.clientX - dividerOffset;
        setReviewPaneWidth(width);
      };
      const stop = () => {
        els["review-pane-divider"].classList.remove("dragging");
        document.body.classList.remove("resizing-panes");
        window.removeEventListener("pointermove", update);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", update);
      window.addEventListener("pointerup", stop);
      update(event);
    }

    function showArticlePlaceholder() {
      els["case-review-case-id"].value = "";
      els["article-frame-title"].textContent = "Select an article from the roster";
      els["article-frame-title"].title = "";
      els["article-frame-link"].textContent = "";
      els["article-frame-link"].title = "";
      els["article-copy-link"].disabled = true;
      els["article-open-link"].removeAttribute("href");
      els["article-open-link"].setAttribute("aria-disabled", "true");
      els["preview-frame"].src = "about:blank";
      els["article-frame"].src = "about:blank";
      els["article-frame"].srcdoc = `
        <!doctype html>
        <html>
          <body style="margin:0;font:14px system-ui,sans-serif;color:#66717d;background:#fff;">
            <div style="height:100vh;display:grid;place-items:center;text-align:center;padding:24px;">
              <div>
                <strong style="display:block;color:#202327;margin-bottom:8px;">No article selected</strong>
                Sign in to refresh the roster, then choose an article row.
              </div>
            </div>
          </body>
        </html>
      `;
    }

    function showDiscussionPlaceholder() {
      els["case-review-case-id"].value = "";
      els["article-frame-title"].textContent = "Discussion mode";
      els["article-frame-title"].title = "Discussion mode";
      els["article-frame-link"].textContent = "";
      els["article-frame-link"].title = "";
      els["article-copy-link"].disabled = true;
      els["article-open-link"].removeAttribute("href");
      els["article-open-link"].setAttribute("aria-disabled", "true");
      els["preview-frame"].src = "about:blank";
      els["article-frame"].src = "about:blank";
      els["article-frame"].srcdoc = `
        <!doctype html>
        <html>
          <body style="margin:0;font:14px system-ui,sans-serif;color:#66717d;background:#fff;">
            <div style="height:100vh;display:grid;place-items:center;text-align:center;padding:24px;">
              <div>
                <strong style="display:block;color:#202327;margin-bottom:8px;">Discussion mode</strong>
                Next step: load Cheng cases from Form Responses 1 and show clean article text here.
              </div>
            </div>
          </body>
        </html>
      `;
    }

    function showDiscussionCasePlaceholder(discussionCase) {
      const title = discussionCase.title || discussionCase.caseId || "Discussion case";
      els["article-frame-title"].textContent = title;
      els["article-frame-title"].title = title;
      els["article-frame-link"].textContent = discussionCase.caseId || "";
      els["article-frame-link"].title = discussionCase.caseId || "";
      els["article-copy-link"].disabled = !discussionCase.link;
      els["article-open-link"].href = discussionCase.link || "#";
      els["article-open-link"].setAttribute("aria-disabled", String(!discussionCase.link));
      els["article-frame"].src = "about:blank";
      els["article-frame"].srcdoc = `
        <!doctype html>
        <html>
          <body style="margin:0;font:14px system-ui,sans-serif;color:#66717d;background:#fff;">
            <div style="height:100vh;display:grid;place-items:center;text-align:center;padding:24px;">
              <div>
                <strong style="display:block;color:#202327;margin-bottom:8px;">${escapeHtml(discussionCase.caseId || "Discussion case")}</strong>
                Clean article text will render here in the next step.
              </div>
            </div>
          </body>
        </html>
      `;
    }

    function showDiscussionCaseContent(discussionCase) {
      const title = discussionCase.title || discussionCase.caseId || "Discussion case";
      const cleanText = discussionCase.cleanText || "No clean article text found for this case.";
      els["article-frame-title"].textContent = title;
      els["article-frame-title"].title = title;
      els["article-frame-link"].textContent = discussionCase.caseId || "";
      els["article-frame-link"].title = discussionCase.caseId || "";
      els["article-copy-link"].disabled = !discussionCase.link;
      els["article-open-link"].href = discussionCase.link || "#";
      els["article-open-link"].setAttribute("aria-disabled", String(!discussionCase.link));
      els["article-frame"].src = "about:blank";
      els["article-frame"].srcdoc = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                background: #fff;
                color: #202327;
                font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              main {
                max-width: 820px;
                margin: 0 auto;
                padding: 34px 38px 80px;
              }
              h1 {
                margin: 0 0 18px;
                font-size: 24px;
                line-height: 1.25;
              }
              pre {
                margin: 0;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
                font: inherit;
              }
            </style>
          </head>
          <body>
            <main>
              <h1>${escapeHtml(title)}</h1>
              <pre>${escapeHtml(cleanText)}</pre>
            </main>
          </body>
        </html>
      `;
    }

    function renderDiscussionEditResponse(discussionCase) {
      const editUrl = discussionCase && discussionCase.editUrl ? discussionCase.editUrl : "";
      const caseId = discussionCase && discussionCase.caseId ? discussionCase.caseId : "";
      els["discussion-edit-panel"].classList.remove("hidden");
      els["discussion-edit-title"].textContent = caseId ? `Edit Response: ${caseId}` : "Edit Response";
      els["discussion-edit-open"].href = editUrl || "#";
      els["discussion-edit-open"].setAttribute("aria-disabled", String(!editUrl));

      if (!editUrl) {
        els["discussion-edit-frame"].src = "about:blank";
        els["discussion-edit-frame"].classList.add("hidden");
        els["discussion-edit-empty"].textContent = caseId ? `No edit response URL for ${caseId}.` : "No edit response URL for this case.";
        els["discussion-edit-empty"].classList.remove("hidden");
        return;
      }

      els["discussion-edit-empty"].classList.add("hidden");
      els["discussion-edit-frame"].classList.remove("hidden");
      els["discussion-edit-frame"].src = normalizeFormUrl(editUrl);
    }

    function showDiscussionEditPlaceholder(message = "Select a discussion case.") {
      els["discussion-edit-panel"].classList.remove("hidden");
      els["discussion-edit-title"].textContent = "Edit Response";
      els["discussion-edit-open"].href = "#";
      els["discussion-edit-open"].setAttribute("aria-disabled", "true");
      els["discussion-edit-frame"].src = "about:blank";
      els["discussion-edit-frame"].classList.add("hidden");
      els["discussion-edit-empty"].textContent = message;
      els["discussion-edit-empty"].classList.remove("hidden");
    }

    async function renderDiscussionDiffs(discussionCase) {
      const brianaCase = discussionResponsesByCaseId.get(toBrianaCaseId(discussionCase.caseId));
      let flaggedAttributes = new Set();
      try {
        flaggedAttributes = await loadCaseReviewFlaggedAttributes(discussionCase.caseId);
      } catch (error) {
        showMessage(error.message, "error");
      }

      const stillCurrent = currentDiscussionCase()
        && normalizeCaseId(currentDiscussionCase().caseId) === normalizeCaseId(discussionCase.caseId);
      if (!stillCurrent) {
        return;
      }

      currentDiscussionItems = buildDiscussionReviewItems(discussionCase, brianaCase, flaggedAttributes);
      currentDiscussionDiffIndex = 0;
      if (!currentDiscussionItems.length) {
        showDiscussionEmpty(brianaCase ? "No differences or flagged attributes found." : "No Briana response or flagged attributes for this case.");
        return;
      }
      applyDiscussionFilter();
    }

    function buildDiscussionReviewItems(chengCase, brianaCase, flaggedAttributes) {
      const items = [];
      for (const { index, attribute } of reviewAttributeEntries()) {
        const chengAnswer = cellValue(chengCase.values, index);
        const brianaAnswer = brianaCase ? cellValue(brianaCase.values, index) : "";
        const hasDiff = Boolean(brianaCase && chengAnswer !== brianaAnswer);
        const isFlagged = flaggedAttributes.has(attribute);
        if (hasDiff || isFlagged) {
          items.push({
            index,
            attribute,
            chengAnswer,
            brianaAnswer,
            hasBriana: Boolean(brianaCase),
            hasDiff,
            isFlagged
          });
        }
      }
      return items;
    }

    function renderCurrentDiscussionDiff() {
      const diff = currentDiscussionDiffs[currentDiscussionDiffIndex];
      if (!diff) {
        showDiscussionEmpty("No differences found.");
        return;
      }
      els["discussion-empty"].classList.add("hidden");
      els["discussion-manual-card"].classList.add("hidden");
      els["discussion-diff-card"].classList.remove("hidden");
      els["diff-count"].textContent = `${currentDiscussionDiffIndex + 1} / ${currentDiscussionDiffs.length}`;
      els["diff-attribute"].textContent = diff.attribute;
      els["diff-source"].innerHTML = discussionItemBadges(diff)
        .map((label) => `<span class="review-badge">${escapeHtml(label)}</span>`)
        .join("");
      els["cheng-answer"].innerHTML = `<strong>Cheng</strong>${escapeHtml(diff.chengAnswer || "(blank)")}`;
      const brianaAnswer = diff.hasBriana ? diff.brianaAnswer || "(blank)" : "(no Briana response)";
      els["briana-answer"].innerHTML = `<strong>Briana</strong>${escapeHtml(brianaAnswer)}`;
      els["discussion-note"].value = "";
      els["discussion-note"].placeholder = "Loading saved note...";
      els["discussion-note"].disabled = true;
      els["discussion-save"].disabled = true;
      els["discussion-resolve-flag"].disabled = !diff.isFlagged;
      els["discussion-resolve-flag"].classList.toggle("hidden", !diff.isFlagged);
      els["diff-prev"].disabled = currentDiscussionDiffs.length <= 1;
      els["diff-next"].disabled = currentDiscussionDiffs.length <= 1;
      loadCurrentDiscussionNote();
    }

    function discussionItemBadges(item) {
      const badges = [];
      if (item.hasDiff) {
        badges.push("Diff");
      }
      if (item.isFlagged) {
        badges.push("Flag");
      }
      return badges.length ? badges : ["Review"];
    }

    function handleDiscussionFilterClick(event) {
      const button = event.target.closest("button[data-filter]");
      if (!button) {
        return;
      }
      setDiscussionFilter(button.dataset.filter);
    }

    function setDiscussionFilter(filter) {
      currentDiscussionFilter = normalizeDiscussionFilter(filter);
      localStorage.setItem(DISCUSSION_FILTER_KEY, currentDiscussionFilter);
      currentDiscussionDiffIndex = 0;
      applyDiscussionFilter();
    }

    function normalizeDiscussionFilter(filter) {
      return DISCUSSION_FILTERS.includes(filter) ? filter : "all";
    }

    function applyDiscussionFilter() {
      renderDiscussionFilterButtons();
      currentDiscussionDiffs = currentDiscussionItems.filter(matchesDiscussionFilter);
      if (!currentDiscussionItems.length) {
        showDiscussionEmpty("No review items found.");
        return;
      }
      if (!currentDiscussionDiffs.length) {
        showDiscussionFilteredEmpty(`No ${currentDiscussionFilterLabel()} items for this case.`);
        return;
      }
      renderCurrentDiscussionDiff();
    }

    function matchesDiscussionFilter(item) {
      if (currentDiscussionFilter === "diff") {
        return item.hasDiff;
      }
      if (currentDiscussionFilter === "flag") {
        return item.isFlagged;
      }
      return true;
    }

    function currentDiscussionFilterLabel() {
      if (currentDiscussionFilter === "diff") {
        return "Diff";
      }
      if (currentDiscussionFilter === "flag") {
        return "Flag";
      }
      return "review";
    }

    function renderDiscussionFilterButtons() {
      const counts = {
        all: currentDiscussionItems.length,
        diff: currentDiscussionItems.filter((item) => item.hasDiff).length,
        flag: currentDiscussionItems.filter((item) => item.isFlagged).length
      };
      els["discussion-filter-bar"].classList.toggle("hidden", !currentDiscussionItems.length);
      [
        ["discussion-filter-all", "All", counts.all],
        ["discussion-filter-diff", "Diff", counts.diff],
        ["discussion-filter-flag", "Flag", counts.flag]
      ].forEach(([id, label, count]) => {
        const button = els[id];
        const isActive = button.dataset.filter === currentDiscussionFilter;
        button.textContent = `${label} ${count}`;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function showDiscussionFilteredEmpty(message) {
      els["discussion-empty"].textContent = message;
      els["discussion-empty"].classList.remove("hidden");
      els["discussion-diff-card"].classList.add("hidden");
      els["discussion-manual-card"].classList.add("hidden");
      els["discussion-note"].disabled = true;
      els["discussion-save"].disabled = true;
      els["discussion-resolve-flag"].disabled = true;
      els["discussion-resolve-flag"].classList.add("hidden");
    }

    function moveDiscussionDiff(delta) {
      if (!currentDiscussionDiffs.length) {
        return;
      }
      currentDiscussionDiffIndex = (currentDiscussionDiffIndex + delta + currentDiscussionDiffs.length) % currentDiscussionDiffs.length;
      renderCurrentDiscussionDiff();
    }

    async function saveDiscussionNote() {
      const discussionCase = currentDiscussionCase();
      const diff = currentDiscussionDiffs[currentDiscussionDiffIndex];
      const note = els["discussion-note"].value.trim();
      if (!discussionCase || !diff) {
        showMessage("Select a discussion diff before saving.", "warn");
        return;
      }

      els["discussion-save"].disabled = true;
      try {
        await saveDiscussionAttributeNote(discussionCase.caseId, diff.attribute, note);
        showMessage(`Saved ${discussionCase.caseId} ${discussionNoteHeader(diff.attribute)} in case_review.`, "ok");
      } catch (error) {
        showMessage(error.message, "error");
      } finally {
        els["discussion-save"].disabled = false;
      }
    }

    async function resolveCurrentDiscussionFlag() {
      const discussionCase = currentDiscussionCase();
      const diff = currentDiscussionDiffs[currentDiscussionDiffIndex];
      if (!discussionCase || !diff) {
        showMessage("Select a discussion item before resolving.", "warn");
        return;
      }
      if (!diff.isFlagged) {
        showMessage("This item is not flagged.", "warn");
        return;
      }

      els["discussion-resolve-flag"].disabled = true;
      try {
        await saveCaseReviewFlag(discussionCase.caseId, diff.attribute, false);
        showMessage(`Resolved flag for ${discussionCase.caseId}: ${diff.attribute}.`, "ok");
        await renderDiscussionDiffs(discussionCase);
      } catch (error) {
        showMessage(error.message, "error");
        els["discussion-resolve-flag"].disabled = false;
      }
    }

    async function saveManualDiscussionNote() {
      const discussionCase = currentDiscussionCase();
      const attribute = els["manual-attribute-select"].value;
      const note = els["manual-discussion-note"].value.trim();
      if (!discussionCase) {
        showMessage("Select a discussion case before saving.", "warn");
        return;
      }
      if (!attribute) {
        showMessage("Select an attribute before saving.", "warn");
        return;
      }

      els["manual-discussion-save"].disabled = true;
      try {
        await saveDiscussionAttributeNote(discussionCase.caseId, attribute, note);
        showMessage(`Saved ${discussionCase.caseId} ${discussionNoteHeader(attribute)} in case_review.`, "ok");
      } catch (error) {
        showMessage(error.message, "error");
      } finally {
        els["manual-discussion-save"].disabled = false;
      }
    }

    async function loadCurrentDiscussionNote() {
      const requestId = ++discussionNoteRequestId;
      const discussionCase = currentDiscussionCase();
      const diff = currentDiscussionDiffs[currentDiscussionDiffIndex];
      if (!discussionCase || !diff) {
        return;
      }

      try {
        const note = await loadDiscussionAttributeNote(discussionCase.caseId, diff.attribute);
        const stillCurrent = requestId === discussionNoteRequestId
          && currentDiscussionCase()
          && normalizeCaseId(currentDiscussionCase().caseId) === normalizeCaseId(discussionCase.caseId)
          && currentDiscussionDiffs[currentDiscussionDiffIndex]
          && currentDiscussionDiffs[currentDiscussionDiffIndex].attribute === diff.attribute;
        if (stillCurrent) {
          els["discussion-note"].value = note;
          els["discussion-note"].placeholder = "Enter discussion note or final decision.";
          els["discussion-note"].disabled = false;
          els["discussion-save"].disabled = false;
        }
      } catch (error) {
        els["discussion-note"].placeholder = "Enter discussion note or final decision.";
        els["discussion-note"].disabled = false;
        els["discussion-save"].disabled = false;
        showMessage(error.message, "error");
      }
    }

    async function loadDiscussionAttributeNote(caseId, attribute) {
      requireToken();
      const headers = await ensureCaseReviewHeaders();
      const targetHeader = discussionNoteHeader(attribute);
      const targetColumnIndex = headers.indexOf(targetHeader);
      if (targetColumnIndex === -1) {
        return "";
      }

      const rows = await readSheetRows(CASE_REVIEW_TAB_NAME);
      const existingRow = rows.slice(1).find((row) => normalizeCaseId(row[0]) === normalizeCaseId(caseId));
      return existingRow ? String(existingRow[targetColumnIndex] || "") : "";
    }

    async function loadCaseReviewFlaggedAttributes(caseId) {
      requireToken();
      const headers = await ensureCaseReviewHeaders();
      const rows = await readSheetRows(CASE_REVIEW_TAB_NAME);
      const existingRow = rows.slice(1).find((row) => normalizeCaseId(row[0]) === normalizeCaseId(caseId));
      if (!existingRow) {
        return new Set();
      }

      const checkedAttributes = new Set();
      reviewAttributes().forEach((attribute) => {
        const index = headers.indexOf(caseReviewFlagHeader(attribute));
        const value = index >= 0 ? String(existingRow[index] || "").trim().toLowerCase() : "";
        if (value === "yes" || value === "true" || value === "1") {
          checkedAttributes.add(attribute);
        }
      });
      return checkedAttributes;
    }

    async function saveDiscussionAttributeNote(caseId, attribute, note) {
      requireToken();
      const headers = await ensureCaseReviewHeaders();
      const targetHeader = discussionNoteHeader(attribute);
      const targetColumnIndex = headers.indexOf(targetHeader);
      if (targetColumnIndex === -1) {
        throw new Error(`Case review header not found: ${targetHeader}`);
      }

      const rows = await readSheetRows(CASE_REVIEW_TAB_NAME);
      const existingOffset = rows.slice(1).findIndex((row) => normalizeCaseId(row[0]) === normalizeCaseId(caseId));
      const targetRowNumber = existingOffset >= 0 ? existingOffset + 2 : Math.max(rows.length + 1, 2);
      if (existingOffset >= 0) {
        const cell = `${columnName(targetColumnIndex + 1)}${targetRowNumber}`;
        await updateSheetValues(`${quoteSheet(CASE_REVIEW_TAB_NAME)}!${cell}`, [[note]]);
      } else if (!note) {
        return;
      } else {
        const rowValues = Array(targetColumnIndex + 1).fill("");
        rowValues[0] = caseId;
        rowValues[targetColumnIndex] = note;
        await updateSheetValues(`${quoteSheet(CASE_REVIEW_TAB_NAME)}!A${targetRowNumber}:${columnName(targetColumnIndex + 1)}${targetRowNumber}`, [rowValues]);
      }
    }

    async function ensureDiscussionHeaders() {
      await ensureSheetExists(DISCUSSION_TAB_NAME);
      const desiredHeaders = desiredDiscussionHeaders();
      const rows = await readDiscussionRows("A1:ZZ1");
      const existingHeaders = (rows[0] || []).map((header) => String(header || "").trim());
      const hasExistingHeaders = existingHeaders.some(Boolean);
      const headers = hasExistingHeaders ? existingHeaders.slice() : desiredHeaders.slice();
      headers[0] = "caseID";
      desiredHeaders.slice(1).forEach((header) => {
        if (!headers.includes(header)) {
          headers.push(header);
        }
      });
      await updateSheetValues(`${quoteSheet(DISCUSSION_TAB_NAME)}!A1:${columnName(headers.length)}1`, [headers]);
      return headers;
    }

    async function ensureCaseReviewHeaders() {
      await ensureSheetExists(CASE_REVIEW_TAB_NAME);
      const desiredHeaders = desiredCaseReviewHeaders();
      const rows = await readSheetRows(CASE_REVIEW_TAB_NAME, "A1:ZZ1");
      const existingHeaders = (rows[0] || []).map((header) => String(header || "").trim());
      const hasExistingHeaders = existingHeaders.some(Boolean);
      const headers = hasExistingHeaders ? existingHeaders.slice() : desiredHeaders.slice();
      headers[0] = "caseID";
      desiredHeaders.slice(1).forEach((header) => {
        if (!headers.includes(header)) {
          headers.push(header);
        }
      });
      await updateSheetValues(`${quoteSheet(CASE_REVIEW_TAB_NAME)}!A1:${columnName(headers.length)}1`, [headers]);
      return headers;
    }

    async function ensureSheetExists(tabName) {
      const metadata = await sheetsFetch("?fields=sheets.properties.title");
      const sheets = metadata.sheets || [];
      const exists = sheets.some((sheet) => sheet.properties && sheet.properties.title === tabName);
      if (exists) {
        return;
      }
      await sheetsFetch(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName
                }
              }
            }
          ]
        })
      });
    }

    async function readDiscussionRows(range = "A1:ZZ1000") {
      return readSheetRows(DISCUSSION_TAB_NAME, range);
    }

    async function readSheetRows(tabName, range = "A1:ZZ1000") {
      const data = await sheetsFetch(`/values/${encodeURIComponent(`${quoteSheet(tabName)}!${range}`)}`);
      return data.values || [];
    }

    async function updateSheetValues(range, values) {
      return sheetsFetch(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values })
      });
    }

    function reviewAttributeEntries() {
      if (discussionAttributeStartIndex < 0) {
        return [];
      }
      return discussionHeaders
        .map((attribute, index) => ({ index, attribute: attribute || `Column ${index + 1}` }))
        .slice(discussionAttributeStartIndex)
        .filter(({ attribute }) => isReviewAttribute(attribute));
    }

    function reviewAttributes() {
      return reviewAttributeEntries().map(({ attribute }) => attribute);
    }

    function isReviewAttribute(attribute) {
      const normalized = normalizeHeader(attribute);
      return Boolean(normalized && !NON_REVIEW_HEADERS.has(normalized));
    }

    function desiredDiscussionHeaders() {
      return [
        "caseID",
        ...reviewAttributes().map(discussionNoteHeader)
      ];
    }

    function desiredCaseReviewHeaders() {
      const attributes = reviewAttributes();
      return [
        "caseID",
        ...attributes.map(discussionNoteHeader),
        ...attributes.map(caseReviewFlagHeader)
      ];
    }

    async function refreshCaseReviewForArticle(preferredCaseId = currentCaseReviewCaseId()) {
      if (currentMode !== "annotation") {
        return;
      }
      await loadCaseReviewCaseOptions(preferredCaseId);
      await loadCaseReviewFlags();
      loadCaseReviewSelectedNote();
    }

    async function loadCaseReviewCaseOptions(preferredCaseId = currentCaseReviewCaseId()) {
      const article = currentArticle();
      const articleId = normalizeArticleId(article && article.id);
      const defaultCaseId = defaultCaseIdForArticle(article);
      if (!articleId || !defaultCaseId) {
        renderCaseReviewCaseOptions([], "");
        return;
      }

      if (!accessToken || discussionAttributeStartIndex === -1) {
        renderCaseReviewCaseOptions([defaultCaseId], preferredCaseId || defaultCaseId);
        return;
      }

      try {
        await ensureCaseReviewHeaders();
        const rows = await readSheetRows(CASE_REVIEW_TAB_NAME, "A1:A1000");
        const caseIds = rows.slice(1)
          .map((row) => normalizeCaseId(row[0]))
          .filter((caseId) => caseIdBelongsToArticle(caseId, articleId));
        renderCaseReviewCaseOptions([defaultCaseId, ...caseIds], preferredCaseId || defaultCaseId);
      } catch (error) {
        renderCaseReviewCaseOptions([defaultCaseId], preferredCaseId || defaultCaseId);
        showMessage(error.message, "error");
      }
    }

    function renderCaseReviewCaseOptions(caseIds, selectedCaseId) {
      const uniqueCaseIds = uniqueSortedCaseIds(caseIds);
      const selected = normalizeCaseId(selectedCaseId) || uniqueCaseIds[0] || "";
      const options = uniqueSortedCaseIds([...uniqueCaseIds, selected].filter(Boolean));
      els["case-review-case-select"].innerHTML = options.map((caseId) => (
        `<option value="${escapeHtml(caseId)}">${escapeHtml(caseId)}</option>`
      )).join("");
      els["case-review-case-select"].disabled = !options.length;
      els["case-review-case-select"].value = selected;
    }

    function handleCaseReviewCaseInput() {
      const caseId = currentCaseReviewCaseId();
      els["case-review-case-id"].value = caseId;
      renderCaseReviewCaseOptions(existingCaseReviewSelectIds(), caseId);
      loadCaseReviewFlags();
      loadCaseReviewSelectedNote();
    }

    function handleCaseReviewCaseSelect() {
      els["case-review-case-id"].value = normalizeCaseId(els["case-review-case-select"].value);
      loadCaseReviewFlags();
      loadCaseReviewSelectedNote();
    }

    function addCaseReviewCase() {
      const article = currentArticle();
      const articleId = normalizeArticleId(article && article.id);
      if (!articleId) {
        showMessage("Select an article before adding a case.", "warn");
        return;
      }
      const nextCaseId = nextCaseIdForArticle(articleId, existingCaseReviewSelectIds());
      els["case-review-case-id"].value = nextCaseId;
      renderCaseReviewCaseOptions([...existingCaseReviewSelectIds(), nextCaseId], nextCaseId);
      setCaseReviewCheckboxes(new Set());
      loadCaseReviewSelectedNote();
      showMessage(`${nextCaseId} ready. First checked flag will create the row.`, "ok");
    }

    function existingCaseReviewSelectIds() {
      return Array.from(els["case-review-case-select"].options)
        .map((option) => normalizeCaseId(option.value))
        .filter(Boolean);
    }

    async function loadCaseReviewFlags() {
      if (!accessToken || currentMode !== "annotation" || discussionAttributeStartIndex === -1) {
        return;
      }
      const caseId = currentCaseReviewCaseId();
      if (!caseId) {
        setCaseReviewCheckboxes(new Set());
        return;
      }
      try {
        const headers = await ensureCaseReviewHeaders();
        const rows = await readSheetRows(CASE_REVIEW_TAB_NAME);
        const existingRow = rows.slice(1).find((row) => normalizeCaseId(row[0]) === normalizeCaseId(caseId));
        if (!existingRow) {
          setCaseReviewCheckboxes(new Set());
          return;
        }
        const checkedAttributes = new Set();
        reviewAttributes().forEach((attribute) => {
          const index = headers.indexOf(caseReviewFlagHeader(attribute));
          const value = index >= 0 ? String(existingRow[index] || "").trim().toLowerCase() : "";
          if (value === "yes" || value === "true" || value === "1") {
            checkedAttributes.add(attribute);
          }
        });
        setCaseReviewCheckboxes(checkedAttributes);
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    function setCaseReviewCheckboxes(checkedAttributes) {
      els["case-review-flags"].querySelectorAll('input[type="checkbox"][data-attribute]').forEach((checkbox) => {
        checkbox.checked = checkedAttributes.has(checkbox.dataset.attribute);
      });
      updateCaseReviewSelectedAttribute();
    }

    function handleCaseReviewAttributeClick(event) {
      const target = event.target instanceof Element
        ? event.target.closest("[data-attribute]")
        : null;
      if (!target || !els["case-review-flags"].contains(target)) {
        return;
      }
      selectCaseReviewAttribute(target.dataset.attribute);
    }

    async function handleCaseReviewFlagChange(event) {
      const checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== "checkbox" || !checkbox.dataset.attribute) {
        return;
      }
      selectCaseReviewAttribute(checkbox.dataset.attribute, false);
      const caseId = currentCaseReviewCaseId();
      if (!caseId) {
        checkbox.checked = !checkbox.checked;
        showMessage("Enter a Case ID before flagging attributes.", "warn");
        return;
      }
      try {
        const result = await saveCaseReviewFlag(caseId, checkbox.dataset.attribute, checkbox.checked);
        renderCaseReviewCaseOptions([...existingCaseReviewSelectIds(), caseId], caseId);
        const action = checkbox.checked ? "flagged" : "unflagged";
        const prefix = result.created ? `Created ${caseId} and saved` : `Saved ${caseId}`;
        showMessage(`${prefix}: ${checkbox.dataset.attribute} ${action}.`, "ok");
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        showMessage(error.message, "error");
      }
    }

    function selectCaseReviewAttribute(attribute, shouldLoadNote = true) {
      if (!reviewAttributes().includes(attribute)) {
        return;
      }
      selectedCaseReviewAttribute = attribute;
      updateCaseReviewSelectedAttribute();
      if (shouldLoadNote) {
        loadCaseReviewSelectedNote();
      }
    }

    function updateCaseReviewSelectedAttribute() {
      const attributes = reviewAttributes();
      if (!attributes.includes(selectedCaseReviewAttribute)) {
        selectedCaseReviewAttribute = "";
      }
      els["case-review-flags"].querySelectorAll("[data-attribute]").forEach((row) => {
        row.classList.toggle("active", row.dataset.attribute === selectedCaseReviewAttribute);
      });

      const caseId = currentCaseReviewCaseId();
      const hasSelection = Boolean(selectedCaseReviewAttribute);
      els["case-review-note-attribute"].textContent = hasSelection
        ? selectedCaseReviewAttribute
        : "Select an attribute";
      els["case-review-note"].disabled = !hasSelection || !caseId || !accessToken;
      els["case-review-note-save"].disabled = !hasSelection || !caseId || !accessToken;
      if (!hasSelection) {
        els["case-review-note"].value = "";
        els["case-review-note"].placeholder = "Click an attribute above to write a note.";
      } else if (!caseId) {
        els["case-review-note"].placeholder = "Select or enter a case ID first.";
      } else if (!accessToken) {
        els["case-review-note"].placeholder = "Sign in to load and save notes.";
      } else {
        els["case-review-note"].placeholder = "Write why this attribute needs review.";
      }
    }

    async function loadCaseReviewSelectedNote() {
      const requestId = ++caseReviewNoteRequestId;
      const caseId = currentCaseReviewCaseId();
      const attribute = selectedCaseReviewAttribute;
      updateCaseReviewSelectedAttribute();
      if (!attribute || !caseId || !accessToken || currentMode !== "annotation") {
        return;
      }
      els["case-review-note"].value = "";
      els["case-review-note"].placeholder = "Loading saved note...";
      try {
        const note = await loadDiscussionAttributeNote(caseId, attribute);
        if (requestId !== caseReviewNoteRequestId || attribute !== selectedCaseReviewAttribute || caseId !== currentCaseReviewCaseId()) {
          return;
        }
        els["case-review-note"].value = note;
        els["case-review-note"].placeholder = "Write why this attribute needs review.";
      } catch (error) {
        if (requestId === caseReviewNoteRequestId) {
          els["case-review-note"].placeholder = "Could not load saved note.";
          showMessage(error.message, "error");
        }
      }
    }

    async function saveCaseReviewNote() {
      const caseId = currentCaseReviewCaseId();
      const attribute = selectedCaseReviewAttribute;
      if (!caseId || !attribute) {
        showMessage("Select a case and attribute before saving a note.", "warn");
        return;
      }
      const note = els["case-review-note"].value;
      try {
        await saveDiscussionAttributeNote(caseId, attribute, note);
        if (note.trim()) {
          await saveCaseReviewFlag(caseId, attribute, true);
          setCaseReviewCheckbox(attribute, true);
        }
        renderCaseReviewCaseOptions([...existingCaseReviewSelectIds(), caseId], caseId);
        showMessage(`Saved ${caseId}: ${attribute} note.`, "ok");
      } catch (error) {
        showMessage(error.message, "error");
      }
    }

    function setCaseReviewCheckbox(attribute, checked) {
      const checkbox = Array.from(els["case-review-flags"].querySelectorAll('input[type="checkbox"][data-attribute]'))
        .find((input) => input.dataset.attribute === attribute);
      if (checkbox) {
        checkbox.checked = checked;
      }
    }

    async function saveCaseReviewFlag(caseId, attribute, checked) {
      requireToken();
      const headers = await ensureCaseReviewHeaders();
      const targetHeader = caseReviewFlagHeader(attribute);
      const targetColumnIndex = headers.indexOf(targetHeader);
      if (targetColumnIndex === -1) {
        throw new Error(`Case review header not found: ${targetHeader}`);
      }

      const rows = await readSheetRows(CASE_REVIEW_TAB_NAME);
      const existingOffset = rows.slice(1).findIndex((row) => normalizeCaseId(row[0]) === normalizeCaseId(caseId));
      const targetRowNumber = existingOffset >= 0 ? existingOffset + 2 : Math.max(rows.length + 1, 2);
      const value = checked ? "yes" : "no";
      if (existingOffset >= 0) {
        const cell = `${columnName(targetColumnIndex + 1)}${targetRowNumber}`;
        await updateSheetValues(`${quoteSheet(CASE_REVIEW_TAB_NAME)}!${cell}`, [[value]]);
      } else {
        const rowValues = Array(targetColumnIndex + 1).fill("");
        rowValues[0] = caseId;
        rowValues[targetColumnIndex] = value;
        await updateSheetValues(`${quoteSheet(CASE_REVIEW_TAB_NAME)}!A${targetRowNumber}:${columnName(targetColumnIndex + 1)}${targetRowNumber}`, [rowValues]);
      }
      return { created: existingOffset === -1 };
    }

    function currentCaseReviewCaseId() {
      return normalizeCaseId(els["case-review-case-id"].value);
    }

    function showDiscussionEmpty(message) {
      currentDiscussionDiffs = [];
      currentDiscussionDiffIndex = 0;
      if (!currentDiscussionCase() || !currentDiscussionItems.length) {
        els["discussion-filter-bar"].classList.add("hidden");
      }
      els["discussion-empty"].textContent = message;
      els["discussion-empty"].classList.remove("hidden");
      els["discussion-diff-card"].classList.add("hidden");
      const hasManualAttributes = renderManualDiscussionAttributes();
      els["discussion-manual-card"].classList.toggle("hidden", !currentDiscussionCase() || !hasManualAttributes);
      els["manual-discussion-note"].value = "";
      els["discussion-note"].disabled = true;
      els["discussion-save"].disabled = true;
      els["discussion-resolve-flag"].disabled = true;
      els["discussion-resolve-flag"].classList.add("hidden");
    }

    function renderManualDiscussionAttributes() {
      const attributes = reviewAttributes();
      els["manual-attribute-select"].innerHTML = attributes.map((attribute) => (
        `<option value="${escapeHtml(attribute)}">${escapeHtml(attribute)}</option>`
      )).join("");
      return attributes.length > 0;
    }

    function renderCaseReviewFlags() {
      const attributes = reviewAttributes();
      if (!attributes.length) {
        renderCaseReviewEmpty("Sign in to load flag attributes.");
        return;
      }
      els["case-review-flags"].innerHTML = attributes.map((attribute) => (
        `<div class="case-flag" data-attribute="${escapeHtml(attribute)}">
          <input type="checkbox" data-attribute="${escapeHtml(attribute)}" aria-label="Flag ${escapeHtml(attribute)}">
          <span>${escapeHtml(attribute)}</span>
        </div>`
      )).join("");
      updateCaseReviewSelectedAttribute();
    }

    function renderCaseReviewEmpty(message) {
      els["case-review-flags"].innerHTML = `<div class="case-review-empty">${escapeHtml(message)}</div>`;
      selectedCaseReviewAttribute = "";
      updateCaseReviewSelectedAttribute();
    }

    function showDiscussionRightPlaceholder() {
      els["tab-preview"].classList.remove("active");
      els["tab-form"].classList.remove("active");
      els["tab-preview"].setAttribute("aria-selected", "false");
      els["tab-form"].setAttribute("aria-selected", "false");
      els["preview-frame-wrap"].classList.add("hidden");
      els["form-frame"].classList.add("hidden");
      els["editor-panel"].classList.add("hidden");
      els["discussion-panel"].classList.remove("hidden");
      if (!currentDiscussionCase()) {
        showDiscussionEditPlaceholder();
        showDiscussionEmpty(accessToken ? "Select a discussion case." : "Sign in to load discussion cases.");
      }
    }

    function loadFormFrame() {
      const config = currentConfig();
      const formUrl = normalizeFormUrl(config.formUrl);
      els["form-open-link"].href = config.formUrl;
      els["form-frame"].src = formUrl;
    }

    function requireToken() {
      if (!accessToken) {
        throw new Error("Sign in with Google first.");
      }
    }

    function showMessage(message, level) {
      els.message.textContent = message;
      els.message.className = `toast ${level === "ok" ? "ok" : level === "error" ? "error" : ""}`;
      window.clearTimeout(messageTimer);
      messageTimer = window.setTimeout(() => {
        els.message.classList.add("hidden");
      }, level === "error" ? 12000 : 10000);
      if (level === "error") {
        els.status.textContent = "Setup needed";
        els.status.className = "status error";
      }
    }

    function quoteSheet(name) {
      return `'${String(name).replace(/'/g, "''")}'`;
    }

    function normalizeHeader(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    function normalizeArticleId(value) {
      const raw = String(value || "").trim().toUpperCase();
      const match = raw.match(/^A?0*(\d+)$/);
      if (match) {
        return `A${match[1].padStart(3, "0")}`;
      }
      return raw;
    }

    function normalizeCaseId(value) {
      return String(value || "").trim().toUpperCase();
    }

    function parseCaseId(value) {
      const caseId = normalizeCaseId(value);
      const match = caseId.match(/^(A\d+)-C(\d+)$/);
      if (!match) {
        return null;
      }
      return {
        articleId: normalizeArticleId(match[1]),
        caseNumber: Number(match[2])
      };
    }

    function caseIdBelongsToArticle(caseId, articleId) {
      const parts = parseCaseId(caseId);
      return Boolean(parts && parts.articleId === normalizeArticleId(articleId));
    }

    function uniqueSortedCaseIds(caseIds) {
      return Array.from(new Set(caseIds.map(normalizeCaseId).filter(Boolean)))
        .sort((left, right) => {
          const leftParts = parseCaseId(left);
          const rightParts = parseCaseId(right);
          if (leftParts && rightParts && leftParts.articleId === rightParts.articleId) {
            return leftParts.caseNumber - rightParts.caseNumber;
          }
          return left.localeCompare(right);
        });
    }

    function nextCaseIdForArticle(articleId, caseIds) {
      const normalizedArticleId = normalizeArticleId(articleId);
      const maxCaseNumber = caseIds
        .map(parseCaseId)
        .filter((parts) => parts && parts.articleId === normalizedArticleId)
        .reduce((max, parts) => Math.max(max, parts.caseNumber), 0);
      return `${normalizedArticleId}-C${String(maxCaseNumber + 1).padStart(2, "0")}`;
    }

    function isBrianaCaseId(value) {
      return normalizeCaseId(value).startsWith("B-");
    }

    function toBrianaCaseId(value) {
      const caseId = normalizeCaseId(value);
      return caseId.startsWith("B-") ? caseId : `B-${caseId}`;
    }

    function cellValue(row, index) {
      if (index < 0) {
        return "";
      }
      return String(row[index] || "").trim();
    }

    function discussionNoteHeader(attribute) {
      const clean = String(attribute || "attribute")
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      return `notes_${clean || "attribute"}`;
    }

    function caseReviewFlagHeader(attribute) {
      const clean = String(attribute || "attribute")
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      return `flag_${clean || "attribute"}`;
    }

    function columnName(index) {
      let column = "";
      let number = index;
      while (number > 0) {
        const remainder = (number - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        number = Math.floor((number - 1) / 26);
      }
      return column;
    }

    function findHeaderIndex(headers, candidates) {
      for (const candidate of candidates) {
        const index = headers.indexOf(candidate);
        if (index !== -1) {
          return index;
        }
      }
      return -1;
    }

    function normalizeFormUrl(url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "docs.google.com" && parsed.pathname.includes("/forms/")) {
          parsed.searchParams.set("embedded", "true");
        }
        return parsed.toString();
      } catch {
        return url;
      }
    }

    function withCacheBust(url) {
      try {
        const parsed = new URL(url);
        parsed.searchParams.set("_cdcf_reload", String(Date.now()));
        return parsed.toString();
      } catch {
        return url;
      }
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
