// whatsapp-carteira-bot/index.js
const venom = require('venom-bot');
const fs = require('fs');
const path = './db.json';

// Função para carregar os dados
function loadDB() {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify({ saldo: 0, entradas: [], gastos: [], categorias: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(path));
}

// Função para salvar os dados
function saveDB(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Inicializa o bot
venom
  .create()
  .then((client) => start(client))
  .catch((error) => console.log(error));

function start(client) {
  client.onMessage(async (msg) => {
    if (!msg.body || msg.isGroupMsg) return;

    const db = loadDB();
    const text = msg.body.trim();
    const user = msg.from;

    if (text.startsWith('/categoria ')) {
      const novaCat = text.replace('/categoria ', '').trim();
      if (!db.categorias.includes(novaCat)) {
        db.categorias.push(novaCat);
        saveDB(db);
        client.sendText(user, `✅ Categoria '${novaCat}' adicionada!`);
      } else {
        client.sendText(user, `⚠️ Categoria '${novaCat}' já existe.`);
      }
      return;
    }

    if (text === '/resumo') {
      let entradasTotal = db.entradas.reduce((acc, e) => acc + e.valor, 0);
      let gastosTotal = db.gastos.reduce((acc, g) => acc + g.valor, 0);
      let resumo = `💰 Saldo: R$${db.saldo.toFixed(2)}\n📈 Entradas: R$${entradasTotal}\n📉 Gastos: R$${gastosTotal}\n\n📊 Por categoria:\n`;

      const totais = {};
      db.entradas.forEach(e => {
        totais[e.categoria] = (totais[e.categoria] || 0) + e.valor;
      });
      db.gastos.forEach(g => {
        totais[g.categoria] = (totais[g.categoria] || 0) - g.valor;
      });
      for (let cat in totais) {
        resumo += `- ${cat}: R$${totais[cat]}\n`;
      }
      client.sendText(user, resumo);
      return;
    }

    const regexEntrada = /recebi|ganhei|entrada/i;
    const valor = parseFloat(text.split(' ').pop().replace(',', '.'));
    const descricao = text.replace(valor, '').trim();

    if (isNaN(valor)) return;

    // Entrada (Receita)
    if (regexEntrada.test(text)) {
      db.entradas.push({ descricao, valor, categoria: '', data: new Date().toISOString() });
      db.saldo += valor;
      saveDB(db);
      client.sendText(user, `📥 Entrada de R$${valor} registrada.\n📌 Qual categoria?`);
    } else {
      // Gasto
      db.gastos.push({ descricao, valor, categoria: '', data: new Date().toISOString() });
      db.saldo -= valor;
      saveDB(db);
      client.sendText(user, `💸 Gasto '${descricao}' de R$${valor} registrado.\n📌 Qual categoria?`);
    }
  });
}
