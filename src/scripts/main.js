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
})();
