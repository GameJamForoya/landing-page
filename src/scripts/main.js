/**
 * main.js — progressive enhancement only.
 *
 * The site is fully readable and navigable without this file. Everything here
 * layers interactivity on top of already-rendered static HTML, matching the
 * "JS never renders core content" rule from the gj.fo architecture decision.
 */
(function () {
  "use strict";

  /* ---- Mobile navigation toggle ---- */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.querySelector(".nav__menu");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var isOpen = menu.classList.toggle("nav__menu--open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close the menu when a link is chosen (mobile).
    menu.addEventListener("click", function (event) {
      if (event.target.closest(".nav__link")) {
        menu.classList.remove("nav__menu--open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // Close on Escape for keyboard users.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("nav__menu--open")) {
        menu.classList.remove("nav__menu--open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---- Video facade ----
     The poster is a normal link to YouTube (works without JS). Here we upgrade
     it to play inline using the privacy-friendly youtube-nocookie player, which
     is only requested once the visitor clicks — nothing loads on page view. */
  var videoTrigger = document.querySelector(".video__button");

  if (videoTrigger) {
    videoTrigger.addEventListener("click", function (event) {
      event.preventDefault();

      var id = videoTrigger.getAttribute("data-video-id");
      if (!id) return;

      var iframe = document.createElement("iframe");
      iframe.className = "video__iframe";
      iframe.src =
        "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = videoTrigger.getAttribute("aria-label") || "";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;

      var frame = videoTrigger.closest(".video__frame");
      frame.innerHTML = "";
      frame.appendChild(iframe);
      iframe.focus();
    });
  }

  /* ---- Hero easter egg ----
     Pressing "Spæl" or the logo starts a small boss fight. The game code is
     fetched only on that first press, so visitors who never find it never
     download it. Silently does nothing if the script fails to load. */
  var gameTriggers = document.querySelectorAll("[data-game-trigger]");
  var gameLoading = false;

  function loadGame(src, done) {
    if (window.GJGame) { done(); return; }
    if (gameLoading) return;
    gameLoading = true;
    var s = document.createElement("script");
    // Path is base-aware (rendered through Eleventy's url filter); falls back
    // to the root-absolute path if the attribute is somehow missing.
    s.src = src || "/scripts/game.js";
    s.onload = function () { gameLoading = false; if (window.GJGame) done(); };
    s.onerror = function () { gameLoading = false; };
    document.head.appendChild(s);
  }

  function launchGame(event) {
    var origin = event.currentTarget;
    event.preventDefault();
    var heroEl = document.querySelector(".hero");
    var gameSrc = heroEl && heroEl.getAttribute("data-game-src");
    loadGame(gameSrc, function () {
      window.GJGame.start({
        hero: heroEl,
        shipSrc: heroEl && heroEl.getAttribute("data-ship-src"),
        returnFocusTo: origin
      });
    });
  }

  for (var g = 0; g < gameTriggers.length; g++) {
    gameTriggers[g].addEventListener("click", launchGame);
    gameTriggers[g].addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") launchGame(event);
    });
  }

  /* ---- Hidden review mode ----
     For proof-readers: visiting any page with #review (or pressing
     Alt+Shift+R) fetches scripts/review.js, which overlays annotation tools
     (highlight text / comment on elements, export as JSON or GitHub issue).
     Once activated it sticks across pages via localStorage until the reviewer
     exits. Ordinary visitors never load a byte of it. */
  var scriptBase = (
    (document.currentScript && document.currentScript.src) || "/scripts/main.js"
  ).replace(/main\.js.*$/, "");
  var reviewLoading = false;

  function loadReview() {
    if (window.GJReview || reviewLoading) return;
    reviewLoading = true;
    var s = document.createElement("script");
    s.src = scriptBase + "review.js";
    s.onerror = function () { reviewLoading = false; };
    document.head.appendChild(s);
  }

  var reviewWanted =
    location.hash === "#review" ||
    /[?&]review(=|&|$)/.test(location.search) ||
    localStorage.getItem("gjreview:active") === "1";

  if (reviewWanted) loadReview();

  window.addEventListener("hashchange", function () {
    if (location.hash === "#review") loadReview();
  });

  document.addEventListener("keydown", function (event) {
    if (event.altKey && event.shiftKey && event.code === "KeyR") loadReview();
  });
})();
