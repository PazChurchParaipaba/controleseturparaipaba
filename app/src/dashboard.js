import './style.css';
import './dashboard.css';
import { supabase } from './supabase.js';

let currentUser = null;
let editingAgendaId = null;
window.agendaData = [];

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
    'dispensas': 'Dispensas de Licença',
    'agenda': 'Agenda de Compromissos'
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
      
      if(target === 'dispensas') loadDispensas();
      if(target === 'agenda') loadAgenda();
    });
  });

  // 3. Logout customizado
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('setur_user');
    window.location.href = '/index.html';
  });

  // Init default module
  loadDispensas();
  setupModals();
});

// --- Modals Setup ---
function setupModals() {
  const modalDispensa = document.getElementById('modal-dispensa');
  const btnNovaDispensa = document.getElementById('btn-nova-dispensa');
  const closeDispensa = document.getElementById('close-modal-dispensa');
  const cancelDispensa = document.getElementById('cancel-dispensa');

  btnNovaDispensa.addEventListener('click', () => {
    // Auto fill pasta with year/month format
    const date = new Date();
    document.getElementById('dispensa-pasta').value = `${date.getFullYear()}/${date.toLocaleString('pt-BR', { month: 'long' })}`;
    modalDispensa.classList.add('active');
  });

  closeDispensa.addEventListener('click', () => modalDispensa.classList.remove('active'));
  cancelDispensa.addEventListener('click', () => modalDispensa.classList.remove('active'));

  const formDispensa = document.getElementById('form-dispensa');
  formDispensa.addEventListener('submit', handleNovaDispensa);

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
}

// --- Dispensas Logic ---
async function loadDispensas() {
  const listEl = document.getElementById('dispensas-list');
  listEl.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';
  
  const { data, error } = await supabase
    .from('dispensas')
    .select('*, profiles(nome_completo)')
    .order('data_registro', { ascending: false });
    
  if (error) {
    console.error('Error loading dispensas:', error);
    listEl.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro do banco: ${error.message || error.details || JSON.stringify(error)}</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    listEl.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma dispensa registrada.</td></tr>';
    return;
  }
  
  listEl.innerHTML = '';
  data.forEach(item => {
    const tr = document.createElement('tr');
    const dateStr = new Date(item.data_registro).toLocaleDateString('pt-BR');
    const uploaderName = item.profiles ? item.profiles.nome_completo : 'Usuário';
    
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><strong>${item.titulo}</strong><br><small class="text-muted">Por: ${uploaderName}</small></td>
      <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
      <td>
        ${item.pasta_storage ? 
          `<button class="btn-icon" title="Ver Arquivos" onclick="viewFiles('${item.pasta_storage}')"><i data-lucide="folder"></i> ${item.pasta_storage}</button>` : 
          `<span class="text-muted">-</span>`
        }
      </td>
      <td>
        <button class="btn-icon" title="Editar"><i data-lucide="edit"></i></button>
      </td>
    `;
    listEl.appendChild(tr);
  });
  
  if(window.lucide) window.lucide.createIcons();
}

async function handleNovaDispensa(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('dispensa-titulo').value;
  let pasta = document.getElementById('dispensa-pasta').value;
  const filesInput = document.getElementById('dispensa-arquivos');
  const files = filesInput.files;
  
  if (files.length === 0) {
    alert('Selecione pelo menos um arquivo.');
    return;
  }

  // Sanitize folder path
  pasta = pasta.trim().replace(/[^a-zA-Z0-9/_-]/g, '_');
  
  const saveBtn = document.getElementById('save-dispensa');
  const uploadProgress = document.getElementById('upload-progress');
  const progressBar = document.getElementById('progress-bar');
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Enviando...';
  uploadProgress.classList.remove('hidden');

  try {
    // Upload files to Supabase Storage
    const totalFiles = files.length;
    let uploaded = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const filePath = `${pasta}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos_setur')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error(`Falha ao subir arquivo ${file.name}`);
      }
      
      uploaded++;
      progressBar.style.width = `${(uploaded / totalFiles) * 100}%`;
    }

    // Insert into Database
    const { error: dbError } = await supabase
      .from('dispensas')
      .insert([
        { 
          titulo: titulo, 
          pasta_storage: pasta,
          user_id: currentUser.id,
          status: 'Pendente'
        }
      ]);

    if (dbError) throw dbError;

    // Success
    document.getElementById('modal-dispensa').classList.remove('active');
    document.getElementById('form-dispensa').reset();
    loadDispensas();

  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Salvar e Enviar Arquivos';
    uploadProgress.classList.add('hidden');
    progressBar.style.width = '0%';
  }
}

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
          <i data-lucide="download"></i> Baixar
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
      <h3 style="font-size: 1rem; margin-bottom: 5px;">${item.titulo}</h3>
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
