/* ===== BloodLink - Application logic ===== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----- Helpers -----
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const escapeHTML = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  const timeAgo = (iso) => {
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + " hr ago";
    return Math.round(hrs / 24) + " day(s) ago";
  };

  // ----- State -----
  let donors = Store.get(STORAGE_KEYS.donors, []);
  let requests = Store.get(STORAGE_KEYS.requests, []);
  let inventory = Store.get(STORAGE_KEYS.inventory, null) || JSON.parse(JSON.stringify(DEFAULT_INVENTORY));

  const save = () => {
    Store.set(STORAGE_KEYS.donors, donors);
    Store.set(STORAGE_KEYS.requests, requests);
    Store.set(STORAGE_KEYS.inventory, inventory);
  };

  // ----- Mobile nav -----
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  // Highlight the nav link for the section in view
  const sections = $$("main section[id]");
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          $$(".nav-links a").forEach((a) =>
            a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id)
          );
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => navObserver.observe(s));

  $("#year").textContent = new Date().getFullYear();

  // ----- Validation -----
  const rules = {
    donorName: (v) => (v.trim().length >= 3 ? "" : "Enter your full name (min 3 characters)."),
    donorAge: (v) => {
      const n = Number(v);
      return v !== "" && n >= 18 && n <= 65 ? "" : "Age must be between 18 and 65.";
    },
    donorBlood: (v) => (BLOOD_GROUPS.includes(v) ? "" : "Select a blood group."),
    donorCity: (v) => (v.trim() ? "" : "Enter your city."),
    donorPhone: (v) => (/^[6-9]\d{9}$/.test(v.replace(/\s|-/g, "")) ? "" : "Enter a valid 10-digit mobile number."),
    donorEmail: (v) => (!v || /^\S+@\S+\.\S+$/.test(v) ? "" : "Enter a valid email address."),
    donorConsent: (v, el) => (el.checked ? "" : "Please agree to receive alerts."),

    reqPatient: (v) => (v.trim() ? "" : "Enter the patient's name."),
    reqHospital: (v) => (v.trim() ? "" : "Enter the hospital name."),
    reqBlood: (v) => (BLOOD_GROUPS.includes(v) ? "" : "Select the blood group needed."),
    reqUnits: (v) => (Number(v) >= 1 && Number(v) <= 20 ? "" : "Units must be between 1 and 20."),
    reqCity: (v) => (v.trim() ? "" : "Enter the city."),
    reqContact: (v) => (/^[6-9]\d{9}$/.test(v.replace(/\s|-/g, "")) ? "" : "Enter a valid 10-digit contact number."),

    cName: (v) => (v.trim() ? "" : "Enter your name."),
    cMsg: (v) => (v.trim().length >= 5 ? "" : "Write a short message.")
  };

  function validateForm(form) {
    let valid = true;
    $$("input, select, textarea", form).forEach((el) => {
      const rule = rules[el.id];
      if (!rule) return;
      const value = el.type === "checkbox" ? "" : el.value;
      const msg = rule(value, el);
      const errEl = form.querySelector(`.error[data-for="${el.id}"]`);
      el.classList.toggle("invalid", !!msg);
      if (errEl) errEl.textContent = msg;
      if (msg) valid = false;
    });
    return valid;
  }

  // Clear errors while typing
  $$("form input, form select, form textarea").forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("invalid");
      const errEl = el.form.querySelector(`.error[data-for="${el.id}"]`);
      if (errEl) errEl.textContent = "";
    });
  });

  const setStatus = (el, msg, type) => {
    el.textContent = msg;
    el.className = "form-status " + (type || "");
  };

  // ----- Donor enrollment -----
  $("#donorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const status = $("#donorStatus");
    if (!validateForm(form)) {
      setStatus(status, "Please fix the highlighted fields.", "error");
      return;
    }
    const phone = $("#donorPhone").value.replace(/\s|-/g, "");
    if (donors.some((d) => d.phone === phone)) {
      setStatus(status, "This phone number is already registered.", "error");
      return;
    }
    donors.push({
      id: uid(),
      name: $("#donorName").value.trim(),
      age: Number($("#donorAge").value),
      bloodGroup: $("#donorBlood").value,
      city: $("#donorCity").value.trim(),
      phone,
      email: $("#donorEmail").value.trim(),
      registeredAt: new Date().toISOString(),
      donations: 0
    });
    save();
    form.reset();
    setStatus(status, "Thank you! You are now registered as a donor.", "success");
    renderAll();
  });

  // ----- Blood request -----
  $("#requestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const status = $("#requestStatus");
    if (!validateForm(form)) {
      setStatus(status, "Please fix the highlighted fields.", "error");
      return;
    }
    const req = {
      id: uid(),
      patient: $("#reqPatient").value.trim(),
      hospital: $("#reqHospital").value.trim(),
      bloodGroup: $("#reqBlood").value,
      units: Number($("#reqUnits").value),
      city: $("#reqCity").value.trim(),
      urgency: $("#reqUrgency").value,
      contact: $("#reqContact").value.replace(/\s|-/g, ""),
      notes: $("#reqNotes").value.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
      notifiedDonors: [],
      acceptedBy: null
    };

    // Notify matching donors (compatible blood groups)
    const compatible = CAN_DONATE_TO[req.bloodGroup] || [];
    req.notifiedDonors = donors.filter((d) => compatible.includes(d.bloodGroup)).map((d) => d.id);

    requests.unshift(req);
    save();
    form.reset();
    $("#reqUnits").value = 1;

    const sent = req.notifiedDonors.length;
    setStatus(
      status,
      sent
        ? `Request submitted. Alert sent to ${sent} matching donor(s).`
        : "Request submitted. No matching donors are registered yet.",
      "success"
    );
    if (req.urgency === "emergency") {
      inventory[req.bloodGroup] && (inventory[req.bloodGroup].emergencyRequests = (inventory[req.bloodGroup].emergencyRequests || 0) + 1);
      save();
    }
    renderAll();
  });

  // ----- Contact -----
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const status = $("#contactStatus");
    if (!validateForm(form)) {
      setStatus(status, "Please fix the highlighted fields.", "error");
      return;
    }
    form.reset();
    setStatus(status, "Thanks for reaching out. We will get back to you soon.", "success");
  });

  // ----- Alerts & responses -----
  function renderAlerts() {
    const list = $("#alertList");
    const emergencies = requests.filter((r) => r.urgency !== "normal").slice(0, 10);
    if (!emergencies.length) {
      list.innerHTML = '<p class="empty">No alerts yet. Submit an urgent or emergency request to see alerts here.</p>';
      return;
    }
    list.innerHTML = emergencies.map((r) => {
      const isResolved = r.status === "fulfilled";
      const tagClass = r.urgency === "emergency" ? "" : "urgent";
      const accept = !isResolved
        ? `<button class="btn btn-sm accept" data-accept="${r.id}">I can donate</button>`
        : "";
      const done = isResolved
        ? `<span class="tag done">Fulfilled by ${escapeHTML(r.acceptedBy)}</span>`
        : "";
      return `
        <div class="alert ${isResolved ? "resolved" : ""}">
          <div class="alert-top">
            <span class="alert-title">${escapeHTML(r.bloodGroup)} needed: ${r.units} unit(s)</span>
            <span class="tag ${tagClass}">${r.urgency === "emergency" ? "EMERGENCY" : "URGENT"}</span>
          </div>
          <p><strong>${escapeHTML(r.hospital)}</strong>, ${escapeHTML(r.city)} &middot; ${timeAgo(r.createdAt)}</p>
          <p>Patient: ${escapeHTML(r.patient)} &middot; Contact: ${escapeHTML(r.contact)}</p>
          <p>Notified donors: ${r.notifiedDonors.length}</p>
          <div class="alert-actions">
            ${accept}
            ${done}
            ${!isResolved ? `<button class="btn btn-sm ghost" data-fulfil="${r.id}">Mark fulfilled</button>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  function renderResponses() {
    const list = $("#responseList");
    const responses = requests
      .filter((r) => r.acceptedBy)
      .slice(0, 8);
    list.innerHTML = responses.length
      ? responses.map((r) => `
          <li>
            <span><strong>${escapeHTML(r.acceptedBy)}</strong> accepted ${escapeHTML(r.bloodGroup)}</span>
            <span class="muted">${timeAgo(r.acceptedAt || r.createdAt)}</span>
          </li>`).join("")
      : '<li class="empty">No responses yet.</li>';
  }

  $("#alertList").addEventListener("click", (e) => {
    const acceptBtn = e.target.closest("[data-accept]");
    const fulfilBtn = e.target.closest("[data-fulfil]");
    if (acceptBtn) {
      const req = requests.find((r) => r.id === acceptBtn.dataset.accept);
      if (!req) return;
      const name = prompt("Enter your name to accept this request:");
      if (!name || !name.trim()) return;
      req.acceptedBy = name.trim();
      req.acceptedAt = new Date().toISOString();
      req.status = "fulfilled";
      // Record the donation against inventory
      if (inventory[req.bloodGroup]) {
        inventory[req.bloodGroup].units = Math.max(0, inventory[req.bloodGroup].units - req.units);
      }
      save();
      renderAll();
    }
    if (fulfilBtn) {
      const req = requests.find((r) => r.id === fulfilBtn.dataset.fulfil);
      if (!req) return;
      req.status = "fulfilled";
      req.acceptedBy = req.acceptedBy || "Blood bank";
      save();
      renderAll();
    }
  });

  // ----- Inventory dashboard (Smart Inventory Engine + Optimization) -----
  function computeStatus(item) {
    const pct = item.units / item.capacity;
    if (item.units < 5) return { cls: "s-low", label: "Shortage risk" };
    if (item.expiringSoon >= 5) return { cls: "s-expiry", label: "Expiry risk" };
    if (pct > 0.9) return { cls: "s-excess", label: "Excess stock" };
    return { cls: "s-ok", label: "Stock OK" };
  }

  function renderInventory() {
    const grid = $("#inventoryGrid");
    grid.innerHTML = BLOOD_GROUPS.map((g) => {
      const item = inventory[g] || { units: 0, expiringSoon: 0, capacity: 1 };
      const pct = Math.min(100, Math.round((item.units / item.capacity) * 100));
      const st = computeStatus(item);
      const color = st.cls === "s-low" ? "var(--red)" : st.cls === "s-excess" ? "var(--blue)" : st.cls === "s-expiry" ? "var(--amber)" : "var(--green)";
      return `
        <div class="stock-card">
          <div class="stock-group">${g}</div>
          <div class="stock-units">${item.units} units &middot; ${item.expiringSoon} expiring soon</div>
          <div class="bar"><span style="width:${pct}%;background:${color}"></span></div>
          <div class="stock-status ${st.cls}">${st.label}</div>
        </div>`;
    }).join("");

    // Recommendations (Optimization Engine output, simplified)
    const low = BLOOD_GROUPS.filter((g) => inventory[g] && inventory[g].units < 5);
    const expiring = BLOOD_GROUPS.filter((g) => inventory[g] && inventory[g].expiringSoon >= 5);
    const excess = BLOOD_GROUPS.filter((g) => inventory[g] && inventory[g].units / inventory[g].capacity > 0.9);
    const openReqs = requests.filter((r) => r.status === "open");

    $("#replenishText").textContent = low.length
      ? "Order replenishment for: " + low.join(", ") + "."
      : "All groups are above minimum stock.";
    $("#donorReqText").textContent = (low.length || openReqs.length)
      ? `Send donor appeal to ${low.length ? low.join(", ") + " donors" : "matching donors"} (${openReqs.length} open request(s)).`
      : "No donor appeal needed right now.";
    const redistTarget = excess[0] || "";
    const redistNeed = low[0] || "";
    $("#redistText").textContent = (redistTarget && redistNeed)
      ? `Move surplus ${redistTarget} stock to hospitals needing ${redistNeed}.`
      : (expiring.length ? `Use or redistribute expiring stock: ${expiring.join(", ")}.` : "No redistribution needed.");
  }

  // ----- Stats -----
  function animateNumber(el, target) {
    const start = Number(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - startTime) / duration);
      el.textContent = Math.round(start + (target - start) * p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderStats() {
    animateNumber($("#statDonors"), donors.length);
    animateNumber($("#statRequests"), requests.length);
    animateNumber($("#statAlerts"), requests.filter((r) => r.urgency !== "normal").length);
  }

  // ----- Render everything -----
  function renderAll() {
    renderStats();
    renderAlerts();
    renderResponses();
    renderInventory();
  }

  renderAll();
})();
