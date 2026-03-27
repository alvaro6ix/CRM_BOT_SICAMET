import React from 'react';
import { Hammer } from 'lucide-react';

const Placeholder = ({ title, darkMode }) => {
  return (
    <div className={`w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8 rounded-2xl shadow-sm border border-dashed ${darkMode ? 'bg-[#253916] border-[#C9EA63]/20' : 'bg-white border-[#253916]/20'}`}>
      <div className={`p-6 rounded-full mb-6 ${darkMode ? 'bg-[#141f0b]' : 'bg-[#F2F6F0]'}`}>
        <Hammer size={48} className={`animate-pulse ${darkMode ? 'text-[#C9EA63]' : 'text-[#65D067]'}`} />
      </div>
      <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-[#F2F6F0]' : 'text-[#253916]'}`}>
        Módulo: {title}
      </h2>
      <p className={`text-lg text-center max-w-lg ${darkMode ? 'text-[#F2F6F0]/70' : 'text-[#253916]/70'}`}>
        Este módulo está actualmente en desarrollo. Pronto podrás gestionar toda la información de <span className="font-bold">{title.toLowerCase()}</span> desde esta pantalla, siguiendo el flujo automatizado del CRM.
      </p>
    </div>
  );
};

export default Placeholder;
