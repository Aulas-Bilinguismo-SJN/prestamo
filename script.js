const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdigcfuoeHycEROAQ2zfjDAqdrBo0QxjzZNs0AmqqA86PVCsAetPDfp4gP9E3TFGZf7w/exec';

// --- API FUNCTIONS ---
const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());
            items.forEach(item => Object.assign(item, {documento: "", profesor: "", materia: ""}));
            data?.forEach(fila => {
                const item = items.find(i => i.nombre === fila[0]?.toString());
                if (item && fila.length >= 4) Object.assign(item, {documento: fila[1] || "", profesor: fila[2] || "", materia: fila[3] || ""});
            });
            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar equipos:", error); 
        }
    },

    async buscarEstudiante(documento) {
        try {
            console.log('Buscando documento:', documento); // Debug
            
            const url = `${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`;
            console.log('URL de búsqueda:', url); // Debug
            
            const response = await fetch(url);
            console.log('Response status:', response.status); // Debug
            
            if (!response.ok) {
                console.error('Error en la respuesta:', response.status, response.statusText);
                return {encontrado: false, error: 'Error en la respuesta del servidor'};
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data); // Debug
            
            // Verificar diferentes posibles estructuras de respuesta
            if (data && (data.encontrado === true || data.encontrado === 'true')) {
                return {
                    nombre: data.nombre || '',
                    curso: data.curso || '',
                    encontrado: true
                };
            } else if (data && data.length > 0) {
                // Por si la respuesta es un array
                const estudiante = data[0];
                return {
                    nombre: estudiante.nombre || estudiante[1] || '',
                    curso: estudiante.curso || estudiante[2] || '',
                    encontrado: true
                };
            } else {
                console.log('Estudiante no encontrado para documento:', documento);
                return {encontrado: false};
            }
            
        } catch (error) {
            console.error('Error al buscar estudiante:', error);
            return {encontrado: false, error: error.message};
        }
    },

    guardar(item, action = 'saveToBaseB') {
        const datos = {action, numeroEquipo: item.nombre, documento: item.documento, profesor: item.profesor, materia: item.materia};
        fetch(SCRIPT_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)})
            .catch(error => console.error("Error al guardar:", error));
    },

    eliminar(numeroEquipo) { this.guardar({nombre: numeroEquipo}, 'deleteFromBaseB'); }
};

// --- MODAL FUNCTIONS ---
function crearInput(id, label, type = 'text', placeholder = '', readonly = false, value = '') {
    return `<div><label for="${id}">${label}:</label>
            <${type === 'textarea' ? 'textarea' : 'input'} ${type === 'textarea' ? 'rows="3"' : `type="${type}"`} 
            id="${id}" placeholder="${placeholder}" ${readonly ? 'readonly' : ''} value="${value}">${type === 'textarea' ? value : ''}</${type === 'textarea' ? 'textarea' : 'input'}>
            ${id === 'documento' ? '<small id="buscarInfo" style="color: #6c757d;">Ingrese el documento para buscar automáticamente</small>' : ''}
            </div>`;
}

function crearBotones(guardarText, guardarClass, onGuardar) {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    div.innerHTML = `<button id="btnGuardar" class="${guardarClass}" style="background-color: ${guardarClass === 'delete-modal-btn' ? '#dc3545' : '#007bff'}; color: white;">${guardarText}</button>
                     <button id="btnCancelar" style="background-color: #6c757d; color: white;">Cancelar</button>`;
    div.querySelector('#btnGuardar').onclick = onGuardar;
    div.querySelector('#btnCancelar').onclick = cerrarModal;
    return div;
}

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.documento.trim()) return mostrarModalDesmarcar(itemId);

    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    
    document.querySelector('.modal-header h2').textContent = `Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Complete la información del Equipo:';
    
    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    form.innerHTML = [
        crearInput('documento', 'Documento del Estudiante', 'text', 'Ingrese el número de documento...'),
        crearInput('profesor', 'Profesor(a) Encargado', 'text', 'Ingrese el nombre del profesor(a)...', false, item.profesor),
        crearInput('materia', 'Materia', 'text', 'Ingrese la materia...', false, item.materia)
    ].join('');

    // Búsqueda automática mejorada (solo para validación)
    let timer;
    form.querySelector('#documento').oninput = async (e) => {
        const doc = e.target.value.trim();
        const info = document.getElementById('buscarInfo');
        
        clearTimeout(timer);
        
        if (doc.length >= 3) {
            info.textContent = 'Validando documento...';
            info.style.color = '#ffc107';
            
            timer = setTimeout(async () => {
                try {
                    const result = await api.buscarEstudiante(doc);
                    console.log('Resultado de validación:', result); // Debug
                    
                    if (result.encontrado) {
                        info.textContent = '✓ Documento válido';
                        info.style.color = '#28a745';
                    } else {
                        if (result.error) {
                            info.textContent = `⚠ Error: ${result.error}`;
                        } else {
                            info.textContent = '⚠ Documento no encontrado - puede continuar';
                        }
                        info.style.color = '#dc3545';
                    }
                } catch (error) {
                    console.error('Error en validación:', error);
                    info.textContent = '⚠ Error en validación - puede continuar';
                    info.style.color = '#dc3545';
                }
            }, 800);
            
        } else if (!doc.length) {
            info.textContent = 'Ingrese el documento para buscar automáticamente';
            info.style.color = '#6c757d';
        }
    };

    form.appendChild(crearBotones('Guardar', '', () => {
        const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => document.getElementById(id).value.trim());
        if (!doc || !prof || !mat) return alert('Complete todos los campos: Documento, Profesor y Materia');
        
        item.documento = doc;
        item.profesor = prof;
        item.materia = mat;
        
        api.guardar(item);
        cerrarModal();
        actualizarVista();
    }));

    container.innerHTML = '';
    container.appendChild(form);
    modal.style.display = 'block';
}

function mostrarModalDesmarcar(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    
    document.querySelector('.modal-header h2').textContent = `Desmarcar Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Información del Equipo a desmarcar:';

    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    form.innerHTML = `<div class="readonly-info">
        <p><strong>Estudiante:</strong></p><div class="info-content">${item.documento || 'Sin información'}</div>
        <p><strong>Profesor(a):</strong></p><div class="info-content">${item.profesor || 'Sin profesor'}</div>
        <p><strong>Materia:</strong></p><div class="info-content">${item.materia || 'Sin materia'}</div>
    </div>
    <div><label for="comentario">Comentario (opcional):</label>
    <textarea id="comentario" rows="4" placeholder="Explique por qué se desmarca..."></textarea></div>`;

    form.appendChild(crearBotones('Desmarcar', 'delete-modal-btn', () => {
        const comentario = document.getElementById('comentario').value.trim();
        if (confirm(`¿Deseas desmarcar el equipo ${item.nombre}?`)) {
            api.eliminar(item.nombre);
            Object.assign(item, {documento: "", profesor: "", materia: ""});
            console.log(`Desmarcado: ${item.nombre}, Comentario: ${comentario}`);
            cerrarModal();
            actualizarVista();
        }
    }));

    container.innerHTML = '';
    container.appendChild(form);
    modal.style.display = 'block';
}

// --- UI FUNCTIONS ---
const actualizarVista = () => crearGrilla();

function crearGrilla() {
    const contenedor = document.getElementById("malla");
    contenedor.innerHTML = items.map(item => {
        const ocupado = !!item.documento;
        return `<div class="ramo" style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; border-color: ${ocupado ? '#28a745' : '#ccc'};" onclick="mostrarModalItem('${item.id}')">
                    <div style="font-weight: bold;">${item.nombre}</div>
                    <div style="color: ${ocupado ? 'green' : '#6c757d'};">${ocupado ? '✓' : '○'}</div>
                </div>`;
    }).join('');
}

function resetearMalla() {
    if (confirm("¿Estás seguro de resetear todos los equipos?")) {
        items.forEach(item => {
            if (item.documento) api.eliminar(item.nombre);
            Object.assign(item, {documento: "", profesor: "", materia: ""});
        });
        actualizarVista();
    }
}

const cerrarModal = () => document.getElementById('modalMetodos').style.display = 'none';

// --- EVENT LISTENERS ---
window.onclick = e => e.target === document.getElementById('modalMetodos') && cerrarModal();
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
document.addEventListener('DOMContentLoaded', () => {
    api.cargarEquipos();
    setInterval(api.cargarEquipos, 30000);
});
