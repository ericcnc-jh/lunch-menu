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

  let state = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    menus: loadMenus(),
    candidates: loadCandidates()
  };

  function loadMenus() {
    try {
      const raw = localStorage.getItem(STORAGE_MENUS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveMenus() {
    localStorage.setItem(STORAGE_MENUS, JSON.stringify(state.menus));
  }

  function loadCandidates() {
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

  function saveCandidates() {
    localStorage.setItem(STORAGE_CANDIDATES, JSON.stringify(state.candidates));
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

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getWeekNumber(year, month, date) {
    const d = new Date(year, month, date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d - start;
    const oneDay = 86400000;
    return Math.ceil((diff / oneDay + start.getDay() + 1) / 7);
  }

  function generateMonthMenus(year, month) {
    const key = monthKey(year, month);
    const delivery = [...state.candidates.delivery];
    const eatout = [...state.candidates.eatout];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = {};

    const weekWeekdays = {};
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isWeekday(year, month, d)) continue;
      const wk = getWeekNumber(year, month, d);
      if (!weekWeekdays[wk]) weekWeekdays[wk] = [];
      weekWeekdays[wk].push(d);
    }

    Object.keys(weekWeekdays).forEach(wk => {
      const days = weekWeekdays[wk];
      const n = days.length;
      const numDelivery = n === 5 ? (Math.random() < 0.5 ? 3 : 4) : Math.min(3, n);
      const numEatout = n - numDelivery;

      const shuffledD = shuffle(delivery);
      const shuffledE = shuffle(eatout);
      const pickD = shuffledD.slice(0, numDelivery);
      const pickE = shuffledE.slice(0, numEatout);
      const combined = shuffle([...pickD.map(name => ({ name, type: 'delivery' })), ...pickE.map(name => ({ name, type: 'eatout' }))]);

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

  function renderSidebarLists() {
    function listHtml(type, listId) {
      const ul = document.getElementById(listId);
      ul.innerHTML = state.candidates[type].map((name, i) => {
        const canRemove = (type === 'delivery' && !DEFAULT_DELIVERY.includes(name)) ||
          (type === 'eatout' && !DEFAULT_EATOUT.includes(name));
        return `<li>
          <span>${name}</span>
          ${canRemove ? `<button type="button" class="remove-btn" data-type="${type}" data-name="${name}" aria-label="삭제">×</button>` : ''}
        </li>`;
      }).join('');
      ul.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeMenu(btn.dataset.type, btn.dataset.name));
      });
    }
    listHtml('delivery', 'deliveryList');
    listHtml('eatout', 'eatoutList');
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

  function init() {
    updateMonthLabel();
    updateTodayLabel();
    renderCalendar();
    renderSidebarLists();

    document.getElementById('prevMonth').addEventListener('click', prevMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    document.getElementById('addMenuBtn').addEventListener('click', addMenu);
    document.getElementById('newMenuName').addEventListener('keydown', e => {
      if (e.key === 'Enter') addMenu();
    });
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  }

  init();
})();
