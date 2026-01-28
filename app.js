/* Mini CRM estático - dados no LocalStorage */
const STORAGE_KEY = "mini_crm_propostas_v1";

const STAGES = [
  "LEAD RECEBIDO",
  "QUALIFICAÇÃO",
  "LEVANTAMENTO",
  "PROPOSTA EM ELABORAÇÃO",
  "PROPOSTA ENVIADA",
  "NEGOCIAÇÃO",
  "FECHADO (GANHO)",
  "PERDIDO / CANCELADO"
];

const $ = (sel) => document.querySelector(sel);

const els = {
  rows: $("#rows"),
  stats: $("#stats"),
  count: $("#count"),
  q: $("#q"),
  stageFilter: $("#stage"),
  sort: $("#sort"),
  btnNew: $("#btnNew"),
  btnExport: $("#btnExport"),
  fileImport: $("#fileImport"),
  modal: $("#modal"),
  modalTitle: $("#modalTitle"),
  btnClose: $("#btnClose"),
  btnCancel: $("#btnCancel"),
  btnDelete: $("#btnDelete"),
  form: $("#form"),
};

let state = {
  items: [],
  editingId: null
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

function parseMoney(v) {
  if (!v) return 0;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(n) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
  } catch {
    return `R$ ${(n||0).toFixed(2)}`;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.items = raw ? JSON.parse(raw) : [];
  } catch {
    state.items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function seedIfEmpty() {
  if (state.items.length) return;
  state.items = [
    {
      id: uid(),
      client: "Exemplo Cliente",
      contact: "65 9xxxx-xxxx",
      service: "Projeto Elétrico / Medição Agrupada",
      city: "Cuiabá/MT",
      partner: "Parceiro Exemplo",
      entry: todayISO(),
      value: 5500,
      due: "",
      stage: "PROPOSTA ENVIADA",
      status: "ABERTA",
      notes: "Exemplo de observação.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
  save();
}

function openModal(editItem = null) {
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  els.btnDelete.classList.add("hidden");
  state.editingId = null;

  const stageSelect = els.form.elements.stage;
  stageSelect.innerHTML = STAGES.map(s => `<option value="${s}">${s}</option>`).join("");

  if (!editItem) {
    els.modalTitle.textContent = "Nova proposta";
    els.form.reset();
    els.form.elements.stage.value = "LEAD RECEBIDO";
    els.form.elements.status.value = "ABERTA";
    els.form.elements.entry.value = todayISO();
    return;
  }

  els.modalTitle.textContent = "Editar proposta";
  state.editingId = editItem.id;
  els.btnDelete.classList.remove("hidden");

  els.form.elements.client.value = editItem.client || "";
  els.form.elements.contact.value = editItem.contact || "";
  els.form.elements.service.value = editItem.service || "";
  els.form.elements.city.value = editItem.city || "";
  els.form.elements.entry.value = editItem.entry || todayISO();
  els.form.elements.partner.value = editItem.partner || "";
  els.form.elements.value.value = (editItem.value ?? "").toString();
  els.form.elements.due.value = editItem.due || "";
  els.form.elements.stage.value = editItem.stage || STAGES[0];
  els.form.elements.status.value = editItem.status || "ABERTA";
  els.form.elements.notes.value = editItem.notes || "";
}

function closeModal() {
  els.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function stageOptions() {
  els.stageFilter.innerHTML = [
    `<option value="">Todas as etapas</option>`,
    ...STAGES.map(s => `<option value="${s}">${s}</option>`)
  ].join("");
}

function isOverdue(item) {
  if (!item.due) return false;
  const due = new Date(item.due + "T00:00:00");
  const t = new Date();
  t.setHours(0,0,0,0);
  return due < t && item.status === "ABERTA";
}

function filtered() {
  const q = (els.q.value || "").trim().toLowerCase();
  const stage = els.stageFilter.value || "";
  const sort = els.sort.value;

  let arr = [...state.items];

  if (q) {
    arr = arr.filter(it =>
      [it.client, it.partner, it.service, it.city, it.contact, it.notes]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }
  if (stage) arr = arr.filter(it => it.stage === stage);

  arr.sort((a,b) => {
    if (sort === "updated_desc") return (b.updatedAt||0) - (a.updatedAt||0);
    if (sort === "due_asc") {
      const ad = a.due ? Date.parse(a.due) : 9e15;
      const bd = b.due ? Date.parse(b.due) : 9e15;
      return ad - bd;
    }
    if (sort === "value_desc") return (b.value||0) - (a.value||0);
    if (sort === "client_asc") return (a.client||"").localeCompare(b.client||"");
    return 0;
  });

  return arr;
}

function renderStats() {
  const total = state.items.length;
  const abertas = state.items.filter(i => i.status === "ABERTA").length;
  const ganhas = state.items.filter(i => i.status === "GANHA").length;
  const atrasadas = state.items.filter(isOverdue).length;

  const totalValorAberto = state.items
    .filter(i => i.status === "ABERTA")
    .reduce((s,i)=> s + (i.value||0), 0);

  els.stats.innerHTML = `
    <div class="stat">
      <div class="k">Total</div>
      <div class="v">${total}</div>
    </div>
    <div class="stat">
      <div class="k">Abertas</div>
      <div class="v">${abertas}</div>
    </div>
    <div class="stat">
      <div class="k">Ganhas</div>
      <div class="v">${ganhas}</div>
    </div>
    <div class="stat">
      <div class="k">Atrasadas</div>
      <div class="v">${atrasadas} <span class="badge ${atrasadas? "danger":"ok"}">${atrasadas? "atenção":"ok"}</span></div>
    </div>
    <div class="stat" style="grid-column: 1 / -1">
      <div class="k">Valor em aberto</div>
      <div class="v">${formatBRL(totalValorAberto)}</div>
    </div>
  `;
}

function stagePill(stage) {
  const idx = STAGES.indexOf(stage);
  const label = idx >= 0 ? `${idx+1}/${STAGES.length}` : "";
  return `<span class="pill"><small>${label}</small> ${stage || "-"}</span>`;
}

function statusBadge(item) {
  if (item.status === "GANHA") return `<span class="badge ok">GANHA</span>`;
  if (item.status === "PERDIDA") return `<span class="badge danger">PERDIDA</span>`;
  if (item.status === "CANCELADA") return `<span class="badge danger">CANCELADA</span>`;
  if (isOverdue(item)) return `<span class="badge warn">ATRASADA</span>`;
  return `<span class="badge">ABERTA</span>`;
}

function renderTable() {
  const arr = filtered();
  els.count.textContent = `${arr.length} item(ns)`;

  els.rows.innerHTML = arr.map(it => {
    const entry = it.entry ? it.entry.split("-").reverse().join("/") : "-";
    const due = it.due ? it.due.split("-").reverse().join("/") : "-";

    return `
      <div class="row">
        <div>${stagePill(it.stage)}</div>
        <div class="ellipsis" title="${entry}">${entry}</div>
        <div class="ellipsis" title="${it.client || ""}">${it.client || "-"}</div>
        <div class="ellipsis" title="${it.partner || ""}">${it.partner || "-"}</div>
        <div class="ellipsis" title="${it.service || ""}">${it.service || "-"}</div>
        <div class="ellipsis" title="${it.city || ""}">${it.city || "-"}</div>
        <div class="money">${formatBRL(it.value || 0)}</div>
        <div>${due}</div>
        <div>${statusBadge(it)}</div>
        <div class="actions-cell">
          <button class="linkbtn" data-act="edit" data-id="${it.id}">Editar</button>
          <button class="linkbtn" data-act="dup" data-id="${it.id}">Duplicar</button>
        </div>
      </div>
    `;
  }).join("");

  els.rows.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      const item = state.items.find(x => x.id === id);
      if (!item) return;

      if (act === "edit") openModal(item);
      if (act === "dup") {
        const copy = {
          ...item,
          id: uid(),
          entry: todayISO(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: "ABERTA"
        };
        state.items.unshift(copy);
        save();
        render();
      }
    });
  });
}

function upsertFromForm() {
  const f = els.form.elements;
  const payload = {
    client: f.client.value.trim(),
    contact: f.contact.value.trim(),
    service: f.service.value.trim(),
    city: f.city.value.trim(),
    entry: f.entry.value || todayISO(),
    partner: f.partner.value.trim(),
    value: parseMoney(f.value.value),
    due: f.due.value || "",
    stage: f.stage.value,
    status: f.status.value,
    notes: f.notes.value.trim(),
    updatedAt: Date.now(),
  };

  if (!payload.client || !payload.service) {
    alert("Preencha Cliente e Serviço.");
    return;
  }

  if (!payload.entry) {
    alert("Preencha a data de entrada.");
    return;
  }

  if (state.editingId) {
    const idx = state.items.findIndex(x => x.id === state.editingId);
    if (idx >= 0) {
      state.items[idx] = { ...state.items[idx], ...payload };
    }
  } else {
    state.items.unshift({
      id: uid(),
      ...payload,
      createdAt: Date.now(),
    });
  }

  save();
  closeModal();
  render();
}

function deleteCurrent() {
  if (!state.editingId) return;
  const item = state.items.find(x => x.id === state.editingId);
  if (!item) return;

  const ok = confirm(`Excluir a proposta de "${item.client}"?`);
  if (!ok) return;

  state.items = state.items.filter(x => x.id !== state.editingId);
  save();
  closeModal();
  render();
}

function exportJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    items: state.items
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `crm_propostas_backup_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(incoming)) throw new Error("Formato inválido");

      const map = new Map(state.items.map(i => [i.id, i]));
      for (const it of incoming) {
        if (it && it.id) {
          // compat: se não tiver entry, define hoje
          if (!it.entry) it.entry = todayISO();
          if (!it.partner) it.partner = "";
          map.set(it.id, it);
        }
      }
      state.items = Array.from(map.values()).sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0));

      save();
      render();
      alert("Importação concluída!");
    } catch (e) {
      alert("Não consegui importar esse arquivo. Verifique se é um JSON exportado do CRM.");
    } finally {
      els.fileImport.value = "";
    }
  };
  reader.readAsText(file);
}

/* ===== GRÁFICO EM BARRAS (Chart.js) ===== */
let chartValores = null;

function getValoresResumo() {
  const ganhos = state.items
    .filter(i => i.status === "GANHA")
    .reduce((s, i) => s + (i.value || 0), 0);

  const perdidosCancelados = state.items
    .filter(i => i.status === "PERDIDA" || i.status === "CANCELADA")
    .reduce((s, i) => s + (i.value || 0), 0);

  const abertos = state.items
    .filter(i => i.status === "ABERTA")
    .reduce((s, i) => s + (i.value || 0), 0);

  return { ganhos, perdidosCancelados, abertos };
}

function renderGraficoValores() {
  const canvas = document.getElementById("barValores");
  if (!canvas || typeof Chart === "undefined") return;

  const { ganhos, perdidosCancelados, abertos } = getValoresResumo();

  if (chartValores) chartValores.destroy();

  chartValores = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Ganhas", "Perdidas/Canceladas", "Em aberto"],
      datasets: [{
        label: "Valor (R$)",
        data: [ganhos, perdidosCancelados, abertos],
        backgroundColor: [
          "rgba(85, 210, 122, 0.70)",
          "rgba(255, 110, 110, 0.70)",
          "rgba(110, 168, 255, 0.70)"
        ],
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.raw.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          },
          grid: { color: "rgba(255,255,255,0.06)" }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}
/* ======================================= */

function render() {
  renderStats();
  renderTable();
  renderGraficoValores();
}

function bind() {
  els.btnNew.addEventListener("click", () => openModal());
  els.btnClose.addEventListener("click", closeModal);
  els.btnCancel.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    upsertFromForm();
  });

  els.btnDelete.addEventListener("click", deleteCurrent);

  [els.q, els.stageFilter, els.sort].forEach(el => {
    el.addEventListener("input", () => { renderTable(); renderGraficoValores(); });
    el.addEventListener("change", () => { renderTable(); renderGraficoValores(); });
  });

  els.btnExport.addEventListener("click", exportJSON);

  els.fileImport.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
  });

  stageOptions();
}

(function init(){
  load();
  seedIfEmpty();
  bind();
  render();
})();
