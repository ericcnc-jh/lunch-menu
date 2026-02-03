(function () {
  const DEFAULT_DELIVERY = [
    '문정김밥', '뜸들이다', '맥도날드', '압구정 샌드위치', '롯데리아', '버거킹',
    '오늘애김밥', '오예술김밥', '밥풀릭스', '버텍스닭고기덮밥', '스쿨푸드', '본도시락',
    '서브웨이', '롤링파스타', '돈까스', '마녀김밥', '밀밭', '쿠차라', '버거앤타코', '날쌘김밥'
  ];
  const DEFAULT_EATOUT = [
    '부대찌개', '제육', '냉면집', '짬뽕집', '베트남쌀국수집', '스시집', '닭곰탕집',
    '소표국수', '돈까스호니도니', '태중해장국'
  ];

  const STORAGE_MENUS = 'lunchCalendarMenus';
  const STORAGE_CANDIDATES = 'lunchCalendarCandidates';
  const SHARED_ROW_ID = 'default';

  let supabase = null;
  function getSupabase() {
    if (supabase !== null) return supabase;
    const cfg = typeof window !== 'undefined' && window.__SUPABASE__;
    if (cfg && cfg.url && cfg.anonKey && typeof window.supabase !== 'undefined') {
      try {
        supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
        return supabase;
      } catch (_) {}
    }
    return null;
  }

  function isShared() {
    return !!getSupabase();
  }

  let state = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    menus: {},
    candidates: { delivery: [...DEFAULT_DELIVERY], eatout: [...DEFAULT_EATOUT] },
    dirty: false,
    candidateSort: { delivery: 'asc', eatout: 'asc' }
  };

  function setDirty(value) {
    state.dirty = !!value;
    updateSaveButton();
  }

  function updateSaveButton() {
    var btn = document.getElementById('saveToServerBtn');
    var label = document.getElementById('saveToServerLabel');
    if (!btn) return;
    if (isShared()) {
      btn.hidden = false;
      btn.disabled = !state.dirty;
      if (label) label.textContent = state.dirty ? '저장되지 않은 변경이 있습니다' : '저장됨';
    } else {
      btn.hidden = true;
    }
  }

  function loadMenusFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_MENUS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function loadCandidatesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_CANDIDATES);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          delivery: parsed.delivery && parsed.delivery.length ? parsed.delivery : [...DEFAULT_DELIVERY],
          eatout: parsed.eatout && parsed.eatout.length ? parsed.eatout : [...DEFAULT_EATOUT]
        };
      }
    } catch (_) {}
    return { delivery: [...DEFAULT_DELIVERY], eatout: [...DEFAULT_EATOUT] };
  }

  async function loadFromSupabase() {
    const sb = getSupabase();
    if (!sb) return false;
    const { data, error } = await sb.from('shared_calendar').select('menus, candidates').eq('id', SHARED_ROW_ID).single();
    if (error || !data) return false;
    state.menus = data.menus || {};
    state.candidates = {
      delivery: (data.candidates && data.candidates.delivery && data.candidates.delivery.length) ? data.candidates.delivery : [...DEFAULT_DELIVERY],
      eatout: (data.candidates && data.candidates.eatout && data.candidates.eatout.length) ? data.candidates.eatout : [...DEFAULT_EATOUT]
    };
    state.dirty = false;
    return true;
  }

  async function saveToSupabase() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('shared_calendar').upsert({
      id: SHARED_ROW_ID,
      menus: state.menus,
      candidates: state.candidates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  }

  function saveMenus() {
    localStorage.setItem(STORAGE_MENUS, JSON.stringify(state.menus));
    setDirty(true);
  }

  function saveCandidates() {
    localStorage.setItem(STORAGE_CANDIDATES, JSON.stringify(state.candidates));
    setDirty(true);
  }

  async function saveToServer() {
    if (!isShared() || !state.dirty) return;
    try {
      await saveToSupabase();
      state.dirty = false;
      updateSaveButton();
      var label = document.getElementById('saveToServerLabel');
      if (label) label.textContent = '저장됨';
      setTimeout(function () {
        if (label && !state.dirty) label.textContent = '';
      }, 2000);
    } catch (_) {
      var label = document.getElementById('saveToServerLabel');
      if (label) label.textContent = '저장 실패';
    }
  }

  function monthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  function dateKey(year, month, date) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  }

  function getDayOfWeek(year, month, date) {
    return new Date(year, month, date).getDay();
  }

  function isWeekday(year, month, date) {
    const d = getDayOfWeek(year, month, date);
    return d >= 1 && d <= 5;
  }

  /** 문자열 시드로 항상 같은 순서의 난수를 만듦 → 누가 열어도 같은 달력 */
  function createSeededRandom(seedStr) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) {
      h = ((h << 5) - h + seedStr.charCodeAt(i)) | 0;
    }
    let state = (h >>> 0) || 1;
    return function () {
      state = Math.imul(48271, state) % 2147483647;
      return state / 2147483647;
    };
  }

  function shuffle(arr, random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** 해당 날짜가 속한 주의 월요일 날짜 문자열 (환경마다 동일하게 쓰기 위함) */
  function getWeekId(year, month, date) {
    const d = new Date(year, month, date);
    const day = d.getDay();
    const monOffset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + monOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** 같은 연·월이면 누가 열어도 동일한 메뉴가 나오도록 기본 목록 + 시드 사용 */
  function generateMonthMenus(year, month) {
    const key = monthKey(year, month);
    const random = createSeededRandom(key);
    const delivery = [...DEFAULT_DELIVERY];
    const eatout = [...DEFAULT_EATOUT];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = {};

    const weekWeekdays = {};
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isWeekday(year, month, d)) continue;
      const wk = getWeekId(year, month, d);
      if (!weekWeekdays[wk]) weekWeekdays[wk] = [];
      weekWeekdays[wk].push(d);
    }

    const weekKeys = Object.keys(weekWeekdays).sort();
    weekKeys.forEach(wk => {
      const days = weekWeekdays[wk];
      const n = days.length;
      const numDelivery = n === 5 ? (random() < 0.5 ? 3 : 4) : Math.min(3, n);
      const numEatout = n - numDelivery;

      const shuffledD = shuffle(delivery, random);
      const shuffledE = shuffle(eatout, random);
      const pickD = shuffledD.slice(0, numDelivery);
      const pickE = shuffledE.slice(0, numEatout);
      const combined = shuffle([...pickD.map(name => ({ name, type: 'delivery' })), ...pickE.map(name => ({ name, type: 'eatout' }))], random);

      days.forEach((date, i) => {
        const item = combined[i];
        if (item) result[String(date)] = item;
      });
    });

    state.menus[key] = result;
    saveMenus();
  }

  function ensureMonthGenerated(year, month) {
    const key = monthKey(year, month);
    if (!state.menus[key] || Object.keys(state.menus[key]).length === 0) {
      generateMonthMenus(year, month);
    }
  }

  function getMenuForDay(year, month, date) {
    if (!isWeekday(year, month, date)) return null;
    const key = monthKey(year, month);
    ensureMonthGenerated(year, month);
    return state.menus[key][String(date)] || null;
  }

  function setMenuForDay(year, month, date, name, type) {
    const key = monthKey(year, month);
    ensureMonthGenerated(year, month);
    state.menus[key][String(date)] = { name, type };
    saveMenus();
  }

  function renderCalendar() {
    const { currentYear, currentMonth } = state;
    ensureMonthGenerated(currentYear, currentMonth);

    const first = new Date(currentYear, currentMonth, 1);
    const last = new Date(currentYear, currentMonth + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const isToday = (y, m, d) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate();

    let html = '';
    let dayCount = 0;

    for (let i = 0; i < startPad; i++) {
      const d = prevMonthDays - startPad + i + 1;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const menu = getMenuForDay(prevY, prevM, d);
      const weekend = getDayOfWeek(prevY, prevM, d) === 0 || getDayOfWeek(prevY, prevM, d) === 6;
      html += `<div class="day-cell other-month weekend-${weekend}" data-year="${prevY}" data-month="${prevM}" data-date="${d}">
        <span class="day-num">${d}</span>
        <div class="day-menu ${menu ? menu.type : 'empty'}">${menu ? menu.name : '—'}</div>
      </div>`;
      dayCount++;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = getDayOfWeek(currentYear, currentMonth, d);
      const weekend = dow === 0 || dow === 6;
      const menu = getMenuForDay(currentYear, currentMonth, d);
      const todayClass = isToday(currentYear, currentMonth, d) ? ' today' : '';
      const weekendClass = weekend ? ' weekend' : '';
      html += `<div class="day-cell${todayClass}${weekendClass}" data-year="${currentYear}" data-month="${currentMonth}" data-date="${d}">
        <span class="day-num">${d}</span>
        <div class="day-menu ${menu ? menu.type : 'empty'}">${menu ? menu.name : '—'}</div>
      </div>`;
      dayCount++;
    }

    const remaining = 42 - dayCount;
    for (let i = 0; i < remaining; i++) {
      const d = i + 1;
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const menu = getMenuForDay(nextY, nextM, d);
      const weekend = getDayOfWeek(nextY, nextM, d) === 0 || getDayOfWeek(nextY, nextM, d) === 6;
      html += `<div class="day-cell other-month weekend-${weekend}" data-year="${nextY}" data-month="${nextM}" data-date="${d}">
        <span class="day-num">${d}</span>
        <div class="day-menu ${menu ? menu.type : 'empty'}">${menu ? menu.name : '—'}</div>
      </div>`;
    }

    document.getElementById('calendar').innerHTML = html;

    document.querySelectorAll('.day-cell').forEach(cell => {
      cell.addEventListener('click', () => openChangeModal(
        +cell.dataset.year,
        +cell.dataset.month,
        +cell.dataset.date
      ));
    });
  }

  function openChangeModal(year, month, date) {
    const modal = document.getElementById('changeModal');
    document.getElementById('modalTitle').textContent = '메뉴 변경';
    document.getElementById('modalDate').textContent = `${year}년 ${month + 1}월 ${date}일`;

    function makeList(type, listId) {
      const ul = document.getElementById(listId);
      ul.innerHTML = state.candidates[type].map(name =>
        `<li data-name="${name}" data-type="${type}">${name}</li>`
      ).join('');
      ul.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          setMenuForDay(year, month, date, li.dataset.name, li.dataset.type);
          modal.classList.remove('is-open');
          renderCalendar();
        });
      });
    }
    makeList('delivery', 'modalDeliveryList');
    makeList('eatout', 'modalEatoutList');

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = document.getElementById('changeModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function updateMonthLabel() {
    const m = state.currentMonth + 1;
    document.getElementById('currentMonth').textContent = `${state.currentYear}년 ${m}월`;
  }

  function updateTodayLabel() {
    const t = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('todayLabel').textContent = `오늘: ${t.toLocaleDateString('ko-KR', options)}`;
  }

  function sortCandidates(type) {
    const order = state.candidateSort[type] === 'asc' ? 'desc' : 'asc';
    state.candidateSort[type] = order;
    const arr = [...state.candidates[type]];
    arr.sort(function (a, b) {
      return a.localeCompare(b, 'ko');
    });
    if (order === 'desc') arr.reverse();
    state.candidates[type] = arr;
    saveCandidates();
    renderSidebarLists();
    updateSortButtonLabels();
  }

  function updateSortButtonLabels() {
    var deliveryBtn = document.getElementById('sortDeliveryBtn');
    var eatoutBtn = document.getElementById('sortEatoutBtn');
    if (deliveryBtn) deliveryBtn.textContent = state.candidateSort.delivery === 'asc' ? '가나다순 ↑' : '역순 ↓';
    if (eatoutBtn) eatoutBtn.textContent = state.candidateSort.eatout === 'asc' ? '가나다순 ↑' : '역순 ↓';
  }

  function renderSidebarLists() {
    function listHtml(type, listId) {
      const ul = document.getElementById(listId);
      ul.innerHTML = state.candidates[type].map(function (name) {
        return '<li><span>' + name + '</span><button type="button" class="remove-btn" data-type="' + type + '" data-name="' + name + '" aria-label="삭제">×</button></li>';
      }).join('');
      ul.querySelectorAll('.remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          removeMenu(btn.dataset.type, btn.dataset.name);
        });
      });
    }
    listHtml('delivery', 'deliveryList');
    listHtml('eatout', 'eatoutList');
    updateSortButtonLabels();
  }

  function addMenu() {
    const category = document.getElementById('addCategory').value;
    const name = document.getElementById('newMenuName').value.trim();
    if (!name) return;
    if (state.candidates[category].includes(name)) return;
    state.candidates[category].push(name);
    saveCandidates();
    document.getElementById('newMenuName').value = '';
    renderSidebarLists();
  }

  function removeMenu(type, name) {
    state.candidates[type] = state.candidates[type].filter(m => m !== name);
    saveCandidates();
    renderSidebarLists();
    renderCalendar();
  }

  function prevMonth() {
    if (state.currentMonth === 0) {
      state.currentMonth = 11;
      state.currentYear--;
    } else {
      state.currentMonth--;
    }
    updateMonthLabel();
    renderCalendar();
  }

  function nextMonth() {
    if (state.currentMonth === 11) {
      state.currentMonth = 0;
      state.currentYear++;
    } else {
      state.currentMonth++;
    }
    updateMonthLabel();
    renderCalendar();
  }

  /** 이 달을 시드 기반으로 다시 생성 → 다른 사람들과 동일한 달력으로 맞춤 */
  function resetCurrentMonth() {
    const key = monthKey(state.currentYear, state.currentMonth);
    delete state.menus[key];
    saveMenus();
    generateMonthMenus(state.currentYear, state.currentMonth);
    renderCalendar();
  }

  function setBanners() {
    var bannerLocal = document.getElementById('bannerLocal');
    var bannerSync = document.getElementById('bannerSync');
    var hintShare = document.getElementById('hintShare');
    if (isShared()) {
      if (bannerLocal) bannerLocal.hidden = true;
      if (bannerSync) { bannerSync.hidden = false; }
      if (hintShare) hintShare.textContent = '메뉴·후보를 바꾼 뒤 "서버에 저장"을 누르면 팀원에게 반영됩니다.';
    } else {
      if (bannerLocal) { bannerLocal.hidden = false; }
      if (bannerSync) bannerSync.hidden = true;
      if (hintShare) hintShare.textContent = '같은 달은 누가 열어도 동일한 메뉴가 나옵니다. 팀 공유를 쓰려면 Supabase를 설정하세요.';
    }
  }

  async function init() {
    var loaded = false;
    if (isShared()) {
      try {
        loaded = await loadFromSupabase();
      } catch (_) {}
    }
    if (!loaded) {
      state.menus = loadMenusFromStorage();
      state.candidates = loadCandidatesFromStorage();
    }
    setBanners();
    updateSaveButton();
    updateMonthLabel();
    updateTodayLabel();
    renderCalendar();
    renderSidebarLists();

    document.getElementById('prevMonth').addEventListener('click', prevMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    document.getElementById('addMenuBtn').addEventListener('click', addMenu);
    document.getElementById('newMenuName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addMenu();
    });
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeModal);
    document.getElementById('resetMonth').addEventListener('click', resetCurrentMonth);
    var saveBtn = document.getElementById('saveToServerBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveToServer);
    var sortDeliveryBtn = document.getElementById('sortDeliveryBtn');
    var sortEatoutBtn = document.getElementById('sortEatoutBtn');
    if (sortDeliveryBtn) sortDeliveryBtn.addEventListener('click', function () { sortCandidates('delivery'); });
    if (sortEatoutBtn) sortEatoutBtn.addEventListener('click', function () { sortCandidates('eatout'); });
  }

  init();
})();
