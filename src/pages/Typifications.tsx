import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface Typification {
  id: string;
  name: string;
  colorHex: string;
  requiresFollowup: boolean;
}

export default function Typifications() {
  const [typifications, setTypifications] = useState<Typification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Typification>>({
    name: '',
    colorHex: '#10b981',
    requiresFollowup: false
  });

  useEffect(() => {
    fetchTypifications();
  }, []);

  const fetchTypifications = async () => {
    try {
      const resp = await fetch('/api/v1/typifications?companyId=00000000-0000-0000-0000-000000000001');
      if (resp.ok) {
        setTypifications(await resp.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        await fetch(`/api/v1/typifications/${isEditing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/v1/typifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, companyId: '00000000-0000-0000-0000-000000000001' })
        });
      }
      setFormData({ name: '', colorHex: '#10b981', requiresFollowup: false });
      setIsEditing(null);
      fetchTypifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tipificación?')) {
      await fetch(`/api/v1/typifications/${id}`, { method: 'DELETE' });
      fetchTypifications();
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-500" />
            Tipificaciones
          </h1>
          <p className="text-text-muted mt-1">
            Administra los estados y categorías para tus contactos y conversaciones.
          </p>
        </div>
        <button 
          onClick={() => { setIsEditing(''); setFormData({ name: '', colorHex: '#10b981', requiresFollowup: false }); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Tipificación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulario (Crear / Editar) */}
        <div className="md:col-span-1 glass-panel p-6 rounded-xl border border-border-subtle h-fit sticky top-6">
          <h3 className="text-lg font-medium text-text-main mb-4">
            {isEditing ? 'Editar Tipificación' : 'Nueva Tipificación'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Nombre</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-root border border-border-subtle rounded-lg px-3 py-2 text-text-main outline-none focus:border-brand-500"
                placeholder="Ej. Promesa de Pago"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Color (Hex)</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={formData.colorHex}
                  onChange={e => setFormData({...formData, colorHex: e.target.value})}
                  className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
                />
                <input 
                  type="text" 
                  value={formData.colorHex}
                  onChange={e => setFormData({...formData, colorHex: e.target.value})}
                  className="flex-1 bg-root border border-border-subtle rounded-lg px-3 py-2 text-text-main outline-none focus:border-brand-500 font-mono text-sm uppercase"
                  placeholder="#10B981"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="followup"
                checked={formData.requiresFollowup}
                onChange={e => setFormData({...formData, requiresFollowup: e.target.checked})}
                className="w-4 h-4 rounded border-gray-600 bg-root text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="followup" className="text-sm text-text-muted cursor-pointer">
                Requiere Seguimiento Obligatorio
              </label>
            </div>
          </div>
          <div className="mt-6">
            <button 
              onClick={handleSave}
              disabled={!formData.name}
              className="w-full flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-700 disabled:text-text-muted text-text-main px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" /> Guardar
            </button>
            {isEditing && (
              <button 
                onClick={() => { setIsEditing(null); setFormData({name: '', colorHex: '#10b981', requiresFollowup: false}); }}
                className="w-full mt-2 flex justify-center items-center gap-2 bg-transparent text-text-muted hover:text-text-main px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="md:col-span-2 glass-panel rounded-xl border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-muted">
              <thead className="bg-card border-b border-border-subtle text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-6 py-4 font-semibold">Tipificación</th>
                  <th className="px-6 py-4 font-semibold">Seguimiento</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">Cargando...</td></tr>
                ) : typifications.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">No hay tipificaciones. Crea la primera.</td></tr>
                ) : (
                  typifications.map((t) => (
                    <tr key={t.id} className="hover:bg-card/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colorHex }}></div>
                          <span className="font-medium text-text-main">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.requiresFollowup ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                            Requerido
                          </span>
                        ) : (
                          <span className="text-text-muted">Opcional</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setIsEditing(t.id); setFormData(t); }}
                            className="p-1.5 text-text-muted hover:text-text-main hover:bg-[#272a30] rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
