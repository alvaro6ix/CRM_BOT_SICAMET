const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./bd');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse'); 
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001; 

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// --- ESTADÍSTICAS ---
app.get('/api/stats', async (req, res) => {
    try {
        const [enCalibracion] = await db.query("SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual != 'Entregado'");
        const [proximosSLA] = await db.query("SELECT COUNT(*) as total FROM instrumentos_estatus WHERE sla <= 10 AND estatus_actual != 'Entregado'");
        
        // Obtenemos todos los registros para armar las métricas de ingresos vs entregas
        const [ingresosData] = await db.query("SELECT DAYNAME(fecha_ingreso) as dia, COUNT(*) as cantidad FROM instrumentos_estatus GROUP BY dia");
        const [entregasData] = await db.query("SELECT DAYNAME(fecha_entrega) as dia, COUNT(*) as cantidad FROM instrumentos_estatus WHERE estatus_actual = 'Entregado' AND fecha_entrega IS NOT NULL GROUP BY dia");

        const diasMapeados = { 'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom' };
        
        const chartDataMapeada = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(diaCorto => {
            return { name: diaCorto, ingresos: 0, entregados: 0 };
        });

        ingresosData.forEach(row => {
            const diac = diasMapeados[row.dia];
            const indice = chartDataMapeada.findIndex(d => d.name === diac);
            if (indice !== -1) chartDataMapeada[indice].ingresos = row.cantidad;
        });

        entregasData.forEach(row => {
            const diac = diasMapeados[row.dia];
            const indice = chartDataMapeada.findIndex(d => d.name === diac);
            if (indice !== -1) chartDataMapeada[indice].entregados = row.cantidad;
        });
        
        res.json({ 
            enCalibracion: enCalibracion[0].total || 0, 
            proximosSLA: proximosSLA[0].total || 0, 
            acreditaciones: 12,
            chartData: chartDataMapeada
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Variables globales para estado de WhatsApp
let currentQR = '';
let isClientConnected = false;

app.get('/api/whatsapp/status', (req, res) => {
    res.json({ connected: isClientConnected, qr: currentQR });
});

app.post('/api/whatsapp/reset', async (req, res) => {
    try {
        console.log('♻️ Solicitud de reinicio de sesión WhatsApp...');
        if (client) {
            try {
                await client.destroy();
            } catch (e) { console.log("Aviso: Error destruyendo cliente (podría no estar activo)"); }
        }

        // Borrar carpetas de sesión y caché
        const authPath = path.join(__dirname, '.wwebjs_auth');
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('✅ Carpeta .wwebjs_auth eliminada');
        }
        if (fs.existsSync(cachePath)) {
            fs.rmSync(cachePath, { recursive: true, force: true });
        }

        currentQR = '';
        isClientConnected = false;
        
        // Esperar un poco antes de re-inicializar
        setTimeout(() => {
            client.initialize().catch(err => console.error("Error al re-inicializar después de reset:", err));
        }, 2000);

        res.json({ success: true, message: 'Sesión reiniciada. Generando nuevo QR...' });
    } catch (err) {
        console.error('❌ Error en reset WhatsApp:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/heatmap', async (req, res) => {
    try {
        // Obtenemos distribución de mensajes entrantes por Día y Hora
        const [rows] = await db.query(`
            SELECT DAYNAME(fecha) as dia, HOUR(fecha) as hora, COUNT(*) as cantidad 
            FROM chat_mensajes 
            WHERE direccion = 'in' 
            GROUP BY dia, hora
        `);
        res.json(rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/api/kpis_negocio', async (req, res) => {
    try {
        // Métricas Core del Laboratorio y CRM
        const [leads] = await db.query(`SELECT COUNT(*) as total FROM chat_leads WHERE estado='Pendiente'`);
        const [detenidos] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual='Laboratorio' AND fecha_ingreso < NOW() - INTERVAL 2 DAY`);
        const [listosSinNotificar] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual='Listo'`);
        const [esperando] = await db.query(`SELECT COUNT(DISTINCT telefono) as total FROM chat_mensajes WHERE direccion='in' AND fecha > NOW() - INTERVAL 12 HOUR`);
        
        // Pipeline counts
        const [qRecep] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual='Recepción'`);
        const [qLab] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual='Laboratorio'`);
        const [qCert] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual LIKE '%Certificación%'`);
        const [qEnt] = await db.query(`SELECT COUNT(*) as total FROM instrumentos_estatus WHERE estatus_actual='Entregado'`);

        // Tiempo Promedio Real (en minutos)
        const [avgTime] = await db.query(`SELECT AVG(tiempo_respuesta_seg) as avg_sec FROM chat_mensajes WHERE tiempo_respuesta_seg IS NOT NULL`);
        let avgMin = 0;
        if (avgTime.length > 0 && avgTime[0].avg_sec) {
            avgMin = Math.round(avgTime[0].avg_sec / 60);
        }

        res.json({
            clientes_esperando: esperando[0].total || 0,
            nuevos_leads: leads[0].total || 0,
            detenidos_laboratorio: detenidos[0].total || 0,
            listos_sin_notificar: listosSinNotificar[0].total || 0,
            conversaciones_activas: esperando[0].total || 0,
            tiempo_promedio_min: avgMin,
            pipeline: {
                recepcion: qRecep[0].total || 0,
                laboratorio: qLab[0].total || 0,
                certificacion: qCert[0].total || 0,
                listo: listosSinNotificar[0].total || 0,
                entregado: qEnt[0].total || 0
            }
        });
    } catch(err) { res.status(500).json({error: err.message}); }
});

// --- OPERACIONES DE INSTRUMENTOS (CRUD MULTIRREGISTRO) ---
app.post('/api/instrumentos-multiple', async (req, res) => {
    const { instrumentos } = req.body; 
    if (!instrumentos || instrumentos.length === 0) return res.status(400).json({error: "No hay datos"});

    try {
        const query = `INSERT INTO instrumentos_estatus 
            (orden_cotizacion, empresa, persona, tipo_servicio, nombre_instrumento, marca, modelo, no_serie, sla, estatus_actual) 
            VALUES ?`; 
        
        const valores = instrumentos.map(ins => [
            ins.orden_cotizacion, ins.empresa, ins.persona, ins.tipo_servicio, ins.nombre_instrumento, 
            ins.marca, ins.modelo, ins.no_serie, ins.sla, 'Recepción'
        ]);

        await db.query(query, [valores]);
        console.log(`✅ Registradas ${instrumentos.length} partidas de la orden ${instrumentos[0].orden_cotizacion}`);
        res.json({ success: true, count: instrumentos.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/instrumentos', async (req, res) => {
    try {
        const [equipos] = await db.query('SELECT * FROM instrumentos_estatus ORDER BY fecha_ingreso DESC');
        res.json(equipos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/instrumentos/:id/estatus', async (req, res) => {
    try {
        const estatus = req.body.estatus;
        if (estatus === 'Entregado') {
            await db.query('UPDATE instrumentos_estatus SET estatus_actual = ?, fecha_entrega = CURRENT_TIMESTAMP WHERE id = ?', [estatus, req.params.id]);
        } else {
            await db.query('UPDATE instrumentos_estatus SET estatus_actual = ? WHERE id = ?', [estatus, req.params.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/instrumentos/:id', async (req, res) => {
    try {
        const { orden_cotizacion, nombre_instrumento, marca, no_serie, empresa } = req.body;
        await db.query(
            'UPDATE instrumentos_estatus SET orden_cotizacion=?, nombre_instrumento=?, marca=?, no_serie=?, empresa=? WHERE id=?', 
            [orden_cotizacion, nombre_instrumento, marca, no_serie, empresa, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/instrumentos/:id/estatus', async (req, res) => {
    try {
        const { estatus } = req.body;
        await db.query('UPDATE instrumentos_estatus SET estatus_actual=? WHERE id=?', [estatus, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/instrumentos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM instrumentos_estatus WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RUTAS DE CATÁLOGOS ---
const tablasCatalogos = {
    'clientes': 'cat_clientes',
    'instrumentos': 'cat_instrumentos',
    'marcas': 'cat_marcas',
    'modelos': 'cat_modelos'
};

app.get('/api/catalogo/:tipo', async (req, res) => {
    const tabla = tablasCatalogos[req.params.tipo];
    if (!tabla) return res.status(400).json({ error: 'Catálogo inválido' });
    try {
        const [rows] = await db.query(`SELECT * FROM ${tabla} ORDER BY id DESC`);
        res.json(rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/api/catalogo/:tipo', async (req, res) => {
    const tabla = tablasCatalogos[req.params.tipo];
    if (!tabla) return res.status(400).json({ error: 'Catálogo inválido' });
    try {
        const body = req.body;
        if (req.params.tipo === 'clientes') {
            const empresa = body.empresa || body.contacto;
            const contacto = body.contacto || '';
            const email = body.email || '';
            await db.query(`INSERT INTO ${tabla} (nombre, contacto, email) VALUES (?, ?, ?)`, [empresa, contacto, email]);
        } else if (req.params.tipo === 'modelos') {
            await db.query(`INSERT INTO ${tabla} (nombre, marca) VALUES (?, ?)`, [body.nombre, body.marca]);
        } else {
            // para marcas o instrumentos
            await db.query(`INSERT INTO ${tabla} (nombre) VALUES (?)`, [body.nombre]);
        }
        res.json({ success: true, message: 'Guardado correctamente' });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/api/catalogo/:tipo/:id', async (req, res) => {
    const tabla = tablasCatalogos[req.params.tipo];
    if (!tabla) return res.status(400).json({ error: 'Catálogo inválido' });
    try {
        const body = req.body;
        if (req.params.tipo === 'clientes') {
            const empresa = body.empresa || body.contacto;
            const contacto = body.contacto || '';
            const email = body.email || '';
            await db.query(`UPDATE ${tabla} SET nombre=?, contacto=?, email=? WHERE id=?`, [empresa, contacto, email, req.params.id]);
        } else if (req.params.tipo === 'modelos') {
            await db.query(`UPDATE ${tabla} SET nombre=?, marca=? WHERE id=?`, [body.nombre, body.marca, req.params.id]);
        } else {
            // para marcas o instrumentos
            await db.query(`UPDATE ${tabla} SET nombre=? WHERE id=?`, [body.nombre, req.params.id]);
        }
        res.json({ success: true, message: 'Actualizado correctamente' });
    } catch(err) { res.status(500).json({error: err.message}); }
});

// --- LEADS ---
app.get('/api/leads', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM chat_leads ORDER BY id DESC");
        res.json(rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/api/leads', async (req, res) => {
    try {
        const { telefono, nombre, interes } = req.body;
        await db.query("INSERT INTO chat_leads (telefono, nombre, interes, estado) VALUES (?, ?, ?, 'Pendiente')", [telefono, nombre, interes]);
        res.json({success: true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/api/leads/:id', async (req, res) => {
    try {
        const { estado } = req.body;
        await db.query("UPDATE chat_leads SET estado = ? WHERE id = ?", [estado, req.params.id]);
        res.json({success: true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.delete('/api/catalogo/:tipo/all', async (req, res) => {
    const tabla = tablasCatalogos[req.params.tipo];
    if (!tabla) return res.status(400).json({ error: 'Catálogo inválido' });
    try {
        await db.query(`DELETE FROM ${tabla}`);
        await db.query(`ALTER TABLE ${tabla} AUTO_INCREMENT = 1`);
        res.json({ success: true, message: 'Todos los registros eliminados masivamente' });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.delete('/api/catalogo/:tipo/:id', async (req, res) => {
    const tabla = tablasCatalogos[req.params.tipo];
    if (!tabla) return res.status(400).json({ error: 'Catálogo inválido' });
    try {
        await db.query(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/api/importar-catalogo', upload.single('archivoExcel'), async (req, res) => {
    const { tipo } = req.body; 
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const datos = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const tabla = tablasCatalogos[tipo];
        if (!tabla) return res.status(400).json({ error: 'Tipo inválido' });
        
        let agregados = 0;
        for (let fila of datos) {
            // Normalizar llaves para evitar fallos por espacios o acentos ("Teléfono" -> "telefono", "Nombre (Empresa)" -> "nombreempresa")
            const filaNorm = {};
            for (let k in fila) {
                const cleanKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                filaNorm[cleanKey] = fila[k];
            }

            // Use fallback mechanism safely
            const getStr = (val) => val != null ? String(val).trim() : '';

            const nombreOriginal = getStr(filaNorm.nombre || filaNorm.nombreempresa || filaNorm.empresa || filaNorm.cliente || filaNorm.modelo || filaNorm.razonsocial || filaNorm.marca || filaNorm.descripcion);
            const marca = getStr(filaNorm.marca || 'Desconocida');
            const contactoOriginal = getStr(filaNorm.contacto || filaNorm.contactoprincipal || filaNorm.telefono || filaNorm.tel || filaNorm.celular || filaNorm.numero);
            const emailOriginal = getStr(filaNorm.email || filaNorm.correo || filaNorm.correoelectronico || filaNorm.mailempresa);
            
            if (nombreOriginal) {
                if (tipo === 'modelos') {
                    await db.query(`INSERT INTO ${tabla} (nombre, marca) VALUES (?, ?) ON DUPLICATE KEY UPDATE marca=VALUES(marca)`, [nombreOriginal, marca]);
                } else if (tipo === 'clientes') {
                    await db.query(`INSERT INTO ${tabla} (nombre, contacto, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE contacto=VALUES(contacto), email=VALUES(email)`, [nombreOriginal, contactoOriginal, emailOriginal]);
                } else {
                    await db.query(`INSERT IGNORE INTO ${tabla} (nombre) VALUES (?)`, [nombreOriginal]);
                }
                agregados++;
            }
        }
        res.json({ success: true, message: `Catálogo de ${tipo} actualizado con ${agregados} registros.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INTELIGENCIA PDF v19 (PYTHON + PDFPLUMBER PARA TABLAS COMPLEJAS) ---
const { execFile } = require('child_process');

app.post('/api/leer-pdf', upload.single('archivoPdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Sin archivo' });

        // Guardar temporalmente el PDF para que lo lea Python
        const tempPath = path.join(__dirname, `temp_${Date.now()}.pdf`);
        fs.writeFileSync(tempPath, req.file.buffer);

        // Llamar al script de Python
        execFile('python', [path.join(__dirname, 'pdf_parser.py'), tempPath], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            // Borramos el PDF sin importar si falló
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

            if (error) {
                console.error('❌ Error ejecutando Python:', error, stderr);
                return res.status(500).json({ error: 'Fallo al procesar el PDF.' });
            }

            try {
                // Stdout contiene el JSON de resultado
                const resultado = JSON.parse(stdout.trim());
                if (resultado.error) {
                    return res.status(500).json({ error: resultado.error });
                }

                console.log(`✅ EXTRACCIÓN MAESTRA EN PYTHON -> FOLIO: "${resultado.orden_cotizacion}" | PARTIDAS: ${resultado.partidas.length}`);
                
                res.json({
                    success: true,
                    cabecera: { 
                        orden_cotizacion: resultado.orden_cotizacion, 
                        empresa: resultado.empresa, 
                        persona: resultado.persona, 
                        sla: resultado.sla 
                    },
                    partidas: resultado.partidas
                });
            } catch (err) {
                console.error('❌ Error parseando respuesta de Python:', err, stdout);
                res.status(500).json({ error: 'El parser no generó un JSON válido.' });
            }
        });
    } catch (err) {
        console.error('❌ Error /api/leer-pdf:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`🚀 API en http://localhost:${port}`));

// --- BOT WHATSAPP ---
const client = new Client({ 
    authStrategy: new LocalAuth(), 
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ], 
        handleSIGINT: false 
    } 
});

client.on('qr', qr => {
    currentQR = qr;
    isClientConnected = false;
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot Activo');
    currentQR = '';
    isClientConnected = true;
});

const { MessageMedia } = require('whatsapp-web.js');

app.post('/api/whatsapp/send-media', upload.single('archivo'), async (req, res) => {
    try {
        if (!isClientConnected) return res.status(400).json({error: 'Bot no conectado'});
        if (!req.file) return res.status(400).json({error: 'No se incluyó archivo'});
        const numero = req.body.numero; // Formato ej: 5215512345678@c.us
        if (!numero) return res.status(400).json({error: 'Número requerido'});

        const media = new MessageMedia(req.file.mimetype, req.file.buffer.toString('base64'), req.file.originalname);
        await client.sendMessage(numero, media);
        res.json({success: true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

client.on('disconnected', (reason) => {
    console.log('❌ Bot Desconectado:', reason);
    currentQR = '';
    isClientConnected = false;
    // Evitar bucle inmediato de crash si hay problemas de sesión
    setTimeout(() => {
        client.initialize().catch(err => console.error("Error al re-inicializar:", err));
    }, 5000);
});
client.on('message', async msg => {
    const numeroUser = msg.from;
    const textoRecibido = msg.body.trim().toUpperCase(); 
    try {
        const [sesion] = await db.query('SELECT * FROM sesiones WHERE cliente_whatsapp = ?', [numeroUser]);
        if (sesion.length === 0) {
            const [nodo] = await db.query('SELECT mensaje_texto FROM nodos WHERE id = 1');
            await client.sendMessage(numeroUser, nodo[0].mensaje_texto);
            await db.query('INSERT INTO sesiones (cliente_whatsapp, nodo_actual_id) VALUES (?, 1)', [numeroUser]);
        } else {
            const nodoActual = sesion[0].nodo_actual_id;
            if (nodoActual === 5) {
                const [info] = await db.query('SELECT * FROM instrumentos_estatus WHERE orden_cotizacion = ?', [textoRecibido]);
                if (info.length > 0) {
                    const res = `🔍 *SICAMET*\n📦 *Equipo:* ${info[0].nombre_instrumento}\n🚩 *Estatus:* ${info[0].estatus_actual}\n📅 *Ingreso:* ${new Date(info[0].fecha_ingreso).toLocaleDateString()}`;
                    await client.sendMessage(numeroUser, res);
                    await db.query('UPDATE sesiones SET nodo_actual_id = 1 WHERE cliente_whatsapp = ?', [numeroUser]);
                } else { await client.sendMessage(numeroUser, '❌ Orden o Cotización no encontrada.'); }
                return;
            }
            const [opc] = await db.query('SELECT nodo_destino_id FROM opciones WHERE nodo_origen_id = ? AND entrada_usuario = ?', [nodoActual, textoRecibido]);
            if (opc.length > 0) {
                const [next] = await db.query('SELECT mensaje_texto FROM nodos WHERE id = ?', [opc[0].nodo_destino_id]);
                await client.sendMessage(numeroUser, next[0].mensaje_texto);
                await db.query('UPDATE sesiones SET nodo_actual_id = ? WHERE cliente_whatsapp = ?', [opc[0].nodo_destino_id, numeroUser]);
            }
        }
    } catch (err) { console.error(err); }
});
client.initialize();