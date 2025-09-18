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
    skills: [],
    epics: [],
    allReconcileHrs: [],
    reconcileHrs: [],
    currentUserName: "",
    currentUserEmail: "",
  };
  let currentPage = 1;
  let reconcileWrapper = null; // <--- ADD THIS LINE
  let tableWrapper = null; // <--- ADD THIS LINE
  let currentView = "my-ticket";
  const ticketsPerPage = 20;
  let isBulkEditMode = false;
  let selectedTickets = new Set();
  let initialProjectData = null;
  let selectedStatus = "all",
    excludeDone = true,
    textSearchTerm = "",
    ticketNumberFilter = "",
    showOnlyTicketsToFix = false,
    selectedProjectFilter = "all",
    selectedEpicFilter = "all",
    groupByProject = true,
    groupByEpic = true,
    reconcileExcludeDone = true,
    reconcileCurrentPage = 1;
  // --- ADD THESE NEW VARIABLES AT THE TOP ---
  let trendsChart = null;
  let dashboardAssigneeId = null;
  let dashboardStartDate = null;
  let dashboardEndDate = null;
  let reconcileSelectedUserName = null;
  
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
      const faviconUrl = document.getElementById("favicon-url").value;
      const notification = new Notification(`New Ticket Added: ${ticket.id}`, {
        body: ticket.title || "A new ticket has been created.",
        icon: faviconUrl,
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
      
      // Test Supabase connection
      console.log("Testing Supabase connection...");
      try {
        const { data, error } = await supabaseClient.from('user').select('count').limit(1);
        if (error) {
          console.error("Supabase connection test failed:", error);
        } else {
          console.log("✅ Supabase connection test successful");
        }
      } catch (testError) {
        console.error("Supabase connection test error:", testError);
      }
      
      // Make supabaseClient available globally
      window.supabaseClient = supabaseClient;

      const [
        { data: ticketData, error: ticketError },
        { data: projectData, error: projectError },
        { data: memberData, error: memberError },
        { data: userData, error: userError },
        // MODIFIED: Fetch both 'id' and 'skills' text
        { data: skillsData, error: skillsError },
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
        // MODIFIED: Select 'id' and the text column 'skills'
        window.supabaseClient.from("skills").select("id, skills").order("skills"),
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
        skillsData: skillsData?.length || 0,
        reconcileData: reconcileData?.length || 0,
      });

      if (
        ticketError ||
        projectError ||
        memberError ||
        userError ||
        skillsError ||
        reconcileError
      ) {
        console.error("Data Fetch Error:", {
          ticketError,
          projectError,
          memberError,
          userError,
          skillsError,
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
        // MODIFIED: Store skillsId instead of skills
        skillsId: t.skillsId,
        complexity: t.complexity,
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
        id: p.id,
        name: p.projectName,
      }));
      appData.users = memberData.map((m) => m.clockify_name);
      appData.teamMembers = userData.map((u) => ({ id: u.id, name: u.name }));

      // MODIFIED: Store skills as objects {id, name} for lookups
      appData.skills = skillsData.map((s) => ({ id: s.id, name: s.skills }));

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

      dashboardAssigneeId = appData.currentUserId; // Default to current user

      if (!appData.currentUserName) {
        document.getElementById("nav-my-ticket").style.display = "none";
        currentView = "all";
      }

      tableWrapper.style.display = "block";
      addNavListeners();
      addBulkEditListeners();
      addFilterListeners();
      addDashboardFilterListeners();
      addModalEventListeners();

      const scriptUrl = document.getElementById("script-url").value;
      const clearUrlFilterBtn = document.getElementById("clear-url-filter-btn");
      const urlTicketNumber =
        document.getElementById("url-ticket-number").value;
      const urlInitialView = document.getElementById("url-initial-view").value;

      clearUrlFilterBtn.addEventListener("click", () => {
        window.top.location.href = scriptUrl;
      });

      if (urlInitialView && urlTicketNumber) {
        currentView = urlInitialView;
        ticketNumberFilter = urlTicketNumber;
        clearUrlFilterBtn.style.display = "inline-flex";
        document
          .querySelectorAll(".nav-btn.active")
          .forEach((btn) => btn.classList.remove("active"));
        document
          .getElementById(`nav-${urlInitialView}`)
          .classList.add("active");
        document.getElementById("ticket-number-filter").value = urlTicketNumber;
      } else {
        // MODIFIED: Default to 'home' view
        currentView = "home";
        document
          .querySelectorAll(".nav-btn.active")
          .forEach((btn) => btn.classList.remove("active"));
        document.getElementById("nav-home").classList.add("active");
      }

      applyFilterAndRender();
      addPaginationListeners();
      addReconcilePaginationListeners();
      subscribeToTicketChanges();
      loader.style.display = "none";
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
  
  // Multiple initialization triggers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // DOM is already ready
    initializeApp();
  }
  
  // Fallback initialization
  window.addEventListener('load', () => {
    console.log("🚀 Window load event fired");
    if (document.getElementById("loader") && document.getElementById("loader").style.display !== "none") {
      console.log("🚀 App still loading, triggering initialization...");
      initializeApp();
    }
  });

  /**
   * Subscribes to real-time changes (inserts, updates, deletes) in the 'ticket' table.
   */
  function subscribeToTicketChanges() {
    supabaseClient
      .channel("public:ticket")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket" },
        (payload) => {
          console.log("Real-time change received!", payload);
          handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to real-time ticket changes!");
        }
      });
  }

  /**
   * Handles incoming real-time data changes from Supabase subscription.
   * @param {object} payload - The data payload from Supabase.
   */

  // REPLACE the existing handleRealtimeChange function with this one

  function handleRealtimeChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    let ticketId;
    let isChanged = false;

    switch (eventType) {
      case "INSERT":
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
      applyFilterAndRender();
      const modal = document.getElementById("task-detail-modal");
      if (modal.style.display === "flex") {
        const modalTicketId = modal.querySelector(".ticket-main-content")
          ?.dataset.ticketId;
        if (modalTicketId == ticketId) {
          if (eventType === "DELETE") {
            modal.style.display = "none";
            showToast(`Ticket ${ticketId} was deleted.`, "error");
          } else {
            const mainContent = modal.querySelector(".ticket-main-content");
            const sidebar = modal.querySelector(".ticket-details-sidebar");
            const mainScroll = mainContent ? mainContent.scrollTop : 0;
            const sidebarScroll = sidebar ? sidebar.scrollTop : 0;
            const focusedElementField = document.activeElement?.dataset.field;
            const dirtyFieldsState = {};
            modal
              .querySelectorAll(".editable-field-wrapper.is-dirty input")
              .forEach((input) => {
                dirtyFieldsState[input.dataset.field] = input.value;
              });
            const advancedToggle = modal.querySelector(
              ".advanced-details-toggle"
            );
            const isAdvancedOpen = advancedToggle
              ? advancedToggle.classList.contains("is-open")
              : false;

            showTaskDetailModal(ticketId, { isAdvancedOpen: isAdvancedOpen });

            requestAnimationFrame(() => {
              const newMainContent = modal.querySelector(
                ".ticket-main-content"
              );
              if (newMainContent) newMainContent.scrollTop = mainScroll;

              const newSidebar = modal.querySelector(".ticket-details-sidebar");
              if (newSidebar) newSidebar.scrollTop = sidebarScroll;

              Object.entries(dirtyFieldsState).forEach(([field, value]) => {
                const input = modal.querySelector(
                  `input[data-field='${field}']`
                );
                if (input) {
                  input.value = value;
                  const wrapper = input.closest(".editable-field-wrapper");
                  if (wrapper) {
                    wrapper.classList.add("is-dirty");
                  }
                }
              });

              if (focusedElementField) {
                const elementToFocus = modal.querySelector(
                  `[data-field='${focusedElementField}']`
                );
                if (elementToFocus) {
                  // THIS IS THE ONLY LINE THAT CHANGED
                  elementToFocus.focus({ preventScroll: true });
                }
              }
            });
          }
        }
      }
    }
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
    const oldValue = element.dataset.oldValue;
    let newValue =
      newValueFromSearchable !== undefined
        ? newValueFromSearchable
        : element.value === ""
        ? null
        : element.value;

    if ((field === "assigneeId" || field === "skillsId") && newValue) {
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

    // --- MODIFICATION START ---
    if (field === "status") {
      const newStatus = newValue;
      // Check for the specific transition from "Open" to "Completed"
      if (oldValue === "Open" && newStatus === "Completed") {
        const startDate = await getStartDateFromUser(); // Await the user's input

        if (startDate === null) {
          // User cancelled, so we revert the change and stop processing
          element.value = oldValue;
          if (element.closest(".tag-editor"))
            element.closest(".tag-editor").classList.remove("is-editing");
          return;
        } else {
          // User provided a date, so we add it to our updates object
          const [year, month, day] = startDate.split("-").map(Number);
          const now = new Date();
          const selectedDate = new Date(
            year,
            month - 1,
            day,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds()
          );
          updates.startedAt = selectedDate.toISOString();
        }
      }
      // The original logic for other status changes remains here
      if (["On Hold", "Cancelled", "Rejected", "Blocked"].includes(newStatus)) {
        const reason = await getReasonFromUser(
          `Reason for changing status to "${newStatus}"`
        );
        if (reason === null) {
          element.value = oldValue;
          if (element.closest(".tag-editor"))
            element.closest(".tag-editor").classList.remove("is-editing");
          return;
        }
        updates.logReason = reason;
      }
      if (newStatus === "In Progress" && !ticket.startedAt)
        updates.startedAt = nowIso;
      if (newStatus === "Completed" && !ticket.completedAt)
        updates.completedAt = nowIso;
    }
    // --- MODIFICATION END ---

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
    const { error } = await supabaseClient
      .from("ticket")
      .update(updates)
      .eq("id", ticket.id);
    parentContainer.classList.remove("updating");

    if (error) {
      showToast("Update failed: " + error.message, "error");
      element.value = oldValue;
    } else {
      element.dataset.oldValue = newValue;
      parentContainer.classList.add("is-successful");
      if (fieldWrapper) {
        fieldWrapper.classList.remove("is-dirty");
      }
      setTimeout(() => {
        parentContainer.classList.remove("is-successful");
      }, 1200);
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

    submitBtn.textContent = "Submitting...";
    submitBtn.disabled = true;

    const { data: insertedTickets, error } = await supabaseClient
      .from("ticket")
      .insert(ticketsToSubmit)
      .select();

    submitBtn.textContent = "Confirm & Submit";
    submitBtn.disabled = false;

    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      showToast(
        `${insertedTickets.length} ticket(s) added successfully!`,
        "success"
      );
      if (insertedTickets && insertedTickets.length > 0) {
        await sendDiscordNotificationViaApi(
          insertedTickets,
          appData.currentUserName
        );
      }

      confirmModal.style.display = "none";
      addModal.style.display = "none";
    }
  }

  // REPLACE the existing prepareAndConfirmTickets function
  async function prepareAndConfirmTickets() {
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
      complexity: document.getElementById("bulk-add-complexity").value || null,
      skillsId:
        document.querySelector("#bulk-add-skills-container input").dataset
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

    const { data: lastTicket, error: idError } = await window.supabaseClient.rpc(
      "get_last_ticket_id"
    );
    if (idError && idError.code !== "PGRST116") {
      showToast(`Error getting last ticket ID: ${idError.message}`, "error");
      return;
    }
    let nextId = (lastTicket || 0) + 1;

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

          const advComplexity = advancedRow.querySelector(
            ".override-complexity"
          ).value;
          if (advComplexity) ticket.complexity = advComplexity;

          const advSkillsId = advancedRow.querySelector(
            ".override-skills-container input"
          ).dataset.value;
          if (advSkillsId) ticket.skillsId = advSkillsId;

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

        ticket.id = nextId;
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
        if (ticket.skillsId) ticket.skillsId = parseInt(ticket.skillsId, 10);

        newTicketsData.push(ticket);
        nextId++;
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

  async function submitNewProject() {
    const modal = document.getElementById("add-project-modal");
    const submitBtn = document.getElementById("submit-new-project-btn");

    const projectName = document
      .getElementById("new-project-name")
      .value.trim();
    if (!projectName) {
      showToast("Project Name is required.", "error");
      document.getElementById("new-project-name").classList.add("input-error");
      return;
    }

    const collaborators = Array.from(
      modal.querySelectorAll(
        "#new-project-collaborators-container input:checked"
      )
    )
      .map((cb) => cb.value)
      .join(", ");

    const { data: lastProject, error: idError } = await supabaseClient
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
      projectName: projectName,
      description: document
        .getElementById("new-project-description")
        .value.trim(),
      priority: document.getElementById("new-project-priority").value,
      projectOwner:
        modal.querySelector("#new-project-owner-container input").dataset
          .value || null,
      collaborators: collaborators,
      attachment:
        document.getElementById("new-project-attachment").value.trim() || null,
      startDate:
        document.getElementById("new-project-start-date").value || null,
      estCompletedDate:
        document.getElementById("new-project-est-completed-date").value || null,
      createdAt: new Date().toISOString(),
      createdBy: appData.currentUserName,
      status: "Open",
      log: "[]",
    };

    submitBtn.textContent = "Submitting...";
    submitBtn.disabled = true;

    const { data: newProject, error } = await supabaseClient
      .from("project")
      .insert(projectData)
      .select()
      .single();

    submitBtn.textContent = "Add Project";
    submitBtn.disabled = false;

    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      showToast("Project added successfully!", "success");
      modal.style.display = "none";
      appData.allProjects.push(newProject);
      appData.projects.push({
        id: newProject.id,
        name: newProject.projectName,
      });
      applyFilterAndRender();
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
    if (updates.skillsId) {
      updates.skillsId = parseInt(updates.skillsId, 10);
    }
    // --- END OF FIX ---

    const nowIso = new Date().toISOString();
    let reason = null;

    if (
      updates.status &&
      ["On Hold", "Cancelled", "Rejected", "Blocked"].includes(updates.status)
    ) {
      reason = await getReasonFromUser(
        `Reason for changing status to "${updates.status}"`
      );
      if (reason === null) {
        confirmBtn.textContent = originalBtnText;
        confirmBtn.disabled = false;
        return;
      }
    }

    const payload = ticketIds.map((id) => {
      const ticket = appData.allTickets.find((t) => t.id === id);
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

      const newLogEntry = {
        user: appData.currentUserEmail,
        timestamp: nowIso,
        field: "bulk-update",
        oldValue: "multiple",
        newValue: ticketUpdates,
        reason: reason,
      };

      return {
        id: id,
        updates: { ...ticketUpdates, newLogEntry: newLogEntry },
      };
    });

    const { data, error } = await window.supabaseClient.rpc("bulk_update_tickets", {
      updates_payload: payload,
    });

    confirmBtn.textContent = originalBtnText;
    confirmBtn.disabled = false;

    if (error) {
      showToast("Bulk update failed: " + error.message, "error");
    } else {
      showToast(`${ticketIds.length} tickets updated successfully.`, "success");
      if (modal) modal.style.display = "none";
      exitBulkEditMode(true);
    }
  }

  // REPLACE the addModalEventListeners function
  function addModalEventListeners() {
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

    const addNewBtn = document.getElementById("add-new-btn");
    const addNewMenu = document.getElementById("add-new-menu");
    const addNewTaskOption = document.getElementById("add-new-task-option");
    const addNewProjectOption = document.getElementById("add-new-project-option");

    // Add null checks to prevent errors
    if (addNewTaskOption) {
      addNewTaskOption.addEventListener("click", () => {
        openAddTaskModal();
        if (addNewMenu) addNewMenu.style.display = "none";
      });
    }

    if (addNewProjectOption) {
      addNewProjectOption.addEventListener("click", () => {
        openAddProjectModal();
        if (addNewMenu) addNewMenu.style.display = "none";
      });
    }

    if (addNewBtn) {
      addNewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (addNewMenu) {
          addNewMenu.style.display =
            addNewMenu.style.display === "block" ? "none" : "block";
        }
      });
    }
    document.addEventListener("click", (e) => {
      if (
        addNewMenu && 
        addNewMenu.style.display === "block" &&
        !e.target.closest("#add-new-dropdown")
      ) {
        addNewMenu.style.display = "none";
      }
      const filterMenu = document.getElementById("filter-menu");
      if (
        filterMenu.style.display === "block" &&
        !e.target.closest("#filter-btn") &&
        !e.target.closest("#filter-menu")
      ) {
        filterMenu.style.display = "none";
      }
    });

    document
      .getElementById("add-another-ticket-btn")
      .addEventListener("click", addTicketRowToModal);

    document
      .getElementById("submit-new-tickets-btn")
      .addEventListener("click", prepareAndConfirmTickets);

    const confirmModal = document.getElementById("add-ticket-confirm-modal");
    document
      .getElementById("confirm-and-submit-tickets-btn")
      .addEventListener("click", (e) => {
        const ticketsData = JSON.parse(e.currentTarget.dataset.tickets || "[]");
        if (ticketsData.length > 0) {
          executeFinalTicketSubmission(ticketsData);
        }
      });
    document
      .getElementById("cancel-ticket-confirmation-btn")
      .addEventListener("click", () => {
        confirmModal.style.display = "none";
      });
    confirmModal
      .querySelector(".modal-close-btn")
      .addEventListener("click", () => {
        confirmModal.style.display = "none";
      });

    const addProjectModal = document.getElementById("add-project-modal");
    addProjectModal.addEventListener("click", handleAddProjectModalClick);
    addProjectModal.addEventListener("change", handleAddProjectModalChange);
    document
      .getElementById("submit-new-project-btn")
      .addEventListener("click", submitNewProject);
    document
      .getElementById("update-selected-btn")
      .addEventListener("click", openBulkUpdateModal);
    document
      .getElementById("confirm-bulk-update-btn")
      .addEventListener("click", () => {
        const updates = {};
        const fields = {
          projectId: document.querySelector(
            "#bulk-update-project-container input"
          ).dataset.value,
          epic: document.getElementById("bulk-update-epic").value,
          skillsId: document.querySelector(
            "#bulk-update-skills-container input"
          ).dataset.value,
          complexity: document.getElementById("bulk-update-complexity").value,
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
        if (e.target.id === "add-comment-btn") {
          handleCommentAdd(e);
        }
        if (e.target.classList.contains("clear-date-btn")) {
          const button = e.target;
          const field = button.dataset.field;
          const id = button.dataset.id;
          const input = taskDetailModal.querySelector(
            `input[data-field='${field}'][data-id='${id}']`
          );
          if (input) {
            handleUpdate({ target: input }, null);
          }
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
    showOnlyTicketsToFix = false;

    // Reset UI elements to match the state
    const projectSelect = document.getElementById("project-filter-select");
    if (projectSelect) projectSelect.value = "all";

    const epicSelect = document.getElementById("epic-filter-select");
    if (epicSelect) epicSelect.value = "all";

    const searchInput = document.getElementById("task-search-input");
    if (searchInput) searchInput.value = "";

    const ticketNumInput = document.getElementById("ticket-number-filter");
    if (ticketNumInput) ticketNumInput.value = "";

    const toFixBtn = document.getElementById("to-fix-btn");
    if (toFixBtn) toFixBtn.classList.remove("active");

    // Hide the "Clear Search" button related to URL parameters
    const clearUrlFilterBtn = document.getElementById("clear-url-filter-btn");
    if (clearUrlFilterBtn) clearUrlFilterBtn.style.display = "none";
  }
  function addNavListeners() {
    const navButtons = document.querySelectorAll(".nav-panel .nav-btn");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Ignore special buttons that don't change the main view
        if (btn.id === "bulk-edit-btn" || btn.id === "readme-btn") {
          return;
        }
        const view = btn.id.replace("nav-", "");
        if (currentView === view) return; // Do nothing if already on this view

        // Only reset the main filters when switching to a view that uses them
        if (view !== "home" && view !== "reconcile") {
          resetFilters();
        }
        document
          .getElementById("quick-add-btn")
          .addEventListener("click", addQuickAddTaskRow);

        document
          .getElementById("readme-btn")
          .addEventListener("click", showReadmeModal);

        currentView = view;
        currentPage = 1;
        reconcileCurrentPage = 1;

        // Update the active button style
        navButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Exit bulk edit mode if it's active
        if (isBulkEditMode) exitBulkEditMode(false);

        // Render the newly selected view
        applyFilterAndRender();
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
  function addFilterListeners() {
    const statusSelect = document.getElementById("status-filter-select");
    const projectFilterSelect = document.getElementById(
      "project-filter-select"
    );
    const epicFilterSelect = document.getElementById("epic-filter-select");
    const filterBtn = document.getElementById("filter-btn");
    const filterMenu = document.getElementById("filter-menu");

    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close other dropdowns if open
      document.getElementById("add-new-menu").style.display = "none";
      // Toggle current dropdown
      filterMenu.style.display =
        filterMenu.style.display === "block" ? "none" : "block";
    });

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

    document
      .getElementById("status-filter-select")
      .addEventListener("change", (e) => {
        selectedStatus = e.target.value;
        applyFilterAndRender();
      });
    document
      .getElementById("exclude-done-checkbox")
      .addEventListener("change", (e) => {
        excludeDone = e.target.checked;
        applyFilterAndRender();
      });
    document
      .getElementById("task-search-input")
      .addEventListener("input", (e) => {
        textSearchTerm = e.target.value;
        applyFilterAndRender();
      });
    document
      .getElementById("ticket-number-filter")
      .addEventListener("input", (e) => {
        ticketNumberFilter = e.target.value;
        applyFilterAndRender();
      });
    document.getElementById("to-fix-btn").addEventListener("click", (e) => {
      showOnlyTicketsToFix = !showOnlyTicketsToFix;
      e.target.classList.toggle("active");
      applyFilterAndRender();
    });
    document
      .getElementById("project-filter-select")
      .addEventListener("change", (e) => {
        selectedProjectFilter = e.target.value;
        applyFilterAndRender();
      });
    document
      .getElementById("epic-filter-select")
      .addEventListener("change", (e) => {
        selectedEpicFilter = e.target.value;
        applyFilterAndRender();
      });
    document
      .getElementById("group-by-project-checkbox")
      .addEventListener("change", (e) => {
        groupByProject = e.target.checked;
        applyFilterAndRender();
      });
    document
      .getElementById("group-by-epic-checkbox")
      .addEventListener("change", (e) => {
        groupByEpic = e.target.checked;
        applyFilterAndRender();
      });
    document
      .getElementById("reconcile-exclude-done")
      .addEventListener("change", (e) => {
        reconcileExcludeDone = e.target.checked;
        applyFilterAndRender();
      });
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
    reconcileWrapper.style.display = "none";
    dashboardWrapper.style.display = "none";
    actionsContainer.style.display = "none";
    document.body.classList.remove("project-view");

    // Home View Logic
    if (currentView === "home") {
      dashboardWrapper.style.display = "flex";
      renderDashboard();
      return;
    }

    // Show the main actions container for all other views
    actionsContainer.style.display = "flex";

    // Hide specific filters/pagination by default
    defaultFilterBtn.style.display = "none";
    reconcileFilters.style.display = "none";
    mainPagination.style.display = "none";

    if (currentView === "reconcile") {
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
      defaultFilterBtn.style.display = "block"; // Show the main filter button
      rightActions.style.display = "flex"; // Show all right-side action buttons

      document.getElementById("my-ticket-filters").style.display =
        currentView === "my-ticket" ? "block" : "none";

      let baseTickets;
      switch (currentView) {
        case "my-ticket":
          baseTickets = appData.allTickets.filter(
            (t) => t.assigneeId == appData.currentUserId
          );
          if (excludeDone) {
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
          break;
        default:
          baseTickets = [...appData.allTickets];
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
      if (showOnlyTicketsToFix) {
        finalFilteredTickets = finalFilteredTickets.filter(
          (t) => getTicketWarnings(t).length > 0
        );
      }

      finalFilteredTickets.sort((a, b) => {
        if (groupByProject) {
          const projectA = a.projectName || "Unassigned";
          const projectB = b.projectName || "Unassigned";
          if (projectA < projectB) return -1;
          if (projectA > projectB) return 1;
        }
        if (groupByEpic) {
          const epicA = a.epic || "No Epic";
          const epicB = b.epic || "No Epic";
          if (epicA < epicB) return -1;
          if (epicA > epicB) return 1;
        }
        return b.id - a.id;
      });

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
  function renderPage(page) {
    if (!tableWrapper) return; // Safety check
    const scrollPosition = tableWrapper.scrollTop; // Store position
    const tableHead = document.querySelector("table thead tr");
    const tableBody = document.querySelector("table tbody");

    tableHead.innerHTML = isBulkEditMode
      ? '<th class="checkbox-cell"><input type="checkbox" id="select-all-checkbox" title="Select all on this page"></th>'
      : "";
    tableHead.innerHTML += [
      "ID",
      "Task",
      "Type",
      "Requested By",
      "Status",
      "Assignee",
      "Priority",
      "",
    ]
      .map((h) => `<th>${h}</th>`)
      .join("");

    tableBody.innerHTML = "";
    const paginatedTickets = appData.tickets.slice(
      (page - 1) * ticketsPerPage,
      page * ticketsPerPage
    );

    if (paginatedTickets.length === 0) {
      const colCount = isBulkEditMode ? 9 : 8;
      tableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 2rem;">No tickets found.</td></tr>`;
      updatePaginationControls(page, 0);
      return;
    }

    let lastProjectTitle = null;
    let lastEpicTitle = null;

    paginatedTickets.forEach((ticket) => {
      const colCount = isBulkEditMode ? 9 : 8;

      if (
        groupByProject &&
        (ticket.projectName || "Unassigned") !== lastProjectTitle
      ) {
        lastProjectTitle = ticket.projectName || "Unassigned";
        const projectTickets = appData.tickets.filter(
          (t) => (t.projectName || "Unassigned") === lastProjectTitle
        );
        const groupTicketCount = projectTickets.length;
        const projectId = projectTickets[0]?.projectId || "null";

        // --- NEW: Calculate epic and task counts ---
        const epicsInProject = new Set(
          projectTickets.map((t) => t.epic).filter(Boolean)
        );
        const epicCount = epicsInProject.size;

        // Build the count display string with icons
        const epicIcon = `<i class="fas fa-bolt epic-icon" style="font-size: 0.85em;"></i>`;
        const taskIcon = `<i class="fas fa-tasks" style="font-size: 0.85em; color: var(--text-secondary);"></i>`;
        const countDisplay = `
                <span style="display: inline-flex; align-items: center; gap: 0.35rem;">${epicIcon} ${epicCount} ${
          epicCount === 1 ? "epic" : "epics"
        }</span>
                <span style="margin: 0 0.25rem; color: var(--border-color);">•</span>
                <span style="display: inline-flex; align-items: center; gap: 0.35rem;">${taskIcon} ${groupTicketCount} ${
          groupTicketCount === 1 ? "task" : "tasks"
        }</span>
            `;

        tableBody.innerHTML += `
                <tr class="project-group-header">
                    <td colspan="${colCount}">
                        <div class="group-header-content">
                            <i class="fas fa-chevron-down toggle-icon"></i>
                            <i class="fas fa-folder project-icon"></i>
                            <div style="display: flex; align-items: center;">
                                <span class="project-name">${escapeHtml(
                                  lastProjectTitle
                                )}</span>
                                <span class="group-count">${countDisplay}</span>
                            </div>
                            <div class="group-actions">
                                <button class="action-btn-inline add-epic-inline-btn" data-project-id="${projectId}" title="Add New Epic"><i class="fas fa-bolt"></i></button>
                                <button class="action-btn-inline add-task-inline-btn" data-project-id="${projectId}" title="Add Task to Project"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        lastEpicTitle = null;
      }

      if (groupByEpic && (ticket.epic || "No Epic") !== lastEpicTitle) {
        lastEpicTitle = ticket.epic || "No Epic";
        const projectFilter = (t) =>
          (t.projectName || "Unassigned") === lastProjectTitle;
        const epicFilter = (t) => (t.epic || "No Epic") === lastEpicTitle;
        const epicTickets = appData.tickets.filter(
          (t) => projectFilter(t) && epicFilter(t)
        );
        const groupTicketCount = epicTickets.length;
        const projectId = epicTickets[0]?.projectId || "null";

        tableBody.innerHTML += `
                <tr class="epic-group-header">
                    <td colspan="${colCount}">
                        <div class="group-header-content">
                            <div class="nesting-line"></div>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                            <i class="fas fa-bolt epic-icon"></i>
                             <div style="display: flex; align-items: center;">
                                <span class="epic-name">${escapeHtml(
                                  lastEpicTitle
                                )}</span>
                                <span class="group-count">${groupTicketCount}</span>
                            </div>
                            <div class="group-actions">
                                <button class="action-btn-inline add-task-inline-btn" data-project-id="${projectId}" data-epic-name="${escapeHtml(
          lastEpicTitle
        )}" title="Add Task to Epic"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                    </td>
                </tr>`;
      }

      const row = tableBody.insertRow();
      row.id = `ticket-row-${ticket.id}`;
      if (groupByEpic && lastEpicTitle) {
        row.classList.add("is-in-epic");
      }

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

      row.innerHTML = `
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
            }" title="Copy summary"></i><span>${
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
            <td data-label="Requested By">${createSearchableDropdown(
              appData.users.map((u) => ({ value: u, text: u })),
              ticket.requestedBy,
              ticket.id,
              "requestedBy"
            )}</td>
            <td data-label="Status">${createTagEditor(
              [
                "Open",
                "In Progress",
                "On Hold",
                "Blocked",
                "Cancelled",
                "Rejected",
                "Completed",
              ],
              ticket.status,
              ticket.id,
              "status"
            )}</td>
            <td data-label="Assignee">${createSearchableDropdown(
              appData.teamMembers.map((m) => ({ value: m, text: m })),
              ticket.assignee,
              ticket.id,
              "assignee"
            )}</td>
            <td data-label="Priority">${createTagEditor(
              ["Urgent", "High", "Medium", "Low"],
              ticket.priority,
              ticket.id,
              "priority"
            )}</td>
            <td data-label=""><div class="task-icons">${
              ticket.relevantLink
                ? `<i class="fas fa-paperclip attachment-icon" data-id="${ticket.id}" data-type="ticket"></i>`
                : ""
            }<i class="fas fa-history history-icon" data-ticket-id="${
        ticket.id
      }"></i></div></td>
        `;
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
    newBody.addEventListener("keyup", handleTableKeyUp);

    // ✅ attach checkbox click
    newBody.querySelectorAll(".ticket-checkbox").forEach((cb) => {
      cb.addEventListener("change", handleCheckboxClick);
    });

    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    if (selectAllCheckbox)
      selectAllCheckbox.addEventListener("change", toggleSelectAll);
  }

  function handleTableClick(e) {
    const target = e.target;

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
        editor.classList.add("is-editing");
        editor.querySelector("select")?.focus();
      }
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
    if (target.classList.contains("history-icon")) {
      showHistory(e);
      return;
    }
    if (target.classList.contains("attachment-icon")) {
      showAttachments(e);
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
    const dropdownItem = target.closest(
      ".searchable-dropdown-list div[data-value]"
    );
    if (dropdownItem) {
      const input = dropdownItem
        .closest(".searchable-dropdown")
        .querySelector("input");
      const newValue = dropdownItem.dataset.value;

      // Set the display text and the underlying ID value
      input.value = dropdownItem.textContent.trim();
      input.dataset.value = newValue;

      // ONLY trigger the database update if it's an existing ticket row
      if (input.dataset.id !== "new-inline") {
        const handler =
          input.dataset.type === "project" ? handleProjectUpdate : handleUpdate;
        handler({ target: input }, newValue);
      }

      // Hide the dropdown list after selection
      dropdownItem.closest(".searchable-dropdown-list").style.display = "none";
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
  function handleTableFocusIn(e) {
    if (e.target.classList.contains("searchable-dropdown-input"))
      e.target.nextElementSibling.style.display = "block";
  }
  function handleTableFocusOut(e) {
    if (
      e.target.classList.contains("inline-editor") &&
      e.target.closest(".tag-editor")
    )
      e.target.closest(".tag-editor").classList.remove("is-editing");
    else if (e.target.classList.contains("searchable-dropdown-input"))
      setTimeout(
        () => (e.target.nextElementSibling.style.display = "none"),
        200
      );
  }
  function handleTableKeyUp(e) {
    if (e.target.classList.contains("searchable-dropdown-input")) {
      const filter = e.target.value.toLowerCase();
      const list = e.target.nextElementSibling;
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
    document.querySelectorAll(".ticket-checkbox").forEach((checkbox) => {
      const id = checkbox.dataset.id;
      checkbox.checked = isChecked;
      if (isChecked) selectedTickets.add(id);
      else selectedTickets.delete(id);
    });
    updateBulkActionControls();
  }
  function handleCheckboxClick(event) {
    const id = event.target.dataset.id;
    if (event.target.checked) selectedTickets.add(id);
    else selectedTickets.delete(id);
    updateBulkActionControls();
  }
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

    createSearchableDropdownForModal(
      document.getElementById("bulk-update-skills-container"),
      [
        { value: "", text: "- No Change -" },
        ...appData.skills.map((s) => ({ value: s.id, text: s.name })),
      ],
      "Select skills..."
    );

    document.getElementById("bulk-update-complexity").innerHTML =
      '<option value="">- No Change -</option><option>Easy</option><option>Moderate</option><option>Complex</option>';
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

  function showHistory(event) {
    const ticketId = event.target.dataset.ticketId;
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    const modalBody = document.getElementById("history-content");

    if (!ticket || !ticket.log || ticket.log.length === 0) {
      modalBody.innerHTML = "<p>No history found for this ticket.</p>";
    } else {
      modalBody.innerHTML = [...ticket.log]
        .reverse()
        .map((entry) => {
          const oldVal = entry.oldValue || "empty";
          const newVal = entry.newValue || "empty";
          return `<div class="history-entry">
                    <div class="history-meta"><strong>${escapeHtml(
                      entry.user
                    )}</strong> on ${new Date(
            entry.timestamp
          ).toLocaleString()}</div>
                    <div class="history-change">Changed <strong>${escapeHtml(
                      entry.field
                    )}</strong> from "<em>${escapeHtml(
            oldVal
          )}</em>" to "<em>${escapeHtml(newVal)}</em>"</div>
                    ${
                      entry.reason
                        ? `<div style="font-style: italic; color: var(--text-secondary); margin-top: 4px;">Reason: ${escapeHtml(
                            entry.reason
                          )}</div>`
                        : ""
                    }
                </div>`;
        })
        .join("");
    }
    document.getElementById("history-modal").style.display = "flex";
  }
  function showAttachments(event) {
    const icon = event.target;
    const id = icon.dataset.id;
    const type = icon.dataset.type;

    let item;
    let linkString = "";

    if (type === "project") {
      item = appData.allProjects.find((p) => p.id == id);
      if (item) linkString = String(item.attachment || "");
    } else {
      item = appData.allTickets.find((t) => t.id == id);
      if (item) linkString = String(item.relevantLink || "");
    }

    if (!item) return;

    const modalBody = document.getElementById("attachment-content");
    modalBody.innerHTML = "";

    const urls = linkString
      .split(/[\s,]+/)
      .filter((url) => url.trim().startsWith("http"));

    if (urls.length === 0) {
      modalBody.innerHTML = "<p>No valid attachments found.</p>";
    } else {
      urls.forEach((url) => {
        modalBody.innerHTML += `<a href="${url}" target="_blank" class="attachment-link">${escapeHtml(
          url
        )}</a>`;
      });
    }

    document.getElementById("attachment-modal").style.display = "flex";
  }
  // REPLACE the existing showTaskDetailModal function with this one

  function showTaskDetailModal(ticketId, options = {}) {
    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    if (!ticket) return;

    const { isAdvancedOpen = false } = options;
    const warnings = getTicketWarnings(ticket);
    const modal = document.getElementById("task-detail-modal");
    const modalBody = document.getElementById("task-detail-modal-body");
    const toDateInputString = (isoString) =>
      isoString ? isoString.split("T")[0] : "";

    const createDateField = (label, value, field, id, icon) => {
      const clearButtonVisibilityClass = value ? "" : "is-hidden";
      return `
            <label class="prop-label"><i class="fas ${icon} fa-fw"></i> ${label}</label>
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
                <button class="clear-date-btn ${clearButtonVisibilityClass}" data-field="${field}" data-id="${id}">Clear</button>
            </div>
            <small class="date-field-caption">Press Enter/Tab to Save</small>
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
                <div>
                    <span class="ticket-id-tag">${escapeHtml(ticket.id)}</span>
                    <textarea id="modal-edit-title" class="modal-title-textarea" rows="1" placeholder="Ticket Title...">${escapeHtml(
                      ticket.title || ""
                    )}</textarea>
                </div>
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
            <div id="comment-container-modal"></div>
        </div>`;

    const sidebarHtml = `
        <div class="ticket-details-sidebar" data-ticket-id="${ticket.id}">
            <div class="sidebar-section">
                <h4>Properties</h4>
                <div class="sidebar-property-editable"><label class="prop-label"><i class="fas fa-flag fa-fw"></i> Status</label>${createTagEditor(
                  [
                    "Open",
                    "In Progress",
                    "On Hold",
                    "Blocked",
                    "Cancelled",
                    "Rejected",
                    "Completed",
                  ],
                  ticket.status,
                  ticket.id,
                  "status"
                )}</div>
                <div class="sidebar-property-editable ${
                  warnings.some((w) => w.field === "assigneeId")
                    ? "has-warning"
                    : ""
                }"><label class="prop-label"><i class="fas fa-user-check fa-fw"></i> Assign to</label>${createSearchableDropdown(
      appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      ticket.assigneeId,
      ticket.id,
      "assigneeId"
    )}</div>
                <div class="sidebar-property-editable"><label class="prop-label"><i class="fas fa-stream fa-fw"></i> Priority</label>${createTagEditor(
                  ["Urgent", "High", "Medium", "Low"],
                  ticket.priority,
                  ticket.id,
                  "priority"
                )}</div>
                <div class="sidebar-property-editable"><label class="prop-label"><i class="fas fa-tag fa-fw"></i> Type</label>${createTypeTag(
                  ticket.type
                )}</div>
                <div class="sidebar-property-editable"><label class="prop-label"><i class="fas fa-folder fa-fw"></i> Project</label>${createSearchableDropdown(
                  appData.projects.map((p) => ({ value: p.id, text: p.name })),
                  ticket.projectId,
                  ticket.id,
                  "projectId"
                )}</div>
                <div class="sidebar-property-editable ${
                  warnings.some((w) => w.field === "requestedBy")
                    ? "has-warning"
                    : ""
                }"><label class="prop-label"><i class="fas fa-user-tag fa-fw"></i> Requested By</label>${createSearchableDropdown(
      appData.users.map((u) => ({ value: u, text: u })),
      ticket.requestedBy,
      ticket.id,
      "requestedBy"
    )}</div>
            </div>
            <div class="sidebar-section advanced-details-section">
                <button class="advanced-details-toggle ${
                  isAdvancedOpen ? "is-open" : ""
                }">
                    <span><i class="fas fa-cogs fa-fw"></i> Advanced Details</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </button>
                <div class="advanced-details-content ${
                  isAdvancedOpen ? "" : "is-hidden"
                }">
                    <div class="sidebar-property-editable"><label class="prop-label"><i class="fas fa-bolt fa-fw"></i> Epic</label><div class="editable-field-wrapper ${
                      ticket.epic ? "has-value" : ""
                    }"><input type="text" list="epic-datalist-details" class="inline-editor" value="${escapeHtml(
      ticket.epic || ""
    )}" data-id="${ticket.id}" data-field="epic" data-old-value="${escapeHtml(
      ticket.epic || ""
    )}"><i class="fas fa-times-circle clear-icon"></i></div></div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "complexity")
                        ? "has-warning"
                        : ""
                    }"><label class="prop-label"><i class="fas fa-puzzle-piece fa-fw"></i> Complexity</label>${createDropdown(
      ["Complex", "Moderate", "Easy"],
      ticket.complexity,
      ticket.id,
      "complexity"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "skillsId")
                        ? "has-warning"
                        : ""
                    }"><label class="prop-label"><i class="fas fa-tools fa-fw"></i> Skills</label>${createSearchableDropdown(
      appData.skills.map((s) => ({ value: s.id, text: s.name })),
      ticket.skillsId,
      ticket.id,
      "skillsId"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "createdAt")
                        ? "has-warning"
                        : ""
                    }">${createDateField(
      "Created",
      ticket.createdAt,
      "createdAt",
      ticket.id,
      "fa-calendar-plus"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "dueDate")
                        ? "has-warning"
                        : ""
                    }">${createDateField(
      "Due Date",
      ticket.dueDate,
      "dueDate",
      ticket.id,
      "fa-calendar-day"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "assignedAt")
                        ? "has-warning"
                        : ""
                    }">${createDateField(
      "Assigned",
      ticket.assignedAt,
      "assignedAt",
      ticket.id,
      "fa-calendar-check"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "startedAt")
                        ? "has-warning"
                        : ""
                    }">${createDateField(
      "Started",
      ticket.startedAt,
      "startedAt",
      ticket.id,
      "fa-play-circle"
    )}</div>
                    <div class="sidebar-property-editable ${
                      warnings.some((w) => w.field === "completedAt")
                        ? "has-warning"
                        : ""
                    }">${createDateField(
      "Completed",
      ticket.completedAt,
      "completedAt",
      ticket.id,
      "fa-check-circle"
    )}</div>
                </div>
            </div>
        </div>
        ${epicDatalist}`;

    modalBody.innerHTML = mainContentHtml + sidebarHtml;

    renderSubtasks(ticket);
    renderComments(ticket);

    modal.style.display = "flex";

    const advancedToggleBtn = modal.querySelector(".advanced-details-toggle");
    if (advancedToggleBtn) {
      advancedToggleBtn.addEventListener("click", () => {
        const content = modal.querySelector(".advanced-details-content");
        const isOpen = !content.classList.contains("is-hidden");
        content.classList.toggle("is-hidden", isOpen);
        advancedToggleBtn.classList.toggle("is-open", !isOpen);
      });
    }

    const titleTextarea = modal.querySelector("#modal-edit-title");
    const descTextarea = modal.querySelector("#modal-edit-description");
    autoSizeTextarea(titleTextarea);
    autoSizeTextarea(descTextarea);
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
    const tagHTML = `<span class="status-tag ${tagInfo.className}">${escapeHtml(
      tagInfo.text
    )}</span>`;
    const dropdownHTML = createDropdown(
      options,
      selectedValue,
      id,
      field,
      type,
      false
    );
    return `<div class="tag-editor">${tagHTML}${dropdownHTML}</div>`;
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
    // MODIFIED: Destructure skillsId instead of skills
    const {
      status,
      assigneeId,
      assignedAt,
      startedAt,
      completedAt,
      createdAt,
      skillsId,
      complexity,
      requestedBy,
    } = ticket;

    // --- Basic Field Checks ---
    // MODIFIED: Check for skillsId
    if (!skillsId)
      warnings.push({
        field: "skillsId",
        message: "Ticket is missing Skills.",
      });
    if (!complexity)
      warnings.push({
        field: "complexity",
        message: "Ticket is missing Complexity.",
      });
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
    if (!myTicketCountEl || !unassignedCountEl) return;

    const doneStatuses = ["Completed", "Rejected", "Cancelled"];

    // MODIFIED: Filter by assigneeId and the current user's ID
    const myTicketCount = appData.allTickets.filter(
      (t) =>
        t.assigneeId == appData.currentUserId &&
        !doneStatuses.includes(t.status)
    ).length;

    // MODIFIED: Filter where assigneeId is null or undefined
    const unassignedCount = appData.allTickets.filter(
      (t) => t.assigneeId == null
    ).length;

    myTicketCountEl.textContent = myTicketCount;
    myTicketCountEl.style.display = myTicketCount > 0 ? "inline-block" : "none";

    unassignedCountEl.textContent = unassignedCount;
    unassignedCountEl.style.display =
      unassignedCount > 0 ? "inline-block" : "none";
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
    const selectedText = selectedOption ? selectedOption.text : "";
    const clearIconHTML = isClearable
      ? '<i class="fas fa-times-circle clear-icon"></i>'
      : "";
    let html = `<div class="editable-field-wrapper ${hasValueClass}">
                    <div class="searchable-dropdown">
                        <input type="text" class="searchable-dropdown-input" value="${escapeHtml(
                          selectedText
                        )}" placeholder="Search..." data-id="${id}" data-field="${field}" data-type="${type}" data-old-value="${escapeHtml(
      selectedValue || ""
    )}" autocomplete="off">
                        <div class="searchable-dropdown-list">`;
    options.forEach((opt) => {
      html += `<div data-value="${escapeHtml(opt.value)}">${escapeHtml(
        opt.text
      )}</div>`;
    });
    html += `</div></div>${clearIconHTML}</div>`;
    return html;
  }

  function renderPage(page) {
    if (!tableWrapper) return;
    const scrollPosition = tableWrapper.scrollTop;
    const tableHead = document.querySelector("table thead tr");
    const tableBody = document.querySelector("table tbody");

    tableHead.innerHTML = isBulkEditMode
      ? '<th class="checkbox-cell"><input type="checkbox" id="select-all-checkbox" title="Select all on this page"></th>'
      : "";
    tableHead.innerHTML += [
      "ID",
      "Task",
      "Type",
      "Requested By",
      "Status",
      "Assignee",
      "Priority",
      "",
    ]
      .map((h) => `<th>${h}</th>`)
      .join("");

    tableBody.innerHTML = "";
    const paginatedTickets = appData.tickets.slice(
      (page - 1) * ticketsPerPage,
      page * ticketsPerPage
    );

    if (paginatedTickets.length === 0) {
      const colCount = isBulkEditMode ? 9 : 8;
      tableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 2rem;">No tickets found.</td></tr>`;
      updatePaginationControls(page, 0);
      return;
    }

    let lastProjectTitle = null;
    let lastEpicTitle = null;

    paginatedTickets.forEach((ticket) => {
      // ... (The entire group header logic remains unchanged) ...
      const colCount = isBulkEditMode ? 9 : 8;

      if (
        groupByProject &&
        (ticket.projectName || "Unassigned") !== lastProjectTitle
      ) {
        lastProjectTitle = ticket.projectName || "Unassigned";
        const projectTickets = appData.tickets.filter(
          (t) => (t.projectName || "Unassigned") === lastProjectTitle
        );
        const groupTicketCount = projectTickets.length;
        const projectId = projectTickets[0]?.projectId || "null";
        const epicsInProject = new Set(
          projectTickets.map((t) => t.epic).filter(Boolean)
        );
        const epicCount = epicsInProject.size;
        const epicIcon = `<i class="fas fa-bolt epic-icon" style="font-size: 0.85em;"></i>`;
        const taskIcon = `<i class="fas fa-tasks" style="font-size: 0.85em; color: var(--text-secondary);"></i>`;
        const countDisplay = `<span style="display: inline-flex; align-items: center; gap: 0.35rem;">${epicIcon} ${epicCount} ${
          epicCount === 1 ? "epic" : "epics"
        }</span><span style="margin: 0 0.25rem; color: var(--border-color);">•</span><span style="display: inline-flex; align-items: center; gap: 0.35rem;">${taskIcon} ${groupTicketCount} ${
          groupTicketCount === 1 ? "task" : "tasks"
        }</span>`;
        tableBody.innerHTML += `<tr class="project-group-header"><td colspan="${colCount}"><div class="group-header-content"><i class="fas fa-chevron-down toggle-icon"></i><i class="fas fa-folder project-icon"></i><div style="display: flex; align-items: center;"><span class="project-name">${escapeHtml(
          lastProjectTitle
        )}</span><span class="group-count">${countDisplay}</span></div><div class="group-actions"><button class="action-btn-inline add-epic-inline-btn" data-project-id="${projectId}" title="Add New Epic"><i class="fas fa-bolt"></i></button><button class="action-btn-inline add-task-inline-btn" data-project-id="${projectId}" title="Add Task to Project"><i class="fas fa-plus"></i></button></div></div></td></tr>`;
        lastEpicTitle = null;
      }

      if (groupByEpic && (ticket.epic || "No Epic") !== lastEpicTitle) {
        lastEpicTitle = ticket.epic || "No Epic";
        const projectFilter = (t) =>
          (t.projectName || "Unassigned") === lastProjectTitle;
        const epicFilter = (t) => (t.epic || "No Epic") === lastEpicTitle;
        const epicTickets = appData.tickets.filter(
          (t) => projectFilter(t) && epicFilter(t)
        );
        const groupTicketCount = epicTickets.length;
        const projectId = epicTickets[0]?.projectId || "null";
        tableBody.innerHTML += `<tr class="epic-group-header"><td colspan="${colCount}"><div class="group-header-content"><div class="nesting-line"></div><i class="fas fa-chevron-down toggle-icon"></i><i class="fas fa-bolt epic-icon"></i><div style="display: flex; align-items: center;"><span class="epic-name">${escapeHtml(
          lastEpicTitle
        )}</span><span class="group-count">${groupTicketCount}</span></div><div class="group-actions"><button class="action-btn-inline add-task-inline-btn" data-project-id="${projectId}" data-epic-name="${escapeHtml(
          lastEpicTitle
        )}" title="Add Task to Epic"><i class="fas fa-plus"></i></button></div></div></td></tr>`;
      }

      const row = tableBody.insertRow();
      row.id = `ticket-row-${ticket.id}`;
      if (groupByEpic && lastEpicTitle) row.classList.add("is-in-epic");

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

      // MODIFIED: Create dropdown options for assignees and requesters.
      const assigneeOptions = appData.teamMembers.map((m) => ({
        value: m.id,
        text: m.name,
      }));
      const requesterOptions = appData.users.map((u) => ({
        value: u,
        text: u,
      })); // Assuming requestedBy is still a name

      row.innerHTML = `
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
            <td data-label="Task"><div class="task-content"><strong>${safeTitle}</strong><br><small style="color: var(--text-secondary);">${safeDescription}</small><div style="display: flex; align-items: center; margin-top: 8px;"><div style="display:flex; align-items:center; margin-top:8px;"><div class="ticket-age ${
        ageInfo.isOverdue ? "overdue" : ""
      }"><i class="far fa-clock"></i><span>${
        ageInfo.text
      }</span></div>${warningBadgeHtml}${subtaskCountHtml}</div></div></td>
            <td data-label="Type">${createTypeTag(ticket.type)}</td>
            <td data-label="Requested By">${createSearchableDropdown(
              requesterOptions,
              ticket.requestedBy,
              ticket.id,
              "requestedBy"
            )}</td>
            <td data-label="Status">${createTagEditor(
              [
                "Open",
                "In Progress",
                "On Hold",
                "Blocked",
                "Cancelled",
                "Rejected",
                "Completed",
              ],
              ticket.status,
              ticket.id,
              "status"
            )}</td>
            <td data-label="Assignee">${createSearchableDropdown(
              assigneeOptions,
              ticket.assigneeId,
              ticket.id,
              "assigneeId"
            )}</td>
            <td data-label="Priority">${createTagEditor(
              ["Urgent", "High", "Medium", "Low"],
              ticket.priority,
              ticket.id,
              "priority"
            )}</td>
            <td data-label=""><div class="task-icons">${
              ticket.relevantLink
                ? `<i class="fas fa-paperclip attachment-icon" data-id="${ticket.id}" data-type="ticket"></i>`
                : ""
            }<i class="fas fa-history history-icon" data-ticket-id="${
        ticket.id
      }"></i></div></td>
        `;
    });

    addTableEventListeners();
    updatePaginationControls(page, appData.tickets.length);
    tableWrapper.scrollTop = scrollPosition;
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
    document.getElementById("bulk-add-complexity").innerHTML =
      '<option value="">-- Select --</option><option>Easy</option><option>Moderate</option><option>Complex</option>';
    createSearchableDropdownForModal(
      document.getElementById("bulk-add-skills-container"),
      appData.skills.map((s) => ({ value: s.id, text: s.name })),
      "Select skills..."
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
      // Directly control the display style of the left panel
      leftPanel.style.display = isBulkOn ? "flex" : "none";

      // If turning bulk settings OFF, expand all advanced sections
      if (!isBulkOn) {
        document
          .querySelectorAll("#new-tickets-tbody .main-ticket-row")
          .forEach((row) => {
            const advancedRow = row.nextElementSibling;
            if (
              advancedRow &&
              advancedRow.classList.contains("advanced-fields-row")
            ) {
              advancedRow.style.display = "";
              row.querySelector(".advanced-toggle-btn").classList.add("active");
            }
          });
      }
    };

    toggle.removeEventListener("change", handleToggle); // Remove old listener to prevent duplicates
    toggle.addEventListener("change", handleToggle);

    // Set initial state from the checkbox
    handleToggle();

    addTicketRowToModal();
    modal.style.display = "flex";
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
                <label><i class="fas fa-puzzle-piece fa-fw"></i>Complexity</label>
                <select class="inline-editor override-complexity"></select>
            </div>
            <div class="detail-field">
                <label><i class="fas fa-tools fa-fw"></i>Skills</label>
                <div class="override-skills-container"></div>
            </div>
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
    advCell.querySelector(".override-complexity").innerHTML =
      '<option value="">-- Use Bulk Setting --</option><option>Easy</option><option>Moderate</option><option>Complex</option>';

    const assigneeContainer = advCell.querySelector(
      ".override-assignee-container"
    );
    assigneeContainer.id = `assignee-container-${uniqueId}`;
    const skillsContainer = advCell.querySelector(".override-skills-container");
    skillsContainer.id = `skills-container-${uniqueId}`;

    createSearchableDropdownForModal(
      assigneeContainer,
      [
        { value: "", text: "-- Use Bulk Setting --" },
        ...appData.teamMembers.map((m) => ({ value: m.id, text: m.name })),
      ],
      "Select assignee..."
    );
    createSearchableDropdownForModal(
      skillsContainer,
      [
        { value: "", text: "-- Use Bulk Setting --" },
        ...appData.skills.map((s) => ({ value: s.id, text: s.name })),
      ],
      "Select skills..."
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

  function openAddProjectModal() {
    const modal = document.getElementById("add-project-modal");
    modal
      .querySelectorAll("input, select, textarea")
      .forEach((el) => (el.value = ""));

    // MODIFIED: Use .map(m => ({ value: m.name, text: m.name })) to correctly pass name strings
    createSearchableDropdownForModal(
      document.getElementById("new-project-owner-container"),
      appData.teamMembers.map((m) => ({ value: m.name, text: m.name })),
      "Select owner..."
    );

    // MODIFIED: Use .map(m => m.name) to pass an array of strings for the multi-select
    document.getElementById("new-project-collaborators-container").innerHTML =
      createMultiSelectDropdown(
        appData.teamMembers.map((m) => m.name),
        "",
        "new",
        "collaborators",
        "project"
      );

    const startDateInput = document.getElementById("new-project-start-date");
    const estCompletedDateInput = document.getElementById(
      "new-project-est-completed-date"
    );
    startDateInput.addEventListener("change", () => {
      if (startDateInput.value)
        estCompletedDateInput.min = startDateInput.value;
    });
    const textarea = document.getElementById("new-project-description");
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
    modal.style.display = "flex";
  }

  function handleAddProjectModalClick(e) {
    const target = e.target;
    const modal = document.getElementById("add-project-modal");
    if (target.closest(".multi-select-pills"))
      target.closest(".multi-select-container").classList.toggle("is-open");
    else if (!target.closest(".multi-select-container"))
      modal
        .querySelectorAll(".multi-select-container.is-open")
        .forEach((el) => el.classList.remove("is-open"));
    if (target.classList.contains("remove-pill")) {
      const valueToRemove = target.dataset.value;
      const container = target.closest(".multi-select-container");
      const checkbox = container.querySelector(
        `input[value="${valueToRemove}"]`
      );
      if (checkbox) checkbox.checked = false;
      updateMultiSelectPills(container);
    }
  }
  function handleAddProjectModalChange(e) {
    if (e.target.closest(".multi-select-option"))
      updateMultiSelectPills(e.target.closest(".multi-select-container"));
  }
  function getReasonFromUser(title) {
    return new Promise((resolve) => {
      const modal = document.getElementById("reason-modal");
      const titleEl = document.getElementById("reason-modal-title");
      const input = document.getElementById("reason-input");
      const submitBtn = document.getElementById("submit-reason");
      const cancelBtn = document.getElementById("cancel-reason");
      titleEl.textContent = title;
      input.value = "";
      modal.style.display = "flex";
      input.focus();
      const close = (value) => {
        modal.style.display = "none";
        submitBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(value);
      };
      submitBtn.onclick = () => close(input.value);
      cancelBtn.onclick = () => close(null);
    });
  }
  // REPLACE the createSearchableDropdownForModal function
  function createSearchableDropdownForModal(
    container,
    options,
    placeholder,
    onChangeCallback
  ) {
    const dropdownId = `searchable-${container.id}`,
      inputId = `input-${container.id}`,
      listId = `list-${container.id}`;
    container.innerHTML = `<div class="searchable-dropdown" id="${dropdownId}"><input type="text" class="searchable-dropdown-input inline-editor" id="${inputId}" placeholder="${placeholder}" data-value="" autocomplete="off"><div class="searchable-dropdown-list" id="${listId}">${options
      .map(
        (opt) =>
          `<div data-value="${escapeHtml(opt.value)}">${escapeHtml(
            opt.text
          )}</div>`
      )
      .join("")}</div></div>`;
    const input = document.getElementById(inputId),
      list = document.getElementById(listId);
    input.addEventListener("focus", () => (list.style.display = "block"));
    input.addEventListener("blur", () =>
      setTimeout(() => (list.style.display = "none"), 200)
    );
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
    });
    list.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "DIV") {
        input.value = e.target.textContent;
        input.dataset.value = e.target.dataset.value;
        if (onChangeCallback) onChangeCallback(); // <-- MODIFICATION
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
    handler({ target: input }, "");
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
  }

  function renderComments(ticket) {
    const container = document.getElementById("comment-container-modal");
    if (!container) return;

    const comments = (ticket.comment || []).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const commentsListHtml = comments
      .map((comment) => {
        const authorInitial = (comment.author || "G").charAt(0).toUpperCase();
        const timestamp = comment.timestamp
          ? new Date(comment.timestamp).toLocaleString()
          : "";
        return `
            <div class="comment-item">
                <div class="comment-avatar">${authorInitial}</div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(
                          comment.author
                        )}</span>
                        <span class="comment-timestamp">${timestamp}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                </div>
            </div>`;
      })
      .join("");

    container.innerHTML = `
            <div class="ticket-comments-container">
                <h4 class="modal-section-label">Conversation</h4>
                <div class="comment-list">${commentsListHtml}</div>
                <div class="comment-input-area">
                    <textarea id="new-comment-input" class="inline-editor" placeholder="Add a comment..."></textarea>
                    <button id="add-comment-btn" class="action-btn">Comment</button>
                </div>
            </div>`;
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
      // No need to manually update state, real-time will handle it
      showToast("Subtask updated!", "success");
    }
  }

  async function handleCommentUpdate(ticketId, newComments) {
    const { error } = await supabaseClient
      .from("ticket")
      .update({ comment: newComments })
      .eq("id", ticketId);
    if (error) {
      showToast("Failed to update comment: " + error.message, "error");
    } else {
      // No need to manually update state, real-time will handle it
      showToast("Comment updated!", "success");
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

  function handleCommentAdd(e) {
    const modal = e.target.closest(".ticket-main-content");
    const ticketId = modal.dataset.ticketId;
    const input = document.getElementById("new-comment-input");
    const text = input.value.trim();
    if (!text) return;

    const ticket = appData.allTickets.find((t) => t.id == ticketId);
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: appData.currentUserName,
      text: text,
      timestamp: new Date().toISOString(),
      parentId: null,
    };
    const updatedComments = [...(ticket.comment || []), newComment];

    handleCommentUpdate(ticketId, updatedComments);
    input.value = "";
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
        <td data-label="Requested By" id="inline-new-requestedBy-cell"></td>
        
        <td data-label="Status"><span class="status-tag status-open">Open</span></td>

        <td data-label="Assignee" id="inline-new-assignee-cell"></td>
        <td data-label="Priority"><select id="inline-new-priority" class="inline-editor">${priorityOptions}</select></td>
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
    saveIcon.className = "fas fa-spinner fa-spin"; // Change to a spinner icon
    row.style.opacity = "0.5";
    // --- UI INDICATOR END ---

    const requestedByInput = row.querySelector(
      "#inline-new-requestedBy-cell input"
    );
    const assigneeInput = row.querySelector("#inline-new-assignee-cell input");
    const assigneeId = assigneeInput.dataset.value || null;

    const { data: lastIdData, error: idError } = await window.supabaseClient.rpc(
      "get_last_ticket_id"
    );

    if (idError && idError.code !== "PGRST116") {
      showToast(`Error getting last ticket ID: ${idError.message}`, "error");
      // --- UI INDICATOR RESET on early exit ---
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveIcon.className = originalIconClass;
      row.style.opacity = "1";
      return;
    }
    const lastId = lastIdData ? lastIdData : 0;

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
      id: lastId + 1,
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
      "Select owner..."
    );
    modal.querySelector("#edit-project-owner-container input").value =
      project.projectOwner || "";
    modal.querySelector("#edit-project-owner-container input").dataset.value =
      project.projectOwner || "";

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
        const input = item
          .closest(".searchable-dropdown")
          .querySelector("input");
        handleReconcileUpdate({ target: input }, newValue);
        input.nextElementSibling.style.display = "none";
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
      if (!e.target.closest(".reconcile-ticket-dropdown")) {
        wrapper
          .querySelectorAll(".searchable-dropdown-list")
          .forEach((list) => {
            list.style.display = "none";
          });
      }
    };

    wrapper.addEventListener("click", handleEvent);
    wrapper.addEventListener("change", handleEvent);

    wrapper.addEventListener("focusin", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        // First, find and close all other open dropdowns in the view
        const allDropdowns = wrapper.querySelectorAll(
          ".searchable-dropdown-list"
        );
        allDropdowns.forEach((list) => {
          if (list !== e.target.nextElementSibling) {
            // Don't close the current one
            list.style.display = "none";
          }
        });

        // Now, open the dropdown for the currently focused input
        e.target.nextElementSibling.style.display = "block";
      }
    });

    // All closing/reverting logic is now handled in the keydown listener for Escape, Enter, and Tab.

    wrapper.addEventListener("keyup", (e) => {
      if (e.target.classList.contains("searchable-dropdown-input")) {
        const filter = e.target.value.toLowerCase();
        const list = e.target.nextElementSibling;
        list.querySelectorAll("div").forEach((item) => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(filter) ? "" : "none";
        });
        // Clear any active selection when user types
        const activeItem = list.querySelector(".dropdown-active");
        if (activeItem) activeItem.classList.remove("dropdown-active");
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
      document.getElementById("rct-skills-container"),
      appData.skills.map((s) => ({ value: s.id, text: s.name })),
      "Select skills..."
    );
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
      "#rct-complexity": "Complexity",
      "#rct-skills-container input": "Skills",
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

    const { data: lastId, error: idError } = await window.supabaseClient.rpc(
      "get_last_ticket_id"
    );

    if (idError && idError.code !== "PGRST116") {
      showToast(`Error getting last ticket ID: ${idError.message}`, "error");
      submitBtn.textContent = "Create Ticket";
      submitBtn.disabled = false;
      return;
    }
    const newTicketId = (lastId || 0) + 1;

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
      id: newTicketId,
      title: document.getElementById("rct-title").value.trim(),
      description: document.getElementById("rct-description").value.trim(),
      createdAt: createdAtTimestamp,
      type: document.getElementById("rct-type").value,
      requestedBy: document.querySelector("#rct-requestedBy-container input")
        .value,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      status: status,
      complexity: document.getElementById("rct-complexity").value,
      skillsId: parseInt(
        document.querySelector("#rct-skills-container input").dataset.value,
        10
      ),
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

    if (String(oldValue || "") === String(newValue || "")) return;

    const td = element.closest("td");
    const parentRow = element.closest("tr");
    td.classList.add("updating");

    const { error } = await supabaseClient
      .from("reconcileHrs")
      .update({ ticketNumber: newValue })
      .eq("id", reconcileId);

    td.classList.remove("updating");

    if (error) {
      showToast(`Update failed: ${error.message}`, "error");
    } else {
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
        const list = activeEl.nextElementSibling;
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
              ? `[${oldTicket.id}] ${oldTicket.title}`
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
              ? `[${escOldTicket.id}] ${escOldTicket.title}`
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
    assigneeSelect.innerHTML = appData.teamMembers
      .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
      .join("");
    assigneeSelect.value = appData.currentUserId; // Default to logged-in user

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    startDateInput.value = thirtyDaysAgo.toISOString().split("T")[0];
    endDateInput.value = today.toISOString().split("T")[0];

    // Store initial values
    dashboardAssigneeId = assigneeSelect.value;
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
    // 1. Filter tickets based on dashboard controls
    const startDate = new Date(dashboardStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dashboardEndDate);
    endDate.setHours(23, 59, 59, 999);

    const filteredTickets = appData.allTickets.filter((t) => {
      const createdAt = new Date(t.createdAt);
      return (
        t.assigneeId == dashboardAssigneeId &&
        createdAt >= startDate &&
        createdAt <= endDate
      );
    });

    const allUserTickets = appData.allTickets.filter(
      (t) => t.assigneeId == dashboardAssigneeId
    );
    const finalStates = ["Completed", "Cancelled", "Rejected"];
    const activeTickets = allUserTickets.filter(
      (t) => !finalStates.includes(t.status)
    );

    // 2. Calculate metrics for summary cards
    const totalCount = filteredTickets.length;
    const blockedCount = activeTickets.filter(
      (t) => t.status === "Blocked"
    ).length;
    const onHoldCount = activeTickets.filter(
      (t) => t.status === "On Hold"
    ).length;
    const extremeCount = activeTickets.filter((t) =>
      ["Urgent", "High"].includes(t.priority)
    ).length;

    const workloadCount = activeTickets.length;
    const toFixCount = activeTickets.filter(
      (t) => getTicketWarnings(t).length > 0
    ).length;

    // 3. Update DOM for summary cards
    document.getElementById("total-tickets-count").textContent = totalCount;
    document.getElementById("blocked-tickets-count").textContent = blockedCount;
    document.getElementById("on-hold-tickets-count").textContent = onHoldCount;
    document.getElementById("extreme-tickets-count").textContent = extremeCount;
    document.getElementById("current-workload-count").textContent =
      workloadCount;
    document.getElementById("to-fix-count").textContent = toFixCount;

    // 4. Prepare data for the chart (MODIFIED LOGIC)
    const weeklyData = {};

    // Process incoming and completed tickets within the same loop
    filteredTickets.forEach((t) => {
      const week = getWeekOfYear(new Date(t.createdAt));
      if (!weeklyData[week]) {
        weeklyData[week] = { incoming: 0, completed: 0 };
      }

      // Always increment incoming for every ticket in the filtered range
      weeklyData[week].incoming++;

      // Increment completed ONLY if the status is 'Completed'
      if (t.status === "Completed") {
        weeklyData[week].completed++;
      }
    });

    const sortedWeeks = Object.keys(weeklyData).sort();
    const chartLabels = sortedWeeks;
    const incomingData = sortedWeeks.map((week) => weeklyData[week].incoming);
    const completedData = sortedWeeks.map((week) => weeklyData[week].completed);

    // 5. Render Chart.js area chart
    const ctx = document.getElementById("trends-chart").getContext("2d");
    if (trendsChart) {
      trendsChart.destroy();
    }

    // Get theme-specific colors for the chart
    const textColor = getComputedStyle(document.body).getPropertyValue(
      "--text-secondary"
    );
    const gridColor = getComputedStyle(document.body).getPropertyValue(
      "--border-color"
    );
    const pointBorderColor = getComputedStyle(document.body).getPropertyValue(
      "--surface-color"
    );

    // Create Gradient for the area chart
    const incomingGradient = ctx.createLinearGradient(0, 0, 0, 400);
    incomingGradient.addColorStop(0, "rgba(129, 140, 248, 0.5)");
    incomingGradient.addColorStop(1, "rgba(129, 140, 248, 0)");

    trendsChart = new Chart(ctx, {
      type: "line", // Base type is line
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Incoming",
            data: incomingData,
            borderColor: "#818cf8",
            backgroundColor: incomingGradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#818cf8",
            pointBorderColor: pointBorderColor,
            pointHoverRadius: 6,
            pointBorderWidth: 2,
            pointHoverBorderWidth: 2,
            order: 2, // Ensure line is drawn on top
          },
          {
            type: "bar", // Override type for this dataset
            label: "Completed",
            data: completedData,
            backgroundColor: "rgba(52, 211, 153, 0.7)",
            borderColor: "rgba(52, 211, 153, 1)",
            borderWidth: 1,
            order: 1, // Ensure bars are drawn behind the line
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "No. of Tickets",
              color: textColor,
              font: {
                weight: "bold",
              },
            },
            ticks: {
              stepSize: 1,
              color: textColor,
            },
            grid: {
              color: gridColor,
            },
          },
          x: {
            title: {
              display: true,
              text: "Week",
              color: textColor,
              font: {
                weight: "bold",
              },
            },
            ticks: {
              color: textColor,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    // 6. Render ticket lists
    const urgentTickets = activeTickets
      .filter((t) => ["Urgent", "High"].includes(t.priority))
      .sort((a, b) => b.id - a.id);
    const todoTickets = activeTickets.sort((a, b) => b.id - a.id);

    renderDashboardTicketList("urgent-tickets-list", urgentTickets);
    renderDashboardTicketList("todo-tickets-list", todoTickets);
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
        <td data-label="Requested By" id="inline-new-requestedBy-cell"></td>
        <td data-label="Status"><span class="status-tag status-open">Open</span></td>
        <td data-label="Assignee" id="inline-new-assignee-cell"></td>
        <td data-label="Priority"><select id="inline-new-priority" class="inline-editor">${priorityOptions}</select></td>
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
  function getStartDateFromUser() {
    return new Promise((resolve) => {
      const modal = document.getElementById("open-to-complete-modal");
      const dateInput = document.getElementById("open-to-complete-date-input");
      const confirmBtn = document.getElementById(
        "open-to-complete-confirm-btn"
      );
      const cancelBtn = document.getElementById("open-to-complete-cancel-btn");

      // Set the max date to today and default value to today
      const today = new Date().toISOString().split("T")[0];
      dateInput.max = today;
      dateInput.value = today;

      const close = (value) => {
        modal.style.display = "none";
        // Clean up listeners to prevent duplicates
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(value);
      };

      confirmBtn.onclick = () => {
        if (dateInput.value) {
          close(dateInput.value);
        } else {
          showToast("Please select a valid start date.", "error");
        }
      };

      cancelBtn.onclick = () => close(null);

      modal.style.display = "flex";
      dateInput.focus();
    });
  }

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
