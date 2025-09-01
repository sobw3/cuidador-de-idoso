// frontend/js/app.js - Versão para Desenvolvimento Local com funcionalidade de EDIÇÃO

const app = document.getElementById('app');
const API_URL = '/api';

/**
 * =================================================================
 * FUNÇÕES DE LÓGICA (FETCH & RENDER)
 * =================================================================
 */

const carregarEMostrarMedicamentosCuidador = async () => {
    const container = document.getElementById('lista-medicamentos');
    const idoso = JSON.parse(localStorage.getItem('idoso'));
    if (!container || !idoso) return;

    try {
        const response = await fetch(`${API_URL}/medicamentos/${idoso.id}`);
        if (!response.ok) throw new Error('Falha ao buscar medicamentos.');
        const medicamentos = await response.json();
        
        if (medicamentos.length === 0) {
            container.innerHTML = '<li>Nenhum medicamento registado ainda.</li>';
            return;
        }

        container.innerHTML = medicamentos.map(med => `
            <li class="medicamento-item-cuidador">
                <span><i class="fas fa-pills"></i> <strong>${med.nome}</strong> (${med.dosagem}) - ${med.horario.substring(0, 5)}</span>
                <div class="botoes-acao">
                    <button class="btn-editar" data-route="editar-medicamento/${med.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-apagar" data-id="${med.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </li>
        `).join('');
    } catch (error) {
        container.innerHTML = '<li><span style="color: var(--cor-erro);">Não foi possível carregar os medicamentos.</span></li>';
        console.error(error);
    }
};

const carregarEMostrarHistoricoCuidador = async (dataInput) => {
    const container = document.getElementById('lista-historico');
    const idoso = JSON.parse(localStorage.getItem('idoso'));
    if (!container || !idoso) return;

    container.innerHTML = '<li>A carregar histórico...</li>';
    const dataFormatada = dataInput;
    
    try {
        const response = await fetch(`${API_URL}/historico/${idoso.id}?data=${dataFormatada}`);
        if (!response.ok) throw new Error('Falha ao buscar histórico.');
        const historico = await response.json();
        
        if (historico.length === 0) {
            container.innerHTML = '<li class="historico-item-vazio">Nenhum registo encontrado para este dia.</li>';
            return;
        }
        
        const statusMap = {
            certo: { texto: 'Tomou no horário', classe: 'status-certo', icone: 'fa-check-circle' },
            tarde: { texto: 'Tomou atrasado', classe: 'status-tarde', icone: 'fa-clock' },
            esqueci: { texto: 'Esqueceu', classe: 'status-esqueci', icone: 'fa-times-circle' },
        };

        container.innerHTML = historico.map(registo => {
            const data = new Date(registo.data_hora);
            const horaRegisto = data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const statusInfo = statusMap[registo.status] || { texto: registo.status, classe: '', icone: 'fa-question-circle' };
            return `
                <li class="historico-item-v2">
                    <div class="historico-icone ${statusInfo.classe}"><i class="fas ${statusInfo.icone}"></i></div>
                    <div class="historico-detalhes">
                        <p><strong>${registo.nome}</strong> (${registo.dosagem})</p>
                        <small>Horário Previsto: ${registo.horario.substring(0, 5)}</small>
                    </div>
                    <div class="historico-status">
                        <p>${statusInfo.texto}</p>
                        <small>Registado às ${horaRegisto}</small>
                    </div>
                </li>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<li><span style="color: var(--cor-erro);">Não foi possível carregar o histórico.</span></li>';
        console.error(error);
    }
};

const obterSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
};

const gerirNotificacoes = (medicamentos, nomeIdoso) => {
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações.');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission !== 'granted') {
            console.warn('Permissão para notificações não foi concedida.');
            return;
        }

        const agora = new Date();
        medicamentos.forEach(med => {
            const [horas, minutos] = med.horario.split(':');
            const dataMedicamento = new Date();
            dataMedicamento.setHours(horas, minutos, 0, 0);

            if (dataMedicamento > agora) {
                const tempoParaNotificar = dataMedicamento.getTime() - agora.getTime();
                setTimeout(() => {
                    const saudacao = obterSaudacao();
                    const titulo = `${saudacao}, ${nomeIdoso}!`;
                    const corpo = `Está na hora de tomar o seu ${med.nome} (${med.dosagem}).`;
                    new Notification(titulo, { body: corpo, icon: '/images/logo-192.png' });
                }, tempoParaNotificar);
            }
        });
    });
};

const carregarEMostrarMedicamentosIdoso = async () => {
    const container = document.getElementById('lista-medicamentos-idoso-container');
    const idoso = JSON.parse(localStorage.getItem('idosoLogado'));
    if (!container || !idoso) return;

    container.innerHTML = '<p>A carregar medicamentos...</p>';
    try {
        const response = await fetch(`${API_URL}/medicamentos/${idoso.id}`);
        if (!response.ok) throw new Error('Falha ao buscar medicamentos.');
        const medicamentos = await response.json();
        
        if (medicamentos.length === 0) {
            container.innerHTML = '<div class="card-vazio"><i class="fas fa-check-circle"></i><p>Nenhum medicamento foi registado para hoje. Tudo em ordem!</p></div>';
            return;
        }

        container.innerHTML = medicamentos.map(med => `
            <div class="medicamento-card-idoso" data-medicamento-id="${med.id}">
                <div class="card-idoso-principal">
                    ${med.foto_url ? `<img src="${med.foto_url}" alt="Foto de ${med.nome}" class="medicamento-foto">` : '<div class="medicamento-foto-placeholder"><i class="fas fa-pills"></i></div>'}
                    <div class="medicamento-info">
                        <h3>${med.nome}</h3>
                        <p>${med.dosagem} - às <strong>${med.horario.substring(0, 5)}</strong></p>
                        ${med.observacoes ? `<small class="medicamento-obs"><strong>Obs:</strong> ${med.observacoes}</small>` : ''}
                    </div>
                </div>
                <div class="medicamento-actions">
                    <button class="btn-status certo" data-status="certo"><i class="fas fa-check"></i> Tomei</button>
                    <button class="btn-status tarde" data-status="tarde"><i class="fas fa-clock"></i> Atrasado</button>
                    <button class="btn-status esqueci" data-status="esqueci"><i class="fas fa-times"></i> Esqueci</button>
                </div>
                <div class="status-feedback"></div>
            </div>
        `).join('');
        
        gerirNotificacoes(medicamentos, idoso.nome);
    } catch (error) {
        container.innerHTML = '<div class="card-vazio"><i class="fas fa-exclamation-circle"></i><p style="color: var(--cor-erro);">Não foi possível carregar os seus medicamentos.</p></div>';
        console.error(error);
    }
};

/**
 * =================================================================
 * TEMPLATES DE VISUALIZAÇÃO (VIEWS)
 * =================================================================
 */

const viewHome = () => {
    return `
        <div class="card">
            <h1>Bem-vindo!</h1>
            <p class="subtitulo">Por favor, selecione o seu perfil para continuar.</p>
            <div class="choice-container">
                <div class="choice-card" data-route="login-cuidador">
                    <i class="fas fa-users"></i>
                    <h3>Sou Familiar / Cuidador</h3>
                </div>
                <div class="choice-card" data-route="login-idoso">
                    <i class="fas fa-user-check"></i>
                    <h3>Sou o Idoso</h3>
                </div>
            </div>
        </div>
    `;
};

const viewLoginCuidador = () => {
    return `
        <div class="card">
            <i class="fas fa-users" style="font-size: 3em; color: var(--cor-primaria); margin-bottom: 20px;"></i>
            <h1>Login do Familiar</h1>
            <p class="subtitulo">Acesse à sua conta para gerir os medicamentos.</p>
            <form id="form-login-cuidador">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="senha">Senha:</label>
                    <input type="password" id="senha" required>
                </div>
                <button type="submit" class="btn">Entrar</button>
            </form>
            <p style="margin-top: 20px;">
                Não tem uma conta? <span class="nav-link" data-route="registro">Registe-se</span>
            </p>
        </div>
    `;
};

const viewLoginIdoso = () => {
    return `
        <div class="card">
            <i class="fas fa-user-check" style="font-size: 3em; color: var(--cor-secundaria); margin-bottom: 20px;"></i>
            <h1>Acesso Simplificado</h1>
            <p class="subtitulo">Use o código que o seu familiar criou para você.</p>
            <form id="form-login-idoso">
                <div class="form-group">
                    <label for="login-numerico">O seu Código de Acesso:</label>
                    <input type="text" id="login-numerico" required>
                </div>
                <div class="form-group">
                    <label for="senha-numerica">A sua Senha Numérica:</label>
                    <input type="password" id="senha-numerica" required>
                </div>
                <button type="submit" class="btn">Entrar</button>
            </form>
            <p style="margin-top: 20px;">
                É um familiar? <span class="nav-link" data-route="login-cuidador">Acesse aqui</span>
            </p>
        </div>
    `;
};

const viewRegistro = () => {
    return `
        <div class="card" style="max-width: 550px;">
            <h2>Crie a sua Conta de Cuidador</h2>
            <form id="form-registro">
                <h3>Os Seus Dados (Cuidador)</h3>
                <div class="form-group"><label for="nome-cuidador">O seu Nome:</label><input type="text" id="nome-cuidador" required></div>
                <div class="form-group"><label for="email">O seu Email:</label><input type="email" id="email" required></div>
                <div class="form-group"><label for="senha-cuidador">Crie uma Senha:</label><input type="password" id="senha-cuidador" required></div>
                
                <hr style="border:0; border-top:1px solid var(--cor-borda-suave); margin: 15px 0;">

                <h3>Dados de Acesso do Idoso</h3>
                <div class="form-group"><label for="nome-idoso">Nome do Idoso:</label><input type="text" id="nome-idoso" required></div>
                <div class="form-group"><label for="login-idoso">Crie um Código de Acesso para o Idoso:</label><input type="text" id="login-idoso" required></div>
                <div class="form-group"><label for="senha-idoso">Crie uma Senha Numérica para o Idoso:</label><input type="password" id="senha-idoso" required></div>

                <button type="submit" class="btn">Criar Contas</button>
            </form>
             <p style="margin-top: 20px;">
                Já tem uma conta? <span class="nav-link" data-route="login-cuidador">Faça Login</span>
            </p>
        </div>
    `;
};

const viewPainelCuidador = () => {
    const cuidador = JSON.parse(localStorage.getItem('cuidador'));
    const idoso = JSON.parse(localStorage.getItem('idoso'));
    if (!cuidador || !idoso) { 
        navigateTo(''); 
        return `<div class="card"><h2>Acesso Negado</h2><p>Por favor, faça login novamente.</p></div>`; 
    }

    const hoje = new Date().toISOString().split('T')[0];

    return `
        <div class="card" style="max-width: 800px; text-align: left;">
            <div class="painel-header">
                <div>
                    <h2>Painel de ${cuidador.nome}</h2>
                    <p class="subtitulo" style="text-align: left; margin: 0;">A gerir os medicamentos para <strong>${idoso.nome}</strong>.</p>
                </div>
                <button class="btn" id="btn-logout" style="width: auto; background-color: var(--cor-erro);">Sair</button>
            </div>
            
            <hr class="divider">

            <div class="painel-secao">
                <h3>Adicionar Novo Medicamento</h3>
                <form id="form-add-medicamento" class="form-grid">
                    <div class="form-group"><label for="med-nome">Nome</label><input type="text" id="med-nome" required></div>
                    <div class="form-group"><label for="med-dosagem">Dosagem</label><input type="text" id="med-dosagem" required></div>
                    <div class="form-group"><label for="med-horario">Horário</label><input type="time" id="med-horario" required></div>
                    <div class="form-group form-group-full"><label for="med-foto">URL da Foto (opcional)</label><input type="text" id="med-foto" placeholder="https://exemplo.com/imagem.png"></div>
                    <div class="form-group form-group-full"><label for="med-observacoes">Observações (opcional)</label><textarea id="med-observacoes" rows="2" placeholder="Ex: Tomar em jejum, com um copo de água..."></textarea></div>
                    <button type="submit" class="btn form-group-full">Adicionar</button>
                </form>
            </div>

            <div class="painel-secao" id="lista-medicamentos-container">
                <h3>Medicamentos Registados</h3>
                <ul id="lista-medicamentos"><li>A carregar...</li></ul>
            </div>

            <div class="painel-secao" id="historico-container">
                <div class="historico-header">
                    <h3>Relatório de Atividades</h3>
                    <div class="filtro-data">
                        <label for="data-historico">Ver dia:</label>
                        <input type="date" id="data-historico" value="${hoje}">
                    </div>
                </div>
                <ul id="lista-historico"><li>A carregar histórico...</li></ul>
            </div>
        </div>
    `;
};

const viewPainelIdoso = () => {
    const idoso = JSON.parse(localStorage.getItem('idosoLogado'));
    if (!idoso) {
        navigateTo('');
        return `<div class="card"><h2>Acesso Negado</h2><p>Por favor, faça login novamente.</p></div>`;
    }

    return `
        <div class="card-idoso-wrapper">
            <div class="painel-header">
                 <div>
                    <h1>Olá, ${idoso.nome}!</h1>
                    <p class="subtitulo" style="text-align: left; margin: 0;">Os seus medicamentos para hoje são:</p>
                </div>
                <button class="btn" id="btn-logout-idoso" style="width: auto; background-color: var(--cor-erro);">Sair</button>
            </div>
            <div id="lista-medicamentos-idoso-container"><p>A carregar medicamentos...</p></div>
        </div>
    `;
};

const viewEditarMedicamento = () => {
    return `
        <div class="card" style="max-width: 550px;">
            <h2>Editar Medicamento</h2>
            <p class="subtitulo">A carregar dados do medicamento...</p>
            <form id="form-editar-medicamento">
                <!-- O JavaScript irá preencher este formulário -->
            </form>
        </div>
    `;
};

/**
 * =================================================================
 * ROTEADOR
 * =================================================================
 */
const routes = {
    '': viewHome,
    'login-cuidador': viewLoginCuidador,
    'login-idoso': viewLoginIdoso,
    'registro': viewRegistro,
    'painel-cuidador': viewPainelCuidador,
    'painel-idoso': viewPainelIdoso,
    'editar-medicamento/:id': viewEditarMedicamento,
};

const navigateTo = (path) => { window.location.hash = path; };

const router = async () => {
    const path = window.location.hash.substring(1);
    const [pathName, param] = path.split('/');

    let view;
    if (pathName === 'editar-medicamento' && param) {
        view = routes['editar-medicamento/:id'];
    } else {
        view = routes[pathName] || viewHome;
    }
    
    app.innerHTML = view();

    if (pathName === 'painel-cuidador') {
        const inputData = document.getElementById('data-historico');
        carregarEMostrarMedicamentosCuidador();
        carregarEMostrarHistoricoCuidador(inputData.value);
        inputData.addEventListener('change', () => {
            carregarEMostrarHistoricoCuidador(inputData.value);
        });
    } else if (pathName === 'painel-idoso') {
        carregarEMostrarMedicamentosIdoso();
    } else if (pathName === 'editar-medicamento' && param) {
        try {
            const response = await fetch(`${API_URL}/medicamento/${param}`);
            if (!response.ok) throw new Error('Medicamento não encontrado.');
            const med = await response.json();
            
            const formContainer = document.getElementById('form-editar-medicamento');
            const subtitulo = document.querySelector('.subtitulo');
            subtitulo.style.display = 'none';

            formContainer.innerHTML = `
                <input type="hidden" id="edit-med-id" value="${med.id}">
                <div class="form-group"><label for="edit-med-nome">Nome</label><input type="text" id="edit-med-nome" value="${med.nome}" required></div>
                <div class="form-group"><label for="edit-med-dosagem">Dosagem</label><input type="text" id="edit-med-dosagem" value="${med.dosagem}" required></div>
                <div class="form-group"><label for="edit-med-horario">Horário</label><input type="time" id="edit-med-horario" value="${med.horario}" required></div>
                <div class="form-group"><label for="edit-med-foto">URL da Foto</label><input type="text" id="edit-med-foto" value="${med.foto_url || ''}"></div>
                <div class="form-group"><label for="edit-med-observacoes">Observações</label><textarea id="edit-med-observacoes" rows="3">${med.observacoes || ''}</textarea></div>
                <button type="submit" class="btn">Guardar Alterações</button>
            `;
        } catch (error) {
            app.innerHTML = `<div class="card"><h2>Erro</h2><p>${error.message}</p></div>`;
            console.error(error);
        }
    }
};

/**
 * =================================================================
 * MANIPULADORES DE EVENTOS
 * =================================================================
 */
app.addEventListener('click', async (e) => {
    const navLink = e.target.closest('[data-route]');
    if (navLink) {
        e.preventDefault();
        navigateTo(navLink.dataset.route);
    }

    if (e.target.id === 'btn-logout') {
        e.preventDefault();
        localStorage.removeItem('cuidador');
        localStorage.removeItem('idoso');
        alert('Sessão terminada com sucesso.');
        navigateTo('');
    }

    if (e.target.id === 'btn-logout-idoso') {
        e.preventDefault();
        localStorage.removeItem('idosoLogado');
        alert('Sessão terminada com sucesso.');
        navigateTo('');
    }

    const statusBtn = e.target.closest('.btn-status');
    if (statusBtn && !statusBtn.disabled) {
        const card = statusBtn.closest('.medicamento-card-idoso');
        const medicamentoId = card.dataset.medicamentoId;
        const status = statusBtn.dataset.status;

        try {
            const response = await fetch(`${API_URL}/historico`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medicamento_id: medicamentoId, status: status })
            });

            if (!response.ok) throw new Error('Falha ao registar o estado.');
            
            const feedbackEl = card.querySelector('.status-feedback');
            card.querySelector('.medicamento-actions').style.display = 'none';
            card.classList.add('marcado');
            feedbackEl.style.display = 'block';
            
            if (status === 'certo') { feedbackEl.innerHTML = '<i class="fas fa-check-circle"></i> Ótimo! Registado.'; card.classList.add('marcado-certo'); }
            else if (status === 'tarde') { feedbackEl.innerHTML = '<i class="fas fa-clock"></i> Registado com atraso.'; card.classList.add('marcado-tarde'); }
            else { feedbackEl.innerHTML = '<i class="fas fa-times-circle"></i> Registado como esquecido.'; card.classList.add('marcado-esqueci'); }

        } catch (error) {
            alert('Não foi possível registar o estado. Tente novamente.');
            console.error(error);
        }
    }

    const btnApagar = e.target.closest('.btn-apagar');
    if (btnApagar) {
        const medicamentoId = btnApagar.dataset.id;
        if (confirm('Tem a certeza que deseja apagar este medicamento?')) {
            try {
                const response = await fetch(`${API_URL}/medicamentos/${medicamentoId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Falha ao apagar.');
                
                carregarEMostrarMedicamentosCuidador();
                carregarEMostrarHistoricoCuidador(document.getElementById('data-historico').value);
            } catch (error) {
                alert('Não foi possível apagar o medicamento.');
                console.error(error);
            }
        }
    }
});

app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = e.target.id;

    if (formId === 'form-login-cuidador') {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        try {
            const response = await fetch(`${API_URL}/login/cuidador`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('cuidador', JSON.stringify(result.cuidador));
                localStorage.setItem('idoso', JSON.stringify(result.idoso));
                navigateTo('painel-cuidador');
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            alert('Não foi possível conectar ao servidor.');
        }
    }

    if (formId === 'form-registro') {
        const dados = {
            nomeCuidador: document.getElementById('nome-cuidador').value,
            email: document.getElementById('email').value,
            senhaCuidador: document.getElementById('senha-cuidador').value,
            nomeIdoso: document.getElementById('nome-idoso').value,
            loginIdoso: document.getElementById('login-idoso').value,
            senhaIdoso: document.getElementById('senha-idoso').value,
        };
        try {
            const response = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                navigateTo('login-cuidador');
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            alert('Não foi possível conectar ao servidor.');
        }
    }

    if (formId === 'form-login-idoso') {
        const login_numerico = document.getElementById('login-numerico').value;
        const senha = document.getElementById('senha-numerica').value;
        try {
            const response = await fetch(`${API_URL}/login/idoso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login_numerico, senha })
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('idosoLogado', JSON.stringify(result.idoso));
                navigateTo('painel-idoso');
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            alert('Não foi possível conectar ao servidor.');
        }
    }

    if (formId === 'form-add-medicamento') {
        const idoso = JSON.parse(localStorage.getItem('idoso'));
        if (!idoso) return;
        const dados = {
            nome: document.getElementById('med-nome').value,
            dosagem: document.getElementById('med-dosagem').value,
            horario: document.getElementById('med-horario').value,
            foto_url: document.getElementById('med-foto').value,
            observacoes: document.getElementById('med-observacoes').value,
            idoso_id: idoso.id
        };
        try {
            const response = await fetch(`${API_URL}/medicamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (!response.ok) throw new Error('Falha ao registar medicamento.');
            
            e.target.reset(); 
            carregarEMostrarMedicamentosCuidador(); 
            carregarEMostrarHistoricoCuidador(document.getElementById('data-historico').value);
        } catch (error) {
            alert('Não foi possível registar o medicamento.');
            console.error(error);
        }
    }

    if (formId === 'form-editar-medicamento') {
        const id = document.getElementById('edit-med-id').value;
        const dados = {
            nome: document.getElementById('edit-med-nome').value,
            dosagem: document.getElementById('edit-med-dosagem').value,
            horario: document.getElementById('edit-med-horario').value,
            foto_url: document.getElementById('edit-med-foto').value,
            observacoes: document.getElementById('edit-med-observacoes').value,
        };

        try {
            const response = await fetch(`${API_URL}/medicamentos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            navigateTo('painel-cuidador');
        } catch (error) {
            alert(`Não foi possível atualizar o medicamento: ${error.message}`);
            console.error(error);
        }
    }
});

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

