const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors()); // Permite que o HTML acesse a API
app.use(express.json());

// Inicia o banco de dados SQLite
const db = new sqlite3.Database('./lanches.sqlite');

// Criação da tabela e inserção de dados iniciais
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        descricao TEXT,
        preco REAL,
        imagem_url TEXT
    )`, (err) => {
        if (err) console.error('Erro ao criar tabela Produtos:', err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS Pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_cliente TEXT,
        total REAL,
        status TEXT
    )`, (err) => {
        if (err) console.error('Erro ao criar tabela Pedidos:', err.message);
    });

    // Inserindo dados falsos caso a tabela esteja vazia
    db.get("SELECT COUNT(*) as count FROM Produtos", (err, row) => {
        if (err) {
            console.error('Erro ao contar produtos:', err.message);
            return;
        }
        if (row.count === 0) {
            db.run(`INSERT INTO Produtos (nome, descricao, preco, imagem_url) VALUES 
            ('Simprão', 'Pão, hambúrguer, cheddar, cream cheese', 22.00, '🍔'),
            ('Salada', 'Pão, hambúrguer, cebola roxa, tomate, picles, alface, cheddar, cream cheese', 28.00, '🥗'),
            ('Duplo', 'Pão, 2 hambúrgueres, duplo cheddar, cream cheese', 37.00, '🍔'),
            ('Colosso', 'Pão, hambúrguer, bacon, calabresa, cebola roxa, tomate, alface, cheddar, cream cheese', 42.00, '🍔'),
            ('K2', 'Pão, 2 hambúrgueres, dobro de bacon, dobro de calabresa, dobro de cheddar, cream cheese', 49.00, '🔥'),
            ('Da Hora', 'Pão, 2 vinas, batata palha, cebola, tomate, cheddar, cream cheese', 18.00, '🌭'),
            ('Oh My Dog', 'Pão, 2 vinas, batata palha, cebola, tomate, bacon, calabresa, cheddar, cream cheese', 23.00, '🌭'),
            ('Pão com Carne', 'Pão, hambúrguer artesanal 130g, batata palha, cebola, tomate, cheddar, cream cheese', 25.00, '🍔'),
            ('Fritas Individual', 'Porção individual 200g', 20.00, '🍟'),
            ('Fritas com Bacon', 'Porção com bacon 200g', 25.00, '🍟')`,
            (err) => {
                if (err) console.error('Erro ao inserir produtos iniciais:', err.message);
            });
        }
    });
});

// Rota da API para buscar o cardápio
app.get('/api/produtos', (req, res) => {
    db.all("SELECT * FROM Produtos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota para receber um novo pedido
app.post('/api/pedidos', (req, res) => {
    const { cliente, total } = req.body;

    if (!cliente || total === undefined || total === null) {
        return res.status(400).json({ error: 'Campos "cliente" e "total" são obrigatórios.' });
    }

    const totalNumerico = Number(total);
    if (isNaN(totalNumerico)) {
        return res.status(400).json({ error: 'O campo "total" deve ser um número.' });
    }

    // Insere o pedido no banco de dados com o status 'pendente'
    db.run(
        `INSERT INTO Pedidos (nome_cliente, total, status) VALUES (?, ?, 'pendente')`,
        [cliente, totalNumerico],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensagem: 'Pedido salvo com sucesso!', id_pedido: this.lastID });
        }
    );
});

// Rota para listar todos os pedidos para a tela da cozinha
app.get('/api/pedidos', (req, res) => {
    // Faz um SELECT na tabela de Pedidos, ordenando do mais recente para o mais antigo
    db.all("SELECT * FROM Pedidos ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota para atualizar o status de um pedido
app.patch('/api/pedidos/:id/status', (req, res) => {
    const idPedido = req.params.id;
    const novoStatus = req.body.status;

    // Comando SQL para atualizar apenas a coluna de status do pedido específico
    db.run(
        `UPDATE Pedidos SET status = ? WHERE id = ?`,
        [novoStatus, idPedido],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensagem: 'Status atualizado com sucesso!' });
        }
    );
});

// Rota para cadastrar um novo produto no cardápio
app.post('/api/produtos', (req, res) => {
    const { nome, descricao, preco, imagem_url } = req.body;

    db.run(
        `INSERT INTO Produtos (nome, descricao, preco, imagem_url) VALUES (?, ?, ?, ?)`,
        [nome, descricao, preco, imagem_url || '🍔'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensagem: 'Produto cadastrado com sucesso!', id: this.lastID });
        }
    );
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
