import './style.css';
import './dashboard.css';
import { supabase } from './supabase.js';

let currentUser = null;
let currentModulo = 'Licenciamento';
let editingAgendaId = null;
let editingArquivoId = null;
let editingTarefaId = null;
window.agendaData = [];
window.arquivosData = [];
window.tarefasData = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth Check customizado (localStorage)
  const userStr = localStorage.getItem('setur_user');
  
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  
  currentUser = JSON.parse(userStr);
  document.getElementById('user-name').textContent = currentUser.nome_completo || currentUser.email || 'Usuário';

  // 2. Navigation Logic
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const modules = document.querySelectorAll('.module');
  const pageTitle = document.getElementById('page-title');

  const titles = {
    'licenciamento': 'Licenciamento Ambiental',
    'fiscalizacao': 'Fiscalização',
    'educacao': 'Educação Ambiental',
    'agenda': 'Agenda de Compromissos',
    'tarefas': 'Tarefas Internas'
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      modules.forEach(mod => mod.classList.add('hidden'));
      modules.forEach(mod => mod.classList.remove('active'));
      
      item.classList.add('active');
      const target = item.getAttribute('data-target');
      document.getElementById(`module-${target}`).classList.remove('hidden');
      document.getElementById(`module-${target}`).classList.add('active');
      
      pageTitle.textContent = titles[target];
      
      if(target === 'licenciamento') { currentModulo = 'Licenciamento'; loadArquivos(); }
      if(target === 'fiscalizacao') { currentModulo = 'Fiscalização'; loadArquivos(); }
      if(target === 'educacao') { currentModulo = 'Educação Ambiental'; }
      if(target === 'agenda') loadAgenda();
      if(target === 'tarefas') loadTarefas();
    });
  });

  // 3. Logout customizado
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('setur_user');
    window.location.href = '/index.html';
  });

  // Init default module
  loadArquivos();
  setupModals();
});

// --- Modals Setup ---
function setupModals() {
  const modalArquivo = document.getElementById('modal-arquivo');
  const btnNovoLicenciamento = document.getElementById('btn-novo-licenciamento');
  const btnNovaFiscalizacao = document.getElementById('btn-nova-fiscalizacao');
  const closeArquivo = document.getElementById('close-modal-arquivo');
  const cancelArquivo = document.getElementById('cancel-arquivo');

  const openModalArquivo = () => {
    editingArquivoId = null;
    document.querySelector('#modal-arquivo h2').textContent = currentModulo === 'Fiscalização' ? 'Novo Registro de Fiscalização' : 'Novo Arquivo de Licenciamento';
    document.getElementById('form-arquivo').reset();
    document.getElementById('arquivo-arquivos').required = false;
    
    const catSelect = document.getElementById('arquivo-categoria');
    catSelect.innerHTML = '';
    if (currentModulo === 'Fiscalização') {
      const cats = ['Notificação', 'Auto de Constatação', 'Auto de Infração', 'Processo Administrativo Ambiental', 'Relatório de Fiscalização'];
      cats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    } else {
      const cats = ['Dispensa de Licença', 'Licença de Instalação', 'Licença Prévia', 'Anuência Ambiental', 'Licença de Operação', 'Obras Públicas', 'Imagens de Drone', 'Projeto/Planta', 'Outros Documentos'];
      cats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    }

    const date = new Date();
    document.getElementById('arquivo-pasta').value = `${date.getFullYear()}/${date.toLocaleString('pt-BR', { month: 'long' })}`;
    modalArquivo.classList.add('active');
  };

  if(btnNovoLicenciamento) btnNovoLicenciamento.addEventListener('click', openModalArquivo);
  if(btnNovaFiscalizacao) btnNovaFiscalizacao.addEventListener('click', openModalArquivo);

  closeArquivo.addEventListener('click', () => modalArquivo.classList.remove('active'));
  cancelArquivo.addEventListener('click', () => modalArquivo.classList.remove('active'));

  const formArquivo = document.getElementById('form-arquivo');
  formArquivo.addEventListener('submit', handleNovoArquivo);

  // Files Modal
  const modalFiles = document.getElementById('modal-files');
  const closeFiles = document.getElementById('close-modal-files');
  closeFiles.addEventListener('click', () => modalFiles.classList.remove('active'));

  // Agenda Modal
  const modalAgenda = document.getElementById('modal-agenda');
  const btnNovoCompromisso = document.getElementById('btn-novo-compromisso');
  const closeAgenda = document.getElementById('close-modal-agenda');
  const cancelAgenda = document.getElementById('cancel-agenda');
  
  if (btnNovoCompromisso) {
    btnNovoCompromisso.addEventListener('click', () => {
      editingAgendaId = null;
      document.querySelector('#modal-agenda h2').textContent = 'Novo Compromisso';
      document.getElementById('form-agenda').reset();
      modalAgenda.classList.add('active');
    });
    closeAgenda.addEventListener('click', () => modalAgenda.classList.remove('active'));
    cancelAgenda.addEventListener('click', () => modalAgenda.classList.remove('active'));
    
    const formAgenda = document.getElementById('form-agenda');
    formAgenda.addEventListener('submit', handleNovoCompromisso);
  }
  
  // Search Arquivos/Registros
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = window.arquivosData.filter(item => 
      (item.titulo && item.titulo.toLowerCase().includes(term)) || 
      (item.descricao && item.descricao.toLowerCase().includes(term)) ||
      (item.categoria && item.categoria.toLowerCase().includes(term)) ||
      (item.profiles && item.profiles.nome_completo && item.profiles.nome_completo.toLowerCase().includes(term)) ||
      (item.pasta_storage && item.pasta_storage.toLowerCase().includes(term))
    );
    renderArquivos(filtered);
  };
  
  const searchLicenciamento = document.getElementById('search-licenciamento');
  if (searchLicenciamento) searchLicenciamento.addEventListener('input', handleSearch);
  
  const searchFiscalizacao = document.getElementById('search-fiscalizacao');
  if (searchFiscalizacao) searchFiscalizacao.addEventListener('input', handleSearch);

  // Tarefas Modal Setup
  const modalTarefa = document.getElementById('modal-tarefa');
  const btnNovaTarefa = document.getElementById('btn-nova-tarefa');
  const closeTarefa = document.getElementById('close-modal-tarefa');
  const cancelTarefa = document.getElementById('cancel-tarefa');
  
  if (btnNovaTarefa) {
    btnNovaTarefa.addEventListener('click', async () => {
      editingTarefaId = null;
      document.querySelector('#modal-tarefa h2').textContent = 'Nova Tarefa';
      document.getElementById('form-tarefa').reset();
      modalTarefa.classList.add('active');
    });
    closeTarefa.addEventListener('click', () => modalTarefa.classList.remove('active'));
    cancelTarefa.addEventListener('click', () => modalTarefa.classList.remove('active'));
    
    const formTarefa = document.getElementById('form-tarefa');
    formTarefa.addEventListener('submit', handleNovaTarefa);
  }

  // Search Tarefas
  const searchTarefas = document.getElementById('search-tarefas');
  if (searchTarefas) {
    searchTarefas.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = window.tarefasData.filter(item => 
        (item.titulo && item.titulo.toLowerCase().includes(term)) ||
        (item.descricao && item.descricao.toLowerCase().includes(term))
      );
      renderTarefas(filtered);
    });
  }
}

// --- Arquivos Logic ---
async function loadArquivos() {
  const listLicenciamento = document.getElementById('licenciamento-list');
  const listFiscalizacao = document.getElementById('fiscalizacao-list');
  if(listLicenciamento) listLicenciamento.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';
  if(listFiscalizacao) listFiscalizacao.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';
  
  const { data, error } = await supabase
    .from('arquivos')
    .select('*, profiles(nome_completo)')
    .order('data_registro', { ascending: false });
    
  if (error) {
    console.error('Error loading arquivos:', error);
    listEl.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro do banco: ${error.message || error.details || JSON.stringify(error)}</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    if(listLicenciamento) listLicenciamento.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum registro encontrado.</td></tr>';
    if(listFiscalizacao) listFiscalizacao.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum registro encontrado.</td></tr>';
    window.arquivosData = [];
    return;
  }
  
  window.arquivosData = data;
  renderArquivos(data);
}

function renderArquivos(dataToRender) {
  const listLicenciamento = document.getElementById('licenciamento-list');
  const listFiscalizacao = document.getElementById('fiscalizacao-list');
  
  const licenciamentoData = dataToRender.filter(i => i.modulo === 'Licenciamento' || !i.modulo);
  const fiscalizacaoData = dataToRender.filter(i => i.modulo === 'Fiscalização');

  const buildRows = (items, listEl) => {
    if(!listEl) return;
    if (items.length === 0) {
      listEl.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum registro encontrado para esta busca.</td></tr>';
      return;
    }
    listEl.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      const dateStr = new Date(item.data_registro).toLocaleDateString('pt-BR');
      const uploaderName = item.profiles ? item.profiles.nome_completo : 'Usuário';
      
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td><span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">${item.categoria || 'Outros'}</span></td>
        <td>
          <strong>${item.titulo}</strong>
          ${item.descricao ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 3px 0 0 0;">${item.descricao}</p>` : ''}
          <small class="text-muted" style="display:block; margin-top:2px;">Por: ${uploaderName}</small>
        </td>
        <td>
          ${item.pasta_storage ? 
            `<button class="btn-icon" title="Ver Arquivos" onclick="viewFiles('${item.pasta_storage}')"><i data-lucide="folder"></i> ${item.pasta_storage}</button>` : 
            `<span class="text-muted">-</span>`
          }
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn-icon" title="Editar" onclick="editArquivo('${item.id}')"><i data-lucide="edit"></i></button>
            <button class="btn-icon text-danger" title="Apagar" onclick="deleteArquivo('${item.id}')"><i data-lucide="trash"></i></button>
          </div>
        </td>
      `;
      listEl.appendChild(tr);
    });
  };

  buildRows(licenciamentoData, listLicenciamento);
  buildRows(fiscalizacaoData, listFiscalizacao);
  
  if(window.lucide) window.lucide.createIcons();
}

async function handleNovoArquivo(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('arquivo-titulo').value;
  const descricao = document.getElementById('arquivo-descricao').value;
  const categoria = document.getElementById('arquivo-categoria').value;
  let pasta = document.getElementById('arquivo-pasta').value;
  
  const filesAvulsos = document.getElementById('arquivo-arquivos').files;
  const filesPasta = document.getElementById('arquivo-pastas').files;
  
  // Combine all files from both inputs
  const allFiles = [...filesAvulsos, ...filesPasta];
  
  // if (!editingArquivoId && allFiles.length === 0) {
  //   alert('Selecione pelo menos um arquivo ou pasta.');
  //   return;
  // }

  // Sanitize folder path
  pasta = pasta.trim().replace(/[^a-zA-Z0-9/_-]/g, '_');
  
  const saveBtn = document.getElementById('save-arquivo');
  const uploadProgress = document.getElementById('upload-progress');
  const progressBar = document.getElementById('progress-bar');
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Enviando...';
  uploadProgress.classList.remove('hidden');

  try {
    // Upload files to Supabase Storage
    const totalFiles = allFiles.length;
    let uploaded = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = allFiles[i];
      const sanitizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${pasta}/${Date.now()}_${sanitizedFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos_setur')
        .upload(filePath, file, { contentType: file.type || 'application/octet-stream' });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error(`Falha ao subir arquivo ${file.name}`);
      }
      
      uploaded++;
      progressBar.style.width = `${(uploaded / totalFiles) * 100}%`;
    }

    // Insert or Update Database
    if (editingArquivoId) {
      const { error: dbError } = await supabase
        .from('arquivos')
        .update({ 
          titulo: titulo, 
          descricao: descricao,
          categoria: categoria,
          pasta_storage: pasta,
          modulo: currentModulo
        })
        .eq('id', editingArquivoId);

      if (dbError) throw dbError;
    } else {
      const { error: dbError } = await supabase
        .from('arquivos')
        .insert([
          { 
            titulo: titulo, 
            descricao: descricao,
            categoria: categoria,
            pasta_storage: pasta,
            modulo: currentModulo,
            user_id: currentUser.id,
            status: 'Pendente'
          }
        ]);

      if (dbError) throw dbError;
    }

    // Success
    document.getElementById('modal-arquivo').classList.remove('active');
    document.getElementById('form-arquivo').reset();
    loadArquivos();

  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Salvar e Enviar Arquivos';
    uploadProgress.classList.add('hidden');
    progressBar.style.width = '0%';
  }
}

window.editArquivo = (id) => {
  const item = window.arquivosData.find(x => x.id === id);
  if (!item) return;
  
  editingArquivoId = id;
  document.getElementById('arquivo-titulo').value = item.titulo;
  document.getElementById('arquivo-categoria').value = item.categoria || 'Dispensa';
  document.getElementById('arquivo-descricao').value = item.descricao || '';
  document.getElementById('arquivo-pasta').value = item.pasta_storage || '';
  document.getElementById('arquivo-arquivos').required = false;
  document.getElementById('arquivo-pastas').required = false;
  
  document.querySelector('#modal-arquivo h2').textContent = 'Editar Arquivo';
  document.getElementById('modal-arquivo').classList.add('active');
};

window.deleteArquivo = async (id) => {
  if (!confirm('Tem certeza que deseja apagar este arquivo?')) return;
  
  const { error } = await supabase.from('arquivos').delete().eq('id', id);
  if (error) {
    alert('Erro ao apagar: ' + error.message);
  } else {
    loadArquivos();
  }
};

window.viewFiles = async (folder) => {
  const modalFiles = document.getElementById('modal-files');
  const filesList = document.getElementById('files-list');
  
  filesList.innerHTML = '<p class="text-center text-muted">Carregando...</p>';
  modalFiles.classList.add('active');

  const { data, error } = await supabase.storage
    .from('documentos_setur')
    .list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    filesList.innerHTML = '<p class="text-danger">Erro ao carregar arquivos.</p>';
    return;
  }

  if (!data || data.length === 0) {
    filesList.innerHTML = '<p class="text-center">Pasta vazia.</p>';
    return;
  }

  filesList.innerHTML = '';
  data.forEach(file => {
    // Only show actual files, not the dummy folder files (.emptyFolderPlaceholder)
    if(file.name === '.emptyFolderPlaceholder') return;

    const { data: publicUrlData } = supabase.storage
      .from('documentos_setur')
      .getPublicUrl(`${folder}/${file.name}`);

    const url = publicUrlData.publicUrl;

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '10px';
    div.style.borderBottom = '1px solid var(--surface-border)';

    div.innerHTML = `
      <span class="truncate" style="max-width: 250px;">${file.name}</span>
      <div style="display: flex; gap: 5px;">
        <a href="${url}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">
          <i data-lucide="eye"></i> Visualizar
        </a>
        <button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="deleteFile('${folder}', '${file.name}')">
          <i data-lucide="trash"></i>
        </button>
      </div>
    `;
    filesList.appendChild(div);
  });
  
  if(window.lucide) window.lucide.createIcons();
}

// --- Agenda Logic ---
async function loadAgenda() {
  const listEl = document.getElementById('agenda-list');
  listEl.innerHTML = '<p class="text-center text-muted">Carregando agenda...</p>';
  
  const { data, error } = await supabase
    .from('agenda')
    .select('*, profiles(nome_completo)')
    .order('data_hora_inicio', { ascending: true })
    .gte('data_hora_inicio', new Date(Date.now() - 86400000).toISOString());

  if (error) {
    listEl.innerHTML = '<p class="text-center text-danger">Erro ao carregar agenda.</p>';
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="text-center">Nenhum compromisso futuro agendado.</p>';
    window.agendaData = [];
    return;
  }

  window.agendaData = data;
  listEl.innerHTML = '';
  data.forEach(item => {
    const start = new Date(item.data_hora_inicio);
    const end = item.data_hora_fim ? new Date(item.data_hora_fim) : null;
    
    const div = document.createElement('div');
    div.style.background = 'rgba(255,255,255,0.02)';
    div.style.padding = '15px';
    div.style.borderRadius = '8px';
    div.style.marginBottom = '10px';
    div.style.borderLeft = '3px solid var(--primary)';
    
    div.innerHTML = `
      <h3 style="font-size: 1rem; margin-bottom: 5px; display: flex; align-items: center;">
        ${item.titulo}
        ${item.categoria ? `<span style="margin-left: 10px; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: normal; background: ${item.categoria === 'Turismo' ? 'rgba(0, 200, 255, 0.15)' : 'rgba(76, 175, 80, 0.15)'}; color: ${item.categoria === 'Turismo' ? '#4fc3f7' : '#81c784'}; border: 1px solid ${item.categoria === 'Turismo' ? 'rgba(0, 200, 255, 0.3)' : 'rgba(76, 175, 80, 0.3)'};"><i data-lucide="${item.categoria === 'Turismo' ? 'map' : 'leaf'}" style="width: 10px; margin-right: 3px; display: inline-block;"></i>${item.categoria}</span>` : ''}
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 5px;">
        <i data-lucide="clock" style="width: 14px; vertical-align: middle;"></i> 
        ${start.toLocaleDateString('pt-BR')} às ${start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
        ${end ? ` até ${end.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}` : ''}
      </p>
      ${item.descricao ? `<p style="font-size: 0.9rem;">${item.descricao}</p>` : ''}
      <small style="color: var(--text-muted); font-size: 0.75rem;">Agendado por: ${item.profiles?.nome_completo || 'Usuário'}</small>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="editAgenda('${item.id}')"><i data-lucide="edit-2" style="width: 14px;"></i> Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAgenda('${item.id}')"><i data-lucide="trash" style="width: 14px;"></i> Apagar</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  if(window.lucide) window.lucide.createIcons();
}

async function handleNovoCompromisso(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('agenda-titulo').value;
  const categoria = document.getElementById('agenda-categoria').value;
  const descricao = document.getElementById('agenda-descricao').value;
  const inicio = document.getElementById('agenda-inicio').value;
  const fim = document.getElementById('agenda-fim').value;
  
  const inicioIso = new Date(inicio).toISOString();
  const fimIso = fim ? new Date(fim).toISOString() : null;
  
  const saveBtn = document.getElementById('save-agenda');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Salvando...';
  
  try {
    if (editingAgendaId) {
      const { error: dbError } = await supabase
        .from('agenda')
        .update({ 
          titulo: titulo, 
          categoria: categoria,
          descricao: descricao,
          data_hora_inicio: inicioIso,
          data_hora_fim: fimIso
        })
        .eq('id', editingAgendaId);
      if (dbError) throw dbError;
    } else {
      const { error: dbError } = await supabase
        .from('agenda')
        .insert([
          { 
            titulo: titulo, 
            categoria: categoria,
            descricao: descricao,
            data_hora_inicio: inicioIso,
            data_hora_fim: fimIso,
            user_id: currentUser.id
          }
        ]);
      if (dbError) throw dbError;
    }

    document.getElementById('modal-agenda').classList.remove('active');
    document.getElementById('form-agenda').reset();
    editingAgendaId = null;
    document.querySelector('#modal-agenda h2').textContent = 'Novo Compromisso';
    loadAgenda();

  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Agendar';
  }
}

window.editAgenda = (id) => {
  const item = window.agendaData.find(x => x.id === id);
  if (!item) return;
  
  editingAgendaId = id;
  document.getElementById('agenda-titulo').value = item.titulo;
  if(document.getElementById('agenda-categoria')) {
    document.getElementById('agenda-categoria').value = item.categoria || 'Turismo';
  }
  document.getElementById('agenda-descricao').value = item.descricao || '';
  
  const formatDatetime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  
  document.getElementById('agenda-inicio').value = formatDatetime(item.data_hora_inicio);
  document.getElementById('agenda-fim').value = formatDatetime(item.data_hora_fim);
  
  document.querySelector('#modal-agenda h2').textContent = 'Editar Compromisso';
  document.getElementById('modal-agenda').classList.add('active');
};

window.deleteAgenda = async (id) => {
  if (!confirm('Tem certeza que deseja apagar este compromisso?')) return;
  
  const { error } = await supabase.from('agenda').delete().eq('id', id);
  if (error) {
    alert('Erro ao apagar: ' + error.message);
  } else {
    loadAgenda();
  }
};

window.deleteFile = async (folder, fileName) => {
  if (!confirm('Tem certeza que deseja apagar este arquivo?')) return;
  
  const { error } = await supabase.storage.from('documentos_setur').remove([`${folder}/${fileName}`]);
  if (error) {
    alert('Erro ao apagar arquivo: ' + error.message);
  } else {
    window.viewFiles(folder);
  }
};

// --- Tarefas Logic ---
async function loadTarefas() {
  const listEl = document.getElementById('tarefas-list');
  listEl.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
  
  const { data, error } = await supabase
    .from('tarefas')
    .select(`
      *, 
      creator:profiles!tarefas_user_id_fkey(nome_completo)
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error loading tarefas:', error);
    listEl.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar tarefas.</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    listEl.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma tarefa encontrada.</td></tr>';
    window.tarefasData = [];
    return;
  }
  
  window.tarefasData = data;
  renderTarefas(data);
}

function renderTarefas(dataToRender) {
  const listEl = document.getElementById('tarefas-list');
  if (!dataToRender || dataToRender.length === 0) {
    listEl.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma tarefa para esta busca.</td></tr>';
    return;
  }

  listEl.innerHTML = '';
  dataToRender.forEach(item => {
    const tr = document.createElement('tr');
    
    let statusColor = 'var(--text-muted)';
    if(item.status === 'Em Andamento') statusColor = 'var(--primary)';
    if(item.status === 'Concluída') statusColor = '#4caf50';
    
    const creatorName = item.creator ? item.creator.nome_completo : 'Usuário';

    tr.innerHTML = `
      <td>
        <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}55;">
          ${item.status}
        </span>
      </td>
      <td>
        <strong>${item.titulo}</strong>
        ${item.descricao ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 3px 0 0 0;">${item.descricao}</p>` : ''}
        <small class="text-muted" style="display:block; margin-top:2px;">Criado por: ${creatorName}</small>
      </td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="btn-icon" title="Editar" onclick="editTarefa('${item.id}')"><i data-lucide="edit"></i></button>
          <button class="btn-icon text-danger" title="Apagar" onclick="deleteTarefa('${item.id}')"><i data-lucide="trash"></i></button>
        </div>
      </td>
    `;
    listEl.appendChild(tr);
  });
  
  if(window.lucide) window.lucide.createIcons();
}

async function handleNovaTarefa(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('tarefa-titulo').value;
  const descricao = document.getElementById('tarefa-descricao').value;
  const status = document.getElementById('tarefa-status').value;
  
  const saveBtn = document.getElementById('save-tarefa');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Salvando...';
  
  try {
    if (editingTarefaId) {
      const { error } = await supabase
        .from('tarefas')
        .update({ 
          titulo, descricao, status 
        })
        .eq('id', editingTarefaId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('tarefas')
        .insert([{ 
          titulo, descricao, status, user_id: currentUser.id
        }]);
      if (error) throw error;
    }

    document.getElementById('modal-tarefa').classList.remove('active');
    document.getElementById('form-tarefa').reset();
    loadTarefas();

  } catch (err) {
    alert('Erro ao salvar tarefa: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Salvar Tarefa';
  }
}

window.editTarefa = async (id) => {
  const item = window.tarefasData.find(x => x.id === id);
  if (!item) return;
  
  editingTarefaId = id;
  document.getElementById('tarefa-titulo').value = item.titulo;
  document.getElementById('tarefa-descricao').value = item.descricao || '';
  document.getElementById('tarefa-status').value = item.status || 'Pendente';
  
  document.querySelector('#modal-tarefa h2').textContent = 'Editar Tarefa';
  document.getElementById('modal-tarefa').classList.add('active');
};

window.deleteTarefa = async (id) => {
  if (!confirm('Tem certeza que deseja apagar esta tarefa?')) return;
  
  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  if (error) {
    alert('Erro ao apagar: ' + error.message);
  } else {
    loadTarefas();
  }
};
