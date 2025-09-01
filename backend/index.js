// backend/index.js - Versão Final para Produção (Render)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path'); // Módulo para lidar com caminhos de ficheiros

const app = express();
// O Render define a porta através da variável de ambiente PORT
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração da conexão com a base de dados do Render
// Esta é a alteração mais importante para a produção!
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // O Render fornece esta variável de ambiente
    ssl: {
        rejectUnauthorized: false // Necessário para as ligações SSL do Render
    }
});

// --- ROTAS DA API ---
// Todas as rotas agora começam com /api para não conflitarem com o front-end
app.post('/api/registro', async (req, res) => {
    let client;
    try {
        const { nomeCuidador, email, senhaCuidador, nomeIdoso, loginIdoso, senhaIdoso } = req.body;
        client = await pool.connect();
        await client.query('BEGIN');
        const salt = await bcrypt.genSalt(10);
        const senhaCuidadorHash = await bcrypt.hash(senhaCuidador, salt);
        const senhaIdosoHash = await bcrypt.hash(senhaIdoso, salt);
        const cuidadorResult = await client.query('INSERT INTO cuidadores (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id', [nomeCuidador, email, senhaCuidadorHash]);
        const novoCuidadorId = cuidadorResult.rows[0].id;
        await client.query('INSERT INTO idosos (nome, login_numerico, senha_hash, cuidador_id) VALUES ($1, $2, $3, $4)', [nomeIdoso, loginIdoso, senhaIdosoHash, novoCuidadorId]);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('ERRO DETALHADO NO REGISTO:', error);
        if (error.code === '23505') { return res.status(409).json({ message: 'Email ou Login Numérico do idoso já está em uso.' }); }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (client) client.release();
    }
});

app.post('/api/login/cuidador', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const cuidadorResult = await pool.query('SELECT * FROM cuidadores WHERE email = $1', [email]);
        if (cuidadorResult.rows.length === 0) { return res.status(401).json({ message: 'Email ou senha inválidos.' }); }
        const cuidador = cuidadorResult.rows[0];
        const senhaValida = await bcrypt.compare(senha, cuidador.senha_hash);
        if (!senhaValida) { return res.status(401).json({ message: 'Email ou senha inválidos.' }); }
        const idosoResult = await pool.query('SELECT id, nome FROM idosos WHERE cuidador_id = $1', [cuidador.id]);
        const idoso = idosoResult.rows[0];
        res.status(200).json({
            message: 'Login bem-sucedido!',
            cuidador: { id: cuidador.id, nome: cuidador.nome, email: cuidador.email },
            idoso: { id: idoso.id, nome: idoso.nome }
        });
    } catch (error) {
        console.error('ERRO DETALHADO NO LOGIN DO CUIDADOR:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.post('/api/login/idoso', async (req, res) => {
    try {
        const { login_numerico, senha } = req.body;
        const idosoResult = await pool.query('SELECT * FROM idosos WHERE login_numerico = $1', [login_numerico]);
        if (idosoResult.rows.length === 0) { return res.status(401).json({ message: 'Login ou senha inválidos.' }); }
        const idoso = idosoResult.rows[0];
        const senhaValida = await bcrypt.compare(senha, idoso.senha_hash);
        if (!senhaValida) { return res.status(401).json({ message: 'Login ou senha inválidos.' }); }
        res.status(200).json({ message: 'Login bem-sucedido!', idoso: { id: idoso.id, nome: idoso.nome } });
    } catch (error) {
        console.error('ERRO DETALHADO NO LOGIN DO IDOSO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.post('/api/medicamentos', async (req, res) => {
    try {
        const { nome, dosagem, horario, foto_url, observacoes, idoso_id } = req.body;
        if (!nome || !dosagem || !horario || !idoso_id) { return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' }); }
        const novoMedicamento = await pool.query(
            'INSERT INTO medicamentos (nome, dosagem, horario, foto_url, observacoes, idoso_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, dosagem, horario, foto_url, observacoes, idoso_id]
        );
        res.status(201).json(novoMedicamento.rows[0]);
    } catch (error) {
        console.error('ERRO AO ADICIONAR MEDICAMENTO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('/api/medicamentos/:idosoId', async (req, res) => {
    try {
        const { idosoId } = req.params;
        const medicamentosResult = await pool.query('SELECT * FROM medicamentos WHERE idoso_id = $1 ORDER BY horario', [idosoId]);
        res.status(200).json(medicamentosResult.rows);
    } catch (error) {
        console.error('ERRO AO BUSCAR MEDICAMENTOS:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ... (todas as outras rotas, como /api/medicamento/:id, /api/medicamentos/:id (PUT e DELETE) e /api/historico)

app.delete('/api/medicamentos/:medicamentoId', async (req, res) => {
    try {
        const { medicamentoId } = req.params;
        await pool.query('DELETE FROM medicamentos WHERE id = $1', [medicamentoId]);
        res.status(200).json({ message: 'Medicamento apagado com sucesso.' });
    } catch (error) {
        console.error('ERRO AO APAGAR MEDICAMENTO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.post('/api/historico', async (req, res) => {
    try {
        const { medicamento_id, status } = req.body;
        if (!medicamento_id || !status) { return res.status(400).json({ message: 'Dados insuficientes para registar o histórico.' }); }
        await pool.query('INSERT INTO historico_medicamentos (medicamento_id, status) VALUES ($1, $2)', [medicamento_id, status]);
        res.status(201).json({ message: 'Histórico registado com sucesso.' });
    } catch (error) {
        console.error('ERRO AO REGISTAR HISTÓRICO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('/api/historico/:idosoId', async (req, res) => {
    try {
        const { idosoId } = req.params;
        const { data } = req.query;
        if (!data) { return res.status(400).json({ message: 'A data é um parâmetro obrigatório.' }); }
        const query = `
            SELECT h.status, h.data_hora, m.nome, m.dosagem, m.horario
            FROM historico_medicamentos h JOIN medicamentos m ON h.medicamento_id = m.id
            WHERE m.idoso_id = $1 AND DATE(h.data_hora AT TIME ZONE 'America/Sao_Paulo') = $2
            ORDER BY h.data_hora DESC;
        `;
        const historicoResult = await pool.query(query, [idosoId, data]);
        res.status(200).json(historicoResult.rows);
    } catch (error) {
        console.error('ERRO AO BUSCAR HISTÓRICO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- SERVIR O FRONT-END ---
// Esta secção serve os ficheiros da pasta 'frontend'
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Rota "catch-all" para a SPA. Qualquer pedido que não seja para a API, devolve o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});


// --- INICIAR O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor a funcionar na porta ${PORT}`);
});

