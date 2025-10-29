const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Inicializar banco de dados SQLite
const db = new sqlite3.Database('./expenses.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conectado ao banco de dados SQLite');
  }
});

// Criar tabela de despesas (expenses)
db.run(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ================= ROTAS ================= //

// 1. Listar todas as despesas
app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ expenses: rows });
  });
});

// 2. Buscar uma despesa por ID
app.get('/api/expenses/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Despesa não encontrada' });

    res.json({ expense: row });
  });
});

// 3. Criar nova despesa
app.post('/api/expenses', (req, res) => {
  const { description, amount, category, date } = req.body;

  if (!description || !amount || !category || !date) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const sql = 'INSERT INTO expenses (description, amount, category, date) VALUES (?, ?, ?, ?)';
  db.run(sql, [description, amount, category, date], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      message: 'Despesa criada com sucesso',
      expense: {
        id: this.lastID,
        description,
        amount,
        category,
        date
      }
    });
  });
});

// 4. Atualizar despesa
app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { description, amount, category, date } = req.body;

  const sql = 'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ?';
  db.run(sql, [description, amount, category, date, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Despesa não encontrada' });

    res.json({ message: 'Despesa atualizada com sucesso' });
  });
});

// 5. Deletar despesa
app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Despesa não encontrada' });

    res.json({ message: 'Despesa deletada com sucesso' });
  });
});

// 6. Total de despesas
app.get('/api/expenses/stats/total', (req, res) => {
  db.get('SELECT SUM(amount) as total FROM expenses', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ total: row.total || 0 });
  });
});

// 7. Despesas agrupadas por categoria
app.get('/api/expenses/stats/by-category', (req, res) => {
  db.all('SELECT category, SUM(amount) as total FROM expenses GROUP BY category', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ categories: rows });
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na rede em: http://0.0.0.0:${PORT}`);
  console.log(`Acesse pelo celular usando: http://SEU_IP_LOCAL:${PORT}/api/expenses`);
});


// Encerrar banco ao fechar app
process.on('SIGINT', () => {
  db.close();
  console.log('Banco de dados fechado.');
  process.exit(0);
});
