/* script.js */

/** @typedef {{ id: string, text: string, completed: boolean, dueDate: string|null, createdAt: number }} Todo */

(() => {
  // ===== State & Constants =====
  /** @type {Todo[]} */
  let todos = [];
  let activeFilter = 'all'; // 'all' | 'active' | 'completed'
  let countdownTimerId = null;

  const LS_KEYS = {
    ITEMS: 'todo.items',
    FILTER: 'todo.filter',
    THEME: 'todo.theme'
  };

  // ===== DOM =====
  const $html = document.documentElement;
  const $input = document.getElementById('todo-input');
  const $date = document.getElementById('todo-date');
  const $add = document.getElementById('add-button');
  const $list = document.getElementById('todo-list');
  const $progressText = document.getElementById('progress-text');
  const $progressBar = document.getElementById('progress-bar');
  const $counter = document.getElementById('todo-counter');
  const $clearCompleted = document.getElementById('clear-completed');
  const $themeToggle = document.getElementById('theme-toggle');
  const $filterSection = document.querySelector('.filter-section');

  // ===== Utils =====
  const nowMs = () => Date.now();
  const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const parseDueDateEndOfDay = (isoDateStr) => {
    // Expect "YYYY-MM-DD"
    if (!isoDateStr) return null;
    const dt = new Date(`${isoDateStr}T23:59:59`);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmt2 = (n) => String(n).padStart(2, '0');

  // ===== Storage =====
  function loadTodos() {
    try {
      const raw = localStorage.getItem(LS_KEYS.ITEMS);
      todos = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      todos = [];
    }
    const storedFilter = localStorage.getItem(LS_KEYS.FILTER);
    activeFilter = storedFilter === 'active' || storedFilter === 'completed' ? storedFilter : 'all';
  }

  function saveTodos() {
    localStorage.setItem(LS_KEYS.ITEMS, JSON.stringify(todos));
  }

  // ===== Theme =====
  function setTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    $html.setAttribute('data-theme', t);
    localStorage.setItem(LS_KEYS.THEME, t);
    if ($themeToggle) {
      $themeToggle.setAttribute('aria-pressed', String(t === 'dark'));
      $themeToggle.setAttribute('aria-label', t === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema');
      $themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
    }
  }

  function initTheme() {
    const stored = localStorage.getItem(LS_KEYS.THEME);
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  // ===== CRUD =====
  function addTodo(text, dueDateStr) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    /** @type {Todo} */
    const todo = {
      id: uuid(),
      text: trimmed,
      completed: false,
      dueDate: dueDateStr && dueDateStr.trim() ? dueDateStr.trim() : null,
      createdAt: nowMs()
    };
    todos.unshift(todo);
    saveTodos();

    // Render only the new item if it matches current filter; else full renderList for simplicity
    if (matchesFilter(todo, activeFilter)) {
      const node = renderItem(todo);
      if (node) {
        node.classList.add('enter');
        requestAnimationFrame(() => node.classList.remove('enter'));
        $list.prepend(node);
      }
    } else {
      renderList();
    }
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  function updateTodo(id, partial) {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return;
    todos[idx] = { ...todos[idx], ...partial };
    saveTodos();
    // Update DOM node directly if present
    const li = $list.querySelector(`.todo-item[data-id="${id}"]`);
    if (li) {
      renderItemInto(todos[idx], li);
    } else {
      // If not present (filtered out), re-render list to reflect changes if it now qualifies under filter
      renderList();
    }
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  function deleteTodo(id) {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return;
    todos.splice(idx, 1);
    saveTodos();

    const li = $list.querySelector(`.todo-item[data-id="${id}"]`);
    if (li) {
      li.classList.add('exit');
      li.addEventListener('transitionend', () => li.remove(), { once: true });
    }
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  function toggleComplete(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos();

    const li = $list.querySelector(`.todo-item[data-id="${id}"]`);
    if (li) {
      li.classList.toggle('completed', todo.completed);
      li.classList.toggle('is-completed', todo.completed);
      li.setAttribute('aria-checked', String(todo.completed));
      // Update check icon visibility, countdown styling unaffected
      // If current filter hides this state, remove from DOM
      if (!matchesFilter(todo, activeFilter)) {
        li.classList.add('exit');
        li.addEventListener('transitionend', () => li.remove(), { once: true });
      } else {
        // Repaint any text style changes
        renderItemInto(todo, li);
      }
    } else {
      renderList();
    }
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  // ===== Filter =====
  function matchesFilter(todo, filter) {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return !!todo.completed;
    return true; // 'all'
  }

  function applyFilter(filter) {
    activeFilter = (filter === 'active' || filter === 'completed') ? filter : 'all';
    localStorage.setItem(LS_KEYS.FILTER, activeFilter);
    // Toggle active class on buttons
    document.querySelectorAll('.filter-button').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      btn.classList.toggle('active', f === activeFilter);
    });
    renderList();
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  // ===== Render =====
  function renderList() {
    // Snapshot scroll to avoid jumpiness
    const prev = { top: $list.scrollTop };

    $list.innerHTML = '';
    const frag = document.createDocumentFragment();
    todos.forEach(todo => {
      if (!matchesFilter(todo, activeFilter)) return;
      const el = renderItem(todo);
      if (el) frag.appendChild(el);
    });
    $list.appendChild(frag);

    // Restore scroll
    $list.scrollTop = prev.top;
  }

  function renderItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.id = todo.id;
    li.setAttribute('role', 'listitem');
    if (todo.completed) {
      li.classList.add('completed', 'is-completed');
      li.setAttribute('aria-checked', 'true');
    } else {
      li.setAttribute('aria-checked', 'false');
    }

    // Check button
    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-button';
    checkBtn.setAttribute('type', 'button');
    checkBtn.setAttribute('data-action', 'toggle');
    checkBtn.setAttribute('aria-label', 'Marker som fullført');
    // Optional check icon
    const checkIcon = document.createElement('img');
    checkIcon.alt = '';
    checkIcon.src = './images/check-icon.png';
    checkBtn.appendChild(checkIcon);

    // Text
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;
    textSpan.title = todo.text;

    // Meta (due + countdown)
    const meta = document.createElement('div');
    meta.className = 'todo-meta';
    meta.style.fontSize = '12px';
    meta.style.color = 'var(--gray-dark)';

    const due = document.createElement('div');
    due.className = 'todo-due';
    due.setAttribute('data-role', 'due');
    due.textContent = todo.dueDate ? `Frist: ${todo.dueDate}` : 'Ingen frist';

    const countdown = document.createElement('div');
    countdown.className = 'todo-countdown';
    countdown.setAttribute('data-role', 'countdown');
    // Filled by countdown tick

    meta.appendChild(due);
    meta.appendChild(countdown);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-button edit-button';
    editBtn.setAttribute('type', 'button');
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('aria-label', 'Rediger oppgave');
    const editIcon = document.createElement('img');
    editIcon.alt = '';
    editIcon.src = './images/edit-icon.png';
    editBtn.appendChild(editIcon);

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-button delete-button';
    delBtn.setAttribute('type', 'button');
    delBtn.setAttribute('data-action', 'delete');
    delBtn.setAttribute('aria-label', 'Slett oppgave');
    const delIcon = document.createElement('img');
    delIcon.alt = '';
    delIcon.src = './images/delete-icon.png';
    delBtn.appendChild(delIcon);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // Compose
    li.appendChild(checkBtn);
    li.appendChild(textSpan);
    li.appendChild(meta);
    li.appendChild(actions);

    // Initial countdown render
    paintCountdown(todo, countdown);

    return li;
  }

  function renderItemInto(todo, li) {
    li.classList.toggle('completed', todo.completed);
    li.classList.toggle('is-completed', todo.completed);
    li.setAttribute('aria-checked', String(todo.completed));

    const textSpan = li.querySelector('.todo-text');
    if (textSpan && textSpan.textContent !== todo.text) {
      textSpan.textContent = todo.text;
      textSpan.title = todo.text;
    }

    const due = li.querySelector('[data-role="due"]');
    if (due) due.textContent = todo.dueDate ? `Frist: ${todo.dueDate}` : 'Ingen frist';

    const countdown = li.querySelector('[data-role="countdown"]');
    if (countdown) paintCountdown(todo, countdown);
  }

  // ===== Progress & Counters =====
  function updateProgress() {
    const total = todos.length;
    const done = todos.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    if ($progressText) {
      $progressText.textContent = `${done}/${total} oppgaver fullført (${percent}%)`;
    }
    if ($progressBar) {
      $progressBar.style.width = `${percent}%`;
      $progressBar.setAttribute('aria-valuemin', '0');
      $progressBar.setAttribute('aria-valuemax', '100');
      $progressBar.setAttribute('aria-valuenow', String(clamp(percent, 0, 100)));
    }
  }

  function syncCounters() {
    const remaining = todos.filter(t => !t.completed).length;
    if ($counter) {
      $counter.textContent = `${remaining} ${remaining === 1 ? 'oppgave' : 'oppgaver'} igjen`;
    }
  }

  function setClearCompletedState() {
    const anyCompleted = todos.some(t => t.completed);
    if ($clearCompleted) {
      $clearCompleted.disabled = !anyCompleted;
    }
  }

  // ===== Countdown =====
  function startCountdownTick() {
    if (countdownTimerId != null) return; // idempotent
    countdownTimerId = setInterval(() => {
      // Update all currently rendered items
      $list.querySelectorAll('.todo-item').forEach(li => {
        const id = li.dataset.id;
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        const countdownEl = li.querySelector('[data-role="countdown"]');
        if (countdownEl) paintCountdown(todo, countdownEl);
      });
    }, 1000);
  }

  function stopCountdownTick() {
    if (countdownTimerId != null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
  }

  function paintCountdown(todo, el) {
    if (!el) return;
    const { label, isOverdue } = formatCountdown(todo.dueDate);
    el.textContent = label;
    el.classList.toggle('is-overdue', isOverdue);
  }

  function formatCountdown(dueDateStr) {
    if (!dueDateStr) {
      return { label: 'Tid igjen: —', isOverdue: false };
    }
    const end = parseDueDateEndOfDay(dueDateStr);
    if (!end) {
      return { label: 'Tid igjen: —', isOverdue: false };
    }
    const diffMs = end.getTime() - nowMs();

    if (diffMs < 0) {
      return { label: 'Fristen har utløpt!', isOverdue: true };
    }
    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return { label: `Tid igjen: ${days} dager, ${hours} timer, ${mins} min`, isOverdue: false };
  }

  // ===== Hydrate =====
  function hydrateFromStorage() {
    loadTodos();
    renderList();
    applyFilter(activeFilter);
    updateProgress();
    syncCounters();
    setClearCompletedState();
  }

  // ===== Events =====
  function onAdd() {
    addTodo($input.value, $date.value);
    $input.value = '';
    $date.value = '';
    $input.focus();
  }

  function bindEvents() {
    if ($add) {
      $add.addEventListener('click', onAdd);
    }
    if ($input) {
      $input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          onAdd();
        }
      });
    }

    // Filter buttons (event delegation)
    if ($filterSection) {
      $filterSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-button');
        if (!btn) return;
        const filter = btn.getAttribute('data-filter') || 'all';
        applyFilter(filter);
      });
    }

    // List delegation: toggle, delete, edit, due-date quick edit on shift+click due
    $list.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      const li = e.target.closest('.todo-item');
      if (!li) return;
      const id = li.dataset.id;

      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        if (action === 'toggle') {
          toggleComplete(id);
        } else if (action === 'delete') {
          deleteTodo(id);
        } else if (action === 'edit') {
          beginInlineEdit(li, id);
        }
        return;
      }
    });

    // Double click to edit text
    $list.addEventListener('dblclick', (e) => {
      const li = e.target.closest('.todo-item');
      if (!li) return;
      const id = li.dataset.id;
      const textSpan = li.querySelector('.todo-text');
      if (textSpan && e.target === textSpan) {
        beginInlineEdit(li, id);
      }
    });

    // Clear completed
    if ($clearCompleted) {
      $clearCompleted.addEventListener('click', () => {
        const before = todos.length;
        todos = todos.filter(t => !t.completed);
        if (todos.length !== before) {
          saveTodos();
          renderList();
          updateProgress();
          syncCounters();
          setClearCompletedState();
        }
      });
    }

    // Theme toggle
    if ($themeToggle) {
      $themeToggle.addEventListener('click', () => {
        const current = $html.getAttribute('data-theme') || 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  }

  // ===== Inline Edit =====
  function beginInlineEdit(li, id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const textSpan = li.querySelector('.todo-text');
    if (!textSpan) return;

    // Prevent duplicate editors
    if (li.querySelector('input[data-role="edit-input"]')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = todo.text;
    input.setAttribute('data-role', 'edit-input');
    input.style.width = '100%';
    input.style.fontSize = '16px';
    input.style.padding = '4px 8px';
    input.style.border = '2px solid var(--border)';
    input.style.borderRadius = '8px';

    textSpan.replaceWith(input);
    input.focus();
    input.select();

    const finish = (commit) => {
      const newText = input.value.trim();
      if (commit && newText) {
        updateTodo(id, { text: newText });
      } else if (commit && !newText) {
        // Empty -> delete
        deleteTodo(id);
      } else {
        // cancel -> restore
        renderItemInto(todo, li);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    hydrateFromStorage();
    bindEvents();
    startCountdownTick();
  });

})();
