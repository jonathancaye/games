// Estoque: toalhas (reutilizáveis), peças (chegam no dia seguinte) e ingredientes (vencem).
// Compras são feitas na manhã e pagas no fechamento do dia.

import { rng as sorteio } from "./estado.js";

export function novoEstoque(tema) {
  const c = tema.estoque;
  return {
    toalha: { limpas: c.toalha.inicial, usadas: 0 },
    peca: { qtd: c.peca.inicial, chegando: 0 },
    jantar: { lotes: [{ qtd: c.jantar.inicial, dia: 1 }] },
    compras: { toalha: 0, peca: 0, jantar: 0 },
    hoje: novoDia(),
    consumo: []      // histórico por dia: { toalha, peca, jantar }
  };
}

function novoDia() {
  return { usou: { toalha: 0, peca: 0, jantar: 0 }, compras: 0, lavanderia: 0, estragou: 0, estragouValor: 0, emergencia: 0, chegou: 0, voltaram: 0 };
}

export function disponivel(estado, item) {
  const s = estado.estoque;
  if (item === "toalha") return s.toalha.limpas;
  if (item === "peca") return s.peca.qtd;
  return s.jantar.lotes.reduce((a, l) => a + l.qtd, 0);
}

// Começo da manhã: toalhas voltam, peças chegam, ingredientes vencem.
export function manha(tema, estado) {
  const s = estado.estoque, c = tema.estoque;
  s.hoje = novoDia();
  // Alguns jogos somem ou mancham na lavanderia.
  let perdidas = 0;
  for (let i = 0; i < s.toalha.usadas; i++) if (sorteio(estado) < (c.toalha.perda || 0)) perdidas++;
  s.hoje.perdidas = perdidas;
  s.hoje.voltaram = s.toalha.usadas - perdidas;
  s.toalha.limpas += s.toalha.usadas - perdidas;
  s.toalha.usadas = 0;
  s.hoje.chegou = s.peca.chegando;
  s.peca.qtd += s.peca.chegando;
  s.peca.chegando = 0;
  const validos = [];
  for (const l of s.jantar.lotes) {
    if (estado.dia >= l.dia + c.jantar.validade) { s.hoje.estragou += l.qtd; s.hoje.estragouValor += l.qtd * c.jantar.preco; }
    else if (l.qtd > 0) validos.push(l);
  }
  s.jantar.lotes = validos;
  s.compras = { toalha: 0, peca: 0, jantar: 0 };
}

// Porções que vencem amanhã (para avisar o jogador).
export function venceAmanha(tema, estado) {
  const v = tema.estoque.jantar.validade;
  return estado.estoque.jantar.lotes.filter(l => estado.dia + 1 >= l.dia + v).reduce((a, l) => a + l.qtd, 0);
}

export function ajustarCompra(tema, estado, item, delta) {
  const s = estado.estoque;
  s.compras[item] = Math.max(0, Math.min(20, s.compras[item] + delta));
}

export function custoCompras(tema, estado) {
  const s = estado.estoque;
  return Object.entries(s.compras).reduce((a, [k, n]) => a + n * tema.estoque[k].preco, 0);
}

// Ao abrir o check-in, as compras do dia entram (peças só amanhã).
export function efetivarCompras(tema, estado) {
  const s = estado.estoque;
  s.hoje.compras += custoCompras(tema, estado);
  s.toalha.limpas += s.compras.toalha;
  s.peca.chegando += s.compras.peca;
  if (s.compras.jantar) s.jantar.lotes.push({ qtd: s.compras.jantar, dia: estado.dia });
  s.compras = { toalha: 0, peca: 0, jantar: 0 };
}

export function consumir(tema, estado, item) {
  const s = estado.estoque;
  if (disponivel(estado, item) < 1) return false;
  if (item === "toalha") { s.toalha.limpas--; s.toalha.usadas++; s.hoje.lavanderia += tema.estoque.toalha.lavanderia; }
  else if (item === "peca") s.peca.qtd--;
  else { const l = s.jantar.lotes.find(x => x.qtd > 0); l.qtd--; }
  s.hoje.usou[item]++;
  return true;
}

export function emergencia(tema, estado, item) {
  const s = estado.estoque;
  s.hoje.emergencia += tema.estoque[item].emergencia;
  s.hoje.usou[item]++;
}

// Custo do estoque no dia (entra no balanço).
export function custoDoDia(estado) {
  const h = estado.estoque.hoje;
  return h.compras + h.lavanderia + h.emergencia;
}

export function fecharEstoque(estado) {
  const s = estado.estoque;
  s.consumo.push({ ...s.hoje.usou });
  if (s.consumo.length > 7) s.consumo.shift();
  return { ...s.hoje };
}

export function consumoMedio(estado, item, dias = 3) {
  const c = estado.estoque.consumo.slice(-dias);
  if (!c.length) return null;
  return c.reduce((a, x) => a + x[item], 0) / c.length;
}
