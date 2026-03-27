import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Registro from './components/Registro';
import ListaEquipos from './components/ListaEquipos';
import Clientes from './components/Clientes';
import CatalogoInstrumentos from './components/CatalogoInstrumentos';
import Marcas from './components/Marcas';
import Modelos from './components/Modelos';
import FlujosWhatsapp from './components/FlujosWhatsapp';
import Conversaciones from './components/Conversaciones';
import PosiblesClientes from './components/PosiblesClientes';
import WhatsappQR from './components/WhatsappQR';
import TableroKanban from './components/TableroKanban';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Reescritura global de window.alert para usar Notificaciones Modernas Toast
window.alert = (msg) => {
  if (!msg) return;
  const lowerMsg = msg.toLowerCase();
  if (lowerMsg.includes('error')) {
     toast.error(msg, { theme: 'colored' });
  } else if (msg.includes('✅') || lowerMsg.includes('éxito') || lowerMsg.includes('correctamente') || lowerMsg.includes('exitosamente')) {
     toast.success(msg.replace('✅ ', ''), { theme: 'colored' });
  } else {
     toast.info(msg, { theme: 'colored' });
  }
};

import { 
  LayoutDashboard, FileText, List, Moon, Sun, Menu, X, 
  Users, BookOpen, Tag, Package, MessageSquare, 
  Bot, ScanLine, Target
} from 'lucide-react';

const Sidebar = ({ darkMode, setDarkMode, mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Registro Ágil', path: '/registro', icon: FileText },
    { name: 'Lista Instrumentos', path: '/equipos', icon: List },
    { name: 'Pipeline Kanban', path: '/kanban', icon: Package },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Catálogo Inst.', path: '/catalogo-instrumentos', icon: BookOpen },
    { name: 'Catálogo Marcas', path: '/marcas', icon: Tag },
    { name: 'Catálogo Modelos', path: '/modelos', icon: Package },
    { name: 'Flujos WhatsApp', path: '/flujos-whatsapp', icon: Bot },
    { name: 'Conversaciones', path: '/conversaciones', icon: MessageSquare },
    { name: 'Posibles Clientes', path: '/leads', icon: Target },
    { name: 'Vincular WhatsApp', path: '/whatsapp-qr', icon: ScanLine }
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full custom-scrollbar relative">
      <div className="p-6 sticky top-0 z-10 bg-inherit">
        <h2 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-[#C9EA63]' : 'text-[#65D067]'}`}>
          SICAMET <span className={darkMode ? 'text-[#F2F6F0]' : 'text-[#253916]'}>CRM</span>
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm ${
                isActive 
                  ? (darkMode ? 'bg-[#C9EA63] text-[#141f0b] shadow-md font-bold' : 'bg-[#65D067] text-white shadow-md font-bold')
                  : (darkMode ? 'text-[#F2F6F0]/70 hover:bg-[#253916] hover:text-[#C9EA63]' : 'text-[#253916]/70 hover:bg-[#C9EA63]/30 hover:text-[#253916]')
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto sticky bottom-0 border-t border-inherit" style={{ backgroundColor: darkMode ? '#141f0b' : '#F2F6F0' }}>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl shadow-sm transition-all text-sm font-bold ${
            darkMode ? 'bg-[#253916] text-[#C9EA63] hover:bg-[#314a1c]' : 'bg-white text-[#253916] hover:bg-gray-50'
          }`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#253916' : '#E2E8F0'}; border-radius: 10px; }
      `}</style>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto shadow-xl lg:shadow-none ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-[#141f0b] border-r border-[#C9EA63]/10' : 'bg-[#F2F6F0] border-r border-[#253916]/5'}`}>
        <NavContent />
      </aside>
    </>
  );
};

const Layout = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // bg-[#141f0b] es un verde ultra oscuro (casi negro) para descansar la vista
  return (
    <Router>
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#141f0b] text-[#F2F6F0]' : 'bg-slate-50 text-[#253916]'}`}>
        
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className={`lg:hidden flex items-center justify-between p-4 shadow-sm z-30 ${darkMode ? 'bg-[#141f0b] border-b border-[#C9EA63]/10' : 'bg-[#F2F6F0] border-b border-[#253916]/5'}`}>
             <h2 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-[#C9EA63]' : 'text-[#65D067]'}`}>SICAMET</h2>
             <button onClick={() => setMobileOpen(true)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#253916] text-[#C9EA63]' : 'bg-white text-[#253916] shadow-sm'}`}>
               <Menu size={24} />
             </button>
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard darkMode={darkMode} />} />
              <Route path="/registro" element={<Registro darkMode={darkMode} />} />
              <Route path="/equipos" element={<ListaEquipos darkMode={darkMode} />} />
              <Route path="/kanban" element={<TableroKanban darkMode={darkMode} />} />
              
              <Route path="/clientes" element={<Clientes darkMode={darkMode} />} />
              <Route path="/catalogo-instrumentos" element={<CatalogoInstrumentos darkMode={darkMode} />} />
              <Route path="/marcas" element={<Marcas darkMode={darkMode} />} />
              <Route path="/modelos" element={<Modelos darkMode={darkMode} />} />
              <Route path="/flujos-whatsapp" element={<FlujosWhatsapp darkMode={darkMode} />} />
              <Route path="/conversaciones" element={<Conversaciones darkMode={darkMode} />} />
              <Route path="/leads" element={<PosiblesClientes darkMode={darkMode} />} />
              <Route path="/whatsapp-qr" element={<WhatsappQR darkMode={darkMode} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default Layout;