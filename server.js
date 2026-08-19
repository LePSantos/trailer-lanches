const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // Permite que o HTML acesse a API
app.use(express.json());

// Serve os arquivos HTML (index, admin, cozinha) direto pelo servidor.
// Isso permite acessar tudo por http://SEU-IP:3000/ em vez de abrir o arquivo do disco,
// o que é essencial para o QR Code funcionar no celular do cliente.
app.use(express.static(path.join(__dirname)));

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

    // Adiciona a coluna "categoria" na tabela Produtos, caso ainda não exista
    // (usada para separar lanches de bebidas no cardápio)
    db.run(`ALTER TABLE Produtos ADD COLUMN categoria TEXT DEFAULT 'lanche'`, (err) => {
        // Ignora o erro "duplicate column name", que acontece se a coluna já existir
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Erro ao adicionar coluna categoria:', err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS Pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_cliente TEXT,
        total REAL,
        status TEXT
    )`, (err) => {
        if (err) console.error('Erro ao criar tabela Pedidos:', err.message);
    });

    // Nova tabela: Adicionais (bacon, cheddar, calabresa, etc.)
    db.run(`CREATE TABLE IF NOT EXISTS Adicionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        preco REAL
    )`, (err) => {
        if (err) console.error('Erro ao criar tabela Adicionais:', err.message);
    });

    // Inserindo dados falsos caso a tabela de produtos esteja vazia
    db.get("SELECT COUNT(*) as count FROM Produtos", (err, row) => {
        if (err) {
            console.error('Erro ao contar produtos:', err.message);
            return;
        }
        if (row.count === 0) {
            db.run(`INSERT INTO Produtos (nome, descricao, preco, imagem_url, categoria) VALUES 
            ('Simprão', 'Pão, hambúrguer, cheddar, cream cheese', 22.00, '🍔', 'lanche'),
            ('Salada', 'Pão, hambúrguer, cebola roxa, tomate, picles, alface, cheddar, cream cheese', 28.00, '🥗', 'lanche'),
            ('Duplo', 'Pão, 2 hambúrgueres, duplo cheddar, cream cheese', 37.00, '🍔', 'lanche'),
            ('Colosso', 'Pão, hambúrguer, bacon, calabresa, cebola roxa, tomate, alface, cheddar, cream cheese', 42.00, '🍔', 'lanche'),
            ('K2', 'Pão, 2 hambúrgueres, dobro de bacon, dobro de calabresa, dobro de cheddar, cream cheese', 49.00, '🔥', 'lanche'),
            ('Da Hora', 'Pão, 2 vinas, batata palha, cebola, tomate, cheddar, cream cheese', 18.00, '🌭', 'lanche'),
            ('Oh My Dog', 'Pão, 2 vinas, batata palha, cebola, tomate, bacon, calabresa, cheddar, cream cheese', 23.00, '🌭', 'lanche'),
            ('Pão com Carne', 'Pão, hambúrguer artesanal 130g, batata palha, cebola, tomate, cheddar, cream cheese', 25.00, '🍔', 'lanche'),
            ('Fritas Individual', 'Porção individual 200g', 20.00, '🍟', 'lanche'),
            ('Fritas com Bacon', 'Porção com bacon 200g', 25.00, '🍟', 'lanche')`,
            (err) => {
                if (err) console.error('Erro ao inserir produtos iniciais:', err.message);
            });
        }
    });

    // Inserindo as bebidas, caso ainda não existam produtos com categoria 'bebida'
    // (roda separado da checagem acima, então funciona mesmo em bancos que já têm lanches)
    db.get("SELECT COUNT(*) as count FROM Produtos WHERE categoria = 'bebida'", (err, row) => {
        if (err) {
            console.error('Erro ao contar bebidas:', err.message);
            return;
        }
        if (row.count === 0) {
            db.run(`INSERT INTO Produtos (nome, descricao, preco, imagem_url, categoria) VALUES 
            ('Coca-Cola', 'Lata Tradicional 350ml', 3.50, '🥤', 'bebida'),
            ('Coca-Cola Zero', 'Lata 350ml', 3.50, '🥤', 'bebida'),
            ('Coca-Cola', 'Garrafa 1 Litro', 6.50, '🥤', 'bebida'),
            ('Coca-Cola Zero', 'Garrafa 1 Litro', 6.50, '🥤', 'bebida'),
            ('Guaraná Antarctica', 'Lata Tradicional 350ml', 3.50, '🥤', 'bebida'),
            ('Fanta Laranja', 'Lata Tradicional 350ml', 3.50, '🥤', 'bebida'),
            ('Fanta Uva', 'Lata Tradicional 350ml', 3.50, '🥤', 'bebida'),
            ('Sprite', 'Lata Tradicional 350ml', 3.50, '🥤', 'bebida'),
            ('Sprite', 'Garrafa 2 Litros', 7.49, '🥤', 'bebida')`,
            (err) => {
                if (err) console.error('Erro ao inserir bebidas iniciais:', err.message);
            });
        }
    });

    // Inserindo os adicionais padrão, caso a tabela esteja vazia
    db.get("SELECT COUNT(*) as count FROM Adicionais", (err, row) => {
        if (err) {
            console.error('Erro ao contar adicionais:', err.message);
            return;
        }
        if (row.count === 0) {
            db.run(`INSERT INTO Adicionais (nome, preco) VALUES
            ('Bacon', 10.00),
            ('Hambúrguer', 10.00),
            ('Calabresa', 8.00),
            ('Cheddar', 5.00),
            ('Picles', 3.00),
            ('Vina', 3.00),
            ('Salada', 3.00)`,
            (err) => {
                if (err) console.error('Erro ao inserir adicionais iniciais:', err.message);
            });
        }
    });
});

// Rota da API para buscar o cardápio (lanches e bebidas)
app.get('/api/produtos', (req, res) => {
    db.all("SELECT * FROM Produtos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota da API para buscar a lista de adicionais
app.get('/api/adicionais', (req, res) => {
    db.all("SELECT * FROM Adicionais", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota para cadastrar um novo adicional
app.post('/api/adicionais', (req, res) => {
    const { nome, preco } = req.body;

    if (!nome || preco === undefined || preco === null) {
        return res.status(400).json({ error: 'Campos "nome" e "preco" são obrigatórios.' });
    }

    db.run(
        `INSERT INTO Adicionais (nome, preco) VALUES (?, ?)`,
        [nome, Number(preco)],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensagem: 'Adicional cadastrado com sucesso!', id: this.lastID });
        }
    );
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
    const { nome, descricao, preco, imagem_url, categoria } = req.body;

    db.run(
        `INSERT INTO Produtos (nome, descricao, preco, imagem_url, categoria) VALUES (?, ?, ?, ?, ?)`,
        [nome, descricao, preco, imagem_url || '🍔', categoria || 'lanche'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensagem: 'Produto cadastrado com sucesso!', id: this.lastID });
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
