import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, MessageSquare, Plus, Edit2, Trash2, Smartphone, Save, X, Lightbulb } from 'lucide-react';

const FlujosWhatsapp = ({ darkMode }) => {
  const [reglas, setReglas] = useState([
      { id: 1, trigger: 'hola|buenos dias|buenas tardes', respuesta: '¡Hola! Bienvenido a SICAMET. ¿En qué podemos ayudarte?' },
      { id: 2, trigger: 'cotizacion|precio|costo', respuesta: 'Para cotizaciones, por favor envíanos la lista de tus equipos y te contactaremos a la brevedad.' }
  ]);
  const [cargando, setCargando] = useState(false);
  
  // Simulador
  const [simuladorAbierto, setSimuladorAbierto] = useState(false);
  const [mensajesDemo, setMensajesDemo] = useState([{ tipo: 'bot', text: 'Simulador iniciado. Escribe un mensaje para probar las reglas.' }]);
  const [inputDemo, setInputDemo] = useState('');

  // Editor
  const [modalEdicion, setModalEdicion] = useState(false);
  const [reglaActual, setReglaActual] = useState({ id: null, trigger: '', respuesta: '' });

  const enviarMensajeDemo = (e) => {
      e.preventDefault();
      if (!inputDemo) return;
      
      const userMsg = inputDemo;
      const nuevosMensajes = [...mensajesDemo, { tipo: 'user', text: userMsg }];
      setInputDemo('');

      // Buscar regla
      const textoValidar = userMsg.toLowerCase();
      let respuestaBot = 'No entendí el mensaje. (Respuesta por defecto)';
      
      for (const regla of reglas) {
          const keywords = regla.trigger.toLowerCase().split('|');
          if (keywords.some(k => textoValidar.includes(k.trim()))) {
              respuestaBot = regla.respuesta;
              break;
          }
      }

      nuevosMensajes.push({ tipo: 'bot', text: respuestaBot });
      setMensajesDemo(nuevosMensajes);
  };

  const guardarRegla = () => {
      if(!reglaActual.trigger || !reglaActual.respuesta) return alert('Debes llenar las palabras clave y la respuesta.');
      if (reglaActual.id) {
          setReglas(reglas.map(r => r.id === reglaActual.id ? reglaActual : r));
      } else {
          setReglas([...reglas, { ...reglaActual, id: Date.now() }]);
      }
      setModalEdicion(false);
  };

  const eliminarRegla = (id) => {
      setReglas(reglas.filter(r => r.id !== id));
  };

  const boxBg = darkMode ? 'bg-[#253916] border-[#C9EA63]/20' : 'bg-white border-gray-100 shadow-xl';
  const textTitle = darkMode ? 'text-[#F2F6F0]' : 'text-slate-800';
  const inputBg = darkMode ? 'bg-[#141f0b] border-[#C9EA63]/40 text-[#F2F6F0]' : 'bg-slate-50 border-gray-200 text-slate-800';

  return (
    <div className="w-full space-y-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-opacity-20 border-[#C9EA63]">
        <div>
          <h2 className={`text-3xl font-bold flex items-center gap-3 ${textTitle}`}>
            <Bot className={darkMode ? 'text-[#C9EA63]' : 'text-indigo-500'} size={32} /> 
            Reglas del Bot de WhatsApp
          </h2>
          <p className={`mt-2 text-sm ${darkMode ? 'text-[#F2F6F0]/70' : 'text-gray-500'}`}>
            Define cómo responde el bot automáticamente a mensajes específicos.
          </p>
        </div>
        
        <div className="flex gap-3">
            <button onClick={() => setSimuladorAbierto(true)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none flex items-center gap-2 shadow-md ${darkMode ? 'bg-[#141f0b] text-[#C9EA63] hover:bg-[#314a1c]' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>
                <Smartphone size={16}/> Probar Bot (Simulador)
            </button>
            <button onClick={() => { setReglaActual({id: null, trigger: '', respuesta: ''}); setModalEdicion(true) }} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md ${darkMode ? 'bg-[#C9EA63] text-[#141f0b] hover:bg-[#b0d14b]' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                <Plus size={16}/> Nueva Regla
            </button>
        </div>
      </div>

      <div className={`p-4 rounded-xl text-sm md:text-base flex gap-3 shadow-sm ${darkMode ? 'bg-amber-900/30 text-amber-300 border border-amber-500/30' : 'bg-blue-50 text-blue-800 border-l-4 border-blue-500'}`}>
         <Lightbulb size={24} className="shrink-0 mt-0.5" />
         <div>
             <strong>¿Cómo funciona esto?</strong> El bot lee los mensajes del cliente. Si el mensaje contiene alguna de las <b>"Frases o Palabras Clave"</b> que definas aquí, responderá automáticamente con el texto que le asignes. El sistema lee de <i>arriba hacia abajo</i>.
         </div>
      </div>

      <div className="grid gap-6 mt-6">
          {reglas.map((regla, index) => (
              <div key={regla.id} className={`p-6 rounded-2xl border flex flex-col md:flex-row gap-6 relative transition-colors ${boxBg}`}>
                  <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${darkMode ? 'bg-[#C9EA63] text-[#141f0b]' : 'bg-indigo-600 text-white'}`}>
                      {index + 1}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                          <MessageSquare size={16} className={`opacity-70 ${darkMode ? 'text-[#C9EA63]' : 'text-indigo-500'}`} />
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-[#C9EA63]' : 'text-indigo-500'}`}>Si el cliente escribe (Palabras clave)</h4>
                      </div>
                      <div className={`p-3 rounded-lg border text-sm font-medium break-words ${darkMode ? 'bg-[#141f0b]/50 border-[#C9EA63]/10 text-rose-300' : 'bg-slate-50 border-slate-200 text-rose-600'}`}>
                          {regla.trigger}
                      </div>
                      <p className="text-[10px] opacity-50 italic">Separadas por el símbolo | (Pleca)</p>
                  </div>

                  <div className={`hidden md:block w-8 shrink-0 flex items-center justify-center opacity-30`}>
                      <Lightbulb size={24} className={darkMode ? 'text-[#F2F6F0]' : 'text-slate-800'} />
                  </div>

                  <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-2 mb-1">
                          <Bot size={16} className={`opacity-70 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>El Bot responde esto automáticamente</h4>
                      </div>
                      <div className={`p-3 rounded-lg border text-sm break-words whitespace-pre-wrap ${darkMode ? 'bg-[#141f0b]/50 border-emerald-500/20 text-[#F2F6F0]' : 'bg-emerald-50 border-emerald-100 text-slate-800'}`}>
                          {regla.respuesta}
                      </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-center">
                      <button onClick={() => { setReglaActual(regla); setModalEdicion(true); }} className={`p-2 rounded-lg transition-colors shadow-sm ${darkMode ? 'bg-[#1b2b10] text-[#C9EA63] hover:bg-[#314a1c]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          <Edit2 size={16} />
                      </button>
                      <button onClick={() => eliminarRegla(regla.id)} className={`p-2 rounded-lg transition-colors shadow-sm ${darkMode ? 'bg-red-900/40 text-red-400 hover:bg-red-900' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                          <Trash2 size={16} />
                      </button>
                  </div>
              </div>
          ))}

          {reglas.length === 0 && (
              <div className={`p-8 rounded-2xl border text-center opacity-60 ${boxBg}`}>
                  No hay reglas configuradas. El bot no responderá a ningún mensaje.
              </div>
          )}
      </div>

      {/* MODAL SIMULADOR */}
      {simuladorAbierto && (
          <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
              <div className={`w-full max-w-sm h-full flex flex-col shadow-2xl ${darkMode ? 'bg-[#141f0b] border-l border-[#C9EA63]/20' : 'bg-slate-100 border-l border-slate-300'}`}>
                  <div className={`p-4 flex justify-between items-center shadow-sm z-10 ${darkMode ? 'bg-[#253916]' : 'bg-white'}`}>
                      <div className="flex items-center gap-2">
                          <Bot className={darkMode ? 'text-[#C9EA63]' : 'text-indigo-600'} />
                          <h3 className={`font-bold ${textTitle}`}>Simulador Bot</h3>
                      </div>
                      <button onClick={() => setSimuladorAbierto(false)} className={`p-2 rounded-lg ${darkMode ? 'text-rose-400 hover:bg-rose-900/30' : 'text-slate-500 hover:bg-slate-100'}`}>
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 back-whatsapp-pattern">
                      {mensajesDemo.map((m, i) => (
                          <div key={i} className={`flex ${m.tipo === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                                  m.tipo === 'user' 
                                  ? (darkMode ? 'bg-indigo-900 text-[#F2F6F0] rounded-tr-none' : 'bg-[#d9fdd3] text-slate-800 rounded-tr-none') 
                                  : (darkMode ? 'bg-[#253916] text-[#F2F6F0] rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none')
                              }`}>
                                  {m.text}
                              </div>
                          </div>
                      ))}
                  </div>

                  <form onSubmit={enviarMensajeDemo} className={`p-3 flex gap-2 ${darkMode ? 'bg-[#1b2b10]' : 'bg-[#f0f2f5]'}`}>
                      <input 
                          type="text" 
                          placeholder="Escribe un mensaje de prueba..." 
                          className={`flex-1 px-4 py-2 rounded-full outline-none text-sm ${darkMode ? 'bg-[#253916] text-[#F2F6F0] border border-[#C9EA63]/30' : 'bg-white border-transparent'}`}
                          value={inputDemo}
                          onChange={e => setInputDemo(e.target.value)}
                      />
                      <button type="submit" className={`p-2 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-[#C9EA63] text-[#141f0b]' : 'bg-[#00a884] text-white'}`}>
                          <Smartphone size={18} />
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL NUEVA REGLA */}
      {modalEdicion && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className={`w-full max-w-lg p-6 rounded-2xl shadow-xl ${darkMode ? 'bg-[#1b2b10] border border-[#C9EA63]/20' : 'bg-white border'}`}>
                    <h3 className={`text-xl font-bold flex items-center gap-2 mb-6 ${textTitle}`}>
                        <Edit2 size={20} className={darkMode ? "text-[#C9EA63]" : "text-indigo-600"}/> 
                        {reglaActual.id ? 'Editar Regla' : 'Nueva Regla de Auto-Respuesta'}
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase tracking-wide ${darkMode ? 'text-[#C9EA63]' : 'text-slate-500'}`}>Palabras Clave (Separar por |)</label>
                            <input 
                                type="text" 
                                className={`w-full p-3 rounded-xl border text-sm font-medium ${inputBg}`}
                                placeholder="Ej: horario|abierto|hora|cierran"
                                value={reglaActual.trigger}
                                onChange={e => setReglaActual({...reglaActual, trigger: e.target.value})}
                            />
                            <p className="text-[10px] mt-1 opacity-70">Si el cliente menciona CUALQUIERA de estas palabras, el bot se activará.</p>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1 uppercase tracking-wide ${darkMode ? 'text-emerald-400' : 'text-slate-500'}`}>Respuesta Exacta del Bot</label>
                            <textarea 
                                rows={4}
                                className={`w-full p-3 rounded-xl border text-sm resize-none ${darkMode ? 'bg-[#141f0b] border-emerald-500/30 text-[#F2F6F0]' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                placeholder="Ej: Nuestro horario es de Lunes a Viernes de 8am a 6pm."
                                value={reglaActual.respuesta}
                                onChange={e => setReglaActual({...reglaActual, respuesta: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setModalEdicion(false)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'text-rose-400 hover:bg-rose-900/30' : 'text-slate-600 hover:bg-slate-100'}`}>
                            Cancelar
                        </button>
                        <button onClick={guardarRegla} className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2 ${darkMode ? 'bg-[#C9EA63] text-[#141f0b]' : 'bg-indigo-600 text-white'}`}>
                            <Save size={16}/> Guardar Regla
                        </button>
                    </div>
                </div>
           </div>
      )}
    </div>
  );
};

export default FlujosWhatsapp;
