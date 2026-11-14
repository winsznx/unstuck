"use client";

/** First stop for keyboard users: straight to the page's <main>, whatever id the page gave it. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const main = document.querySelector("main");
        if (!main) return;
        event.preventDefault();
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-action focus:px-4 focus:py-2.5 focus:text-small focus:font-semibold focus:text-on-action"
    >
      Skip to content
    </a>
  );
}
