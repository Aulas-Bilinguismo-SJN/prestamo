const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`, nombre: `${i+1}`, documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPkJVdzy3dmbyfT8jUbaBbETPQc4aDoUGJUVqcsCRYUR8iU48rVCpU2_Va_mz1wtKIJA/exec';

// Fecha formato: dd/mm/yyyy hh:mm:ss (Colombia UTC-5)
const formatFecha = () => {
    const d = new Date(Date.now() - 5*60*60*1000);
    return `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCFullYear()} ${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}:${d.getUTCSeconds().toString().padStart(2,'0')}`;
};

const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());
            items.forEach(item => Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""}));
            
            const estados = {};
            data?.forEach(fila => {
                if (fila.length >= 8) {
                    const [timestamp, equipo, nombreCompleto, documento, curso, profesor, materia, tipo] = fila;
                    if (equipo && tipo && (!estados[equipo] || new Date(timestamp) > new Date(estados[equipo].timestamp))) {
                        estados[equipo] = {timestamp, nombreCompleto, documento, curso, profesor, materia, tipo};
                    }
                }
            });
            
            Object.entries(estados).forEach(([numero, estado]) => {
                if (estado.tipo === "Préstamo") {
                    const item = items.find(i => i.nombre === numero);
                    if (item) Object.assign(item, {documento: estado.documento||"", profesor: estado.profesor||"", materia: estado.materia||"", nombreCompleto: estado.nombreCompleto||"", curso: estado.curso||""});
                }
            });
            actualizarVista();
        } catch (error) { 
            console.error("Error:", error);
            actualizarVista();
        }
    },

    async buscarEstudiante(doc) {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(doc)}`).then(r => r.json());
            return data?.encontrado ? {nombreCompleto: data.nombreCompleto||'Sin nombre', documento: data.documento||doc, curso: data.curso||'Sin curso', encontrado: true} : {encontrado: false, error: data.error||'No encontrado'};
        } catch (error) {
            return {encontrado: false, error: `Error: ${error.message}`};
        }
    },

    async guardar(item, tipo, datosEst = null, comentario = '') {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({
                    action: 'saveToBaseB', marcaTemporal: formatFecha(), equipo: item.nombre,
                    nombreCompleto: datosEst?.nombreCompleto || item.nombreCompleto || '',
                    documento: datosEst?.documento || item.documento, curso: datosEst?.curso || item.curso || '',
                    profesorEncargado: item.profesor, materia: item.materia, tipo, comentario
                })
            });
        } catch (error) { console.error(`Error ${tipo}:`, error); }
    }
};

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    if (!item || !modal || !container) return;
    
    const prestado = !!(item.documento?.trim());
    document.querySelector('.modal-header h2').textContent = `${prestado ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    
    if (prestado) {
        // Modal Devolución
        container.innerHTML = `<div style="display:flex;flex-direction:column;gap:15px;">
            <div style="background:#f8f9fa;padding:15px;border-radius:5px;border:1px solid #e9ecef;">
                ${['Estudiante','Documento','Curso','Profesor(a)','Materia'].map((label,i) => 
                    `<p><strong>${label}:</strong></p><div style="margin-bottom:10px;padding:5px;background:white;border-radius:3px;">${[item.nombreCompleto||'Sin info', item.documento, item.curso||'Sin info', item.profesor||'Sin info', item.materia||'Sin info'][i]}</div>`
                ).join('')}
            </div>
            <div><label>Comentario (opcional):</label><textarea id="comentario" rows="3" placeholder="Observaciones..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></textarea></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="btnGuardar" style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Devolver</button>
                <button id="btnCancelar" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancelar</button>
            </div></div>`;
            
        document.getElementById('btnGuardar').onclick = async () => {
            if (confirm(`¿Confirma devolución del equipo ${item.nombre}?`)) {
                await api.guardar(item, 'Devuelto', null, document.getElementById('comentario').value.trim());
                Object.assign(item, {documento:"", profesor:"", materia:"", nombreCompleto:"", curso:""});
                cerrarModal(); actualizarVista(); setTimeout(api.cargarEquipos, 1500);
            }
        };
    } else {
        // Modal Préstamo
        container.innerHTML = `<div style="display:flex;flex-direction:column;gap:15px;">
            ${['documento|Documento del Estudiante|Ingrese documento...','profesor|Profesor(a) Encargado|Nombre del profesor...','materia|Materia|Nombre de la materia...'].map(field => {
                const [id, label, placeholder] = field.split('|');
                return `<div><label>${label}:</label><input type="text" id="${id}" placeholder="${placeholder}" value="${item[id]||''}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                ${id==='documento'?'<small id="buscarInfo" style="color:#6c757d;">Ingrese documento para buscar</small>':''}
                </div>`;
            }).join('')}
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="btnGuardar" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Prestar</button>
                <button id="btnCancelar" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancelar</button>
            </div></div>`;

        let datosEst = {}, timer;
        document.getElementById('documento').oninput = async (e) => {
            const doc = e.target.value.trim(), info = document.getElementById('buscarInfo');
            clearTimeout(timer); datosEst = {};
            
            if (doc.length >= 3) {
                info.textContent = 'Buscando...'; info.style.color = '#ffc107';
                timer = setTimeout(async () => {
                    const result = await api.buscarEstudiante(doc);
                    if (result.encontrado) {
                        datosEst = result;
                        info.textContent = `✓ ${result.nombreCompleto} - ${result.curso}`;
                        info.style.color = '#28a745';
                    } else {
                        info.textContent = `⚠ ${result.error}`;
                        info.style.color = '#dc3545';
                    }
                }, 800);
            } else info.textContent = 'Ingrese documento para buscar', info.style.color = '#6c757d';
        };

        document.getElementById('btnGuardar').onclick = async () => {
            const vals = ['documento','profesor','materia'].map(id => document.getElementById(id).value.trim());
            if (vals.some(v => !v)) return alert('Complete todos los campos');
            
            if (!datosEst.encontrado && !Object.keys(datosEst).length && !confirm('Estudiante no encontrado. ¿Continuar?')) return;
            if (!datosEst.encontrado) datosEst = {documento: vals[0], nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            
            Object.assign(item, {documento: vals[0], profesor: vals[1], materia: vals[2], nombreCompleto: datosEst.nombreCompleto||'Manual', curso: datosEst.curso||'Por verificar'});
            await api.guardar(item, 'Préstamo', datosEst);
            cerrarModal(); actualizarVista(); setTimeout(api.cargarEquipos, 1500);
        };
    }
    document.getElementById('btnCancelar').onclick = cerrarModal;
    modal.style.display = 'block';
}

const actualizarVista = () => {
    const contenedor = document.getElementById("malla");
    if (!contenedor) return;
    
    contenedor.innerHTML = items.map(item => {
        const ocupado = !!(item.documento?.trim());
        return `<div class="ramo" style="background:${ocupado?'#d4edda':'#f8f9fa'};border:2px solid ${ocupado?'#28a745':'#ccc'};border-radius:8px;padding:15px;margin:5px;cursor:pointer;text-align:center;min-height:80px;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:all 0.3s ease;" 
            onclick="mostrarModalItem('${item.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-weight:bold;font-size:1.2em;">Equipo ${item.nombre}</div>
            <div style="color:${ocupado?'green':'#6c757d'};font-size:1.5em;margin:5px 0;">${ocupado?'✓ PRESTADO':'○ DISPONIBLE'}</div>
            ${ocupado ? `<div style="font-size:0.8em;color:#666;margin-top:5px;text-align:center;"><strong>${item.nombreCompleto||'Sin nombre'}</strong><br><small>${item.curso||'Sin curso'}</small><br><small style="color:#888;">Doc: ${item.documento}</small></div>` : ''}
        </div>`;
    }).join('');
};

function resetearMalla() {
    if (confirm("⚠️ Devolución masiva. ¿Seguro?")) {
        const comentario = prompt("Comentario:", "Devolución masiva") || '';
        items.forEach(async item => {
            if (item.documento?.trim()) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento:"", profesor:"", materia:"", nombreCompleto:"", curso:""});
            }
        });
        setTimeout(() => { actualizarVista(); api.cargarEquipos(); }, 2000);
    }
}

const cerrarModal = () => document.getElementById('modalMetodos').style.display = 'none';

// Eventos
window.onclick = e => e.target === document.getElementById('modalMetodos') && cerrarModal();
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
document.addEventListener('DOMContentLoaded', () => {
    const [malla, modal] = ['malla','modalMetodos'].map(id => document.getElementById(id));
    if (!malla || !modal) return console.error('Elementos DOM faltantes');
    actualizarVista(); api.cargarEquipos(); setInterval(api.cargarEquipos, 30000);
});

// Debug
window.debugItems = () => console.log('Items:', items.filter(i => i.documento?.trim()));
