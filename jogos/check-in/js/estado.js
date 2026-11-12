// Estado do jogo: criação, sorteio (com semente) e save no navegador.
// Não sabe nada de desenho.

import { novoEstoque } from "./estoque.js";

const CHAVE = "checkin.save.v1";
const CHAVE_RECORDE = "checkin.recorde.v1";

// Sorteio com semente: o mesmo save sempre gera o mesmo dia.
export function rng(estado) {
  let t = (estado.semente = (estado.semente + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const entre = (e, a, b) => a + Math.floor(rng(e) * (b - a + 1));
export const escolhe = (e, lista) => lista[Math.floor(rng(e) * lista.length)];
export function sorteiaPeso(e, pesos) {
  const total = Object.values(pesos).reduce((s, v) => s + v, 0);
  let r = rng(e) * total;
  for (const [k, v] of Object.entries(pesos)) { if ((r -= v) < 0) return k; }
  return Object.keys(pesos)[0];
}

export function novoEstado(tema, nTemporada = 1, semente) {
  const temp = tema.temporadas.find(t => t.n === nTemporada) || tema.temporadas[0];
  const quartos = {};
  for (const andar of tema.predio.andares)
    for (const q of andar.quartos) quartos[q.id] = null;
  const precos = {};
  for (const [k, t] of Object.entries(tema.tipos)) precos[k] = t.preco;
  return {
    versao: 1,
    tema: tema.id,
    temporada: temp.n,
    semente: (semente ?? Math.floor(Math.random() * 2 ** 32)) >>> 0,
    dia: 1,
    fase: "manha",          // manha | checkin | noite | fim
    caixa: temp.caixaInicial,
    rep: 3.0,
    precos,
    quartos,                // id -> hóspede ou null
    fila: [],               // grupos esperando o check-in de hoje
    desfazer: [],           // pilha de colocações do dia
    proximoId: 1,
    usados: {},             // nomes já usados (para não repetir muito)
    historico: [],          // um registro por dia fechado
    balanco: null,          // resultado do último fechamento
    recusadosHoje: 0,
    estoque: novoEstoque(tema)
  };
}

export function salvar(estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {}
}
export function carregar() {
  try { const s = localStorage.getItem(CHAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch (e) {}
}
export function lerRecorde() {
  try { return JSON.parse(localStorage.getItem(CHAVE_RECORDE) || "null"); } catch (e) { return null; }
}
export function gravarRecorde(r) {
  try { localStorage.setItem(CHAVE_RECORDE, JSON.stringify(r)); } catch (e) {}
}
