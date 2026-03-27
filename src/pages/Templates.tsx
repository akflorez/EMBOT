import { useState } from 'react';
import { WA_API_URL } from '../config';
import { Card } from '../components/ui/Card';
import { Plus, Search, FileText, Edit2, Trash2, Save, X, Layers, MessageSquare, Tag, Sparkles, Link as LinkIcon, ExternalLink, Bot } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  category: 'Soporte' | 'Ventas' | 'Cobranza' | 'Citas';
  content: string;
  agentNumber?: string;
};

const DEFAULT_TEMPLATES: Template[] = [
  { 
    id: '1', 
    name: 'Bienvenida Soporte', 
    category: 'Soporte', 
    content: 'Hola, bienvenido al soporte técnico de Emdecob. ¿En qué podemos ayudarte hoy?' 
  },
  { 
    id: '2', 
    name: 'Cierre de Venta', 
    category: 'Ventas', 
    content: '¡Excelente decisión! Procederemos con el registro de tu solicitud. ¿Tienes alguna duda adicional?' 
  },
  { 
    id: '3', 
    name: 'Recordatorio Cobranza', 
    category: 'Cobranza', 
    content: 'Estimado cliente, le recordamos que tiene una cuota pendiente. Puede realizar su pago en los canales autorizados.' 
  },
  { 
    id: '4', 
    name: 'Confirmación Cita', 
    category: 'Citas', 
    content: 'Tu cita ha sido agendada con éxito para la fecha pactada. ¡Te esperamos!' 
  },
];

const categoryColors: Record<string, string> = {
  Soporte: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Ventas: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Cobranza: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
  Citas: 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20',
};

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Template>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [autoResponse, setAutoResponse] = useState({ enabled: false, templateId: '' });
  const [menuConfig, setMenuConfig] = useState<{ enabled: boolean; options: Record<string, { templateId: string; agentNumber: string }> }>({ 
    enabled: false, 
    options: { 
      "1": { templateId: "", agentNumber: "" }, 
      "2": { templateId: "", agentNumber: "" }, 
      "3": { templateId: "", agentNumber: "" }, 
      "4": { templateId: "", agentNumber: "" } 
    } 
  });
  const [keywordConfig, setKeywordConfig] = useState<{ enabled: boolean; mappings: { keyword: string; templateId: string; agentNumber: string }[] }>({
    enabled: true,
    mappings: []
  });

  useEffect(() => {
    const saved = localStorage.getItem('message_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('message_templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
    
    const savedAuto = localStorage.getItem('global_auto_response');
    if (savedAuto) {
      setAutoResponse(JSON.parse(savedAuto));
    }

    const savedMenu = localStorage.getItem('chatbot_menu_config');
    if (savedMenu) {
      setMenuConfig(JSON.parse(savedMenu));
    }

    const savedKeywords = localStorage.getItem('chatbot_keyword_config');
    if (savedKeywords) {
      setKeywordConfig(JSON.parse(savedKeywords));
    }
  }, []);

  // Sync effect
  useEffect(() => {
    if (templates.length > 0) {
      syncAutoResponse(autoResponse);
      syncMenuWithBackend(menuConfig);
      syncKeywordsWithBackend(keywordConfig);
    }
  }, [templates, autoResponse, menuConfig, keywordConfig]);

  const syncMenuWithBackend = async (config: any) => {
    const fullOptions: any = {};
    Object.keys(config.options).forEach(key => {
      const opt = config.options[key];
      const template = templates.find(t => t.id === opt.templateId);
      if (template) {
        fullOptions[key] = { name: template.name, content: template.content, agentNumber: opt.agentNumber };
      }
    });

    try {
      await fetch(WA_API_URL + '/config/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: config.enabled, options: fullOptions })
      });
    } catch (e) {
      console.error('Error syncing menu');
    }
  };

  const syncKeywordsWithBackend = async (config: any) => {
    const fullMappings = config.mappings.map((m: any) => {
      const template = templates.find(t => t.id === m.templateId);
      return {
        keyword: m.keyword,
        templateId: m.templateId,
        content: template ? template.content : '',
        agentNumber: m.agentNumber
      };
    }).filter((m: any) => m.keyword && m.content);

    try {
      await fetch(WA_API_URL + '/config/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: config.enabled, mappings: fullMappings })
      });
    } catch (e) {
      console.error('Error syncing keywords');
    }
  };

  const syncAutoResponse = async (config: any) => {
    const template = templates.find(t => t.id === config.templateId);
    try {
      await fetch(WA_API_URL + '/config/auto-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          templateId: config.templateId,
          content: template ? template.content : '',
          agentNumber: template ? template.agentNumber : ''
        })
      });
    } catch (e) {
      console.error('Error syncing auto-response');
    }
  };

  const updateMenuConfig = (newConfig: any) => {
    setMenuConfig(newConfig);
    localStorage.setItem('chatbot_menu_config', JSON.stringify(newConfig));
  };

  const updateKeywordConfig = (newConfig: any) => {
    setKeywordConfig(newConfig);
    localStorage.setItem('chatbot_keyword_config', JSON.stringify(newConfig));
  };

  const updateAutoResponse = (newConfig: any) => {
    setAutoResponse(newConfig);
    localStorage.setItem('global_auto_response', JSON.stringify(newConfig));
  };

  const saveToStats = (data: Template[]) => {
    setTemplates(data);
    localStorage.setItem('message_templates', JSON.stringify(data));
  };

  const handleCreate = () => {
    if (!editForm.name || !editForm.content || !editForm.category) {
      alert('Por favor, completa el nombre, categoría y contenido de la plantilla.');
      return;
    }
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: editForm.name,
      category: editForm.category as any,
      content: editForm.content,
      agentNumber: editForm.agentNumber || '',
    };
    saveToStats([newTemplate, ...templates]);
    setShowAdd(false);
    setEditForm({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = () => {
    if (!isEditing || !editForm.name || !editForm.content) {
      alert('El nombre y el contenido no pueden estar vacíos.');
      return;
    }
    const updated = templates.map(t => t.id === isEditing ? { ...t, ...editForm } : t);
    saveToStats(updated as Template[]);
    setIsEditing(null);
    setEditForm({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      saveToStats(templates.filter(t => t.id !== id));
    }
  };

  const startEdit = (t: Template) => {
    setIsEditing(t.id);
    setEditForm(t);
  };

  const filtered = templates.filter(t => {
    const matchCat = filterCategory === 'Todas' || t.category === filterCategory;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                       t.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">Gestión de Plantillas</h1>
          <p className="text-text-muted text-sm">Crea y modifica respuestas rápidas para todos tus procesos.</p>
        </div>
        <button 
          onClick={() => { setShowAdd(true); setIsEditing(null); setEditForm({ category: 'Soporte' }); }}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" /> Nueva Plantilla
        </button>
      </div>

      <Card className="p-6 border-brand-500/20 bg-brand-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-text-main font-semibold">Auto-Respuesta Global</h3>
              <p className="text-xs text-text-muted">Si alguien te escribe por primera vez, el sistema responderá automáticamente con la plantilla elegida.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border-subtle">
              <span className="text-xs text-text-muted ml-2">Seleccionar Plantilla:</span>
              <select 
                className="bg-surface text-sm text-text-main outline-none px-3 py-1 rounded-lg border border-border-subtle min-w-[200px]"
                value={autoResponse.templateId}
                onChange={(e) => updateAutoResponse({ ...autoResponse, templateId: e.target.value })}
              >
                <option value="" disabled className="bg-card text-text-main">Selecciona una plantilla...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="bg-card text-text-main">{t.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => updateAutoResponse({ ...autoResponse, enabled: !autoResponse.enabled })}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all border ${
                autoResponse.enabled 
                  ? 'bg-brand-600 border-brand-500 text-text-main shadow-lg shadow-brand-500/20' 
                  : 'bg-surface border-border-subtle text-text-muted hover:text-text-main'
              }`}
            >
              {autoResponse.enabled ? 'Activado' : 'Desactivado'}
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-brand-500/20 bg-brand-500/5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-text-main font-semibold">Menú Interactivo (Chatbot)</h3>
                <p className="text-xs text-text-muted">Envía un menú de opciones después del saludo y responde automáticamente a números.</p>
              </div>
            </div>
            <button
              onClick={() => updateMenuConfig({ ...menuConfig, enabled: !menuConfig.enabled })}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all border ${
                menuConfig.enabled 
                  ? 'bg-brand-600 border-brand-500 text-text-main shadow-lg shadow-brand-500/20' 
                  : 'bg-surface border-border-subtle text-text-muted hover:text-text-main'
              }`}
            >
              {menuConfig.enabled ? 'Bot Activado' : 'Bot Desactivado'}
            </button>
          </div>

          {menuConfig.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              {[ "1", "2", "3", "4" ].map(num => (
                <div key={num} className="bg-surface/50 p-4 rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] text-text-muted font-bold uppercase tracking-widest">Opción {num}</label>
                  </div>
                  
                  <div>
                    <select 
                      className="w-full bg-surface border border-border-subtle rounded-lg py-1.5 px-3 text-xs text-text-main outline-none focus:border-brand-500"
                      value={menuConfig.options[num]?.templateId || ''}
                      onChange={(e) => {
                        const newOpts = { ...menuConfig.options, [num]: { ...menuConfig.options[num], templateId: e.target.value } };
                        updateMenuConfig({ ...menuConfig, options: newOpts });
                      }}
                    >
                      <option value="" disabled className="bg-card text-text-main">Asignar plantilla...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id} className="bg-card text-text-main">{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] text-text-muted mb-1 font-bold uppercase tracking-widest pl-1">WhatsApp de Asesores (Separa con ,)</label>
                    <input 
                      type="text"
                      className="w-full bg-card border border-border-subtle rounded-lg py-1 px-3 text-[10px] text-text-main focus:border-brand-500 outline-none"
                      placeholder="Ej: 57300123, 57310456"
                      value={menuConfig.options[num]?.agentNumber || ''}
                      onChange={(e) => {
                        const newOpts = { ...menuConfig.options, [num]: { ...menuConfig.options[num], agentNumber: e.target.value } };
                        updateMenuConfig({ ...menuConfig, options: newOpts });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border-brand-500/20 bg-brand-500/5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-text-main font-semibold">Vínculos de Instagram / Palabras Clave</h3>
                  <span className="bg-brand-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase">Nuevo</span>
                </div>
                <p className="text-xs text-text-muted">Responde automáticamente cuando el mensaje contiene una palabra clave (ej. de anuncios de Instagram).</p>
              </div>
            </div>
            <button
              onClick={() => updateKeywordConfig({ ...keywordConfig, enabled: !keywordConfig.enabled })}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all border ${
                keywordConfig.enabled 
                  ? 'bg-brand-600 border-brand-500 text-text-main shadow-lg shadow-brand-500/20' 
                  : 'bg-surface border-border-subtle text-text-muted hover:text-text-main'
              }`}
            >
              {keywordConfig.enabled ? 'Vínculos Activos' : 'Vínculos Desactivados'}
            </button>
          </div>

          {keywordConfig.enabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keywordConfig.mappings.map((mapping, index) => (
                  <div key={index} className="bg-surface/50 p-4 rounded-xl border border-border-subtle relative group">
                    <button 
                      onClick={() => {
                        const newMappings = [...keywordConfig.mappings];
                        newMappings.splice(index, 1);
                        updateKeywordConfig({ ...keywordConfig, mappings: newMappings });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-text-muted mb-1 font-bold uppercase tracking-widest">Palabra Clave</label>
                        <input 
                          type="text"
                          className="w-full bg-card border border-border-subtle rounded-lg py-1.5 px-3 text-xs text-text-main focus:border-brand-500 outline-none"
                          placeholder="Ej: PROMO_IG"
                          value={mapping.keyword}
                          onChange={(e) => {
                            const newMappings = [...keywordConfig.mappings];
                            newMappings[index].keyword = e.target.value;
                            updateKeywordConfig({ ...keywordConfig, mappings: newMappings });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted mb-1 font-bold uppercase tracking-widest">Plantilla a enviar</label>
                        <select 
                          className="w-full bg-card border border-border-subtle rounded-lg py-1.5 px-3 text-xs text-text-main focus:border-brand-500 outline-none"
                          value={mapping.templateId}
                          onChange={(e) => {
                            const newMappings = [...keywordConfig.mappings];
                            newMappings[index].templateId = e.target.value;
                            updateKeywordConfig({ ...keywordConfig, mappings: newMappings });
                          }}
                        >
                          <option value="" disabled className="bg-card text-text-main">Seleccionar...</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id} className="bg-card text-text-main">{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted mb-1 font-bold uppercase tracking-widest">WhatsApp de Asesores (Separa con ,)</label>
                        <input 
                          type="text"
                          className="w-full bg-card border border-border-subtle rounded-lg py-1.5 px-3 text-xs text-text-main focus:border-brand-500 outline-none"
                          placeholder="Ej: 57300123, 57310456"
                          value={mapping.agentNumber || ''}
                          onChange={(e) => {
                            const newMappings = [...keywordConfig.mappings];
                            newMappings[index].agentNumber = e.target.value;
                            updateKeywordConfig({ ...keywordConfig, mappings: newMappings });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    const newMappings = [...keywordConfig.mappings, { keyword: '', templateId: '', agentNumber: '' }];
                    updateKeywordConfig({ ...keywordConfig, mappings: newMappings });
                  }}
                  className="border-2 border-dashed border-dark-border rounded-xl p-4 flex flex-col items-center justify-center text-text-muted hover:border-brand-500/50 hover:text-brand-500 transition-all min-h-[120px]"
                >
                  <Plus className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium">Nuevo Vínculo</span>
                </button>
              </div>
              
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5" />
                <div className="text-xs text-text-muted leading-relaxed">
                  <p className="font-semibold text-text-main mb-1">¿Cómo usar con Instagram?</p>
                  En tu anuncio de Facebook/Instagram, configura el <b>Mensaje de Bienvenida</b> para que incluya la palabra clave definida arriba. Cuando el usuario haga clic en tu anuncio y envíe el mensaje, el bot responderá instantáneamente con la plantilla elegida.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border border-border-subtle shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o contenido..."
            className="w-full bg-card border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-text-main placeholder-gray-500 outline-none focus:border-brand-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {['Todas', 'Soporte', 'Ventas', 'Cobranza', 'Citas'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                filterCategory === cat 
                  ? 'bg-brand-600 border-brand-500 text-text-main' 
                  : 'bg-surface border-border-subtle text-text-muted hover:border-brand-500/50 hover:text-text-main'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {(showAdd || isEditing) && (
        <Card className="p-6 border-brand-500/30 bg-brand-500/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-main flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {showAdd ? 'Nueva Plantilla' : 'Editar Plantilla'}
            </h3>
            <button onClick={() => { setShowAdd(false); setIsEditing(null); }} className="text-text-muted hover:text-text-main transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 ml-1">Nombre de la Plantilla</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    className="w-full bg-card border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                    placeholder="Ej: Bienvenida Clientes"
                    value={editForm.name || ''}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 ml-1">Categoría</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <select
                    className="w-full bg-card border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:border-brand-500 outline-none appearance-none transition-all"
                    value={editForm.category || 'Soporte'}
                    onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                  >
                    <option value="Soporte" className="bg-card text-text-main">Soporte</option>
                    <option value="Ventas" className="bg-card text-text-main">Ventas</option>
                    <option value="Cobranza" className="bg-card text-text-main">Cobranza</option>
                    <option value="Citas" className="bg-card text-text-main">Citas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 ml-1">WhatsApp de Asesores (Separa con ,)</label>
                <div className="relative">
                  <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    className="w-full bg-card border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                    placeholder="Ej: 57300123, 57310456"
                    value={editForm.agentNumber || ''}
                    onChange={e => setEditForm({...editForm, agentNumber: e.target.value})}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1 px-1 italic">Puedes ingresar varios números separados por coma.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 ml-1">Contenido del Mensaje</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                <textarea
                  rows={4}
                  className="w-full bg-card border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-text-main focus:border-brand-500 outline-none transition-all resize-none"
                  placeholder="Escribe el mensaje aquí..."
                  value={editForm.content || ''}
                  onChange={e => setEditForm({...editForm, content: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-border">
            <button
              onClick={() => { setShowAdd(false); setIsEditing(null); }}
              className="px-6 py-2.5 rounded-xl border border-dark-border text-text-muted hover:text-text-main hover:bg-hover/30 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={showAdd ? handleCreate : handleUpdate}
              className="px-8 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2 transition-all text-sm font-medium shadow-lg shadow-brand-500/20"
            >
              <Save className="w-4 h-4" /> {showAdd ? 'Guardar Plantilla' : 'Actualizar Cambios'}
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(template => (
          <Card key={template.id} className="p-5 hover:border-brand-500/40 transition-all duration-300 group flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-card border border-border-subtle flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-text-main group-hover:border-brand-500 transition-all duration-300`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-text-main font-medium text-sm group-hover:text-brand-600 dark:text-brand-400 transition-colors">{template.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${categoryColors[template.category]}`}>
                    {template.category.toUpperCase()}
                  </span>
                  {template.agentNumber && (
                    <span className="text-[10px] bg-surface text-text-muted px-2 py-0.5 rounded-full border border-border-subtle mt-1 ml-1 inline-block">
                      👤 {template.agentNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => startEdit(template)}
                  className="p-1.5 text-text-muted hover:text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-1.5 text-text-muted hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-surface/50 rounded-xl p-4 text-sm text-text-muted italic line-clamp-4 relative backdrop-blur-sm border border-border-subtle/30">
              "{template.content}"
            </div>
          </Card>
        ))}
        
        {filtered.length === 0 && !showAdd && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-600 bg-card/20 rounded-3xl border-2 border-dashed border-border-subtle">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-lg font-medium text-text-muted">No se encontraron plantillas</p>
            <p className="text-sm mt-1">Intenta con otros términos o crea una nueva.</p>
          </div>
        )}
      </div>
    </div>
  );
}
