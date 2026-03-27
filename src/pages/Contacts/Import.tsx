import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ImportContacts() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Por favor sube un archivo CSV o Excel válido.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    // CompanyId dummy por defecto en este MVP (Reemplazar con sesión real luego)
    formData.append('companyId', '00000000-0000-0000-0000-000000000001');

    try {
      const response = await fetch('/api/v1/contacts/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error en la subida');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-brand-500" />
          Importar Contactos Masivos
        </h1>
        <p className="text-text-muted mt-2">
          Sube tu base de datos en formato CSV para poblar tu CRM. Asegúrate de incluir las columnas Obligatorias: teléfono.
        </p>
      </div>

      {!result ? (
        <div className="glass-panel p-8 rounded-2xl border border-border-subtle">
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
              ${file ? 'border-brand-500 bg-brand-500/5' : 'border-border-subtle hover:border-brand-400/50 hover:bg-card/80'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileChange}
            />
            
            {!file ? (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-16 h-16 text-text-muted mb-4" />
                <h3 className="text-lg font-medium text-text-main">Arrastra aquí tu archivo CSV</h3>
                <p className="text-sm text-text-muted mt-2">o haz clic para explorar en tu computadora</p>
                <p className="text-xs text-brand-500/80 mt-4">(Max. 10MB)</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="w-16 h-16 text-brand-500 mb-4" />
                <h3 className="text-lg font-medium text-text-main">{file.name}</h3>
                <p className="text-sm text-text-muted mt-2">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); resetForm(); }}
                    className="px-4 py-2 text-sm text-text-muted hover:text-text-main"
                  >
                    Cambiar archivo
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    disabled={loading}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    Procesar Base
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-500">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-2xl border border-border-subtle">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-main">Procesamiento Completado</h2>
            <p className="text-text-muted">Se ha finalizado la carga de tu archivo {file?.name}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-root border border-border-subtle text-center">
              <p className="text-sm text-text-muted mb-1">Filas Procesadas</p>
              <p className="text-2xl font-bold text-text-main">{result.totalProcessed}</p>
            </div>
            <div className="p-4 rounded-xl bg-root border border-emerald-500/20 text-center">
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-1">Exitosos (Creados/Act)</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.successCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-root border border-rose-500/20 text-center">
              <p className="text-sm text-rose-500 mb-1">Fallidos (Ignorados)</p>
              <p className="text-2xl font-bold text-rose-400">{result.errorCount}</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-text-muted mb-3 px-2">Log de Errores:</h3>
              <div className="bg-root rounded-xl border border-border-subtle p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2 text-sm text-text-muted font-mono">
                  {result.errors.map((err: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-rose-400/80"><span>[{idx + 1}]</span> {err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button 
              onClick={resetForm}
              className="bg-[#272a30] hover:bg-[#343841] text-text-main px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cargar otra base
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
