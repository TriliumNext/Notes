// src/scripts/modules/highlight.ts
var highlightTriliumApi = {
  "after:highlight": (result) => {
    result.value = result.value.replaceAll(/([^A-Za-z0-9])api\./g, function(match, prefix) {
      return `${prefix}<span class="hljs-variable language_">api</span>.`;
    });
  }
};
var highlightJQuery = {
  "after:highlight": (result) => {
    result.value = result.value.replaceAll(/([^A-Za-z0-9.])\$\((.+)\)/g, function(match, prefix, variable) {
      return `${prefix}<span class="hljs-variable language_">$(</span>${variable}<span class="hljs-variable language_">)</span>`;
    });
  }
};
function addHljs() {
  const codeblocks = document.querySelectorAll(`.ck-content pre`);
  if (!codeblocks.length)
    return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "api/notes/cVaK9ZJwx5Hs/download";
  document.head.append(link);
  const script = document.createElement("script");
  script.src = "api/notes/6PVElIem02b5/download";
  script.addEventListener("load", () => {
    const allLanguages = hljs.listLanguages().map((l) => {
      const definition = hljs.getLanguage(l);
      if (definition?.aliases)
        return [l, ...definition.aliases];
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

// src/scripts/modules/toc.ts
function setupToC() {
  const toc = document.getElementById("toc");
  if (!toc)
    return;
  const sections = document.getElementById("content").querySelectorAll("h2, h3, h4, h5, h6");
  const links = toc.querySelectorAll("a");
  for (const link of links) {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target)
        return;
      e.preventDefault();
      e.stopPropagation();
      target.scrollIntoView({ behavior: "smooth" });
    });
  }
  function changeLinkState() {
    let index = sections.length;
    while (--index && window.scrollY + 50 < sections[index].offsetTop) {
    }
    links.forEach((link) => link.classList.remove("active"));
    links[index].classList.add("active");
  }
  changeLinkState();
  window.addEventListener("scroll", changeLinkState);
}

// src/scripts/modules/expanders.ts
function setupExpanders() {
  const expanders = Array.from(document.querySelectorAll("#menu .submenu-item"));
  for (const ex of expanders) {
    ex.addEventListener("click", (e) => {
      if (e.target.closest(".submenu-item,.item") !== ex)
        return;
      e.preventDefault();
      e.stopPropagation();
      const ul = ex.querySelector("ul");
      ul.style.height = `${ul.scrollHeight}px`;
      setTimeout(() => ex.classList.toggle("expanded"), 1);
      setTimeout(() => ul.style.height = ``, 200);
    });
  }
}

// src/scripts/common/parents.ts
function parents(el, selector) {
  const result = [];
  for (let p = el && el.parentElement; p; p = p.parentElement) {
    if (p.matches(selector))
      result.push(p);
  }
  return result;
}

// src/scripts/modules/mobile.ts
function setupMobileMenu() {
  function toggleMobileMenu(event) {
    event.stopPropagation();
    const isOpen = document.body.classList.contains("menu-open");
    if (isOpen)
      return document.body.classList.remove("menu-open");
    return document.body.classList.add("menu-open");
  }
  const showMenuButton = document.getElementById("show-menu-button");
  showMenuButton?.addEventListener("click", toggleMobileMenu);
  window.addEventListener("click", (e) => {
    const isOpen = document.body.classList.contains("menu-open");
    if (!isOpen)
      return;
    if (parents(e.target, "#left-pane").length)
      return;
    return toggleMobileMenu(e);
  });
}

// src/scripts/common/debounce.ts
function debounce(executor, delay) {
  let timeout;
  return function(...args) {
    const callback = () => {
      timeout = null;
      Reflect.apply(executor, null, args);
    };
    if (timeout)
      clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
}

// src/scripts/common/parsehtml.ts
function parseHTML(html, fragment = false) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const node = template.content.cloneNode(true);
  if (fragment)
    return node;
  return node.childNodes.length > 1 ? node.childNodes : node.childNodes[0];
}

// src/scripts/modules/search.ts
function buildResultItem(result) {
  return `<a class="search-result-item" href="./${result.id}">
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-note">${result.path || "Home"}</div>
            </a>`;
}
function setupSearch() {
  const searchInput = document.querySelector(".search-input");
  searchInput.addEventListener("keyup", debounce(async () => {
    const ancestor = document.body.dataset.ancestorNoteId;
    const query = searchInput.value;
    if (query.length < 3)
      return;
    const resp = await fetch(`api/notes?search=${query}&ancestorNoteId=${ancestor}`);
    const json = await resp.json();
    const results = json.results.slice(0, 5);
    const lines = [`<div class="search-results">`];
    for (const result of results) {
      lines.push(buildResultItem(result));
    }
    lines.push("</div>");
    const container = parseHTML(lines.join(""));
    const rect = searchInput.getBoundingClientRect();
    container.style.top = `${rect.bottom}px`;
    container.style.left = `${rect.left}px`;
    container.style.minWidth = `${rect.width}px`;
    const existing = document.querySelector(".search-results");
    if (existing)
      existing.replaceWith(container);
    else
      document.body.append(container);
  }, 500));
  window.addEventListener("click", (e) => {
    const existing = document.querySelector(".search-results");
    if (!existing)
      return;
    if (parents(e.target, ".search-results,.search-item").length)
      return;
    if (existing)
      existing.remove();
  });
}

// src/scripts/modules/theme.ts
var preference = localStorage.getItem("theme");
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
  const themeSwitch = document.querySelector(".theme-selection input");
  if (preference) {
    const themeSelection = document.querySelector(".theme-selection");
    themeSelection.classList.add("no-transition");
    themeSwitch.checked = preference === "dark";
    setTimeout(() => themeSelection.classList.remove("no-transition"), 400);
  }
  themeSwitch?.addEventListener("change", () => {
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

// src/scripts/index.ts
function $try(func, ...args) {
  try {
    func.apply(func, args);
  } catch (e) {
    console.error(e);
  }
}
$try(setupThemeSelector);
$try(setupToC);
$try(addHljs);
$try(setupExpanders);
$try(setupMobileMenu);
$try(setupSearch);
