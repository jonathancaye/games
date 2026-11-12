// Economia: preço e procura, fechamento do dia, indicadores e resultado da temporada.

import { rng } from "./estado.js";
import { listaQuartos, quarto } from "./predio.js";
import { novoEstoque, manha, efetivarCompras, custoCompras, custoDoDia, fecharEstoque, disponivel } from "./estoque.js";
import {
  temporadaAtual, gerarChegadas, satisfacao, estrelasDe, comentario, tinhaVaga, chegadasPrevistas
} from "./hospedes.js";

// Começo do dia: chegam os grupos de hoje.
export function iniciarDia(tema, estado) {
  if (!estado.estoque) estado.estoque = novoEstoque(tema);
  manha(tema, estado);
  estado.fila = gerarChegadas(tema, estado);
  estado.desfazer = [];
  estado.fase = "manha";
}

// Quantos dos grupos de hoje topam cada tipo de quarto pelo preço atual.
export function procura(tema, estado) {
  const out = {};
  for (const [k, t] of Object.entries(tema.tipos)) {
    out[k] = estado.fila.filter(h => tema.perfis[h.perfil].minTipo <= t.rank && h.orc >= estado.precos[k]).length;
  }
  return out;
}

// Estimativa do dia com os preços atuais: quem topa entra no melhor quarto que pode pagar.
export function estimativaDia(tema, estado) {
  const temp = temporadaAtual(tema, estado);
  const livres = {};
  for (const q of listaQuartos(tema)) if (!estado.quartos[q.id]) livres[q.tipo] = (livres[q.tipo] || 0) + 1;
  const casa = Object.values(estado.quartos).filter(Boolean);
  let receita = casa.reduce((s, h) => s + h.preco, 0), ocupados = casa.length;
  const tipos = Object.entries(tema.tipos).sort((a, b) => b[1].rank - a[1].rank);
  for (const h of [...estado.fila].sort((a, b) => b.orc - a.orc)) {
    for (const [k, t] of tipos) {
      if (livres[k] && t.rank >= tema.perfis[h.perfil].minTipo && estado.precos[k] <= h.orc) {
        livres[k]--; receita += estado.precos[k]; ocupados++; break;
      }
    }
  }
  const extra = (estado.estoque ? custoCompras(tema, estado) : 0) + ocupados * (tema.estoque ? tema.estoque.toalha.lavanderia : 0);
  const custos = temp.custoFixo + ocupados * temp.custoQuarto + extra;
  return { receita, custos, lucro: receita - custos, ocupados, fixo: temp.custoFixo, porQuarto: temp.custoQuarto };
}

export function previsao(tema, estado) {
  const m = chegadasPrevistas(tema, estado);
  return { min: Math.max(0, Math.round(m) - 1), max: Math.round(m) + 1 };
}

export function abrirCheckin(estado, tema) {
  if (tema && estado.estoque) efetivarCompras(tema, estado);
  estado.fase = "checkin";
  estado.desfazer = [];
}

// Fim do check-in: quem ficou na fila vai embora.
export function encerrarCheckin(tema, estado) {
  const saida = { recusados: 0, caros: 0, semVaga: 0, nomes: [] };
  const recusadosNaMao = estado.desfazer.filter(u => u.tipo === "recusar").map(u => u.h);
  for (const h of [...estado.fila, ...recusadosNaMao]) {
    if (tinhaVaga(tema, estado, h)) { saida.recusados++; estado.rep = Math.max(1, estado.rep - 0.03); }
    else {
      const algumQuartoServe = Object.entries(tema.tipos).some(([k, t]) => tema.perfis[h.perfil].minTipo <= t.rank && Object.entries(estado.quartos).some(([id, o]) => !o && quarto(tema, id).tipo === k));
      if (algumQuartoServe) saida.caros++; else saida.semVaga++;
    }
  }
  estado.fila = [];
  estado.desfazer = [];
  estado.saidaCheckin = saida;
  estado.fase = "noite";
}

// Noite: cobra as diárias, mede a satisfação e faz o check-out.
export function fecharDia(tema, estado) {
  const temp = temporadaAtual(tema, estado);
  const total = listaQuartos(tema).length;
  const foto = { ...estado.quartos };
  let receita = 0, ocupados = 0;
  const avaliacoes = [];
  const humores = {};

  for (const [id, h] of Object.entries(foto)) {
    if (!h) continue;
    ocupados++;
    receita += h.preco;
    const s = satisfacao(tema, estado, h, id, foto);
    h.sats.push(s.valor);
    h.fatores = s.fatores;
    h.noites--;
    humores[id] = s.valor;
    const foiEmbora = h.noites > 0 && s.valor < 30 && rng(estado) < 0.5;
    if (h.noites <= 0 || foiEmbora) {
      const media = h.sats.reduce((a, b) => a + b, 0) / h.sats.length;
      const estrelas = foiEmbora ? 1 : estrelasDe(media);
      const texto = foiEmbora ? "Fomos embora antes. " + comentario(1, s.fatores) : comentario(estrelas, s.fatores);
      avaliacoes.push({ nome: h.nome, perfil: h.perfil, quarto: id, estrelas, texto, antes: foiEmbora });
      estado.rep = Math.max(1, Math.min(5, estado.rep + (estrelas - estado.rep) * 0.18));
      estado.quartos[id] = null;
    }
  }

  const est = estado.estadia;
  if (est) receita += est.receita;
  const custoEstoque = estado.estoque ? custoDoDia(estado) : 0;
  const custos = temp.custoFixo + ocupados * temp.custoQuarto + (est ? est.custo : 0) + custoEstoque;
  const resEstoque = estado.estoque ? fecharEstoque(estado) : null;
  const lucro = receita - custos;
  for (const h of Object.values(estado.quartos)) if (h) { h.ajustes = []; h.pedidosHoje = 0; }
  estado.caixa += lucro;
  const reg = {
    dia: estado.dia, receita, custos, lucro, ocupados, total,
    ocupacao: ocupados / total,
    adr: ocupados ? receita / ocupados : 0,
    revpar: receita / total,
    avaliacoes, rep: estado.rep, caixa: estado.caixa,
    saida: estado.saidaCheckin || { recusados: 0, caros: 0, semVaga: 0 },
    estoque: resEstoque ? { ...resEstoque, custo: custoEstoque, toalhas: disponivel(estado, "toalha") + estado.estoque.toalha.usadas, pecas: disponivel(estado, "peca"), chegando: estado.estoque.peca.chegando, jantar: disponivel(estado, "jantar") } : null,
    pedidos: est ? { atendidos: est.atendidos, ignorados: est.ignorados, receita: est.receita, custo: est.custo, semToalha: est.semToalha || 0, emergencias: est.emergencias || 0 } : null,
    humores
  };
  estado.historico.push(reg);
  estado.balanco = reg;
  estado.saidaCheckin = null;
  estado.estadia = null;
  estado.fase = "noite";
  return reg;
}

// Passa para o dia seguinte (ou fecha a temporada).
export function proximoDia(tema, estado) {
  const temp = temporadaAtual(tema, estado);
  if (estado.dia >= temp.dias) { estado.fase = "fim"; return; }
  estado.dia++;
  iniciarDia(tema, estado);
}

export function resumoTemporada(tema, estado) {
  const temp = temporadaAtual(tema, estado);
  const h = estado.historico;
  const soma = k => h.reduce((s, r) => s + r[k], 0);
  const noites = soma("ocupados");
  const receita = soma("receita");
  const total = h.length * (h[0]?.total || 1);
  const avals = h.flatMap(r => r.avaliacoes);
  let estrelas = 0;
  for (const m of temp.metas) if (estado.caixa >= m.caixa && estado.rep >= m.rep) estrelas = m.estrelas;
  return {
    caixa: estado.caixa,
    lucro: estado.caixa - temp.caixaInicial,
    rep: estado.rep,
    ocupacao: noites / total,
    adr: noites ? receita / noites : 0,
    revpar: receita / total,
    hospedes: avals.length,
    cinco: avals.filter(a => a.estrelas === 5).length,
    ruins: avals.filter(a => a.estrelas <= 2).length,
    recusados: h.reduce((s, r) => s + r.saida.recusados, 0),
    estrelas,
    metas: temp.metas
  };
}
