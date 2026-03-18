import { SUPPORTED_LANGS, translatePage, resolveLanguage, t } from "./i18n.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const PASSCODE = "Victor+1094";
const PASSCODE_FLAG = "kc_admin";
const SOLD_FALLBACK = 261;

let currentLang = resolveLanguage();
let db = null;
let counterRef = null;
let unsubscribe = null;
let latestCount = SOLD_FALLBACK;
let firebaseInitialized = false;
let lastStatusKey = null;
let lastStatusError = false;

const languageButtons = document.querySelectorAll(".language-toggle");
const overlay = document.querySelector("#passcodeOverlay");
const passcodeInput = document.querySelector("#passcodeInput");
const passcodeForm = document.querySelector("#passcodeForm");
const passcodeError = document.querySelector("#passcodeError");
const logoutBtn = document.querySelector("#logoutBtn");
const incrementBtn = document.querySelector("#incrementBtn");
const decrementBtn = document.querySelector("#decrementBtn");
const manualForm = document.querySelector("#manualForm");
const manualInput = document.querySelector("#manualInput");
const statusMessage = document.querySelector("#statusMessage");
const adminSoldCount = document.querySelector("#adminSoldCount");

function updateLanguageToggle() {
  languageButtons.forEach((button) => {
    const lang = button.getAttribute("data-lang");
    button.setAttribute("aria-pressed", lang === currentLang ? "true" : "false");
  });
}

function refreshStatusMessage() {
  if (!statusMessage) return;
  if (!lastStatusKey) {
    statusMessage.textContent = "";
    statusMessage.classList.remove("text-red-600");
    statusMessage.classList.add("text-branddark/80");
    return;
  }
  const text = t(currentLang, lastStatusKey);
  statusMessage.textContent = text;
  statusMessage.classList.toggle("text-red-600", lastStatusError);
  statusMessage.classList.toggle("text-branddark/80", !lastStatusError);
}

function showStatus(key, isError = false) {
  lastStatusKey = key;
  lastStatusError = isError;
  refreshStatusMessage();
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem("kc_lang", lang);
  translatePage(lang);
  updateLanguageToggle();
  refreshStatusMessage();
}

function showOverlay() {
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
  if (passcodeInput) {
    passcodeInput.value = "";
    requestAnimationFrame(() => passcodeInput.focus());
  }
}

function hideOverlay() {
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.classList.remove("flex");
  if (passcodeError) {
    passcodeError.classList.add("hidden");
  }
}

function isAuthenticated() {
  return localStorage.getItem(PASSCODE_FLAG) === "1";
}

function teardownListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function resetCounterDisplay() {
  latestCount = SOLD_FALLBACK;
  if (adminSoldCount) {
    adminSoldCount.textContent = "---";
  }
}

function lockAdmin() {
  localStorage.removeItem(PASSCODE_FLAG);
  teardownListener();
  resetCounterDisplay();
  showStatus(null);
  showOverlay();
}

function updateDisplayCount(value) {
  latestCount = value;
  if (adminSoldCount) {
    adminSoldCount.textContent = value.toString();
  }
}

async function ensureCounterDocument() {
  if (!counterRef) return;
  try {
    const snapshot = await getDoc(counterRef);
    if (!snapshot.exists()) {
      await setDoc(counterRef, { soldCount: SOLD_FALLBACK });
      updateDisplayCount(SOLD_FALLBACK);
    } else {
      const value = snapshot.data()?.soldCount ?? SOLD_FALLBACK;
      updateDisplayCount(value);
    }
  } catch (error) {
    console.error("Error ensuring counter document:", error);
    showStatus("admin.statusError", true);
  }
}

async function initFirebase() {
  const config = window.firebaseConfig;
  if (!config || Object.values(config).some((value) => typeof value === "string" && value.includes("TODO"))) {
    showStatus("admin.statusError", true);
    console.warn("Firebase config placeholder detected; admin actions disabled.");
    return;
  }

  if (!firebaseInitialized) {
    try {
      const app = initializeApp(config);
      db = getFirestore(app);
      firebaseInitialized = true;
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      showStatus("admin.statusError", true);
      return;
    }
  }

  if (!db) {
    showStatus("admin.statusError", true);
    return;
  }

  counterRef = doc(db, "metrics", "sales");
  teardownListener();
  await ensureCounterDocument();

  unsubscribe = onSnapshot(
    counterRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const value = docSnap.data()?.soldCount ?? SOLD_FALLBACK;
        updateDisplayCount(value);
      }
    },
    (error) => {
      console.error("Error listening to counter:", error);
      showStatus("admin.statusError", true);
    }
  );
}

async function applyIncrement(delta) {
  if (!counterRef) {
    showStatus("admin.statusError", true);
    return;
  }
  if (delta < 0 && latestCount + delta < 0) {
    showStatus("admin.statusError", true);
    return;
  }
  try {
    await updateDoc(counterRef, { soldCount: increment(delta) });
    showStatus("admin.statusSaved", false);
  } catch (error) {
    console.error("Error updating counter:", error);
    showStatus("admin.statusError", true);
  }
}

async function handleManualSet(event) {
  event.preventDefault();
  if (!manualInput || !counterRef) {
    showStatus("admin.statusError", true);
    return;
  }
  const rawValue = manualInput.value.trim();
  const parsed = parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    showStatus("admin.statusError", true);
    return;
  }
  try {
    await setDoc(counterRef, { soldCount: parsed }, { merge: true });
    showStatus("admin.statusSaved", false);
    manualInput.value = "";
  } catch (error) {
    console.error("Error setting counter manually:", error);
    showStatus("admin.statusError", true);
  }
}

function handleUnlock() {
  localStorage.setItem(PASSCODE_FLAG, "1");
  hideOverlay();
  initFirebase();
  showStatus(null);
}

function handlePasscodeSubmit(event) {
  event.preventDefault();
  if (!passcodeInput) return;
  const value = passcodeInput.value.trim();
  const isValid = value === PASSCODE;
  if (!isValid) {
    if (passcodeError) {
      passcodeError.classList.remove("hidden");
    }
    passcodeInput.focus();
    return;
  }
  handleUnlock();
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const lang = button.getAttribute("data-lang");
    if (lang) {
      setLanguage(lang);
    }
  });
});

if (passcodeForm) {
  passcodeForm.addEventListener("submit", handlePasscodeSubmit);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    lockAdmin();
  });
}

if (incrementBtn) {
  incrementBtn.addEventListener("click", () => applyIncrement(1));
}

if (decrementBtn) {
  decrementBtn.addEventListener("click", () => applyIncrement(-1));
}

if (manualForm) {
  manualForm.addEventListener("submit", handleManualSet);
}

setLanguage(currentLang);

if (isAuthenticated()) {
  hideOverlay();
  initFirebase();
} else {
  showOverlay();
}
