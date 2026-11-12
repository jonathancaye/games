// Economia: preço e procura, fechamento do dia, indicadores e resultado da temporada.

import { rng } from "./estado.js";
import { listaQuartos, quarto } from "./predio.js";
import {
  temporadaAtual, gerarChegadas, satisfacao, estrelasDe, comentario, tinhaVaga, chegadasPrevistas
} from "./hospedes.js";

// Começo do dia: chegam os grupos de hoje.
export function iniciarDia(tema, estado) {
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

export function previsao(tema, estado) {
  const m = chegadasPrevistas(tema, estado);
  return { min: Math.max(0, Math.round(m) - 1), max: Math.round(m) + 1 };
}

export function abrirCheckin(estado) {
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

  const custos = temp.custoFixo + ocupados * temp.custoQuarto;
  const lucro = receita - custos;
  estado.caixa += lucro;
  const reg = {
    dia: estado.dia, receita, custos, lucro, ocupados, total,
    ocupacao: ocupados / total,
    adr: ocupados ? receita / ocupados : 0,
    revpar: receita / total,
    avaliacoes, rep: estado.rep, caixa: estado.caixa,
    saida: estado.saidaCheckin || { recusados: 0, caros: 0, semVaga: 0 },
    humores
  };
  estado.historico.push(reg);
  estado.balanco = reg;
  estado.saidaCheckin = null;
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
