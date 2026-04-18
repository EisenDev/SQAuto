import Skeleton from './Skeleton';

interface TableViewProps {
  profile?: Record<string, any>; // Flexible for both metadata/live_chunks and final profile
  loading?: boolean;
}

export default function TableView({ profile, loading }: TableViewProps) {
  // Handle both the final profile and the live heartbeat profile
  const liveChunks = (profile as any)?.live_chunks || [];
  const finalTables = !liveChunks.length && profile ? Object.keys(profile) : [];
  
  const hasData = liveChunks.length > 0 || finalTables.length > 0;

  return (
    <div className="border border-teal-100 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Extracted Tables & Chunks</h2>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
          {loading ? "Analyzing Pipeline..." : hasData ? "Industrial Discovery Active" : "Waiting for Data..."}
        </span>
      </div>
      
      {loading && !hasData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="p-4 border border-gray-100 rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ))}
        </div>
      ) : liveChunks.length > 0 ? (
        <div className="space-y-6">
          <p className="text-[10px] uppercase font-bold text-teal-600 tracking-widest flex items-center">
            <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 animate-pulse" />
            Live Data Extraction (Peeking in progress)
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {liveChunks.map((chunk: any) => (
              <div key={chunk.table} className="border border-teal-50 rounded-lg overflow-hidden flex flex-col shadow-sm">
                <div className="bg-teal-50/50 px-3 py-2 border-b border-teal-50 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-teal-800">{chunk.table}</span>
                  <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded uppercase">{chunk.rows.length} Rows</span>
                </div>
                <div className="p-2 overflow-x-auto bg-white">
                   <table className="min-w-full text-[10px] text-gray-600">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {chunk.rows[0] && Object.keys(chunk.rows[0]).slice(0, 4).map((k: string) => (
                            <th key={k} className="text-left py-1 font-semibold pr-2">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.rows.slice(0, 3).map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-teal-50/10">
                            {Object.values(row).slice(0, 4).map((v: any, vIdx: number) => (
                              <td key={vIdx} className="py-1 pr-2 truncate max-w-[120px]">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : finalTables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {finalTables.map((tableName) => (
            <div 
              key={tableName} 
              className="p-4 border border-gray-100 rounded-lg hover:border-teal-300 hover:bg-teal-50/20 transition-all cursor-default group"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full group-hover:scale-125 transition-transform" />
                <h3 className="font-mono text-sm font-bold text-gray-700 truncate">
                  {tableName}
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                {profile?.[tableName]?.length || 0} Columns
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No tables loaded yet. Upload a SQL dump to begin profiling.</p>
        </div>
      )}
    </div>
  );
}
