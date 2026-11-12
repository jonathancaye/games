// Desenho em corte lateral (casa de bonecas).
// Só lê o estado; quem decide as regras são os módulos de lógica.
// A vista isométrica dos cômodos entra no futuro como outro arquivo nesta pasta.

import { listaQuartos } from "../predio.js";

const PELE = ["#f1c7a1", "#d9a27a", "#a8704c", "#7d4f33", "#f6d6bc"];

function pessoa(x, cor, pele, escala = 1, extra = "") {
  const s = escala;
  return `<g transform="translate(${x} ${32 - 32 * s}) scale(${s})">
    <rect x="-6" y="15" width="12" height="17" rx="5" fill="${cor}"/>
    <circle cx="0" cy="10" r="5.4" fill="${pele}"/>
    <path d="M-5.4 9 a5.4 5.4 0 0 1 10.8 0 q-2 -2.6 -5.4 -2.6 q-3.4 0 -5.4 2.6z" fill="#3b2a20"/>${extra}</g>`;
}

// Figura de cada perfil (viewBox 0 0 44 32)
export function figura(perfil, cor, semente = 0) {
  const p = i => PELE[(semente + i) % PELE.length];
  const claro = clarear(cor);
  if (perfil === "familia")
    return `<svg viewBox="0 0 44 32">${pessoa(10, cor, p(0))}${pessoa(34, claro, p(1))}${pessoa(22, "#4fb6e8", p(2), 0.62)}</svg>`;
  if (perfil === "casal")
    return `<svg viewBox="0 0 44 32">${pessoa(14, cor, p(0))}${pessoa(30, claro, p(3))}<path d="M22 4.5c-1.4-2.2-4.6-1.2-4.2 1.2.3 1.6 2.4 3 4.2 4.3 1.8-1.3 3.9-2.7 4.2-4.3.4-2.4-2.8-3.4-4.2-1.2z" fill="#e4485d"/></svg>`;
  if (perfil === "surf")
    return `<svg viewBox="0 0 44 32"><g transform="rotate(-14 31 17)"><ellipse cx="31" cy="17" rx="5" ry="15" fill="#ffd166"/><rect x="30.3" y="3" width="1.4" height="28" fill="#e76f51"/></g>${pessoa(16, cor, p(1))}</svg>`;
  return `<svg viewBox="0 0 44 32">${pessoa(9, cor, p(0), 0.94)}${pessoa(35, claro, p(2), 0.94)}${pessoa(22, cor, p(4), 1, `<rect x="5" y="2" width="2.6" height="13" rx="1.3" fill="${p(4)}" transform="rotate(18 6 15)"/>`)}</svg>`;
}

function clarear(hex) {
  const n = parseInt(hex.slice(1), 16);
  const mix = c => Math.round(c + (255 - c) * 0.38);
  return `rgb(${mix(n >> 16 & 255)},${mix(n >> 8 & 255)},${mix(n & 255)})`;
}
export function fundoPerfil(cor) {
  const n = parseInt(cor.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},.16)`;
}

export function iconePedido(tipo) {
  const c = "#14322f";
  const I = {
    toalha: `<rect x="5" y="6" width="14" height="12" rx="2" fill="#4fb6e8"/><rect x="5" y="10" width="14" height="2" fill="#fff"/><rect x="5" y="14" width="14" height="1.6" fill="#fff"/>`,
    ar: `<g stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M12 4v16M5 8l14 8M19 8L5 16"/></g><circle cx="12" cy="12" r="2.2" fill="#4fb6e8"/>`,
    servico: `<path d="M4 16h16" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M6 15a6 6 0 0 1 12 0z" fill="#ff8a3d"/><circle cx="12" cy="7.6" r="1.4" fill="${c}"/>`,
    dica: `<path d="M12 21s-6-6.2-6-10.5a6 6 0 0 1 12 0C18 14.8 12 21 12 21z" fill="#e4485d"/><circle cx="12" cy="10.4" r="2.3" fill="#fff"/>`,
    barulho: `<path d="M4 10h3l4-3v10l-4-3H4z" fill="${c}"/><g stroke="#e2463f" stroke-width="2" fill="none" stroke-linecap="round"><path d="M14 9q2 3 0 6"/><path d="M17 6.5q4 5.5 0 11"/></g>`
  };
  return `<svg viewBox="0 0 24 24">${I[tipo] || ""}</svg>`;
}

export function rosto(h) {
  const boca = h === "feliz" ? `<path d="M7 13.5q5 4.5 10 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : h === "ok" ? `<path d="M7.5 15h9" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M7 17q5 -4.5 10 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 24 24"><circle cx="8.5" cy="9" r="1.8" fill="#fff"/><circle cx="15.5" cy="9" r="1.8" fill="#fff"/>${boca}</svg>`;
}

function fundo() {
  return `<svg class="fundo" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect class="mar" x="0" y="60" width="100" height="22" fill="var(--mar)"/>
    <rect class="mar2" x="0" y="60" width="100" height="2.4" fill="var(--mar2)"/>
    <path class="areia" d="M0 78 Q30 72 60 76 T100 74 V100 H0Z" fill="var(--areia)"/>
    <path class="areia2" d="M0 88 Q40 84 100 90 V100 H0Z" fill="var(--areia2)"/>
  </svg>
  <svg class="fundo" viewBox="0 0 100 100" preserveAspectRatio="xMaxYMin meet" aria-hidden="true"><circle class="sol" cx="82" cy="16" r="8" fill="#fff3b0"/></svg>
  <svg class="fundo palmeira" viewBox="0 0 100 100" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
    <path d="M7 96 Q9 70 15 52" stroke="#9a6b3f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g fill="#2f8f55"><path d="M15 52 q-10 -6 -16 2 q8 -2 16 -2z"/><path d="M15 52 q-2 -12 -12 -12 q8 4 12 12z"/><path d="M15 52 q6 -12 16 -8 q-10 0 -16 8z"/><path d="M15 52 q12 -2 15 8 q-6 -6 -15 -8z"/></g>
  </svg>`;
}

function terreoSvg(nome) {
  if (nome.startsWith("Recep"))
    return `<svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMax meet"><rect x="20" y="20" width="44" height="14" rx="2" fill="#a8763f"/><rect x="18" y="18" width="48" height="3" rx="1" fill="#7f5629"/><circle cx="42" cy="13" r="4" fill="#d9a27a"/><rect x="38" y="16" width="8" height="5" rx="2" fill="#14918a"/><rect x="72" y="8" width="16" height="26" rx="2" fill="#7f5629"/><circle cx="85" cy="22" r="1.2" fill="#ffd166"/></svg>`;
  return `<svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMax meet"><rect x="12" y="22" width="30" height="3" rx="1" fill="#7f5629"/><rect x="25" y="25" width="4" height="9" fill="#7f5629"/><rect x="56" y="22" width="30" height="3" rx="1" fill="#7f5629"/><rect x="69" y="25" width="4" height="9" fill="#7f5629"/><circle cx="22" cy="19" r="3" fill="#fff"/><circle cx="34" cy="19" r="2.4" fill="#ffd166"/><circle cx="66" cy="19" r="3" fill="#fff"/><path d="M76 16h6l-1 5h-4z" fill="#e76f51"/></svg>`;
}

export function montarCena(el, tema) {
  const andares = tema.predio.andares.map(a => `
    <div class="andar" data-andar="${a.n}"><span class="rot">${a.n}º</span>
      ${a.quartos.map(q => `<button class="qto ${q.tipo}" data-id="${q.id}" aria-label="Quarto ${q.id}"></button>`).join("")}
    </div>`).join("");
  const terreo = tema.predio.terreo.map(t => `<div class="area">${terreoSvg(t.nome)}<span>${t.nome}</span></div>`).join("");
  el.innerHTML = `${fundo()}
    <div class="predio">
      <div class="telhado"><span class="placa">${tema.hotel}</span></div>
      ${andares}
      <div class="terreo">${terreo}</div>
    </div>`;
}

// ui: { prev: {id: {ok, motivo, valor, humor}}, alvo, deltas: {id: n}, foco }
export function desenharPredio(el, tema, estado, ui = {}, humorDe) {
  const m = estado.fase === "estadia" && estado.estadia ? estado.estadia.momento : -1;
  el.classList.toggle("noite", estado.fase === "noite" || m >= 2);
  el.classList.toggle("tarde", m === 1);
  for (const q of listaQuartos(tema)) {
    const b = el.querySelector(`.qto[data-id="${q.id}"]`);
    if (!b) continue;
    const h = estado.quartos[q.id];
    const t = tema.tipos[q.tipo];
    const pv = ui.prev && ui.prev[q.id];
    let html = `<span class="num">${q.id}</span><span class="tp">${t.curto}</span>
      <span class="janela${q.vista ? " mar" : ""}"></span><span class="cama"></span>`;
    if (h) {
      const p = tema.perfis[h.perfil];
      const hm = humorDe(h, q.id);
      html += `<span class="fig">${figura(h.perfil, p.cor, h.id)}</span>
        <span class="balao ${hm}">${rosto(hm)}</span>
        <span class="noites">${h.noites} ${h.noites === 1 ? "noite" : "noites"}</span>`;
    }
    const ped = ui.pedidos && ui.pedidos[q.id];
    if (ped) html += `<span class="pedido${ped.esperando ? " esperando" : ""}">${iconePedido(ped.tipo)}</span>`;
    if (pv && !pv.ok && !h) html += `<span class="motivo">${pv.motivo}</span>`;
    if (pv && pv.ok) html += `<span class="prev">${pv.valor}</span>`;
    const d = ui.deltas && ui.deltas[q.id];
    if (d) html += `<span class="delta${d > 0 ? " mais" : ""}">${d > 0 ? "+" : ""}${d}</span>`;
    b.innerHTML = html;
    b.classList.toggle("ocupado", !!h);
    b.classList.toggle("bloq", !!(pv && !pv.ok));
    b.classList.toggle("livre-prev", !!(pv && pv.ok));
    b.classList.toggle("alvo", ui.alvo === q.id);
    b.classList.toggle("foco", ui.foco === q.id);
    b.style.setProperty("--cprev", pv && pv.ok ? corHumor(pv.humor) : "transparent");
  }
}

export function corHumor(h) {
  return h === "feliz" ? "var(--feliz)" : h === "ok" ? "var(--ok)" : "var(--bravo)";
}
