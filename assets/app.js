(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var endpoint = (cfg.signatureEndpoint || "").trim();
  var demo = !endpoint;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var AFFILIATIONS = {
    alum: "Alum",
    grad: "Graduate alum",
    student: "Current undergraduate",
    gradstudent: "Current graduate student",
    parent: "Parent or family",
    facstaff: "Faculty or staff",
    friend: "Friend of OA"
  };
  var OA_ROLES = { leader: "OA leader", trainer: "Leader trainer" };

  /* ---------- Config-driven bits ---------- */

  $$("[data-contact]").forEach(function (a) {
    if (!cfg.contactEmail) return;
    a.href = "mailto:" + cfg.contactEmail;
    a.textContent = cfg.contactEmail;
  });

  $$("[data-link=petitionUrl]").forEach(function (a) {
    if (cfg.petitionUrl) a.href = cfg.petitionUrl;
  });

  var groupSlot = $("[data-group-slot]");
  if (groupSlot && cfg.googleGroupUrl) {
    groupSlot.innerHTML = "";
    var g = document.createElement("a");
    g.className = "btn btn-small btn-ghost";
    g.href = cfg.googleGroupUrl;
    g.target = "_blank";
    g.rel = "noopener";
    g.textContent = "Join the group";
    groupSlot.appendChild(g);
  }

  if (cfg.letterReady) {
    $("[data-letter-draft]").hidden = true;
    $("[data-letter-final]").hidden = false;
    $("[data-form-title]").textContent = "Co-sign this letter";
    $("[data-done-detail]").textContent = "Thank you. We'll email you when the letter is delivered.";
  }

  var shareMail = $("[data-share-mail]");
  if (shareMail) {
    var shareText = $("#share-text").textContent.trim();
    shareMail.href = "mailto:?subject=" + encodeURIComponent("Help keep Outdoor Action in Princeton's Orientation") +
      "&body=" + encodeURIComponent(shareText);
  }

  /* ---------- Copy buttons ---------- */

  var toastEl = $("[data-toast]");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = $(btn.getAttribute("data-copy"));
      if (!src) return;
      copyText(src.textContent.replace(/\s+/g, " ").trim()).then(
        function () { toast("Copied to clipboard"); },
        function () { toast("Couldn't copy. Select the text and copy it instead."); }
      );
    });
  });

  /* ---------- Signature form ---------- */

  var form = $("#sign-form");
  var affSel = $("#f-aff");
  var yearField = $("[data-year-field]");
  var yearInput = $("#f-year");
  var yearLabel = $("[data-year-label]");
  var errorEl = $("[data-form-error]");
  var submitBtn = $("[data-submit]");

  if (demo) $("[data-demo-note]").hidden = false;

  function yearMode(aff) {
    if (aff === "alum" || aff === "student") return { show: true, required: true, label: "Class year" };
    if (aff === "grad" || aff === "gradstudent") return { show: true, required: true, label: "Degree year (or expected)" };
    if (aff === "parent") return { show: true, required: false, label: "Your student's class year (optional)" };
    return { show: false, required: false };
  }

  function syncYear() {
    var m = yearMode(affSel.value);
    yearField.hidden = !m.show;
    yearInput.required = m.required;
    if (m.label) yearLabel.textContent = m.label;
    if (!m.show) yearInput.value = "";
  }
  affSel.addEventListener("change", syncYear);
  syncYear();

  function showError(msg, field) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    $$("[aria-invalid]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }

  function validate(data) {
    if (data.name.length < 2) return ["Enter your full name.", $("#f-name")];
    var m = yearMode(data.affiliation);
    if (m.required || data.classYear) {
      var y = parseInt(data.classYear, 10);
      var max = new Date().getFullYear() + 8;
      if (!/^\d{4}$/.test(data.classYear) || y < 1930 || y > max) {
        return ["Enter a four-digit year, like 2012.", yearInput];
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return ["Enter a valid email address so we can add you to the campaign's mailing list.", $("#f-email")];
    return null;
  }

  function formData() {
    return {
      name: $("#f-name").value.trim().replace(/\s+/g, " "),
      affiliation: affSel.value,
      classYear: yearInput.value.trim(),
      oaRole: $("#f-oa").value,
      email: $("#f-email").value.trim(),
      comment: $("#f-comment").value.trim(),
      displayOk: "yes",
      website: $("#f-website").value
    };
  }

  var demoSigners = [];

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = formData();
    var problem = validate(data);
    if (problem) { showError(problem[0], problem[1]); return; }
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding your name…";

    var request;
    if (demo) {
      request = new Promise(function (resolve) {
        setTimeout(function () {
          demoSigners.push({ name: data.name, affiliation: data.affiliation, classYear: data.classYear, oaRole: data.oaRole, comment: data.comment });
          resolve({ ok: true });
        }, 500);
      });
    } else {
      request = fetch(endpoint, { method: "POST", body: new URLSearchParams(data) })
        .then(function (r) { return r.json(); });
    }

    request.then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || "The signature wasn't saved.");
      form.hidden = true;
      var done = $("[data-sign-done]");
      done.hidden = false;
      done.focus();
      loadSigners();
    }).catch(function (err) {
      var msg = err && err.message && err.message.indexOf("Failed to fetch") === -1 && err.message.indexOf("JSON") === -1
        ? err.message
        : "We couldn't reach the signature list. Check your connection and try again.";
      if (cfg.contactEmail) msg += " If it keeps happening, email " + cfg.contactEmail + ".";
      showError(msg);
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add my name";
    });
  });

  /* ---------- Signer list ---------- */

  function shortYear(y) { return y ? String(y).slice(-2) : ""; }

  function yearTag(s) {
    var yy = shortYear(s.classYear);
    if (!yy) return "";
    if (s.affiliation === "grad" || s.affiliation === "gradstudent") return "*" + yy;
    if (s.affiliation === "parent") return "P’" + yy;
    return "’" + yy;
  }

  function groupKey(s) {
    var y = parseInt(s.classYear, 10);
    if (s.affiliation === "student" || s.affiliation === "gradstudent") return { key: "9-current", label: "Current students" };
    if ((s.affiliation === "alum" || s.affiliation === "grad") && y) {
      var dec = Math.floor(y / 10) * 10;
      return { key: "1-" + dec, label: "Classes of the " + dec + "s" };
    }
    if (s.affiliation === "alum" || s.affiliation === "grad") return { key: "2-alumni", label: "Alumni" };
    return { key: "9z-others", label: "Families, faculty, staff and friends" };
  }

  function renderSigners(list, total) {
    var holder = $("[data-signers-list]");
    var empty = $("[data-signers-empty]");
    var title = $("[data-signers-title]");
    holder.innerHTML = "";
    var count = typeof total === "number" ? total : list.length;

    var line = $("[data-count-line]");
    if (count > 0) {
      line.hidden = false;
      line.innerHTML = "";
      var strong = document.createElement("strong");
      strong.textContent = count.toLocaleString();
      line.appendChild(strong);
      line.appendChild(document.createTextNode(count === 1 ? " person has signed the open letter so far." : " people have signed the open letter so far."));
      title.textContent = count.toLocaleString() + (count === 1 ? " person has signed" : " people have signed");
    }
    var unlisted = count - list.length;
    if (unlisted > 0) {
      empty.hidden = false;
      empty.textContent = unlisted === count
        ? "Signers so far asked not to be listed by name."
        : unlisted.toLocaleString() + (unlisted === 1 ? " signer asked" : " signers asked") + " not to be listed by name.";
    } else {
      empty.hidden = !!list.length;
    }
    if (!list.length) return;

    var groups = {};
    list.forEach(function (s) {
      var g = groupKey(s);
      (groups[g.key] = groups[g.key] || { label: g.label, items: [] }).items.push(s);
    });

    Object.keys(groups).sort().forEach(function (k) {
      var g = groups[k];
      g.items.sort(function (a, b) {
        return (parseInt(a.classYear, 10) || 0) - (parseInt(b.classYear, 10) || 0) || a.name.localeCompare(b.name);
      });
      var wrap = document.createElement("div");
      wrap.className = "signer-group";
      var h = document.createElement("h4");
      h.textContent = g.label + " ";
      var n = document.createElement("span");
      n.textContent = "(" + g.items.length + ")";
      h.appendChild(n);
      wrap.appendChild(h);
      var ul = document.createElement("ul");
      ul.className = "signer-list";
      g.items.forEach(function (s) {
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(s.name));
        var tag = yearTag(s);
        if (tag) {
          var yr = document.createElement("span");
          yr.className = "yr";
          yr.textContent = " " + tag;
          li.appendChild(yr);
        }
        if (s.affiliation === "facstaff") {
          var fs = document.createElement("span");
          fs.className = "yr";
          fs.textContent = ", faculty/staff";
          li.appendChild(fs);
        }
        if (OA_ROLES[s.oaRole]) {
          var r = document.createElement("span");
          r.className = "role";
          r.textContent = OA_ROLES[s.oaRole];
          li.appendChild(r);
        }
        if (s.comment) {
          var q = document.createElement("q");
          q.className = "msg";
          q.textContent = s.comment;
          li.appendChild(q);
        }
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      holder.appendChild(wrap);
    });
  }

  function loadSigners() {
    if (demo) { renderSigners(demoSigners); return; }
    fetch(endpoint + (endpoint.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) renderSigners(res.signatures || [], res.count);
      })
      .catch(function () { /* list stays in its empty state */ });
  }

  loadSigners();
})();
