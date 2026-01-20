const form = document.getElementById("todoForm");
const input = document.getElementById("todoInput");
const list = document.getElementById("todoList");
const clearDoneButton = document.getElementById("clearDone");
const markAllButton = document.getElementById("markAllDone");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const tabs = Array.from(document.querySelectorAll(".tab"));
const listView = document.getElementById("listView");
const calendarView = document.getElementById("calendarView");
const longView = document.getElementById("longView");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const filterLabel = document.getElementById("filterLabel");
const filterScopeSelect = document.getElementById("filterScope");
const clearFilterButton = document.getElementById("clearFilter");
const goTodayButton = document.getElementById("goToday");
const clearScope = document.getElementById("clearScope");
const longForm = document.getElementById("longForm");
const longInput = document.getElementById("longInput");
const longList = document.getElementById("longList");
const clearLongDoneButton = document.getElementById("clearLongDone");

const STORAGE_KEY = "modern_todos";
const LONG_STORAGE_KEY = "modern_long_todos";

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateString = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const loadTodos = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const saveTodos = (todos) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
};

const loadLongTodos = () => {
  const raw = localStorage.getItem(LONG_STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const saveLongTodos = (items) => {
  localStorage.setItem(LONG_STORAGE_KEY, JSON.stringify(items));
};

let todos = loadTodos();
let filterDate = null;
let filterType = "all";
let calendarCursor = new Date();
calendarCursor.setDate(1);
let longTodos = loadLongTodos();

const hydrateTodos = () => {
  const today = formatDate(new Date());
  let changed = false;
  todos = todos.map((item) => {
    if (!item.createdAt) {
      changed = true;
      return { ...item, createdAt: today };
    }
    return item;
  });
  if (changed) saveTodos(todos);
};

hydrateTodos();

const updateCounts = () => {
  totalCount.textContent = String(todos.length);
  doneCount.textContent = String(todos.filter((item) => item.done).length);
};

const renderTodos = () => {
  list.innerHTML = "";
  const visibleTodos = getVisibleTodos();
  visibleTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.done ? " done" : ""}`;
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const text = document.createElement("span");
    text.textContent = todo.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, text, remove);
    list.appendChild(li);
  });
  updateCounts();
  filterLabel.textContent = getFilterLabel();
  clearFilterButton.style.visibility = filterType === "all" ? "hidden" : "visible";
  filterScopeSelect.value = filterType;
};

const addTodo = (value) => {
  const text = value.trim();
  if (!text) return;
  const createdAt =
    filterType === "date" ? filterDate || formatDate(new Date()) : formatDate(new Date());
  const todo = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
    createdAt,
  };
  todos = [todo, ...todos];
  saveTodos(todos);
  renderTodos();
  renderCalendar();
};

const toggleTodo = (id) => {
  todos = todos.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item
  );
  saveTodos(todos);
  renderTodos();
  renderCalendar();
};

const deleteTodo = (id) => {
  todos = todos.filter((item) => item.id !== id);
  saveTodos(todos);
  renderTodos();
  renderCalendar();
};

const clearDone = () => {
  const scope = clearScope.value;
  const referenceDate = filterDate ? parseDateString(filterDate) : new Date();
  todos = todos.filter(
    (item) => !(item.done && isInScope(item.createdAt, scope, referenceDate))
  );
  saveTodos(todos);
  renderTodos();
  renderCalendar();
};

const setFilter = (type, dateValue) => {
  if (type === "date") {
    filterType = "date";
    filterDate = dateValue || filterDate || formatDate(new Date());
  } else {
    filterType = type;
    filterDate = null;
  }
  renderTodos();
  renderCalendar();
};

const clearFilter = () => {
  setFilter("all");
};

const goToToday = () => {
  const today = new Date();
  setFilter("date", formatDate(today));
  calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  setView("list");
};

const getVisibleTodos = () => {
  if (filterType === "date") {
    return filterDate ? todos.filter((item) => item.createdAt === filterDate) : todos;
  }
  if (filterType === "all") {
    return todos;
  }
  const referenceDate = new Date();
  return todos.filter((item) => isInScope(item.createdAt, filterType, referenceDate));
};

const getFilterLabel = () => {
  if (filterType === "date") {
    return filterDate ? `筛选：${filterDate}` : "筛选：选中日期";
  }
  const labels = {
    all: "全部任务",
    today: "筛选：当天",
    week: "筛选：本周",
    month: "筛选：本月",
    year: "筛选：本年",
  };
  return labels[filterType] || "全部任务";
};

const markVisibleDone = () => {
  const visibleIds = new Set(getVisibleTodos().map((item) => item.id));
  if (!visibleIds.size) return;
  todos = todos.map((item) =>
    visibleIds.has(item.id) ? { ...item, done: true } : item
  );
  saveTodos(todos);
  renderTodos();
  renderCalendar();
};

const setView = (view) => {
  const views = {
    list: listView,
    calendar: calendarView,
    long: longView,
  };
  Object.entries(views).forEach(([key, section]) => {
    section.classList.toggle("view-active", key === view);
  });
  tabs.forEach((tab) => {
    const selected = tab.dataset.view === view;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
};

const getYearRange = () => {
  const years = todos
    .map((item) => item.createdAt)
    .filter(Boolean)
    .map((date) => parseDateString(date).getFullYear());
  const currentYear = new Date().getFullYear();
  if (!years.length) {
    return { minYear: currentYear - 3, maxYear: currentYear + 3 };
  }
  return {
    minYear: Math.min(currentYear, ...years) - 1,
    maxYear: Math.max(currentYear, ...years) + 1,
  };
};

const syncCalendarSelectors = () => {
  const { minYear, maxYear } = getYearRange();
  const selectedYear = calendarCursor.getFullYear();
  yearSelect.innerHTML = "";
  for (let year = minYear; year <= maxYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `${year}年`;
    yearSelect.appendChild(option);
  }
  yearSelect.value = String(selectedYear);
  monthSelect.value = String(calendarCursor.getMonth() + 1);
};

const isInScope = (dateString, scope, referenceDate) => {
  if (!dateString) return false;
  const date = parseDateString(dateString);
  const ref = new Date(referenceDate);
  if (scope === "today") {
    return dateString === formatDate(ref);
  }
  if (scope === "week") {
    const day = ref.getDay();
    const offset = (day + 6) % 7;
    const start = new Date(ref);
    start.setDate(ref.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return date >= start && date <= end;
  }
  if (scope === "month") {
    return (
      date.getFullYear() === ref.getFullYear() &&
      date.getMonth() === ref.getMonth()
    );
  }
  if (scope === "year") {
    return date.getFullYear() === ref.getFullYear();
  }
  return false;
};

const renderCalendar = () => {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  syncCalendarSelectors();
  calendarGrid.innerHTML = "";
  const todayString = formatDate(new Date());

  const counts = todos.reduce((acc, item) => {
    acc[item.createdAt] = (acc[item.createdAt] || 0) + 1;
    return acc;
  }, {});

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    const dayString = formatDate(day);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    if (day.getMonth() !== month) {
      cell.classList.add("outside");
    }
    if (dayString === todayString) {
      cell.classList.add("today");
    }
    if (filterType === "date" && filterDate === dayString) {
      cell.classList.add("selected");
    }

    const dateText = document.createElement("span");
    dateText.className = "calendar-date";
    dateText.textContent = String(day.getDate());
    cell.appendChild(dateText);

    const count = counts[dayString];
    if (count) {
      const badge = document.createElement("span");
      badge.className = "calendar-badge";
      badge.textContent = String(count);
      cell.appendChild(badge);
    }

    cell.addEventListener("click", () => {
      setFilter("date", dayString);
      setView("list");
    });

    calendarGrid.appendChild(cell);
  }
};

const renderLongTodos = () => {
  longList.innerHTML = "";
  longTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.done ? " done" : ""}`;
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleLongTodo(todo.id));

    const text = document.createElement("span");
    text.textContent = todo.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => deleteLongTodo(todo.id));

    li.append(checkbox, text, remove);
    longList.appendChild(li);
  });
};

const addLongTodo = (value) => {
  const text = value.trim();
  if (!text) return;
  const todo = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
  };
  longTodos = [todo, ...longTodos];
  saveLongTodos(longTodos);
  renderLongTodos();
};

const toggleLongTodo = (id) => {
  longTodos = longTodos.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item
  );
  saveLongTodos(longTodos);
  renderLongTodos();
};

const deleteLongTodo = (id) => {
  longTodos = longTodos.filter((item) => item.id !== id);
  saveLongTodos(longTodos);
  renderLongTodos();
};

const clearLongDone = () => {
  longTodos = longTodos.filter((item) => !item.done);
  saveLongTodos(longTodos);
  renderLongTodos();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(input.value);
  input.value = "";
  input.focus();
});

clearDoneButton.addEventListener("click", clearDone);
markAllButton.addEventListener("click", markVisibleDone);
clearFilterButton.addEventListener("click", clearFilter);
goTodayButton.addEventListener("click", goToToday);
filterScopeSelect.addEventListener("change", () => {
  const value = filterScopeSelect.value;
  if (value === "date") {
    setFilter("date", filterDate);
    setView("list");
    return;
  }
  setFilter(value);
});
tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});
prevMonth.addEventListener("click", () => {
  calendarCursor.setMonth(calendarCursor.getMonth() - 1);
  renderCalendar();
});
nextMonth.addEventListener("click", () => {
  calendarCursor.setMonth(calendarCursor.getMonth() + 1);
  renderCalendar();
});
yearSelect.addEventListener("change", () => {
  calendarCursor = new Date(
    Number(yearSelect.value),
    Number(monthSelect.value) - 1,
    1
  );
  renderCalendar();
});
monthSelect.addEventListener("change", () => {
  calendarCursor = new Date(
    Number(yearSelect.value),
    Number(monthSelect.value) - 1,
    1
  );
  renderCalendar();
});
longForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addLongTodo(longInput.value);
  longInput.value = "";
  longInput.focus();
});
clearLongDoneButton.addEventListener("click", clearLongDone);

renderTodos();
renderCalendar();
renderLongTodos();
