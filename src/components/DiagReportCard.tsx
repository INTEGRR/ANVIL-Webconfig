import { AlertCircle, CheckCircle, Info, Wrench } from 'lucide-react';
import { DiagnosticStats, DiagnosticRecommendation } from '../utils/diagHeuristics';

interface DiagReportCardProps {
  stats: DiagnosticStats;
  recommendations: DiagnosticRecommendation[];
  onApplyFix: (recommendation: DiagnosticRecommendation) => void;
}

export default function DiagReportCard({
  stats,
  recommendations,
  onApplyFix
}: DiagReportCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const totalChatter = stats.chatterCount.reduce((sum, count) => sum + count, 0);
  const totalActuations = stats.actuationCount.reduce((sum, count) => sum + count, 0);
  const overallChatterRate = totalActuations > 0 ? (totalChatter / totalActuations) * 100 : 0;

  const getHealthColor = () => {
    if (recommendations.some(r => r.severity === 'error')) return 'text-red-500';
    if (recommendations.some(r => r.severity === 'warning')) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getHealthStatus = () => {
    if (recommendations.some(r => r.severity === 'error')) return 'Critical Issues Detected';
    if (recommendations.some(r => r.severity === 'warning')) return 'Minor Issues Detected';
    return 'All Systems Normal';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Diagnostic Report</h2>
        <div className={`flex items-center gap-2 ${getHealthColor()}`}>
          <CheckCircle className="w-6 h-6" />
          <span className="font-semibold">{getHealthStatus()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-gray-400 text-sm">Total Actuations</div>
          <div className="text-2xl font-bold text-white">{totalActuations}</div>
        </div>
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-gray-400 text-sm">Chatter Rate</div>
          <div className={`text-2xl font-bold ${overallChatterRate > 1 ? 'text-red-500' : overallChatterRate > 0.2 ? 'text-yellow-500' : 'text-green-500'}`}>
            {overallChatterRate.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-gray-400 text-sm">Ghosting Events</div>
          <div className={`text-2xl font-bold ${stats.ghostingCount > 10 ? 'text-red-500' : stats.ghostingCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
            {stats.ghostingCount}
          </div>
        </div>
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-gray-400 text-sm">P95 Latency</div>
          <div className={`text-2xl font-bold ${stats.latencyP95 > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
            {stats.latencyP95.toFixed(1)}ms
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Latency Statistics</h3>
        <div className="bg-gray-900 p-4 rounded space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">P50 (Median)</span>
            <span className="text-white font-mono">{stats.latencyP50.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">P95</span>
            <span className="text-white font-mono">{stats.latencyP95.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">P99</span>
            <span className="text-white font-mono">{stats.latencyP99.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Jitter</span>
            <span className="text-white font-mono">{stats.jitter.toFixed(2)}ms</span>
          </div>
        </div>
      </div>

      {stats.stuckRows.size > 0 && (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 p-4 rounded">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Stuck Rows Detected</span>
          </div>
          <p className="text-gray-300 text-sm">
            Rows: {Array.from(stats.stuckRows).join(', ')}
          </p>
        </div>
      )}

      {stats.stuckCols.size > 0 && (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 p-4 rounded">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Stuck Columns Detected</span>
          </div>
          <p className="text-gray-300 text-sm">
            Columns: {Array.from(stats.stuckCols).join(', ')}
          </p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="bg-gray-900 p-4 rounded border border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={getSeverityColor(rec.severity)}>
                      {getSeverityIcon(rec.severity)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{rec.message}</p>
                      {rec.keys && rec.keys.length > 0 && (
                        <p className="text-gray-400 text-sm mt-1">
                          Affected keys: {rec.keys.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {rec.action && rec.action.type !== 'hardware' && (
                    <button
                      onClick={() => onApplyFix(rec)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      Apply Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
