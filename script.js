// ---- SETTINGS ----------------------------------------------------------
// On GitHub Pages (user.github.io/repo/) owner and repo are detected automatically.
// If you use a custom domain or test locally, fill these in by hand.
const CONFIG = {
  owner: "",          // your GitHub username
  repo: "",           // your repository name
  branch: "main",     // branch that holds the files
  folder: "files"     // folder whose contents are listed
};
// ------------------------------------------------------------------------

if (!CONFIG.owner && location.hostname.endsWith(".github.io")) {
  CONFIG.owner = location.hostname.split(".")[0];
  CONFIG.repo = location.pathname.split("/")[1] || CONFIG.owner + ".github.io";
}

const $ = id => document.getElementById(id);
const list = $("list"), msg = $("msg"), crumbs = $("crumbs"), search = $("search");
let path = CONFIG.folder, items = [];

const fmtSize = b => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" :
  b < 1073741824 ? (b / 1048576).toFixed(1) + " MB" : (b / 1073741824).toFixed(2) + " GB";

async function load(p) {
  path = p; search.value = "";
  msg.className = ""; msg.textContent = "Loading files...";
  list.innerHTML = ""; drawCrumbs();
  if (!CONFIG.owner || !CONFIG.repo) {
    msg.className = "err";
    msg.textContent = "Set owner and repo at the top of script.js.";
    return;
  }
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${encodeURI(p)}?ref=${CONFIG.branch}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) throw new Error(`Folder "${p}" not found on branch "${CONFIG.branch}".`);
    if (res.status === 403) throw new Error("GitHub rate limit reached. Try again in a few minutes.");
    if (!res.ok) throw new Error("Could not load files (error " + res.status + ").");
    const data = await res.json();
    items = data
      .filter(f => f.name !== ".gitkeep")
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    render();
  } catch (e) {
    msg.className = "err"; msg.textContent = e.message;
  }
}

function drawCrumbs() {
  const parts = path.split("/"), base = CONFIG.folder.split("/").length;
  crumbs.innerHTML = "";
  parts.slice(base - 1).forEach((part, i, arr) => {
    const target = parts.slice(0, base + i).join("/");
    if (i) crumbs.append(Object.assign(document.createElement("span"), { textContent: "/" }));
    if (i === arr.length - 1) crumbs.append(document.createTextNode(i ? part : "All files"));
    else {
      const b = document.createElement("button");
      b.textContent = i ? part : "All files";
      b.onclick = () => load(target);
      crumbs.append(b);
    }
  });
}

function render() {
  const q = search.value.trim().toLowerCase();
  const shown = items.filter(f => f.name.toLowerCase().includes(q));
  list.innerHTML = "";
  msg.textContent = shown.length ? "" : (items.length ? "No files match your search." : "This folder is empty. Add files to it in your repository.");
  for (const f of shown) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "name"; name.textContent = f.name;
    li.append(name);
    if (f.type === "dir") {
      li.className = "dir";
      name.textContent = f.name + " (folder)";
      name.tabIndex = 0;
      name.onclick = () => load(f.path);
      name.onkeydown = e => { if (e.key === "Enter") load(f.path); };
    } else {
      const size = document.createElement("span");
      size.className = "size"; size.textContent = fmtSize(f.size);
      const btn = document.createElement("button");
      btn.className = "btn"; btn.textContent = "Download";
      btn.onclick = () => download(f, btn);
      li.append(size, btn);
    }
    list.append(li);
  }
}

// Fetches the file and saves it, so images, PDFs and text download instead of opening in the browser.
async function download(f, btn) {
  btn.disabled = true; btn.textContent = "Downloading...";
  try {
    const res = await fetch(f.download_url);
    if (!res.ok) throw new Error();
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(f.download_url, "_blank");   // fallback: open the direct link
  }
  btn.disabled = false; btn.textContent = "Download";
}

search.addEventListener("input", render);
load(path);
