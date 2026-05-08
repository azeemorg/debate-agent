/**
 * DebateResults — Full-screen evaluation report shown after "End Debate".
 */
export default function DebateResults({ topic, evaluationHistory, onPlayAgain }) {
  if (!evaluationHistory || evaluationHistory.length === 0) {
    return (
      <div className="vd-results">
        <div className="vd-results-header">
          <h2>🏁 Debate Ended</h2>
          <p style={{ color: 'var(--vd-text-dim)' }}>No evaluation data recorded.</p>
          <button className="vd-btn primary" onClick={onPlayAgain}>Debate Again</button>
        </div>
      </div>
    );
  }

  // Aggregate scores across all rounds
  const totalRounds = evaluationHistory.length;
  const avgHuman = Math.round(
    evaluationHistory.reduce((s, e) => s + (e.human_score || 0), 0) / totalRounds
  );
  const avgAI = Math.round(
    evaluationHistory.reduce((s, e) => s + (e.ai_score || 0), 0) / totalRounds
  );
  const winner = avgHuman > avgAI ? 'You Win!' : avgAI > avgHuman ? 'AI Wins!' : 'Tie!';
  const winnerColor = avgHuman > avgAI ? 'var(--vd-human)' : avgAI > avgHuman ? 'var(--vd-ai)' : '#888';

  // Aggregate metrics
  const metricKeys = ['confidence', 'clarity', 'relevance', 'persuasiveness', 'critical_thinking', 'communication'];
  const avgMetrics = {};
  for (const key of metricKeys) {
    avgMetrics[key] = {
      human: Math.round(evaluationHistory.reduce((s, e) => s + (e.human_metrics?.[key] || 0), 0) / totalRounds),
      ai: Math.round(evaluationHistory.reduce((s, e) => s + (e.ai_metrics?.[key] || 0), 0) / totalRounds),
    };
  }

  // Collect all strengths & weaknesses across rounds (deduplicated)
  const allStrengths = [...new Set(evaluationHistory.flatMap(e => e.human_strengths || []))];
  const allWeaknesses = [...new Set(evaluationHistory.flatMap(e => e.human_weaknesses || []))];
  const allFallacies = [...new Set(evaluationHistory.flatMap(e => e.logical_fallacies || []))];

  // Last round feedback / summary
  const lastEval = evaluationHistory[evaluationHistory.length - 1];

  return (
    <div className="vd-results">
      {/* Winner Banner */}
      <div className="vd-results-header">
        <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>
          {avgHuman > avgAI ? '🏆' : avgAI > avgHuman ? '🤖' : '🤝'}
        </div>
        <h2 style={{ color: winnerColor, margin: '0 0 0.4rem' }}>{winner}</h2>
        <p style={{ color: 'var(--vd-text-dim)', marginBottom: '0.2rem' }}>
          Topic: <strong style={{ color: 'var(--vd-text)' }}>{topic}</strong>
        </p>
        <p style={{ color: 'var(--vd-text-dim)', fontSize: '0.85rem' }}>
          {totalRounds} round{totalRounds !== 1 ? 's' : ''} completed
        </p>
      </div>

      {/* Final Scores */}
      <div className="vd-scores" style={{ marginBottom: '1.5rem' }}>
        <div className="vd-score-card human" style={{ flex: 1 }}>
          <div className="vd-score-value">{avgHuman}</div>
          <div className="vd-score-label">Your Average</div>
        </div>
        <div style={{ fontSize: '1.5rem', alignSelf: 'center', color: 'var(--vd-text-dim)' }}>VS</div>
        <div className="vd-score-card ai" style={{ flex: 1 }}>
          <div className="vd-score-value">{avgAI}</div>
          <div className="vd-score-label">AI Average</div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="vd-section-title">📊 Performance Breakdown (Avg across rounds)</div>
      {metricKeys.map((key) => (
        <div key={key} className="vd-metric-bar">
          <div className="vd-metric-bar-header">
            <span>{key.replace('_', ' ')}</span>
            <span style={{ color: 'var(--vd-text-dim)', fontSize: '0.78rem' }}>
              You: {avgMetrics[key].human} &nbsp;|&nbsp; AI: {avgMetrics[key].ai}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <div className="vd-metric-track" style={{ flex: 1 }}>
              <div className="vd-metric-fill human" style={{ width: `${avgMetrics[key].human}%` }} />
            </div>
            <div className="vd-metric-track" style={{ flex: 1 }}>
              <div className="vd-metric-fill ai" style={{ width: `${avgMetrics[key].ai}%` }} />
            </div>
          </div>
        </div>
      ))}

      {/* Strengths */}
      {allStrengths.length > 0 && (
        <>
          <div className="vd-section-title" style={{ marginTop: '1rem' }}>✅ Your Strengths</div>
          <div className="vd-tag-list">
            {allStrengths.map((s, i) => <span key={i} className="vd-tag strength">{s}</span>)}
          </div>
        </>
      )}

      {/* Weaknesses */}
      {allWeaknesses.length > 0 && (
        <>
          <div className="vd-section-title" style={{ marginTop: '1rem' }}>📈 Areas to Improve</div>
          <div className="vd-tag-list">
            {allWeaknesses.map((w, i) => <span key={i} className="vd-tag weakness">{w}</span>)}
          </div>
        </>
      )}

      {/* Fallacies */}
      {allFallacies.length > 0 && (
        <>
          <div className="vd-section-title" style={{ marginTop: '1rem' }}>⚠️ Logical Fallacies Detected</div>
          <div className="vd-tag-list">
            {allFallacies.map((f, i) => <span key={i} className="vd-tag fallacy">{f}</span>)}
          </div>
        </>
      )}

      {/* Final feedback */}
      {lastEval?.feedback && (
        <div className="vd-feedback" style={{ marginTop: '1rem' }}>
          <strong>💡 Coaching Tip:</strong> {lastEval.feedback}
        </div>
      )}
      {lastEval?.debate_summary && (
        <div className="vd-feedback" style={{ marginTop: '0.6rem' }}>
          <strong>📝 Summary:</strong> {lastEval.debate_summary}
        </div>
      )}

      {/* Round-by-round history */}
      {evaluationHistory.length > 1 && (
        <>
          <div className="vd-section-title" style={{ marginTop: '1.5rem' }}>📈 Round History</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {evaluationHistory.map((e, i) => (
              <div key={i} style={{
                background: 'var(--vd-card)', border: '1px solid var(--vd-border)',
                borderRadius: 8, padding: '0.5rem 0.8rem', textAlign: 'center', minWidth: 70,
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--vd-text-dim)' }}>Round {e.round_number}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--vd-human)', fontWeight: 700 }}>{Math.round(e.human_score)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--vd-text-dim)' }}>vs</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--vd-ai)', fontWeight: 700 }}>{Math.round(e.ai_score)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="vd-btn primary" onClick={onPlayAgain} style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
          🎤 Debate Again
        </button>
      </div>
    </div>
  );
}
