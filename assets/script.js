// Client-side site logic: status, data loading and rendering
const JAVA_IP = 'cycsmp.feathermc.gg';
const BEDROCK_IP = 'microsoft-queue.gl.at.ply.gg';
const BEDROCK_PORT = '1283';

async function uuidToUsername(uuid) {
  // Mojang requires UUID without hyphens
  const clean = uuid.replace(/-/g, "");

  const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(
      "https://api.mojang.com/user/profile/" + clean
  )}`);

  if (res.status === 204) return null; // UUID does not exist
  if (!res.ok) throw new Error("Invalid UUID or rate limited");

  const data = await res.json();
  return data.name; // username
}

async function queryServer() {
  const statusText = document.getElementById('status-text');
  const playerCount = document.getElementById('player-count');
  const playersList = document.getElementById('players-list');
  if (!statusText) return;

  try {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${JAVA_IP}`);
    const data = await res.json();
    statusText.textContent = data.online ? '🟢 Online' : '🔴 Offline';
    playerCount.textContent = data.online ? `${data.players.online}/${data.players.max} players` : '';
    playersList.innerHTML = '';
    if (data.online && data.players && data.players.list) {
      data.players.list.forEach(name => {
        name = name["name_clean"]
        const head = `https://mc-heads.net/avatar/${name}/48`;
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center w-20';
        el.innerHTML = `<img class="rounded-md" src="${head}" alt="${name}" /><div class="mt-2 text-xs">${name}</div>`;
        playersList.appendChild(el);
      });
    }
  } catch (e) {
    console.error('Status check failed', e);
    statusText.textContent = 'Status unavailable';
  }
}

async function loadJSON(path, fallback=[]) {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.json();
  } catch(e) {
    return fallback;
  }
}

async function renderHomePreview() {
  // IPs
  const javaEl = document.getElementById('java-ip');
  const bedrockEl = document.getElementById('bedrock-ip');
  const bedrockPortEl = document.getElementById('bedrock-port');
  const bedrockPortP = document.getElementById('bedrock-port-p');
  if (javaEl) javaEl.textContent = JAVA_IP;
  if (bedrockEl) bedrockEl.textContent = BEDROCK_IP;
  if (BEDROCK_PORT === '19132') bedrockPortP.classList.add('hidden');
  if (bedrockPortEl) bedrockPortEl.textContent = BEDROCK_PORT;

  // News preview
  const news = await loadJSON('https://gist.githubusercontent.com/GoofyMooCow/bfc050a0c5c051d3fc06cdb1ee603b66/raw/news.json', []);
  const preview = document.getElementById('news-preview');
  if (preview) {
    preview.innerHTML = '';
    news.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    news.slice(0,3).forEach(item=>{
      const d = document.createElement('div');
      d.className = 'bg-gray-800 p-4 rounded';
      d.innerHTML = `<div class="text-sm text-gray-400">${item.date}</div><h3 class="font-semibold">${item.title}</h3><p class="text-sm mt-1 text-gray-300">${item.body.substring(0,200)}${item.body.length>200?'...':''}</p>`;
      preview.appendChild(d);
    });
  }
}

async function renderNewsPage() {
  const container = document.getElementById('news-container');
  if (!container) return;
  const news = await loadJSON('https://gist.githubusercontent.com/GoofyMooCow/bfc050a0c5c051d3fc06cdb1ee603b66/raw/news.json', []);
  container.innerHTML = '';
  news.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  news.forEach(item=>{
    const el = document.createElement('article');
    el.className = 'bg-gray-800 p-4 rounded';
    el.innerHTML = `<div class="text-sm text-gray-400">${item.date}</div><h2 class="text-xl font-semibold">${item.title}</h2><p class="mt-2 text-gray-300 whitespace-pre-line">${item.body}</p>`;
    container.appendChild(el);
  });
}

async function renderMembersPage() {
  const container = document.getElementById('members-container');
  if (!container) return;
  const members = await loadJSON('https://gist.githubusercontent.com/GoofyMooCow/68006ecb68f6ffdf01ea7cad859a3327/raw/members.json', []);
  container.innerHTML = '';
  for (const id of Object.keys(members)) {
    const m = await uuidToUsername(id);
    const head = `https://mc-heads.net/avatar/${m}/100`;
    const el = document.createElement('div');
    el.className = 'bg-gray-800 p-3 rounded flex flex-col items-center';
    el.innerHTML = `<img src="${head}" alt="${m}" class="rounded"/><div class="mt-2 text-sm">${m}</div>`;
    container.appendChild(el);
  }
}

async function renderGalleryPage() {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  const gallery = await loadJSON('https://gist.githubusercontent.com/GoofyMooCow/bf6f44853ddb103f67ace4fa99a5f834/raw/gallery.json', []);
  container.innerHTML = '';

  gallery.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  gallery.forEach(item => {
    const el = document.createElement('div');
    el.className = 'bg-gray-800 p-2 rounded';

    el.innerHTML = `
      <img src="${item.image}" alt="${item.by}" class="w-full rounded cursor-pointer gallery-img"/>
      <div class="flex items-center justify-between text-sm text-gray-400 mt-1">
        <span>
          ${item.date} • <strong>${item.by}</strong>
        </span>
        <a href="${item.image}" class="inline-block h-5 w-5" download>
          <img alt="download icon" class="h-5 w-5" src="images/download-icon.svg">
        </a>
      </div>
    `;


    container.appendChild(el);
  });

  // Modal logic
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');

  document.querySelectorAll('.gallery-img').forEach(img => {
    img.addEventListener('click', () => {
      modalImage.src = img.src;
      modal.classList.remove('opacity-0', 'pointer-events-none');
    });
  });

  modal.addEventListener('click', e => {
    // Close only when clicking the background
    if (e.target === modal) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modalImage.src = '';
    }
  });
}


document.addEventListener('DOMContentLoaded', ()=>{
  renderHomePreview();
  renderNewsPage();
  renderMembersPage();
  renderGalleryPage();
  queryServer();
  setInterval(queryServer, 30000);
});

const btn = document.getElementById("menu-btn");
const menu = document.getElementById("mobile-menu");

btn.addEventListener("click", () => {
  if (menu.classList.contains("max-h-0")) {
    // OPEN — slide down
    menu.classList.remove("max-h-0");
    menu.classList.add("max-h-96"); // enough height for your links
  } else {
    // CLOSE — slide up
    menu.classList.remove("max-h-96");
    menu.classList.add("max-h-0");
  }
});
