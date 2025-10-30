  // --- GLOBAL STATE ---
  console.log("🚀 JavaScript file loaded successfully!");
  
  // Global test function
  window.testApp = function() {
    console.log("🧪 Testing app initialization...");
    console.log("🧪 DOM ready state:", document.readyState);
    console.log("🧪 Required elements:", {
      loader: !!document.getElementById("loader"),
      tableWrapper: !!document.querySelector(".table-wrapper"),
      errorMessage: !!document.getElementById("error-message"),
      supabaseClient: !!window.supabaseClient
    });
    initializeApp();
  };
  
  let appData = {
    allTickets: [],
    tickets: [],
    allProjects: [],
    displayProjects: [],
    projects: [],
    users: [],
    teamMembers: [],
    epics: [],
    allReconcileHrs: [],
    reconcileHrs: [],
    currentUserName: "",
    currentUserEmail: "",
  };
  let currentPage = 1;
  let reconcileWrapper = null; // <--- ADD THIS LINE
  let tableWrapper = null; // <--- ADD THIS LINE
  let currentView = "projects";
  let currentProjectId = null;
  let projectStatsCache = [];
  const normalizePath = (path) => {
    if (!path) return "/";
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  };

  const VIEW_ROUTE_MAP = {
    home: "/dashboard",
    all: "/all-tickets",
    "my-ticket": "/my-tickets",
    critical: "/critical",
    stalled: "/stalled",
    unassigned: "/unassigned",
    incomplete: "/incomplete",
    projects: "/projects",
    reconcile: "/reconcile",
  };
  const ROUTE_VIEW_MAP = Object.entries(VIEW_ROUTE_MAP).reduce(
    (acc, [view, route]) => {
      acc[normalizePath(route)] = view;
      return acc;
    },
    {}
  );
  let suppressHistoryUpdate = false;
  const ticketsPerPage = 20;
  let isBulkEditMode = false;
  let selectedTickets = new Set();
  let initialProjectData = null;
  let selectedStatus = "all",
    textSearchTerm = "",
    ticketNumberFilter = "",
    selectedProjectFilter = "all",
    selectedEpicFilter = "all",
    selectedAssigneeFilter = "all",
    reconcileExcludeDone = true,
    reconcileCurrentPage = 1,
    selectedIncompleteMemberFilter = "all";
  
  // Sorting state
  let currentSort = {
    field: null,
    direction: null // 'asc', 'desc', or null for reset
  };
  
  // Per-tab exclude done settings
  let excludeDoneSettings = {
    'all': true,
    'my-ticket': true,
    'critical': true,
    'stalled': true,
    'unassigned': true
  };
  // --- ADD THESE NEW VARIABLES AT THE TOP ---
  let trendsChart = null;
  let dashboardAssigneeId = null;
  let dashboardStartDate = null;
  let dashboardEndDate = null;
  let reconcileSelectedUserName = null;

  const QUICK_ADD_COMMANDS = [
    { key: "assignee", label: "Assignee", description: "Assign to a teammate" },
    { key: "requester", label: "Requester", description: "Set who requested the work" },
    { key: "created", label: "Created Date", description: "Override created date (YYYY-MM-DD or 'today')" },
    { key: "assigned", label: "Assigned Date", description: "Override assigned date" },
    { key: "priority", label: "Priority", description: "Low, Medium, High, Urgent, Critical" },
    { key: "type", label: "Type", description: "Task, Bug, Request" },
    { key: "description", label: "Description", description: "Add a short note" },
  ];

  const QUICK_ADD_COMMAND_ALIASES = {
    assignee: ["assignee", "assign", "owner"],
    requester: ["requester", "request", "by"],
    created: ["created", "createddate", "created_at", "createdat", "date"],
    assigned: ["assigned", "assigneddate", "assigned_at", "assignedat"],
    priority: ["priority", "prio"],
    type: ["type", "category"],
    description: ["description", "desc", "note", "notes"],
  };

  const QUICK_ADD_PRIORITIES = ["Low", "Medium", "High", "Urgent", "Critical"];
  const QUICK_ADD_TYPES = ["Task", "Bug", "Request"];

  let quickAddOverlay = null;
  let quickAddInput = null;
  let quickAddSummary = null;
  let quickAddCommandList = null;
  let quickAddError = null;
  let quickAddInitialized = false;
  let quickAddOpen = false;
  let quickAddSubmitting = false;
  let quickAddLastParse = null;

  function initializeQuickAddSpotlight() {
    if (quickAddInitialized) {
      return;
    }

    quickAddOverlay = document.getElementById("quick-add-overlay");
    quickAddInput = document.getElementById("quick-add-input");
    quickAddSummary = document.getElementById("quick-add-summary");
    quickAddCommandList = document.getElementById("quick-add-command-list");
    quickAddError = document.getElementById("quick-add-error");
    const quickAddClose = document.getElementById("quick-add-close");

    if (!quickAddOverlay || !quickAddInput || !quickAddSummary) {
      return;
    }

    quickAddInitialized = true;

    if (quickAddClose) {
      quickAddClose.addEventListener("click", closeQuickAddOverlay);
    }

    quickAddOverlay.addEventListener("click", (event) => {
      if (event.target === quickAddOverlay) {
        closeQuickAddOverlay();
      }
    });

    quickAddInput.addEventListener("input", refreshQuickAddUI);
    quickAddInput.addEventListener("keyup", refreshQuickAddUI);
    quickAddInput.addEventListener("click", refreshQuickAddUI);
    quickAddInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitQuickAddTicket();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeQuickAddOverlay();
      }
    });

    if (quickAddCommandList) {
      quickAddCommandList.addEventListener("click", (event) => {
        const button = event.target.closest(".quick-add-command");
        if (!button) {
          return;
        }
        event.preventDefault();
        insertQuickAddCommand(button.dataset.command);
      });
    }

    document.addEventListener("keydown", handleQuickAddShortcut, true);
    refreshQuickAddUI();
  }

  function handleQuickAddShortcut(event) {
    const isMetaA = event.metaKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "a";
    const isAltA = event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "a";

    if (quickAddOpen) {
      if (event.key === "Escape" && !event.metaKey && !event.altKey) {
        event.preventDefault();
        closeQuickAddOverlay();
      }
      return;
    }

    if (!isMetaA && !isAltA) {
      return;
    }

    if (isTextInputTarget(event.target)) {
      return;
    }

    event.preventDefault();
    openQuickAddOverlay();
  }

  function isTextInputTarget(target) {
    if (!target) return false;
    const tagName = target.tagName;
    return (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      target.isContentEditable
    );
  }

  function openQuickAddOverlay(prefill = "") {
    initializeQuickAddSpotlight();
    if (!quickAddOverlay || !quickAddInput) {
      return;
    }

    quickAddOpen = true;
    quickAddOverlay.style.display = "flex";
    quickAddOverlay.classList.add("active");
    quickAddInput.value = prefill || "";
    quickAddSubmitting = false;
    refreshQuickAddUI();
    requestAnimationFrame(() => {
      quickAddInput.focus();
      if (quickAddInput.value.length) {
        quickAddInput.setSelectionRange(
          quickAddInput.value.length,
          quickAddInput.value.length
        );
      }
    });
  }

  function closeQuickAddOverlay() {
    if (!quickAddOverlay) {
      return;
    }
    quickAddOpen = false;
    quickAddOverlay.classList.remove("active");
    quickAddOverlay.style.display = "none";
    quickAddSubmitting = false;
    if (quickAddCommandList) {
      quickAddCommandList.classList.remove("active");
      quickAddCommandList.innerHTML = "";
    }
  }

  function getDefaultQuickAddState() {
    const nowIso = new Date().toISOString();
    const defaultProjectId =
      typeof currentProjectId !== "undefined" && currentProjectId !== null
        ? Number(currentProjectId)
        : null;
    const defaultAssigneeId =
      typeof appData.currentUserId !== "undefined"
        ? appData.currentUserId
        : null;
    const defaultAssigneeName =
      appData.teamMembers.find(
        (member) =>
          String(member.id) === String(defaultAssigneeId ?? "").trim()
      )?.name ?? appData.currentUserName ?? "";

    return {
      title: "",
      projectId: defaultProjectId,
      assigneeId: defaultAssigneeId ?? null,
      assigneeName:
        defaultAssigneeId && defaultAssigneeName
          ? defaultAssigneeName
          : "",
      requester: null,
      createdAt: nowIso,
      assignedAt: defaultAssigneeId ? nowIso : null,
      priority: "Medium",
      type: "Task",
      description: "",
    };
  }

  function parseQuickAddInput(rawInput = "") {
    const state = getDefaultQuickAddState();
    const errors = [];
    const pending = [];

    if (!rawInput) {
      return { state, errors, pending };
    }

    const segments = rawInput.split("/");
    state.title = segments.shift().trim();

    segments.forEach((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) {
        pending.push({ command: "", value: "" });
        return;
      }

      const spaceIndex = trimmed.indexOf(" ");
      const token =
        spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
      const remainder =
        spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
      const commandKey = resolveQuickAddCommand(token);

      if (!commandKey) {
        pending.push({ command: token, value: remainder });
        return;
      }

      if (!remainder) {
        pending.push({ command: commandKey, value: "" });
        return;
      }

      const result = applyQuickAddCommand(state, commandKey, remainder);
      if (result?.error) {
        errors.push(result.error);
      }
    });

    return { state, errors, pending };
  }

  function resolveQuickAddCommand(token) {
    if (!token) return null;
    const normalized = token.toLowerCase().replace(/[^a-z]/g, "");
    if (!normalized) return null;

    for (const [command, aliases] of Object.entries(
      QUICK_ADD_COMMAND_ALIASES
    )) {
      if (command === normalized || aliases.includes(normalized)) {
        return command;
      }
    }
    return null;
  }

  function applyQuickAddCommand(state, commandKey, rawValue) {
    const value = rawValue.trim();

    switch (commandKey) {
      case "assignee": {
        const result = resolveAssigneeValue(value);
        if (result.error) {
          return result;
        }
        state.assigneeId = result.id;
        state.assigneeName = result.name ?? "";
        state.assignedAt = result.id ? state.assignedAt ?? new Date().toISOString() : null;
        return {};
      }
      case "requester": {
        if (!value || ["none", "null", "clear"].includes(value.toLowerCase())) {
          state.requester = null;
        } else {
          state.requester = value;
        }
        return {};
      }
      case "created": {
        const parsed = parseQuickAddDate(value);
        if (!parsed) {
          return {
            error: `Unable to understand created date "${value}". Use YYYY-MM-DD or common words like "today".`,
          };
        }
        state.createdAt = parsed;
        return {};
      }
      case "assigned": {
        if (!value || ["none", "null", "clear"].includes(value.toLowerCase())) {
          state.assignedAt = null;
          return {};
        }
        const parsed = parseQuickAddDate(value);
        if (!parsed) {
          return {
            error: `Unable to understand assigned date "${value}".`,
          };
        }
        state.assignedAt = parsed;
        return {};
      }
      case "priority": {
        const normalized = normalizeQuickAddPriority(value);
        if (!normalized) {
          return {
            error: `Priority must be one of ${QUICK_ADD_PRIORITIES.join(
              ", "
            )}.`,
          };
        }
        state.priority = normalized;
        return {};
      }
      case "type": {
        const normalized = normalizeQuickAddType(value);
        if (!normalized) {
          return {
            error: `Type must be one of ${QUICK_ADD_TYPES.join(", ")}.`,
          };
        }
        state.type = normalized;
        return {};
      }
      case "description": {
        state.description = value;
        return {};
      }
      default:
        return {};
    }
  }

  function resolveAssigneeValue(rawValue) {
    const value = rawValue.trim();
    if (!value) {
      return { error: "Provide a value for /assignee." };
    }

    const lower = value.toLowerCase();
    if (["none", "null", "clear", "unassigned"].includes(lower)) {
      return { id: null, name: "" };
    }
    if (["me", "self", "current"].includes(lower)) {
      if (!appData.currentUserId) {
        return { error: "No current user available for assignment." };
      }
      return {
        id: appData.currentUserId,
        name: appData.currentUserName || "Me",
      };
    }

    const normalizedValue = value.toLowerCase();
    const exactMatch = appData.teamMembers.find(
      (member) => member.name.toLowerCase() === normalizedValue
    );
    if (exactMatch) {
      return { id: exactMatch.id, name: exactMatch.name };
    }

    const partialMatches = appData.teamMembers.filter((member) =>
      member.name.toLowerCase().includes(normalizedValue)
    );

    if (partialMatches.length === 1) {
      const match = partialMatches[0];
      return { id: match.id, name: match.name };
    }

    if (partialMatches.length > 1) {
      const preview = partialMatches
        .slice(0, 3)
        .map((m) => m.name)
        .join(", ");
      return {
        error: `Multiple teammates match "${value}". Try one of: ${preview}${
          partialMatches.length > 3 ? "…" : ""
        }`,
      };
    }

    return { error: `No teammate found named "${value}".` };
  }

  function normalizeQuickAddPriority(rawValue) {
    const value = rawValue.trim().toLowerCase();
    if (!value) return null;

    const direct = QUICK_ADD_PRIORITIES.find(
      (option) => option.toLowerCase() === value
    );
    if (direct) return direct;

    if (["med", "medium"].includes(value)) return "Medium";
    if (["hi", "high"].includes(value)) return "High";
    if (["crit", "critical"].includes(value)) return "Critical";
    if (["urg", "urgent"].includes(value)) return "Urgent";
    if (["lo", "low"].includes(value)) return "Low";
    return null;
  }

  function normalizeQuickAddType(rawValue) {
    const value = rawValue.trim().toLowerCase();
    if (!value) return null;

    const direct = QUICK_ADD_TYPES.find(
      (option) => option.toLowerCase() === value
    );
    if (direct) return direct;

    if (value === "bugfix" || value === "issue") return "Bug";
    if (value === "task" || value === "todo") return "Task";
    if (value === "req" || value === "request") return "Request";
    return null;
  }

  function parseQuickAddDate(rawValue) {
    if (!rawValue) return null;
    const value = rawValue.trim().toLowerCase();

    const today = new Date();
    if (value === "today") {
      return new Date().toISOString();
    }
    if (value === "tomorrow") {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 1);
      return date.toISOString();
    }
    if (value === "yesterday") {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - 1);
      return date.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(value + "T00:00:00Z");
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    const parsedGeneric = new Date(rawValue);
    if (!Number.isNaN(parsedGeneric.getTime())) {
      return parsedGeneric.toISOString();
    }
    return null;
  }

  function refreshQuickAddUI() {
    if (!quickAddInput) {
      return;
    }
    const rawValue = quickAddInput.value;
    quickAddLastParse = parseQuickAddInput(rawValue);
    renderQuickAddSummary(quickAddLastParse.state);
    updateQuickAddSuggestions(rawValue);
    if (quickAddError) {
      quickAddError.textContent = quickAddLastParse.errors[0] ?? "";
    }
  }

  function renderQuickAddSummary(state) {
    if (!quickAddSummary || !state) {
      return;
    }

    const summaryItems = [];
    const projectName = state.projectId
      ? appData.allProjects.find(
          (project) => String(project.id) === String(state.projectId)
        )?.projectName
      : null;

    if (projectName) {
      summaryItems.push({ label: "Project", value: projectName });
    }

    summaryItems.push({
      label: "Title",
      value: state.title ? state.title : "—",
    });
    summaryItems.push({
      label: "Assignee",
      value: state.assigneeName || "Unassigned",
      emphasise: !!state.assigneeName,
    });
    summaryItems.push({
      label: "Requester",
      value: state.requester || "—",
    });
    summaryItems.push({
      label: "Priority",
      value: state.priority || "—",
    });
    summaryItems.push({
      label: "Type",
      value: state.type || "—",
    });
    summaryItems.push({
      label: "Created",
      value: formatQuickAddSummaryDate(state.createdAt),
    });
    summaryItems.push({
      label: "Assigned",
      value: formatQuickAddSummaryDate(state.assignedAt),
    });
    summaryItems.push({
      label: "Description",
      value: state.description || "—",
    });

    quickAddSummary.innerHTML = summaryItems
      .map(
        (item) => `
        <div class="quick-add-summary-item">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(String(item.value))}</span>
        </div>
      `
      )
      .join("");
  }

  function formatQuickAddSummaryDate(isoValue) {
    if (!isoValue) {
      return "—";
    }
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function updateQuickAddSuggestions(rawValue) {
    if (!quickAddCommandList || !quickAddInput) {
      return;
    }

    const caret = quickAddInput.selectionStart ?? rawValue.length;
    const beforeCaret = rawValue.slice(0, caret);
    const lastSlash = beforeCaret.lastIndexOf("/");
    if (lastSlash === -1) {
      quickAddCommandList.classList.remove("active");
      quickAddCommandList.innerHTML = "";
      return;
    }

    const fragment = beforeCaret.slice(lastSlash + 1);
    if (fragment.includes(" ")) {
      quickAddCommandList.classList.remove("active");
      quickAddCommandList.innerHTML = "";
      return;
    }

    const normalized = fragment.toLowerCase();
    const matches =
      normalized.length === 0
        ? QUICK_ADD_COMMANDS
        : QUICK_ADD_COMMANDS.filter(
            (command) =>
              command.key.startsWith(normalized) ||
              command.label.toLowerCase().startsWith(normalized)
          );

    if (!matches.length) {
      quickAddCommandList.classList.remove("active");
      quickAddCommandList.innerHTML = "";
      return;
    }

    quickAddCommandList.innerHTML = matches
      .map(
        (command) => `
        <button type="button" class="quick-add-command" data-command="${command.key}">
          <span>/${command.key}</span>
          <small>${escapeHtml(command.description)}</small>
        </button>
      `
      )
      .join("");
    quickAddCommandList.classList.add("active");
  }

  function insertQuickAddCommand(commandKey) {
    if (!quickAddInput) {
      return;
    }

    const value = quickAddInput.value;
    const caret = quickAddInput.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const commandMatch = beforeCaret.match(/\/[^\s]*$/);
    let prefix = beforeCaret;
    let suffix = value.slice(caret);

    if (commandMatch) {
      const start = commandMatch.index;
      prefix = value.slice(0, start);
      suffix = value.slice(start + commandMatch[0].length);
    } else if (prefix && !prefix.endsWith(" ")) {
      prefix += " ";
    }

    const insertion = `${prefix.endsWith(" ") || !prefix ? "" : " "}/${commandKey} `;
    const newValue = `${prefix.replace(/\s*$/, "")}${insertion}${suffix.trimStart()}`;

    quickAddInput.value = newValue.trimStart();
    const newCaretPosition = quickAddInput.value.length;
    quickAddInput.setSelectionRange(newCaretPosition, newCaretPosition);
    refreshQuickAddUI();
    quickAddInput.focus();
  }

  async function submitQuickAddTicket() {
    if (!quickAddInput || quickAddSubmitting) {
      return;
    }

    refreshQuickAddUI();
    const parseResult =
      quickAddLastParse ?? parseQuickAddInput(quickAddInput.value);

    const title = (parseResult.state.title || "").trim();
    if (!title) {
      if (quickAddError) {
        quickAddError.textContent = "Add a task title before creating a ticket.";
      }
      quickAddInput.focus();
      return;
    }

    const pending = (parseResult.pending || []).find(
      (item) => item.command && !item.value
    );
    if (pending && quickAddError) {
      quickAddError.textContent = `Add a value for /${pending.command}.`;
      return;
    }

    if (parseResult.errors.length && quickAddError) {
      quickAddError.textContent = parseResult.errors[0];
      return;
    }

    const nowIso = new Date().toISOString();
    const assigneeId = parseResult.state.assigneeId
      ? Number(parseResult.state.assigneeId)
      : null;

    const ticketPayload = {
      title,
      description: parseResult.state.description || null,
      type: parseResult.state.type || "Task",
      priority: parseResult.state.priority || "Medium",
      status: "Open",
      requestedBy: parseResult.state.requester || null,
      assigneeId,
      createdAt: parseResult.state.createdAt || nowIso,
      assignedAt: assigneeId
        ? parseResult.state.assignedAt || nowIso
        : null,
      projectId: parseResult.state.projectId
        ? Number(parseResult.state.projectId)
        : null,
      log: [],
    };

    quickAddSubmitting = true;
    if (quickAddError) {
      quickAddError.textContent = "";
    }

    try {
      await executeFinalTicketSubmission([ticketPayload]);
      quickAddInput.value = "";
      refreshQuickAddUI();
      closeQuickAddOverlay();
    } catch (error) {
      console.error("Quick add submission failed:", error);
      if (quickAddError) {
        quickAddError.textContent =
          "Unable to create ticket right now. Please try again.";
      }
    } finally {
      quickAddSubmitting = false;
    }
  }
  
  // --- SUPABASE INITIALIZATION ---
  function waitForSupabase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max wait
      
      const checkSupabase = () => {
        attempts++;
        console.log(`Checking for Supabase... attempt ${attempts}`);
        
        if (typeof window !== 'undefined' && window.supabaseClient) {
          console.log("Supabase client found!");
          resolve(window.supabaseClient);
        } else if (attempts >= maxAttempts) {
          console.error("Supabase initialization timeout");
          reject(new Error("Supabase initialization timeout"));
        } else {
          setTimeout(checkSupabase, 100);
        }
      };
      checkSupabase();
    });
  }
  
  // --- UTILITY FUNCTIONS ---
  function escapeHtml(text) {
    if (typeof text !== "string") return text;
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Fetches all rows from a Supabase table, handling pagination automatically.
   * @param {object} queryBuilder - The initial Supabase query builder instance (e.g., supabase.from('table').select('*')).
   * @returns {Promise<{data: Array<object>, error: object|null}>} - An object containing the combined data or an error.
   */
  async function fetchAllPaginatedData(queryBuilder) {
    const BATCH_SIZE = 1000; // Supabase's default/max limit
    let allData = [];
    let from = 0;

    while (true) {
      const { data, error } = await queryBuilder.range(
        from,
        from + BATCH_SIZE - 1
      );

      if (error) {
        console.error("Error fetching paginated data:", error);
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
      }

      // If we received less data than the batch size, we've reached the end
      if (!data || data.length < BATCH_SIZE) {
        break;
      }

      from += BATCH_SIZE;
    }

    return { data: allData, error: null };
  }

  function setupNotifications() {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notifications.");
    } else if (Notification.permission === "default") {
      // We need to ask the user for permission
      Notification.requestPermission();
    }
  }

  /**
   * Shows a browser notification for a new ticket.
   * @param {object} ticket - The new ticket object.
   */
  function showBrowserNotification(ticket) {
    if (Notification.permission === "granted") {
      const faviconElement = document.getElementById("favicon-url");
      const faviconUrl = faviconElement ? faviconElement.value : "/favicons/favicon.svg?v=2";
      const notification = new Notification(`New Ticket Added: ${ticket.id}`, {
        body: ticket.title || "A new ticket has been created.",
        icon: faviconUrl && faviconUrl !== "{{FAVICON_URL}}" ? faviconUrl : "/favicons/favicon.svg?v=2",
      });

      // When the user clicks the notification, focus the app's window
      notification.onclick = () => {
        window.focus();
      };
    }
  }

  // Multiple initialization approaches to ensure the app starts
  function initializeApp() {
    console.log("🚀 Initializing app...");
    console.log("🚀 DOM ready state:", document.readyState);
    console.log("🚀 Document body exists:", !!document.body);
    
    // Check if required elements exist
    const loader = document.getElementById("loader");
    const tableWrapper = document.querySelector(".table-wrapper");
    const errorMessage = document.getElementById("error-message");
    
    console.log("🚀 Required elements found:", {
      loader: !!loader,
      tableWrapper: !!tableWrapper,
      errorMessage: !!errorMessage
    });
    
    if (!loader || !tableWrapper || !errorMessage) {
      console.error("❌ Required elements not found, retrying in 100ms...");
      setTimeout(initializeApp, 100);
      return;
    }
    
    console.log("✅ All required elements found, starting app...");
    startApp();
  }

  // Make initializeApp available globally for external initialization
  window.initializeApp = initializeApp;

  // Add global event listener for ticket field updates to ensure UI consistency
  document.addEventListener('ticketFieldUpdated', (event) => {
    const { ticketId, field, newValue, oldValue } = event.detail;
    console.log(`Field updated: ${field} for ticket ${ticketId}`, { oldValue, newValue });
    
    // Force a UI refresh to ensure all views are updated
    setTimeout(() => {
      applyFilterAndRender();
      if (currentView === "home") {
        renderDashboard();
      }
      updateNavBadgeCounts();
    }, 100);
  });
  
  async function startApp() {
    console.log("🚀 App.js loaded and starting...");
    console.log("🚀 JavaScript file loaded successfully!");
    const loader = document.getElementById("loader");
    reconcileWrapper = document.getElementById("reconcile-view-wrapper");
    tableWrapper = document.querySelector(".table-wrapper");
    const errorMessage = document.getElementById("error-message");
    
    try {
      setupNotifications();
      
      // Wait for Supabase to be available
      console.log("Waiting for Supabase to initialize...");
      const supabaseClient = await waitForSupabase();
      console.log("Supabase initialized successfully");
      console.log("Supabase URL:", window.SUPABASE_URL);
      console.log("Supabase Key:", window.SUPABASE_KEY ? "Present" : "Missing");
      
      // Test Supabase connection with retry logic for Vercel
      console.log("Testing Supabase connection...");
      let connectionTestPassed = false;
      let testRetries = 0;
      const maxTestRetries = 3;
      
      while (testRetries < maxTestRetries && !connectionTestPassed) {
        try {
          const { data, error } = await supabaseClient.from('user').select('count').limit(1);
          if (error) {
            console.warn(`Supabase connection test attempt ${testRetries + 1} failed:`, error);
            testRetries++;
            if (testRetries < maxTestRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * testRetries));
            }
          } else {
            console.log("✅ Supabase connection test successful");
            connectionTestPassed = true;
          }
        } catch (testError) {
          console.warn(`Supabase connection test attempt ${testRetries + 1} error:`, testError);
          testRetries++;
          if (testRetries < maxTestRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * testRetries));
          }
        }
      }
      
      if (!connectionTestPassed) {
        console.error("❌ Supabase connection test failed after all retries");
        showToast("Connection issues detected. Some features may not work properly.", "warning");
      }
      
      // Make supabaseClient available globally
      window.supabaseClient = supabaseClient;

      const [
        { data: ticketData, error: ticketError },
        { data: projectData, error: projectError },
        { data: memberData, error: memberError },
        { data: userData, error: userError },
        { data: reconcileData, error: reconcileError },
      ] = await Promise.all([
        fetchAllPaginatedData(
          window.supabaseClient.from("ticket").select(`*, project (projectName)`)
        ),
        window.supabaseClient
          .from("project")
          .select("*")
          .order("id", { ascending: true }),
        window.supabaseClient
          .from("member")
          .select("clockify_name")
          .order("clockify_name"),
        window.supabaseClient.from("user").select("id, name, email").order("name"),
        fetchAllPaginatedData(
          window.supabaseClient
            .from("reconcileHrs")
            .select("*")
            .order("id", { ascending: false })
        ),
      ]);

      console.log("Data fetch results:", {
        ticketData: ticketData?.length || 0,
        projectData: projectData?.length || 0,
        memberData: memberData?.length || 0,
        userData: userData?.length || 0,
        reconcileData: reconcileData?.length || 0,
      });

      if (
        ticketError ||
        projectError ||
        memberError ||
        userError ||
        reconcileError
      ) {
        console.error("Data Fetch Error:", {
          ticketError,
          projectError,
          memberError,
          userError,
          reconcileError,
        });
        throw new Error("Failed to fetch initial data.");
      }

      appData.allTickets = ticketData.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        epic: t.epic,
        title: t.title,
        description: t.description,
        requestedBy: t.requestedBy,
        relevantLink: t.relevantLink,
        priority: t.priority,
        type: t.type,
        status: t.status,
        assigneeId: t.assigneeId,
        sprint: t.sprint,
        createdAt: t.createdAt,
        assignedAt: t.assignedAt,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        dueDate: t.dueDate,
        log: t.log,
        requesterEmail: t.requesterEmail,
        subtask: t.subtask,
        comment: t.comment,
        projectName: t.project?.projectName || "",
      }));

      appData.tickets = appData.allTickets;
      appData.allProjects = projectData;
      appData.displayProjects = projectData;
      appData.projects = projectData.map((p) => ({
        ...p,
        name: p.projectName, // Add name property for backward compatibility
      }));
      appData.users = memberData.map((m) => m.clockify_name);
      appData.teamMembers = userData.map((u) => ({ id: u.id, name: u.name }));


      appData.epics = [
        ...new Set(ticketData.map((t) => t.epic).filter(Boolean)),
      ].sort();
      appData.allReconcileHrs = reconcileData;

      appData.currentUserEmail = document.getElementById("user-email").value;
      const currentUser = userData.find(
        (u) => u.email === appData.currentUserEmail
      );

      appData.currentUserId = currentUser ? currentUser.id : null;
      appData.currentUserName = currentUser ? currentUser.name : "Guest";
      // Inside the DOMContentLoaded listener, after appData.currentUserName is set
      appData.currentUserRole = document.getElementById("user-role").value;
      reconcileSelectedUserName = appData.currentUserName;

      initializeQuickAddSpotlight();

      dashboardAssigneeId = appData.currentUserId; // Default to current user

      let forcedInitialView = null;
      if (!appData.currentUserName) {
        document.getElementById("nav-my-ticket").style.display = "none";
        forcedInitialView = "all";
      }

      tableWrapper.style.display = "block";
      
      // Add navigation listeners with retry mechanism for production
      addNavListenersWithRetry();
      addBulkEditListeners();
      addFilterListeners();
      addModalEventListeners();
      // Add dashboard filter listeners after data is loaded
      addDashboardFilterListeners();

      const clearUrlFilterBtn = document.getElementById("clear-url-filter-btn");
      const urlTicketNumberInput = document.getElementById("url-ticket-number");
      const urlInitialViewInput = document.getElementById("url-initial-view");

      const urlTicketNumber = urlTicketNumberInput ? urlTicketNumberInput.value : "";
      const rawInitialView = urlInitialViewInput ? urlInitialViewInput.value : "";
      const locationView =
        ROUTE_VIEW_MAP[normalizePath(window.location.pathname)] ?? null;
      const initialView =
        forcedInitialView ??
        (rawInitialView && VIEW_ROUTE_MAP[rawInitialView]
          ? rawInitialView
          : locationView ?? "projects");

      if (urlTicketNumber) {
        ticketNumberFilter = urlTicketNumber;
        document.getElementById("ticket-number-filter").value = urlTicketNumber;
      }

      if (clearUrlFilterBtn) {
        clearUrlFilterBtn.addEventListener("click", () => {
        const currentRoute = VIEW_ROUTE_MAP[currentView] ?? "/projects";
          window.top.location.href = currentRoute;
        });
        clearUrlFilterBtn.style.display = urlTicketNumber ? "inline-flex" : "none";
      }

      activateView(initialView, {
        replaceHistory: true,
        preserveFilters: Boolean(urlTicketNumber),
      });

      window.addEventListener("popstate", (event) => {
        const stateView = event.state?.view;
        const fallbackView =
          ROUTE_VIEW_MAP[normalizePath(window.location.pathname)] ?? "projects";
        const nextView =
          (stateView && VIEW_ROUTE_MAP[stateView] ? stateView : null) ??
          fallbackView;
        if (!nextView || nextView === currentView) {
          return;
        }
        suppressHistoryUpdate = true;
        activateView(nextView, { updateHistory: false });
        suppressHistoryUpdate = false;
      });

      // Hide loader and show main content
      loader.style.display = "none";
      const actionsContainer = document.querySelector(".actions-container");
      if (actionsContainer) {
        actionsContainer.style.display = "block";
      }

      applyFilterAndRender();
      addPaginationListeners();
      addReconcilePaginationListeners();
      
      // Set up real-time subscriptions with fallback
      try {
        subscribeToTicketChanges();
        
        // Add a fallback polling mechanism for Vercel reliability
        if (window.location.href.includes('vercel.app')) {
          console.log("Vercel environment detected, setting up fallback polling");
          setInterval(async () => {
            if (!window.realtimeSubscribed) {
              console.log("Real-time subscription lost, attempting to reconnect...");
              subscribeToTicketChanges();
            }
          }, 30000); // Check every 30 seconds
        }
      } catch (subscriptionError) {
        console.error("Failed to set up real-time subscriptions:", subscriptionError);
        showToast("Real-time updates unavailable. Changes may not appear immediately.", "warning");
      }
    } catch (error) {
      console.error("Error during initialization:", error);
      console.error("Error stack:", error.stack);
      if (loader) loader.style.display = "none";
      if (errorMessage) {
        errorMessage.style.display = "flex";
        errorMessage.innerHTML = `
          <h3>Application Error</h3>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>Details:</strong> Check the browser console for more information.</p>
          <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
        `;
      }
    }
  }
  
  // Initialization is now handled by the external script in app.tsx
  // This ensures proper timing with Supabase client initialization
  
  // Fallback initialization - only if not already initialized
  window.addEventListener('load', () => {
    console.log("🚀 Window load event fired");
    if (document.getElementById("loader") && document.getElementById("loader").style.display !== "none") {
      console.log("🚀 App still loading, triggering initialization...");
      // Only initialize if not already done
      if (!window.appInitialized) {
        initializeApp();
      }
    }
  });

  // Mark app as initialized when startApp completes
  const originalStartApp = startApp;
  startApp = async function() {
    await originalStartApp();
    window.appInitialized = true;
    console.log("✅ App initialization completed and marked");
  };

  /**
   * Subscribes to real-time changes (inserts, updates, deletes) in the 'ticket' table.
   */
  function subscribeToTicketChanges() {
    try {
      console.log("Setting up real-time subscription...");
      
      if (!window.supabaseClient) {
        console.error("❌ Supabase client not available for real-time subscription");
        // Retry after a short delay
        setTimeout(() => {
          if (window.supabaseClient) {
            subscribeToTicketChanges();
          }
        }, 1000);
        return;
      }

      const channel = window.supabaseClient
        .channel("public:ticket")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ticket" },
          (payload) => {
            console.log("Real-time change received!", payload);
            try {
              handleRealtimeChange(payload);
            } catch (error) {
              console.error("Error handling real-time change:", error);
            }
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
          if (status === "SUBSCRIBED") {
            console.log("✅ Successfully subscribed to real-time ticket changes!");
            window.realtimeSubscribed = true;
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Real-time subscription error");
            window.realtimeSubscribed = false;
            // Retry subscription after error
            setTimeout(() => {
              console.log("🔄 Retrying real-time subscription...");
              subscribeToTicketChanges();
            }, 5000);
          } else if (status === "TIMED_OUT") {
            console.error("❌ Real-time subscription timed out");
            window.realtimeSubscribed = false;
            // Retry subscription after timeout
            setTimeout(() => {
              console.log("🔄 Retrying real-time subscription after timeout...");
              subscribeToTicketChanges();
            }, 3000);
          } else if (status === "CLOSED") {
            console.warn("⚠️ Real-time subscription closed");
            window.realtimeSubscribed = false;
          }
        });
        
      // Store channel reference for cleanup
      window.realtimeChannel = channel;
      
    } catch (error) {
      console.error("Error setting up real-time subscription:", error);
      window.realtimeSubscribed = false;
      // Retry after error
      setTimeout(() => {
        console.log("🔄 Retrying real-time subscription after error...");
        subscribeToTicketChanges();
      }, 3000);
    }
  }

  /**
   * Handles incoming real-time data changes from Supabase subscription.
   * @param {object} payload - The data payload from Supabase.
   */

  // REPLACE the existing handleRealtimeChange function with this one

  function handleRealtimeChange(payload) {
    console.log("Real-time payload received:", payload);
    
    // Handle different payload structures
    const eventType = payload.eventType || payload.event_type || payload.type;
    const newRecord = payload.new || payload.new_record;
    const oldRecord = payload.old || payload.old_record;
    
    let ticketId;
    let isChanged = false;

    if (!eventType) {
      console.error("No event type found in payload:", payload);
      return;
    }

    console.log("Processing event:", eventType, "newRecord:", newRecord, "oldRecord:", oldRecord);

    switch (eventType) {
      case "INSERT":
        // Skip real-time insert if user is currently creating tickets
        if (window.userCreatingTickets) {
          console.log("User is creating tickets, skipping real-time insert to prevent duplicates");
          return;
        }
        
        // Check if this ticket already exists in our local state
        const existingTicket = appData.allTickets.find(t => t.id === newRecord.id);
        if (existingTicket) {
          console.log("Ticket already exists in local state, skipping real-time insert");
          return;
        }
        
        const project = appData.allProjects.find(
          (p) => p.id === newRecord.projectId
        );
        const newTicket = {
          ...newRecord,
          projectName: project ? project.projectName : "",
        };
        appData.allTickets.unshift(newTicket);
        isChanged = true;
        showBrowserNotification(newTicket);
        showToast(`New ticket added: ${newTicket.id}`, "success");
        break;

      case "UPDATE":
        ticketId = newRecord.id;
        const ticketIndex = appData.allTickets.findIndex(
          (t) => t.id === ticketId
        );
        if (ticketIndex !== -1) {
          const oldTicket = appData.allTickets[ticketIndex];
          const updatedProject = appData.allProjects.find(
            (p) => p.id === newRecord.projectId
          );
          appData.allTickets[ticketIndex] = {
            ...oldTicket,
            ...newRecord,
            projectName: updatedProject
              ? updatedProject.projectName
              : oldTicket.projectName,
          };
          isChanged = true;
        }
        break;

      case "DELETE":
        ticketId = oldRecord.id;
        const initialLength = appData.allTickets.length;
        appData.allTickets = appData.allTickets.filter(
          (t) => t.id !== ticketId
        );
        if (appData.allTickets.length < initialLength) {
          isChanged = true;
        }
        break;
    }

    if (isChanged) {
      console.log("Data changed, updating UI...");
      
      // Force UI refresh with a small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          applyFilterAndRender();
          
          // Update dashboard if it's currently visible
          if (currentView === "home") {
            console.log("Updating dashboard...");
            renderDashboard();
          }
          
          // Update navigation badges
          updateNavBadgeCounts();
          
          // Force a re-render of any open modals to reflect changes
          const modal = document.getElementById("task-detail-modal");
          if (modal && modal.style.display === "flex") {
            const modalTicketId = modal.querySelector(".ticket-main-content")?.dataset.ticketId;
            if (modalTicketId == ticketId) {
              console.log("Refreshing open modal for updated ticket:", ticketId);
              // Trigger a modal refresh
              const event = new CustomEvent('ticketUpdated', { 
                detail: { ticketId: ticketId, eventType: eventType } 
              });
              document.dispatchEvent(event);
            }
          }
        } catch (uiError) {
          console.error("Error during UI refresh:", uiError);
          // Fallback: try a simple page refresh if UI update fails
          if (window.location.href.includes('vercel.app')) {
            console.log("Vercel environment detected, attempting fallback refresh");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        }
      }, 100);
    }
  }

  // Sorting functions
  function getCurrentSortState() {
    return currentSort;
  }

  function setSortState(field, direction) {
    currentSort.field = field;
    currentSort.direction = direction;
  }

  function getNextSortDirection(currentField, currentDirection) {
    if (currentField !== currentSort.field) {
      return 'asc'; // First click on new field
    }
    
    switch (currentDirection) {
      case 'asc': return 'desc';
      case 'desc': return null; // Reset
      case null: return 'asc';
      default: return 'asc';
    }
  }

  function sortTickets(tickets, field, direction) {
    if (!field || !direction) {
      return tickets; // Return unsorted if no valid sort
    }

    return [...tickets].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle special cases
      if (field === 'assigneeId') {
        aVal = a.assigneeName || '';
        bVal = b.assigneeName || '';
      } else if (field === 'requestedBy') {
        aVal = a.requestedBy || '';
        bVal = b.requestedBy || '';
      } else if (field === 'priority') {
        const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        aVal = priorityOrder[aVal] ?? 4;
        bVal = priorityOrder[bVal] ?? 4;
      } else if (field === 'status') {
        const statusOrder = { 'Open': 0, 'In Progress': 1, 'On Hold': 2, 'Blocked': 3, 'Completed': 4, 'Cancelled': 5, 'Rejected': 6 };
        aVal = statusOrder[aVal] ?? 7;
        bVal = statusOrder[bVal] ?? 7;
      }

      // Convert to strings for comparison if not numbers
      if (typeof aVal !== 'number' && typeof bVal !== 'number') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function handleHeaderClick(event) {
    const header = event.target.closest('.sortable-header');
    if (!header) return;

    const field = header.dataset.sortField;
    const currentDirection = currentSort.field === field ? currentSort.direction : null;
    const nextDirection = getNextSortDirection(field, currentDirection);

    // Update sort state
    setSortState(field, nextDirection);

    // Re-render the table with new sort
    applyFilterAndRender();
  }

  // REPLACE the existing handleUpdate function with this new ASYNC version
  async function handleUpdate(event, newValueFromSearchable) {
    const element = event.target;
    const parentContainer = element.closest("td, .sidebar-property-editable");
    if (!parentContainer) return;
    const fieldWrapper = element.closest(".editable-field-wrapper");
    const ticketId =
      element.dataset.id ||
      element.closest(".ticket-details-sidebar")?.dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    const field = element.dataset.field;
    const oldValue = ticket[field]; // Get the actual current value from the ticket data
    let newValue;
    
    // Handle searchable dropdowns (Requested By, Assignee, etc.)
    if (element.classList.contains("searchable-dropdown-input")) {
      newValue = newValueFromSearchable !== undefined 
        ? newValueFromSearchable 
        : element.dataset.value || null;
    } else {
      // Handle regular inputs and selects
      newValue = newValueFromSearchable !== undefined
        ? newValueFromSearchable
        : element.value === ""
        ? null
        : element.value;
    }

    if (field === "assigneeId" && newValue && newValue !== "") {
      newValue = parseInt(newValue, 10);
    }

    if (String(oldValue || "") === String(newValue || "")) {
      if (element.closest(".tag-editor"))
        element.closest(".tag-editor").classList.remove("is-editing");
      return;
    }

    let updates = { [field]: newValue };
    const nowIso = new Date().toISOString();

    if (field === "assigneeId" && newValue) updates.assignedAt = nowIso;

    // --- COMPREHENSIVE STATUS TRANSITION LOGIC ---
    if (field === "status") {
      const oldStatus = oldValue;
      const newStatus = newValue;
      
      // Open -> transitions
      if (oldStatus === "Open") {
        if (newStatus === "In Progress") {
          updates.startedAt = nowIso;
        }
        else if (newStatus === "On Hold") {
          // Just change status
        }
        else if (newStatus === "Blocked") {
          // Just change status
        }
        else if (newStatus === "Cancelled") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Rejected") {
        updates.startedAt = nowIso;
        updates.completedAt = nowIso;
    }
        else if (newStatus === "Completed") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
      
      // In Progress -> transitions
      else if (oldStatus === "In Progress") {
        if (newStatus === "Open") {
          updates.startedAt = null;
        }
        else if (newStatus === "On Hold") {
          // Just change status
        }
        else if (newStatus === "Blocked") {
          // Just change status
        }
        else if (newStatus === "Cancelled") {
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Rejected") {
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Completed") {
          updates.completedAt = nowIso;
        }
      }
      
      // On Hold -> transitions
      else if (oldStatus === "On Hold") {
        if (newStatus === "Open") {
          // Just change status
        }
        else if (newStatus === "Blocked") {
          // Just change status
        }
        else if (newStatus === "In Progress") {
          updates.startedAt = nowIso;
        }
        else if (newStatus === "Rejected") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Completed") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
      
      // Blocked -> transitions
      else if (oldStatus === "Blocked") {
        if (newStatus === "Open") {
          // Just change status
        }
        else if (newStatus === "On Hold") {
          // Just change status
        }
        else if (newStatus === "In Progress") {
          updates.startedAt = nowIso;
        }
        else if (newStatus === "Rejected") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Completed") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
      
      // Cancelled -> transitions
      else if (oldStatus === "Cancelled") {
        if (newStatus === "Open") {
          updates.completedAt = null;
          updates.startedAt = null;
        }
        else if (newStatus === "On Hold") {
          updates.completedAt = null;
        }
        else if (newStatus === "In Progress") {
          updates.completedAt = null;
        }
        else if (newStatus === "Rejected") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Completed") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
      
      // Rejected -> transitions
      else if (oldStatus === "Rejected") {
        if (newStatus === "Open") {
          updates.completedAt = null;
          updates.startedAt = null;
        }
        else if (newStatus === "On Hold") {
          updates.completedAt = null;
        }
        else if (newStatus === "In Progress") {
          updates.completedAt = null;
        }
        else if (newStatus === "Cancelled") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Completed") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
      
      // Completed -> transitions
      else if (oldStatus === "Completed") {
        if (newStatus === "Open") {
          updates.completedAt = null;
          updates.startedAt = null;
        }
        else if (newStatus === "On Hold") {
          updates.completedAt = null;
        }
        else if (newStatus === "In Progress") {
          updates.completedAt = null;
        }
        else if (newStatus === "Cancelled") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
        else if (newStatus === "Rejected") {
          updates.startedAt = nowIso;
          updates.completedAt = nowIso;
        }
      }
    }
    // --- END STATUS TRANSITION LOGIC ---

    const logEntry = {
      user: appData.currentUserEmail,
      timestamp: nowIso,
      field: field,
      oldValue: oldValue,
      newValue: newValue,
      reason: updates.logReason || null,
    };

    updates.log = Array.isArray(ticket.log)
      ? [...ticket.log, logEntry]
      : [logEntry];
    if (updates.logReason) delete updates.logReason;

    parentContainer.classList.add("updating");
    
    // Add updating indicator for all tag-editor jira-style elements
    if (element.classList.contains("status-tag") || 
        element.classList.contains("priority-tag") || 
        element.classList.contains("type-tag")) {
      element.classList.add("updating");
      element.innerHTML = `<i class="fas fa-spinner"></i> Updating...`;
    }
    
    try {
      // Add retry logic for Vercel reliability
      let retryCount = 0;
      const maxRetries = 3;
      let error = null;
      
      while (retryCount < maxRetries) {
        const result = await supabaseClient
          .from("ticket")
          .update(updates)
          .eq("id", ticket.id);
        
        error = result.error;
        
        if (!error) break;
        
        retryCount++;
        console.warn(`Update attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      parentContainer.classList.remove("updating");

      if (error) {
        console.error("Final update error after retries:", error);
        showToast("Update failed: " + error.message, "error");
        element.value = oldValue;
        
        // Revert any UI changes
        if (element.classList.contains("status-tag") || 
            element.classList.contains("priority-tag") || 
            element.classList.contains("type-tag")) {
          const oldTagInfo = getTagInfo(element.dataset.field, oldValue);
          element.className = `${element.classList.contains("status-tag") ? "status-tag" : 
                               element.classList.contains("priority-tag") ? "priority-tag" : "type-tag"} ${oldTagInfo.className}`;
          element.textContent = oldValue;
          element.classList.remove("updating");
        }
      } else {
        // Update local data
        ticket[field] = newValue;
        
        element.dataset.oldValue = newValue;
        element.dataset.value = newValue;
        
        // For Jira-style dropdowns, also update the tag element's oldValue and text
        if (element.classList.contains("status-tag") || 
            element.classList.contains("priority-tag") || 
            element.classList.contains("type-tag")) {
          element.dataset.oldValue = newValue;
          
          // Show success indicator for all tag types
          element.classList.remove("updating");
          element.classList.add("success");
          element.innerHTML = `<i class="fas fa-check"></i> ${newValue}`;
          
          // Remove success indicator after 2 seconds
          setTimeout(() => {
            element.classList.remove("success");
            const finalTagInfo = getTagInfo(element.dataset.field, newValue);
            const tagType = element.classList.contains("status-tag") ? "status-tag" : 
                           element.classList.contains("priority-tag") ? "priority-tag" : "type-tag";
            element.className = `${tagType} ${finalTagInfo.className}`;
            element.textContent = finalTagInfo.text;
          }, 2000);
        }
        
        parentContainer.classList.add("is-successful");
        if (fieldWrapper) {
          fieldWrapper.classList.remove("is-dirty");
        }
        
        // Force UI refresh after successful update
        setTimeout(() => {
          parentContainer.classList.remove("is-successful");
          // Trigger a custom event for real-time updates
          const updateEvent = new CustomEvent('ticketFieldUpdated', {
            detail: { ticketId: ticket.id, field: field, newValue: newValue, oldValue: oldValue }
          });
          document.dispatchEvent(updateEvent);
        }, 1200);
      }
    } catch (networkError) {
      console.error("Network error during update:", networkError);
      parentContainer.classList.remove("updating");
      showToast("Network error. Please check your connection and try again.", "error");
      element.value = oldValue;
    }
  }

  /**
   * NEW: Displays the confirmation modal with a summary of tickets to be created.
   * @param {Array<object>} ticketsToConfirm - The processed array of ticket data.
   */
  async function showConfirmationModal(ticketsToConfirm) {
    if (!ticketsToConfirm || ticketsToConfirm.length === 0) {
      showToast("No tickets to submit.", "error");
      return;
    }

    const modal = document.getElementById("add-ticket-confirm-modal");
    const listContainer = document.getElementById("confirm-ticket-list");
    const confirmBtn = document.getElementById(
      "confirm-and-submit-tickets-btn"
    );

    if (!modal || !listContainer || !confirmBtn) {
      console.warn(
        "Quick confirmation modal not available. Submitting tickets immediately."
      );
      await executeFinalTicketSubmission(ticketsToConfirm);
      return;
    }

    // Create a lookup for project and assignee names to avoid repeated searches
    const projectNames = appData.allProjects.reduce((acc, p) => {
      acc[p.id] = p.projectName;
      return acc;
    }, {});
    const assigneeNames = appData.teamMembers.reduce((acc, m) => {
      acc[m.id] = m.name;
      return acc;
    }, {});

    let listHtml = ticketsToConfirm
      .map((ticket) => {
        const projectName = ticket.projectId
          ? projectNames[ticket.projectId]
          : "<em>None</em>";
        const assigneeName = ticket.assigneeId
          ? assigneeNames[ticket.assigneeId]
          : "<em>Unassigned</em>";
        const description = ticket.description
          ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(
              ticket.description
            )}</p>`
          : "";

        return `<div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <strong>${escapeHtml(ticket.title)}</strong>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                <strong>Project:</strong> ${escapeHtml(
                  projectName
                )} | <strong>Assignee:</strong> ${escapeHtml(
          assigneeName
        )} | <strong>Priority:</strong> ${escapeHtml(ticket.priority)}
            </div>
            ${description}
        </div>`;
      })
      .join("");
    listContainer.innerHTML = listHtml;

    // Attach the data to the button and show the modal
    confirmBtn.dataset.tickets = JSON.stringify(ticketsToConfirm);
    modal.style.display = "flex";
  }

  /**
   * NEW: The final step that inserts ticket data into Supabase.
   * @param {Array<object>} ticketsToSubmit - The confirmed array of ticket data.
   */
  async function executeFinalTicketSubmission(ticketsToSubmit) {
    const confirmModal = document.getElementById("add-ticket-confirm-modal");
    const addModal = document.getElementById("add-task-modal");
    const submitBtn = document.getElementById("confirm-and-submit-tickets-btn");

    if (submitBtn) {
      submitBtn.textContent = "Submitting...";
      submitBtn.disabled = true;
    }

    // Set flag to prevent real-time subscription from interfering
    window.userCreatingTickets = true;
    const createdTicketIds = ticketsToSubmit.map(t => t.id).filter(id => id);

    // Log ticket submission for debugging
    console.log(`Submitting ${ticketsToSubmit.length} tickets`);
    
    // Ensure no manual IDs are present
    ticketsToSubmit.forEach((ticket, index) => {
      if (ticket.id !== undefined) {
        console.warn(`⚠️ Ticket ${index} has manual ID:`, ticket.id);
        delete ticket.id; // Remove any manual ID
      }
    });

    // Try to fix sequence if it's out of sync
    try {
      const { data: lastTicket } = await supabaseClient
        .from("ticket")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      
      if (lastTicket) {
        // Reset the sequence to be higher than the last ticket ID
        await supabaseClient.rpc('reset_ticket_sequence', { 
          new_start_value: lastTicket.id + 1 
        });
        console.log(`Sequence reset to: ${lastTicket.id + 1}`);
      }
    } catch (seqError) {
      console.warn("⚠️ Could not reset sequence (this is normal if function doesn't exist):", seqError.message);
    }

    const { data: insertedTickets, error } = await supabaseClient
      .from("ticket")
      .insert(ticketsToSubmit)
      .select();

    if (submitBtn) {
      submitBtn.textContent = "Confirm & Submit";
      submitBtn.disabled = false;
    }

    if (error) {
      console.error("Database error:", error);
      showToast("Error: " + error.message, "error");
    } else {
      console.log(`${insertedTickets.length} tickets inserted successfully`);
      showToast(
        `${insertedTickets.length} ticket(s) added successfully!`,
        "success"
      );
      
      if (insertedTickets && insertedTickets.length > 0) {
        // Update the frontend state with the new tickets
        await updateTicketDataAfterCreation(insertedTickets);
        
        // Send Discord notification
        await sendDiscordNotificationViaApi(
          insertedTickets,
          appData.currentUserName
        );
      }

      if (confirmModal) {
        confirmModal.style.display = "none";
      }
      if (addModal) {
        addModal.style.display = "none";
      }
    }
    
    // Clear the flag after processing
    window.userCreatingTickets = false;
  }

  // NEW: Function to update frontend state after ticket creation
  async function updateTicketDataAfterCreation(newTickets) {
    // Prevent multiple simultaneous updates
    if (window.updatingTickets) {
      console.log("Ticket update already in progress, skipping duplicate call");
      return;
    }
    
    try {
      window.updatingTickets = true;
      console.log("Updating frontend state with new tickets...");
      
      // Prevent duplicate processing of the same tickets
      const ticketIds = newTickets.map(t => t.id).filter(id => id);
      const existingIds = appData.allTickets.map(t => t.id);
      const newTicketIds = ticketIds.filter(id => !existingIds.includes(id));
      
      if (newTicketIds.length === 0) {
        console.log("All tickets already exist in frontend state, skipping update");
        return;
      }
      
      // Add a small delay to ensure database consistency in production
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch fresh data from database with retry logic for production reliability
      let freshTicketData, fetchError;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        const result = await supabaseClient
          .from("ticket")
          .select(`
            *,
            project:projectId(projectName)
          `)
          .order("id", { ascending: false });
        
        freshTicketData = result.data;
        fetchError = result.error;
        
        if (!fetchError) break;
        
        retryCount++;
        console.warn(`⚠️ Database fetch attempt ${retryCount} failed, retrying...`, fetchError);
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
        }
      }

      if (fetchError) {
        console.error("❌ Error fetching fresh ticket data:", fetchError);
        // Fallback: just add the new tickets to existing state
        const formattedNewTickets = newTickets.map((t) => ({
          id: t.id,
          projectId: t.projectId,
          epic: t.epic,
          title: t.title,
          description: t.description,
          requestedBy: t.requestedBy,
          relevantLink: t.relevantLink,
          priority: t.priority,
          type: t.type,
          status: t.status,
          assigneeId: t.assigneeId,
          sprint: t.sprint,
          createdAt: t.createdAt,
          assignedAt: t.assignedAt,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
          dueDate: t.dueDate,
          log: t.log,
          requesterEmail: t.requesterEmail,
          subtask: t.subtask,
          comment: t.comment,
          projectName: t.project?.projectName || "",
        }));
        
        // Only add tickets that don't already exist
        const existingIds = appData.allTickets.map(t => t.id);
        const uniqueNewTickets = formattedNewTickets.filter(t => !existingIds.includes(t.id));
        appData.allTickets = [...uniqueNewTickets, ...appData.allTickets];
        appData.tickets = appData.allTickets;
        
        console.log("Added new tickets to existing state (fallback)");
      } else {
        // Update with fresh data from database
        appData.allTickets = freshTicketData.map((t) => ({
          id: t.id,
          projectId: t.projectId,
          epic: t.epic,
          title: t.title,
          description: t.description,
          requestedBy: t.requestedBy,
          relevantLink: t.relevantLink,
          priority: t.priority,
          type: t.type,
          status: t.status,
          assigneeId: t.assigneeId,
          sprint: t.sprint,
          createdAt: t.createdAt,
          assignedAt: t.assignedAt,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
          dueDate: t.dueDate,
          log: t.log,
          requesterEmail: t.requesterEmail,
          subtask: t.subtask,
          comment: t.comment,
          projectName: t.project?.projectName || "",
        }));
        
        appData.tickets = appData.allTickets;
        console.log("Updated with fresh data from database");
      }
      
      // Apply current filters and refresh the display
      applyFilters();
      renderTickets();
      
      console.log("Frontend state updated successfully");
      
    } catch (error) {
      console.error("Error updating frontend state:", error);
      // Only show refresh warning if it's a critical error
      if (error.message && error.message.includes('fetch')) {
        showToast("Tickets created successfully, but UI may need refresh", "warning");
      } else {
        showToast("Tickets created successfully!", "success");
      }
    } finally {
      // Always clear the updating flag
      window.updatingTickets = false;
    }
  }

  // REPLACE the existing prepareAndConfirmTickets function
  async function prepareAndConfirmTickets() {
    // Check if we're in Jira mode (bulk settings OFF)
    const isBulkOn = document.getElementById("bulk-settings-toggle").checked;
    
    if (!isBulkOn) {
      // Handle Jira form submission
      const jiraForm = document.getElementById("jira-style-form");
      if (jiraForm && jiraForm.style.display !== "none") {
        submitJiraForm();
        return;
      }
    }
    
    // Handle bulk settings submission
    // NEW: Run validation logic at the beginning
    const validationErrors = validateTicketRows();
    if (validationErrors.length > 0) {
      const warningContent = document.getElementById("warning-content");
      warningContent.innerHTML = `
          <p>Please fix the following required fields before submitting:</p>
          <ul style="margin-top: 1rem; list-style-position: inside;">
              ${validationErrors.map((err) => `<li>${err}</li>`).join("")}
          </ul>
      `;
      document.getElementById("warning-modal").style.display = "flex";
      return; // Stop the process if there are errors
    }

    const modal = document.getElementById("add-task-modal");
    const ticketRows = modal.querySelectorAll(".main-ticket-row");
    let isValid = true;
    const newTicketsData = [];

    if (ticketRows.length === 0) {
      showToast("Please add at least one ticket.", "error");
      return;
    }

    const bulkValues = {
      projectId:
        document.getElementById("bulk-add-project-select").value || null,
      epic: document.getElementById("bulk-add-epic").value.trim() || null,
      requestedBy:
        document.getElementById("bulk-add-requested-by").value || null,
      assigneeId:
        document.querySelector("#bulk-add-assignee-container input").dataset
          .value || null,
      status: document.getElementById("bulk-add-status").value || "Open",
      assignedAt:
        document.getElementById("bulk-add-assigned-date").value || null,
      startedAt: document.getElementById("bulk-add-started-date").value || null,
      completedAt:
        document.getElementById("bulk-add-completed-date").value || null,
    };

    let createdAtTimestamp;
    const createdDateValue = document.getElementById(
      "bulk-add-created-date"
    ).value;
    if (createdDateValue) {
      const [year, month, day] = createdDateValue.split("-").map(Number);
      const now = new Date();
      createdAtTimestamp = new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      ).toISOString();
    } else {
      createdAtTimestamp = new Date().toISOString();
    }

    // Remove manual ID generation - let database handle auto-increment
    // This prevents duplicate key constraint violations in concurrent scenarios

    ticketRows.forEach((row) => {
      const advancedRow = row.nextElementSibling;
      const useAdvanced = advancedRow && advancedRow.style.display !== "none";

      const titleInput = row.querySelector(".new-ticket-title");
      const title = titleInput.value.trim();
      if (!title) {
        isValid = false;
        titleInput.classList.add("input-error");
      }

      if (isValid) {
        let ticket = { ...bulkValues };

        if (useAdvanced) {
          const advProject =
            advancedRow.querySelector(".override-project").value;
          if (advProject) ticket.projectId = advProject;

          const advEpic = advancedRow
            .querySelector(".override-epic")
            .value.trim();
          if (advEpic || advEpic === "") ticket.epic = advEpic || null;

          const advRequestedBy = advancedRow.querySelector(
            ".override-requested-by"
          ).value;
          if (advRequestedBy) ticket.requestedBy = advRequestedBy;

          const advAssigneeId = advancedRow.querySelector(
            ".override-assignee-container input"
          ).dataset.value;
          if (advAssigneeId) ticket.assigneeId = advAssigneeId;


          const advStatus = advancedRow.querySelector(".override-status").value;
          if (advStatus) ticket.status = advStatus;

          const advCreatedDate = advancedRow.querySelector(
            ".override-created-date"
          ).value;
          if (advCreatedDate) {
            const [year, month, day] = advCreatedDate.split("-").map(Number);
            const now = new Date();
            ticket.createdAt = new Date(
              year,
              month - 1,
              day,
              now.getHours(),
              now.getMinutes(),
              now.getSeconds()
            ).toISOString();
          }

          const advAssignedDate = advancedRow.querySelector(
            ".override-assigned-date"
          ).value;
          if (advAssignedDate) ticket.assignedAt = advAssignedDate;

          const advStartedDate = advancedRow.querySelector(
            ".override-started-date"
          ).value;
          if (advStartedDate) ticket.startedAt = advStartedDate;

          const advCompletedDate = advancedRow.querySelector(
            ".override-completed-date"
          ).value;
          if (advCompletedDate) ticket.completedAt = advCompletedDate;
        }

        // Don't assign manual ID - let database auto-generate
        // ticket.id = nextId; // REMOVED to prevent duplicate key violations
        ticket.title = title;
        ticket.description = row
          .querySelector(".new-ticket-description")
          .value.trim();
        ticket.createdAt = ticket.createdAt || createdAtTimestamp;
        ticket.log = [];
        ticket.type = row.querySelector(".new-ticket-type").value;
        ticket.priority = row.querySelector(".new-ticket-priority").value;

        if (ticket.assigneeId && !ticket.assignedAt)
          ticket.assignedAt = new Date().toISOString();
        if (ticket.status === "In Progress" && !ticket.startedAt)
          ticket.startedAt = new Date().toISOString();
        if (ticket.status === "Completed" && !ticket.startedAt)
          ticket.startedAt = new Date().toISOString();
        if (ticket.status === "Completed" && !ticket.completedAt)
          ticket.completedAt = new Date().toISOString();

        if (ticket.projectId) ticket.projectId = parseInt(ticket.projectId, 10);
        if (ticket.assigneeId)
          ticket.assigneeId = parseInt(ticket.assigneeId, 10);

        newTicketsData.push(ticket);
      }
    });

    if (!isValid) {
      showToast("Please fill in the title for all tickets.", "error");
      return;
    }

    showConfirmationModal(newTicketsData);
  }

  async function handleTitleDescriptionUpdate(event) {
    const button = event.target;
    const ticketId = button.dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    const modal = document.getElementById("task-detail-modal");
    const newTitle = modal.querySelector("#modal-edit-title").value;
    const newDescription = modal.querySelector("#modal-edit-description").value;
    const oldTitle = ticket.title || "";
    const oldDescription = ticket.description || "";

    if (newTitle === oldTitle && newDescription === oldDescription) {
      showToast("No changes detected.", "success");
      return;
    }

    const updates = {};
    const newLogEntries = [];
    const nowIso = new Date().toISOString();

    if (newTitle !== oldTitle) {
      updates.title = newTitle;
      newLogEntries.push({
        user: appData.currentUserEmail,
        timestamp: nowIso,
        field: "title",
        oldValue: oldTitle,
        newValue: newTitle,
      });
    }
    if (newDescription !== oldDescription) {
      updates.description = newDescription;
      newLogEntries.push({
        user: appData.currentUserEmail,
        timestamp: nowIso,
        field: "description",
        oldValue: oldDescription,
        newValue: newDescription,
      });
    }
    if (newLogEntries.length > 0) {
      updates.log = [
        ...(Array.isArray(ticket.log) ? ticket.log : []),
        ...newLogEntries,
      ];
    }

    button.textContent = "Updating...";
    button.disabled = true;

    const { error } = await supabaseClient
      .from("ticket")
      .update(updates)
      .eq("id", ticketId);

    button.textContent = "Update";
    button.disabled = false;

    if (error) {
      showToast("Save failed: " + error.message, "error");
    } else {
      showToast("Ticket updated!", "success");
      const actionsContainer = modal.querySelector(".modal-actions");
      if (actionsContainer) actionsContainer.style.display = "none";
    }
  }


  // REPLACE the existing executeBulkUpdate function.
  async function executeBulkUpdate(updates) {
    const modal = document.getElementById("bulk-update-modal");
    const confirmBtn = document.getElementById("confirm-bulk-update-btn");
    const originalBtnText = confirmBtn.textContent;
    confirmBtn.textContent = "Updating...";
    confirmBtn.disabled = true;

    const ticketIds = Array.from(selectedTickets);
    if (ticketIds.length === 0) {
      showToast("No tickets selected.", "error");
      return;
    }

    // --- START OF FIX ---
    // NEW: Convert string IDs from the form into numbers before sending them to the database.
    if (updates.projectId) {
      updates.projectId = parseInt(updates.projectId, 10);
    }
    // --- END OF FIX ---

    const nowIso = new Date().toISOString();
    let reason = null;

    // No popup required for status changes - just proceed with the update

    const payload = ticketIds.map((id) => {
      const ticket = appData.allTickets.find((t) => t.id == id); // Use == instead of === for type flexibility
      
      // Skip tickets that don't exist
      if (!ticket) {
        console.warn(`Ticket with ID ${id} not found in allTickets`);
        return null;
      }
      
      const ticketUpdates = { ...updates };

      if (
        ticketUpdates.assignee &&
        ticketUpdates.assignee !== ticket.assignee
      ) {
        ticketUpdates.assignedAt = nowIso;
      }
      if (ticketUpdates.status === "In Progress" && !ticket.startedAt) {
        ticketUpdates.startedAt = nowIso;
      }

      // Create a readable summary of the bulk update
      const fieldDisplayNames = {
        status: "Status",
        priority: "Priority", 
        assignee: "Assignee",
        requestedBy: "Requested By",
        projectId: "Project",
        type: "Type",
        assignedAt: "Assigned At",
        startedAt: "Started At",
        completedAt: "Completed At"
      };
      
      const updateSummary = Object.entries(ticketUpdates)
        .filter(([key, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => {
          const displayName = fieldDisplayNames[key] || key;
          return `${displayName}: ${value}`;
        })
        .join(", ");

      const newLogEntry = {
        user: appData.currentUserEmail,
        timestamp: nowIso,
        field: "bulk-update",
        oldValue: "multiple tickets",
        newValue: updateSummary || "no changes",
        reason: reason,
      };

      return {
        id: id,
        updates: { ...ticketUpdates, newLogEntry: newLogEntry },
      };
    });

    // Filter out null values (tickets that don't exist)
    const validPayload = payload.filter(item => item !== null);
    
    if (validPayload.length === 0) {
      showToast("No valid tickets found to update.", "error");
      confirmBtn.textContent = originalBtnText;
      confirmBtn.disabled = false;
      return;
    }

    const { data, error } = await window.supabaseClient.rpc("bulk_update_tickets", {
      updates_payload: validPayload,
    });

    confirmBtn.textContent = originalBtnText;
    confirmBtn.disabled = false;

    if (error) {
      showToast("Bulk update failed: " + error.message, "error");
    } else {
      showToast(`${validPayload.length} tickets updated successfully.`, "success");
      if (modal) modal.style.display = "none";
      exitBulkEditMode(true);
    }
  }

  // REPLACE the addModalEventListeners function
  function addModalEventListeners() {
    // Prevent duplicate event listeners
    if (document.body.hasAttribute('data-modal-listeners-added')) {
      console.log("Modal event listeners already added, skipping...");
      return;
    }
    
    // --- GENERIC CLOSE LOGIC WITH UNSAVED CHANGES CHECK ---
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", async (e) => {
        // MODIFICATION: Removed `e.target.classList.contains("modal-overlay")`
        if (
          e.target.classList.contains("modal-close-btn") ||
          e.target.classList.contains("close-button")
        ) {
          let shouldClose = true;

          if (modal.id === "task-detail-modal") {
            const dirtyDateFields = modal.querySelectorAll(
              '.editable-field-wrapper.is-dirty input[type="date"]'
            );
            if (dirtyDateFields.length > 0) {
              shouldClose = false;

              const listEl = document.getElementById("unsaved-changes-list");
              listEl.innerHTML = Array.from(dirtyDateFields)
                .map((input) => {
                  const fieldLabel = input
                    .closest(".sidebar-property-editable")
                    .querySelector(".prop-label").textContent;
                  const oldValue = input.dataset.oldValue
                    ? new Date(input.dataset.oldValue).toLocaleDateString()
                    : "empty";
                  const newValue = input.value
                    ? new Date(input.value).toLocaleDateString()
                    : "empty";
                  return `<li><strong>${fieldLabel}:</strong> ${oldValue} → ${newValue}</li>`;
                })
                .join("");

              const confirmModal =
                document.getElementById("unsaved-date-modal");
              confirmModal.style.display = "flex";

              document.getElementById("unsaved-date-yes").onclick =
                async () => {
                  const updatePromises = Array.from(dirtyDateFields).map(
                    (input) => handleUpdate({ target: input })
                  );
                  await Promise.all(updatePromises);
                  confirmModal.style.display = "none";
                  modal.style.display = "none";
                };
              document.getElementById("unsaved-date-no").onclick = () => {
                confirmModal.style.display = "none";
                modal.style.display = "none";
              };
            }
          }

          if (modal.id === "project-detail-modal" && shouldClose) {
            if (isProjectModalDirty()) {
              const userConfirmed = await confirmWithCustomModal(
                "Discard Changes?",
                "You have unsaved changes. If you close now, your edits will be lost."
              );
              if (!userConfirmed) {
                shouldClose = false;
              }
            }
          }

          if (shouldClose) {
            if (modal.id === "project-detail-modal") {
              initialProjectData = null;
            }
            
            // Clean up dropdown listeners if they exist
            if (modal._cleanupDropdowns && typeof modal._cleanupDropdowns === 'function') {
              modal._cleanupDropdowns();
              delete modal._cleanupDropdowns;
            }
            
            modal.style.display = "none";
          }
        }
      });
    });

    window.addEventListener("beforeunload", (e) => {
      if (isProjectModalDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    // Project modal event listeners are now handled dynamically in showAddProjectModal()
    const updateSelectedBtn = document.getElementById("update-selected-btn");
    if (updateSelectedBtn) {
      updateSelectedBtn.addEventListener("click", openBulkUpdateModal);
    }
    
    const confirmBulkUpdateBtn = document.getElementById("confirm-bulk-update-btn");
    if (confirmBulkUpdateBtn) {
      confirmBulkUpdateBtn.addEventListener("click", () => {
        const updates = {};
        const fields = {
          projectId: document.querySelector(
            "#bulk-update-project-container input"
          ).dataset.value,
          epic: document.getElementById("bulk-update-epic").value,
          requestedBy: document.getElementById("bulk-update-requestedBy").value,
          status: document.getElementById("bulk-update-status").value,
          priority: document.getElementById("bulk-update-priority").value,
        };
        for (const [key, value] of Object.entries(fields)) {
          if (value) updates[key] = value;
        }
        if (Object.keys(updates).length > 0) executeBulkUpdate(updates);
        else showToast("No changes were selected.", "error");
      });
    }
    
    document.querySelectorAll(".cancel-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".modal-overlay");
      });
    });

    const taskDetailModal = document.getElementById("task-detail-modal");
    if (taskDetailModal) {
      let originalTitle = "";
      let originalDescription = "";
      let isTypingDate = false;

      taskDetailModal.addEventListener("change", (e) => {
        if (
          e.target.type === "date" &&
          e.target.classList.contains("inline-editor")
        ) {
          if (!isTypingDate) {
            handleUpdate(e);
          }
          isTypingDate = false;
        }

        handleTableChange(e);
        if (e.target.classList.contains("subtask-checkbox")) {
          handleSubtaskToggle(e);
        }
      });
      taskDetailModal.addEventListener("focusin", handleTableFocusIn);
      taskDetailModal.addEventListener("focusout", handleTableFocusOut);

      taskDetailModal.addEventListener("keydown", (e) => {
        if (
          e.target.type === "date" &&
          e.target.classList.contains("inline-editor")
        ) {
          isTypingDate = true;
        }

        if (
          (e.key === "Enter" || e.key === "Tab") &&
          e.target.type === "date" &&
          e.target.classList.contains("inline-editor")
        ) {
          e.preventDefault();
          handleUpdate(e);
          isTypingDate = false;
          e.target.blur();
        }
      });

      taskDetailModal.addEventListener("keyup", (e) => {
        handleTableKeyUp(e);
        if (e.key === "Enter" && e.target.id === "new-subtask-input") {
          document.getElementById("add-subtask-btn").click();
        }
      });

      taskDetailModal.addEventListener("click", (e) => {
        handleTableClick(e);
        if (e.target.id === "update-title-desc-btn") {
          handleTitleDescriptionUpdate(e);
        }
        if (e.target.id === "cancel-title-desc-btn") {
          const titleEl = taskDetailModal.querySelector("#modal-edit-title");
          const descEl = taskDetailModal.querySelector(
            "#modal-edit-description"
          );
          titleEl.value = originalTitle;
          descEl.value = originalDescription;
          autoSizeTextarea(titleEl);
          autoSizeTextarea(descEl);
          taskDetailModal.querySelector(".modal-actions").style.display =
            "none";
        }
        if (e.target.id === "add-subtask-btn") {
          handleSubtaskAdd(e);
        }
        if (e.target.closest(".remove-subtask-btn")) {
          handleSubtaskRemove(e);
        }
        if (e.target.closest(".subtask-copy-icon")) {
          copySubtaskInfo(e);
        }
        if (e.target.closest(".remove-field-btn")) {
          handleRemoveField(e);
        }
      });

      taskDetailModal.addEventListener("input", (e) => {
        if (
          e.target.type === "date" &&
          e.target.classList.contains("inline-editor")
        ) {
          const wrapper = e.target.closest(".editable-field-wrapper");
          const oldValue = e.target.dataset.oldValue || "";
          const newValue = e.target.value || "";
          const oldDate = oldValue
            ? new Date(oldValue).toISOString().split("T")[0]
            : "";
          wrapper.classList.toggle("is-dirty", oldDate !== newValue);
        }

        if (
          e.target.matches(".modal-title-textarea, .modal-description-textarea")
        ) {
          autoSizeTextarea(e.target);
          const titleEl = taskDetailModal.querySelector("#modal-edit-title");
          const descEl = taskDetailModal.querySelector(
            "#modal-edit-description"
          );
          const actionsContainer =
            taskDetailModal.querySelector(".modal-actions");
          if (
            titleEl.value !== originalTitle ||
            descEl.value !== originalDescription
          ) {
            actionsContainer.style.display = "flex";
          } else {
            actionsContainer.style.display = "none";
          }
        }
      });

      const observer = new MutationObserver(() => {
        if (taskDetailModal.style.display === "flex") {
          const titleEl = taskDetailModal.querySelector("#modal-edit-title");
          const descEl = taskDetailModal.querySelector(
            "#modal-edit-description"
          );
          if (titleEl && descEl) {
            originalTitle = titleEl.value;
            originalDescription = descEl.value;
          }
        }
      });
      observer.observe(taskDetailModal, {
        attributes: true,
        attributeFilter: ["style"],
      });
    }
    
    // Mark that modal event listeners have been added
    document.body.setAttribute('data-modal-listeners-added', 'true');
    console.log("Modal event listeners added successfully");
  }

  function autoSizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  // ADD THIS ENTIRE NEW FUNCTION
  /**
   * Resets all general filter variables and their corresponding UI elements to default.
   * This ensures a clean state when switching between main views.
   */
  function resetFilters() {
    // Reset global state variables
    selectedProjectFilter = "all";
    selectedEpicFilter = "all";
    textSearchTerm = "";
    ticketNumberFilter = "";

    // Reset UI elements to match the state
    const projectSelect = document.getElementById("project-filter-select");
    if (projectSelect) projectSelect.value = "all";

    const epicSelect = document.getElementById("epic-filter-select");
    if (epicSelect) epicSelect.value = "all";

    const searchInput = document.getElementById("task-search-input");
    if (searchInput) searchInput.value = "";

    const ticketNumInput = document.getElementById("ticket-number-filter");
    if (ticketNumInput) ticketNumInput.value = "";

    // Hide the "Clear Search" button related to URL parameters
    const clearUrlFilterBtn = document.getElementById("clear-url-filter-btn");
    if (clearUrlFilterBtn) clearUrlFilterBtn.style.display = "none";
  }

  function activateView(
    view,
    {
      replaceHistory = false,
      updateHistory = true,
      preserveFilters = false,
    } = {}
  ) {
    if (!VIEW_ROUTE_MAP[view]) {
      console.warn("Attempted to activate unknown view:", view);
      return;
    }

    const isSwitchingView = currentView !== view;

    if (
      isSwitchingView &&
      !preserveFilters &&
      view !== "home" &&
      view !== "reconcile"
    ) {
      resetFilters();
    }

    if (isSwitchingView) {
      const quickAddBtn = document.getElementById("quick-add-btn");
      if (quickAddBtn) {
        quickAddBtn.addEventListener("click", () => openQuickAddOverlay());
      }

      const readmeBtn = document.getElementById("readme-btn");
      if (readmeBtn) {
        readmeBtn.addEventListener("click", showReadmeModal);
      }

      const addProjectBtn = document.getElementById("add-project-btn");
      if (addProjectBtn) {
        addProjectBtn.removeEventListener("click", showAddProjectModal);
        addProjectBtn.addEventListener("click", showAddProjectModal);
      }
    }

    currentView = view;
    currentPage = 1;
    reconcileCurrentPage = 1;

    document
      .querySelectorAll(".nav-panel .nav-btn")
      .forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`nav-${view}`);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    if (isBulkEditMode) {
      exitBulkEditMode(false);
    }

    applyFilterAndRender();

    const route = VIEW_ROUTE_MAP[view];
    const scriptUrlInputEl = document.getElementById("script-url");
    if (scriptUrlInputEl && route) {
      scriptUrlInputEl.value = route;
    }

    const shouldUpdateHistory =
      !suppressHistoryUpdate &&
      updateHistory &&
      route &&
      (isSwitchingView || replaceHistory);

    if (shouldUpdateHistory) {
      const state = { view };
      if (replaceHistory) {
        window.history.replaceState(state, "", route);
      } else {
        window.history.pushState(state, "", route);
      }
    }
  }

  function addNavListenersWithRetry(retryCount = 0) {
    const maxRetries = 5;
    const retryDelay = 100; // 100ms delay between retries
    
    // Try to add navigation listeners
    addNavListeners();
    
    // Check if elements were found
    const allTicketsButton = document.getElementById("nav-all");
    
    // If elements not found and we haven't exceeded max retries, try again
    if (!allTicketsButton && retryCount < maxRetries) {
      console.log(`Navigation elements not ready, retrying... (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => {
        addNavListenersWithRetry(retryCount + 1);
      }, retryDelay);
    } else if (!allTicketsButton) {
      console.error("Failed to initialize navigation after maximum retries");
    } else {
      console.log("Navigation listeners successfully initialized");
    }
  }

  function addNavListeners() {
    const navButtons = document.querySelectorAll(".nav-panel .nav-btn");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === "bulk-edit-btn" || btn.id === "readme-btn") {
          return;
        }

        const view = btn.id.replace("nav-", "");
        activateView(view);
      });
    });

    document
      .getElementById("readme-btn")
      .addEventListener("click", showReadmeModal);
  }

  function addBulkEditListeners() {
    document
      .getElementById("bulk-edit-btn")
      .addEventListener("click", enterBulkEditMode);
    document
      .getElementById("cancel-bulk-edit-btn")
      .addEventListener("click", () => exitBulkEditMode(true));
    document
      .getElementById("assign-selected-btn")
      .addEventListener("click", openAssigneeModal);
    document
      .getElementById("confirm-assign-btn")
      .addEventListener("click", async () => {
        const assignee = document.getElementById("assignee-select").value;
        if (!assignee) {
          showToast("Please select an assignee.", "error");
          return;
        }
        await executeBulkUpdate({ assignee: assignee });
        document.getElementById("assignee-modal").style.display = "none";
      });
  }

  function updateEpicFilterOptions(selectedProjectId) {
    const epicFilterSelect = document.getElementById("epic-filter-select");
    if (!epicFilterSelect) return;

    // Reset epic filter to "all" when project changes
    epicFilterSelect.value = "all";
    selectedEpicFilter = "all";

    if (selectedProjectId === "all") {
      // Show all epics when no specific project is selected
      epicFilterSelect.innerHTML =
        '<option value="all">All Epics</option>' +
        appData.epics
          .map(
            (e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`
          )
          .join("");
    } else {
      // Filter epics based on tickets that belong to the selected project
      const projectEpics = [
        ...new Set(
          appData.allTickets
            .filter(ticket => ticket.projectId == selectedProjectId && ticket.epic)
            .map(ticket => ticket.epic)
        )
      ].sort();

      if (projectEpics.length > 0) {
        epicFilterSelect.innerHTML =
          '<option value="all">All Epics</option>' +
          projectEpics
            .map(
              (e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`
            )
            .join("");
      } else {
        // If no epics found for this project, show "No epics available"
        epicFilterSelect.innerHTML = '<option value="all">No epics available</option>';
      }
    }
  }

  function addFilterListeners() {
    const statusSelect = document.getElementById("status-filter-select");
    const projectFilterSelect = document.getElementById(
      "project-filter-select"
    );
    const epicFilterSelect = document.getElementById("epic-filter-select");

    if (!statusSelect || !projectFilterSelect || !epicFilterSelect) {
      console.warn("Some filter elements not found, skipping filter listeners setup");
      return;
    }

    statusSelect.innerHTML = [
      "All Statuses",
      "Open",
      "In Progress",
      "On Hold",
      "Blocked",
      "Cancelled",
      "Rejected",
      "Completed",
    ]
      .map(
        (s) =>
          `<option value="${s === "All Statuses" ? "all" : s}">${s}</option>`
      )
      .join("");

    projectFilterSelect.innerHTML =
      '<option value="all">All Projects</option>' +
      appData.projects
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");

    epicFilterSelect.innerHTML =
      '<option value="all">All Epics</option>' +
      appData.epics
        .map(
          (e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`
        )
        .join("");

    // Populate assignee filter
    const assigneeFilterSelect = document.getElementById("assignee-filter-select");
    if (assigneeFilterSelect) {
      assigneeFilterSelect.innerHTML =
        '<option value="all">All Assignees</option>' +
        appData.teamMembers
          .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
          .join("");
    }

    // Populate incomplete member filter
    const incompleteMemberFilter = document.getElementById("incomplete-member-filter");
    if (incompleteMemberFilter) {
      incompleteMemberFilter.innerHTML =
        '<option value="all">All Members</option>' +
        appData.teamMembers
          .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
          .join("");
      // Default to current user
      incompleteMemberFilter.value = appData.currentUserId || "all";
      selectedIncompleteMemberFilter = appData.currentUserId || "all";
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        selectedStatus = e.target.value;
        applyFilterAndRender();
      });
    }
    const excludeDoneCheckbox = document.getElementById("exclude-done-checkbox");
    if (excludeDoneCheckbox) {
      excludeDoneCheckbox.addEventListener("change", (e) => {
        excludeDoneSettings[currentView] = e.target.checked;
        applyFilterAndRender();
      });
    }
    const taskSearchInput = document.getElementById("task-search-input");
    if (taskSearchInput) {
      taskSearchInput.addEventListener("input", (e) => {
        textSearchTerm = e.target.value;
        applyFilterAndRender();
      });
    }

    const ticketNumberFilterInput = document.getElementById("ticket-number-filter");
    if (ticketNumberFilterInput) {
      ticketNumberFilterInput.addEventListener("input", (e) => {
        ticketNumberFilter = e.target.value;
        applyFilterAndRender();
      });
    }

    if (projectFilterSelect) {
      projectFilterSelect.addEventListener("change", (e) => {
        selectedProjectFilter = e.target.value;
        
        // Update epic filter options based on selected project
        updateEpicFilterOptions(e.target.value);
        
        applyFilterAndRender();
      });
    }

    if (epicFilterSelect) {
      epicFilterSelect.addEventListener("change", (e) => {
        selectedEpicFilter = e.target.value;
        applyFilterAndRender();
      });
    }

    if (assigneeFilterSelect) {
      assigneeFilterSelect.addEventListener("change", (e) => {
        selectedAssigneeFilter = e.target.value;
        applyFilterAndRender();
      });
    }

    const reconcileExcludeDoneCheckbox = document.getElementById("reconcile-exclude-done");
    if (reconcileExcludeDoneCheckbox) {
      reconcileExcludeDoneCheckbox.addEventListener("change", (e) => {
        reconcileExcludeDone = e.target.checked;
        applyFilterAndRender();
      });
    }
    // ... at the end of the addFilterListeners function
    const reconcileUserSelect = document.getElementById(
      "reconcile-user-select"
    );
    // This check ensures we only populate it if the user is a lead
    if (appData.currentUserRole === "Lead") {
      const allUserNames = appData.teamMembers
        .map((member) => member.name)
        .sort();
      reconcileUserSelect.innerHTML = allUserNames
        .map(
          (name) =>
            `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
        )
        .join("");
      reconcileUserSelect.value = appData.currentUserName;
    }

    reconcileUserSelect.addEventListener("change", (e) => {
      reconcileSelectedUserName = e.target.value;
      // When changing user, reset page to 1
      reconcileCurrentPage = 1;
      applyFilterAndRender();
    });
  }
  function applyFilterAndRender() {
    const mainTableWrapper = document.querySelector(".table-wrapper");
    const reconcileWrapper = document.getElementById("reconcile-view-wrapper");
    const dashboardWrapper = document.getElementById("dashboard-view-wrapper");
    const actionsContainer = document.querySelector(".actions-container");

    // Get handles for the main action button groups
    const rightActions = document.querySelector(".right-actions");
    const defaultFilterBtn = document.querySelector(
      ".left-actions .dropdown-container"
    );
    const reconcileFilters = document.getElementById("reconcile-filters");
    const mainPagination = document.getElementById("pagination-controls");

    // Hide all view wrappers and the main action bar initially
    mainTableWrapper.style.display = "none";
    document.getElementById("simple-incomplete-wrapper").style.display = "none";
    document.getElementById("projects-view-wrapper").style.display = "none";
    const integratedFilters = document.getElementById("integrated-filters");
    if (integratedFilters) integratedFilters.style.display = "none";
    reconcileWrapper.style.display = "none";
    dashboardWrapper.style.display = "none";
    actionsContainer.style.display = "none";
    document.body.classList.remove("project-view");

    // Home View Logic
    if (currentView === "home") {
      dashboardWrapper.style.display = "flex";
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        console.log('Rendering dashboard with delay...');
      renderDashboard();
      }, 50);
      return;
    }

    // Show the main actions container for all other views
    actionsContainer.style.display = "flex";

    // Hide specific filters/pagination by default
    defaultFilterBtn.style.display = "none";
    reconcileFilters.style.display = "none";
    mainPagination.style.display = "none";

    if (currentView === "incomplete") {
      // --- Simple Incomplete View ---
      document.getElementById("simple-incomplete-wrapper").style.display = "block";
      rightActions.style.display = "none"; // Hide main action buttons for incomplete view
      
      // Handle simple incomplete rendering
      renderSimpleIncompleteView();
      return; // Exit early for incomplete view
    } else if (currentView === "projects") {
      // --- Projects View ---
      document.getElementById("projects-view-wrapper").style.display = "block";
      rightActions.style.display = "none"; // Hide main action buttons for projects view
      
      // Handle projects rendering
      renderProjectsView();
      return; // Exit early for projects view
    } else if (currentView === "reconcile") {
      // --- Reconcile View ---
      reconcileWrapper.style.display = "block";
      reconcileFilters.style.display = "flex";

      // --- START OF MODIFICATION ---
      const userFilterContainer = document.getElementById(
        "reconcile-user-filter-container"
      );
      if (appData.currentUserRole === "Lead") {
        userFilterContainer.style.display = "flex";
      } else {
        userFilterContainer.style.display = "none";
        // Ensure non-leads can only see their own data
        reconcileSelectedUserName = appData.currentUserName;
      }

      let filteredHrs = appData.allReconcileHrs.filter(
        (r) => r.clockify_member === reconcileSelectedUserName
      );
      // --- END OF MODIFICATION ---

      if (reconcileExcludeDone) {
        filteredHrs = filteredHrs.filter(
          (r) => !r.ticketNumber && !r.is_excluded
        );
      }
      appData.reconcileHrs = filteredHrs;
      renderReconcileView(appData.reconcileHrs);

      // Hide the main filter and all right-side action buttons
      defaultFilterBtn.style.display = "none";
      rightActions.style.display = "none";
    } else {
      // --- All Other Ticket Views ---
      mainTableWrapper.style.display = "block";
      // Hide the entire actions container since filters are now integrated
      actionsContainer.style.display = "none";

      // Show integrated filters for all standard ticket views
      const integratedFilters = document.getElementById("integrated-filters");
      if (integratedFilters) {
        integratedFilters.style.display = "block";
      }
      
      // Show/hide assignee filter based on current view
      const assigneeFilterSelect = document.getElementById("assignee-filter-select");
      if (assigneeFilterSelect) {
        if (currentView === "all") {
          assigneeFilterSelect.style.display = "block";
        } else {
          assigneeFilterSelect.style.display = "none";
          // Reset assignee filter when not on "all" view
          selectedAssigneeFilter = "all";
          assigneeFilterSelect.value = "all";
        }
      }
      
      // Show/hide Exclude Done checkbox based on current view and update its state
      const excludeDoneCheckbox = document.getElementById("exclude-done-checkbox");
      const excludeDoneLabel = excludeDoneCheckbox?.parentElement;
      if (excludeDoneCheckbox && excludeDoneLabel) {
        // Always show the checkbox for all views
        excludeDoneLabel.style.display = "block";
        // Set checkbox state to the current tab's setting
        excludeDoneCheckbox.checked = excludeDoneSettings[currentView];
      }

      let baseTickets;
      switch (currentView) {
        case "my-ticket":
          baseTickets = appData.allTickets.filter(
            (t) => t.assigneeId == appData.currentUserId
          );
          if (excludeDoneSettings[currentView]) {
            baseTickets = baseTickets.filter(
              (t) => !["Completed", "Rejected", "Cancelled"].includes(t.status)
            );
          }
          if (selectedStatus !== "all") {
            baseTickets = baseTickets.filter(
              (t) => t.status === selectedStatus
            );
          }
          break;
        case "unassigned":
          baseTickets = appData.allTickets.filter((t) => t.assigneeId == null);
          if (excludeDoneSettings[currentView]) {
            baseTickets = baseTickets.filter(
              (t) => !["Completed", "Rejected", "Cancelled"].includes(t.status)
            );
          }
          break;
        case "critical":
          // Filter tickets that are Urgent or High priority
          // AND assigned to the current user
          baseTickets = appData.allTickets.filter((t) => {
            const isHighPriority = t.priority === "Urgent" || t.priority === "High";
            const isAssignedToCurrentUser = t.assigneeId == appData.currentUserId;
            return isHighPriority && isAssignedToCurrentUser;
          });
          // Apply excludeDone filter if enabled for this tab
          if (excludeDoneSettings[currentView]) {
            baseTickets = baseTickets.filter(
              (t) => !["Completed", "Rejected", "Cancelled"].includes(t.status)
            );
          }
          break;
        case "stalled":
          // Filter tickets that are On Hold or Blocked
          // AND assigned to the current user
          baseTickets = appData.allTickets.filter((t) => {
            const isStalledStatus = t.status === "On Hold" || t.status === "Blocked";
            const isAssignedToCurrentUser = t.assigneeId == appData.currentUserId;
            return isStalledStatus && isAssignedToCurrentUser;
          });
          // Apply excludeDone filter if enabled for this tab
          if (excludeDoneSettings[currentView]) {
            baseTickets = baseTickets.filter(
              (t) => !["Completed", "Rejected", "Cancelled"].includes(t.status)
            );
          }
          break;
        default:
          baseTickets = [...appData.allTickets];
          if (excludeDoneSettings[currentView]) {
            baseTickets = baseTickets.filter(
              (t) => !["Completed", "Rejected", "Cancelled"].includes(t.status)
            );
          }
          break;
      }

      let finalFilteredTickets = baseTickets;
      if (selectedProjectFilter !== "all") {
        finalFilteredTickets = finalFilteredTickets.filter(
          (t) => String(t.projectId) == selectedProjectFilter
        );
      }
      if (selectedEpicFilter !== "all") {
        finalFilteredTickets = finalFilteredTickets.filter(
          (t) => String(t.epic || "") === selectedEpicFilter
        );
      }
      if (selectedAssigneeFilter !== "all") {
        finalFilteredTickets = finalFilteredTickets.filter(
          (t) => String(t.assigneeId || "") === selectedAssigneeFilter
        );
      }
      if (ticketNumberFilter) {
        const numericFilter = ticketNumberFilter
          .toLowerCase()
          .replace("hrb-", "");
        finalFilteredTickets = finalFilteredTickets.filter((t) =>
          String(t.id || "")
            .toLowerCase()
            .includes(numericFilter)
        );
      }
      if (textSearchTerm) {
        const lower = textSearchTerm.toLowerCase();
        finalFilteredTickets = finalFilteredTickets.filter(
          (t) =>
            String(t.title || "")
              .toLowerCase()
              .includes(lower) ||
            String(t.description || "")
              .toLowerCase()
              .includes(lower)
        );
      }

      // Apply custom sorting if set, otherwise use default priority + ID sort
      if (currentSort.field && currentSort.direction) {
        finalFilteredTickets = sortTickets(finalFilteredTickets, currentSort.field, currentSort.direction);
      } else {
        // Default sort by priority (Urgent, High, Medium, Low) then by ID descending
        finalFilteredTickets.sort((a, b) => {
          const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
          const aPriority = priorityOrder[a.priority] ?? 4; // Unknown priorities go last
          const bPriority = priorityOrder[b.priority] ?? 4;
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority; // Sort by priority first
          }
          return b.id - a.id; // Then by ID descending (newest first)
        });
      }

      appData.tickets = finalFilteredTickets;
      if (
        appData.tickets.length > 0 &&
        currentPage > Math.ceil(appData.tickets.length / ticketsPerPage)
      ) {
        currentPage = 1;
      }
      renderPage(currentPage);
    }
    updateNavBadgeCounts();
  }

  // Track if this is the first time loading the incomplete view
  let isFirstIncompleteLoad = true;

  // Projects view rendering function
  function renderProjectsView() {
    const layout = document.getElementById("projects-view-wrapper");
    const railList = document.getElementById("jira-project-list");
    const detailSection = document.getElementById("jira-project-detail");
    const ticketBody = document.getElementById("jira-ticket-table-body");
    const emptyState = document.getElementById("jira-ticket-empty");
    const ticketCount = document.getElementById("jira-ticket-count");

    if (!layout || !railList || !detailSection || !ticketBody || !emptyState || !ticketCount) {
      console.error("Projects view markup missing required containers");
      return;
    }

    layout.style.display = "grid";

    if (!appData.projects || appData.projects.length === 0) {
      railList.innerHTML =
        '<div class="jira-empty-state">No projects available yet. Use the "+" button to add one.</div>';
      detailSection.style.display = "none";
      ticketBody.innerHTML = "";
      ticketCount.textContent = "";
      emptyState.style.display = "block";
      emptyState.textContent = "Create your first project to get started.";
      return;
    }

    projectStatsCache = appData.projects.map((project) => {
      const tickets = appData.allTickets.filter((ticket) => ticket.projectId == project.id);
      const completedTickets = tickets.filter((ticket) => ticket.status === "Completed").length;
      const inProgressTickets = tickets.filter((ticket) => ticket.status === "In Progress").length;

      return {
        id: String(project.id),
        raw: project,
        totalTickets: tickets.length,
        completedTickets,
        inProgressTickets,
        completionRate:
          tickets.length > 0
            ? Math.round((completedTickets / tickets.length) * 100)
            : 0,
      };
    });

    projectStatsCache.sort((a, b) =>
      (a.raw.projectName || "").localeCompare(b.raw.projectName || "")
    );

    if (
      !currentProjectId ||
      !projectStatsCache.some((item) => item.id === String(currentProjectId))
    ) {
      currentProjectId = projectStatsCache[0].id;
    } else {
      currentProjectId = String(currentProjectId);
    }

    renderProjectRail();
    renderProjectDetailSection();
    renderProjectTicketsSection();
  }

  function renderProjectRail() {
    const railList = document.getElementById("jira-project-list");
    const searchInput = document.getElementById("jira-project-search");
    const clearBtn = document.getElementById("jira-project-search-clear");
    if (!railList) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const filteredProjects = projectStatsCache.filter(({ raw }) => {
      if (!query) return true;
      const name = raw.projectName || "";
      return name.toLowerCase().includes(query);
    });

    railList.innerHTML = filteredProjects
      .map((project) => {
        const projectName = escapeHtml(project.raw.projectName || "Untitled project");
        const isActive = project.id === String(currentProjectId);
        return `
          <button class="jira-project-chip ${isActive ? "jira-project-chip--active" : ""}" data-project-id="${project.id}">
            <span>${projectName}</span>
            <span>${project.totalTickets}</span>
          </button>
        `;
      })
      .join("");

    railList.querySelectorAll("[data-project-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const projectId = button.getAttribute("data-project-id");
        if (!projectId || projectId === currentProjectId) return;
        currentProjectId = projectId;
        renderProjectRail();
        renderProjectDetailSection();
        renderProjectTicketsSection();
      });
    });

    if (filteredProjects.length === 0) {
      return;
    }

    if (searchInput && !searchInput.dataset.listenerAttached) {
      searchInput.addEventListener("input", () => {
        renderProjectRail();
        const firstVisible = railList.querySelector("[data-project-id]");
        if (firstVisible && (!currentProjectId || !railList.querySelector(`[data-project-id="${currentProjectId}"]`))) {
          const projectId = firstVisible.getAttribute("data-project-id");
          if (projectId) {
            currentProjectId = projectId;
            renderProjectDetailSection();
            renderProjectTicketsSection();
            renderProjectRail();
          }
        }
      });
      searchInput.dataset.listenerAttached = "true";
    }

    if (clearBtn && !clearBtn.dataset.listenerAttached) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          renderProjectRail();
        }
      });
      clearBtn.dataset.listenerAttached = "true";
    }

    const emptyState = document.getElementById("jira-ticket-empty");
    const detailSection = document.getElementById("jira-project-detail");
    if (filteredProjects.length === 0) {
      if (detailSection) detailSection.style.display = "none";
      if (emptyState) {
        emptyState.style.display = "block";
        emptyState.textContent = "No projects match your search.";
      }
    } else {
      if (emptyState) emptyState.style.display = "none";
    }
  }

  function renderProjectDetailSection() {
    const detailSection = document.getElementById("jira-project-detail");
    const nameEl = document.getElementById("jira-project-name");
    const ownerEl = document.getElementById("jira-project-owner");
    const updatedEl = document.getElementById("jira-project-updated");
    const descriptionEl = document.getElementById("jira-project-description");
    const statsContainer = document.getElementById("jira-project-stats");

    if (!detailSection || !nameEl || !ownerEl || !updatedEl || !descriptionEl || !statsContainer) {
      return;
    }

    const projectEntry = projectStatsCache.find((item) => item.id === String(currentProjectId));
    if (!projectEntry) {
      detailSection.style.display = "none";
      return;
    }

    const project = projectEntry.raw;
    detailSection.style.display = "grid";

    nameEl.textContent = project.projectName || "Untitled project";
    ownerEl.textContent = project.projectOwner
      ? `Owner: ${project.projectOwner}`
      : "Owner: Unassigned";

    const updatedLabel = formatProjectUpdated(project);
    updatedEl.textContent = updatedLabel;

    const description = project.description && project.description.trim().length
      ? project.description.trim()
      : "No description provided.";
    descriptionEl.textContent = description;

    statsContainer.innerHTML = `
      <div class="jira-project-stat">
        <span>Total issues</span>
        <span>${projectEntry.totalTickets}</span>
      </div>
      <div class="jira-project-stat">
        <span>In progress</span>
        <span>${projectEntry.inProgressTickets}</span>
      </div>
      <div class="jira-project-stat">
        <span>Completed</span>
        <span>${projectEntry.completedTickets}</span>
      </div>
      <div class="jira-project-stat">
        <span>Completion</span>
        <span>${projectEntry.completionRate}%</span>
      </div>
    `;

    const editBtn = document.getElementById("jira-edit-project");
    const deleteBtn = document.getElementById("jira-delete-project");
    if (editBtn) {
      editBtn.onclick = () => editProject(project.id);
    }
    if (deleteBtn) {
      deleteBtn.onclick = () => deleteProject(project.id);
    }
  }

  function renderProjectTicketsSection() {
    const ticketBody = document.getElementById("jira-ticket-table-body");
    const emptyState = document.getElementById("jira-ticket-empty");
    const ticketCount = document.getElementById("jira-ticket-count");
    if (!ticketBody || !emptyState || !ticketCount) return;

    const tickets = appData.allTickets
      .filter((ticket) => String(ticket.projectId) === String(currentProjectId));

    ticketCount.textContent =
      tickets.length === 1 ? "1 issue" : `${tickets.length} issues`;

    if (tickets.length === 0) {
      ticketBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    tickets.sort((a, b) => {
      const aDate = ticketUpdatedAt(a);
      const bDate = ticketUpdatedAt(b);
      return bDate - aDate;
    });

    ticketBody.innerHTML = tickets
      .map((ticket) => {
        const summary = escapeHtml(ticket.title || "Untitled issue");
        const type = escapeHtml(ticket.type || "Task");
        const status = escapeHtml(ticket.status || "Open");
        const assignee = escapeHtml(findAssigneeName(ticket.assigneeId) || "Unassigned");
        const updated = escapeHtml(formatTicketUpdatedLabel(ticket));
        return `
          <tr data-ticket-id="${ticket.id}">
            <td class="jira-ticket-key">HRB-${ticket.id}</td>
            <td>${summary}</td>
            <td>${type}</td>
            <td><span class="jira-ticket-status">${status}</span></td>
            <td>${assignee}</td>
            <td>${updated}</td>
          </tr>
        `;
      })
      .join("");

    ticketBody.querySelectorAll("tr[data-ticket-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const ticketId = row.getAttribute("data-ticket-id");
        if (ticketId) {
          showTaskDetailModal(ticketId);
        }
      });
    });
  }

  function showProjectTickets(projectId) {
    if (!projectId) return;
    currentProjectId = String(projectId);
    renderProjectRail();
    renderProjectDetailSection();
    renderProjectTicketsSection();
  }

  function findAssigneeName(assigneeId) {
    if (!assigneeId) return "";
    const member = appData.teamMembers?.find((m) => m.id == assigneeId);
    return member?.name || "";
  }

  function ticketUpdatedAt(ticket) {
    const candidates = [
      ticket.updatedAt,
      ticket.updated_at,
      ticket.completedAt,
      ticket.completed_at,
      ticket.startedAt,
      ticket.started_at,
      ticket.assignedAt,
      ticket.assigned_at,
      ticket.createdAt,
      ticket.created_at,
    ];

    for (const value of candidates) {
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    return 0;
  }

  function formatTicketUpdatedLabel(ticket) {
    const timestamp = ticketUpdatedAt(ticket);
    if (!timestamp) return "--";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    const iso = date.toISOString().slice(0, 10);
    return formatDateForUIDisplay(iso) || "--";
  }

  function formatProjectUpdated(project) {
    const candidates = [
      project.updated_at,
      project.updatedAt,
      project.modified_at,
      project.modifiedAt,
      project.created_at,
      project.createdAt,
    ];

    for (const value of candidates) {
      if (!value) continue;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) continue;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays <= 0) return "Updated today";
      if (diffDays === 1) return "Updated yesterday";
      if (diffDays < 7) return `Updated ${diffDays} days ago`;

      const iso = date.toISOString().slice(0, 10);
      const formatted = formatDateForUIDisplay(iso);
      return formatted ? `Updated ${formatted}` : "";
    }

    return "";
  }

  // Edit project function
  function editProject(projectId) {
    const project = appData.projects.find(p => p.id == projectId);
    if (!project) return;

    // Open the existing project detail modal
    showProjectDetailModal(projectId);
  }

  // Delete project function
  async function deleteProject(projectId) {
    const project = appData.projects.find(p => p.id == projectId);
    if (!project) return;

    // Check if project has tickets
    const projectTickets = appData.allTickets.filter(ticket => ticket.projectId == projectId);
    if (projectTickets.length > 0) {
      showToast(`Cannot delete project "${project.projectName}" - it has ${projectTickets.length} tickets. Please reassign or delete tickets first.`, "error");
      return;
    }

    // Confirm deletion
    if (confirm(`Are you sure you want to delete project "${project.projectName}"?`)) {
      try {
        // Delete from database
        const { error } = await window.supabaseClient
          .from("project")
          .delete()
          .eq("id", projectId);
          
        if (error) {
          showToast(`Error deleting project: ${error.message}`, "error");
          return;
        }
        
        // Remove from local data
        appData.projects = appData.projects.filter(p => p.id != projectId);
        
        // Re-render projects view
        renderProjectsView();
        
        showToast(`Project "${project.projectName}" deleted successfully`, "success");
        
      } catch (error) {
        console.error("Error deleting project:", error);
        showToast("Error deleting project. Please try again.", "error");
      }
    }
  }

  // Simple rendering function for incomplete tickets
  function renderSimpleIncompleteView() {
    // Always populate member filter FIRST to ensure proper setup
    populateSimpleMemberFilter();

    // Filter tickets with incomplete data
    let incompleteTickets = appData.allTickets.filter((t) => {
      const warnings = getTicketWarnings(t);
      return warnings.length > 0;
    });

    // Apply member filter (get value AFTER population)
    const memberFilterElement = document.getElementById("simple-member-filter");
    const selectedMember = memberFilterElement?.value || "all";
    console.log("Member filter value:", selectedMember, "Total incomplete tickets:", incompleteTickets.length);
    
    if (selectedMember !== "all") {
      console.log("Filtering tickets for assigneeId:", selectedMember);
      const beforeFilter = incompleteTickets.length;
      incompleteTickets = incompleteTickets.filter(t => {
        console.log(`Ticket ${t.id}: assigneeId = ${t.assigneeId}, matches filter: ${t.assigneeId == selectedMember}`);
        return t.assigneeId == selectedMember;
      });
      console.log(`After member filter: ${incompleteTickets.length} tickets (was ${beforeFilter})`);
    }

    // Update count
    document.getElementById("simple-incomplete-count").textContent = `${incompleteTickets.length} tickets`;

    // Render table
    renderSimpleIncompleteTable(incompleteTickets);
  }

  function populateSimpleMemberFilter() {
    const memberFilter = document.getElementById("simple-member-filter");
    if (!memberFilter) return;

    // Store the current selection before repopulating
    const currentSelection = memberFilter.value;

    memberFilter.innerHTML = '<option value="all">All Members</option>';
    appData.teamMembers.forEach(member => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.name;
      memberFilter.appendChild(option);
    });

    // Set the default selection
    if (isFirstIncompleteLoad && appData.currentUserId) {
      // First time loading - default to current logged-in user
      memberFilter.value = appData.currentUserId;
      isFirstIncompleteLoad = false;
      console.log("First load: Setting default member filter to current user:", appData.currentUserId);
    } else if (currentSelection && currentSelection !== "") {
      // Restore previous selection
      memberFilter.value = currentSelection;
      console.log("Restoring previous selection:", currentSelection);
    }
  }

  function renderSimpleIncompleteTable(tickets) {
    const tableBody = document.querySelector("#simple-incomplete-table tbody");
    tableBody.innerHTML = "";

    if (tickets.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">
            No incomplete tickets found.
          </td>
        </tr>
      `;
      return;
    }

    tickets.forEach(ticket => {
      const row = tableBody.insertRow();
      
      // Use the same logic as getTicketWarnings for consistency
      const warnings = getTicketWarnings(ticket);
      const errorCount = warnings.length;

      // Helper to check if field is missing - use warnings to determine this
      const isMissing = (field) => {
        return warnings.some(warning => warning.field === field);
      };

      // Get options for dropdowns

      row.innerHTML = `
        <td><span class="simple-ticket-id">HRB-${ticket.id}</span></td>
        <td>
          <div class="simple-task-title">${escapeHtml(ticket.title || '')}</div>
          ${errorCount > 0 ? `<div class="simple-error-count">${errorCount} errors</div>` : ''}
          ${ticket.status ? `<div class="simple-status-badge status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}">${ticket.status}</div>` : ''}
        </td>
        <td>
          <input type="date" value="${ticket.createdAt ? new Date(ticket.createdAt).toISOString().split('T')[0] : ''}" 
                 class="simple-input ${isMissing('createdAt') ? 'missing' : ''}"
                 data-field="createdAt" data-ticket-id="${ticket.id}">
        </td>
        <td>
          <input type="date" value="${ticket.assignedAt ? new Date(ticket.assignedAt).toISOString().split('T')[0] : ''}" 
                 class="simple-input ${isMissing('assignedAt') ? 'missing' : ''}"
                 data-field="assignedAt" data-ticket-id="${ticket.id}">
        </td>
        <td>
          <input type="date" value="${ticket.startedAt ? new Date(ticket.startedAt).toISOString().split('T')[0] : ''}" 
                 class="simple-input ${isMissing('startedAt') ? 'missing' : ''}"
                 data-field="startedAt" data-ticket-id="${ticket.id}">
        </td>
        <td>
          <input type="date" value="${ticket.completedAt ? new Date(ticket.completedAt).toISOString().split('T')[0] : ''}" 
                 class="simple-input ${isMissing('completedAt') ? 'missing' : ''}"
                 data-field="completedAt" data-ticket-id="${ticket.id}">
        </td>
      `;
    });

    // Add event listeners
    addSimpleIncompleteEventListeners();
    
  }

  function addSimpleIncompleteEventListeners() {
    // Member filter change
    const memberFilter = document.getElementById("simple-member-filter");
    if (memberFilter) {
      // Remove any existing listeners
      memberFilter.removeEventListener("change", renderSimpleIncompleteView);
      
      // Add new listener with explicit function
      memberFilter.addEventListener("change", function(e) {
        console.log("Member filter changed to:", e.target.value);
        renderSimpleIncompleteView();
      });
    } else {
      console.error("simple-member-filter element not found!");
    }

    // Input field changes
    document.querySelectorAll("#simple-incomplete-table .simple-input, #simple-incomplete-table .simple-select").forEach(input => {
      input.addEventListener("change", async (e) => {
        const ticketId = e.target.dataset.ticketId;
        const field = e.target.dataset.field;
        const ticket = appData.allTickets.find(t => t.id == ticketId);
        const oldValue = ticket[field];
        let newValue = e.target.value === "" ? null : e.target.value;
        
        if (field === "assigneeId" && newValue && newValue !== "") {
          newValue = parseInt(newValue, 10);
        }
        
        if (ticket && field && oldValue !== newValue) {
          // Show saving indicator
          e.target.style.borderColor = "#f59e0b";
          e.target.style.background = "rgba(245, 158, 11, 0.1)";
          
          try {
            // Save to database
            const { error } = await window.supabaseClient
              .from("ticket")
              .update({ [field]: newValue })
              .eq("id", ticketId);
              
            if (error) {
              throw error;
            }
            
            // Update local data
            ticket[field] = newValue;
            
            // Show success indicator
            e.target.style.borderColor = "#10b981";
            e.target.style.background = "rgba(16, 185, 129, 0.1)";
            
            // Create and show success toast
            showToast(`${field} updated successfully`, "success");
            
            // Reset styling after 2 seconds
            setTimeout(() => {
              e.target.style.borderColor = "";
              e.target.style.background = "";
            }, 2000);
            
          } catch (error) {
            console.error("Failed to save:", error);
            
            // Show error indicator
            e.target.style.borderColor = "#ef4444";
            e.target.style.background = "rgba(239, 68, 68, 0.1)";
            
            // Revert the value
            e.target.value = oldValue || "";
            
            showToast(`Failed to update ${field}`, "error");
            
            // Reset styling after 3 seconds
            setTimeout(() => {
              e.target.style.borderColor = "";
              e.target.style.background = "";
            }, 3000);
          }
          
          // Update styling based on whether field is still missing using getTicketWarnings
          const updatedWarnings = getTicketWarnings(ticket);
          const fieldHasWarning = updatedWarnings.some(warning => warning.field === field);

          if (fieldHasWarning) {
            e.target.classList.add('missing');
          } else {
            e.target.classList.remove('missing');
          }

          // Re-render to update error counts
          setTimeout(() => renderSimpleIncompleteView(), 100);
        }
      });
    });
  }

  function updateSectionHeader() {
    // Section header has been removed - this function is now empty
    // but kept for compatibility with existing code that might call it
  }

  function renderPage(page) {
    if (!tableWrapper) return; // Safety check
    const scrollPosition = tableWrapper.scrollTop; // Store position
    const tableHead = document.querySelector("table thead tr");
    const tableBody = document.querySelector("table tbody");

    console.log("🔍 renderPage called with currentView:", currentView); // Debug log

    // Update section header
    updateSectionHeader();

    // Define columns for standard ticket views (incomplete has its own separate rendering)
    const columns = isBulkEditMode
      ? ["", "ID", "Task", "Type", "Priority", "Status", "Requested By", "Assignee", ""]
      : ["ID", "Task", "Type", "Priority", "Status", "Requested By", "Assignee", ""];
    
    // Define sortable columns (exclude checkbox and actions columns)
    const sortableColumns = isBulkEditMode
      ? ["id", "title", "type", "priority", "status", "requestedBy", "assigneeId"]
      : ["id", "title", "type", "priority", "status", "requestedBy", "assigneeId"];
    
    tableHead.innerHTML = columns
      .map((h, index) => {
        if (index === 0 && isBulkEditMode) {
          return '<th class="checkbox-cell"><input type="checkbox" id="select-all-checkbox" title="Select all on this page"></th>';
        }
        if (index === columns.length - 1) {
          return `<th>${h}</th>`; // Actions column - not sortable
        }
        
        const sortKey = sortableColumns[index - (isBulkEditMode ? 1 : 0)];
        const currentSort = getCurrentSortState();
        const sortClass = currentSort.field === sortKey ? `sort-${currentSort.direction}` : 'sort-reset';
        
        return `<th class="sortable-header ${sortClass}" data-sort-field="${sortKey}">
          ${h}
          <span class="sort-indicator"></span>
        </th>`;
      })
      .join("");
    
    // Remove incomplete view styling (incomplete view has its own table now)
    const table = document.querySelector('table');
    table.classList.remove('incomplete-view-table');

    tableBody.innerHTML = "";
    const paginatedTickets = appData.tickets.slice(
      (page - 1) * ticketsPerPage,
      page * ticketsPerPage
    );

    if (paginatedTickets.length === 0) {
      // Calculate column count for standard ticket views
      const baseColCount = 8; // ID, Task, Type, Priority, Status, Requested By, Assignee, Actions
      const colCount = isBulkEditMode ? baseColCount + 1 : baseColCount;
      tableBody.innerHTML = `
        <tr>
          <td colspan="${colCount}" class="empty-state">
            <div class="empty-state-content">
              <div class="empty-state-icon">
                <i class="fas fa-search"></i>
              </div>
              <h3>No tickets found</h3>
              <p>Try adjusting your filters or search terms to find what you're looking for.</p>
            </div>
          </td>
        </tr>
      `;
      updatePaginationControls(page, 0);
      return;
    }


    // Standard table view for other views
    paginatedTickets.forEach((ticket) => {
      const colCount = isBulkEditMode ? 9 : 8;

      const row = tableBody.insertRow();
      row.id = `ticket-row-${ticket.id}`;

      let safeTitle = escapeHtml(ticket.title || "");
      let safeDescription = escapeHtml(ticket.description || "");
      if (textSearchTerm) {
        const regex = new RegExp(textSearchTerm, "gi");
        safeTitle = safeTitle.replace(
          regex,
          (match) => `<mark>${match}</mark>`
        );
        safeDescription = safeDescription.replace(
          regex,
          (match) => `<mark>${match}</mark>`
        );
      }

      const warnings = getTicketWarnings(ticket);
      const warningBadgeHtml =
        warnings.length > 0
          ? `<div class="ticket-warning"><i class="fas fa-exclamation-triangle"></i><span>Incomplete Data</span></div>`
          : "";
      const ageInfo = formatTicketAge(ticket.createdAt);
      const subtasks = ticket.subtask || [];
      const totalSubtasks = subtasks.length;
      let subtaskCountHtml = "";
      if (totalSubtasks > 0) {
        const completedSubtasks = subtasks.filter((st) => st.done).length;
        subtaskCountHtml = `<span style="color: var(--border-color); margin: 0 8px;">|</span><div class="ticket-age"><i class="fas fa-check-square" style="font-size: 0.8rem;"></i><span>${completedSubtasks}/${totalSubtasks}</span></div>`;
      }

      // Generate row content based on view type
      let rowContent;
      // Standard view
      rowContent = `
            ${
              isBulkEditMode
                ? `<td class="checkbox-cell"><input type="checkbox" class="ticket-checkbox" data-id="${
                    ticket.id
                  }" ${
                    selectedTickets.has(String(ticket.id)) ? "checked" : ""
                  }></td>`
                : ""
            }
            <td data-label="ID"><div class="id-container"><i class="fas fa-copy copy-icon" data-ticket-id="${
              ticket.id
            }" title="Copy summary"></i><span>HRB-${
        ticket.id || ""
      }</span></div></td>
            <td data-label="Task"><div class="task-content"><strong>${safeTitle}</strong><br><small style="color: var(--text-secondary);">${safeDescription}</small>
            <div style="display: flex; align-items: center; margin-top: 8px;">
            <div style="display:flex; align-items:center; margin-top:8px;">
   <div class="ticket-age ${ageInfo.isOverdue ? "overdue" : ""}">
     <i class="far fa-clock"></i><span>${ageInfo.text}</span>
   </div>
   ${warningBadgeHtml}
   ${subtaskCountHtml}
 </div></div></td>
            <td data-label="Type">${createTypeTag(ticket.type)}</td>
            <td data-label="Priority">${createTagEditor(
              ["Urgent", "High", "Medium", "Low"],
              ticket.priority,
              ticket.id,
              "priority"
            )}</td>
            <td data-label="Status">${createTagEditor(
              getStatusTransitionOptions(ticket.status),
              ticket.status,
              ticket.id,
              "status"
            )}</td>
            <td data-label="Requested By">${createSearchableDropdown(
              appData.users.map((u) => ({ value: u, text: u })),
              ticket.requestedBy,
              ticket.id,
              "requestedBy"
            )}</td>
            <td data-label="Assignee">${createSearchableDropdown(
              appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
              ticket.assigneeId,
              ticket.id,
              "assigneeId"
            )}</td>
            <td data-label=""></td>
        `;
      
      row.innerHTML = rowContent;
    });

    addTableEventListeners();
    updatePaginationControls(page, appData.tickets.length);
    tableWrapper.scrollTop = scrollPosition; // <-- ADD THIS LINE to restore position
  }

  function showToast(message, type = "success") {
    const existingToast = document.querySelector(".toast");
    if (existingToast) document.body.removeChild(existingToast);

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.className = toast.className.replace("show", "");
      setTimeout(() => {
        // FIX: Only try to remove the toast if it's still a child of the body.
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 3000);
  }

  async function sendDiscordNotificationViaApi(insertedTickets, creatorName) {
    if (!insertedTickets || insertedTickets.length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/discord/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ insertedTickets, creatorName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send Discord notification.");
      }
    } catch (error) {
      console.error("Discord notification failed", error);
      showToast(`Notification Error: ${error.message}`, "error");
    }
  }

  function addTableEventListeners() {
    const tableBody = document.querySelector("tbody");
    if (!tableBody) return;

    // reset listeners
    tableBody.parentNode.replaceChild(tableBody.cloneNode(true), tableBody);

    const newBody = document.querySelector("tbody");
    newBody.addEventListener("click", handleTableClick);
    newBody.addEventListener("change", handleTableChange);
    newBody.addEventListener("focusin", handleTableFocusIn);
    newBody.addEventListener("focusout", handleTableFocusOut);
    
    // Add blur event listener for searchable dropdown reset
    newBody.addEventListener("blur", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        // Use setTimeout to allow click events to be processed first
        setTimeout(() => {
          const input = e.target;
          const originalValue = input.dataset.originalValue || "";
          const originalText = input.dataset.originalText || "";
          
          // Check if a dropdown item was clicked (selection made)
          const wasSelectionMade = document.querySelector('.searchable-dropdown-list[style*="block"]') === null;
          
          // If no selection was made and we have original values, reset
          if (wasSelectionMade && (originalValue !== input.dataset.value || originalText !== input.value)) {
            console.log("Resetting searchable dropdown to original values");
            input.value = originalText;
            input.dataset.value = originalValue;
            
            // Clear any active selection
            const allDropdowns = document.querySelectorAll(".searchable-dropdown-list");
            allDropdowns.forEach(dropdown => {
              if (dropdown.parentNode === document.body) {
                dropdown.style.display = "none";
                // Return dropdown to original parent
                const inputs = document.querySelectorAll(".searchable-dropdown-input");
                for (let inp of inputs) {
                  const container = inp.closest(".searchable-dropdown");
                  if (container && !container.querySelector(".searchable-dropdown-list")) {
                    container.appendChild(dropdown);
                    break;
                  }
                }
              }
            });
          }
        }, 150);
      }
    }, true);
    newBody.addEventListener("keyup", handleTableKeyUp);
    
    // Add click handler for searchable dropdown inputs
    newBody.addEventListener("click", handleSearchableDropdownClick);
    
    // Add click handler for sortable headers
    const tableHead = document.querySelector("thead");
    if (tableHead) {
      // Remove existing listener to avoid duplicates
      tableHead.removeEventListener("click", handleHeaderClick);
      tableHead.addEventListener("click", handleHeaderClick);
    }
    
    // Add input and keyup event listeners for searchable dropdown filtering
    newBody.addEventListener("input", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        console.log("Input event triggered on searchable dropdown:", e.target.value);
        const filter = e.target.value.toLowerCase();
        
        // Find the dropdown list - it might be a sibling or moved to document.body
        let list = e.target.nextElementSibling;
        if (!list || !list.classList.contains("searchable-dropdown-list")) {
          // If not found as sibling, look for it in the same searchable dropdown container
          const container = e.target.closest(".searchable-dropdown");
          list = container ? container.querySelector(".searchable-dropdown-list") : null;
        }
        
        // If still not found, it might be moved to document.body
        if (!list) {
          // Find the dropdown that belongs to this input by looking for one that was moved to body
          const allDropdowns = document.querySelectorAll(".searchable-dropdown-list");
          for (let dropdown of allDropdowns) {
            if (dropdown.parentNode === document.body) {
              // Check if this dropdown belongs to our input by looking for matching data attributes
              const inputId = e.target.dataset.id;
              const inputField = e.target.dataset.field;
              // We can't easily match them, so we'll use the first visible dropdown
              if (dropdown.style.display === "block") {
                list = dropdown;
                break;
              }
            }
          }
        }
        
        console.log("Found list element:", list);
        if (list && list.classList.contains("searchable-dropdown-list")) {
          console.log("Filtering with:", filter);
          list.querySelectorAll("div").forEach((item) => {
            const text = item.textContent.toLowerCase();
            const shouldShow = text.includes(filter);
            item.style.display = shouldShow ? "" : "none";
            console.log(`Item "${item.textContent}" - should show: ${shouldShow}`);
          });
          // Clear any active selection when user types
          const activeItem = list.querySelector(".dropdown-active");
          if (activeItem) activeItem.classList.remove("dropdown-active");
        }
      }
    });
    
    newBody.addEventListener("keyup", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        // Handle Escape key to reset value
        if (e.key === "Escape") {
          const input = e.target;
          const originalValue = input.dataset.originalValue || "";
          const originalText = input.dataset.originalText || "";
          
          console.log("Escape pressed - resetting searchable dropdown to original values");
          input.value = originalText;
          input.dataset.value = originalValue;
          
          // Close dropdown
          const allDropdowns = document.querySelectorAll(".searchable-dropdown-list");
          allDropdowns.forEach(dropdown => {
            if (dropdown.parentNode === document.body) {
              dropdown.style.display = "none";
              // Return dropdown to original parent
              const inputs = document.querySelectorAll(".searchable-dropdown-input");
              for (let inp of inputs) {
                const container = inp.closest(".searchable-dropdown");
                if (container && !container.querySelector(".searchable-dropdown-list")) {
                  container.appendChild(dropdown);
                  break;
                }
              }
            }
          });
          return;
        }
        
        console.log("Keyup event triggered on searchable dropdown:", e.target.value);
        const filter = e.target.value.toLowerCase();
        
        // Find the dropdown list - it might be a sibling or moved to document.body
        let list = e.target.nextElementSibling;
        if (!list || !list.classList.contains("searchable-dropdown-list")) {
          // If not found as sibling, look for it in the same searchable dropdown container
          const container = e.target.closest(".searchable-dropdown");
          list = container ? container.querySelector(".searchable-dropdown-list") : null;
        }
        
        // If still not found, it might be moved to document.body
        if (!list) {
          // Find the dropdown that belongs to this input by looking for one that was moved to body
          const allDropdowns = document.querySelectorAll(".searchable-dropdown-list");
          for (let dropdown of allDropdowns) {
            if (dropdown.parentNode === document.body) {
              // Check if this dropdown belongs to our input by looking for matching data attributes
              const inputId = e.target.dataset.id;
              const inputField = e.target.dataset.field;
              // We can't easily match them, so we'll use the first visible dropdown
              if (dropdown.style.display === "block") {
                list = dropdown;
                break;
              }
            }
          }
        }
        
        if (list && list.classList.contains("searchable-dropdown-list")) {
          console.log("Keyup filtering with:", filter);
          list.querySelectorAll("div").forEach((item) => {
            const text = item.textContent.toLowerCase();
            const shouldShow = text.includes(filter);
            item.style.display = shouldShow ? "" : "none";
            console.log(`Keyup - Item "${item.textContent}" - should show: ${shouldShow}`);
          });
          // Clear any active selection when user types
          const activeItem = list.querySelector(".dropdown-active");
          if (activeItem) activeItem.classList.remove("dropdown-active");
        }
      }
    });

    // Add global click listener for dropdown items (since they're moved to document.body)
    document.addEventListener("click", (e) => {
      // Check if clicking on a dropdown item
      if (e.target.hasAttribute('data-value') && e.target.closest('.searchable-dropdown-list')) {
        console.log("Global dropdown item click detected");
        handleDropdownItemClick(e);
        return;
      }
    });

    // Add global input listener for searchable dropdown filtering
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        console.log("Global input event triggered on searchable dropdown:", e.target.value);
        const filter = e.target.value.toLowerCase();
        
        // Find the dropdown list - it might be a sibling or moved to document.body
        let list = e.target.nextElementSibling;
        if (!list || !list.classList.contains("searchable-dropdown-list")) {
          // If not found as sibling, look for it in the same searchable dropdown container
          const container = e.target.closest(".searchable-dropdown");
          list = container ? container.querySelector(".searchable-dropdown-list") : null;
        }
        
        // If still not found, it might be moved to document.body
        if (!list) {
          // Find the dropdown that belongs to this input by looking for one that was moved to body
          const allDropdowns = document.querySelectorAll(".searchable-dropdown-list");
          for (let dropdown of allDropdowns) {
            if (dropdown.parentNode === document.body) {
              // Check if this dropdown belongs to our input by looking for matching data attributes
              const inputId = e.target.dataset.id;
              const inputField = e.target.dataset.field;
              // We can't easily match them, so we'll use the first visible dropdown
              if (dropdown.style.display === "block") {
                list = dropdown;
                break;
              }
            }
          }
        }
        
        if (list && list.classList.contains("searchable-dropdown-list")) {
          console.log("Global filtering with:", filter);
          list.querySelectorAll("div").forEach((item) => {
            const text = item.textContent.toLowerCase();
            const shouldShow = text.includes(filter);
            item.style.display = shouldShow ? "" : "none";
            console.log(`Global - Item "${item.textContent}" - should show: ${shouldShow}`);
          });
          // Clear any active selection when user types
          const activeItem = list.querySelector(".dropdown-active");
          if (activeItem) activeItem.classList.remove("dropdown-active");
        }
      }
    });

    // Add global click listener to close Jira dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      // Don't prevent default or stop propagation here - let the event bubble
      console.log("Global click detected on:", e.target);
      
      if (!e.target.closest(".tag-editor.jira-style")) {
        document.querySelectorAll(".jira-dropdown").forEach(dropdown => {
          dropdown.style.display = "none";
        });
      }
      
      // Close searchable dropdowns when clicking on other interactive elements
      const isClickingOnOtherDropdown = e.target.closest("select") || 
                                       e.target.closest(".jira-dropdown") ||
                                       e.target.closest(".tag-editor") ||
                                       e.target.closest(".status-tag") ||
                                       e.target.closest(".priority-tag") ||
                                       e.target.closest(".type-tag") ||
                                       e.target.closest(".jira-option") ||
                                       e.target.closest(".jira-dropdown-list") ||
                                       e.target.closest(".priority-dropdown") ||
                                       e.target.closest(".status-dropdown");
      
      // Also check if clicking on any dropdown-related element that's not a searchable dropdown
      const isClickingOnDropdownElement = e.target.classList.contains("jira-option") ||
                                        e.target.classList.contains("priority-tag") ||
                                        e.target.classList.contains("status-tag") ||
                                        e.target.classList.contains("type-tag") ||
                                        e.target.closest(".tag-editor.jira-style") ||
                                        e.target.closest(".dropdown-list");
      
      if (isClickingOnOtherDropdown || isClickingOnDropdownElement) {
        console.log("Clicking on other dropdown element, closing searchable dropdowns");
        closeAllDropdowns();
      }
      
      // Close searchable dropdowns when clicking outside
      if (!e.target.closest(".searchable-dropdown") && !e.target.closest(".searchable-dropdown-list")) {
        console.log("Clicking outside dropdown, closing all searchable dropdowns");
        closeAllDropdowns();
      }
    });
    
    // Add specific event listener for table interactions to close dropdowns
    document.addEventListener("click", (e) => {
      // Only close dropdowns if clicking on table elements that are NOT part of a dropdown
      if ((e.target.closest("td") || e.target.closest("th") || e.target.closest("tr")) && 
          !e.target.closest(".searchable-dropdown") && 
          !e.target.closest(".searchable-dropdown-list")) {
        console.log("Clicking on table element (not dropdown), closing dropdowns");
        closeAllDropdowns();
      }
    });
    
    // Handle window resize to reposition dropdowns
    window.addEventListener("resize", () => {
      document.querySelectorAll(".searchable-dropdown-list").forEach(dropdown => {
        if (dropdown.style.display === "block") {
          const input = dropdown.previousElementSibling;
          if (input && input.classList.contains("searchable-dropdown-input")) {
            positionDropdownFixed(input, dropdown);
          }
        }
      });
    });
    
    // Handle scroll events to close dropdowns
    const closeAllDropdowns = () => {
      document.querySelectorAll(".searchable-dropdown-list").forEach(dropdown => {
        if (dropdown.style.display === "block") {
          dropdown.style.display = "none";
          // Return dropdown to its original parent if it was moved to body
          if (dropdown.parentNode === document.body) {
            // Find the input that corresponds to this dropdown
            const inputs = document.querySelectorAll(".searchable-dropdown-input");
            for (let input of inputs) {
              const container = input.closest(".searchable-dropdown");
              if (container && !container.querySelector(".searchable-dropdown-list")) {
                // This container doesn't have its dropdown, so this must be it
                container.appendChild(dropdown);
                break;
              }
            }
          }
        }
      });
    };
    
    window.addEventListener("scroll", (e) => {
      // Don't close dropdowns if scrolling within a dropdown list
      if (!e.target.closest(".searchable-dropdown-list")) {
        closeAllDropdowns();
      }
    }, true);
    
    // Also listen for scroll events on table containers and other scrollable elements
    const tableWrapper = document.querySelector(".table-wrapper");
    if (tableWrapper) {
      tableWrapper.addEventListener("scroll", (e) => {
        if (!e.target.closest(".searchable-dropdown-list")) {
          closeAllDropdowns();
        }
      });
    }
    
    // Listen for scroll on any scrollable parent containers
    document.querySelectorAll(".ticket-main-content, .ticket-details-sidebar").forEach(container => {
      container.addEventListener("scroll", (e) => {
        if (!e.target.closest(".searchable-dropdown-list")) {
          closeAllDropdowns();
        }
      });
    });

    // ✅ attach checkbox click
    newBody.querySelectorAll(".ticket-checkbox").forEach((cb) => {
      cb.addEventListener("change", handleCheckboxClick);
    });

    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    if (selectAllCheckbox)
      selectAllCheckbox.addEventListener("change", toggleSelectAll);
    
    // Add global click listener to close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".jira-dropdown") && !e.target.closest(".tag-editor")) {
        document.querySelectorAll(".jira-dropdown").forEach(dropdown => {
          dropdown.style.display = "none";
        });
      }
    });
    
    // Add scroll listener to close dropdowns when scrolling
    document.addEventListener("scroll", () => {
      document.querySelectorAll(".jira-dropdown").forEach(dropdown => {
        if (dropdown.style.display === "block") {
          dropdown.style.display = "none";
        }
      });
    }, true);
  }

  function updateRemoveButtonVisibility(container, field, id, value) {
    const existingButton = container.querySelector(`.remove-field-btn[data-field="${field}"]`);
    
    if (value && value !== "" && value !== null) {
      // Show remove button if value exists and button doesn't exist
      if (!existingButton) {
        const fieldName = field === 'assigneeId' ? 'Assignee' : field === 'projectId' ? 'Project' : 'Epic';
        const removeButtonHTML = `<button class="remove-field-btn" data-field="${field}" data-ticket-id="${id}" title="Remove ${fieldName}"><i class="fas fa-times-circle clear-icon"></i></button>`;
        container.insertAdjacentHTML('beforeend', removeButtonHTML);
      }
    } else {
      // Hide remove button if no value
      if (existingButton) {
        existingButton.remove();
      }
    }
  }

  function handleJiraDropdownUpdate(id, field, value, type) {
    const handler = type === "project" ? handleProjectUpdate : handleUpdate;
    
    // Find the actual DOM element to get the parent container and old value
    const actualElement = document.querySelector(`[data-id="${id}"][data-field="${field}"]`);
    const parentContainer = actualElement ? actualElement.closest("td, .sidebar-property-editable") : null;
    const oldValue = actualElement ? actualElement.dataset.oldValue || "" : "";
    
    // Create a fake event object to match the expected format
    const fakeEvent = {
      target: {
        dataset: {
          id: id,
          field: field,
          type: type,
          oldValue: oldValue,
          value: value // Add the actual value for searchable dropdowns
        },
        value: value,
        classList: actualElement ? actualElement.classList : { contains: () => false },
        closest: function(selector) {
          return parentContainer;
        }
      }
    };
    
    // For searchable dropdowns, pass the value as newValueFromSearchable
    if (actualElement && actualElement.classList.contains("searchable-dropdown-input")) {
      handler(fakeEvent, value); // Pass as second parameter for newValueFromSearchable
    } else {
      handler(fakeEvent);
    }
  }

  function handleTableClick(e) {
    const target = e.target;
    console.log("handleTableClick - target:", target);
    console.log("handleTableClick - target classes:", target.className);
    console.log("handleTableClick - target closest dropdown item:", target.closest(".searchable-dropdown-list div[data-value]"));

    // --- Specific Action Handlers (These take priority) ---
    const addTaskBtn = target.closest(".add-task-inline-btn");
    if (addTaskBtn) {
      e.stopPropagation();
      const projectId =
        addTaskBtn.dataset.projectId === "null"
          ? null
          : addTaskBtn.dataset.projectId;
      const epicName = addTaskBtn.dataset.epicName;
      addInlineTaskRow(addTaskBtn.closest("tr"), projectId, epicName);
      return;
    }
    const addEpicBtn = target.closest(".add-epic-inline-btn");
    if (addEpicBtn) {
      e.stopPropagation();
      const projectId =
        addEpicBtn.dataset.projectId === "null"
          ? null
          : addEpicBtn.dataset.projectId;
      handleAddNewEpic(addEpicBtn.closest("tr"), projectId);
      return;
    }
    if (target.classList.contains("status-tag")) {
      const editor = target.closest(".tag-editor");
      if (editor && !editor.classList.contains("is-editing")) {
        // Handle Jira-style dropdown
        if (editor.classList.contains("jira-style")) {
          e.stopPropagation();
          const dropdown = editor.querySelector(".jira-dropdown");
          if (dropdown) {
            // Close all other dropdowns first (both Jira and searchable)
            document.querySelectorAll(".jira-dropdown").forEach(d => {
              if (d !== dropdown) d.style.display = "none";
            });
            // Close all searchable dropdowns
            document.querySelectorAll(".searchable-dropdown-list").forEach(searchableDropdown => {
              if (searchableDropdown.style.display === "block") {
                searchableDropdown.style.display = "none";
                // Return dropdown to its original parent if it was moved to body
                if (searchableDropdown.parentNode === document.body) {
                  const inputs = document.querySelectorAll(".searchable-dropdown-input");
                  for (let input of inputs) {
                    const container = input.closest(".searchable-dropdown");
                    if (container && !container.querySelector(".searchable-dropdown-list")) {
                      container.appendChild(searchableDropdown);
                      break;
                    }
                  }
                }
              }
            });
            // Position dropdown to be fully visible
            if (dropdown.style.display === 'none' || dropdown.style.display === '') {
              const tagRect = target.getBoundingClientRect();
              const dropdownWidth = 240; // min-width from CSS
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              let left = tagRect.left;
              let top = tagRect.bottom + 4;
              
              // Ensure dropdown doesn't go off the right edge
              if (left + dropdownWidth > viewportWidth - 20) {
                left = viewportWidth - dropdownWidth - 20;
              }
              
              // Ensure dropdown doesn't go off the left edge
              if (left < 20) {
                left = 20;
              }
              
              // If dropdown would go off bottom, show it above the tag
              if (top + 200 > viewportHeight - 20) {
                top = tagRect.top - 200;
              }
              
              dropdown.style.position = 'fixed';
              dropdown.style.left = left + 'px';
              dropdown.style.top = top + 'px';
              dropdown.style.right = 'auto';
              dropdown.style.display = 'block';
            } else {
              dropdown.style.display = 'none';
            }
          }
        } else {
          // Handle old-style dropdown
        editor.classList.add("is-editing");
        editor.querySelector("select")?.focus();
        }
      }
      return;
    }
    
    // Handle priority-tag clicks
    if (target.classList.contains("priority-tag")) {
      const editor = target.closest(".tag-editor");
      if (editor && !editor.classList.contains("is-editing")) {
        // Handle Jira-style dropdown
        if (editor.classList.contains("jira-style")) {
          e.stopPropagation();
          const dropdown = editor.querySelector(".jira-dropdown");
          if (dropdown) {
            // Close all other dropdowns first (both Jira and searchable)
            document.querySelectorAll(".jira-dropdown").forEach(d => {
              if (d !== dropdown) d.style.display = "none";
            });
            // Close all searchable dropdowns
            document.querySelectorAll(".searchable-dropdown-list").forEach(searchableDropdown => {
              if (searchableDropdown.style.display === "block") {
                searchableDropdown.style.display = "none";
                // Return dropdown to its original parent if it was moved to body
                if (searchableDropdown.parentNode === document.body) {
                  const inputs = document.querySelectorAll(".searchable-dropdown-input");
                  for (let input of inputs) {
                    const container = input.closest(".searchable-dropdown");
                    if (container && !container.querySelector(".searchable-dropdown-list")) {
                      container.appendChild(searchableDropdown);
                      break;
                    }
                  }
                }
              }
            });
            // Position dropdown to be fully visible
            if (dropdown.style.display === 'none' || dropdown.style.display === '') {
              const tagRect = target.getBoundingClientRect();
              const dropdownWidth = 160; // min-width for priority dropdown
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              let left = tagRect.left;
              let top = tagRect.bottom + 4;
              
              // Ensure dropdown doesn't go off the right edge
              if (left + dropdownWidth > viewportWidth - 20) {
                left = viewportWidth - dropdownWidth - 20;
              }
              
              // Ensure dropdown doesn't go off the left edge
              if (left < 20) {
                left = 20;
              }
              
              // If dropdown would go off bottom, show it above the tag
              if (top + 150 > viewportHeight - 20) {
                top = tagRect.top - 150;
              }
              
              dropdown.style.position = 'fixed';
              dropdown.style.left = left + 'px';
              dropdown.style.top = top + 'px';
              dropdown.style.right = 'auto';
              dropdown.style.display = 'block';
            } else {
              dropdown.style.display = 'none';
            }
          }
        }
      }
      return;
    }
    
    // Handle type-tag clicks
    if (target.classList.contains("type-tag")) {
      const editor = target.closest(".tag-editor");
      if (editor && !editor.classList.contains("is-editing")) {
        // Handle Jira-style dropdown
        if (editor.classList.contains("jira-style")) {
          e.stopPropagation();
          const dropdown = editor.querySelector(".jira-dropdown");
          if (dropdown) {
            // Close all other dropdowns first (both Jira and searchable)
            document.querySelectorAll(".jira-dropdown").forEach(d => {
              if (d !== dropdown) d.style.display = "none";
            });
            // Close all searchable dropdowns
            document.querySelectorAll(".searchable-dropdown-list").forEach(searchableDropdown => {
              if (searchableDropdown.style.display === "block") {
                searchableDropdown.style.display = "none";
                // Return dropdown to its original parent if it was moved to body
                if (searchableDropdown.parentNode === document.body) {
                  const inputs = document.querySelectorAll(".searchable-dropdown-input");
                  for (let input of inputs) {
                    const container = input.closest(".searchable-dropdown");
                    if (container && !container.querySelector(".searchable-dropdown-list")) {
                      container.appendChild(searchableDropdown);
                      break;
                    }
                  }
                }
              }
            });
            // Toggle current dropdown
            dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
          }
        }
      }
      return;
    }
    
    // Handle Jira dropdown option clicks
    if (target.classList.contains("jira-option") || target.closest(".jira-option")) {
      e.stopPropagation();
      const option = target.classList.contains("jira-option") ? target : target.closest(".jira-option");
      const value = option.dataset.value;
      const id = option.dataset.id;
      const field = option.dataset.field;
      const type = option.dataset.type;
      
      // Close dropdown
      option.closest(".jira-dropdown").style.display = "none";
      
      // Update the value
      handleJiraDropdownUpdate(id, field, value, type);
      return;
    }
    if (target.classList.contains("project-name")) {
      const groupHeader = target.closest(".project-group-header");
      const projectId = groupHeader.querySelector(".add-task-inline-btn")
        ?.dataset.projectId;
      if (projectId && projectId !== "null") {
        showProjectDetailModal(projectId);
      }
      return;
    }
    if (target.classList.contains("clear-icon")) {
      handleClear(e);
      return;
    }
    if (target.classList.contains("copy-icon")) {
      copyTicketInfo(e);
      return;
    }
    if (target.classList.contains("warning-icon")) {
      showWarnings(e);
      return;
    }

    // --- FIX: Correctly handle dropdown selection for both new and existing rows ---
    let dropdownItem = null;
    
    // Check if the target itself is a dropdown item
    if (target.hasAttribute('data-value') && target.closest('.searchable-dropdown-list')) {
      dropdownItem = target;
      console.log("Target itself is dropdown item:", dropdownItem);
    }
    
    // If not, try closest search
    if (!dropdownItem) {
      dropdownItem = target.closest(".searchable-dropdown-list div[data-value]");
      console.log("First attempt dropdown item:", dropdownItem);
    }
    
    // If still not found, try a more specific selector
    if (!dropdownItem) {
      dropdownItem = target.closest("div[data-value]");
      console.log("Second attempt dropdown item:", dropdownItem);
      // Make sure it's within a searchable dropdown list
      if (dropdownItem && !dropdownItem.closest(".searchable-dropdown-list")) {
        console.log("Dropdown item not in searchable dropdown list, setting to null");
        dropdownItem = null;
      }
    }
    
    console.log("Final dropdown item:", dropdownItem);
    if (dropdownItem) {
      e.stopPropagation(); // Prevent event bubbling
      e.preventDefault(); // Prevent default behavior
      
      // Use setTimeout to ensure this is processed before global click handlers
      setTimeout(() => {
        console.log("Processing dropdown item selection");
      const input = dropdownItem
        .closest(".searchable-dropdown")
        .querySelector("input");
      const newValue = dropdownItem.dataset.value;
        
        console.log("Input element:", input);
        console.log("New value:", newValue);

        // Store the current value as oldValue before updating
        if (!input.dataset.oldValue) {
          input.dataset.oldValue = input.dataset.value || "";
        }

      // Set the display text and the underlying ID value
      input.value = dropdownItem.textContent.trim();
      input.dataset.value = newValue;

      // ONLY trigger the database update if it's an existing ticket row
      if (input.dataset.id !== "new-inline") {
        const handler =
          input.dataset.type === "project" ? handleProjectUpdate : handleUpdate;
        handler({ target: input }, newValue);
      }

        // Hide the dropdown list after selection and return to original parent
        const dropdown = dropdownItem.closest(".searchable-dropdown-list");
        dropdown.style.display = "none";
        
        // Return dropdown to original parent if it was moved to body
        if (dropdown.parentNode === document.body) {
          const container = input.closest(".searchable-dropdown");
          if (container && !container.querySelector(".searchable-dropdown-list")) {
            container.appendChild(dropdown);
          }
        }
      }, 10);
      return;
    }

    if (target.closest("select, input, textarea")) {
      return;
    }

    // --- Group Header Toggle Logic ---
    const groupHeader = target.closest(
      "tr.project-group-header, tr.epic-group-header"
    );
    if (groupHeader) {
      const isCollapsed = groupHeader.classList.toggle("collapsed");
      const isProjectGroup = groupHeader.classList.contains(
        "project-group-header"
      );
      let currentRow = groupHeader.nextElementSibling;

      while (currentRow) {
        const isNextProjectHeader = currentRow.classList.contains(
          "project-group-header"
        );
        const isNextEpicHeader =
          currentRow.classList.contains("epic-group-header");
        if (isProjectGroup && isNextProjectHeader) break;
        if (!isProjectGroup && (isNextEpicHeader || isNextProjectHeader)) break;
        currentRow.style.display = isCollapsed ? "none" : "";
        currentRow = currentRow.nextElementSibling;
      }
      return;
    }

    // --- Default Action to Open Modal ---
    const taskCell = target.closest('td[data-label="Task"]');
    if (taskCell) {
      const ticketRow = taskCell.closest('tr[id^="ticket-row-"]');
      if (ticketRow) {
        const ticketId = ticketRow.id.replace("ticket-row-", "");
        showTaskDetailModal(ticketId);
      }
    }
  }

  // REPLACE the existing handleTableChange function.
  function handleTableChange(e) {
    const target = e.target;
    // MODIFIED: Only trigger updates for non-date inputs on the 'change' event.
    // Date inputs are now handled by a 'keydown' listener to update on 'Enter'.
    if (target.classList.contains("inline-editor") && target.type !== "date") {
      const handler =
        target.dataset.type === "project" ? handleProjectUpdate : handleUpdate;
      handler(e);
    }
  }
  // Helper function to find the dropdown list associated with an input
  function findDropdownForInput(input) {
    // First try nextElementSibling (if dropdown hasn't been moved)
    let dropdown = input.nextElementSibling;
    if (dropdown && dropdown.classList.contains("searchable-dropdown-list")) {
      return dropdown;
    }
    
    // If not found as sibling, look in the container
    const container = input.closest(".searchable-dropdown");
    if (container) {
      dropdown = container.querySelector(".searchable-dropdown-list");
      if (dropdown) return dropdown;
    }
    
    // If still not found, it might have been moved to body - search by data attribute
    if (input.dataset.dropdownId) {
      dropdown = document.querySelector(`.searchable-dropdown-list[data-dropdown-id="${input.dataset.dropdownId}"]`);
      if (dropdown) return dropdown;
    }
    
    return null;
  }
  
  // Position dropdown using fixed positioning and move to body to escape all stacking contexts
  function positionDropdownFixed(input, dropdown) {
    const inputRect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Close all other dropdowns first
    document.querySelectorAll(".searchable-dropdown-list").forEach(otherDropdown => {
      if (otherDropdown !== dropdown && otherDropdown.style.display === "block") {
        otherDropdown.style.display = "none";
        // Return other dropdowns to their original parents
        if (otherDropdown.parentNode === document.body) {
          const inputs = document.querySelectorAll(".searchable-dropdown-input");
          for (let otherInput of inputs) {
            const container = otherInput.closest(".searchable-dropdown");
            if (container && !container.querySelector(".searchable-dropdown-list")) {
              container.appendChild(otherDropdown);
              break;
            }
          }
        }
      }
    });
    
    // Store reference to the input on the dropdown for later retrieval
    dropdown.dataset.connectedInput = input.dataset.reconcileId || "default";
    input.dataset.dropdownId = "dropdown-" + (input.dataset.reconcileId || "default");
    dropdown.dataset.dropdownId = "dropdown-" + (input.dataset.reconcileId || "default");
    
    // Move dropdown to body to escape any container stacking contexts
    if (dropdown.parentNode !== document.body) {
      document.body.appendChild(dropdown);
    }
    
    // Show dropdown first to get its dimensions
    dropdown.style.display = "block";
    
    // Force a reflow to get accurate dimensions
    dropdown.offsetHeight;
    
    const dropdownHeight = dropdown.offsetHeight;
    const dropdownWidth = Math.max(inputRect.width, 200); // Minimum width of 200px
    
    // Calculate position
    let top, left;
    
    // Check if there's enough space below
    if (inputRect.bottom + dropdownHeight <= viewportHeight - 20) {
      // Position below
      top = inputRect.bottom + 2;
      dropdown.classList.remove("dropdown-up");
    } else {
      // Position above
      top = inputRect.top - dropdownHeight - 2;
      dropdown.classList.add("dropdown-up");
    }
    
    // Calculate horizontal position
    left = inputRect.left;
    
    // Adjust if dropdown would extend beyond viewport
    if (left + dropdownWidth > viewportWidth - 20) {
      left = viewportWidth - dropdownWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }
    
    // Apply the calculated position with maximum z-index
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${dropdownWidth}px`;
    dropdown.style.zIndex = "999999"; // Ensure maximum z-index
    dropdown.style.position = "fixed"; // Ensure fixed positioning
    dropdown.style.isolation = "isolate"; // Force new stacking context
    dropdown.style.transform = "translateZ(0) scale(1)"; // Force hardware acceleration
    dropdown.style.pointerEvents = "auto"; // Ensure dropdown is interactive
    
    // Force a repaint to ensure the dropdown is visible
    dropdown.style.opacity = "0.99";
    requestAnimationFrame(() => {
      dropdown.style.opacity = "1";
      // Double-check z-index after repaint
      dropdown.style.zIndex = "999999";
    });
  }

  function handleTableFocusIn(e) {
    if (e.target.classList.contains("searchable-dropdown-input")) {
      // Find the dropdown - it might be a sibling or already moved to body
      let dropdown = e.target.nextElementSibling;
      if (!dropdown || !dropdown.classList.contains("searchable-dropdown-list")) {
        // If not found as sibling, look for it in the same searchable dropdown container
        const container = e.target.closest(".searchable-dropdown");
        dropdown = container ? container.querySelector(".searchable-dropdown-list") : null;
      }
      
      if (dropdown) {
        positionDropdownFixed(e.target, dropdown);
      }
    }
  }
  
  // Add click handler for searchable dropdown inputs
  function handleSearchableDropdownClick(e) {
    if (e.target.classList.contains("searchable-dropdown-input")) {
      // Store the original value for potential reset
      e.target.dataset.originalValue = e.target.dataset.value || "";
      e.target.dataset.originalText = e.target.value || "";
      
      // Find the dropdown - it might be a sibling or already moved to body
      let dropdown = e.target.nextElementSibling;
      if (!dropdown || !dropdown.classList.contains("searchable-dropdown-list")) {
        // If not found as sibling, look for it in the same searchable dropdown container
        const container = e.target.closest(".searchable-dropdown");
        dropdown = container ? container.querySelector(".searchable-dropdown-list") : null;
      }
      
      if (dropdown) {
        positionDropdownFixed(e.target, dropdown);
        e.target.focus();
        
        // Add direct event listeners to dropdown items since they're now in document.body
        const dropdownItems = dropdown.querySelectorAll('div[data-value]');
        dropdownItems.forEach(item => {
          // Remove any existing listeners first
          item.removeEventListener('click', handleDropdownItemClick);
          // Add new listener
          item.addEventListener('click', handleDropdownItemClick);
        });
      }
    }
  }
  
  // Handle dropdown item clicks directly
  function handleDropdownItemClick(e) {
    console.log("Direct dropdown item click handler called");
    e.stopPropagation();
    e.preventDefault();
    
    const dropdownItem = e.target;
    const dropdown = dropdownItem.closest('.searchable-dropdown-list');
    
    // Find the input - it might be in the original container
    let input = null;
    const inputs = document.querySelectorAll('.searchable-dropdown-input');
    for (let inp of inputs) {
      const container = inp.closest('.searchable-dropdown');
      if (container && !container.querySelector('.searchable-dropdown-list')) {
        // This container is missing its dropdown, so this must be the right input
        input = inp;
        break;
      }
    }
    
    if (!input || !dropdownItem) {
      console.log("Could not find input or dropdown item");
      return;
    }
    
    const newValue = dropdownItem.dataset.value;
    console.log("Processing dropdown item with value:", newValue);
    
    // Store the current value as oldValue before updating
    if (!input.dataset.oldValue) {
      input.dataset.oldValue = input.dataset.value || "";
    }

    // Set the display text and the underlying ID value
    input.value = dropdownItem.textContent.trim();
    input.dataset.value = newValue;

    // ONLY trigger the database update if it's an existing ticket row
    if (input.dataset.id !== "new-inline") {
      const handler =
        input.dataset.type === "project" ? handleProjectUpdate : handleUpdate;
      handler({ target: input }, newValue);
    }

    // Hide the dropdown list after selection and return to original parent
    dropdown.style.display = "none";
    
    // Return dropdown to original parent if it was moved to body
    if (dropdown.parentNode === document.body) {
      const container = input.closest(".searchable-dropdown");
      if (container && !container.querySelector(".searchable-dropdown-list")) {
        container.appendChild(dropdown);
      }
    }
  }
  function handleTableFocusOut(e) {
    if (
      e.target.classList.contains("inline-editor") &&
      e.target.closest(".tag-editor")
    )
      e.target.closest(".tag-editor").classList.remove("is-editing");
    else if (e.target.classList.contains("searchable-dropdown-input")) {
      // Add a small delay to prevent race condition with click events
      setTimeout(() => {
        // Find the dropdown - it might be a sibling or already moved to body
        let dropdown = e.target.nextElementSibling;
        if (!dropdown || !dropdown.classList.contains("searchable-dropdown-list")) {
          // If not found as sibling, look for it in the same searchable dropdown container
          const container = e.target.closest(".searchable-dropdown");
          dropdown = container ? container.querySelector(".searchable-dropdown-list") : null;
        }
        
        if (dropdown && dropdown.style.display === "block") {
          dropdown.style.display = "none";
          // Return dropdown to its original parent if it was moved to body
          const originalParent = e.target.closest(".searchable-dropdown");
          if (dropdown.parentNode === document.body && originalParent) {
            originalParent.appendChild(dropdown);
          }
        }
      }, 150);
    }
  }
  function handleTableKeyUp(e) {
    if (e.target.classList.contains("searchable-dropdown-input")) {
      const filter = e.target.value.toLowerCase();
      // Find the dropdown - it might be a sibling or already moved to body
      let list = e.target.nextElementSibling;
      if (!list || !list.classList.contains("searchable-dropdown-list")) {
        // If not found as sibling, look for it in the same searchable dropdown container
        const container = e.target.closest(".searchable-dropdown");
        list = container ? container.querySelector(".searchable-dropdown-list") : null;
      }
      
      if (list) {
      list
        .querySelectorAll("div")
        .forEach(
          (item) =>
            (item.style.display = item.textContent
              .toLowerCase()
              .includes(filter)
              ? ""
              : "none")
        );
      }
    }
  }

  // --- BULK EDIT FUNCTIONS ---
  function enterBulkEditMode() {
    isBulkEditMode = true;
    document.body.classList.add("bulk-edit-active");
    document.getElementById("bulk-edit-btn").style.display = "none";
    document.getElementById("bulk-actions-panel").style.display = "flex";
    renderPage(currentPage);
  }
  function exitBulkEditMode(shouldRender) {
    isBulkEditMode = false;
    document.body.classList.remove("bulk-edit-active");
    selectedTickets.clear();
    document.getElementById("bulk-actions-panel").style.display = "none";
    document.getElementById("bulk-edit-btn").style.display = "";

    if (shouldRender) applyFilterAndRender();
  }
  function updateBulkActionControls() {
    const count = selectedTickets.size;
    document.getElementById(
      "selection-count"
    ).textContent = `${count} selected`;
    document.getElementById("assign-selected-btn").disabled = count === 0;
    document.getElementById("update-selected-btn").disabled = count === 0;
  }
  function toggleSelectAll(event) {
    const isChecked = event.target.checked;
    const checkboxes = document.querySelectorAll(".ticket-checkbox");
    
    // Update all checkboxes
    checkboxes.forEach((checkbox) => {
      const id = checkbox.dataset.id;
      checkbox.checked = isChecked;
      if (isChecked) {
        selectedTickets.add(id);
      } else {
        selectedTickets.delete(id);
      }
    });
    
    // Update the select all checkbox state based on current selection
    updateSelectAllCheckboxState();
    updateBulkActionControls();
  }
  function handleCheckboxClick(event) {
    const id = event.target.dataset.id;
    if (event.target.checked) {
      selectedTickets.add(id);
    } else {
      selectedTickets.delete(id);
    }
    
    // Update the select all checkbox state
    updateSelectAllCheckboxState();
    updateBulkActionControls();
  }

  function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    const incompleteSelectAllCheckbox = document.getElementById("incomplete-select-all-checkbox");
    const activeSelectAll = selectAllCheckbox || incompleteSelectAllCheckbox;
    
    if (!activeSelectAll) return;
    
    const checkboxes = document.querySelectorAll(".ticket-checkbox");
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
      activeSelectAll.checked = false;
      activeSelectAll.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
      activeSelectAll.checked = true;
      activeSelectAll.indeterminate = false;
    } else {
      activeSelectAll.checked = false;
      activeSelectAll.indeterminate = true;
    }
  }

  function addIncompleteEventListeners() {
    // Handle table input changes with proper validation
    document.querySelectorAll(".table-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const ticketId = e.target.dataset.ticketId;
        const field = e.target.dataset.field;
        const ticket = appData.allTickets.find(t => t.id == ticketId);
        
        if (ticket && field) {
          ticket[field] = e.target.value;
          
          // Re-validate this field based on status
          const isRequired = isFieldRequired(field, ticket.status);
          const isMissing = isRequired && (!e.target.value || e.target.value === "");
          
          if (isMissing) {
            e.target.classList.add('missing-field');
          } else {
            e.target.classList.remove('missing-field');
          }
          
          // Update error count for this ticket
          updateTicketErrorCount(ticketId);
        }
      });
    });
  }


  // Helper function to determine if field is required (global scope)
  function isFieldRequired(field, status) {
    switch (field) {
      case 'createdAt':
        return true; // Always required
      case 'assignedAt':
        return status !== "Open";
      case 'startedAt':
        return status === "In Progress" || status === "Completed";
      case 'completedAt':
        return status === "Completed";
      default:
        return false;
    }
  }

  function updateTicketErrorCount(ticketId) {
    const ticket = appData.allTickets.find(t => t.id == ticketId);
    if (!ticket) return;
    
    // Recalculate missing fields
    let missingFieldCount = 0;
    if (!ticket.createdAt) missingFieldCount++;
    if (!ticket.assignedAt && ticket.status !== "Open") missingFieldCount++;
    if (!ticket.startedAt && (ticket.status === "In Progress" || ticket.status === "Completed")) missingFieldCount++;
    if (!ticket.completedAt && ticket.status === "Completed") missingFieldCount++;
    
    // Update the error badge
    const errorBadge = document.querySelector(`[data-ticket-id="${ticketId}"] .error-badge`);
    if (errorBadge) {
      if (missingFieldCount > 0) {
        errorBadge.textContent = `${missingFieldCount} errors`;
        errorBadge.style.display = 'inline-block';
      } else {
        errorBadge.style.display = 'none';
      }
    }
  }

  function updateIncompleteBulkButtons() {
    const assignBtn = document.getElementById("incomplete-bulk-assign");
    const updateBtn = document.getElementById("incomplete-bulk-update");
    const count = selectedTickets.size;
    
    if (assignBtn) assignBtn.disabled = count === 0;
    if (updateBtn) updateBtn.disabled = count === 0;
  }

  // Bulk actions are handled by the main bulk actions panel
  // No need for separate handlers in incomplete tab
  function openAssigneeModal() {
    const select = document.getElementById("assignee-select");
    select.innerHTML =
      '<option value="" disabled selected>Select an assignee...</option>' +
      appData.teamMembers
        .map(
          (m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
        )
        .join("");
    document.getElementById("assignee-modal").style.display = "flex";
  }
  function openBulkUpdateModal() {
    const modal = document.getElementById("bulk-update-modal");
    modal.querySelectorAll("input, select").forEach((el) => (el.value = ""));
    modal.querySelectorAll(".searchable-dropdown-input").forEach((el) => {
      el.value = "";
      el.dataset.value = "";
    });

    createSearchableDropdownForModal(
      document.getElementById("bulk-update-project-container"),
      [
        { value: "", text: "- No Change -" },
        ...appData.projects.map((p) => ({ value: p.id, text: p.name })),
      ],
      "Select project..."
    );


    document.getElementById("bulk-update-requestedBy").innerHTML =
      '<option value="">- No Change -</option>' +
      appData.users
        .map(
          (u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`
        )
        .join("");
    document.getElementById("bulk-update-status").innerHTML =
      '<option value="">- No Change -</option><option>Open</option><option>In Progress</option><option>On Hold</option><option>Blocked</option><option>Cancelled</option><option>Rejected</option><option>Completed</option>';
    document.getElementById("bulk-update-priority").innerHTML =
      '<option value="">- No Change -</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>';
    document.getElementById("epic-datalist-bulk").innerHTML = appData.epics
      .map((e) => `<option value="${escapeHtml(e)}"></option>`)
      .join("");

    modal.style.display = "flex";

    document
      .querySelectorAll(
        "#bulk-update-modal .close-button, #bulk-update-modal .cancel-btn"
      )
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          document.getElementById("bulk-update-modal").style.display = "none";
        });
      });
  }


  // Function to get status transition options based on current status
  function getStatusTransitionOptions(currentStatus) {
    const allStatuses = [
      "Open",
      "In Progress", 
      "On Hold",
      "Blocked",
      "Cancelled",
      "Rejected",
      "Completed"
    ];
    
    // Return all statuses except the current one, formatted as transitions
    return allStatuses
      .filter(status => status !== currentStatus)
      .map(status => `${currentStatus} → ${status}`);
  }

  // REPLACE the existing showTaskDetailModal function with this one

  function showTaskDetailModal(ticketId, options = {}) {
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    // Add event listener for real-time updates to this modal
    const modal = document.getElementById("task-detail-modal");
    if (modal) {
      const handleTicketUpdate = (event) => {
        if (event.detail.ticketId == ticketId) {
          console.log("Refreshing modal for ticket update:", ticketId);
          // Re-render the modal with updated data
          const updatedTicket = appData.allTickets.find((t) => t.id == ticketId);
          if (updatedTicket) {
            showTaskDetailModal(ticketId, options);
          }
        }
      };
      
      // Remove existing listener to avoid duplicates
      modal.removeEventListener('ticketUpdated', handleTicketUpdate);
      modal.addEventListener('ticketUpdated', handleTicketUpdate);
    }

    const warnings = getTicketWarnings(ticket);
    const modalBody = document.getElementById("task-detail-modal-body");
    const toDateInputString = (isoString) =>
      isoString ? isoString.split("T")[0] : "";

    const createDateField = (label, value, field, id) => {
      return `
            <div class="date-field-container">
                <div class="editable-field-wrapper ${
                  value ? "has-value" : ""
                }" style="width: 100%;">
                    <input type="date" class="inline-editor" value="${toDateInputString(
                      value
                    )}" data-id="${id}" data-field="${field}" data-old-value="${
        value || ""
      }">
                    <span class="date-field-warning-tooltip">Unsaved Changes Found Please Press Enter</span>
                </div>
            </div>
            `;
    };

    const epicDatalist =
      '<datalist id="epic-datalist-details">' +
      appData.epics
        .map((e) => `<option value="${escapeHtml(e)}"></option>`)
        .join("") +
      "</datalist>";

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const combinedText = `${ticket.description || ""} ${
      ticket.relevantLink || ""
    }`;
    const urls = [...new Set(combinedText.match(urlRegex) || [])];

    let attachmentsHtml = '<h4 class="modal-section-label">Attachments</h4>';
    if (urls.length > 0) {
      attachmentsHtml += `<div class="ticket-attachments-container">${urls
        .map((url) => {
          let filename = "Attachment Link";
          try {
            filename = new URL(url).hostname;
          } catch (e) {}
          return `<div class="attachment-card"><i class="fas fa-link file-icon"></i><div class="file-info"><strong>${escapeHtml(
            filename
          )}</strong><span style="word-break: break-all;">${escapeHtml(
            url
          )}</span></div><a href="${escapeHtml(
            url
          )}" target="_blank" class="attachment-action-btn"><i class="fas fa-eye"></i></a></div>`;
        })
        .join("")}</div>`;
    } else {
      attachmentsHtml +=
        '<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">No attachments linked.</p>';
    }

    const mainContentHtml = `
        <div class="ticket-main-content" data-ticket-id="${ticket.id}">
            <div class="ticket-main-header">
                <div class="ticket-header-row">
                    <span class="ticket-id-tag">HRB-${escapeHtml(ticket.id)}</span>
                    <div class="ticket-type-tag">
                        ${createTypeTag(ticket.type)}
                    </div>
                </div>
                    <textarea id="modal-edit-title" class="modal-title-textarea" rows="1" placeholder="Ticket Title...">${escapeHtml(
                      ticket.title || ""
                    )}</textarea>
            </div>
            <h4 class="modal-section-label">Description</h4>
            <textarea id="modal-edit-description" class="modal-description-textarea" placeholder="Add a description...">${escapeHtml(
              ticket.description || ""
            )}</textarea>
            <div class="modal-actions" style="display: none;">
                <button id="cancel-title-desc-btn" class="cancel-btn">Cancel</button>
                <button id="update-title-desc-btn" class="action-btn" data-ticket-id="${
                  ticket.id
                }">Update</button>
            </div>
            ${attachmentsHtml}
            <div id="subtask-container-modal"></div>
        </div>`;

    const sidebarHtml = `
        <div class="ticket-details-sidebar" data-ticket-id="${ticket.id}">
            <div class="sidebar-section">
                <div class="sidebar-property-editable">
                    <label class="prop-label">Status</label>
                    <div class="prop-value">
                        ${createTagEditor(
                          getStatusTransitionOptions(ticket.status),
                  ticket.status,
                  ticket.id,
                  "status"
                        )}
                    </div>
                </div>
                <div class="sidebar-property-editable">
                    <label class="prop-label">Priority</label>
                    <div class="prop-value">
                        ${createTagEditor(
                          ["Urgent", "High", "Medium", "Low"],
                          ticket.priority,
                          ticket.id,
                          "priority"
                        )}
                    </div>
                </div>
                <div class="sidebar-property-editable ${
                  warnings.some((w) => w.field === "dueDate")
                    ? "has-warning"
                    : ""
                }">
                    <label class="prop-label">Due date</label>
                    <div class="prop-value">
                        ${createDateField(
                          "",
                          ticket.dueDate,
                          "dueDate",
                          ticket.id
                        )}
                    </div>
                </div>
                <div class="sidebar-property-editable ${
                  warnings.some((w) => w.field === "assigneeId")
                    ? "has-warning"
                    : ""
                }">
                    <label class="prop-label">Assignee</label>
                    <div class="prop-value">
                        ${createSearchableDropdown(
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      ticket.assigneeId,
      ticket.id,
      "assigneeId",
      "modal"
                        )}
                    </div>
                </div>
                <div class="sidebar-property-editable ${
                  warnings.some((w) => w.field === "requestedBy")
                    ? "has-warning"
                    : ""
                }">
                    <label class="prop-label">Requested By</label>
                    <div class="prop-value">
                        ${createSearchableDropdown(
      appData.users.map((u) => ({ value: u, text: u })),
      ticket.requestedBy,
      ticket.id,
      "requestedBy"
                        )}
            </div>
                </div>
                <div class="sidebar-property-editable">
                    <label class="prop-label">Project</label>
                    <div class="prop-value">
                        ${createSearchableDropdown(
                          appData.projects.map((p) => ({ value: p.id, text: p.name })),
                          ticket.projectId,
                          ticket.id,
                          "projectId",
                          "modal"
                        )}
                    </div>
                </div>
                <div class="sidebar-property-editable">
                    <label class="prop-label">Epic</label>
                    <div class="prop-value">
                        <div class="editable-field-wrapper epic-field-wrapper ${
                      ticket.epic ? "has-value" : ""
                        }">
                            <input type="text" list="epic-datalist-details" class="inline-editor epic-input" value="${escapeHtml(
      ticket.epic || ""
    )}" data-id="${ticket.id}" data-field="epic" data-old-value="${escapeHtml(
      ticket.epic || ""
    )}">
                            <i class="fas fa-times-circle clear-icon"></i>
                        </div>
                    </div>
                </div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "createdAt")
                        ? "has-warning"
                        : ""
                }">
                    <label class="prop-label">Created date</label>
                    <div class="prop-value">
                        ${createDateField(
                          "",
      ticket.createdAt,
      "createdAt",
                          ticket.id
                        )}
                    </div>
                </div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "assignedAt")
                        ? "has-warning"
                        : ""
                }">
                    <label class="prop-label">Assigned date</label>
                    <div class="prop-value">
                        ${createDateField(
                          "",
      ticket.assignedAt,
      "assignedAt",
                          ticket.id
                        )}
                    </div>
                </div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "startedAt")
                        ? "has-warning"
                        : ""
                }">
                    <label class="prop-label">Started date</label>
                    <div class="prop-value">
                        ${createDateField(
                          "",
      ticket.startedAt,
      "startedAt",
                          ticket.id
                        )}
                    </div>
                </div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "completedAt")
                        ? "has-warning"
                        : ""
                }">
                    <label class="prop-label">Completed date</label>
                    <div class="prop-value">
                        ${createDateField(
                          "",
      ticket.completedAt,
      "completedAt",
                          ticket.id
                        )}
                    </div>
                </div>
            </div>
        </div>
        ${epicDatalist}`;

    modalBody.innerHTML = mainContentHtml + sidebarHtml;

    renderSubtasks(ticket);

    modal.style.display = "flex";


    const titleTextarea = modal.querySelector("#modal-edit-title");
    const descTextarea = modal.querySelector("#modal-edit-description");
    autoSizeTextarea(titleTextarea);
    autoSizeTextarea(descTextarea);

    // Add event listeners for tag editors (status and priority)
    addTagEditorEventListeners(modal);
    
    // Add global click listener to close dropdowns when clicking outside modal
    const closeDropdownsOnClickOutside = (e) => {
      if (!e.target.closest(".jira-dropdown") && !e.target.closest(".tag-editor")) {
        modal.querySelectorAll(".jira-dropdown").forEach(dropdown => {
          dropdown.style.display = "none";
        });
      }
    };
    
    const closeDropdownsOnScroll = () => {
      modal.querySelectorAll(".jira-dropdown").forEach(dropdown => {
        if (dropdown.style.display === "block") {
          dropdown.style.display = "none";
        }
      });
    };
    
    document.addEventListener("click", closeDropdownsOnClickOutside);
    document.addEventListener("scroll", closeDropdownsOnScroll, true);
    
    // Clean up listeners when modal is closed
    const cleanup = () => {
      document.removeEventListener("click", closeDropdownsOnClickOutside);
      document.removeEventListener("scroll", closeDropdownsOnScroll, true);
    };
    
    // Store cleanup function for later use (not in dataset since it's not a string)
    modal._cleanupDropdowns = cleanup;
  }

  function addTagEditorEventListeners(modal) {
    // Add click listeners for status and priority tag editors
    const tagEditors = modal.querySelectorAll('.tag-editor.jira-style');
    
    tagEditors.forEach(editor => {
      const tag = editor.querySelector('.status-tag');
      const dropdown = editor.querySelector('.jira-dropdown');
      
      if (tag && dropdown) {
        // Toggle dropdown when tag is clicked
        tag.addEventListener('click', (e) => {
          e.stopPropagation();
          // Close other dropdowns first
          modal.querySelectorAll('.jira-dropdown').forEach(d => {
            if (d !== dropdown) d.style.display = 'none';
          });
          
          if (dropdown.style.display === 'none' || dropdown.style.display === '') {
            // Position dropdown to be fully visible
            const tagRect = tag.getBoundingClientRect();
            const dropdownWidth = 240; // min-width from CSS
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let left = tagRect.left;
            let top = tagRect.bottom + 4;
            
            // Ensure dropdown doesn't go off the right edge
            if (left + dropdownWidth > viewportWidth - 20) {
              left = viewportWidth - dropdownWidth - 20;
            }
            
            // Ensure dropdown doesn't go off the left edge
            if (left < 20) {
              left = 20;
            }
            
            // If dropdown would go off bottom, show it above the tag
            if (top + 200 > viewportHeight - 20) {
              top = tagRect.top - 200;
            }
            
            dropdown.style.position = 'fixed';
            dropdown.style.left = left + 'px';
            dropdown.style.top = top + 'px';
            dropdown.style.right = 'auto';
            dropdown.style.display = 'block';
          } else {
            dropdown.style.display = 'none';
          }
        });

        // Handle option clicks
        const options = dropdown.querySelectorAll('.jira-option');
        options.forEach(option => {
          option.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newValue = option.dataset.value;
            const ticketId = option.dataset.id;
            const field = option.dataset.field;
            
            // Update the tag display
            const tagInfo = getTagInfo(field, newValue);
            tag.className = `status-tag ${tagInfo.className}`;
            tag.textContent = tagInfo.text;
            tag.dataset.oldValue = newValue;
            
            // Add updating indicator
            tag.classList.add('updating');
            tag.innerHTML = `<i class="fas fa-spinner"></i> Updating...`;
            
            // Close dropdown
            dropdown.style.display = 'none';
            
            // Update the database with comprehensive status transition logic
            try {
              const ticket = appData.allTickets.find(t => t.id == ticketId);
              if (!ticket) {
                console.error('Ticket not found:', ticketId);
                return;
              }

              const oldValue = ticket[field]; // Get the actual current value from the ticket data
              let updates = { [field]: newValue };
              const nowIso = new Date().toISOString();

              // Apply comprehensive status transition logic
              if (field === "status") {
                const oldStatus = oldValue;
                const newStatus = newValue;
                
                // Open -> transitions
                if (oldStatus === "Open") {
                  if (newStatus === "In Progress") {
                    updates.startedAt = nowIso;
                  }
                  else if (newStatus === "On Hold") {
                    // Just change status
                  }
                  else if (newStatus === "Blocked") {
                    // Just change status
                  }
                  else if (newStatus === "Cancelled") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Rejected") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
                
                // In Progress -> transitions
                else if (oldStatus === "In Progress") {
                  if (newStatus === "Open") {
                    updates.startedAt = null;
                  }
                  else if (newStatus === "On Hold") {
                    // Just change status
                  }
                  else if (newStatus === "Blocked") {
                    // Just change status
                  }
                  else if (newStatus === "Cancelled") {
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Rejected") {
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.completedAt = nowIso;
                  }
                }
                
                // On Hold -> transitions
                else if (oldStatus === "On Hold") {
                  if (newStatus === "Open") {
                    // Just change status
                  }
                  else if (newStatus === "Blocked") {
                    // Just change status
                  }
                  else if (newStatus === "In Progress") {
                    updates.startedAt = nowIso;
                  }
                  else if (newStatus === "Rejected") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
                
                // Blocked -> transitions
                else if (oldStatus === "Blocked") {
                  if (newStatus === "Open") {
                    // Just change status
                  }
                  else if (newStatus === "On Hold") {
                    // Just change status
                  }
                  else if (newStatus === "In Progress") {
                    updates.startedAt = nowIso;
                  }
                  else if (newStatus === "Rejected") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
                
                // Cancelled -> transitions
                else if (oldStatus === "Cancelled") {
                  if (newStatus === "Open") {
                    updates.completedAt = null;
                    updates.startedAt = null;
                  }
                  else if (newStatus === "On Hold") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "In Progress") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "Rejected") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
                
                // Rejected -> transitions
                else if (oldStatus === "Rejected") {
                  if (newStatus === "Open") {
                    updates.completedAt = null;
                    updates.startedAt = null;
                  }
                  else if (newStatus === "On Hold") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "In Progress") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "Cancelled") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Completed") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
                
                // Completed -> transitions
                else if (oldStatus === "Completed") {
                  if (newStatus === "Open") {
                    updates.completedAt = null;
                    updates.startedAt = null;
                  }
                  else if (newStatus === "On Hold") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "In Progress") {
                    updates.completedAt = null;
                  }
                  else if (newStatus === "Cancelled") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                  else if (newStatus === "Rejected") {
                    updates.startedAt = nowIso;
                    updates.completedAt = nowIso;
                  }
                }
              }

              // Add log entry
              const logEntry = {
                user: appData.currentUserEmail,
                timestamp: nowIso,
                field: field,
                oldValue: oldValue,
                newValue: newValue,
                reason: null,
              };

              updates.log = Array.isArray(ticket.log)
                ? [...ticket.log, logEntry]
                : [logEntry];

              const { error } = await window.supabaseClient
                .from('ticket')
                .update(updates)
                .eq('id', ticketId);
              
              if (error) {
                console.error('Error updating ticket:', error);
                showToast(`Failed to update ${field}`, 'error');
                // Revert the change
                const oldTagInfo = getTagInfo(field, oldValue);
                tag.className = `status-tag ${oldTagInfo.className}`;
                tag.textContent = oldTagInfo.text;
                tag.dataset.oldValue = oldValue;
                tag.classList.remove('updating');
              } else {
                // Update the local data
                Object.assign(ticket, updates);
                
                // Show success indicator
                tag.classList.remove('updating');
                tag.classList.add('success');
                tag.innerHTML = `<i class="fas fa-check"></i> ${newValue}`;
                
                // Show success toast
                showToast(`${field} updated successfully`, 'success');
                
                // Update the UI
                applyFilterAndRender();
                if (currentView === "home") {
                  renderDashboard();
                }
                updateNavBadgeCounts();
                
                // Refresh the modal to show updated date fields
                showTaskDetailModal(ticketId);
                
                // Remove success indicator after 2 seconds
                setTimeout(() => {
                  tag.classList.remove('success');
                  const finalTagInfo = getTagInfo(field, newValue);
                  tag.className = `status-tag ${finalTagInfo.className}`;
                  tag.textContent = finalTagInfo.text;
                }, 2000);
              }
            } catch (error) {
              console.error('Error updating ticket:', error);
              showToast(`Failed to update ${field}`, 'error');
            }
          });
        });
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!modal.contains(e.target)) {
        modal.querySelectorAll('.jira-dropdown').forEach(dropdown => {
          dropdown.style.display = 'none';
        });
      }
    });
  }

  function createDropdown(
    options,
    selectedValue,
    id,
    field,
    type = "ticket",
    isClearable = true
  ) {
    const hasValueClass = selectedValue ? "has-value" : "";
    const placeholderClass = !selectedValue ? "placeholder-selected" : "";
    const placeholderHTML = `<option value="" disabled ${
      !selectedValue ? "selected" : ""
    }>Select...</option>`;
    const optionsHTML = options
      .map(
        (opt) =>
          `<option value="${escapeHtml(opt)}" ${
            opt === selectedValue ? "selected" : ""
          }>${escapeHtml(opt)}</option>`
      )
      .join("");
    const clearIconHTML = isClearable
      ? '<i class="fas fa-times-circle clear-icon"></i>'
      : "";
    return `<div class="editable-field-wrapper ${hasValueClass}">
                    <select class="inline-editor ${placeholderClass}" data-id="${id}" data-field="${field}" data-type="${type}" data-old-value="${escapeHtml(
      selectedValue || ""
    )}">${placeholderHTML}${optionsHTML}</select>
                    ${clearIconHTML}
                </div>`;
  }

  function createTagEditor(options, selectedValue, id, field, type = "ticket") {
    const tagInfo = getTagInfo(field, selectedValue);
    const tagHTML = `<span class="status-tag ${tagInfo.className}" 
                           data-id="${id}" 
                           data-field="${field}" 
                           data-type="${type}" 
                           data-old-value="${selectedValue !== null && selectedValue !== undefined ? escapeHtml(selectedValue) : 'null'}">${escapeHtml(
      tagInfo.text
    )}</span>`;
    const dropdownHTML = createJiraStyleDropdown(
      options,
      selectedValue,
      id,
      field,
      type
    );
    return `<div class="tag-editor jira-style">${tagHTML}${dropdownHTML}</div>`;
  }

  function createJiraStyleDropdown(options, selectedValue, id, field, type = "ticket") {
    const dropdownId = `jira-dropdown-${id}-${field}`;
    const optionsHTML = options
      .map((option) => {
        // For status field, extract the target status from transition format
        const actualValue = field === 'status' && option.includes(' → ') 
          ? option.split(' → ')[1] 
          : option;
        const tagInfo = getTagInfo(field, actualValue);
        const isSelected = actualValue === selectedValue;
        
        // For status transitions, show both current and target status tags
        let displayHTML;
        if (field === 'status' && option.includes(' → ')) {
          const [currentStatus, targetStatus] = option.split(' → ');
          const currentTagInfo = getTagInfo(field, currentStatus);
          const targetTagInfo = getTagInfo(field, targetStatus);
          
          displayHTML = `
            <div class="status-transition-option">
              <span class="jira-tag ${currentTagInfo.className}">${escapeHtml(currentStatus)}</span>
              <span class="transition-arrow">→</span>
              <span class="jira-tag ${targetTagInfo.className}">${escapeHtml(targetStatus)}</span>
            </div>
          `;
        } else {
          displayHTML = `<span class="jira-tag ${tagInfo.className}">${escapeHtml(option)}</span>`;
        }
        
        return `<div class="jira-option ${isSelected ? 'selected' : ''}" 
                        data-value="${escapeHtml(actualValue)}" 
                        data-display="${escapeHtml(option)}"
                        data-id="${id}" 
                        data-field="${field}" 
                        data-type="${type}">
                  ${displayHTML}
                </div>`;
      })
      .join("");
    
    const dropdownClass = field === 'priority' ? 'jira-dropdown priority-dropdown' : 'jira-dropdown';
    
    return `<div class="jira-dropdown-container">
              <div class="${dropdownClass}" id="${dropdownId}" style="display: none;">
                ${optionsHTML}
              </div>
            </div>`;
  }
  function createTypeTag(type) {
    const tagInfo = getTagInfo("type", type);
    let iconHTML = "";
    switch ((type || "").toLowerCase()) {
      case "bug":
        iconHTML = '<i class="fas fa-bug"></i>';
        break;
      case "request":
        iconHTML = '<i class="fas fa-inbox"></i>';
        break;
      case "task":
        iconHTML = '<i class="fas fa-tasks"></i>';
        break;
      default:
        iconHTML = '<i class="fas fa-tag"></i>';
        break;
    }
    return `<span class="type-tag ${
      tagInfo.className
    }">${iconHTML} ${escapeHtml(tagInfo.text)}</span>`;
  }
  function getTagInfo(field, value) {
    const sanitizedValue = (value || "default")
      .toLowerCase()
      .replace(/\s+/g, "-");
    const className = `${field}-${sanitizedValue}`;
    const text = value || "None";
    return { className, text };
  }
  function updatePaginationControls(page, totalItems) {
    const paginationControls = document.getElementById("pagination-controls");
    const pageInfo = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const jumpInput = document.getElementById("page-jump-input");
    const totalPages = Math.ceil(totalItems / ticketsPerPage);

    if (totalPages <= 1) {
      paginationControls.style.display = "none";
    } else {
      paginationControls.style.display = "flex";
      pageInfo.textContent = `Page ${page} of ${totalPages}`;
      prevBtn.disabled = page === 1;
      nextBtn.disabled = page === totalPages;
      jumpInput.max = totalPages;
    }
  }
  function addPaginationListeners() {
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const jumpBtn = document.getElementById("page-jump-btn");
    const jumpInput = document.getElementById("page-jump-input");

    const renderer = () =>
      currentView === "project"
        ? renderProjectPage(currentPage)
        : renderPage(currentPage);

    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderer();
      }
    });

    nextBtn.addEventListener("click", () => {
      const totalItems =
        currentView === "project"
          ? appData.displayProjects.length
          : appData.tickets.length;
      const totalPages = Math.ceil(totalItems / ticketsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderer();
      }
    });

    const jumpToPage = () => {
      const totalItems =
        currentView === "project"
          ? appData.displayProjects.length
          : appData.tickets.length;
      const totalPages = Math.ceil(totalItems / ticketsPerPage);
      const page = parseInt(jumpInput.value, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderer();
      }
      jumpInput.value = "";
    };

    jumpBtn.addEventListener("click", jumpToPage);
    jumpInput.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        jumpToPage();
      }
    });
  }

  function getTicketWarnings(ticket) {
    const warnings = [];
    const {
      status,
      assigneeId,
      assignedAt,
      startedAt,
      completedAt,
      createdAt,
      requestedBy,
    } = ticket;

    // --- Basic Field Checks ---
    if (!requestedBy)
      warnings.push({
        field: "requestedBy",
        message: "Ticket is missing Requested By.",
      });
    if (!createdAt)
      warnings.push({
        field: "createdAt",
        message: "Ticket is missing a Created At date.",
      });

    // --- Status-Dependent Date Checks ---
    if (status === "In Progress") {
      if (!startedAt)
        warnings.push({
          field: "startedAt",
          message: "In Progress ticket is missing a Started At date.",
        });
      if (!assignedAt)
        warnings.push({
          field: "assignedAt",
          message: "In Progress ticket is missing an Assigned At date.",
        });
    }

    if (["Completed", "Cancelled", "Rejected"].includes(status)) {
      if (!startedAt)
        warnings.push({
          field: "startedAt",
          message: `A ${status} ticket should have a Started At date.`,
        });
      if (!completedAt)
        warnings.push({
          field: "completedAt",
          message: `A ${status} ticket should have a Completed At date.`,
        });
      if (!assignedAt)
        warnings.push({
          field: "assignedAt",
          message: `A ${status} ticket should have an Assigned At date.`,
        });
    }

    if (assigneeId && !assignedAt)
      warnings.push({
        field: "assignedAt",
        message: "Ticket has an assignee but is missing an Assigned At date.",
      });

    // --- Date Logic Validation ---
    const toDate = (isoString) => {
      if (!isoString) return null;
      const date = new Date(isoString);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const createdDate = toDate(createdAt);
    const assignedDate = toDate(assignedAt);
    const startedDate = toDate(startedAt);
    const completedDate = toDate(completedAt);

    if (assignedDate && createdDate && assignedDate < createdDate)
      warnings.push({
        field: "assignedAt",
        message: "Assigned At date cannot be earlier than Created At date.",
      });
    if (startedDate && createdDate && startedDate < createdDate)
      warnings.push({
        field: "startedAt",
        message: "Started At date cannot be earlier than Created At date.",
      });
    if (startedDate && assignedDate && startedDate < assignedDate)
      warnings.push({
        field: "startedAt",
        message: "Started At date cannot be earlier than Assigned At date.",
      });
    if (completedDate && createdDate && completedDate < createdDate)
      warnings.push({
        field: "completedAt",
        message: "Completed At date cannot be earlier than Created At date.",
      });
    if (completedDate && assignedDate && completedDate < assignedDate)
      warnings.push({
        field: "completedAt",
        message: "Completed At date cannot be earlier than Assigned At date.",
      });
    if (completedDate && startedDate && completedDate < startedDate)
      warnings.push({
        field: "completedAt",
        message: "Completed At date cannot be earlier than Started At date.",
      });

    return warnings;
  }

  function formatTicketAge(createdAtIsoString) {
    if (!createdAtIsoString) return { text: "", isOverdue: false };
    const now = new Date();
    const createdAt = new Date(createdAtIsoString);
    now.setHours(0, 0, 0, 0);
    createdAt.setHours(0, 0, 0, 0);
    const diffTime = now - createdAt;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let text =
      diffDays === 0
        ? "Today"
        : diffDays === 1
        ? "Yesterday"
        : `${diffDays} days`;
    if (diffDays < 0) text = "Future";
    return { text: text, isOverdue: diffDays > 5 };
  }
  // REPLACE the existing updateNavBadgeCounts function in JavaScript.html

  function updateNavBadgeCounts() {
    const myTicketCountEl = document.getElementById("my-ticket-count");
    const unassignedCountEl = document.getElementById("unassigned-count");
    const incompleteCountEl = document.getElementById("incomplete-count");
    const criticalCountEl = document.getElementById("critical-count");
    const stalledCountEl = document.getElementById("stalled-count");
    const allTicketsCountEl = document.getElementById("all-tickets-count");
    
    if (!myTicketCountEl || !unassignedCountEl || !incompleteCountEl) return;

    const doneStatuses = ["Completed", "Rejected", "Cancelled"];

    // MODIFIED: Filter by assigneeId and the current user's ID
    const myTicketCount = appData.allTickets.filter((t) => {
      const isAssignedToCurrentUser = t.assigneeId == appData.currentUserId;
      const isNotCompleted = excludeDoneSettings['my-ticket'] ? !doneStatuses.includes(t.status) : true;
      return isAssignedToCurrentUser && isNotCompleted;
    }).length;

    // MODIFIED: Filter where assigneeId is null or undefined
    const unassignedCount = appData.allTickets.filter((t) => {
      const isUnassigned = t.assigneeId == null;
      const isNotCompleted = excludeDoneSettings['unassigned'] ? !doneStatuses.includes(t.status) : true;
      return isUnassigned && isNotCompleted;
    }).length;

    // Count tickets with incomplete data (default to current user)
    const incompleteCount = appData.allTickets.filter((t) => {
      const warnings = getTicketWarnings(t);
      return warnings.length > 0 && t.assigneeId == appData.currentUserId;
    }).length;

    // Count critical tickets (Urgent or High priority assigned to current user)
    const criticalCount = appData.allTickets.filter((t) => {
      const isHighPriority = t.priority === "Urgent" || t.priority === "High";
      const isAssignedToCurrentUser = t.assigneeId == appData.currentUserId;
      const isNotCompleted = excludeDoneSettings['critical'] ? !doneStatuses.includes(t.status) : true;
      return isHighPriority && isAssignedToCurrentUser && isNotCompleted;
    }).length;

    // Count stalled tickets (On Hold or Blocked assigned to current user)
    const stalledCount = appData.allTickets.filter((t) => {
      const isStalledStatus = t.status === "On Hold" || t.status === "Blocked";
      const isAssignedToCurrentUser = t.assigneeId == appData.currentUserId;
      return isStalledStatus && isAssignedToCurrentUser;
    }).length;

    // Count all tickets (respecting excludeDone for consistency)
    const allTicketsCount = excludeDoneSettings['all'] 
      ? appData.allTickets.filter((t) => !doneStatuses.includes(t.status)).length
      : appData.allTickets.length;

    myTicketCountEl.textContent = myTicketCount;
    myTicketCountEl.style.display = myTicketCount > 0 ? "inline-block" : "none";

    unassignedCountEl.textContent = unassignedCount;
    unassignedCountEl.style.display =
      unassignedCount > 0 ? "inline-block" : "none";

    incompleteCountEl.textContent = incompleteCount;
    incompleteCountEl.style.display =
      incompleteCount > 0 ? "inline-block" : "none";

    if (criticalCountEl) {
      criticalCountEl.textContent = criticalCount;
      criticalCountEl.style.display = criticalCount > 0 ? "inline-block" : "none";
    }

    if (stalledCountEl) {
      stalledCountEl.textContent = stalledCount;
      stalledCountEl.style.display = stalledCount > 0 ? "inline-block" : "none";
    }

    if (allTicketsCountEl) {
      allTicketsCountEl.textContent = allTicketsCount;
      allTicketsCountEl.style.display = allTicketsCount > 0 ? "inline-block" : "none";
    }
  }

  function createSearchableDropdown(
    options,
    selectedValue,
    id,
    field,
    type = "ticket",
    isClearable = true
  ) {
    const hasValueClass =
      selectedValue || selectedValue === 0 ? "has-value" : "";
    const selectedOption = options.find((opt) => opt.value == selectedValue);
    const selectedText = selectedOption ? selectedOption.text : selectedValue || "";
    const clearIconHTML = isClearable
      ? '<i class="fas fa-times-circle clear-icon"></i>'
      : "";
    
    // Add remove button for specific fields in modal context
     const removeButtonHTML = (type === "modal" && (field === "assigneeId" || field === "projectId" || field === "epic") && selectedValue)
       ? `<button class="remove-field-btn" data-field="${field}" data-ticket-id="${id}" title="Remove ${field === 'assigneeId' ? 'Assignee' : field === 'projectId' ? 'Project' : 'Epic'}"><i class="fas fa-times-circle clear-icon"></i></button>`
      : "";
    
    // Create a combined options list that includes the current value even if not in options
    const combinedOptions = [...options];
    if (selectedValue && selectedValue !== "" && !selectedOption) {
      // Add the current value to options if it's not already there (for inactive users)
      combinedOptions.unshift({ value: selectedValue, text: selectedValue });
    }
    
    let html = `<div class="editable-field-wrapper ${hasValueClass}">
                    <div class="searchable-dropdown">
                        <input type="text" class="searchable-dropdown-input" value="${escapeHtml(
                          selectedText
                        )}" placeholder="Search..." data-id="${id}" data-field="${field}" data-type="${type}" data-old-value="${escapeHtml(
      selectedValue || ""
    )}" data-value="${escapeHtml(selectedValue || "")}" autocomplete="off">
                        <div class="searchable-dropdown-list">`;
    combinedOptions.forEach((opt) => {
      html += `<div data-value="${escapeHtml(opt.value)}">${escapeHtml(
        opt.text
      )}</div>`;
    });
    html += `</div></div>${clearIconHTML}${removeButtonHTML}</div>`;
    return html;
  }

  function createMultiSelectDropdown(
    options,
    selectedValuesStr,
    id,
    field,
    type = "project"
  ) {
    const selectedValues = selectedValuesStr
      ? selectedValuesStr.split(",").map((s) => s.trim())
      : [];

    let pillsHTML = selectedValues
      .map(
        (val) =>
          `<span class="multi-select-pill">${escapeHtml(
            val
          )}<i class="fas fa-times remove-pill" data-value="${escapeHtml(
            val
          )}"></i></span>`
      )
      .join("");
    if (pillsHTML === "")
      pillsHTML = `<span class="multi-select-placeholder">Select...</span>`;

    const optionsHTML = options
      .map((opt) => {
        const isChecked = selectedValues.includes(opt);
        return `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(
          opt
        )}" ${isChecked ? "checked" : ""}>${escapeHtml(opt)}</label>`;
      })
      .join("");

    return `<div class="multi-select-container" data-id="${id}" data-field="${field}" data-type="${type}" data-old-value="${escapeHtml(
      selectedValuesStr || ""
    )}">
                    <div class="multi-select-pills">${pillsHTML}</div>
                    <div class="multi-select-dropdown">${optionsHTML}</div>
                </div>`;
  }
  function copyTicketInfo(event) {
    const ticketId = event.target.dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;
    const copyText = `[HRB-${ticket.id || "No ID"}] - Project: ${
      ticket.projectName || "No Project"
    } / Epic: ${ticket.epic || "No Epic"} / ${ticket.title || "No Title"}`;
    navigator.clipboard
      .writeText(copyText)
      .then(() => showToast("Ticket summary copied!", "success"))
      .catch((err) => showToast("Failed to copy text.", "error"));
  }
  function showWarnings(event) {
    const ticketId = event.target.dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;
    const warnings = getTicketWarnings(ticket);
    const modalBody = document.getElementById("warning-content");
    modalBody.innerHTML =
      warnings.length === 0
        ? "<p>No warnings for this ticket.</p>"
        : "<ul>" +
          warnings.map((w) => `<li>${escapeHtml(w.message)}</li>`).join("") +
          "</ul>";
    document.getElementById("warning-modal").style.display = "flex";
  }
  function updateMultiSelectPills(container) {
    const pillsContainer = container.querySelector(".multi-select-pills");
    const selectedValues = Array.from(
      container.querySelectorAll("input:checked")
    ).map((cb) => cb.value);
    let pillsHTML = selectedValues
      .map(
        (val) =>
          `<span class="multi-select-pill">${escapeHtml(
            val
          )}<i class="fas fa-times remove-pill" data-value="${escapeHtml(
            val
          )}"></i></span>`
      )
      .join("");
    if (pillsHTML === "")
      pillsHTML = `<span class="multi-select-placeholder">Select...</span>`;
    pillsContainer.innerHTML = pillsHTML;
  }
  function updateMultiSelectOnClose(container) {
    const selected = Array.from(
      container.querySelectorAll("input:checked")
    ).map((cb) => cb.value);
    const newValue = selected.join(", ");
    handleProjectUpdate({ target: container }, newValue);
  }
  // REPLACE the existing openAddTaskModal function
  function openAddTaskModal() {
    const modal = document.getElementById("add-task-modal");
    const ticketsTbody = document.getElementById("new-tickets-tbody");
    if (ticketsTbody) {
      ticketsTbody.innerHTML = "";
    }

    modal
      .querySelectorAll(".left-panel input, .left-panel select")
      .forEach((el) => {
        if (el.type !== "checkbox" && el.type !== "button") el.value = "";
      });
    modal
      .querySelectorAll(".left-panel .searchable-dropdown-input")
      .forEach((el) => {
        el.value = "";
        el.dataset.value = "";
      });

    document.getElementById("bulk-add-created-date").value = new Date()
      .toISOString()
      .split("T")[0];

    document.getElementById("bulk-add-project-select").innerHTML =
      '<option value="">-- No Project --</option>' +
      appData.projects
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");
    document.getElementById("epic-datalist-bulk-add").innerHTML = appData.epics
      .map((e) => `<option value="${escapeHtml(e)}">`)
      .join("");
    document.getElementById("bulk-add-requested-by").innerHTML =
      '<option value="">-- Select --</option>' +
      appData.users
        .map(
          (u) =>
            `<option value="${u}" ${
              u === appData.currentUserName ? "selected" : ""
            }>${escapeHtml(u)}</option>`
        )
        .join("");
    createSearchableDropdownForModal(
      document.getElementById("bulk-add-assignee-container"),
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      "Select assignee..."
    );

    const assigneeContainer = document.getElementById(
      "bulk-add-assignee-container"
    );
    const assigneeInput = assigneeContainer.querySelector("input");
    const assignedDateContainer = document.getElementById(
      "bulk-add-assigned-date-container"
    );
    const assignedDateInput = document.getElementById("bulk-add-assigned-date");

    const checkAssignee = () => {
      const hasValue = !!assigneeInput.dataset.value;
      assignedDateContainer.style.display = hasValue ? "flex" : "none";
      if (hasValue && !assignedDateInput.value) {
        assignedDateInput.value = new Date().toISOString().split("T")[0];
      }
    };

    if (appData.currentUserId && appData.currentUserName) {
      assigneeInput.value = appData.currentUserName;
      assigneeInput.dataset.value = appData.currentUserId;
      assigneeContainer
        .querySelector(".editable-field-wrapper")
        ?.classList.add("has-value");
    }

    checkAssignee();

    const observer = new MutationObserver(checkAssignee);
    observer.observe(assigneeInput, {
      attributes: true,
      attributeFilter: ["data-value"],
    });

    const statusSelect = document.getElementById("bulk-add-status");
    statusSelect.innerHTML = `
      <option selected>Open</option>
      <option>In Progress</option>
      <option>Completed</option>
  `;
    statusSelect.value = "Open";

    const startedContainer = document.getElementById(
      "bulk-add-started-date-container"
    );
    const completedContainer = document.getElementById(
      "bulk-add-completed-date-container"
    );
    statusSelect.addEventListener("change", (e) => {
      const status = e.target.value;
      const today = new Date().toISOString().split("T")[0];
      startedContainer.style.display =
        status === "In Progress" || status === "Completed" ? "flex" : "none";
      completedContainer.style.display =
        status === "Completed" ? "flex" : "none";

      if (
        (status === "In Progress" || status === "Completed") &&
        !document.getElementById("bulk-add-started-date").value
      ) {
        document.getElementById("bulk-add-started-date").value = today;
      }
      if (
        status === "Completed" &&
        !document.getElementById("bulk-add-completed-date").value
      ) {
        document.getElementById("bulk-add-completed-date").value = today;
      }
    });

    // MODIFIED: This logic now directly hides/shows the left panel
    const toggle = document.getElementById("bulk-settings-toggle");
    const leftPanel = document.querySelector("#add-task-modal .left-panel");

    const handleToggle = () => {
      const isBulkOn = toggle.checked;
      const modalBody = document.querySelector("#add-task-modal .modal-body");
      
      if (isBulkOn) {
        // When bulk settings are ON, show the full left panel
        leftPanel.style.display = "flex";
        
        // Show all bulk fields
        leftPanel.querySelectorAll(".detail-field").forEach(field => {
          field.style.display = "";
        });
        
        // Hide Jira-style form
        const jiraForm = document.getElementById("jira-style-form");
        if (jiraForm) {
          jiraForm.style.display = "none";
        }
        
        // Remove Jira layout class
        modalBody.classList.remove("jira-layout");
        
        // Show the table-based ticket rows
        const ticketsTable = document.querySelector("#add-task-modal .right-panel");
        if (ticketsTable) {
          ticketsTable.style.display = "block";
        }
        
        // Show the original modal footer when using bulk settings
        const modalFooter = document.querySelector("#add-task-modal .modal-footer");
        if (modalFooter) {
          modalFooter.style.display = "block";
        }
        
        // Resize modal to fit bulk settings content
        const modalContent = document.querySelector("#add-task-modal .modal-content");
        if (modalContent) {
          modalContent.style.maxWidth = "95%";
          modalContent.style.width = "fit-content";
          modalContent.style.minWidth = "1200px";
        }
        
      } else {
        // When bulk settings are OFF, create Jira-style layout
        leftPanel.style.display = "none";
        
        // Create Jira-style form if it doesn't exist
        if (!document.getElementById("jira-style-form")) {
          createJiraStyleForm();
        }
        
        // Show Jira-style form
        const jiraForm = document.getElementById("jira-style-form");
        if (jiraForm) {
          jiraForm.style.display = "block";
        }
        
        // Add Jira layout class
        modalBody.classList.add("jira-layout");
        
        // Hide the table-based ticket rows and right panel
        const ticketsTable = document.querySelector("#add-task-modal .right-panel");
        if (ticketsTable) {
          ticketsTable.style.display = "none";
        }
        
        // Show the modal footer for Jira form (submit button will handle both cases)
        const modalFooter = document.querySelector("#add-task-modal .modal-footer");
        if (modalFooter) {
          modalFooter.style.display = "block";
        }
        
        // Resize modal to 35% of screen width
        const modalContent = document.querySelector("#add-task-modal .modal-content");
        if (modalContent) {
          modalContent.style.maxWidth = "35vw";
          modalContent.style.width = "35vw";
          modalContent.style.minWidth = "unset";
        }
      }
    };

    toggle.removeEventListener("change", handleToggle); // Remove old listener to prevent duplicates
    toggle.addEventListener("change", handleToggle);

    // Set initial state from the checkbox
    handleToggle();

    addTicketRowToModal();
    modal.style.display = "flex";
  }

  // Create Jira-style form for when bulk settings are OFF
  function createJiraStyleForm() {
    const modalBody = document.querySelector("#add-task-modal .modal-body");
    
    const jiraForm = document.createElement("div");
    jiraForm.id = "jira-style-form";
    jiraForm.style.display = "none";
    jiraForm.innerHTML = `
        <div class="jira-form-content">
          <div class="jira-field-group">
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-folder"></i> Project</label>
              <div id="jira-project" class="jira-dropdown-container"></div>
            </div>
            
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-tags"></i> Epic</label>
              <input type="text" id="jira-epic" class="jira-input" placeholder="Type or select an epic..." list="jira-epic-datalist" />
              <datalist id="jira-epic-datalist"></datalist>
            </div>
          </div>
          
          <div class="jira-field-group">
            <div class="jira-field">
              <label class="jira-label required"><i class="fas fa-tag"></i> Type</label>
              <select id="jira-issue-type" class="jira-select">
                <option value="Task" selected>Task</option>
                <option value="Bug">Bug</option>
                <option value="Request">Request</option>
              </select>
            </div>
            
            <div class="jira-field">
              <label class="jira-label required"><i class="fas fa-exclamation-triangle"></i> Priority</label>
              <select id="jira-priority" class="jira-select">
                <option value="Low">Low</option>
                <option value="Medium" selected>Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          
          <div class="jira-field-group single-column">
            <div class="jira-field">
              <label class="jira-label required"><i class="fas fa-heading"></i> Title</label>
              <input type="text" id="jira-summary" class="jira-input" placeholder="Enter ticket title" />
            </div>
          </div>
          
          <div class="jira-field-group single-column">
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-align-left"></i> Description</label>
              <textarea id="jira-description" class="jira-textarea" rows="4" placeholder="Enter description"></textarea>
            </div>
          </div>
          
          
          <div class="jira-field-group">
            <div class="jira-field">
              <label class="jira-label required"><i class="fas fa-info-circle"></i> Status</label>
              <select id="jira-status" class="jira-select">
                <option value="Open" selected>Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <div class="jira-field">
              <label class="jira-label required"><i class="fas fa-calendar-plus"></i> Created At</label>
              <input type="date" id="jira-created-date" class="jira-input" />
            </div>
          </div>
          
          <!-- Conditional fields -->
          <div id="jira-conditional-fields" class="jira-field-group" style="display: none;">
            <!-- Started At (shown when In Progress or Completed) -->
            <div id="jira-started-at-field" class="jira-field" style="display: none;">
              <label class="jira-label required"><i class="fas fa-play"></i> Started At</label>
              <input type="date" id="jira-started-at" class="jira-input" />
            </div>
            
            <!-- Assigned At (shown when assignee is not null) -->
            <div id="jira-assigned-at-field" class="jira-field" style="display: none;">
              <label class="jira-label required"><i class="fas fa-user-check"></i> Assigned At</label>
              <input type="date" id="jira-assigned-at" class="jira-input" />
            </div>
            
            <!-- Completed At (shown when Completed) -->
            <div id="jira-completed-at-field" class="jira-field" style="display: none;">
              <label class="jira-label required"><i class="fas fa-check-circle"></i> Completed At</label>
              <input type="date" id="jira-completed-at" class="jira-input" />
            </div>
          </div>
          
          <div class="jira-field-group">
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-user"></i> Requested By</label>
              <div id="jira-reporter" class="jira-dropdown-container"></div>
            </div>
            
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-user-tie"></i> Assignee</label>
              <div id="jira-assignee" class="jira-dropdown-container"></div>
            </div>
          </div>
          
          <!-- Subtasks section at bottom -->
          <div class="jira-field-group single-column">
            <div class="jira-field">
              <label class="jira-label"><i class="fas fa-tasks"></i> Subtasks</label>
              <div class="jira-subtasks-section">
                <div id="jira-subtasks-list"></div>
                <button id="add-subtask-btn" class="jira-btn secondary">
                  <i class="fas fa-plus"></i> Add Subtask
                </button>
              </div>
            </div>
          </div>
        
      </div>
    `;
    
    modalBody.appendChild(jiraForm);
    
    // Initialize the form
    initializeJiraForm();
  }

  // Handle status change for conditional fields
  function handleStatusChange() {
    const status = document.getElementById("jira-status").value;
    const conditionalFields = document.getElementById("jira-conditional-fields");
    const startedAtField = document.getElementById("jira-started-at-field");
    const completedAtField = document.getElementById("jira-completed-at-field");
    
    // Show conditional fields container if any field should be visible
    if (status === "In Progress" || status === "Completed") {
      conditionalFields.style.display = "flex";
      startedAtField.style.display = "block";
      
      if (status === "Completed") {
        completedAtField.style.display = "block";
      } else {
        completedAtField.style.display = "none";
      }
    } else {
      startedAtField.style.display = "none";
      completedAtField.style.display = "none";
      
      // Hide container if no conditional fields are visible
      if (document.getElementById("jira-assigned-at-field").style.display === "none") {
        conditionalFields.style.display = "none";
      }
    }
  }
  
  // Handle assignee change for conditional fields
  function handleAssigneeChange() {
    const assigneeSelect = document.getElementById("jira-assignee-select");
    const assignee = assigneeSelect ? assigneeSelect.value : null;
    const conditionalFields = document.getElementById("jira-conditional-fields");
    const assignedAtField = document.getElementById("jira-assigned-at-field");
    
    if (assignee) {
      conditionalFields.style.display = "flex";
      assignedAtField.style.display = "block";
    } else {
      assignedAtField.style.display = "none";
      
      // Hide container if no conditional fields are visible
      if (document.getElementById("jira-started-at-field").style.display === "none" && 
          document.getElementById("jira-completed-at-field").style.display === "none") {
        conditionalFields.style.display = "none";
      }
    }
  }

  // Initialize Jira-style form
  function initializeJiraForm() {
    // Initialize Project dropdown as searchable
    createSearchableDropdownForModal(
      document.getElementById("jira-project"),
      appData.projects.map(p => ({ value: p.id, text: p.name })),
      "Select Project..."
    );
    
    // Initialize Requested By dropdown as simple select
    console.log("Initializing Requested By dropdown with users:", appData.users);
    const reporterContainer = document.getElementById("jira-reporter");
    if (reporterContainer && appData.users && appData.users.length > 0) {
      reporterContainer.innerHTML = `
        <select class="jira-select" id="jira-reporter-select">
          <option value="">Select User...</option>
          ${appData.users.map(u => `<option value="${u}">${u}</option>`).join('')}
        </select>
      `;
      console.log("Requested By dropdown initialized successfully");
    } else {
      console.error("Requested By dropdown not initialized - missing container or users data");
      reporterContainer.innerHTML = '<input type="text" class="jira-input" placeholder="Select User..." readonly>';
    }
    
    // Initialize Assignee dropdown as simple select
    console.log("Initializing Assignee dropdown with team members:", appData.teamMembers);
    const assigneeContainer = document.getElementById("jira-assignee");
    if (assigneeContainer && appData.teamMembers && appData.teamMembers.length > 0) {
      assigneeContainer.innerHTML = `
        <select class="jira-select" id="jira-assignee-select">
          <option value="">Select Assignee...</option>
          ${appData.teamMembers.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
        </select>
      `;
      console.log("Assignee dropdown initialized successfully");
    } else {
      console.error("Assignee dropdown not initialized - missing container or team members data");
      assigneeContainer.innerHTML = '<input type="text" class="jira-input" placeholder="Select Assignee..." readonly>';
    }
    
    
    // Populate epic datalist
    const epicDatalist = document.getElementById("jira-epic-datalist");
    epicDatalist.innerHTML = appData.epics.map(e => `<option value="${escapeHtml(e)}">`).join("");
    
    // Set today's date as default
    document.getElementById("jira-created-date").value = new Date().toISOString().split('T')[0];
    
    // Add event listeners for conditional fields
    document.getElementById("jira-status").addEventListener("change", handleStatusChange);
    
    // Add event listener for assignee dropdown (simple select)
    const assigneeSelect = document.getElementById("jira-assignee-select");
    if (assigneeSelect) {
      assigneeSelect.addEventListener("change", handleAssigneeChange);
    }
    
    // Add event listeners
    document.getElementById("add-subtask-btn").addEventListener("click", addJiraSubtask);
    
    // Jira form buttons removed - handled by main modal footer
    
    // Initialize conditional fields
    handleStatusChange();
    handleAssigneeChange();
    
    // Add periodic check for assignee changes (fallback)
    const assigneeCheckInterval = setInterval(() => {
      handleAssigneeChange();
    }, 1000);
    
    // Clear interval when modal is closed
    const modal = document.getElementById("add-task-modal");
    if (modal) {
      const observer = new MutationObserver(() => {
        if (modal.style.display === "none") {
          clearInterval(assigneeCheckInterval);
        }
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }
  }

  // Add subtask to Jira-style form
  function addJiraSubtask() {
    const subtasksList = document.getElementById("jira-subtasks-list");
    
    const subtaskDiv = document.createElement("div");
    subtaskDiv.className = "jira-subtask-item";
    subtaskDiv.innerHTML = `
      <input type="checkbox" class="jira-subtask-checkbox-input" />
      <input type="text" class="jira-subtask-summary" placeholder="Subtask title" />
      <button class="jira-subtask-remove" type="button">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    subtasksList.appendChild(subtaskDiv);
    
    // Add remove event listener
    subtaskDiv.querySelector(".jira-subtask-remove").addEventListener("click", () => {
      subtaskDiv.remove();
    });
  }

  // Submit Jira-style form
  function submitJiraForm() {
    const formData = {
      projectId: document.querySelector("#jira-project input")?.dataset.value,
      type: document.getElementById("jira-issue-type").value,
      title: document.getElementById("jira-summary").value,
      requestedBy: document.getElementById("jira-reporter-select")?.value,
      description: document.getElementById("jira-description").value,
      assigneeId: document.getElementById("jira-assignee-select")?.value,
      priority: document.getElementById("jira-priority").value,
      epic: document.getElementById("jira-epic").value,
      status: document.getElementById("jira-status").value,
      createdAt: document.getElementById("jira-created-date").value,
      startedAt: document.getElementById("jira-started-at").value || null,
      assignedAt: document.getElementById("jira-assigned-at").value || null,
      completedAt: document.getElementById("jira-completed-at").value || null,
      subtasks: []
    };
    
    // Collect subtasks (checkbox style)
    document.querySelectorAll(".jira-subtask-item").forEach(subtask => {
      const checkbox = subtask.querySelector(".jira-subtask-checkbox-input");
      const title = subtask.querySelector(".jira-subtask-summary").value;
      
      if (title.trim()) {
        formData.subtasks.push({
          title: title.trim(),
          completed: checkbox.checked
        });
      }
    });
    
    // Validate required fields
    const errors = [];
    if (!formData.type) errors.push("Type");
    if (!formData.priority) errors.push("Priority");
    if (!formData.title) errors.push("Title");
    if (!formData.status) errors.push("Status");
    if (!formData.createdAt) errors.push("Created At");
    
    // Validate conditional required fields
    if (formData.status === "In Progress" && !formData.startedAt) {
      errors.push("Started At");
    }
    if (formData.assigneeId && !formData.assignedAt) {
      errors.push("Assigned At");
    }
    if (formData.status === "Completed") {
      if (!formData.startedAt) errors.push("Started At");
      if (!formData.completedAt) errors.push("Completed At");
    }
    
    if (errors.length > 0) {
      showToast(`Please fill in all required fields: ${errors.join(", ")}`, "error");
      return;
    }
    
    // Process the form data and create tickets
    processJiraFormData(formData);
  }

  // Process Jira form data and create tickets
  async function processJiraFormData(formData) {
    // Convert Jira form data to ticket format and create tickets
    const tickets = [];
    
    // Main ticket
    const mainTicket = {
      title: formData.title,
      description: formData.description || "",
      type: formData.type,
      priority: formData.priority,
      projectId: formData.projectId,
      epic: formData.epic || null,
      requestedBy: formData.requestedBy || null,
      assigneeId: formData.assigneeId || null,
      status: formData.status,
      createdAt: formData.createdAt ? new Date(formData.createdAt).toISOString() : new Date().toISOString(),
      startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : null,
      assignedAt: formData.assignedAt ? new Date(formData.assignedAt).toISOString() : null,
      completedAt: formData.completedAt ? new Date(formData.completedAt).toISOString() : null
    };
    
    // Add subtasks to the main ticket in JSONB format
    if (formData.subtasks.length > 0) {
      mainTicket.subtask = formData.subtasks.map(subtask => ({
        done: subtask.completed,
        text: subtask.title
      }));
    }
    
    tickets.push(mainTicket);
    
    // Create tickets using existing functionality
    try {
      // Remove manual ID assignment - let database auto-generate IDs
      // This prevents duplicate key constraint violations
      tickets.forEach((ticket, index) => {
        // ticket.id = nextId + index; // REMOVED to prevent duplicate key violations
        
        // Convert string IDs to numbers
        if (ticket.projectId) ticket.projectId = parseInt(ticket.projectId, 10);
        if (ticket.assigneeId) ticket.assigneeId = parseInt(ticket.assigneeId, 10);
        
        // Add required fields
        ticket.log = [];
      });
      
      // Use Supabase directly like the existing ticket creation
      const { data: insertedTickets, error } = await window.supabaseClient
        .from("ticket")
        .insert(tickets)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      if (insertedTickets && insertedTickets.length > 0) {
        showToast(`Successfully created ${insertedTickets.length} ticket(s)`, "success");
        
        // Update frontend state with new tickets
        await updateTicketDataAfterCreation(insertedTickets);
        
        // Send Discord notification
        await sendDiscordNotificationViaApi(insertedTickets, appData.currentUserName);
        
        document.getElementById("add-task-modal").style.display = "none";
      } else {
        throw new Error("No tickets were created");
      }
    } catch (error) {
      showToast(`Error creating tickets: ${error.message}`, "error");
    }
  }

  // REPLACE the existing addTicketRowToModal function
  function addTicketRowToModal() {
    const tbody = document.getElementById("new-tickets-tbody");
    const uniqueId = `adv-row-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    const mainRow = document.createElement("tr");
    mainRow.className = "main-ticket-row";
    const advancedRow = document.createElement("tr");
    advancedRow.className = "advanced-fields-row";
    advancedRow.style.display = "none";

    const typeOptions = ["Task", "Bug", "Request"]
      .map((o) => `<option value="${o}">${o}</option>`)
      .join("");
    const priorityOptions = ["Medium", "High", "Urgent", "Low"]
      .map(
        (o) =>
          `<option value="${o}" ${
            o === "Medium" ? "selected" : ""
          }>${o}</option>`
      )
      .join("");

    mainRow.innerHTML = `
        <td><input type="text" class="new-ticket-title" placeholder="Title (Required)"></td>
        <td><textarea class="new-ticket-description" placeholder="Description (Optional)" rows="1"></textarea></td>
        <td><select class="new-ticket-type">${typeOptions}</select></td>
        <td><select class="new-ticket-priority">${priorityOptions}</select></td>
        <td style="text-align: center; vertical-align: middle;">
            <div style="display: flex; gap: 4px; justify-content: center;">
                 <button class="advanced-toggle-btn" title="Override Bulk Settings"><i class="fas fa-sliders-h toggle-icon"></i></button>
                 <button class="remove-ticket-row-btn" title="Remove this ticket"><i class="fas fa-trash-alt"></i></button>
            </div>
        </td>`;

    advancedRow.innerHTML = `<td colspan="5">
        <div class="advanced-fields-container">
            <div class="detail-field">
                <label><i class="fas fa-folder fa-fw"></i>Project</label>
                <select class="inline-editor override-project"></select>
            </div>
            <div class="detail-field">
                <label><i class="fas fa-bolt fa-fw"></i>Epic</label>
                <input type="text" class="inline-editor override-epic" list="epic-datalist-bulk-add" placeholder="Type or select an epic...">
            </div>
            <div class="detail-field">
                <label><i class="fas fa-user-tag fa-fw"></i>Requested By</label>
                <select class="inline-editor override-requested-by"></select>
            </div>
            <div class="detail-field">
                <label><i class="fas fa-user-check fa-fw"></i>Assignee</label>
                <div class="override-assignee-container"></div>
            </div>
            <div class="detail-field">
            <div class="detail-field">
                <label><i class="fas fa-flag fa-fw"></i>Status</label>
                <select class="inline-editor override-status">
                    <option value="">-- Use Bulk Setting --</option>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                </select>
            </div>
            <div class="detail-field">
                <label><i class="fas fa-calendar-plus fa-fw"></i>Created Date</label>
                <input type="date" class="inline-editor override-created-date">
            </div>
            <div class="detail-field override-assigned-date-container">
                <label><i class="fas fa-calendar-alt fa-fw"></i>Assigned Date</label>
                <input type="date" class="inline-editor override-assigned-date">
            </div>
            <div class="detail-field override-started-date-container">
                <label><i class="fas fa-calendar-alt fa-fw"></i>Started Date</label>
                <input type="date" class="inline-editor override-started-date">
            </div>
            <div class="detail-field override-completed-date-container">
                <label><i class="fas fa-calendar-alt fa-fw"></i>Completed Date</label>
                <input type="date" class="inline-editor override-completed-date">
            </div>
        </div>
    </td>`;

    tbody.appendChild(mainRow);
    tbody.appendChild(advancedRow);

    const advCell = advancedRow.querySelector("td");
    advCell.querySelector(".override-project").innerHTML =
      '<option value="">-- Use Bulk Setting --</option>' +
      appData.projects
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");
    advCell.querySelector(".override-requested-by").innerHTML =
      '<option value="">-- Use Bulk Setting --</option>' +
      appData.users
        .map((u) => `<option value="${u}">${escapeHtml(u)}</option>`)
        .join("");

    const assigneeContainer = advCell.querySelector(
      ".override-assignee-container"
    );
    assigneeContainer.id = `assignee-container-${uniqueId}`;

    createSearchableDropdownForModal(
      assigneeContainer,
      [
        { value: "", text: "-- Use Bulk Setting --" },
        ...appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      ],
      "Select assignee..."
    );

    const advAssigneeInput = advCell.querySelector(
      ".override-assignee-container input"
    );
    const advAssignedDateContainer = advCell.querySelector(
      ".override-assigned-date-container"
    );
    const observer = new MutationObserver(() => {
      advAssignedDateContainer.style.display = advAssigneeInput.dataset.value
        ? "flex"
        : "none";
    });
    observer.observe(advAssigneeInput, {
      attributes: true,
      attributeFilter: ["data-value"],
    });

    const advStatusSelect = advCell.querySelector(".override-status");
    const advStartedDateContainer = advCell.querySelector(
      ".override-started-date-container"
    );
    const advCompletedDateContainer = advCell.querySelector(
      ".override-completed-date-container"
    );
    advStatusSelect.addEventListener("change", (e) => {
      const status = e.target.value;
      advStartedDateContainer.style.display =
        status === "In Progress" || status === "Completed" ? "flex" : "none";
      advCompletedDateContainer.style.display =
        status === "Completed" ? "flex" : "none";
    });

    mainRow
      .querySelector(".remove-ticket-row-btn")
      .addEventListener("click", () => {
        mainRow.remove();
        advancedRow.remove();
      });
    mainRow
      .querySelector(".advanced-toggle-btn")
      .addEventListener("click", (e) => {
        const btn = e.currentTarget;
        advancedRow.style.display =
          advancedRow.style.display === "none" ? "" : "none";
        btn.classList.toggle("active");
      });
    mainRow
      .querySelector(".new-ticket-description")
      .addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
      });
    mainRow.querySelector(".new-ticket-title").focus();

    // NEW: Check toggle state when adding a new row
    const isBulkOn = document.getElementById("bulk-settings-toggle").checked;
    if (!isBulkOn) {
      advancedRow.style.display = "";
      mainRow.querySelector(".advanced-toggle-btn").classList.add("active");
      
    }
  }


  // REPLACE the createSearchableDropdownForModal function
  function createSearchableDropdownForModal(
    container,
    options,
    placeholder,
    onChangeCallback,
    selectedValue = null
  ) {
    if (!container) {
      console.error("❌ Container is null or undefined!");
      return;
    }
    
    const dropdownId = `searchable-${container.id}`,
      inputId = `input-${container.id}`,
      listId = `list-${container.id}`;
    
    // Create a combined options list that includes the current value even if not in options
    const combinedOptions = [...options];
    if (selectedValue && selectedValue !== "" && !options.find(opt => opt.value == selectedValue)) {
      // Add the current value to options if it's not already there (for inactive users)
      combinedOptions.unshift({ value: selectedValue, text: selectedValue });
    }
    
    const selectedOption = combinedOptions.find(opt => opt.value == selectedValue);
    const initialValue = selectedOption ? selectedOption.text : selectedValue || "";
    
    container.innerHTML = `<div class="searchable-dropdown" id="${dropdownId}"><input type="text" class="searchable-dropdown-input inline-editor" id="${inputId}" placeholder="${placeholder}" value="${escapeHtml(initialValue)}" data-value="${escapeHtml(selectedValue || "")}" autocomplete="off"><div class="searchable-dropdown-list" id="${listId}">${combinedOptions
      .map(
        (opt) =>
          `<div data-value="${escapeHtml(opt.value)}">${escapeHtml(
            opt.text
          )}</div>`
      )
      .join("")}</div></div>`;
    const input = document.getElementById(inputId),
      list = document.getElementById(listId);
    input.addEventListener("focus", () => {
      positionDropdownFixed(input, list);
    });
    input.addEventListener("click", () => {
      positionDropdownFixed(input, list);
    });
    input.addEventListener("blur", () => {
      // Add a small delay to allow click events to be processed
      setTimeout(() => {
        list.style.display = "none";
      }, 150);
    });
    input.addEventListener("keyup", () => {
      const filter = input.value.toLowerCase();
      list
        .querySelectorAll("div")
        .forEach(
          (item) =>
            (item.style.display = item.textContent
              .toLowerCase()
              .includes(filter)
              ? ""
              : "none")
        );
      // Reposition dropdown after filtering
      if (list.style.display === "block") {
        positionDropdownFixed(input, list);
      }
    });
    
    // Add input event listener for real-time filtering
    input.addEventListener("input", () => {
      const filter = input.value.toLowerCase();
      list
        .querySelectorAll("div")
        .forEach(
          (item) =>
            (item.style.display = item.textContent
              .toLowerCase()
              .includes(filter)
              ? ""
              : "none")
        );
      // Reposition dropdown after filtering
      if (list.style.display === "block") {
        positionDropdownFixed(input, list);
      }
    });
    list.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "DIV") {
        input.value = e.target.textContent;
        input.dataset.value = e.target.dataset.value;
        list.style.display = "none";
        if (onChangeCallback) onChangeCallback(); // <-- MODIFICATION
      }
    });
    
    // Also add click event for better compatibility
    list.addEventListener("click", (e) => {
      if (e.target.tagName === "DIV") {
        input.value = e.target.textContent;
        input.dataset.value = e.target.dataset.value;
        list.style.display = "none";
        if (onChangeCallback) onChangeCallback();
      }
    });
    
  }

  function handleClear(event) {
    const wrapper = event.target.closest(".editable-field-wrapper");
    const input = wrapper.querySelector("input, select");
    if (input.tagName === "SELECT") {
      input.value = "";
      input.classList.add("placeholder-selected");
    } else {
      input.value = "";
      // Add this check to clear the data-value for searchable inputs
      if (input.classList.contains("searchable-dropdown-input")) {
        input.dataset.value = "";
      }
    }
    wrapper.classList.remove("has-value");
    const handler =
      input.dataset.type === "project" ? handleProjectUpdate : handleUpdate;
    handler({ target: input }, null);
  }

  // --- NEW & UPDATED SUBTASK/COMMENT FUNCTIONS ---

  // Render Functions
  function renderSubtasks(ticket) {
    const container = document.getElementById("subtask-container-modal");
    if (!container) return;

    const subtasks = ticket.subtask || [];
    const subtasksListHtml = subtasks
      .map(
        (task, index) => `
            <li class="subtask-item ${task.done ? "completed" : ""}">
                <input type="checkbox" class="subtask-checkbox" data-index="${index}" ${
          task.done ? "checked" : ""
        }>
                <span>${escapeHtml(task.text)}</span>
                <i class="fas fa-copy copy-icon subtask-copy-icon" data-subtask-text="${escapeHtml(
                  task.text
                )}" title="Copy subtask info"></i>
                <button class="remove-subtask-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
            </li>
        `
      )
      .join("");

    container.innerHTML = `
            <div class="ticket-subtasks-container">
                <h4 class="modal-section-label">Subtasks</h4>
                <ul class="subtask-list">${subtasksListHtml}</ul>
                <div class="add-subtask-area">
                    <input type="text" id="new-subtask-input" class="inline-editor" placeholder="Add a new subtask...">
                    <button id="add-subtask-btn" class="action-btn">Add</button>
                </div>
            </div>`;

    // Add event listeners for subtask checkboxes
    const checkboxes = container.querySelectorAll('.subtask-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', handleSubtaskToggle);
    });
  }


  // Handler Functions
  async function handleSubtaskUpdate(ticketId, newSubtasks) {
    const { error } = await supabaseClient
      .from("ticket")
      .update({ subtask: newSubtasks })
      .eq("id", ticketId);
    if (error) {
      showToast("Failed to update subtasks: " + error.message, "error");
    } else {
      // Update local data immediately for UI responsiveness
      const ticket = appData.allTickets.find((t) => t.id == ticketId);
      if (ticket) {
        ticket.subtask = newSubtasks;
        // Re-render the subtasks in the modal
        renderSubtasks(ticket);
      }
      showToast("Subtask updated!", "success");
    }
  }


  // Event Triggers
  function handleSubtaskAdd(e) {
    const modal = e.target.closest(".ticket-main-content");
    const ticketId = modal.dataset.ticketId;
    const input = document.getElementById("new-subtask-input");
    const text = input.value.trim();
    if (!text) return;

    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    const newSubtask = { text: text, done: false };
    const updatedSubtasks = [...(ticket.subtask || []), newSubtask];

    handleSubtaskUpdate(ticketId, updatedSubtasks);
    input.value = "";
  }

  function handleSubtaskRemove(e) {
    const button = e.target.closest(".remove-subtask-btn");
    const modal = e.target.closest(".ticket-main-content");
    const ticketId = modal.dataset.ticketId;
    const index = parseInt(button.dataset.index, 10);

    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    const updatedSubtasks = (ticket.subtask || []).filter(
      (_, i) => i !== index
    );

    handleSubtaskUpdate(ticketId, updatedSubtasks);
  }

  function handleSubtaskToggle(e) {
    const checkbox = e.target;
    const modal = e.target.closest(".ticket-main-content");
    const ticketId = modal.dataset.ticketId;
    const index = parseInt(checkbox.dataset.index, 10);

    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    const updatedSubtasks = [...(ticket.subtask || [])];
    updatedSubtasks[index].done = checkbox.checked;

    handleSubtaskUpdate(ticketId, updatedSubtasks);
  }


  async function handleRemoveField(e) {
    const button = e.target.closest(".remove-field-btn");
    if (!button) return;
    
    const field = button.dataset.field;
    const ticketId = button.dataset.ticketId;

    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    // Find the actual input element for this field
    const inputElement = document.querySelector(`input[data-field="${field}"][data-id="${ticketId}"]`);
    if (!inputElement) return;

    // Create a proper event object that handleUpdate expects
    const fakeEvent = {
      target: inputElement
    };

    try {
      // Use the existing handleUpdate function to clear the field
      await handleUpdate(fakeEvent, null);
      
      // Show success message
      const fieldName = field === 'projectId' ? 'Project' : field === 'assigneeId' ? 'Assignee' : 'Epic';
      showToast(`${fieldName} removed successfully`, 'success');
      
      // Refresh the modal to show the updated UI
      showTaskDetailModal(ticketId);
    } catch (error) {
      console.error('Error removing field:', error);
      showToast(`Failed to remove ${fieldName}`, 'error');
    }
  }

  function copySubtaskInfo(event) {
    const icon = event.target.closest(".subtask-copy-icon");
    const subtaskText = icon.dataset.subtaskText;
    const ticketId = icon.closest(".ticket-main-content").dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    const copyText = `[HRB-${ticket.id || "No ID"}] - Project: ${
      ticket.projectName || "No Project"
    } / Epic: ${ticket.epic || "No Epic"} / ${
      ticket.title || "No Title"
    } / Sub: ${subtaskText}`;

    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        showToast("Subtask info copied!", "success");
      })
      .catch((err) => {
        showToast("Failed to copy text.", "error");
      });
  }

  function autoSizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
  // Add this new function to JavaScript.html

  function confirmSubtaskResolution(count) {
    return new Promise((resolve) => {
      const modal = document.getElementById("subtask-confirm-modal");
      const messageEl = document.getElementById("subtask-confirm-message");
      const yesBtn = document.getElementById("subtask-confirm-yes");
      const noBtn = document.getElementById("subtask-confirm-no");

      messageEl.textContent = `There's ${count} subtask${
        count > 1 ? "s" : ""
      } incomplete. Are you sure to auto-resolve?`;

      const close = (resolution) => {
        modal.style.display = "none";
        yesBtn.onclick = null;
        noBtn.onclick = null;
        resolve(resolution);
      };

      yesBtn.onclick = () => close(true);
      noBtn.onclick = () => close(false);

      modal.style.display = "flex";
    });
  }

  function addInlineTaskRow(anchorRow, projectId, epicName) {
    // Check if an editing row already exists and remove it to prevent duplicates
    const existingEditRow = document.getElementById("inline-edit-row");
    if (existingEditRow) existingEditRow.remove();

    const newRow = document.createElement("tr");
    newRow.id = "inline-edit-row";
    newRow.classList.add("inline-edit-row-class");
    if (epicName && epicName !== "No Epic") {
      newRow.classList.add("is-in-epic");
    }

    const typeOptions = ["Task", "Bug", "Request"]
      .map((o) => `<option value="${o}">${o}</option>`)
      .join("");
    const priorityOptions = ["Medium", "High", "Urgent", "Low"]
      .map(
        (o) =>
          `<option value="${o}" ${
            o === "Medium" ? "selected" : ""
          }>${o}</option>`
      )
      .join("");
    const today = new Date().toISOString().split("T")[0];

    newRow.innerHTML = `
        ${isBulkEditMode ? "<td></td>" : ""}
        <td data-label="ID"><i class="fas fa-plus" style="color: var(--accent-color);"></i></td>
        
        
        <td data-label="Task">
            <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                   <label for="inline-new-createdAt" style="white-space: nowrap; color: var(--text-secondary); font-weight: 500; font-size: 0.8rem;">Created:</label>
                   <input type="date" id="inline-new-createdAt" class="inline-editor" value="${today}" style="width: auto; padding: 0.25rem 0.5rem;">
                </div>

                <div style="flex-grow: 1;">
                    <input type="text" id="inline-new-title" class="inline-editor" placeholder="Enter task title..." required>
                </div>

            </div>
        </td>
        <td data-label="Type"><select id="inline-new-type" class="inline-editor">${typeOptions}</select></td>
        <td data-label="Priority"><select id="inline-new-priority" class="inline-editor">${priorityOptions}</select></td>
        <td data-label="Status"><span class="status-tag status-open">Open</span></td>
        <td data-label="Requested By" id="inline-new-requestedBy-cell"></td>
        <td data-label="Assignee" id="inline-new-assignee-cell"></td>
        <td data-label="">
            <div style="display:flex; gap: 0.5rem;">
                <button class="action-btn-inline save-inline-btn" title="Save"><i class="fas fa-check"></i></button>
                <button class="action-btn-inline cancel-inline-btn" title="Cancel"><i class="fas fa-times"></i></button>
            </div>
        </td>
    `;

    anchorRow.parentNode.insertBefore(newRow, anchorRow.nextSibling);

    // Populate dropdowns and set current user as default for Requester and Assignee
    newRow.querySelector("#inline-new-requestedBy-cell").innerHTML =
      createSearchableDropdown(
        appData.users.map((u) => ({ value: u, text: u })),
        appData.currentUserName, // Default requestedBy
        "new-inline",
        "requestedBy"
      );

    const assigneeCell = newRow.querySelector("#inline-new-assignee-cell");
    assigneeCell.innerHTML = createSearchableDropdown(
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      appData.currentUserId, // Default assignee ID
      "new-inline",
      "assigneeId"
    );
    const assigneeInput = assigneeCell.querySelector("input");
    if (assigneeInput) {
      assigneeInput.dataset.value = appData.currentUserId || "";
    }

    // Add listeners for the Save/Cancel buttons
    newRow
      .querySelector(".save-inline-btn")
      .addEventListener("click", () =>
        saveInlineTask(newRow, projectId, epicName)
      );
    newRow
      .querySelector(".cancel-inline-btn")
      .addEventListener("click", () => newRow.remove());

    newRow.querySelector("#inline-new-title").focus();
  }

  async function saveInlineTask(row, projectId, epicName) {
    const title = row.querySelector("#inline-new-title").value.trim();
    if (!title) {
      showToast("Title is required.", "error");
      row.querySelector("#inline-new-title").classList.add("input-error");
      return;
    }

    // --- UI INDICATOR START ---
    const saveBtn = row.querySelector(".save-inline-btn");
    const cancelBtn = row.querySelector(".cancel-inline-btn");
    const saveIcon = saveBtn.querySelector("i");
    const originalIconClass = saveIcon.className; // Store the original icon (fa-check)

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveIcon.className = "fas fa-spinner"; // Change to a spinner icon
    row.style.opacity = "0.5";
    // --- UI INDICATOR END ---

    const requestedByInput = row.querySelector(
      "#inline-new-requestedBy-cell input"
    );
    const assigneeInput = row.querySelector("#inline-new-assignee-cell input");
    const assigneeId = assigneeInput.dataset.value || null;

    // Remove manual ID generation - let database handle auto-increment
    // This prevents duplicate key constraint violations

    let finalTimestamp;
    const createdAtValue = row.querySelector("#inline-new-createdAt").value;
    if (createdAtValue) {
      const [year, month, day] = createdAtValue.split("-").map(Number);
      const now = new Date();
      const selectedDate = new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      );
      finalTimestamp = selectedDate.toISOString();
    } else {
      finalTimestamp = new Date().toISOString();
    }

    const newTicketData = {
      // id: lastId + 1, // REMOVED to prevent duplicate key violations - let DB auto-generate
      title: title,
      type: row.querySelector("#inline-new-type").value,
      requestedBy: requestedByInput.value,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      priority: row.querySelector("#inline-new-priority").value,
      projectId: projectId,
      epic: epicName === "No Epic" ? null : epicName,
      createdAt: finalTimestamp,
      assignedAt: assigneeId ? finalTimestamp : null,
      status: "Open",
      log: [],
    };

    const { data: insertedTickets, error } = await supabaseClient
      .from("ticket")
      .insert(newTicketData)
      .select();

    if (error) {
      showToast("Error: " + error.message, "error");
      // --- UI INDICATOR RESET on failure ---
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveIcon.className = originalIconClass; // Restore the checkmark icon
      row.style.opacity = "1";
    } else {
      // On success, the row is removed, so no reset is needed.
      row.remove();
      if (insertedTickets && insertedTickets.length > 0) {
        // Update frontend state with new ticket
        await updateTicketDataAfterCreation(insertedTickets);
        
        await sendDiscordNotificationViaApi(
          insertedTickets,
          appData.currentUserName
        );
      }
    }
  }

  /**
   * Handles the "Add Epic" button click by opening a modal to get the epic name.
   */
  async function handleAddNewEpic(anchorRow, projectId) {
    try {
      const epicName = await getNewEpicNameFromUser();
      if (epicName) {
        // Add the new epic to our in-memory list so it's available immediately
        if (!appData.epics.includes(epicName)) {
          appData.epics.push(epicName);
          appData.epics.sort();
        }
        addInlineTaskRow(anchorRow, projectId, epicName);
      }
    } catch (error) {
      // User cancelled, do nothing
    }
  }

  /**
   * Opens a modal and returns a Promise that resolves with the new epic name.
   */
  function getNewEpicNameFromUser() {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("new-epic-modal");
      const input = document.getElementById("new-epic-name-input");
      const submitBtn = document.getElementById("submit-new-epic");
      const cancelBtn = document.getElementById("cancel-new-epic");

      input.value = "";
      modal.style.display = "flex";
      input.focus();

      const close = (value) => {
        modal.style.display = "none";
        submitBtn.onclick = null;
        cancelBtn.onclick = null;
        if (value) {
          resolve(value);
        } else {
          reject();
        }
      };

      submitBtn.onclick = () => {
        const epicName = input.value.trim();
        if (epicName) {
          close(epicName);
        } else {
          showToast("Epic name cannot be empty.", "error");
        }
      };
      cancelBtn.onclick = () => close(null);
    });
  }

  function showAddProjectModal() {
    console.log("Add Project button clicked");
    
    // Remove any existing modal first
    const existingModal = document.getElementById('add-project-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
      <div id="add-project-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>Add New Project</h3>
            <button class="modal-close" id="close-add-project-modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="new-project-name">Project Name *</label>
              <input type="text" id="new-project-name" class="form-input" placeholder="Enter project name" required>
            </div>
            <div class="form-group">
              <label for="new-project-description">Description</label>
              <textarea id="new-project-description" class="form-textarea" placeholder="Enter project description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="new-project-owner">Project Owner</label>
              <select id="new-project-owner" class="form-select">
                <option value="">Select owner...</option>
                ${appData.teamMembers.map(member => 
                  `<option value="${member.id}">${member.name}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" onclick="closeAddProjectModal()">Cancel</button>
            <button class="primary-btn" onclick="saveNewProject()">Create Project</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    console.log("Modal added to DOM");
    
    // Add click-outside-to-close functionality
    const modal = document.getElementById('add-project-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeAddProjectModal();
        }
      });
      
      // Add close button event listener
      const closeBtn = document.getElementById('close-add-project-modal');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeAddProjectModal();
        });
      }
      
      // Add ESC key listener
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          closeAddProjectModal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      
      // Show the modal after setting up all event listeners
      modal.style.display = 'flex';
    }
    
    // Focus on project name input
    setTimeout(() => {
      const nameInput = document.getElementById('new-project-name');
      if (nameInput) {
        nameInput.focus();
        console.log("Focused on name input");
      } else {
        console.error("Name input not found");
      }
    }, 100);
  }

  function closeAddProjectModal() {
    console.log("Closing Add Project modal");
    const modal = document.getElementById('add-project-modal');
    if (modal) {
      modal.remove();
      console.log("Modal removed from DOM");
    } else {
      console.log("Modal not found");
    }
  }

  async function saveNewProject() {
    console.log("Save new project called");
    
    const name = document.getElementById('new-project-name').value.trim();
    const description = document.getElementById('new-project-description').value.trim();
    const ownerId = document.getElementById('new-project-owner').value;

    console.log("Project data:", { name, description, ownerId });

    if (!name) {
      showToast('Project name is required', 'error');
      return;
    }

    // Check if project name already exists
    const existingProject = appData.projects.find(p => p.name && p.name.toLowerCase() === name.toLowerCase());
    if (existingProject) {
      showToast('A project with this name already exists', 'error');
      return;
    }

    try {
      // Get the next available project ID
      const { data: lastProject, error: idError } = await window.supabaseClient
        .from("project")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();
        
      if (idError && idError.code !== "PGRST116") {
        showToast(`Error getting last project ID: ${idError.message}`, "error");
        return;
      }
      
      const newProjectId = (lastProject?.id || 0) + 1;
      
      const projectData = {
        id: newProjectId,
        projectName: name,
        description: description,
        projectOwner: ownerId || null,
        priority: 'Medium', // Default priority
        collaborators: '', // Default empty
        createdAt: new Date().toISOString()
      };
      
      // Save to database
      const { data: newProject, error } = await window.supabaseClient
        .from("project")
        .insert(projectData)
        .select()
        .single();
        
      if (error) {
        showToast(`Error creating project: ${error.message}`, "error");
        return;
      }
      
      // Add to local data with name property for consistency
      const projectWithName = {
        ...newProject,
        name: newProject.projectName
      };
      appData.projects.push(projectWithName);

      // Close modal
      closeAddProjectModal();

      // Show success message
      showToast(`Project "${name}" created successfully`, 'success');

      // Re-render projects view if currently viewing projects
      if (currentView === 'projects') {
        renderProjectsView();
      }
      
    } catch (error) {
      console.error("Error creating project:", error);
      showToast("Error creating project. Please try again.", "error");
    }
  }

  // Make functions globally available
  window.showAddProjectModal = showAddProjectModal;
  window.closeAddProjectModal = closeAddProjectModal;
  window.saveNewProject = saveNewProject;

  // Global event listener for Add Project button (delegated event handling)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'add-project-btn') {
      console.log("Add Project button clicked (global listener)");
      e.preventDefault();
      e.stopPropagation();
      showAddProjectModal();
    }
  });

  // Clean up any existing modals on page load
  function cleanupModals() {
    const existingModal = document.getElementById('add-project-modal');
    if (existingModal) {
      existingModal.remove();
      console.log("Cleaned up existing modal on page load");
    }
  }

  // Run cleanup immediately and on DOM ready
  cleanupModals();
  document.addEventListener('DOMContentLoaded', cleanupModals);
  
  // Ensure navigation is initialized on DOM ready (production fallback)
  document.addEventListener('DOMContentLoaded', () => {
    // Check if navigation is already initialized
    const ticketsButton = document.getElementById("nav-tickets");
    if (ticketsButton && !ticketsButton.hasAttribute('data-listener-added')) {
      console.log("Initializing navigation on DOMContentLoaded (production fallback)");
      addNavListeners();
      ticketsButton.setAttribute('data-listener-added', 'true');
    }
  });

  function showProjectDetailModal(projectId) {
    const project = appData.allProjects.find((p) => p.id == projectId);
    if (!project) {
      showToast("Project not found.", "error");
      return;
    }

    const modal = document.getElementById("project-detail-modal");
    const toDateInputString = (isoString) =>
      isoString ? isoString.split("T")[0] : "";

    const nameTextarea = modal.querySelector("#edit-project-name");
    const descTextarea = modal.querySelector("#edit-project-description");
    nameTextarea.value = project.projectName || "";
    descTextarea.value = project.description || "";

    modal.querySelector("#edit-project-priority").value =
      project.priority || "Medium";
    modal.querySelector("#edit-project-attachment").value =
      project.attachment || "";
    modal.querySelector("#edit-project-start-date").value = toDateInputString(
      project.startDate
    );
    modal.querySelector("#edit-project-est-completed-date").value =
      toDateInputString(project.estCompletedDate);

    // MODIFIED: Use .map(m => ({ value: m.name, text: m.name })) to correctly pass name strings
    createSearchableDropdownForModal(
      document.getElementById("edit-project-owner-container"),
      appData.teamMembers.map((m) => ({ value: m.name, text: m.name })),
      "Select owner...",
      null, // onChangeCallback
      project.projectOwner || null // selectedValue
    );

    // MODIFIED: Use .map(m => m.name) to pass an array of strings for the multi-select
    document.getElementById("edit-project-collaborators-container").innerHTML =
      createMultiSelectDropdown(
        appData.teamMembers.map((m) => m.name),
        project.collaborators,
        "edit",
        "collaborators",
        "project"
      );

    const saveBtn = modal.querySelector("#save-project-details-btn");
    saveBtn.onclick = () => handleProjectModalUpdate(projectId);

    modal.style.display = "flex";

    autoSizeTextarea(nameTextarea);
    autoSizeTextarea(descTextarea);
    setInitialProjectData();
  }

  /**
   * Gathers data from the project detail modal and saves updates to Supabase.
   * @param {string} projectId - The ID of the project to update.
   */
  async function handleProjectModalUpdate(projectId) {
    const modal = document.getElementById("project-detail-modal");
    const saveBtn = modal.querySelector("#save-project-details-btn");
    const originalBtnText = saveBtn.textContent;

    const ownerInput = modal.querySelector(
      "#edit-project-owner-container input"
    );
    const selectedCollaborators = Array.from(
      modal.querySelectorAll(
        "#edit-project-collaborators-container input:checked"
      )
    )
      .map((cb) => cb.value)
      .join(", ");

    const updates = {
      projectName: modal.querySelector("#edit-project-name").value.trim(),
      description: modal
        .querySelector("#edit-project-description")
        .value.trim(),
      priority: modal.querySelector("#edit-project-priority").value,
      projectOwner: ownerInput.dataset.value || ownerInput.value || null,
      collaborators: selectedCollaborators,
      attachment:
        modal.querySelector("#edit-project-attachment").value.trim() || null,
      startDate: modal.querySelector("#edit-project-start-date").value || null,
      estCompletedDate:
        modal.querySelector("#edit-project-est-completed-date").value || null,
    };

    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const { error } = await supabaseClient
      .from("project")
      .update(updates)
      .eq("id", projectId);

    saveBtn.textContent = originalBtnText;
    saveBtn.disabled = false;

    if (error) {
      showToast("Update failed: " + error.message, "error");
    } else {
      showToast("Project updated successfully!", "success");
      initialProjectData = null;
      modal.style.display = "none";

      // Update local state and re-render
      const projectIndex = appData.allProjects.findIndex(
        (p) => p.id == projectId
      );
      if (projectIndex !== -1) {
        appData.allProjects[projectIndex] = {
          ...appData.allProjects[projectIndex],
          ...updates,
        };
      }
      applyFilterAndRender();
    }
  }

  // Add these two functions to the end of your script

  /**
   * Captures the current state of the project detail form to track changes.
   */
  function setInitialProjectData() {
    const modal = document.getElementById("project-detail-modal");
    if (modal.style.display !== "flex") {
      initialProjectData = null;
      return;
    }
    const ownerInput = modal.querySelector(
      "#edit-project-owner-container input"
    );
    initialProjectData = {
      projectName: modal.querySelector("#edit-project-name").value,
      description: modal.querySelector("#edit-project-description").value,
      priority: modal.querySelector("#edit-project-priority").value,
      projectOwner: ownerInput.dataset.value || ownerInput.value || "",
      collaborators: Array.from(
        modal.querySelectorAll(
          "#edit-project-collaborators-container input:checked"
        )
      )
        .map((cb) => cb.value)
        .join(", "),
      attachment: modal.querySelector("#edit-project-attachment").value,
      startDate: modal.querySelector("#edit-project-start-date").value,
      estCompletedDate: modal.querySelector("#edit-project-est-completed-date")
        .value,
    };
  }

  /**
   * REPLACEMENT for isProjectModalDirty
   * Compares the current project form state against its initial state.
   * @returns {boolean} - True if there are unsaved changes, otherwise false.
   */
  function isProjectModalDirty() {
    if (!initialProjectData) {
      // DEBUG LOG
      console.log("Dirty Check: No initial data stored. Returning false.");
      return false;
    }

    const modal = document.getElementById("project-detail-modal");
    const ownerInput = modal.querySelector(
      "#edit-project-owner-container input"
    );
    const currentData = {
      projectName: modal.querySelector("#edit-project-name").value,
      description: modal.querySelector("#edit-project-description").value,
      priority: modal.querySelector("#edit-project-priority").value,
      projectOwner: ownerInput.dataset.value || ownerInput.value || "",
      collaborators: Array.from(
        modal.querySelectorAll(
          "#edit-project-collaborators-container input:checked"
        )
      )
        .map((cb) => cb.value)
        .join(", "),
      attachment: modal.querySelector("#edit-project-attachment").value,
      startDate: modal.querySelector("#edit-project-start-date").value,
      estCompletedDate: modal.querySelector("#edit-project-est-completed-date")
        .value,
    };

    const initialJSON = JSON.stringify(initialProjectData);
    const currentJSON = JSON.stringify(currentData);
    const isDirty = initialJSON !== currentJSON;

    // DEBUG LOGS
    console.log("--- Dirty Check Running ---");
    console.log("Initial Data:", initialJSON);
    console.log("Current Data:", currentJSON);
    console.log("Are they different? (Is Dirty?):", isDirty);
    console.log("--------------------------");

    return isDirty;
  }

  /**
   * Displays a custom confirmation modal and returns a promise that resolves with the user's choice.
   * @param {string} title - The title to display in the modal header.
   * @param {string} message - The message to display in the modal body.
   * @returns {Promise<boolean>} - A promise that resolves to true if the user confirms, false otherwise.
   */
  function confirmWithCustomModal(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("unsaved-changes-modal");
      modal.querySelector("#unsaved-modal-title").textContent = title;
      modal.querySelector("#unsaved-modal-message").textContent = message;

      const discardBtn = modal.querySelector("#unsaved-discard-btn");
      const keepEditingBtn = document.getElementById(
        "unsaved-keep-editing-btn"
      );

      const close = (decision) => {
        modal.style.display = "none";
        // Remove listeners to prevent them from stacking up
        discardBtn.onclick = null;
        keepEditingBtn.onclick = null;
        resolve(decision);
      };

      discardBtn.onclick = () => close(true); // User chose to discard changes
      keepEditingBtn.onclick = () => close(false); // User chose to keep editing

      modal.style.display = "flex";
    });
  }

  /**
   * A simple Markdown to HTML parser for the Readme modal.
   * Handles headings, lists, horizontal rules, and inline styles like bold, italic, and code.
   * @param {string} markdownText - The raw Markdown string to be converted.
   * @returns {string} - The converted HTML string.
   */
  function parseMarkdown(markdownText) {
    // Split the text into individual lines for processing.
    const lines = markdownText.trim().split("\n");
    let html = "";
    let inList = false; // Flag to track if we are currently inside a <ul> list.

    lines.forEach((line) => {
      // Trim the line to handle potential indentation issues from the template literal.
      const trimmedLine = line.trim();

      // Process inline formatting (bold, italic, code) first.
      let processedLine = trimmedLine
        .replace(/\*\*(.*?)\*\*|\_\_(.*?)\_\_/g, "<strong>$1$2</strong>") // Bold
        .replace(/\*(.*?)\*|\_(.*?)\_/g, "<em>$1$2</em>") // Italic
        .replace(/`(.*?)`/g, "<code>$1</code>"); // Inline Code

      // Process block-level formatting (headings, lists, etc.).
      if (processedLine.startsWith("# ")) {
        html += `<h1>${processedLine.substring(2)}</h1>`;
      } else if (processedLine.startsWith("## ")) {
        html += `<h2>${processedLine.substring(3)}</h2>`;
      } else if (processedLine.startsWith("### ")) {
        html += `<h3>${processedLine.substring(4)}</h3>`;
      } else if (processedLine.startsWith("---")) {
        html += "<hr>";
      } else if (
        processedLine.startsWith("- ") ||
        processedLine.startsWith("* ") ||
        processedLine.startsWith("✅ ") ||
        processedLine.startsWith("❌ ")
      ) {
        // If we are not already in a list, start a new one.
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${processedLine.substring(2)}</li>`;
      } else if (trimmedLine === "") {
        // If we encounter a blank line and were in a list, close the list.
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      } else {
        // If the line is not a special format and we were in a list, close it.
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        // Treat any other non-empty line as a paragraph.
        html += `<p>${processedLine}</p>`;
      }
    });

    // Ensure any list open at the very end of the document is properly closed.
    if (inList) {
      html += "</ul>";
    }
    return html;
  }

  /**
   * Sets up and displays the Readme modal. It contains the Markdown content,
   * calls the parser, injects the resulting HTML, and makes the modal visible.
   */
  function showReadmeModal() {
    // The full Markdown content is stored here in a template literal.
    const markdownContent = `
# TechTool Task Management Guidelines

## 📌 Overview
As a **TechTool Lead**, our department handles requests similar to a developer team.
To keep our work structured and scalable, we use the following task hierarchy:

**Project → Epic → Ticket → SubTask**

This document explains each level, when to use it, and provides concrete examples.

---

## 🏗 Hierarchy

### 1. Project
- Represents a **large initiative or new tool** that has not existed before.
- Projects group related work into one overarching goal.
- Even if tools share a base technology (e.g., “Discord Bot”), each distinct use case is its own project.
- **Every Project must have a clearly defined start date and end date.**
- If new features are added after the project starts, they should be handled as **new Tickets/Epics** but **must not extend or modify the original project’s start–end timeline.**

✅ **Examples**:
- \`Discord Bot - Harry Botter\`
- \`Discord Bot - Proxy\`
- \`Discord Bot - TechTool\`

❌ **Not recommended**:
- Just calling it \`Discord Bot\` (too broad, unclear purpose).

---

### 2. Epic
- A **major component** or **theme of work** within a project.
- Usually describes a functional area (backend, frontend, integrations, etc.).
- Breaks a project down into manageable areas of delivery.

✅ **Examples**:
- Build Back End
- Build Front End
- API Integration with LLM

---

### 3. Ticket
- A **specific piece of work** under an Epic (or standalone if no Epic/Project is required).
- Tickets are the main unit of work for developers.
- A Ticket can exist **without being tied** to a Project or Epic (e.g., one-off bugs or requests).

**Ticket Types**:
- **Request** → Feature request or small enhancement.
- **Bug** → Fix for an issue in existing functionality.
- **Task** → Initiative or technical work item not driven by a request/bug.

✅ **Examples** (under Epic: *Build Back End*):
- Create Python Code
- Connect to AWS

✅ **Examples** (standalone Tickets):
- Bug: Fix login error
- Request: Add new dashboard filter

---

### 4. SubTask
- The **lowest level of work**, representing steps needed to complete a Ticket.
- Used when a Ticket is too broad and needs to be broken into smaller actionable items.
- Helps assign parts of a Ticket to multiple team members if needed.

✅ **Examples** (under Ticket: *Create Python Code*):
- Function A
- Function B
- Unit Testing

---

## ⚖️ When to Use Each Level

- **Project** → Use when building a **new tool/product** or significantly expanding an existing one. Always define start & end dates.
- **Epic** → Use when dividing a Project into **major technical or functional areas**.
- **Ticket** → Use for all actionable tasks. Can exist under an Epic or standalone.
- **SubTask** → Use to break down **detailed steps** of a Ticket.

---

## 📝 Quick Examples

**Project:** \`Discord Bot - TechTool\`
*(Start: 01 Aug 2025, End: 30 Sep 2025)*

→ **Epic:** Build Back End
 → **Ticket:** Create Python Code
  → **SubTask:** Function A

**Standalone Tickets**:
- \`Bug: Fix AWS timeout error\`
- \`Request: Add export to CSV feature\`

---

## ✅ Best Practices
- Always **choose the lowest meaningful level**: don’t create SubTasks unless a Ticket is too large.
- Keep **Project scope clear**: separate similar tools into different Projects if their use case differs.
- Use **Ticket types** (Request, Bug, Task) consistently for tracking work.
- Ensure **Projects always have defined start & end dates**.
- New features discovered during or after a Project should **not affect the original timeline**—treat them as separate Tickets or, if significant, as a new Project.
- Keep naming **descriptive and actionable** (e.g., “Create API Endpoint for LLM” instead of just “API”).
    `;

    // Get the DOM elements for the modal and its content area.
    const readmeContentDiv = document.getElementById("readme-content");
    const readmeModal = document.getElementById("readme-modal");

    // Parse the Markdown and inject the resulting HTML into the modal.
    readmeContentDiv.innerHTML = parseMarkdown(markdownContent);
    // Display the modal.
    readmeModal.style.display = "flex";
  }

  // --- ADD THIS TO THE END OF YOUR JavaScript.html FILE ---

  /**
   * Formats an ISO date string into DD-MMM-YYYY format.
   * @param {string} isoString - The date string to format.
   * @returns {string} The formatted date string (e.g., "03-Sep-2025").
   */
  function formatDateForReconcile(isoString) {
    if (!isoString) return "No Date";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const date = new Date(isoString);
    if (isNaN(date)) return "Invalid Date";

    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }
  // REPLACE the existing renderReconcileView function.
  function renderReconcileView(data) {
    if (!reconcileWrapper) return; // Safety check
    const scrollPosition = reconcileWrapper.scrollTop; // Store position
    const wrapper = document.getElementById("reconcile-view-wrapper");

    const headers = [
      "Date",
      "Member",
      "Project",
      "Task",
      "Description",
      "Duration",
      "Action", // <-- NEW HEADER
      "Ticket Number",
      "Exclude",
    ];

    const paginatedData = data.slice(
      (reconcileCurrentPage - 1) * ticketsPerPage,
      reconcileCurrentPage * ticketsPerPage
    );

    let tableHTML = `<table id="reconcile-table">
        <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>`;

    if (paginatedData.length === 0) {
      tableHTML += `<tr><td colspan="${headers.length}" style="text-align: center; padding: 2rem;">No hours to reconcile.</td></tr>`;
    } else {
      paginatedData.forEach((row, rowIndex) => {
        let statusIcon;
        if (row.ticketNumber || row.is_excluded) {
          statusIcon = `<span class="reconcile-status-indicator done"><i class="fas fa-check"></i></span>`;
        } else {
          statusIcon = `<span class="reconcile-status-indicator todo"><i class="fas fa-circle"></i></span>`;
        }

        // --- NEW: Add the "Create Ticket" button ---
        const createTicketBtnHtml = row.ticketNumber
          ? "" // If ticket exists, show nothing
          : `<button class="create-ticket-btn" data-reconcile-id="${row.id}" title="Create Ticket from this entry">
                   <i class="fas fa-ticket-alt"></i> Create
                 </button>`;

        tableHTML += `<tr data-reconcile-id="${row.id}">
                <td class="disabled-cell">
                    <div class="reconcile-week-cell">
                        ${statusIcon}
                        <span>${formatDateForReconcile(row.date)}</span>
                    </div>
                </td>
                <td class="disabled-cell" title="${escapeHtml(
                  row.clockify_member
                )}">${escapeHtml(row.clockify_member)}</td>
                <td class="disabled-cell" title="${escapeHtml(
                  row.project
                )}">${escapeHtml(row.project)}</td>
                <td class="disabled-cell" title="${escapeHtml(
                  row.task
                )}">${escapeHtml(row.task)}</td>
                <td class="disabled-cell" title="${escapeHtml(
                  row.description
                )}">${escapeHtml(row.description)}</td>
                <td class="disabled-cell">${escapeHtml(
                  row.duration_decimal
                )}</td>
                <td class="action-cell">
                  ${createTicketBtnHtml}
                </td>
                <td class="editable-cell" tabindex="0" data-field="ticketNumber">
                    ${createReconcileTicketDropdown(row.ticketNumber, row.id)}
                </td>
                <td class="exclude-cell" tabindex="0">
                    <input type="checkbox" class="reconcile-exclude-checkbox" data-reconcile-id="${
                      row.id
                    }" ${
          row.is_excluded ? "checked" : ""
        } title="Exclude this entry from view when 'Exclude Done' is active">
                </td>
            </tr>`;
      });
    }

    tableHTML += `</tbody></table>`;
    wrapper.querySelector("#reconcile-table")?.remove();
    wrapper.insertAdjacentHTML("afterbegin", tableHTML);

    addReconcileEventListeners();
    addReconcileKeyboardListeners();
    updateReconcilePagination(data.length);
    wrapper.scrollTop = scrollPosition;
  }
  /**
   * Creates a searchable dropdown specifically for the reconcile view.
   */
  function createReconcileTicketDropdown(selectedValue, reconcileId) {
    const selectedTicket = appData.allTickets.find(
      (t) => t.id == selectedValue
    );
    // MODIFIED: Add "HRB-" prefix to the selected ticket's display text.
    const selectedText = selectedTicket
      ? `[HRB-${selectedTicket.id}] ${selectedTicket.title}`
      : "";

    // MODIFIED: Add "HRB-" prefix to the ID in each dropdown option.
    let optionsHTML = appData.allTickets
      .map(
        (ticket) => `
        <div data-value="${escapeHtml(ticket.id)}">
            <strong>HRB-${escapeHtml(ticket.id)}</strong>
            <small>${escapeHtml(ticket.title || "No Title")}</small>
        </div>
    `
      )
      .join("");

    return `<div class="editable-field-wrapper has-value reconcile-ticket-dropdown">
        <div class="searchable-dropdown">
            <input type="text" class="searchable-dropdown-input" value="${escapeHtml(
              selectedText
            )}" 
                   placeholder="Search Ticket ID or Title..." data-reconcile-id="${reconcileId}" 
                   data-field="ticketNumber" data-old-value="${escapeHtml(
                     selectedValue || ""
                   )}" autocomplete="off">
            <div class="searchable-dropdown-list">${optionsHTML}</div>
        </div>
        <i class="fas fa-times-circle clear-icon"></i>
    </div>`;
  }
  // REPLACE the existing addReconcileEventListeners function.
  function addReconcileEventListeners() {
    const wrapper = document.getElementById("reconcile-view-wrapper");
    if (!wrapper) return;

    // Combined listener for clicks and changes
    const handleEvent = (e) => {
      // Handle "Create Ticket" button click
      const createBtn = e.target.closest(".create-ticket-btn");
      if (e.type === "click" && createBtn) {
        const reconcileId = createBtn.dataset.reconcileId;
        openReconcileCreateTicketModal(reconcileId);
        return;
      }

      // Handle dropdown item selection
      if (
        e.type === "click" &&
        e.target.closest(".searchable-dropdown-list div")
      ) {
        const item = e.target.closest(".searchable-dropdown-list div");
        const newValue = item.dataset.value;
        const dropdown = item.closest(".searchable-dropdown-list");
        
        console.log("Dropdown item clicked:", { newValue, connectedInput: dropdown.dataset.connectedInput });
        
        // Find the input associated with this dropdown
        let input = null;
        if (dropdown.dataset.connectedInput) {
          // Find input by reconcileId
          input = wrapper.querySelector(`input[data-reconcile-id="${dropdown.dataset.connectedInput}"]`);
          console.log("Found input by connectedInput:", input);
        }
        if (!input) {
          // Fallback: look for input in the searchable-dropdown container (if dropdown hasn't been moved)
          const container = dropdown.closest(".searchable-dropdown");
          if (container) {
            input = container.querySelector("input");
            console.log("Found input in container:", input);
          }
        }
        
        if (input) {
          console.log("Calling handleReconcileUpdate with:", { reconcileId: input.dataset.reconcileId, newValue });
          handleReconcileUpdate({ target: input }, newValue);
          dropdown.style.display = "none";
        } else {
          console.error("Could not find input for dropdown!");
        }
      }
      // Handle clear icon click
      if (e.type === "click" && e.target.classList.contains("clear-icon")) {
        const input = e.target
          .closest(".editable-field-wrapper")
          .querySelector("input");
        handleReconcileUpdate({ target: input }, null);
      }
      // Handle checkbox change
      if (
        e.type === "change" &&
        e.target.classList.contains("reconcile-exclude-checkbox")
      ) {
        handleReconcileExcludeToggle(e);
      }
      // NEW: Add logic to close dropdowns if clicking outside
      if (!e.target.closest(".reconcile-ticket-dropdown") && !e.target.closest(".searchable-dropdown-list")) {
        // Close dropdowns in wrapper
        wrapper
          .querySelectorAll(".searchable-dropdown-list")
          .forEach((list) => {
            list.style.display = "none";
          });
        // Also close dropdowns that have been moved to body
        document
          .querySelectorAll(".searchable-dropdown-list")
          .forEach((list) => {
            // Only close if it's associated with reconcile view
            if (list.dataset.connectedInput) {
              list.style.display = "none";
            }
          });
      }
    };

    wrapper.addEventListener("click", handleEvent);
    wrapper.addEventListener("change", handleEvent);
    
    // Add global click handler for dropdown items (since they might be moved to body)
    document.addEventListener("click", (e) => {
      // Check if click is on a dropdown item in reconcile view
      const item = e.target.closest(".searchable-dropdown-list div[data-value]");
      if (item) {
        const dropdown = item.closest(".searchable-dropdown-list");
        // Only handle if this is a reconcile dropdown
        if (dropdown && dropdown.dataset.connectedInput) {
          const newValue = item.dataset.value;
          const input = wrapper.querySelector(`input[data-reconcile-id="${dropdown.dataset.connectedInput}"]`);
          
          console.log("Global click handler - Dropdown item clicked:", { newValue, input });
          
          if (input) {
            console.log("Calling handleReconcileUpdate from global handler");
            handleReconcileUpdate({ target: input }, newValue);
            dropdown.style.display = "none";
            e.stopPropagation();
          }
        }
      }
    });

    // Close dropdowns on scroll
    wrapper.addEventListener("scroll", () => {
      // Close dropdowns in wrapper
      wrapper
        .querySelectorAll(".searchable-dropdown-list")
        .forEach((list) => {
          if (list.style.display === "block") {
            list.style.display = "none";
          }
        });
      // Also close dropdowns that have been moved to body
      document
        .querySelectorAll(".searchable-dropdown-list")
        .forEach((list) => {
          // Only close if it's associated with reconcile view
          if (list.dataset.connectedInput && list.style.display === "block") {
            list.style.display = "none";
          }
        });
    });

    wrapper.addEventListener("focusin", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        // Find the dropdown for this input
        const dropdown = findDropdownForInput(e.target);
        
        // First, find and close all other open dropdowns in the view
        const allDropdowns = wrapper.querySelectorAll(
          ".searchable-dropdown-list"
        );
        // Also check for dropdowns that have been moved to body
        const bodyDropdowns = document.querySelectorAll(
          ".searchable-dropdown-list"
        );
        const allDropdownsList = [...allDropdowns, ...bodyDropdowns];
        
        allDropdownsList.forEach((list) => {
          if (list !== dropdown) {
            // Don't close the current one
            list.style.display = "none";
          }
        });

        // Now, open the dropdown for the currently focused input
        if (dropdown) {
          positionDropdownFixed(e.target, dropdown);
        }
      }
    });

    // Add click handler for dropdown inputs
    wrapper.addEventListener("click", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        const dropdown = findDropdownForInput(e.target);
        if (dropdown) {
          positionDropdownFixed(e.target, dropdown);
        }
      }
    });

    // All closing/reverting logic is now handled in the keydown listener for Escape, Enter, and Tab.

    wrapper.addEventListener("keyup", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        const filter = e.target.value.toLowerCase();
        const list = findDropdownForInput(e.target);
        if (list) {
          list.querySelectorAll("div").forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? "" : "none";
          });
          // Clear any active selection when user types
          const activeItem = list.querySelector(".dropdown-active");
          if (activeItem) activeItem.classList.remove("dropdown-active");
          // Reposition dropdown after filtering if it's visible
          if (list.style.display === "block") {
            positionDropdownFixed(e.target, list);
          }
        }
      }
    });

    // Add input event listener for real-time filtering
    wrapper.addEventListener("input", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        const filter = e.target.value.toLowerCase();
        const list = findDropdownForInput(e.target);
        if (list) {
          list.querySelectorAll("div").forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? "" : "none";
          });
          // Clear any active selection when user types
          const activeItem = list.querySelector(".dropdown-active");
          if (activeItem) activeItem.classList.remove("dropdown-active");
          // Reposition dropdown after filtering if it's visible
          if (list.style.display === "block") {
            positionDropdownFixed(e.target, list);
          }
        }
      }
    });
  }

  // REPLACE the openReconcileCreateTicketModal function
  function openReconcileCreateTicketModal(reconcileId) {
    const reconcileEntry = appData.allReconcileHrs.find(
      (r) => r.id == reconcileId
    );
    if (!reconcileEntry) {
      showToast("Could not find the time entry.", "error");
      return;
    }

    const modal = document.getElementById("reconcile-create-ticket-modal");
    const today = new Date().toISOString().split("T")[0];

    modal.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.type !== "checkbox" && el.type !== "button") el.value = "";
    });
    modal.querySelectorAll(".searchable-dropdown-input").forEach((el) => {
      el.value = "";
      el.dataset.value = "";
    });

    document.getElementById("rct-createdAt").value = reconcileEntry.date
      ? new Date(reconcileEntry.date).toISOString().split("T")[0]
      : today;
    document.getElementById("rct-title").value =
      reconcileEntry.description || "";
    document.getElementById("rct-type").value = "Task";
    document.getElementById("rct-status").value = "Open";

    const requestedByContainer = document.getElementById(
      "rct-requestedBy-container"
    );
    createSearchableDropdownForModal(
      requestedByContainer,
      appData.users.map((u) => ({ value: u, text: u })),
      "Select requester..."
    );
    const requestedByInput = requestedByContainer.querySelector("input");
    if (reconcileEntry.clockify_member) {
      requestedByInput.value = reconcileEntry.clockify_member;
      requestedByInput.dataset.value = reconcileEntry.clockify_member;
    }

    const assigneeContainer = document.getElementById("rct-assignee-container");
    const assignedAtContainer = document.getElementById(
      "rct-assignedAt-container"
    );
    const assignedAtInput = document.getElementById("rct-assignedAt");
    const handleAssigneeChange = () => {
      const assigneeInput = assigneeContainer.querySelector("input");
      const hasAssignee = !!assigneeInput.dataset.value;
      assignedAtContainer.style.display = hasAssignee ? "flex" : "none";
      if (hasAssignee && !assignedAtInput.value) {
        assignedAtInput.value = reconcileEntry.date
          ? new Date(reconcileEntry.date).toISOString().split("T")[0]
          : today;
        assignedAtInput.dispatchEvent(new Event("input"));
      }
    };
    createSearchableDropdownForModal(
      assigneeContainer,
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      "Select assignee...",
      handleAssigneeChange // Pass callback to handle visibility change
    );
    const defaultAssignee = appData.teamMembers.find(
      (m) => m.name === reconcileEntry.clockify_member
    );
    if (defaultAssignee) {
      const assigneeInput = assigneeContainer.querySelector("input");
      assigneeInput.value = defaultAssignee.name;
      assigneeInput.dataset.value = defaultAssignee.id;
    }

    createSearchableDropdownForModal(
      document.getElementById("rct-project-container"),
      appData.projects.map((p) => ({ value: p.id, text: p.name })),
      "Select project..."
    );
    document.getElementById("epic-datalist-rct").innerHTML = appData.epics
      .map((e) => `<option value="${escapeHtml(e)}"></option>`)
      .join("");

    const statusSelect = document.getElementById("rct-status");
    const startedContainer = document.getElementById("rct-startedAt-container");
    const completedContainer = document.getElementById(
      "rct-completedAt-container"
    );
    const reasonContainer = document.getElementById("rct-reason-container");
    const startedInput = document.getElementById("rct-startedAt");
    const completedInput = document.getElementById("rct-completedAt");

    const handleStatusChange = () => {
      const status = statusSelect.value;
      const showStarted = [
        "In Progress",
        "Completed",
        "Cancelled",
        "Rejected",
      ].includes(status);
      const showCompleted = ["Completed", "Cancelled", "Rejected"].includes(
        status
      );
      const showReason = [
        "On Hold",
        "Blocked",
        "Cancelled",
        "Rejected",
      ].includes(status);

      startedContainer.style.display = showStarted ? "flex" : "none";
      completedContainer.style.display = showCompleted ? "flex" : "none";
      reasonContainer.style.display = showReason ? "flex" : "none";

      if (showStarted && !startedInput.value) startedInput.value = today;
      if (showCompleted && !completedInput.value) completedInput.value = today;

      startedInput.dispatchEvent(new Event("input"));
      completedInput.dispatchEvent(new Event("input"));
    };

    statusSelect.removeEventListener("change", handleStatusChange);
    statusSelect.addEventListener("change", handleStatusChange);

    handleAssigneeChange(); // Initial check for default assignee
    handleStatusChange(); // Initial check for default status

    const setupDateListener = (inputId, displayId) => {
      const input = document.getElementById(inputId);
      const display = document.getElementById(displayId);
      const updateDisplay = () => {
        display.textContent = formatDateForUIDisplay(input.value);
      };
      input.addEventListener("input", updateDisplay);
      updateDisplay();
    };

    setupDateListener("rct-createdAt", "rct-createdAt-display");
    setupDateListener("rct-startedAt", "rct-startedAt-display");
    setupDateListener("rct-completedAt", "rct-completedAt-display");
    setupDateListener("rct-assignedAt", "rct-assignedAt-display");

    document.getElementById("rct-submit-btn").onclick = () =>
      submitReconcileTicket(reconcileId);
    modal.style.display = "flex";
  }
  // REPLACE the existing submitReconcileTicket function
  async function submitReconcileTicket(reconcileId) {
    const modal = document.getElementById("reconcile-create-ticket-modal");
    const submitBtn = document.getElementById("rct-submit-btn");

    // --- Validation ---
    const requiredFields = {
      "#rct-createdAt": "Created Date",
      "#rct-title": "Title",
      "#rct-requestedBy-container input": "Requested By",
    };
    let errors = [];
    for (const [selector, name] of Object.entries(requiredFields)) {
      const el = modal.querySelector(selector);
      const value =
        el.dataset.value !== undefined ? el.dataset.value : el.value;
      if (!value) {
        errors.push(`${name} is required.`);
      }
    }
    const status = document.getElementById("rct-status").value;
    if (
      ["On Hold", "Blocked", "Cancelled", "Rejected"].includes(status) &&
      !document.getElementById("rct-reason").value
    ) {
      errors.push(`Reason is required for "${status}" status.`);
    }
    if (errors.length > 0) {
      showToast(errors.join("\n"), "error");
      return;
    }

    // --- UI State: Submitting ---
    submitBtn.textContent = "Creating...";
    submitBtn.disabled = true;

    // Remove manual ID generation - let database handle auto-increment
    // This prevents duplicate key constraint violations

    // --- Data Gathering ---
    const createdAt = document.getElementById("rct-createdAt").value;
    const now = new Date();
    const createdAtTimestamp = new Date(
      `${createdAt}T${now.toTimeString().split(" ")[0]}`
    ).toISOString();

    const assigneeId =
      document.querySelector("#rct-assignee-container input").dataset.value ||
      null;

    const newTicketData = {
      // id: newTicketId, // REMOVED to prevent duplicate key violations - let DB auto-generate
      title: document.getElementById("rct-title").value.trim(),
      description: document.getElementById("rct-description").value.trim(),
      createdAt: createdAtTimestamp,
      type: document.getElementById("rct-type").value,
      requestedBy: document.querySelector("#rct-requestedBy-container input")
        .value,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      status: status,
      projectId: document.querySelector("#rct-project-container input").dataset
        .value
        ? parseInt(
            document.querySelector("#rct-project-container input").dataset
              .value,
            10
          )
        : null,
      epic: document.getElementById("rct-epic").value.trim() || null,
      startedAt: document.getElementById("rct-startedAt").value || null,
      completedAt: document.getElementById("rct-completedAt").value || null,
      log: [],
    };
    if (assigneeId) newTicketData.assignedAt = new Date().toISOString();

    const reason = document.getElementById("rct-reason").value.trim();
    if (reason) {
      const logEntry = {
        user: appData.currentUserEmail,
        timestamp: new Date().toISOString(),
        field: "status",
        oldValue: "Open",
        newValue: status,
        reason: reason,
      };
      newTicketData.log.push(logEntry);
    }

    // --- Supabase Operations ---
    const { data: insertedTicket, error: insertError } = await supabaseClient
      .from("ticket")
      .insert(newTicketData)
      .select()
      .single();

    if (insertError) {
      showToast("Error creating ticket: " + insertError.message, "error");
      submitBtn.textContent = "Create Ticket";
      submitBtn.disabled = false;
      return;
    }

    const { error: updateError } = await supabaseClient
      .from("reconcileHrs")
      .update({ ticketNumber: insertedTicket.id })
      .eq("id", reconcileId);

    if (updateError) {
      showToast(
        `Ticket ${insertedTicket.id} created, but failed to link time entry: ${updateError.message}`,
        "error"
      );
    } else {
      showToast("Ticket created and linked successfully!", "success");
      // --- FIX: Update local state before re-rendering ---
      const localIndex = appData.allReconcileHrs.findIndex(
        (r) => r.id == reconcileId
      );
      if (localIndex > -1) {
        appData.allReconcileHrs[localIndex].ticketNumber = insertedTicket.id;
      }
    }

    // Update frontend state with new ticket
    await updateTicketDataAfterCreation([insertedTicket]);

    // --- Finalize ---
    modal.style.display = "none";
    submitBtn.textContent = "Create Ticket";
    submitBtn.disabled = false;
    applyFilterAndRender();
  }
  async function handleReconcileUpdate(event, newValueFromDropdown) {
    const element = event.target;
    const reconcileId = element.dataset.reconcileId;
    const oldValue = element.dataset.oldValue;
    const newValue = newValueFromDropdown; // Only use value from dropdown click

    console.log("handleReconcileUpdate called:", { reconcileId, oldValue, newValue });

    if (String(oldValue || "") === String(newValue || "")) {
      console.log("No change detected, skipping update");
      return;
    }

    const td = element.closest("td");
    const parentRow = element.closest("tr");
    
    if (!td || !parentRow) {
      console.error("Could not find TD or parent row for input");
      return;
    }
    
    td.classList.add("updating");

    console.log("Updating database:", { reconcileId, ticketNumber: newValue });
    const { error } = await supabaseClient
      .from("reconcileHrs")
      .update({ ticketNumber: newValue })
      .eq("id", reconcileId);

    td.classList.remove("updating");

    if (error) {
      console.error("Database update error:", error);
      showToast(`Update failed: ${error.message}`, "error");
    } else {
      console.log("Database update successful!");
      showToast(`Ticket linked successfully!`, "success");
      td.classList.add("cell-success-highlight");
      setTimeout(() => {
        td.classList.remove("cell-success-highlight");
      }, 2000);

      const weekCell = parentRow.querySelector(".reconcile-week-cell");
      if (weekCell) {
        const iconSpan = weekCell.querySelector(".reconcile-status-indicator");
        const iconElement = iconSpan.querySelector("i");
        if (
          newValue ||
          parentRow.querySelector(".reconcile-exclude-checkbox").checked
        ) {
          iconSpan.className = "reconcile-status-indicator done";
          iconElement.className = "fas fa-check";
        } else {
          iconSpan.className = "reconcile-status-indicator todo";
          iconElement.className = "fas fa-circle";
        }
      }

      const localIndex = appData.allReconcileHrs.findIndex(
        (r) => r.id == reconcileId
      );
      if (localIndex > -1)
        appData.allReconcileHrs[localIndex].ticketNumber = newValue;

      element.dataset.oldValue = newValue;
      const selectedTicket = appData.allTickets.find((t) => t.id == newValue);
      // MODIFIED: Add "HRB-" prefix when setting the input's display value after an update.
      element.value = selectedTicket
        ? `[HRB-${selectedTicket.id}] ${selectedTicket.title}`
        : "";
    }
  }

  /**
   * NEW: Handles toggling the exclude checkbox for a reconcile entry.
   * @param {Event} event - The change event from the checkbox.
   */
  async function handleReconcileExcludeToggle(event) {
    const checkbox = event.target;
    const reconcileId = checkbox.dataset.reconcileId;
    const isExcluded = checkbox.checked;
    const parentRow = checkbox.closest("tr");

    parentRow.classList.add("updating");

    const { error } = await supabaseClient
      .from("reconcileHrs")
      .update({ is_excluded: isExcluded })
      .eq("id", reconcileId);

    parentRow.classList.remove("updating");

    if (error) {
      showToast(`Update failed: ${error.message}`, "error");
      // Revert checkbox on failure
      checkbox.checked = !isExcluded;
    } else {
      // Update local data to match
      const localIndex = appData.allReconcileHrs.findIndex(
        (r) => r.id == reconcileId
      );
      if (localIndex > -1) {
        appData.allReconcileHrs[localIndex].is_excluded = isExcluded;
      }

      // Also update the status icon in the first column
      const weekCell = parentRow.querySelector(".reconcile-week-cell");
      if (weekCell) {
        const iconSpan = weekCell.querySelector(".reconcile-status-indicator");
        const iconElement = iconSpan.querySelector("i");
        const hasTicket = parentRow.querySelector(".searchable-dropdown-input")
          .dataset.oldValue;
        if (isExcluded || hasTicket) {
          iconSpan.className = "reconcile-status-indicator done";
          iconElement.className = "fas fa-check";
        } else {
          iconSpan.className = "reconcile-status-indicator todo";
          iconElement.className = "fas fa-circle";
        }
      }

      // If the main filter is active, this row might need to disappear
      if (reconcileExcludeDone && isExcluded) {
        applyFilterAndRender(); // Re-render to hide the row
      }
    }
  }
  /**
   * Adds keyboard navigation listeners for the Reconcile table.
   */
  function addReconcileKeyboardListeners() {
    const wrapper = document.getElementById("reconcile-view-wrapper");
    const table = wrapper.querySelector("#reconcile-table");
    if (!table || !table.tBodies[0]) return;

    // A helper function to handle Tab navigation consistently
    const handleTabNavigation = (e, activeEl) => {
      e.preventDefault();
      const currentCell = activeEl.closest("td");
      const currentRow = currentCell.parentElement;
      const rowIndex = currentRow.rowIndex - 1; // Adjust for thead
      const colIndex = currentCell.cellIndex;
      const bodyRows = table.tBodies[0].rows;
      const lastColIndex = bodyRows[0].cells.length - 1;
      let nextCell = null;

      if (e.shiftKey) {
        // Handle Shift + Tab for reverse navigation
        if (colIndex > 0) {
          nextCell = currentRow.cells[colIndex - 1];
        } else if (rowIndex > 0) {
          nextCell = bodyRows[rowIndex - 1].cells[lastColIndex];
        }
      } else {
        // Handle Tab for forward navigation
        if (colIndex < lastColIndex) {
          nextCell = currentRow.cells[colIndex + 1];
        } else if (rowIndex < bodyRows.length - 1) {
          nextCell = bodyRows[rowIndex + 1].cells[0];
        }
      }
      if (nextCell) {
        nextCell.focus();
      }
    };

    wrapper.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl.tagName === "INPUT" &&
        activeEl.classList.contains("searchable-dropdown-input");
      const isCell = activeEl.tagName === "TD";

      // --- Block 1: Handle key events when an INPUT field has focus ---
      if (isInput) {
        const list = findDropdownForInput(activeEl);
        
        // Safety check: ensure the dropdown list exists
        if (!list) {
          return;
        }
        
        let activeItem = list.querySelector(".dropdown-active");

        const findNextVisible = (current, direction) => {
          let sibling =
            direction === "down"
              ? current.nextElementSibling
              : current.previousElementSibling;
          while (sibling) {
            if (sibling.style.display !== "none") return sibling;
            sibling =
              direction === "down"
                ? sibling.nextElementSibling
                : sibling.previousElementSibling;
          }
          return null;
        };

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            let nextItem = activeItem
              ? findNextVisible(activeItem, "down")
              : list.querySelector('div:not([style*="display: none"])');
            if (nextItem) {
              if (activeItem) activeItem.classList.remove("dropdown-active");
              nextItem.classList.add("dropdown-active");
              nextItem.scrollIntoView({ block: "nearest" });
            }
            return;

          case "ArrowUp":
            e.preventDefault();
            if (activeItem) {
              let prevItem = findNextVisible(activeItem, "up");
              if (prevItem) {
                activeItem.classList.remove("dropdown-active");
                prevItem.classList.add("dropdown-active");
                prevItem.scrollIntoView({ block: "nearest" });
              }
            }
            return;

          case "Enter":
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling

            // Prioritize the item selected with arrow keys.
            if (activeItem) {
              activeItem.click();
            }
            // If no item was highlighted, fallback to the first visible one.
            else {
              const firstVisibleItem = list.querySelector(
                'div:not([style*="display: none"])'
              );
              if (firstVisibleItem) {
                firstVisibleItem.click();
              } else {
                // If there are no items to select, just hide the list.
                list.style.display = "none";
              }
            }

            // Return focus to the parent cell.
            activeEl.closest("td").focus();
            return;

          case "Tab":
            const oldValue = activeEl.dataset.oldValue;
            const oldTicket = appData.allTickets.find((t) => t.id == oldValue);
            activeEl.value = oldTicket
              ? `[HRB-${oldTicket.id}] ${oldTicket.title}`
              : "";
            list.style.display = "none";
            handleTabNavigation(e, activeEl);
            return;

          case "Escape":
            e.preventDefault();
            const escOldValue = activeEl.dataset.oldValue;
            const escOldTicket = appData.allTickets.find(
              (t) => t.id == escOldValue
            );
            activeEl.value = escOldTicket
              ? `[HRB-${escOldTicket.id}] ${escOldTicket.title}`
              : "";
            list.style.display = "none";
            activeEl.closest("td").focus();
            return;
        }
      }

      // --- Block 2: Handle key events when a TD cell has focus ---
      if (isCell) {
        switch (e.key) {
          case " ":
            const lastColIndex = activeEl.parentElement.cells.length - 1;
            if (activeEl.cellIndex === lastColIndex) {
              e.preventDefault();
              const checkbox = activeEl.querySelector(
                ".reconcile-exclude-checkbox"
              );
              if (checkbox) checkbox.click();
            }
            return;

          case "Tab":
            handleTabNavigation(e, activeEl);
            return;

          default:
            const currentCell = activeEl;
            const currentRow = currentCell.parentElement;
            const rowIndex = currentRow.rowIndex - 1;
            const colIndex = currentCell.cellIndex;
            const bodyRows = table.tBodies[0].rows;
            const lastColIdx = bodyRows[0].cells.length - 1;
            let nextCell = null;

            switch (e.key) {
              case "Enter":
                e.preventDefault();
                const inputToFocus = currentCell.querySelector(
                  "input:not([type=checkbox])"
                );
                if (inputToFocus) {
                  inputToFocus.focus();
                  inputToFocus.select();
                }
                break;
              case "ArrowUp":
                if (rowIndex > 0)
                  nextCell = bodyRows[rowIndex - 1].cells[colIndex];
                break;
              case "ArrowDown":
                if (rowIndex < bodyRows.length - 1)
                  nextCell = bodyRows[rowIndex + 1].cells[colIndex];
                break;
              case "ArrowLeft":
                if (colIndex > 0) nextCell = currentRow.cells[colIndex - 1];
                break;
              case "ArrowRight":
                if (colIndex < lastColIdx)
                  nextCell = currentRow.cells[colIndex + 1];
                break;
              default:
                if (
                  e.key.length === 1 &&
                  !e.ctrlKey &&
                  !e.altKey &&
                  !e.metaKey
                ) {
                  const textInput = currentCell.querySelector(
                    "input:not([type=checkbox])"
                  );
                  if (textInput) {
                    e.preventDefault();
                    textInput.focus();
                    textInput.value = e.key;
                    textInput.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                  }
                }
                return;
            }
            if (nextCell) {
              e.preventDefault();
              nextCell.focus();
            }
        }
      }
    });
  }

  /**
   * Updates the UI of the Reconcile view's pagination controls.
   */
  function updateReconcilePagination(totalItems) {
    const controls = document.getElementById("reconcile-pagination-controls");
    const totalCountEl = document.getElementById("reconcile-total-count");
    const pageInfoEl = document.getElementById("reconcile-page-info");
    const prevBtn = document.getElementById("reconcile-prev-page");
    const nextBtn = document.getElementById("reconcile-next-page");
    const totalPages = Math.ceil(totalItems / ticketsPerPage);

    totalCountEl.textContent = `${totalItems} total entries`;

    if (totalPages <= 1) {
      controls.style.display = "none";
    } else {
      controls.style.display = "flex";
      pageInfoEl.textContent = `Page ${reconcileCurrentPage} of ${totalPages}`;
      prevBtn.disabled = reconcileCurrentPage === 1;
      nextBtn.disabled = reconcileCurrentPage === totalPages;
    }
  }

  /**
   * Adds event listeners for the Reconcile view pagination buttons.
   */
  function addReconcilePaginationListeners() {
    document
      .getElementById("reconcile-prev-page")
      .addEventListener("click", () => {
        if (reconcileCurrentPage > 1) {
          reconcileCurrentPage--;
          renderReconcileView(appData.reconcileHrs);
        }
      });
    document
      .getElementById("reconcile-next-page")
      .addEventListener("click", () => {
        const totalPages = Math.ceil(
          appData.reconcileHrs.length / ticketsPerPage
        );
        if (reconcileCurrentPage < totalPages) {
          reconcileCurrentPage++;
          renderReconcileView(appData.reconcileHrs);
        }
      });
  }

  /**
   * Gets the ISO week number of a date.
   * @param {Date} date - The input date.
   * @returns {string} The year and week number in "YYYY-WNN" format.
   */
  function getWeekOfYear(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    // Set to nearest Thursday: current date + 4 - current day number
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }


  /**
   * Initializes listeners for the dashboard filters.
   */
  function addDashboardFilterListeners() {
    const assigneeSelect = document.getElementById("dashboard-assignee-filter");
    const startDateInput = document.getElementById("dashboard-start-date");
    const endDateInput = document.getElementById("dashboard-end-date");

    // Populate assignee dropdown
    if (appData.teamMembers && appData.teamMembers.length > 0) {
      assigneeSelect.innerHTML = '<option value="all">All Members</option>' + 
        appData.teamMembers
      .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
      .join("");
    } else {
      assigneeSelect.innerHTML = '<option value="all">All Members</option>';
    }

    // Set default to logged-in user (with safety check)
    if (appData.currentUser && appData.currentUser.id) {
      assigneeSelect.value = appData.currentUser.id;
      dashboardAssigneeId = appData.currentUser.id;
    } else if (appData.currentUserId) {
      assigneeSelect.value = appData.currentUserId;
      dashboardAssigneeId = appData.currentUserId;
    } else {
      assigneeSelect.value = "all";
      dashboardAssigneeId = "all";
    }

    // Set default date range (last 10 weeks)
    const today = new Date();
    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(today.getDate() - 70); // 10 weeks = 70 days
    startDateInput.value = tenWeeksAgo.toISOString().split("T")[0];
    endDateInput.value = today.toISOString().split("T")[0];

    // Store initial values
    dashboardStartDate = startDateInput.value;
    dashboardEndDate = endDateInput.value;

    // Add listeners
    const applyFilters = () => {
      dashboardAssigneeId = assigneeSelect.value;
      dashboardStartDate = startDateInput.value;
      dashboardEndDate = endDateInput.value;
      if (currentView === "home") {
        renderDashboard();
      }
    };

    assigneeSelect.addEventListener("change", applyFilters);
    startDateInput.addEventListener("change", applyFilters);
    endDateInput.addEventListener("change", applyFilters);
    
    // Re-render dashboard after filters are set up to ensure numbers are visible
    if (currentView === "home") {
      console.log('Re-rendering dashboard after filter setup...');
      setTimeout(() => {
        renderDashboard();
      }, 50);
    }
  }

  /**
   * Renders a list of tickets for the dashboard.
   * @param {string} containerId - The ID of the container element.
   * @param {Array<object>} tickets - The array of ticket objects to render.
   */
  function renderDashboardTicketList(containerId, tickets) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tickets.length === 0) {
      container.innerHTML =
        '<p style="color: var(--text-secondary); padding: 1rem;">No quests here!</p>';
      return;
    }

    container.innerHTML = tickets
      .map((ticket) => {
        const priorityInfo = getTagInfo("priority", ticket.priority);
        return `
            <div class="dashboard-ticket-item" data-ticket-id="${ticket.id}">
                <div class="ticket-info">
                    <span class="ticket-id">HRB-${ticket.id}</span>
                    <div class="ticket-title">${escapeHtml(ticket.title)}</div>
                </div>
                <span class="ticket-priority-tag ${
                  priorityInfo.className
                }">${escapeHtml(priorityInfo.text)}</span>
            </div>
        `;
      })
      .join("");

    // Add click listeners to open the detail modal
    container.querySelectorAll(".dashboard-ticket-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const ticketId = e.currentTarget.dataset.ticketId;
        showTaskDetailModal(ticketId);
      });
    });
  }

  /**
   * Main function to calculate and render all dashboard components.
   */
  function renderDashboard() {
    console.log('renderDashboard called - currentView:', currentView);
    
    // Check if dashboard is visible
    const dashboardWrapper = document.getElementById("dashboard-view-wrapper");
    if (!dashboardWrapper || dashboardWrapper.style.display === 'none') {
      console.log('Dashboard not visible, skipping render');
      return;
    }
    
    console.log('Dashboard elements found, proceeding with render...');
    
    // 1. Filter tickets based on dashboard controls
    const startDate = new Date(dashboardStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dashboardEndDate);
    endDate.setHours(23, 59, 59, 999);

    const filteredTickets = appData.allTickets.filter((t) => {
      const createdAt = new Date(t.createdAt);
      const isAssigneeMatch = dashboardAssigneeId === "all" || t.assigneeId == dashboardAssigneeId;
      return isAssigneeMatch && createdAt >= startDate && createdAt <= endDate;
    });

    const allUserTickets = dashboardAssigneeId === "all" 
      ? appData.allTickets 
      : appData.allTickets.filter((t) => t.assigneeId == dashboardAssigneeId);
    
    const finalStates = ["Completed", "Cancelled", "Rejected"];
    const activeTickets = allUserTickets.filter(
      (t) => !finalStates.includes(t.status)
    );

    // 2. Calculate comprehensive metrics
    // Use allUserTickets if filteredTickets is empty (date range issue)
    const ticketsToUse = filteredTickets.length > 0 ? filteredTickets : allUserTickets;
    
    const totalCount = ticketsToUse.length;
    const completedCount = ticketsToUse.filter(t => t.status === "Completed").length;
    const inProgressCount = ticketsToUse.filter(t => t.status === "In Progress").length;
    const blockedCount = ticketsToUse.filter(t => t.status === "Blocked").length;
    
    // Debug logging
    console.log('Dashboard metrics calculation:');
    console.log('- Total allTickets:', appData.allTickets.length);
    console.log('- Filtered tickets:', filteredTickets.length);
    console.log('- All user tickets:', allUserTickets.length);
    console.log('- Tickets being used:', ticketsToUse.length);
    console.log('- Total count:', totalCount);
    console.log('- Completed count:', completedCount);
    console.log('- In Progress count:', inProgressCount);
    console.log('- Blocked count:', blockedCount);
    console.log('- Dashboard assignee filter:', dashboardAssigneeId);
    console.log('- Date range:', dashboardStartDate, 'to', dashboardEndDate);
    
    // Calculate more relevant metrics
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const avgResolutionTime = calculateAvgResolutionTime(ticketsToUse);
    const avgResponseTime = calculateAvgResponseTime(ticketsToUse);
    
    // Calculate percentage changes based on previous period
    const ticketsChange = calculateChangePercentage(totalCount, 'tickets');
    const completedChange = calculateChangePercentage(completedCount, 'completed');
    const progressChange = calculateChangePercentage(inProgressCount, 'progress');
    const blockedChange = calculateChangePercentage(blockedCount, 'blocked');

    // 3. Update key metrics
    document.getElementById("total-tickets-count").textContent = totalCount;
    document.getElementById("completed-tickets-count").textContent = completedCount;
    document.getElementById("in-progress-count").textContent = inProgressCount;
    document.getElementById("blocked-count").textContent = blockedCount;
    
    
    // Update change indicators
    document.getElementById("tickets-change").textContent = ticketsChange;
    document.getElementById("completed-change").textContent = completedChange;
    document.getElementById("progress-change").textContent = progressChange;
    document.getElementById("blocked-change").textContent = blockedChange;
    
    // Update trend indicators
    document.getElementById("tickets-trend").className = `metric-trend ${ticketsChange.startsWith('+') ? 'positive' : 'negative'}`;
    document.getElementById("completed-trend").className = `metric-trend ${completedChange.startsWith('+') ? 'positive' : 'negative'}`;
    document.getElementById("progress-trend").className = `metric-trend ${progressChange.startsWith('+') ? 'positive' : 'negative'}`;
    document.getElementById("blocked-trend").className = `metric-trend ${blockedChange.startsWith('+') ? 'positive' : 'negative'}`;

    // 4. Update velocity metrics
    document.getElementById("avg-response-time").textContent = `${avgResponseTime}d`;
    document.getElementById("avg-resolution-time").textContent = `${avgResolutionTime}d`;
    document.getElementById("completion-rate").textContent = `${completionRate}%`;

    // 5. Render charts
    renderTrendsChart(ticketsToUse);
    renderPriorityChart(ticketsToUse);
    renderTeamPerformance(allUserTickets);
    
    // 6. Render chart metrics
    renderChartMetrics(ticketsToUse);
  }

  /**
   * Render the trends chart
   */
  function renderTrendsChart(tickets) {
    const ctx = document.getElementById("trends-chart").getContext("2d");
    if (trendsChart) {
      trendsChart.destroy();
    }

    // Calculate weekly data
    const weeklyData = {};
    tickets.forEach((t) => {
      const week = getWeekOfYear(new Date(t.createdAt));
      if (!weeklyData[week]) {
        weeklyData[week] = { incoming: 0, completed: 0 };
      }
      weeklyData[week].incoming++;
      if (t.status === "Completed") {
        weeklyData[week].completed++;
      }
    });

    const sortedWeeks = Object.keys(weeklyData).sort();
    const chartLabels = sortedWeeks.map(week => `Week ${week.split('-W')[1]}`);
    const incomingData = sortedWeeks.map((week) => weeklyData[week].incoming);
    const completedData = sortedWeeks.map((week) => weeklyData[week].completed);

    trendsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Created',
            data: incomingData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Completed',
            data: completedData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      }
    });
  }

  /**
   * Render priority distribution chart
   */
  function renderPriorityChart(tickets) {
    const ctx = document.getElementById("priority-chart").getContext("2d");
    
    // Destroy existing chart if it exists
    if (window.priorityChart) {
      window.priorityChart.destroy();
    }
    
    const priorityData = {
      'Urgent': tickets.filter(t => t.priority === 'Urgent').length,
      'High': tickets.filter(t => t.priority === 'High').length,
      'Medium': tickets.filter(t => t.priority === 'Medium').length,
      'Low': tickets.filter(t => t.priority === 'Low').length
    };

    const colors = {
      'Urgent': '#ef4444',
      'High': '#f59e0b',
      'Medium': '#3b82f6',
      'Low': '#10b981'
    };

    window.priorityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(priorityData),
        datasets: [{
          data: Object.values(priorityData),
          backgroundColor: Object.keys(priorityData).map(p => colors[p]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Update legend
    const legend = document.getElementById("priority-legend");
    legend.innerHTML = Object.keys(priorityData).map(priority => `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${colors[priority]}"></div>
        <span>${priority}: ${priorityData[priority]}</span>
      </div>
    `).join('');
  }

  /**
   * Render status overview bars
   */
  function renderStatusOverview(tickets) {
    const statusData = {
      'Open': tickets.filter(t => t.status === 'Open').length,
      'In Progress': tickets.filter(t => t.status === 'In Progress').length,
      'On Hold': tickets.filter(t => t.status === 'On Hold').length,
      'Blocked': tickets.filter(t => t.status === 'Blocked').length,
      'Completed': tickets.filter(t => t.status === 'Completed').length
    };

    const total = Object.values(statusData).reduce((sum, count) => sum + count, 0);
    const statusColors = {
      'Open': '#64748b', // Light Gray
      'In Progress': '#f59e0b', // Keep existing
      'On Hold': '#8b4513', // Brown
      'Blocked': '#4a5568', // Dark Gray
      'Completed': '#22543d' // Green
    };

    // Update status summary
    const statusSummary = document.getElementById("status-summary");
    const blockedCount = statusData['Blocked'];
    if (blockedCount > 0) {
      statusSummary.textContent = `${blockedCount} tickets blocked`;
      statusSummary.style.color = '#ef4444';
      statusSummary.style.background = '#fef2f2';
    } else {
      statusSummary.textContent = 'All systems operational';
      statusSummary.style.color = '#10b981';
      statusSummary.style.background = '#ecfdf5';
    }

    const statusBars = document.getElementById("status-bars");
    statusBars.innerHTML = Object.entries(statusData).map(([status, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return `
        <div class="status-bar">
          <div class="status-label">${status}</div>
          <div class="status-progress">
            <div class="status-fill" style="width: ${percentage}%; background-color: ${statusColors[status]}"></div>
          </div>
          <div class="status-count">${count}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render team performance metrics
   */
  function renderTeamPerformance(tickets) {
    // Calculate average response and resolution times using the proper functions
    const avgResponseTime = calculateAvgResponseTime(tickets);
    const avgResolutionTime = calculateAvgResolutionTime(tickets);

    // Calculate completion rate
    const totalTickets = tickets.length;
    const completedCount = tickets.filter(t => t.status === 'Completed').length;
    const completionRate = totalTickets > 0 ? Math.round((completedCount / totalTickets) * 100) : 0;

    // Update the elements (these are now handled in renderDashboard, but keeping for consistency)
    const responseTimeEl = document.getElementById("avg-response-time");
    const resolutionTimeEl = document.getElementById("avg-resolution-time");
    const completionRateEl = document.getElementById("completion-rate");
    
    if (responseTimeEl) responseTimeEl.textContent = `${avgResponseTime}d`;
    if (resolutionTimeEl) resolutionTimeEl.textContent = `${avgResolutionTime}d`;
    if (completionRateEl) completionRateEl.textContent = `${completionRate}%`;
  }

  /**
   * Render recent activity
   */
  function renderRecentActivity(tickets) {
    const recentTickets = tickets
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Update activity count
    document.getElementById("activity-count").textContent = `${recentTickets.length} events`;

    const activityList = document.getElementById("recent-activity-list");
    if (recentTickets.length === 0) {
      activityList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 2rem;">No recent activity</div>';
      return;
    }

    activityList.innerHTML = recentTickets.map(ticket => {
      const timeAgo = formatTimeAgo(new Date(ticket.createdAt));
      const assignee = appData.teamMembers.find(m => m.id == ticket.assigneeId);
      const priorityColors = {
        'Urgent': '#ef4444',
        'High': '#f59e0b',
        'Medium': '#3b82f6',
        'Low': '#10b981'
      };
      
      return `
        <div class="activity-item">
          <div class="activity-icon" style="background-color: ${priorityColors[ticket.priority] || '#3b82f6'};">
            <i class="fas fa-plus"></i>
          </div>
          <div class="activity-content">
            <div class="activity-text">New ticket HRB-${ticket.id} created</div>
            <div class="activity-time">${timeAgo} • ${assignee?.name || 'Unassigned'}</div>
          </div>
        </div>
      `;
    }).join('');
  }


  /**
   * Render a single ticket list
   */
  function renderTicketList(containerId, tickets, countId) {
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);
    
    countElement.textContent = tickets.length;

    if (tickets.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 3rem; font-size: 0.9rem;">No tickets found</div>';
      return;
    }

    container.innerHTML = tickets.map(ticket => {
      const assignee = appData.teamMembers.find(m => m.id == ticket.assigneeId);
      const statusColors = {
        'Open': '#64748b', // Light Gray
        'In Progress': '#f59e0b', // Keep existing
        'On Hold': '#8b4513', // Brown
        'Blocked': '#4a5568', // Dark Gray
        'Completed': '#22543d' // Green
      };
      
      return `
        <div class="ticket-item" onclick="showTaskDetailModal(${ticket.id})">
          <div class="ticket-item-info">
            <div class="ticket-item-id">HRB-${ticket.id}</div>
            <div class="ticket-item-title">${escapeHtml(ticket.title)}</div>
            <div class="ticket-item-meta">
              <span class="ticket-priority-tag ${ticket.priority.toLowerCase()}">${ticket.priority}</span>
              <span style="color: #64748b; font-size: 0.8rem; font-weight: 500;">${assignee?.name || 'Unassigned'}</span>
              <span style="color: ${statusColors[ticket.status] || '#64748b'}; font-size: 0.8rem; font-weight: 600;">${ticket.status}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Format time ago
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }




  function calculateAvgResolutionTime(tickets) {
    // Count tickets that are in final states (Completed, Cancelled, Rejected) and have both createdAt and completedAt
    const finalStates = ['Completed', 'Cancelled', 'Rejected'];
    const resolvedTickets = tickets.filter(t => 
      finalStates.includes(t.status) && 
      t.createdAt && 
      t.completedAt
    );
    
    if (resolvedTickets.length === 0) return 0;
    
    const totalDays = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt);
      const completed = new Date(ticket.completedAt);
      const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days); // Ensure non-negative days
    }, 0);
    
    return Math.round(totalDays / resolvedTickets.length);
  }

  function calculateAvgResponseTime(tickets) {
    // Count tickets that have both createdAt and assignedAt
    const assignedTickets = tickets.filter(t => 
      t.createdAt && 
      t.assignedAt
    );
    
    if (assignedTickets.length === 0) return 0;
    
    const totalDays = assignedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt);
      const assigned = new Date(ticket.assignedAt);
      const days = Math.ceil((assigned - created) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days); // Ensure non-negative days
    }, 0);
    
    return Math.round(totalDays / assignedTickets.length);
  }

  function calculateActiveMembers(tickets) {
    const uniqueMembers = new Set();
    tickets.forEach(ticket => {
      if (ticket.assigneeId) {
        uniqueMembers.add(ticket.assigneeId);
      }
    });
    return uniqueMembers.size;
  }

  function calculateChangePercentage(currentValue, type) {
    // Simplified calculation - in a real app, you'd compare with previous period
    if (currentValue === 0) return "0%";
    
    // Mock some realistic changes based on type
    const changes = {
      'tickets': Math.floor(Math.random() * 20) + 5, // 5-25%
      'completed': Math.floor(Math.random() * 15) + 8, // 8-23%
      'progress': Math.floor(Math.random() * 10) + 3, // 3-13%
      'blocked': Math.floor(Math.random() * 5) - 2 // -2 to 3%
    };
    
    const change = changes[type] || 0;
    return change >= 0 ? `+${change}%` : `${change}%`;
  }

  /**
   * Render chart metrics below the trends chart
   */
  function renderChartMetrics(tickets) {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate weekly data to find peak week (last 12 weeks)
    const weeklyData = {};
    const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
    
    tickets.forEach(ticket => {
      if (ticket.createdAt) {
        const created = new Date(ticket.createdAt);
        if (created >= twelveWeeksAgo) {
          const weekKey = getWeekKey(created);
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { created: 0, completed: 0, weekNumber: weekKey };
          }
          
          weeklyData[weekKey].created++;
        }
      }
      
      if (ticket.status === 'Completed' && ticket.completedAt) {
        const completed = new Date(ticket.completedAt);
        if (completed >= twelveWeeksAgo) {
          const completedWeekKey = getWeekKey(completed);
          if (!weeklyData[completedWeekKey]) {
            weeklyData[completedWeekKey] = { created: 0, completed: 0, weekNumber: completedWeekKey };
          }
          weeklyData[completedWeekKey].completed++;
        }
      }
    });

    // Find peak week by total activity (created + completed)
    const peakWeek = Object.entries(weeklyData)
      .sort(([,a], [,b]) => (b.created + b.completed) - (a.created + a.completed))[0];
    const peakWeekLabel = peakWeek ? peakWeek[0] : 'N/A';

    // Calculate accurate averages for last 7 days
    const ticketsLast7Days = tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= last7Days;
    }).length;
    
    const completedLast7Days = tickets.filter(t => {
      return t.status === 'Completed' && 
             t.completedAt && 
             new Date(t.completedAt) >= last7Days;
    }).length;

    // Calculate averages for last 30 days
    const ticketsLast30Days = tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= last30Days;
    }).length;
    
    const completedLast30Days = tickets.filter(t => {
      return t.status === 'Completed' && 
             t.completedAt && 
             new Date(t.completedAt) >= last30Days;
    }).length;

    // Calculate daily averages
    const avgCreatedPerDay = ticketsLast7Days > 0 ? Math.round((ticketsLast7Days / 7) * 10) / 10 : 0;
    const avgCompletedPerDay = completedLast7Days > 0 ? Math.round((completedLast7Days / 7) * 10) / 10 : 0;
    
    // Calculate backlog trend (current week vs previous week)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const currentWeekTickets = tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= currentWeekStart;
    }).length;
    
    const previousWeekTickets = tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= previousWeekStart && created < currentWeekStart;
    }).length;
    
    const backlogTrend = previousWeekTickets > 0 ? 
      Math.round(((currentWeekTickets - previousWeekTickets) / previousWeekTickets) * 100) : 0;
    const backlogTrendLabel = backlogTrend > 0 ? `+${backlogTrend}%` : `${backlogTrend}%`;

    // Calculate velocity score based on daily completion rate
    const dailyCompletionRate = avgCreatedPerDay > 0 ? (avgCompletedPerDay / avgCreatedPerDay) * 100 : 0;
    let velocityScore = 'Low';
    if (dailyCompletionRate >= 85) velocityScore = 'High';
    else if (dailyCompletionRate >= 70) velocityScore = 'Medium';

    // Update the metric elements
    updateChartMetric('peak-week', peakWeekLabel, 'Peak Week', 'Identify high-activity periods for planning');
    updateChartMetric('avg-created-per-day', avgCreatedPerDay, 'Avg Created/Day', 'Track team productivity trends');
    updateChartMetric('avg-completed-per-day', avgCompletedPerDay, 'Avg Completed/Day', 'Track team productivity trends');
    updateChartMetric('backlog-trend', backlogTrendLabel, 'Backlog Trend', 'Spot potential bottlenecks early');
    updateChartMetric('velocity-score', velocityScore, 'Velocity Score', 'Quick assessment of team performance');
  }

  function updateChartMetric(elementId, value, label, tooltip) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      element.setAttribute('title', tooltip);
      element.setAttribute('data-label', label);
    }
  }

  function getWeekKey(date) {
    const d = new Date(date);
    const yearStart = new Date(d.getUTCFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `Week ${weekNo}`;
  }

  function addQuickAddTaskRow() {
    // Prevent adding a new row if one is already being edited
    const existingEditRow = document.getElementById("inline-edit-row");
    if (existingEditRow) {
      existingEditRow.scrollIntoView({ behavior: "smooth", block: "center" });
      existingEditRow.querySelector('input[type="text"]')?.focus();
      showToast("Please save or cancel the current task first.", "error");
      return;
    }

    const tableBody = document.querySelector("table tbody");
    if (!tableBody) return;

    // Create the new row
    const newRow = document.createElement("tr");
    newRow.id = "inline-edit-row";
    newRow.classList.add("inline-edit-row-class");

    // --- MODIFICATION START ---
    const typeOptions = ["Task", "Bug", "Request"]
      .map((o) => `<option value="${o}">${o}</option>`)
      .join("");
    const priorityOptions = ["Medium", "High", "Urgent", "Low"]
      .map(
        (o) =>
          `<option value="${o}" ${
            o === "Medium" ? "selected" : ""
          }>${o}</option>`
      )
      .join("");
    const today = new Date().toISOString().split("T")[0]; // Define today's date

    // Replace the innerHTML with the same structure as the other inline add row
    newRow.innerHTML = `
        ${isBulkEditMode ? "<td></td>" : ""}
        <td data-label="ID"><i class="fas fa-plus" style="color: var(--accent-color);"></i></td>
        <td data-label="Task">
            <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                   <label for="inline-new-createdAt" style="white-space: nowrap; color: var(--text-secondary); font-weight: 500; font-size: 0.8rem;">Created:</label>
                   <input type="date" id="inline-new-createdAt" class="inline-editor" value="${today}" style="width: auto; padding: 0.25rem 0.5rem;">
                </div>
                <div style="flex-grow: 1;">
                    <input type="text" id="inline-new-title" class="inline-editor" placeholder="Enter task title..." required>
                </div>
            </div>
        </td>
        <td data-label="Type"><select id="inline-new-type" class="inline-editor">${typeOptions}</select></td>
        <td data-label="Priority"><select id="inline-new-priority" class="inline-editor">${priorityOptions}</select></td>
        <td data-label="Status"><span class="status-tag status-open">Open</span></td>
        <td data-label="Requested By" id="inline-new-requestedBy-cell"></td>
        <td data-label="Assignee" id="inline-new-assignee-cell"></td>
        <td data-label="">
            <div style="display:flex; gap: 0.5rem;">
                <button class="action-btn-inline save-inline-btn" title="Save"><i class="fas fa-check"></i></button>
                <button class="action-btn-inline cancel-inline-btn" title="Cancel"><i class="fas fa-times"></i></button>
            </div>
        </td>
    `;
    // --- MODIFICATION END ---

    // Insert the new row at the top of the table body
    tableBody.insertBefore(newRow, tableBody.firstChild);

    // Populate dropdowns with defaults
    newRow.querySelector("#inline-new-requestedBy-cell").innerHTML =
      createSearchableDropdown(
        appData.users.map((u) => ({ value: u, text: u })),
        appData.currentUserName,
        "new-inline",
        "requestedBy"
      );
    const assigneeCell = newRow.querySelector("#inline-new-assignee-cell");
    assigneeCell.innerHTML = createSearchableDropdown(
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      appData.currentUserId,
      "new-inline",
      "assigneeId"
    );
    const assigneeInput = assigneeCell.querySelector("input");
    if (assigneeInput) {
      assigneeInput.dataset.value = appData.currentUserId || "";
    }

    // Add listeners to save the task (with null for project/epic) or cancel
    newRow
      .querySelector(".save-inline-btn")
      .addEventListener("click", () => saveInlineTask(newRow, null, null));
    newRow
      .querySelector(".cancel-inline-btn")
      .addEventListener("click", () => newRow.remove());

    newRow.querySelector("#inline-new-title").focus();
    newRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /**
   * Opens a modal to ask the user for a start date.
   * @returns {Promise<string|null>} A promise that resolves with the selected date string (YYYY-MM-DD), or null if cancelled.
   */

  // ADD this new function for validation
  function validateTicketRows() {
    const ticketRows = document.querySelectorAll(
      "#add-task-modal .main-ticket-row"
    );
    const errors = [];
    const isBulkOn = document.getElementById("bulk-settings-toggle").checked;

    // Clear previous error highlights
    document
      .querySelectorAll("#add-task-modal .input-error")
      .forEach((el) => el.classList.remove("input-error"));

    ticketRows.forEach((row, index) => {
      const title =
        row.querySelector(".new-ticket-title").value.trim() ||
        `Row #${index + 1}`;
      const advancedRow = row.nextElementSibling;
      const useAdvanced =
        !isBulkOn || (advancedRow && advancedRow.style.display !== "none");

      let status, createdDate, startedDate, completedDate;

      // Determine which set of inputs to use for validation
      if (useAdvanced) {
        status =
          advancedRow.querySelector(".override-status").value ||
          document.getElementById("bulk-add-status").value;
        createdDate = advancedRow.querySelector(".override-created-date").value;
        startedDate = advancedRow.querySelector(".override-started-date").value;
        completedDate = advancedRow.querySelector(
          ".override-completed-date"
        ).value;
      } else {
        status = document.getElementById("bulk-add-status").value;
        createdDate = document.getElementById("bulk-add-created-date").value;
        startedDate = document.getElementById("bulk-add-started-date").value;
        completedDate = document.getElementById(
          "bulk-add-completed-date"
        ).value;
      }

      // --- Run Validation Checks ---
      if (!createdDate) {
        errors.push(`<b>${title}:</b> Created Date is missing.`);
        const el = useAdvanced
          ? advancedRow.querySelector(".override-created-date")
          : document.getElementById("bulk-add-created-date");
        if (el) el.classList.add("input-error");
      }

      if (status === "In Progress") {
        if (!startedDate) {
          errors.push(
            `<b>${title}:</b> "In Progress" status requires a Started Date.`
          );
          const el = useAdvanced
            ? advancedRow.querySelector(".override-started-date")
            : document.getElementById("bulk-add-started-date");
          if (el) el.classList.add("input-error");
        }
      }
      if (status === "Completed") {
        if (!startedDate) {
          errors.push(
            `<b>${title}:</b> "Completed" status requires a Started Date.`
          );
          const el = useAdvanced
            ? advancedRow.querySelector(".override-started-date")
            : document.getElementById("bulk-add-started-date");
          if (el) el.classList.add("input-error");
        }
        if (!completedDate) {
          errors.push(
            `<b>${title}:</b> "Completed" status requires a Completed Date.`
          );
          const el = useAdvanced
            ? advancedRow.querySelector(".override-completed-date")
            : document.getElementById("bulk-add-completed-date");
          if (el) el.classList.add("input-error");
        }
      }
    });

    return errors;
  }
  // ADD this new helper function near the top of the <script> with other utilities
  function formatDateForUIDisplay(dateString) {
    // Expects YYYY-MM-DD
    if (!dateString) return "";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    // Add T00:00:00 to avoid timezone issues where it might become the previous day
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date)) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }


