// backend/index.js - Versão com filtro de histórico por data e fuso horário corrigido

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'cuidado_idosos_db',
    password: '12345', // A sua senha
    port: 5432,
});

// --- ROTAS DE AUTENTICAÇÃO E MEDICAMENTOS (sem alterações) ---
app.post('/registro', async (req, res) => {
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

app.post('/login/cuidador', async (req, res) => {
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

app.post('/login/idoso', async (req, res) => {
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


// --- ROTAS PARA MEDICAMENTOS ---
app.post('/medicamentos', async (req, res) => {
    try {
        const { nome, dosagem, horario, foto_url, idoso_id } = req.body;
        if (!nome || !dosagem || !horario || !idoso_id) { return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' }); }
        const novoMedicamento = await pool.query('INSERT INTO medicamentos (nome, dosagem, horario, foto_url, idoso_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [nome, dosagem, horario, foto_url, idoso_id]);
        res.status(201).json(novoMedicamento.rows[0]);
    } catch (error) {
        console.error('ERRO AO ADICIONAR MEDICAMENTO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('/medicamentos/:idosoId', async (req, res) => {
    try {
        const { idosoId } = req.params;
        const medicamentosResult = await pool.query('SELECT * FROM medicamentos WHERE idoso_id = $1 ORDER BY horario', [idosoId]);
        res.status(200).json(medicamentosResult.rows);
    } catch (error) {
        console.error('ERRO AO BUSCAR MEDICAMENTOS:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.delete('/medicamentos/:medicamentoId', async (req, res) => {
    try {
        const { medicamentoId } = req.params;
        await pool.query('DELETE FROM medicamentos WHERE id = $1', [medicamentoId]);
        res.status(200).json({ message: 'Medicamento apagado com sucesso.' });
    } catch (error) {
        console.error('ERRO AO APAGAR MEDICAMENTO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- ROTAS PARA O HISTÓRICO ---
app.post('/historico', async (req, res) => {
    try {
        const { medicamento_id, status } = req.body;
        if (!medicamento_id || !status) {
            return res.status(400).json({ message: 'Dados insuficientes para registar o histórico.' });
        }
        await pool.query(
            'INSERT INTO historico_medicamentos (medicamento_id, status) VALUES ($1, $2)',
            [medicamento_id, status]
        );
        res.status(201).json({ message: 'Histórico registado com sucesso.' });
    } catch (error) {
        console.error('ERRO AO REGISTAR HISTÓRICO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA DE HISTÓRICO ATUALIZADA E CORRIGIDA COM FUSO HORÁRIO DO BRASIL
app.get('/historico/:idosoId', async (req, res) => {
    try {
        const { idosoId } = req.params;
        const { data } = req.query; 

        if (!data) {
            return res.status(400).json({ message: 'A data é um parâmetro obrigatório.' });
        }

        const query = `
            SELECT 
                h.status,
                h.data_hora,
                m.nome,
                m.dosagem,
                m.horario
            FROM historico_medicamentos h
            JOIN medicamentos m ON h.medicamento_id = m.id
            WHERE 
                m.idoso_id = $1 
                AND DATE(h.data_hora AT TIME ZONE 'America/Sao_Paulo') = $2 -- <-- CORREÇÃO APLICADA AQUI
            ORDER BY h.data_hora DESC;
        `;
        const historicoResult = await pool.query(query, [idosoId, data]);
        res.status(200).json(historicoResult.rows);
    } catch (error) {
        console.error('ERRO AO BUSCAR HISTÓRICO:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- INICIA O SERVIDOR ---
pool.connect((err, client, release) => {
    if (err) { return console.error('❌ ERRO AO CONECTAR COM O BANCO DE DADOS:', err.stack); }
    client.release();
    console.log('✅ Conexão com o banco de dados bem-sucedida!');
    app.listen(PORT, () => {
        console.log(`🚀 Servidor a funcionar na porta ${PORT} e pronto para receber requisições!`);
    });
});

