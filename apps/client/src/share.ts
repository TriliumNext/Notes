// Type declarations for external libraries
declare const hljs: any;

// Highlight.js plugins for Trilium API and jQuery syntax
const highlightTriliumApi = {
  "after:highlight": (result: any) => {
    result.value = result.value.replaceAll(/([^A-Za-z0-9])api\./g, function(match: string, prefix: string) {
      return `${prefix}<span class="hljs-variable language_">api</span>.`;
    });
  }
};

const highlightJQuery = {
  "after:highlight": (result: any) => {
    result.value = result.value.replaceAll(/([^A-Za-z0-9.])\$\((.+)\)/g, function(match: string, prefix: string, variable: string) {
      return `${prefix}<span class="hljs-variable language_">$(</span>${variable}<span class="hljs-variable language_">)</span>`;
    });
  }
};

function addHljs() {
  const codeblocks = document.querySelectorAll(`.ck-content pre`);
  if (!codeblocks.length) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  // api/notes/cVaK9ZJwx5Hs/download
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css";
  document.head.append(link);

  const script = document.createElement("script");
  // api/notes/6PVElIem02b5/download
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
  script.addEventListener("load", () => {
    if (typeof hljs === 'undefined') return;

    const allLanguages = hljs.listLanguages().map((l: string) => {
      const definition = hljs.getLanguage(l);
      if (definition?.aliases) return [l, ...definition.aliases];
      return [l];
    });

    for (const langs of allLanguages) {
      const lang = langs[0];
      for (const l of langs) {
        hljs.registerAliases(`text-x-${l}`, { languageName: lang });
      }
    }

    hljs.registerAliases(["application-javascript-env-frontend", "application-javascript-env-backend"], { languageName: "javascript" });
    hljs.addPlugin(highlightTriliumApi);
    hljs.addPlugin(highlightJQuery);
    hljs.highlightAll();
  });
  document.head.append(script);
}

// Table of Contents functionality
function setupToC() {
  const toc = document.getElementById("toc");
  if (!toc) return;

  const content = document.getElementById("content");
  if (!content) return;

  const sections = content.querySelectorAll("h2, h3, h4, h5, h6") as NodeListOf<HTMLElement>;
  const links = toc.querySelectorAll("a");

  for (const link of links) {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();
      target.scrollIntoView({ behavior: "smooth" });
    });
  }

  function changeLinkState() {
    let index = sections.length;
    while (--index && window.scrollY + 50 < sections[index].offsetTop) {
      // Find the current section
    }
    links.forEach((link) => link.classList.remove("active"));
    if (links[index]) {
      links[index].classList.add("active");
    }
  }

  changeLinkState();
  window.addEventListener("scroll", changeLinkState);
}

// Collapsible menu expanders
function setupExpanders() {
  const expanders = Array.from(document.querySelectorAll("#menu .submenu-item"));

  for (const ex of expanders) {
    ex.addEventListener("click", (e) => {
      const target = e.target as Element;
      if (!target || target.closest(".submenu-item,.item") !== ex) return;

      e.preventDefault();
      e.stopPropagation();

      const ul = ex.querySelector("ul") as HTMLElement;
      if (!ul) return;

      ul.style.height = `${ul.scrollHeight}px`;
      setTimeout(() => ex.classList.toggle("expanded"), 1);
      setTimeout(() => ul.style.height = ``, 200);
    });
  }
}

// Helper function to find parent elements matching a selector
function parents(el: Element | null, selector: string): Element[] {
  const result: Element[] = [];
  for (let p = el && el.parentElement; p; p = p.parentElement) {
    if (p.matches(selector)) {
      result.push(p);
    }
  }
  return result;
}

// Mobile menu functionality
function setupMobileMenu() {
  function toggleMobileMenu(event: Event) {
    event.stopPropagation();
    const isOpen = document.body.classList.contains("menu-open");
    if (isOpen) {
      document.body.classList.remove("menu-open");
    } else {
      document.body.classList.add("menu-open");
    }
  }

  const showMenuButton = document.getElementById("show-menu-button");
  showMenuButton?.addEventListener("click", toggleMobileMenu);

  window.addEventListener("click", (e) => {
    const isOpen = document.body.classList.contains("menu-open");
    if (!isOpen) return;

    if (parents(e.target as Element, "#left-pane").length) return;

    toggleMobileMenu(e);
  });
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(executor: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function(...args: Parameters<T>) {
    const callback = () => {
      timeout = null;
      executor(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
}

// HTML parsing utility
function parseHTML(html: string, fragment = false): HTMLElement | DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  const node = template.content.cloneNode(true) as DocumentFragment;

  if (fragment) return node;

  return node.childNodes.length > 1
    ? node.firstElementChild as HTMLElement
    : node.childNodes[0] as HTMLElement;
}

// Search functionality
function buildResultItem(result: any): string {
  return `<a class="search-result-item" href="./${result.id}">
    <div class="search-result-title">${result.title}</div>
    <div class="search-result-note">${result.path || "Home"}</div>
  </a>`;
}

function setupSearch() {
  const searchInput = document.querySelector(".search-input") as HTMLInputElement;
  if (!searchInput) return;

  searchInput.addEventListener("keyup", debounce(async () => {
    const ancestor = document.body.dataset.ancestorNoteId;
    const query = searchInput.value;
    if (query.length < 3) return;

    const resp = await fetch(`api/notes?search=${query}&ancestorNoteId=${ancestor}`);
    const json = await resp.json();
    const results = json.results.slice(0, 5);

    const lines = [`<div class="search-results">`];
    for (const result of results) {
      lines.push(buildResultItem(result));
    }
    lines.push("</div>");

    const container = parseHTML(lines.join("")) as HTMLElement;
    const rect = searchInput.getBoundingClientRect();
    container.style.top = `${rect.bottom}px`;
    container.style.left = `${rect.left}px`;
    container.style.minWidth = `${rect.width}px`;

    const existing = document.querySelector(".search-results");
    if (existing) {
      existing.replaceWith(container);
    } else {
      document.body.append(container);
    }
  }, 500));

  window.addEventListener("click", (e) => {
    const existing = document.querySelector(".search-results");
    if (!existing) return;

    if (parents(e.target as Element, ".search-results,.search-item").length) return;

    existing.remove();
  });
}

// Theme switching functionality
const preference = localStorage.getItem("theme");
if (preference) {
  if (preference === "dark") {
    document.body.classList.add("theme-dark");
    document.body.classList.remove("theme-light");
  } else {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }
}

function setupThemeSelector() {
  const themeSwitch = document.querySelector(".theme-selection input") as HTMLInputElement;
  if (!themeSwitch) return;

  if (preference) {
    const themeSelection = document.querySelector(".theme-selection") as HTMLElement;
    if (themeSelection) {
      themeSelection.classList.add("no-transition");
      themeSwitch.checked = preference === "dark";
      setTimeout(() => themeSelection.classList.remove("no-transition"), 400);
    }
  }

  themeSwitch.addEventListener("change", () => {
    if (themeSwitch.checked) {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
      localStorage.setItem("theme", "light");
    }
  });
}

// Safe function execution wrapper
function $try(func: Function, ...args: any[]) {
  try {
    func.apply(func, args);
  } catch (e) {
    console.error(e);
  }
}

// Initialize all functionality
$try(setupThemeSelector);
$try(setupToC);
$try(addHljs);
$try(setupExpanders);
$try(setupMobileMenu);
$try(setupSearch);
