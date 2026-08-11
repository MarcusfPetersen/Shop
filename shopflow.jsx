import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Check, ChevronUp, ChevronDown, ChevronLeft, Star, ShoppingCart, Store,
  X, User, Users, MapPin, Sparkles, Trash2, Home
} from "lucide-react";

/* ---------------------------------------------------------------
   ShopFlow — data
--------------------------------------------------------------- */

const CATS = [
  { key: "frugt",   label: "Frugt & grønt",    emoji: "🥬" },
  { key: "broed",   label: "Brød",             emoji: "🥖" },
  { key: "koel",    label: "Køl & mejeri",     emoji: "🥛" },
  { key: "koed",    label: "Kød",              emoji: "🥩" },
  { key: "frost",   label: "Frost",            emoji: "❄️" },
  { key: "kolonial",label: "Kolonial",         emoji: "🥫" },
  { key: "drikke",  label: "Drikkevarer",      emoji: "🥤" },
  { key: "pleje",   label: "Personlig pleje",  emoji: "🧴" },
  { key: "hus",     label: "Husholdning",      emoji: "🧻" },
  { key: "baby",    label: "Baby",             emoji: "👶" },
  { key: "dyr",     label: "Dyr",              emoji: "🐾" },
  { key: "andet",   label: "Andet",            emoji: "📦" },
];
const CAT_BY_KEY = Object.fromEntries(CATS.map(c => [c.key, c]));

const KEYWORDS = {
  frugt: ["banan","æble","agurk","tomat","salat","løg","kartoffel","citron","appelsin","peberfrugt","gulerod","avocado","champignon","broccoli","hvidløg","ingefær","græskar","spinat","frugt","grønt","pære","drue"],
  broed: ["rugbrød","brød","bolle","boller","toast","franskbrød","knækbrød","croissant","bagel"],
  koel:  ["mælk","smør","ost","yoghurt","fløde","æg","skyr","creme fraiche","kærnemælk","margarine","feta","mozzarella"],
  koed:  ["hakket oksekød","hakket kød","kylling","kød","bacon","pølser","svinekød","oksekød","kalkun","frikadeller","skinke","koteletter","medister"],
  frost: ["is ","frost","frosne","frossen","fiskefilet","frostvarer","softice"],
  kolonial: ["ris","pasta","havregryn","ketchup","mel","sukker","salt","olie","konserves","dåse","krydderi","bønner","müsli","cornflakes","nudler","honning","marmelade","bouillon","spaghetti"],
  drikke: ["cola","pepsi","sodavand","juice","øl","vin","vand","kaffe","te ","the ","fanta","saft","energidrik"],
  pleje: ["shampoo","sæbe","tandpasta","deodorant","creme","tandbørste","barbermaskine","håndsæbe","balsam"],
  hus:   ["toiletpapir","ajax","opvasketabs","rengøring","køkkenrulle","affaldspose","lambi","opvaskemiddel","vaskemiddel","svamp"],
  baby:  ["ble","bleer","babymad","babymælk"],
  dyr:   ["hundemad","kattemad","kattegrus"],
};

function categorize(name) {
  const n = " " + name.toLowerCase().trim() + " ";
  for (const cat of Object.keys(KEYWORDS)) {
    if (KEYWORDS[cat].some(kw => n.includes(kw))) return cat;
  }
  return "andet";
}

function parseInput(raw) {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d+)\s*[xX×]?\s*(.+)$/);
  if (m) return { qty: parseInt(m[1], 10) || 1, name: m[2].trim() };
  return { qty: 1, name: trimmed };
}

const STORES = [
  { key: "netto",  label: "Netto",     color: "#F0AD1F" },
  { key: "rema",   label: "Rema 1000", color: "#3D6FE0" },
  { key: "foetex", label: "Føtex",     color: "#1F6F4A" },
  { key: "lidl",   label: "Lidl",      color: "#993D5A" },
];

const DEFAULT_ORDERS = {
  netto:  ["frugt","broed","koel","koed","frost","kolonial","drikke","pleje","hus","baby","dyr","andet"],
  rema:   ["frugt","broed","koel","koed","kolonial","frost","drikke","hus","pleje","baby","dyr","andet"],
  foetex: ["frugt","broed","koed","koel","kolonial","drikke","pleje","hus","baby","dyr","frost","andet"],
  lidl:   ["frugt","broed","koel","koed","frost","kolonial","hus","drikke","pleje","baby","dyr","andet"],
};

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------------------------------------------------------
   Persistence helpers
--------------------------------------------------------------- */

async function loadKV(key, shared, fallback) {
  try {
    const r = await window.storage.get(key, shared);
    if (r && r.value != null) return JSON.parse(r.value);
    return fallback;
  } catch {
    return fallback;
  }
}
async function saveKV(key, shared, value) {
  try { await window.storage.set(key, JSON.stringify(value), shared); }
  catch { /* best effort */ }
}

/* ---------------------------------------------------------------
   Main component
--------------------------------------------------------------- */

export default function ShopFlow() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("home"); // 'home' | 'board'
  const [tab, setTab] = useState("liste");       // active tab inside a board

  // board content (whichever board is open)
  const [items, setItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null); // {kind:'personal',id,name} | {kind:'shared',code,name}

  // board registries (always personal to this device)
  const [myBoards, setMyBoards] = useState([]);
  const [joinedBoards, setJoinedBoards] = useState([]);

  // personal settings
  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [store, setStore] = useState("netto");
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");

  // ui state
  const [input, setInput] = useState("");
  const [editingRoute, setEditingRoute] = useState(null);
  const [showHint, setShowHint] = useState(true);
  const [showNewPersonal, setShowNewPersonal] = useState(false);
  const [newPersonalDraft, setNewPersonalDraft] = useState("");
  const [joinStep, setJoinStep] = useState("idle"); // idle | enteringCode | namingNew
  const [joinCodeDraft, setJoinCodeDraft] = useState("");
  const [pendingCode, setPendingCode] = useState(null);
  const [newSharedNameDraft, setNewSharedNameDraft] = useState("");
  const inputRef = useRef(null);

  // ---- load ----
  useEffect(() => {
    (async () => {
      const [mb, jb, st, nm, ord, last] = await Promise.all([
        loadKV("shopflow:myBoards", false, []),
        loadKV("shopflow:joinedBoards", false, []),
        loadKV("shopflow:store", false, "netto"),
        loadKV("shopflow:name", false, ""),
        loadKV("shopflow:orders", false, DEFAULT_ORDERS),
        loadKV("shopflow:lastBoard", false, null),
      ]);
      setMyBoards(mb); setJoinedBoards(jb); setStore(st); setName(nm); setOrders(ord);
      if (last && last.kind) {
        const stillExists = last.kind === "personal"
          ? mb.some(b => b.id === last.id)
          : jb.some(b => b.code === last.code);
        if (stillExists) await openBoard(last);
      }
      setReady(true);
    })();
  }, []);

  function persistMyBoards(next) { setMyBoards(next); saveKV("shopflow:myBoards", false, next); }
  function persistJoinedBoards(next) { setJoinedBoards(next); saveKV("shopflow:joinedBoards", false, next); }
  function persistOrders(next) { setOrders(next); saveKV("shopflow:orders", false, next); }
  function persistStore(next) { setStore(next); saveKV("shopflow:store", false, next); }
  function persistName(next) { setName(next); saveKV("shopflow:name", false, next); }

  function boardKey(ref) { return ref.kind === "personal" ? `shopflow:board:${ref.id}` : `shopflow:shared:${ref.code}`; }

  async function openBoard(ref) {
    setActiveBoard(ref);
    setScreen("board");
    setTab("liste");
    saveKV("shopflow:lastBoard", false, ref);
    const content = await loadKV(boardKey(ref), ref.kind === "shared", { name: ref.name, items: [], favorites: [] });
    setItems(content.items || []);
    setFavorites(content.favorites || []);
  }
  function goHome() {
    setScreen("home");
    setActiveBoard(null);
    saveKV("shopflow:lastBoard", false, null);
  }

  function saveBoardContent(nextItems, nextFavorites) {
    if (!activeBoard) return;
    const shared = activeBoard.kind === "shared";
    const payload = shared ? { name: activeBoard.name, items: nextItems, favorites: nextFavorites } : { items: nextItems, favorites: nextFavorites };
    saveKV(boardKey(activeBoard), shared, payload);
  }
  function persistItems(next) { setItems(next); saveBoardContent(next, favorites); }
  function persistFav(next) { setFavorites(next); saveBoardContent(items, next); }

  // ---- board registry actions ----
  function createPersonalBoard(rawName) {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const board = { id: uid(), name: trimmed };
    persistMyBoards([...myBoards, board]);
    setNewPersonalDraft(""); setShowNewPersonal(false);
    openBoard({ kind: "personal", id: board.id, name: trimmed });
  }
  function deletePersonalBoard(id) {
    persistMyBoards(myBoards.filter(b => b.id !== id));
  }
  function leaveSharedBoard(code) {
    persistJoinedBoards(joinedBoards.filter(b => b.code !== code));
  }
  async function startJoin(codeRaw) {
    const codeNorm = codeRaw.trim().toLowerCase();
    if (!codeNorm) return;
    const content = await loadKV(`shopflow:shared:${codeNorm}`, true, null);
    if (content && content.name) {
      finalizeJoin(codeNorm, content.name);
    } else {
      setPendingCode(codeNorm);
      setJoinStep("namingNew");
    }
  }
  function finalizeJoin(codeNorm, boardName) {
    const already = joinedBoards.find(b => b.code === codeNorm);
    const nextRegistry = already
      ? joinedBoards.map(b => b.code === codeNorm ? { ...b, name: boardName } : b)
      : [...joinedBoards, { code: codeNorm, name: boardName }];
    persistJoinedBoards(nextRegistry);
    openBoard({ kind: "shared", code: codeNorm, name: boardName });
    setJoinStep("idle"); setJoinCodeDraft(""); setPendingCode(null); setNewSharedNameDraft("");
  }
  async function confirmNewSharedName(rawName) {
    const trimmed = rawName.trim();
    if (!trimmed || !pendingCode) return;
    await saveKV(`shopflow:shared:${pendingCode}`, true, { name: trimmed, items: [], favorites: [] });
    finalizeJoin(pendingCode, trimmed);
  }

  // ---- item actions ----
  function addItem(raw) {
    const { qty, name: itemName } = parseInput(raw);
    if (!itemName) return;
    const cat = categorize(itemName);
    const existing = items.find(
      it => !it.checked && it.name.toLowerCase() === itemName.toLowerCase() && it.category === cat
    );
    let next;
    if (existing) {
      next = items.map(it => it.id === existing.id ? { ...it, qty: it.qty + qty } : it);
    } else {
      next = [...items, { id: uid(), name: itemName, qty, category: cat, checked: false, claimedBy: null, addedAt: Date.now() }];
    }
    persistItems(next);
    setInput("");
    inputRef.current && inputRef.current.focus();
  }
  function toggleChecked(id) {
    persistItems(items.map(it => it.id === id ? { ...it, checked: !it.checked, claimedBy: it.checked ? it.claimedBy : null } : it));
  }
  function toggleClaim(id) {
    if (!name) { setTab("butikker"); return; }
    persistItems(items.map(it => {
      if (it.id !== id) return it;
      return { ...it, claimedBy: it.claimedBy === name ? null : name };
    }));
  }
  function removeItem(id) {
    persistItems(items.filter(it => it.id !== id));
  }
  function clearChecked() {
    persistItems(items.filter(it => !it.checked));
  }
  function addFavoriteFromItem(it) {
    if (favorites.some(f => f.name.toLowerCase() === it.name.toLowerCase())) return;
    persistFav([...favorites, { id: uid(), name: it.name, category: it.category }]);
  }
  function removeFavorite(id) {
    persistFav(favorites.filter(f => f.id !== id));
  }
  function addFromFavorite(fav) {
    const existing = items.find(it => !it.checked && it.name.toLowerCase() === fav.name.toLowerCase());
    let next;
    if (existing) next = items.map(it => it.id === existing.id ? { ...it, qty: it.qty + 1 } : it);
    else next = [...items, { id: uid(), name: fav.name, category: fav.category, qty: 1, checked: false, claimedBy: null, addedAt: Date.now() }];
    persistItems(next);
  }
  function moveCategory(storeKey, index, dir) {
    const arr = [...orders[storeKey]];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    persistOrders({ ...orders, [storeKey]: arr });
  }

  // ---- derived ----
  const order = orders[store] || DEFAULT_ORDERS[store];
  const activeItems = items.filter(it => !it.checked);
  const doneItems = items.filter(it => it.checked);
  const grouped = order
    .map(catKey => ({ cat: CAT_BY_KEY[catKey], items: activeItems.filter(it => it.category === catKey) }))
    .filter(g => g.items.length > 0);
  const currentStoreMeta = STORES.find(s => s.key === store);

  if (!ready) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ color: INK_MUTED, fontFamily: BODY }}>Henter…</div>
      </div>
    );
  }

  /* ============================= HOME SCREEN ============================= */
  if (screen === "home") {
    return (
      <div style={styles.page}>
        <style>{FONT_IMPORT}</style>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>ShopFlow</div>
            <h1 style={styles.h1}>Forside</h1>
          </div>
        </div>

        <div style={styles.sectionLabel}>Mine lister</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
          {myBoards.map(b => (
            <div key={b.id} style={styles.boardRow}>
              <button onClick={() => openBoard({ kind: "personal", id: b.id, name: b.name })} style={styles.boardRowBtn}>
                <span style={{ fontSize: 17 }}>🛒</span>
                <span style={styles.boardName}>{b.name}</span>
              </button>
              <button onClick={() => deletePersonalBoard(b.id)} style={styles.boardDelete} aria-label="Slet liste">
                <X size={12} color={INK_MUTED} />
              </button>
            </div>
          ))}

          {myBoards.length === 0 && !showNewPersonal && (
            <div style={{ fontSize: 12.5, color: INK_MUTED, marginBottom: 2 }}>Du har ingen egne lister endnu.</div>
          )}

          {showNewPersonal ? (
            <div style={styles.newBoardInline}>
              <input
                autoFocus
                value={newPersonalDraft}
                onChange={(e) => setNewPersonalDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createPersonalBoard(newPersonalDraft); if (e.key === "Escape") setShowNewPersonal(false); }}
                placeholder="Fx Ugentlig"
                style={styles.addInput}
              />
              <button onClick={() => createPersonalBoard(newPersonalDraft)} style={{ ...styles.addBtn, width: 42, height: 42 }}>
                <Check size={16} color="#fff" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNewPersonal(true)} style={styles.newBoardBtn}>
              <Plus size={15} /> Ny liste
            </button>
          )}
        </div>

        <div style={styles.sectionLabel}>Delte lister</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {joinedBoards.map(b => (
            <div key={b.code} style={styles.boardRow}>
              <button onClick={() => openBoard({ kind: "shared", code: b.code, name: b.name })} style={styles.boardRowBtn}>
                <Users size={15} color={CLAIMED} />
                <span style={styles.boardName}>{b.name}</span>
                <span style={styles.boardCode}>{b.code}</span>
              </button>
              <button onClick={() => leaveSharedBoard(b.code)} style={styles.boardDelete} aria-label="Forlad liste">
                <X size={12} color={INK_MUTED} />
              </button>
            </div>
          ))}

          {joinedBoards.length === 0 && joinStep === "idle" && (
            <div style={{ fontSize: 12.5, color: INK_MUTED, marginBottom: 2 }}>Du deler ingen lister endnu.</div>
          )}

          {joinStep === "idle" && (
            <button onClick={() => setJoinStep("enteringCode")} style={styles.newBoardBtn}>
              <Plus size={15} /> Tilslut eller opret med kode
            </button>
          )}
          {joinStep === "enteringCode" && (
            <div style={styles.newBoardInline}>
              <input
                autoFocus
                value={joinCodeDraft}
                onChange={(e) => setJoinCodeDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") startJoin(joinCodeDraft); if (e.key === "Escape") { setJoinStep("idle"); setJoinCodeDraft(""); } }}
                placeholder="fx emma-og-mig"
                style={styles.addInput}
              />
              <button onClick={() => startJoin(joinCodeDraft)} style={{ ...styles.addBtn, width: 42, height: 42 }}>
                <Check size={16} color="#fff" />
              </button>
            </div>
          )}
          {joinStep === "namingNew" && (
            <div>
              <div style={{ fontSize: 12, color: INK_MUTED, marginBottom: 6 }}>
                Koden "{pendingCode}" er ny — giv listen et navn:
              </div>
              <div style={styles.newBoardInline}>
                <input
                  autoFocus
                  value={newSharedNameDraft}
                  onChange={(e) => setNewSharedNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmNewSharedName(newSharedNameDraft); }}
                  placeholder="Fx Familien Petersen"
                  style={styles.addInput}
                />
                <button onClick={() => confirmNewSharedName(newSharedNameDraft)} style={{ ...styles.addBtn, width: 42, height: 42 }}>
                  <Check size={16} color="#fff" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.noteBox}>
          <Sparkles size={14} color={INK_MUTED} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Mine lister ligger kun på denne enhed. Delte lister følger koden — alle der indtaster samme kode ser og redigerer den samme liste.</span>
        </div>
      </div>
    );
  }

  /* ============================= BOARD SCREEN ============================= */
  return (
    <div style={styles.page}>
      <style>{FONT_IMPORT}</style>

      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <button onClick={goHome} style={styles.backBtn} aria-label="Til forsiden">
            <ChevronLeft size={18} color={INK_MUTED} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>{activeBoard.kind === "shared" ? "DELT LISTE" : "MIN LISTE"}</div>
            <h1 style={{ ...styles.h1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeBoard.name}</h1>
          </div>
        </div>
        <button
          onClick={() => setTab("butikker")}
          style={{ ...styles.storePill, borderColor: currentStoreMeta.color }}
        >
          <Store size={14} color={currentStoreMeta.color} />
          <span style={{ color: INK }}>{currentStoreMeta.label}</span>
        </button>
      </div>

      {/* Add bar */}
      <div style={styles.addBar}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(input); }}
          placeholder="Hvad mangler du? f.eks. 2 mælk"
          style={styles.addInput}
        />
        <button onClick={() => addItem(input)} style={styles.addBtn} aria-label="Tilføj">
          <Plus size={20} color="#fff" />
        </button>
      </div>

      {showHint && items.length === 0 && favorites.length === 0 && (
        <div style={styles.hintBox}>
          <Sparkles size={15} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600 }}>Bare skriv løs. </span>
            Varer sorteres automatisk efter kategori og din butiksrute — prøv "mælk", "ajax" eller "2 bananer".
          </div>
          <button onClick={() => setShowHint(false)} style={styles.hintClose} aria-label="Luk">
            <X size={14} color={INK_MUTED} />
          </button>
        </div>
      )}

      {/* ---------------- LIST TAB ---------------- */}
      {tab === "liste" && (
        <div>
          {grouped.length === 0 && doneItems.length === 0 && (
            <div style={styles.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, color: INK }}>Listen er tom</div>
              <div style={{ fontSize: 13, color: INK_MUTED, marginTop: 2 }}>Skriv en vare ovenfor for at komme i gang.</div>
            </div>
          )}

          <div style={styles.route}>
            {grouped.map((g, gi) => (
              <div key={g.cat.key} style={styles.aisleBlock}>
                <div style={styles.aisleDot} />
                {gi < grouped.length - 1 && <div style={styles.aisleLine} />}
                <div style={styles.aisleContent}>
                  <div style={styles.aisleSign}>
                    <span style={{ fontSize: 16 }}>{g.cat.emoji}</span>
                    <span style={styles.aisleLabel}>{g.cat.label.toUpperCase()}</span>
                    <span style={styles.aisleCount}>{g.items.length}</span>
                  </div>
                  <div style={styles.itemsCard}>
                    {g.items.map((it, idx) => (
                      <ItemRow
                        key={it.id}
                        item={it}
                        isLast={idx === g.items.length - 1}
                        onToggle={() => toggleChecked(it.id)}
                        onClaim={() => toggleClaim(it.id)}
                        onFav={() => addFavoriteFromItem(it)}
                        onRemove={() => removeItem(it.id)}
                        isFav={favorites.some(f => f.name.toLowerCase() === it.name.toLowerCase())}
                        currentUser={name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {doneItems.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={styles.doneHeader}>
                <span>KØBT · {doneItems.length}</span>
                <button onClick={clearChecked} style={styles.clearBtn}>
                  <Trash2 size={12} /> Ryd
                </button>
              </div>
              <div style={{ ...styles.itemsCard, opacity: 0.6 }}>
                {doneItems.map((it, idx) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    isLast={idx === doneItems.length - 1}
                    onToggle={() => toggleChecked(it.id)}
                    onClaim={() => toggleClaim(it.id)}
                    onFav={() => addFavoriteFromItem(it)}
                    onRemove={() => removeItem(it.id)}
                    isFav={favorites.some(f => f.name.toLowerCase() === it.name.toLowerCase())}
                    currentUser={name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- FAVORITES TAB ---------------- */}
      {tab === "favoritter" && (
        <div>
          <div style={styles.sectionLabel}>Faste varer — ét tryk for at tilføje</div>
          {favorites.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, color: INK }}>Ingen favoritter endnu</div>
              <div style={{ fontSize: 13, color: INK_MUTED, marginTop: 2 }}>
                Tryk på stjernen ud for en vare på listen for at gemme den her.
              </div>
            </div>
          ) : (
            <div style={styles.favGrid}>
              {favorites.map(f => (
                <div key={f.id} style={styles.favChip}>
                  <button onClick={() => addFromFavorite(f)} style={styles.favChipBtn}>
                    <span style={{ fontSize: 18 }}>{CAT_BY_KEY[f.category].emoji}</span>
                    <span style={{ fontFamily: BODY, fontSize: 13.5, color: INK, fontWeight: 500 }}>{f.name}</span>
                  </button>
                  <button onClick={() => removeFavorite(f.id)} style={styles.favRemove} aria-label="Fjern favorit">
                    <X size={12} color={INK_MUTED} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- STORES TAB ---------------- */}
      {tab === "butikker" && (
        <div>
          <div style={styles.sectionLabel}>Dit navn</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <input
              value={name ? name : nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nameDraft.trim()) persistName(nameDraft.trim()); }}
              placeholder="Marcus"
              style={{ ...styles.addInput, fontSize: 14 }}
            />
            <button
              onClick={() => { if (nameDraft.trim()) persistName(nameDraft.trim()); }}
              style={{ ...styles.addBtn, width: 42, height: 42 }}
            >
              <Check size={16} color="#fff" />
            </button>
          </div>

          <div style={styles.sectionLabel}>Vælg butik</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {STORES.map(s => (
              <div key={s.key} style={{ ...styles.storeRow, borderColor: store === s.key ? s.color : LINE }}>
                <button onClick={() => persistStore(s.key)} style={styles.storeRowBtn}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                  <span style={{ fontFamily: DISPLAY, fontSize: 14.5, color: INK, flex: 1, textAlign: "left" }}>{s.label}</span>
                  {store === s.key && <Check size={16} color={s.color} />}
                </button>
                <button onClick={() => setEditingRoute(editingRoute === s.key ? null : s.key)} style={styles.editRouteBtn}>
                  <MapPin size={12} /> Rute
                </button>
              </div>
            ))}
          </div>

          {editingRoute && (
            <div style={{ marginBottom: 24 }}>
              <div style={styles.sectionLabel}>
                {STORES.find(s => s.key === editingRoute).label} — din rute (træk rækkefølgen til hvordan du går)
              </div>
              <div style={styles.itemsCard}>
                {orders[editingRoute].map((catKey, idx) => (
                  <div key={catKey} style={styles.routeRow}>
                    <span style={styles.routeIndex}>{idx + 1}</span>
                    <span style={{ fontSize: 15 }}>{CAT_BY_KEY[catKey].emoji}</span>
                    <span style={{ fontFamily: BODY, fontSize: 13.5, color: INK, flex: 1 }}>{CAT_BY_KEY[catKey].label}</span>
                    <button onClick={() => moveCategory(editingRoute, idx, -1)} style={styles.arrowBtn} disabled={idx === 0}>
                      <ChevronUp size={14} color={idx === 0 ? LINE : INK_MUTED} />
                    </button>
                    <button onClick={() => moveCategory(editingRoute, idx, 1)} style={styles.arrowBtn} disabled={idx === orders[editingRoute].length - 1}>
                      <ChevronDown size={14} color={idx === orders[editingRoute].length - 1 ? LINE : INK_MUTED} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.noteBox}>
            <Users size={14} color={INK_MUTED} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {activeBoard.kind === "shared"
                ? `Denne liste deles med alle der bruger koden "${activeBoard.code}". `
                : "Denne liste er kun din, gemt på denne enhed. "}
              Dit navn, din valgte butik og butiksruten er personlige og gælder for alle dine lister.
            </span>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={styles.nav}>
        <NavBtn icon={<Home size={19} />} label="Hjem" active={false} onClick={goHome} />
        <NavBtn icon={<ShoppingCart size={19} />} label="Liste" active={tab === "liste"} onClick={() => setTab("liste")} badge={activeItems.length} />
        <NavBtn icon={<Star size={19} />} label="Favoritter" active={tab === "favoritter"} onClick={() => setTab("favoritter")} />
        <NavBtn icon={<Store size={19} />} label="Butikker" active={tab === "butikker"} onClick={() => setTab("butikker")} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Subcomponents
--------------------------------------------------------------- */

function ItemRow({ item, isLast, onToggle, onClaim, onFav, onRemove, isFav, currentUser }) {
  return (
    <div style={{ ...styles.itemRow, borderBottom: isLast ? "none" : `0.5px solid ${LINE}` }}>
      <button onClick={onToggle} style={styles.checkbox(item.checked)} aria-label={item.checked ? "Marker som ikke købt" : "Marker som købt"}>
        {item.checked && <Check size={13} color="#fff" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: BODY, fontSize: 14.5, color: item.checked ? INK_MUTED : INK,
          textDecoration: item.checked ? "line-through" : "none", fontWeight: 500,
        }}>
          {item.name}
        </div>
        {item.claimedBy && (
          <div style={{ fontFamily: BODY, fontSize: 11.5, color: CLAIMED, marginTop: 1 }}>
            {item.claimedBy} tager den
          </div>
        )}
      </div>
      {item.qty > 1 && <span style={styles.qtyBadge}>× {item.qty}</span>}
      <button onClick={onClaim} style={styles.iconBtn(item.claimedBy === currentUser)} aria-label="Reserver">
        <User size={13} color={item.claimedBy === currentUser ? CLAIMED : INK_MUTED} />
      </button>
      <button onClick={onFav} style={styles.iconBtn(isFav)} aria-label="Tilføj til favoritter">
        <Star size={13} color={isFav ? AMBER : INK_MUTED} fill={isFav ? AMBER : "none"} />
      </button>
      <button onClick={onRemove} style={styles.iconBtn(false)} aria-label="Fjern">
        <X size={13} color={INK_MUTED} />
      </button>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={styles.navBtn(active)}>
      <div style={{ position: "relative" }}>
        <span style={{ color: active ? PRIMARY : INK_MUTED }}>{icon}</span>
        {!!badge && (
          <span style={styles.navBadge}>{badge}</span>
        )}
      </div>
      <span style={{ fontSize: 10.5, fontFamily: BODY, fontWeight: 600, color: active ? PRIMARY : INK_MUTED, letterSpacing: 0.2 }}>
        {label}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------
   Design tokens & styles
--------------------------------------------------------------- */

const BG = "#F5F6F0";
const INK = "#16211B";
const INK_MUTED = "#948C7C";
const LINE = "#E4E1D6";
const PRIMARY = "#1F6F4A";
const PRIMARY_DARK = "#14492F";
const AMBER = "#D99416";
const CLAIMED = "#3D6FE0";
const CARD = "#FFFFFF";

const DISPLAY = "'Space Grotesk', 'Inter', sans-serif";
const BODY = "'Inter', sans-serif";
const MONO = "'IBM Plex Mono', monospace";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`;

const styles = {
  page: {
    fontFamily: BODY, background: BG, color: INK, maxWidth: 460, margin: "0 auto",
    padding: "20px 16px 84px", borderRadius: 18, position: "relative", minHeight: 480,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 10 },
  eyebrow: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.5, color: PRIMARY, textTransform: "uppercase", marginBottom: 2 },
  h1: { fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, margin: 0, color: INK, letterSpacing: -0.3 },
  backBtn: {
    width: 32, height: 32, borderRadius: "50%", border: `0.5px solid ${LINE}`, background: CARD,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  },
  storePill: {
    display: "flex", alignItems: "center", gap: 6, background: CARD, border: "1.5px solid",
    borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontFamily: BODY, fontSize: 12.5, fontWeight: 600, flexShrink: 0,
  },
  boardRow: { display: "flex", alignItems: "center", background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 12, overflow: "hidden" },
  boardRowBtn: { flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "13px 14px", cursor: "pointer", minWidth: 0 },
  boardName: { fontFamily: DISPLAY, fontSize: 14.5, color: INK, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  boardCode: { fontFamily: MONO, fontSize: 10.5, color: INK_MUTED, marginLeft: "auto", flexShrink: 0 },
  boardDelete: { width: 34, height: 34, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  newBoardBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12,
    border: `1.5px dashed ${LINE}`, background: "none", color: INK_MUTED, fontFamily: BODY, fontSize: 13.5,
    fontWeight: 600, cursor: "pointer",
  },
  newBoardInline: { display: "flex", gap: 8 },
  addBar: { display: "flex", gap: 8, marginBottom: 14 },
  addInput: {
    flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${LINE}`, background: CARD,
    padding: "0 14px", fontFamily: BODY, fontSize: 15, color: INK, outline: "none",
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 12, background: PRIMARY, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  },
  hintBox: {
    display: "flex", gap: 8, alignItems: "flex-start", background: "#FBF3DE", border: "1px solid #F0DCA0",
    borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "#6B5115", marginBottom: 16, lineHeight: 1.5,
  },
  hintClose: { background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 },
  empty: { textAlign: "center", padding: "40px 20px", color: INK_MUTED },
  route: { position: "relative" },
  aisleBlock: { display: "flex", gap: 10, position: "relative" },
  aisleDot: { width: 8, height: 8, borderRadius: "50%", background: PRIMARY, marginTop: 8, flexShrink: 0, position: "relative", zIndex: 1 },
  aisleLine: { position: "absolute", left: 3, top: 16, bottom: -12, width: 1.5, background: LINE },
  aisleContent: { flex: 1, minWidth: 0, marginBottom: 18 },
  aisleSign: { display: "flex", alignItems: "center", gap: 7, marginBottom: 8, marginTop: 1 },
  aisleLabel: { fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.6, color: PRIMARY_DARK },
  aisleCount: { fontFamily: MONO, fontSize: 10.5, color: INK_MUTED, marginLeft: "auto", background: "#EDEBE0", padding: "1px 7px", borderRadius: 10 },
  itemsCard: { background: CARD, borderRadius: 12, border: `0.5px solid ${LINE}`, overflow: "hidden" },
  itemRow: { display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" },
  checkbox: (checked) => ({
    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
    border: checked ? "none" : `2px solid ${LINE}`, background: checked ? PRIMARY : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  }),
  qtyBadge: { fontFamily: MONO, fontSize: 11.5, color: PRIMARY_DARK, background: "#E7F1EB", padding: "2px 7px", borderRadius: 8, flexShrink: 0 },
  iconBtn: (on) => ({
    width: 24, height: 24, borderRadius: 7, border: "none", background: on ? "#F0EEE3" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0,
  }),
  doneHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: MONO,
    fontSize: 10.5, letterSpacing: 1, color: INK_MUTED, marginBottom: 8, padding: "0 2px",
  },
  clearBtn: { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: INK_MUTED, fontFamily: BODY, fontSize: 11, cursor: "pointer" },
  sectionLabel: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: INK_MUTED, textTransform: "uppercase", marginBottom: 10 },
  favGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  favChip: { display: "flex", alignItems: "center", background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 20, paddingRight: 4 },
  favChipBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "8px 6px 8px 12px", cursor: "pointer" },
  favRemove: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" },
  storeRow: { display: "flex", alignItems: "center", background: CARD, border: "1.5px solid", borderRadius: 12, overflow: "hidden" },
  storeRowBtn: { flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "12px 14px", cursor: "pointer" },
  editRouteBtn: { display: "flex", alignItems: "center", gap: 4, background: "#F0EEE3", border: "none", height: "100%", padding: "0 12px", alignSelf: "stretch", fontFamily: BODY, fontSize: 11, fontWeight: 600, color: INK_MUTED, cursor: "pointer" },
  routeRow: { display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderBottom: `0.5px solid ${LINE}` },
  routeIndex: { fontFamily: MONO, fontSize: 11, color: INK_MUTED, width: 14 },
  arrowBtn: { background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex" },
  noteBox: { display: "flex", gap: 8, fontSize: 12, color: INK_MUTED, lineHeight: 1.5, padding: "0 2px" },
  nav: {
    position: "absolute", left: 12, right: 12, bottom: 12, height: 60, background: CARD,
    border: `0.5px solid ${LINE}`, borderRadius: 16, display: "flex", boxShadow: "0 2px 12px rgba(20,20,10,0.06)",
  },
  navBtn: (active) => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 3, background: "none", border: "none", cursor: "pointer",
  }),
  navBadge: {
    position: "absolute", top: -5, right: -8, background: AMBER, color: "#fff", fontSize: 9, fontWeight: 700,
    borderRadius: 8, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
  },
};
