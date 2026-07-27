/**
 * review.js — hidden proof-reading mode ("rættlestrarstøða").
 *
 * A reviewer (hi Eiríkur!) activates this by visiting any page with #review
 * (or pressing Alt+Shift+R). It is fetched on demand by main.js, so ordinary
 * visitors never download it — same pattern as the hero game easter egg.
 *
 * What it does:
 *   · Select text → suggest a replacement and/or leave a comment.
 *   · "Element mode" → click any element to comment on it as a whole.
 *   · Notes persist in localStorage across pages until exported.
 *   · Export as JSON to the clipboard, or as a prefilled GitHub issue on the
 *     public repo — each note carries a CSS path to the exact tag, the
 *     original text, the suggested replacement and the comment, ready to be
 *     handed to a human or an AI agent to apply.
 *
 * Everything stays in the browser: no backend, no network calls (the GitHub
 * export just opens github.com's normal "new issue" page, prefilled).
 */
(function () {
  "use strict";
  if (window.GJReview) return;

  var STORE_KEY = "gjreview:notes";
  var ACTIVE_KEY = "gjreview:active";
  var REPO = "GameJamForoya/landing-page";
  // Keep prefilled-issue URLs comfortably under GitHub's ~8k URL limit.
  var MAX_ISSUE_URL = 6000;
  var CONTEXT_CHARS = 30; // prefix/suffix stored around a text selection

  var notes = loadNotes(); // { "<pathname>": [note, …] }
  var pageKey = location.pathname.replace(/index\.html$/, "");
  var pending = null;      // note being composed in the form
  var pendingRange = null; // live Range for the pending text note
  var elementMode = false;
  var hoverTarget = null;
  var ui = {};             // bar, bubble, form, panel, toast…

  /* ================= Storage ================= */

  function loadNotes() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveNotes() {
    localStorage.setItem(STORE_KEY, JSON.stringify(notes));
    updateCount();
  }

  function pageNotes() {
    if (!notes[pageKey]) notes[pageKey] = [];
    return notes[pageKey];
  }

  function totalCount() {
    var n = 0;
    for (var key in notes) n += notes[key].length;
    return n;
  }

  /* ================= DOM helpers ================= */

  function isReviewUI(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    return !!(el && el.closest(".review-ui"));
  }

  /**
   * Build a CSS path (body > … > tag:nth-of-type(n)) for an element, so the
   * exported note pinpoints the exact tag in the built HTML. Stops early at
   * an #id when one exists. Our own <mark> wrappers are skipped so paths stay
   * valid after highlights are added.
   */
  function cssPath(el) {
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node.tagName !== "BODY") {
      if (node.classList.contains("review-mark")) {
        node = node.parentElement;
        continue;
      }
      if (node.id) {
        parts.unshift("#" + node.id);
        return parts.join(" > ");
      }
      var idx = 1;
      var sib = node;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === node.tagName && !sib.classList.contains("review-mark")) idx++;
      }
      parts.unshift(node.tagName.toLowerCase() + ":nth-of-type(" + idx + ")");
      node = node.parentElement;
    }
    parts.unshift("body");
    return parts.join(" > ");
  }

  /** Wrap every text node the range touches in <mark class="review-mark">. */
  function wrapRange(range, id) {
    var root = range.commonAncestorContainer;
    if (root.nodeType !== 1) root = root.parentNode;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node)) nodes.push(node);
    }
    nodes.forEach(function (textNode) {
      var start = textNode === range.startContainer ? range.startOffset : 0;
      var end =
        textNode === range.endContainer ? range.endOffset : textNode.nodeValue.length;
      if (start >= end) return;
      var target = textNode;
      if (start > 0) target = target.splitText(start);
      if (end - start < target.nodeValue.length) target.splitText(end - start);
      var mark = document.createElement("mark");
      mark.className = "review-mark";
      mark.setAttribute("data-review-id", id);
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
    });
  }

  /**
   * Re-locate stored text inside an element: find the occurrence of `exact`
   * closest to the remembered character offset and map it back onto the text
   * nodes as a Range. Returns null if the text is gone (content changed).
   */
  function findRange(el, exact, approxOffset) {
    var text = el.textContent;
    var starts = [];
    var i = text.indexOf(exact);
    while (i !== -1) {
      starts.push(i);
      i = text.indexOf(exact, i + 1);
    }
    if (!starts.length) return null;
    var best = starts[0];
    starts.forEach(function (s) {
      if (Math.abs(s - approxOffset) < Math.abs(best - approxOffset)) best = s;
    });
    var end = best + exact.length;
    var range = document.createRange();
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var pos = 0;
    var node;
    var startSet = false;
    while ((node = walker.nextNode())) {
      var next = pos + node.nodeValue.length;
      if (!startSet && best < next) {
        range.setStart(node, best - pos);
        startSet = true;
      }
      if (startSet && end <= next) {
        range.setEnd(node, end - pos);
        return range;
      }
      pos = next;
    }
    return null;
  }

  function removeHighlight(id) {
    var marks = document.querySelectorAll('.review-mark[data-review-id="' + id + '"]');
    for (var m = 0; m < marks.length; m++) {
      var mark = marks[m];
      var parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
    var flagged = document.querySelectorAll(
      '.review-element-flag[data-review-id="' + id + '"]'
    );
    for (var f = 0; f < flagged.length; f++) {
      flagged[f].classList.remove("review-element-flag");
      flagged[f].removeAttribute("data-review-id");
    }
  }

  /** Paint a stored note back onto the current page. */
  function renderNote(note) {
    var el;
    try {
      el = document.querySelector(note.selector);
    } catch (e) {
      el = null;
    }
    if (note.type === "element") {
      if (el) {
        el.classList.add("review-element-flag");
        el.setAttribute("data-review-id", note.id);
      }
      return;
    }
    var range = el && findRange(el, note.original, note.offset || 0);
    if (range) wrapRange(range, note.id);
  }

  /* ================= UI construction ================= */

  function makeButton(label, title, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  function buildToolbar() {
    var bar = document.createElement("div");
    bar.className = "review-bar review-ui";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Review mode");

    var row = document.createElement("div");
    row.className = "review-bar__row";
    bar.appendChild(row);

    var title = document.createElement("span");
    title.className = "review-bar__title";
    title.textContent = "Review mode";
    row.appendChild(title);

    ui.count = document.createElement("span");
    ui.count.className = "review-bar__count";
    ui.count.title = "Saved notes (all pages)";
    row.appendChild(ui.count);

    ui.elementToggle = makeButton(
      "Add Note",
      "Click a whole element to comment on it (instead of selecting text)",
      toggleElementMode
    );
    ui.elementToggle.setAttribute("aria-pressed", "false");
    row.appendChild(ui.elementToggle);

    ui.panelToggle = makeButton("Notes", "Show / hide saved notes", togglePanel);
    ui.panelToggle.setAttribute("aria-expanded", "false");
    row.appendChild(ui.panelToggle);

    var saveWrap = document.createElement("div");
    saveWrap.className = "review-save";
    ui.saveToggle = makeButton("Save ▾", "Export the review", toggleSaveMenu);
    ui.saveToggle.setAttribute("aria-haspopup", "true");
    ui.saveToggle.setAttribute("aria-expanded", "false");
    saveWrap.appendChild(ui.saveToggle);
    ui.saveWrap = saveWrap;
    row.appendChild(saveWrap);

    var exit = makeButton("Exit", "Leave review mode (notes are kept)", exitReview);
    exit.className += " review-bar__exit";
    row.appendChild(exit);

    ui.hint = document.createElement("p");
    ui.hint.className = "review-bar__hint";
    ui.hint.textContent =
      "Highlight some text to comment, or press “Add Note” to pick a whole element.";
    bar.appendChild(ui.hint);

    document.body.appendChild(bar);
    ui.bar = bar;
    updateCount();
  }

  function updateCount() {
    if (ui.count) ui.count.textContent = String(totalCount());
  }

  /** Keep popups (form / notes panel) clear of the toolbar, whatever its height. */
  function placeAboveBar(el) {
    var barHeight = ui.bar ? ui.bar.getBoundingClientRect().height : 0;
    el.style.bottom = Math.round(barHeight + 16 + 10) + "px"; // toolbar offset + gap
  }

  /* ---- Save dropdown ---- */

  function closeSaveMenu() {
    if (ui.saveMenu) {
      ui.saveMenu.remove();
      ui.saveMenu = null;
      ui.saveToggle.setAttribute("aria-expanded", "false");
      ui.saveToggle.textContent = "Save ▾";
    }
  }

  function toggleSaveMenu() {
    if (ui.saveMenu) {
      closeSaveMenu();
      return;
    }
    var menu = document.createElement("div");
    menu.className = "review-save__menu";
    menu.setAttribute("role", "menu");

    var copy = makeButton(
      "Copy JSON",
      "Copy the full review to the clipboard as JSON",
      function () {
        closeSaveMenu();
        copyExport();
      }
    );
    copy.className += " review-save__item";
    copy.setAttribute("role", "menuitem");
    menu.appendChild(copy);

    var issue = makeButton(
      "Post as GitHub Issue",
      "Open a prefilled GitHub issue with the review",
      function () {
        closeSaveMenu();
        openIssue();
      }
    );
    issue.className += " review-save__item";
    issue.setAttribute("role", "menuitem");
    menu.appendChild(issue);

    ui.saveWrap.appendChild(menu);
    ui.saveMenu = menu;
    ui.saveToggle.setAttribute("aria-expanded", "true");
    ui.saveToggle.textContent = "Save ✕";
    copy.focus();
  }

  function toast(message) {
    if (ui.toast) ui.toast.remove();
    var t = document.createElement("div");
    t.className = "review-toast review-ui";
    t.setAttribute("role", "status");
    t.textContent = message;
    document.body.appendChild(t);
    ui.toast = t;
    setTimeout(function () {
      if (ui.toast === t) t.classList.add("review-toast--hide");
    }, 3000);
    setTimeout(function () {
      if (ui.toast === t) {
        t.remove();
        ui.toast = null;
      }
    }, 3600);
  }

  /* ---- Selection bubble ---- */

  function hideBubble() {
    if (ui.bubble) {
      ui.bubble.remove();
      ui.bubble = null;
    }
  }

  function showBubble(rect) {
    hideBubble();
    var bubble = document.createElement("div");
    bubble.className = "review-bubble review-ui";
    bubble.appendChild(makeButton("💬 Comment", "Comment on the selected text", captureSelection));
    bubble.style.left = rect.left + rect.width / 2 + window.scrollX + "px";
    bubble.style.top = Math.max(0, rect.top + window.scrollY - 44) + "px";
    document.body.appendChild(bubble);
    ui.bubble = bubble;
  }

  function onSelectionEnd() {
    if (ui.form || elementMode) return;
    // Let the click land first (e.g. on the bubble itself) before re-reading.
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        hideBubble();
        return;
      }
      var range = sel.getRangeAt(0);
      if (isReviewUI(range.commonAncestorContainer)) return;
      if (!String(sel).trim()) return;
      showBubble(range.getBoundingClientRect());
    }, 10);
  }

  /** Snapshot the current selection into a pending text note and open the form. */
  function captureSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var range = sel.getRangeAt(0).cloneRange();
    var container = range.commonAncestorContainer;
    var el = container.nodeType === 1 ? container : container.parentElement;

    // Character offset of the selection inside the element, for re-anchoring.
    var pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    var preText = pre.toString();

    var post = range.cloneRange();
    post.selectNodeContents(el);
    post.setStart(range.endContainer, range.endOffset);
    var postText = post.toString();

    pending = {
      type: "text",
      selector: cssPath(el),
      original: range.toString(),
      offset: preText.length,
      contextBefore: preText.slice(-CONTEXT_CHARS),
      contextAfter: postText.slice(0, CONTEXT_CHARS)
    };
    pendingRange = range;
    hideBubble();
    sel.removeAllRanges();
    openForm();
  }

  /* ---- Element mode ---- */

  function toggleElementMode() {
    elementMode = !elementMode;
    ui.elementToggle.setAttribute("aria-pressed", String(elementMode));
    document.body.classList.toggle("review-element-mode", elementMode);
    clearHover();
    hideBubble();
    if (ui.hint) {
      ui.hint.textContent = elementMode
        ? "Click any element on the page to add a note to it. Press “Add Note” again (or Esc) to go back to text highlighting."
        : "Highlight some text to comment, or press “Add Note” to pick a whole element.";
    }
    if (elementMode) toast("Click any element to comment on it.");
  }

  function clearHover() {
    if (hoverTarget) {
      hoverTarget.classList.remove("review-hover-target");
      hoverTarget = null;
    }
  }

  function onHover(event) {
    if (!elementMode || ui.form) return;
    var el = event.target;
    if (isReviewUI(el) || el === document.body || el === document.documentElement) {
      clearHover();
      return;
    }
    if (el !== hoverTarget) {
      clearHover();
      hoverTarget = el;
      el.classList.add("review-hover-target");
    }
  }

  function onElementClick(event) {
    if (!elementMode || ui.form) return;
    var el = event.target;
    if (isReviewUI(el) || el === document.body || el === document.documentElement) return;
    event.preventDefault();
    event.stopPropagation();
    clearHover();
    var text = el.textContent.replace(/\s+/g, " ").trim();
    pending = {
      type: "element",
      selector: cssPath(el),
      original: text.length > 200 ? text.slice(0, 200) + "…" : text,
      element: el
    };
    pendingRange = null;
    openForm();
  }

  /* ---- Note form ---- */

  function openForm() {
    removeFormEl();
    closePanel();

    var form = document.createElement("form");
    form.className = "review-form review-ui";
    form.setAttribute("role", "dialog");
    form.setAttribute("aria-label", "Add review note");

    var heading = document.createElement("h2");
    heading.className = "review-form__heading";
    heading.textContent =
      pending.type === "text" ? "Note on selected text" : "Note on element <" + tagOf(pending) + ">";
    form.appendChild(heading);

    var context = document.createElement("p");
    context.className = "review-form__context";
    context.textContent = "“" + pending.original + "”";
    form.appendChild(context);

    // Text notes suggest a replacement; element notes are just a comment.
    var replacement = null;
    if (pending.type === "text") {
      replacement = document.createElement("textarea");
      replacement.className = "review-form__input";
      replacement.value = pending.original;
      form.appendChild(labelled("Text should change to", replacement));
    }

    var comment = document.createElement("textarea");
    comment.className = "review-form__input";
    comment.placeholder =
      pending.type === "text"
        ? "Anything else worth knowing?"
        : "What should be looked at here?";
    form.appendChild(
      labelled(pending.type === "text" ? "Comment (optional)" : "Comment", comment)
    );

    var actions = document.createElement("div");
    actions.className = "review-form__actions";
    var cancel = makeButton("Cancel", null, function () {
      closeForm();
    });
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "review-form__save";
    save.textContent = "Save note";
    actions.appendChild(cancel);
    actions.appendChild(save);
    form.appendChild(actions);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var replacementValue = replacement ? replacement.value.trim() : "";
      var unchanged = !replacement || replacementValue === pending.original.trim();
      saveNote(unchanged ? null : replacementValue, comment.value.trim());
    });

    document.body.appendChild(form);
    placeAboveBar(form);
    ui.form = form;
    if (replacement) {
      replacement.focus();
      replacement.select();
    } else {
      comment.focus();
    }
  }

  function tagOf(note) {
    var last = note.selector.split(">").pop() || "";
    return last.replace(/:nth-of-type\(\d+\)/, "").trim() || "element";
  }

  function labelled(text, input) {
    var label = document.createElement("label");
    label.className = "review-form__label";
    var span = document.createElement("span");
    span.textContent = text;
    label.appendChild(span);
    label.appendChild(input);
    return label;
  }

  function removeFormEl() {
    if (ui.form) {
      ui.form.remove();
      ui.form = null;
    }
  }

  function closeForm() {
    removeFormEl();
    pending = null;
    pendingRange = null;
  }

  function saveNote(replacement, comment) {
    if (!replacement && !comment) {
      toast("Nothing to save — suggest a change or write a comment.");
      return;
    }
    var note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      created: new Date().toISOString(),
      type: pending.type,
      selector: pending.selector,
      original: pending.original,
      offset: pending.offset,
      contextBefore: pending.contextBefore,
      contextAfter: pending.contextAfter,
      replacement: replacement || null,
      comment: comment || null
    };
    pageNotes().push(note);

    if (pending.type === "text" && pendingRange) {
      wrapRange(pendingRange, note.id);
    } else if (pending.type === "element" && pending.element) {
      pending.element.classList.add("review-element-flag");
      pending.element.setAttribute("data-review-id", note.id);
    }

    closeForm();
    saveNotes();
    toast("Note saved (" + totalCount() + " in total).");
  }

  /* ---- Notes panel ---- */

  function closePanel() {
    if (ui.panel) {
      ui.panel.remove();
      ui.panel = null;
    }
    if (ui.panelToggle) {
      ui.panelToggle.setAttribute("aria-expanded", "false");
      ui.panelToggle.textContent = "Notes";
    }
  }

  function togglePanel() {
    if (ui.panel) {
      closePanel();
      return;
    }
    closeForm();
    var panel = document.createElement("div");
    panel.className = "review-panel review-ui";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Saved review notes");

    var heading = document.createElement("h2");
    heading.className = "review-panel__heading";
    heading.textContent = "Saved notes";
    panel.appendChild(heading);

    var any = false;
    Object.keys(notes)
      .sort()
      .forEach(function (key) {
        if (!notes[key].length) return;
        any = true;
        var pageHeading = document.createElement("p");
        pageHeading.className = "review-panel__page";
        pageHeading.textContent = key + (key === pageKey ? " (this page)" : "");
        panel.appendChild(pageHeading);

        var list = document.createElement("ul");
        list.className = "review-panel__list";
        notes[key].forEach(function (note) {
          list.appendChild(panelItem(key, note));
        });
        panel.appendChild(list);
      });

    if (!any) {
      var empty = document.createElement("p");
      empty.className = "review-panel__empty";
      empty.textContent = "No notes yet — select some text to get started.";
      panel.appendChild(empty);
    }

    document.body.appendChild(panel);
    placeAboveBar(panel);
    ui.panel = panel;
    ui.panelToggle.setAttribute("aria-expanded", "true");
    ui.panelToggle.textContent = "Notes ✕";
  }

  function panelItem(key, note) {
    var item = document.createElement("li");
    item.className = "review-panel__item";

    var body = document.createElement("div");
    body.className = "review-panel__body";

    var quote = document.createElement("div");
    quote.className = "review-panel__quote";
    quote.textContent = "“" + truncate(note.original, 90) + "”";
    body.appendChild(quote);

    if (note.replacement) {
      var change = document.createElement("div");
      change.className = "review-panel__change";
      change.textContent = "→ " + truncate(note.replacement, 90);
      body.appendChild(change);
    }
    if (note.comment) {
      var comment = document.createElement("div");
      comment.textContent = truncate(note.comment, 120);
      body.appendChild(comment);
    }
    item.appendChild(body);

    var del = makeButton("✕", "Delete this note", function () {
      notes[key] = notes[key].filter(function (n) {
        return n.id !== note.id;
      });
      if (!notes[key].length) delete notes[key];
      removeHighlight(note.id);
      saveNotes();
      item.remove();
    });
    del.className += " review-panel__delete";
    item.appendChild(del);

    return item;
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  /* ================= Export ================= */

  function buildExport() {
    var pages = Object.keys(notes)
      .sort()
      .filter(function (key) {
        return notes[key].length;
      })
      .map(function (key) {
        return {
          page: key,
          notes: notes[key].map(function (note) {
            return {
              type: note.type,
              htmlPath: note.selector,
              original: note.original,
              changeTo: note.replacement,
              comment: note.comment,
              contextBefore: note.contextBefore || null,
              contextAfter: note.contextAfter || null,
              created: note.created
            };
          })
        };
      });
    return {
      site: location.origin,
      exported: new Date().toISOString(),
      totalNotes: totalCount(),
      pages: pages
    };
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        legacyCopy(text, done);
      });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* nothing more we can do */
    }
    area.remove();
    done();
  }

  function copyExport() {
    if (!totalCount()) {
      toast("No notes to copy yet.");
      return;
    }
    copyText(JSON.stringify(buildExport(), null, 2), function () {
      toast("Review copied to clipboard as JSON (" + totalCount() + " notes).");
    });
  }

  function issueMarkdown() {
    var data = buildExport();
    var lines = ["## Site review — " + data.totalNotes + " notes", ""];
    data.pages.forEach(function (page) {
      lines.push("### `" + page.page + "`", "");
      page.notes.forEach(function (note, i) {
        lines.push(i + 1 + ". **“" + note.original + "”**");
        if (note.changeTo) lines.push("   - Change to: **“" + note.changeTo + "”**");
        if (note.comment) lines.push("   - Comment: " + note.comment);
        lines.push("   - Where: `" + note.htmlPath + "`");
      });
      lines.push("");
    });
    lines.push(
      "<details><summary>Machine-readable JSON</summary>",
      "",
      "```json",
      JSON.stringify(data, null, 2),
      "```",
      "",
      "</details>"
    );
    return lines.join("\n");
  }

  function openIssue() {
    if (!totalCount()) {
      toast("No notes to send yet.");
      return;
    }
    var title = "Site review " + new Date().toISOString().slice(0, 10) +
      " (" + totalCount() + " notes)";
    var body = issueMarkdown();
    var url =
      "https://github.com/" + REPO + "/issues/new?title=" +
      encodeURIComponent(title) + "&body=" + encodeURIComponent(body);

    if (url.length > MAX_ISSUE_URL) {
      // Too big to prefill via URL: put the body on the clipboard instead and
      // open a blank issue for pasting.
      copyText(body, function () {
        toast("Review copied to clipboard — paste it into the issue that just opened.");
        window.open(
          "https://github.com/" + REPO + "/issues/new?title=" + encodeURIComponent(title),
          "_blank",
          "noopener"
        );
      });
    } else {
      window.open(url, "_blank", "noopener");
    }
  }

  /* ================= Lifecycle ================= */

  function exitReview() {
    localStorage.removeItem(ACTIVE_KEY);
    // Reload without the #review trigger so the mode actually stays off.
    if (location.hash === "#review") {
      history.replaceState(null, "", location.pathname + location.search);
    }
    location.reload();
  }

  function onKeydown(event) {
    if (event.key !== "Escape") return;
    if (ui.saveMenu) {
      closeSaveMenu();
      ui.saveToggle.focus();
    } else if (ui.form) {
      closeForm();
    } else if (ui.panel) {
      closePanel();
    } else if (elementMode) {
      toggleElementMode();
    }
    hideBubble();
  }

  function onDocumentClick(event) {
    if (ui.saveMenu && !event.target.closest(".review-save")) closeSaveMenu();
  }

  function init() {
    localStorage.setItem(ACTIVE_KEY, "1");
    buildToolbar();
    pageNotes().forEach(renderNote);

    document.addEventListener("mouseup", onSelectionEnd);
    document.addEventListener("keyup", onSelectionEnd); // keyboard selection
    document.addEventListener("mouseover", onHover);
    document.addEventListener("click", onElementClick, true);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeydown);

    toast("Review mode on. Select text, or use Element mode, to leave notes.");
  }

  window.GJReview = { start: init };
  init();
})();
