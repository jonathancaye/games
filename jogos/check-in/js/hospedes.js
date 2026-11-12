// Hóspedes: chegada, quem cabe em qual quarto, satisfação e avaliações.

import { rng, entre, escolhe, sorteiaPeso } from "./estado.js";
import { quarto, vizinhos, barulhoTerreo } from "./predio.js";

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const diaSemana = dia => (dia - 1) % 7;
export const ehFimDeSemana = dia => diaSemana(dia) >= 4; // sex, sáb, dom

export function temporadaAtual(tema, estado) {
  return tema.temporadas.find(t => t.n === estado.temporada) || tema.temporadas[0];
}

export function ehFeriado(temp, dia) {
  return !!(temp.feriado && temp.feriado.dias.includes(dia));
}

// Quantos grupos chegam no dia (antes do sorteio fino).
export function chegadasPrevistas(tema, estado, dia = estado.dia) {
  const temp = temporadaAtual(tema, estado);
  let base = temp.chegadas[diaSemana(dia)];
  if (ehFeriado(temp, dia)) base += temp.feriado.extra;
  const fatorRep = 0.55 + 0.15 * estado.rep; // rep 3 = 1.0
  return Math.max(0, base * fatorRep);
}

export function fatorOrcamento(rep) { return 0.7 + 0.1 * rep; }

export function gerarChegadas(tema, estado) {
  const media = chegadasPrevistas(tema, estado);
  let n = Math.round(media + (rng(estado) - 0.5) * 2);
  n = Math.max(media > 0.5 ? 1 : 0, n);
  const fim = ehFimDeSemana(estado.dia) || ehFeriado(temporadaAtual(tema, estado), estado.dia);
  const pesos = {};
  for (const [k, p] of Object.entries(tema.perfis)) pesos[k] = fim ? p.peso.fim : p.peso.semana;
  const fila = [];
  for (let i = 0; i < n; i++) {
    const perfil = sorteiaPeso(estado, pesos);
    const p = tema.perfis[perfil];
    const orc = Math.round((p.orc * (0.78 + rng(estado) * 0.5) * fatorOrcamento(estado.rep)) / 10) * 10;
    const ds = diaSemana(estado.dia);
    const noites = ds === 4 ? entre(estado, 2, 3) : ds >= 5 ? entre(estado, 1, 2) : entre(estado, 1, 3);
    fila.push({ id: estado.proximoId++, perfil, nome: nomeLivre(estado, p.nomes), orc, noites, sats: [], chegou: estado.dia });
  }
  return fila;
}

function nomeLivre(estado, nomes) {
  const livres = nomes.filter(n => !estado.usados[n]);
  const nome = escolhe(estado, livres.length ? livres : nomes);
  estado.usados[nome] = (estado.usados[nome] || 0) + 1;
  return nome;
}

// Pode colocar o grupo neste quarto?
export function podeFicar(tema, estado, h, id) {
  if (estado.quartos[id]) return { ok: false, motivo: "Ocupado" };
  const q = quarto(tema, id);
  const p = tema.perfis[h.perfil];
  if (tema.tipos[q.tipo].rank < p.minTipo) return { ok: false, motivo: "Simples demais" };
  if (estado.precos[q.tipo] > h.orc) return { ok: false, motivo: "Caro demais" };
  return { ok: true };
}

// Satisfação de um hóspede num quarto, com a ocupação informada.
// Devolve o valor (0–100) e os fatores que explicam a nota.
export function satisfacao(tema, estado, h, id, ocupacao = estado.quartos, preco) {
  const q = quarto(tema, id);
  const p = tema.perfis[h.perfil];
  const fatores = [];
  let v = 70;
  const add = (txt, d, chave) => { v += d; fatores.push({ txt, d, chave }); };

  if (p.prefs.includes("vista")) q.vista ? add("Vista para o mar", 14, "vista+") : add("Sem vista para o mar", -12, "vista-");
  if (p.prefs.includes("baixo")) q.andar === 1 ? add("Andar baixo, bom para as crianças", 10, "baixo+") : add("Escada demais com as crianças", -10, "baixo-");
  if (tema.tipos[q.tipo].rank > p.minTipo) add("Quarto melhor do que esperavam", 8, "upgrade");

  const pago = preco ?? h.preco ?? estado.precos[q.tipo];
  const folga = Math.max(0, (h.orc - pago) / h.orc);
  const dPreco = Math.round(folga * 25);
  if (dPreco >= 4) add(dPreco >= 10 ? "Preço ótimo" : "Preço justo", dPreco, "preco");
  else if (dPreco > 0) v += dPreco;

  for (const viz of vizinhos(tema, id)) {
    const o = ocupacao[viz.id];
    if (!o || o.id === h.id) continue;
    const po = tema.perfis[o.perfil];
    if (viz.rel === "lado" && o.perfil === "familia" && h.perfil === "familia") {
      add(`Crianças brincaram com os vizinhos do ${viz.id}`, 6, "amigos");
      continue;
    }
    const fator = viz.rel === "lado" ? 1 : 0.7;
    const pen = Math.round(po.barulho * p.sens * 3.5 * fator);
    if (pen >= 2) add(`Barulho ${viz.rel === "lado" ? "no quarto ao lado" : viz.rel === "cima" ? "no andar de cima" : "no andar de baixo"} (${viz.id})`, -pen, "barulho");
  }
  const t = barulhoTerreo(tema, id);
  if (t) {
    const pen = Math.round(t.barulho * p.sens * 3.5 * 0.7);
    if (pen >= 2) add(`Movimento da ${t.nome.toLowerCase()} embaixo`, -pen, "terreo");
  }
  return { valor: Math.max(5, Math.min(100, Math.round(v))), fatores };
}

// Como os vizinhos ficariam se este grupo entrasse no quarto.
export function efeitoNosVizinhos(tema, estado, h, id) {
  const depois = { ...estado.quartos, [id]: h };
  const out = [];
  for (const viz of vizinhos(tema, id)) {
    const o = estado.quartos[viz.id];
    if (!o) continue;
    const antes = satisfacao(tema, estado, o, viz.id).valor;
    const novo = satisfacao(tema, estado, o, viz.id, depois).valor;
    if (novo !== antes) out.push({ id: viz.id, delta: novo - antes });
  }
  return out;
}

export function humor(v) { return v >= 70 ? "feliz" : v >= 45 ? "ok" : "bravo"; }
export function estrelasDe(media) { return media >= 85 ? 5 : media >= 72 ? 4 : media >= 58 ? 3 : media >= 44 ? 2 : 1; }

// Ações do check-in
export function colocar(tema, estado, hId, id) {
  const i = estado.fila.findIndex(h => h.id === hId);
  if (i < 0) return false;
  const h = estado.fila[i];
  if (!podeFicar(tema, estado, h, id).ok) return false;
  h.preco = estado.precos[quarto(tema, id).tipo];
  h.quarto = id;
  estado.quartos[id] = h;
  estado.fila.splice(i, 1);
  estado.desfazer.push({ tipo: "colocar", h, id, pos: i });
  return true;
}

export function recusar(tema, estado, hId) {
  const i = estado.fila.findIndex(h => h.id === hId);
  if (i < 0) return false;
  const h = estado.fila[i];
  estado.fila.splice(i, 1);
  estado.desfazer.push({ tipo: "recusar", h, pos: i });
  return true;
}

export function desfazer(estado) {
  const u = estado.desfazer.pop();
  if (!u) return false;
  if (u.tipo === "colocar") { estado.quartos[u.id] = null; delete u.h.preco; delete u.h.quarto; }
  estado.fila.splice(Math.min(u.pos, estado.fila.length), 0, u.h);
  return true;
}

// Havia algum quarto em que o grupo caberia?
export function tinhaVaga(tema, estado, h) {
  return Object.keys(estado.quartos).some(id => podeFicar(tema, estado, h, id).ok);
}

// Texto da avaliação ao sair.
export function comentario(estrelas, fatores) {
  const neg = fatores.filter(f => f.d < 0).sort((a, b) => a.d - b.d);
  const pos = fatores.filter(f => f.d > 0).sort((a, b) => b.d - a.d);
  if (estrelas <= 2 && neg.length) return neg[0].txt + ".";
  if (estrelas >= 4 && pos.length) return pos[0].txt + "!";
  if (neg.length && pos.length) return `${pos[0].txt}, mas ${neg[0].txt.toLowerCase()}.`;
  if (pos.length) return pos[0].txt + ".";
  if (neg.length) return neg[0].txt + ".";
  return estrelas >= 3 ? "Estadia tranquila." : "Esperávamos mais.";
}
