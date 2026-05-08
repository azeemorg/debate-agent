/**
 * EvaluationPanel — Displays real-time debate scores and analytics.
 */

export default function EvaluationPanel({ evaluation, evaluationHistory }) {
  if (!evaluation) {
    return (
      <div className="vd-eval">
        <div className="vd-eval-header">📊 Live Evaluation</div>
        <div className="vd-eval-content">
          <div className="vd-empty">
            <div className="vd-empty-icon">📊</div>
            <p>Scores appear after the first exchange</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = ['confidence', 'clarity', 'relevance', 'persuasiveness', 'critical_thinking', 'communication'];

  return (
    <div className="vd-eval">
      <div className="vd-eval-header">📊 Round {evaluation.round_number} Evaluation</div>
      <div className="vd-eval-content">
        {/* Score Cards */}
        <div className="vd-scores">
          <div className="vd-score-card human">
            <div className="vd-score-value">{Math.round(evaluation.human_score)}</div>
            <div className="vd-score-label">You</div>
          </div>
          <div className="vd-score-card ai">
            <div className="vd-score-value">{Math.round(evaluation.ai_score)}</div>
            <div className="vd-score-label">AI</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="vd-section-title">Performance Metrics</div>
        {metrics.map((metric) => (
          <div key={metric} className="vd-metric-bar">
            <div className="vd-metric-bar-header">
              <span>{metric.replace('_', ' ')}</span>
              <span>
                {evaluation.human_metrics?.[metric] || 0} / {evaluation.ai_metrics?.[metric] || 0}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div className="vd-metric-track" style={{ flex: 1 }}>
                <div
                  className="vd-metric-fill human"
                  style={{ width: `${evaluation.human_metrics?.[metric] || 0}%` }}
                />
              </div>
              <div className="vd-metric-track" style={{ flex: 1 }}>
                <div
                  className="vd-metric-fill ai"
                  style={{ width: `${evaluation.ai_metrics?.[metric] || 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Strengths */}
        {evaluation.human_strengths?.length > 0 && (
          <>
            <div className="vd-section-title">Your Strengths</div>
            <div className="vd-tag-list">
              {evaluation.human_strengths.map((s, i) => (
                <span key={i} className="vd-tag strength">{s}</span>
              ))}
            </div>
          </>
        )}

        {/* Weaknesses */}
        {evaluation.human_weaknesses?.length > 0 && (
          <>
            <div className="vd-section-title">Areas to Improve</div>
            <div className="vd-tag-list">
              {evaluation.human_weaknesses.map((w, i) => (
                <span key={i} className="vd-tag weakness">{w}</span>
              ))}
            </div>
          </>
        )}

        {/* Fallacies */}
        {evaluation.logical_fallacies?.length > 0 && (
          <>
            <div className="vd-section-title">⚠️ Logical Fallacies</div>
            <div className="vd-tag-list">
              {evaluation.logical_fallacies.map((f, i) => (
                <span key={i} className="vd-tag fallacy">{f}</span>
              ))}
            </div>
          </>
        )}

        {/* Feedback */}
        {evaluation.feedback && (
          <div className="vd-feedback">
            <strong>💡 Tip:</strong> {evaluation.feedback}
          </div>
        )}

        {/* Summary */}
        {evaluation.debate_summary && (
          <div className="vd-feedback" style={{ marginTop: '0.6rem' }}>
            <strong>📝 Summary:</strong> {evaluation.debate_summary}
          </div>
        )}
      </div>
    </div>
  );
}
