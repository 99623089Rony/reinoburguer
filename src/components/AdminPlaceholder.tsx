
import React from 'react';

export const AdminPlaceholder: React.FC<{ title: string, icon: React.ReactNode }> = ({ title, icon }) => (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-slate-500 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800 shadow-xl shadow-black/50">
            {React.cloneElement(icon as React.ReactElement, { size: 48, className: "text-blue-500" })}
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-200">{title}</h3>
            <p className="text-sm max-w-[250px]">Esta funcionalidade está sendo preparada para você.</p>
        </div>
    </div>
);
