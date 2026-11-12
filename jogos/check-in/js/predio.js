// Prédio: quartos, posições e vizinhança (quem faz barulho para quem).

export function listaQuartos(tema) {
  const out = [];
  for (const andar of tema.predio.andares)
    andar.quartos.forEach((q, pos) => out.push({ ...q, andar: andar.n, pos }));
  return out;
}

export function quarto(tema, id) {
  return listaQuartos(tema).find(q => q.id === id);
}

// Vizinhos de um quarto: lado (mesmo andar) e vertical (em cima e embaixo).
export function vizinhos(tema, id) {
  const todos = listaQuartos(tema);
  const q = todos.find(x => x.id === id);
  const out = [];
  for (const v of todos) {
    if (v.id === id) continue;
    if (v.andar === q.andar && Math.abs(v.pos - q.pos) === 1) out.push({ id: v.id, rel: "lado" });
    else if (v.pos === q.pos && Math.abs(v.andar - q.andar) === 1) out.push({ id: v.id, rel: v.andar > q.andar ? "cima" : "baixo" });
  }
  return out;
}

// Barulho que vem do térreo (recepção) para os quartos do 1º andar.
export function barulhoTerreo(tema, id) {
  const q = quarto(tema, id);
  if (q.andar !== 1) return null;
  const area = tema.predio.terreo.find(a => a.sob.includes(q.pos) && a.barulho > 0);
  return area ? { nome: area.nome, barulho: area.barulho } : null;
}

export function quartosLivres(estado) {
  return Object.entries(estado.quartos).filter(([, h]) => !h).map(([id]) => id);
}
