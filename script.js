const API_URL = 'https://script.google.com/macros/s/AKfycbxdigcfuoeHycEROAQ2zfjDAqdrBo0QxjzZNs0AmqqA86PVCsAetPDfp4gP9E3TFGZf7w/exec';

// Crea 50 items iniciales
const items = Array.from({ length: 50 }, (_, i) => ({
  id: `item_${i + 1}`,
  nombre: `${i + 1}`,
  documento: "",
  profesor: ""
}));

// Carga datos desde BaseA (Google Sheet)
function cargarDatosDesdeGoogleSheet() {
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      data.slice(1).forEach((fila, idx) => {
        items[idx].documento = fila[1] || "";
        items[idx].profesor = fila[2] || "";
      });
      actualizarVista();
    })
    .catch(err => console.error("Error cargando BaseA:", err));
}

// Guarda en BaseB (registro de cambios)
function guardarEnBaseB(item) {
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item: item.nombre,
      documento: item.documento,
      profesor: item.profesor
    })
  }).catch(err => console.error("Error guardando en BaseB:", err));
}

// Mostrar modal para editar o desmarcar
function mostrarModalItem(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  if (item.documento.trim() !== "") {
    mostrarModalDesmarcar(itemId);
    return;
  }

  const modal = document.getElementById('modalMetodos');
  const listaMetodos = document.getElementById('listaMetodos');
  document.querySelector('.modal-header h2').textContent = `Item ${item.nombre}`;
  listaMetodos.innerHTML = '';

  // Crear formulario de edición
  const formulario = document.createElement('div');
  formulario.style.display = 'flex';
  formulario.style.flexDirection = 'column';
  formulario.style.gap = '15px';

  const divDoc = document.createElement('div');
  divDoc.innerHTML = `
    <label>Documento:</label>
    <textarea id="documento" rows="3">${item.documento}</textarea>
  `;

  const divProf = document.createElement('div');
  divProf.innerHTML = `
    <label>Profesor(a):</label>
    <input type="text" id="profesor" value="${item.profesor}">
  `;

  const divBtn = document.createElement('div');
  divBtn.style.display = 'flex';
  divBtn.style.justifyContent = 'flex-end';
  divBtn.style.gap = '10px';

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar';
  btnGuardar.style.backgroundColor = '#007bff';
  btnGuardar.style.color = 'white';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.backgroundColor = '#6c757d';
  btnCancelar.style.color = 'white';

  btnGuardar.addEventListener('click', () => {
    item.documento = document.getElementById('documento').value;
    item.profesor = document.getElementById('profesor').value;
    guardarEnBaseB(item);
    cerrarModal();
    actualizarVista();
  });
  btnCancelar.addEventListener('click', cerrarModal);

  divBtn.append(btnGuardar, btnCancelar);
  formulario.append(divDoc, divProf, divBtn);
  listaMetodos.appendChild(formulario);
  modal.style.display = 'block';
}

// Modal para desmarcar
function mostrarModalDesmarcar(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const modal = document.getElementById('modalMetodos');
  const listaMetodos = document.getElementById('listaMetodos');
  document.querySelector('.modal-header h2').textContent = `Desmarcar Equipo ${item.nombre}`;
  listaMetodos.innerHTML = '';

  const formulario = document.createElement('div');
  formulario.style.display = 'flex';
  formulario.style.flexDirection = 'column';
  formulario.style.gap = '15px';

  const divInfo = document.createElement('div');
  divInfo.className = 'readonly-info';
  divInfo.innerHTML = `
    <p><strong>Documento:</strong> ${item.documento}</p>
    <p><strong>Profesor(a):</strong> ${item.profesor}</p>
  `;

  const divCom = document.createElement('div');
  divCom.innerHTML = `
    <label>Comentario (opcional):</label>
    <textarea id="comentario" rows="3"></textarea>
  `;

  const divBtn = document.createElement('div');
  divBtn.style.display = 'flex';
  divBtn.style.justifyContent = 'flex-end';
  divBtn.style.gap = '10px';

  const btnDes = document.createElement('button');
  btnDes.textContent = 'Desmarcar';
  btnDes.style.backgroundColor = '#8a5a5a';
  btnDes.style.color = 'white';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.backgroundColor = '#6c757d';
  btnCancelar.style.color = 'white';

  btnDes.addEventListener('click', () => {
    const comentario = document.getElementById('comentario').value.trim();
    if (confirm(`¿Desmarcar item ${item.nombre}?${comentario ? '\nComentario: ' + comentario : ''}`)) {
      item.documento = '';
      item.profesor = '';
      guardarEnBaseB(item);
      cerrarModal();
      actualizarVista();
    }
  });
  btnCancelar.addEventListener('click', cerrarModal);

  divBtn.append(btnDes, btnCancelar);
  formulario.append(divInfo, divCom, divBtn);
  listaMetodos.appendChild(formulario);
  modal.style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modalMetodos').style.display = 'none';
}

function crearGrilla() {
  const cont = document.getElementById('malla');
  cont.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ramo';
    div.innerHTML = `
      <div>${item.nombre}</div>
      <div style="color:${item.documento.trim() ? 'green' : '#6c757d'}">
        ${item.documento.trim() ? '✓' : '○'}
      </div>`;
    div.addEventListener('click', () => mostrarModalItem(item.id));
    cont.appendChild(div);
  });
}

function actualizarVista() {
  crearGrilla();
}

function resetearMalla() {
  if (confirm('¿Deseas resetear todos los equipos?')) {
    items.forEach(it => { it.documento = ''; it.profesor = ''; });
    guardarEnBaseB({ nombre: 'RESET_GLOBAL', documento: '', profesor: '' });
    actualizarVista();
  }
}

window.onclick = event => {
  if (event.target === document.getElementById('modalMetodos')) cerrarModal();
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosDesdeGoogleSheet();
  setInterval(cargarDatosDesdeGoogleSheet, 30000);
  crearGrilla();
});
