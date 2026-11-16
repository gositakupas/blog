/* app.js — perilaku kecil website statis (dibuat otomatis oleh Publish.gs) */
(function () {
  var B = window.BLOG || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg, isErr) {
    var t = $("toast"); if (!t) return;
    t.textContent = msg; t.className = "show" + (isErr ? " err" : "");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ""; }, isErr ? 4200 : 2600);
  }

  /* Pencarian di layar kecil */
  var tg = $("searchToggle");
  if (tg) tg.addEventListener("click", function () {
    var b = $("searchMobile"); b.classList.toggle("open");
    if (b.classList.contains("open")) $("searchInputM").focus();
  });

  /* Salin tautan */
  function copyText(t) {
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (_) { }
      ta.remove();
      if (ok) toast("Tautan disalin"); else { try { window.prompt("Salin tautan ini:", t); } catch (_) { } }
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { toast("Tautan disalin"); }, fallback);
    else fallback();
  }

  /* Donasi QRIS */
  var lastFocus = null;
  function openDonasi() {
    var m = $("donasiModal");
    if (!m) { if (B.donasi) window.open(B.donasi, "_blank", "noopener"); return; }
    var img = m.querySelector("img[data-src]");
    if (img && !img.getAttribute("src")) img.src = img.getAttribute("data-src");
    lastFocus = document.activeElement;
    m.hidden = false; document.body.classList.add("modal-open");
    requestAnimationFrame(function () { m.classList.add("show"); });
    m.querySelector("[data-close]").focus();
  }
  function closeDonasi() {
    var m = $("donasiModal"); if (!m || m.hidden) return;
    m.classList.remove("show"); document.body.classList.remove("modal-open");
    setTimeout(function () { m.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target : null; if (!el) return;
    var c = el.closest("[data-copy]"); if (c) { copyText(c.getAttribute("data-copy")); return; }
    var d = el.closest("[data-donasi]"); if (d) { e.preventDefault(); openDonasi(); return; }
    var m = $("donasiModal");
    if (m && !m.hidden && (el === m || el.closest("[data-close]"))) { closeDonasi(); return; }
    var a = el.closest("a[data-anchor]");
    if (a) {
      var t = document.getElementById(a.getAttribute("data-anchor")); if (!t) return;
      e.preventDefault();
      try { t.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (_) { t.scrollIntoView(); }
      try { history.replaceState(null, "", "#" + t.id); } catch (_) { }
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDonasi(); });

  /* Gambar Google Drive: bila gagal, coba alamat cadangan; bila tetap gagal, sembunyikan */
  function driveIdOf(u) {
    var m = String(u || "").match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([-\w]{20,})/i) || String(u || "").match(/[?&]id=([-\w]{20,})/);
    return m ? m[1] : "";
  }
  document.addEventListener("error", function (e) {
    var img = e.target; if (!img || img.tagName !== "IMG") return;
    var src = img.getAttribute("src") || "", id = driveIdOf(src);
    if (id && !img.getAttribute("data-fb")) {
      img.setAttribute("data-fb", "1");
      var w = (src.match(/=w(\d+)/) || [])[1] || 1600;
      img.src = "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + w; return;
    }
    if (img.hasAttribute("data-hide-broken")) { img.remove(); return; }
    var box = img.closest ? img.closest("[data-img-box]") : null; if (box) box.remove();
  }, true);

  /* Hitung "dibaca" di Google Sheets (sekali per sesi) */
  if (B.slug && B.exec) {
    try {
      var k = "dibaca_" + B.slug;
      if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); new Image().src = B.exec + "?hit=" + encodeURIComponent(B.slug); }
    } catch (_) { }
  }

  /* Halaman pencarian */
  var app = $("searchApp");
  if (app) {
    var q = ""; try { q = (new URLSearchParams(location.search).get("q") || "").trim(); } catch (_) { }
    ["searchInput", "searchInputM"].forEach(function (id) { if ($(id)) $(id).value = q; });
    if (q) {
      document.title = "Hasil pencarian \u201c" + q + "\u201d \u00b7 " + document.title.split(" \u00b7 ").pop();
      $("searchTitle").textContent = "Hasil pencarian \u201c" + q + "\u201d";
      app.innerHTML = "<div class=\"empty\"><span class=\"spin\"></span></div>";
      fetch((B.root || "") + "/search.json").then(function (r) { return r.json(); }).then(function (list) {
        var terms = q.toLowerCase().split(/\s+/).filter(String);
        var hits = list.filter(function (p) {
          var hay = (p.j + " " + p.r + " " + p.k + " " + p.t.join(" ") + " " + p.x).toLowerCase();
          return terms.every(function (t) { return hay.indexOf(t) > -1; });
        });
        $("countInfo").textContent = hits.length + " tulisan";
        if (!hits.length) {
          app.innerHTML = "<div class=\"empty\"><h2>Tidak ditemukan</h2><p>Coba kata kunci lain atau lihat semua tulisan.</p><a class=\"btn btn-primary\" href=\"" + esc((B.root || "") + "/") + "\">Lihat semua tulisan</a></div>";
          return;
        }
        app.innerHTML = "<div class=\"grid\">" + hits.map(function (p) {
          var letter = esc((p.k || p.j || "B").trim().charAt(0).toUpperCase());
          return "<article class=\"card\"><a class=\"cover\" href=\"" + esc(p.u) + "\" tabindex=\"-1\" aria-hidden=\"true\"><div class=\"ph\"><span>" + letter + "</span></div>" +
            (p.g ? "<img src=\"" + esc(p.g) + "\" alt=\"\" loading=\"lazy\" decoding=\"async\" data-hide-broken>" : "") + "</a>" +
            "<div class=\"card-body\">" + (p.k ? "<a class=\"eyebrow\" href=\"" + esc(p.ku) + "\">" + esc(p.k) + "</a>" : "") +
            "<h2 class=\"card-title\"><a href=\"" + esc(p.u) + "\">" + esc(p.j) + "</a></h2>" +
            (p.r ? "<p class=\"card-excerpt\">" + esc(p.r) + "</p>" : "") +
            "<div class=\"meta\"><span>" + esc(p.tg) + "</span><span class=\"dot\">\u2022</span><span>" + Number(p.m || 1) + " menit baca</span></div></div></article>";
        }).join("") + "</div>";
      }).catch(function () {
        app.innerHTML = "<div class=\"empty\"><h2>Gagal memuat</h2><p>Periksa koneksi internet lalu muat ulang halaman.</p></div>";
      });
    }
  }
})();
