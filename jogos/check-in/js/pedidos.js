// Pedidos durante a estadia: aparecem nos quartos ao longo da tarde e da noite.
// Cada momento do dia tem poucos atendimentos; o que ficar sem resposta vira nota baixa.

import { rng, sorteiaPeso } from "./estado.js";
import { satisfacao } from "./hospedes.js";
import { consumir, emergencia, disponivel } from "./estoque.js";

export function iniciarEstadia(tema, estado) {
  const cfg = tema.pedidos;
  estado.fase = "estadia";
  estado.estadia = { momento: 0, pontos: cfg.atendimentos, pedidos: [], atendidos: 0, ignorados: 0, receita: 0, custo: 0, prox: 1 };
  for (const h of Object.values(estado.quartos)) if (h) { h.ajustes = h.ajustes || []; h.pedidosHoje = 0; }
  // Troca diária de toalhas: um jogo por quarto ocupado.
  if (estado.estoque) {
    let faltou = 0;
    for (const h of Object.values(estado.quartos)) {
      if (!h) continue;
      if (!consumir(tema, estado, "toalha")) { h.ajustes.push({ txt: tema.semToalha.txt, d: tema.semToalha.d, chave: "semtoalha" }); faltou++; }
    }
    estado.estadia.semToalha = faltou;
  }
  gerarPedidos(tema, estado);
}

function gerarPedidos(tema, estado) {
  const cfg = tema.pedidos, e = estado.estadia;
  for (const [id, h] of Object.entries(estado.quartos)) {
    if (!h || e.pedidos.some(p => p.quarto === id) || h.pedidosHoje >= 2) continue;
    const s = satisfacao(tema, estado, h, id);
    const ruido = s.fatores.filter(f => f.chave === "barulho").sort((a, b) => a.d - b.d)[0];
    const jaReclamou = (h.ajustes || []).some(a => a.chave === "silencio");
    let tipo = null, de = null, pen = 0;
    if (ruido && -ruido.d >= 6 && !jaReclamou && rng(estado) < 0.45) { tipo = "barulho"; de = ruido.de; pen = -ruido.d; }
    else if (rng(estado) < cfg.chance) {
      const pesos = {};
      for (const [k, t] of Object.entries(cfg.tipos)) if (t.perfis) pesos[k] = t.perfis[h.perfil] ?? 1;
      tipo = sorteiaPeso(estado, pesos);
    }
    if (!tipo) continue;
    h.pedidosHoje++;
    e.pedidos.push({ id: e.prox++, quarto: id, tipo, de, pen, desde: e.momento });
  }
}

export function textoPedido(tema, p, h) {
  const t = tema.pedidos.tipos[p.tipo];
  if (p.tipo === "barulho") return `Barulho vindo do ${p.de}`;
  return (t.txtPerfil && t.txtPerfil[h.perfil]) || t.txt;
}

export function efeitoPedido(tema, p) {
  const t = tema.pedidos.tipos[p.tipo];
  const bom = p.tipo === "barulho" ? Math.ceil(p.pen / 2) : t.bom;
  return { bom, ruim: t.ruim, custo: t.custo || 0, receita: t.receita || 0, usa: t.usa || null };
}

// Pode atender com estoque? Senão, só com emergência.
export function situacaoPedido(tema, estado, p) {
  const t = tema.pedidos.tipos[p.tipo];
  if (!t.usa || !estado.estoque) return { estoque: true };
  const n = disponivel(estado, t.usa);
  return { estoque: n > 0, qtd: n, item: t.usa, emergencia: tema.estoque[t.usa].emergencia };
}

export function atender(tema, estado, pedidoId, usarEmergencia = false) {
  const e = estado.estadia;
  const i = e.pedidos.findIndex(p => p.id === pedidoId);
  if (i < 0 || e.pontos < 1) return false;
  const p = e.pedidos[i];
  const usa = tema.pedidos.tipos[p.tipo].usa;
  if (usa && estado.estoque) {
    if (disponivel(estado, usa) > 0) consumir(tema, estado, usa);
    else if (usarEmergencia) { emergencia(tema, estado, usa); e.emergencias = (e.emergencias || 0) + 1; }
    else return false;
  }
  const h = estado.quartos[p.quarto];
  const t = tema.pedidos.tipos[p.tipo];
  const ef = efeitoPedido(tema, p);
  e.pontos--;
  e.pedidos.splice(i, 1);
  e.atendidos++;
  if (!h) return true;
  h.ajustes.push({ txt: t.bomTxt, d: ef.bom, chave: p.tipo === "barulho" ? "silencio" : "pedido+" });
  e.custo += ef.custo;
  e.receita += ef.receita;
  if (p.tipo === "barulho") {
    const v = estado.quartos[p.de];
    if (v) { v.ajustes = v.ajustes || []; v.ajustes.push({ txt: t.vizinhoTxt, d: t.vizinho, chave: "bronca" }); }
  }
  return true;
}

// Passa para o próximo momento. Devolve true se a estadia acabou.
export function avancar(tema, estado) {
  const e = estado.estadia, cfg = tema.pedidos;
  if (e.momento >= cfg.momentos.length - 1) return true;
  e.momento++;
  e.pontos = cfg.atendimentos;
  gerarPedidos(tema, estado);
  return false;
}

// Fim da estadia: o que ficou sem resposta pesa na nota da noite.
export function encerrarEstadia(tema, estado) {
  const e = estado.estadia;
  for (const p of e.pedidos) {
    const h = estado.quartos[p.quarto];
    const t = tema.pedidos.tipos[p.tipo];
    if (h) h.ajustes.push({ txt: t.ruimTxt, d: t.ruim, chave: "pedido-" });
    e.ignorados++;
  }
  e.pedidos = [];
}
