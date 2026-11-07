let mediaList = [];
let currentFilter = "All";

const fileInput = document.getElementById("fileInput");
const mediaGrid = document.getElementById("mediaGrid");
const searchInput = document.getElementById("searchInput");

// OPEN DATABASE

let db;

const request = indexedDB.open("MediaVerseDB", 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;

  if (!db.objectStoreNames.contains("media")) {
    db.createObjectStore("media", {
      keyPath: "id",
    });
  }
};

request.onsuccess = function (event) {
  db = event.target.result;

  loadMedia();
};

request.onerror = function () {
  alert("Database could not be opened!");
};

// ENTER WEBSITE

function enterWebsite() {
  document.querySelector(".developer-intro").style.display = "none";

  document.querySelector(".sidebar").style.display = "block";

  document.querySelector(".main").style.display = "block";
}

// SAVE MEDIA TO DATABASE

function saveToDatabase(media) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");

    transaction.objectStore("media").put(media);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => reject(transaction.error);
  });
}

// LOAD MEDIA FROM DATABASE

function loadMedia() {
  const transaction = db.transaction("media", "readonly");

  const store = transaction.objectStore("media");

  const request = store.getAll();

  request.onsuccess = function () {
    mediaList = request.result.map((item) => ({
      ...item,

      url: URL.createObjectURL(item.file),
    }));

    displayMedia();
  };
}

// UPLOAD MEDIA

fileInput.addEventListener("change", async function (event) {
  const files = Array.from(event.target.files);

  for (const file of files) {
    const validType =
      file.type.startsWith("video/") || file.type.startsWith("image/");

    const validSize = file.size <= 500 * 1024 * 1024;

    if (!validType) {
      alert("Only videos and images are allowed!");

      continue;
    }

    if (!validSize) {
      alert("Maximum file size is 500MB!");

      continue;
    }

    const media = {
      id: Date.now() + Math.random(),

      name: file.name,

      type: file.type.startsWith("video/") ? "Video" : "Image",

      file: file,

      url: URL.createObjectURL(file),
    };

    try {
      await saveToDatabase(media);

      mediaList.push(media);
    } catch (error) {
      alert("Could not save this file. Browser storage may be full.");
    }
  }

  displayMedia();

  event.target.value = "";
});

// DISPLAY MEDIA

function displayMedia() {
  mediaGrid.innerHTML = "";

  const searchText = searchInput.value.toLowerCase();

  const filtered = mediaList.filter((item) => {
    const matchesCategory =
      currentFilter === "All" || item.type === currentFilter;

    const matchesSearch = item.name.toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    mediaGrid.innerHTML = `
            <div class="empty">
                <div>📂</div>
                <h2>No Media Found</h2>
                <p>Upload your favorite videos and pictures.</p>
            </div>
        `;
  }

  filtered.forEach((item) => {
    const card = document.createElement("div");

    card.className = "media-card";

    let preview = "";

    if (item.type === "Video") {
      preview = `
                <video src="${item.url}" controls preload="metadata"></video>
            `;
    } else {
      preview = `
                <img src="${item.url}" alt="Uploaded image">
            `;
    }

    card.innerHTML = `
            <div class="media-preview">
                ${preview}
            </div>

            <div class="media-info">

                <h3>${escapeHTML(item.name)}</h3>

                <div class="media-actions">

                    <span>${item.type}</span>

                    <button class="delete-btn"
                        onclick="deleteMedia(${item.id})">
                        🗑 Delete
                    </button>

                </div>

            </div>
        `;

    mediaGrid.appendChild(card);
  });

  updateStats();
}

// ESCAPE HTML

function escapeHTML(text) {
  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}

// DELETE MEDIA

function deleteMedia(id) {
  const transaction = db.transaction("media", "readwrite");

  transaction.objectStore("media").delete(id);

  transaction.oncomplete = function () {
    const item = mediaList.find((media) => media.id === id);

    if (item) {
      URL.revokeObjectURL(item.url);
    }

    mediaList = mediaList.filter((media) => media.id !== id);

    displayMedia();
  };
}

// FILTER MEDIA

function filterMedia(category) {
  currentFilter = category;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const name = btn.textContent.trim();

    btn.classList.toggle(
      "active",
      (category === "All" && name === "All") ||
        (category === "Video" && name === "Videos") ||
        (category === "Image" && name === "Images"),
    );
  });

  displayMedia();
}

// SEARCH

searchInput.addEventListener("input", displayMedia);

// UPDATE STATISTICS

function updateStats() {
  document.getElementById("totalMedia").textContent = mediaList.length;

  document.getElementById("totalVideos").textContent = mediaList.filter(
    (item) => item.type === "Video",
  ).length;

  document.getElementById("totalImages").textContent = mediaList.filter(
    (item) => item.type === "Image",
  ).length;
}
