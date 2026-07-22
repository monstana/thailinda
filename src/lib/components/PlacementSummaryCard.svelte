<script>
  let { assessment, title = 'ผลประเมินระดับการออกเสียง', showPending = true } = $props();

  const categoryLabels = {
    consonants: 'พยัญชนะ',
    vowels: 'สระ',
    words: 'คำศัพท์'
  };

  function levelIcon(code) {
    if (code === 'advanced') return 'workspace_premium';
    if (code === 'developing') return 'trending_up';
    if (code === 'foundation') return 'school';
    return 'flag';
  }
</script>

{#if assessment?.status === 'completed'}
  <section class="placement-summary-card" aria-labelledby={`placement-${assessment.userId}`}>
    <div class="placement-summary-score">
      <span class="material-symbols-rounded" aria-hidden="true">{levelIcon(assessment.levelCode)}</span>
      <strong>{assessment.score}</strong><small>/ 100</small>
    </div>
    <div class="placement-summary-copy">
      <p>แบบประเมินแรกเข้า</p>
      <h2 id={`placement-${assessment.userId}`}>{title}</h2>
      <strong class="placement-level">{assessment.level}</strong>
      <div class="placement-category-scores">
        {#each Object.entries(categoryLabels) as [category, label]}
          <span><small>{label}</small><strong>{assessment.categoryScores?.[category] ?? 0}%</strong></span>
        {/each}
        {#if assessment.mouthAverage != null}<span><small>รูปปาก</small><strong>{assessment.mouthAverage}%</strong></span>{/if}
      </div>
      <p class="placement-recommendation"><span class="material-symbols-rounded" aria-hidden="true">tips_and_updates</span>{assessment.recommendation}</p>
    </div>
  </section>
{:else if showPending && assessment}
  <section class="placement-summary-card placement-summary-card--pending">
    <div class="placement-summary-score"><span class="material-symbols-rounded" aria-hidden="true">assignment_late</span></div>
    <div class="placement-summary-copy"><p>แบบประเมินแรกเข้า</p><h2>{title}</h2><strong class="placement-level">รอทำแบบประเมินให้ครบ 6 ข้อ</strong></div>
  </section>
{/if}

<style>
  .placement-summary-card { display: grid; grid-template-columns: 132px 1fr; gap: 24px; align-items: center; padding: 26px; margin: 24px 0; border: 1px solid #dbe7e4; border-radius: 24px; background: linear-gradient(135deg, #f2fbf8, #fff9eb); box-shadow: 0 10px 28px rgba(27, 78, 68, .08); }
  .placement-summary-score { display: grid; place-content: center; min-height: 120px; border-radius: 22px; color: white; background: linear-gradient(145deg, #16856f, #0d6555); text-align: center; }
  .placement-summary-score > span { font-size: 32px; }
  .placement-summary-score strong { font-size: 42px; line-height: 1; }
  .placement-summary-score small { opacity: .85; }
  .placement-summary-copy > p:first-child { margin: 0; color: #88712e; font-weight: 700; }
  .placement-summary-copy h2 { margin: 2px 0 4px; font-size: 1.25rem; }
  .placement-level { color: #0d6555; }
  .placement-category-scores { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .placement-category-scores span { display: flex; gap: 8px; align-items: baseline; padding: 7px 11px; border-radius: 12px; background: white; border: 1px solid #e5ecea; }
  .placement-category-scores small { color: #687774; }
  .placement-recommendation { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 0; color: #364944; }
  .placement-recommendation span { color: #df9d13; }
  .placement-summary-card--pending { background: #fffaf0; }
  .placement-summary-card--pending .placement-summary-score { background: #d49a22; }
  @media (max-width: 650px) { .placement-summary-card { grid-template-columns: 1fr; } .placement-summary-score { min-height: 92px; } }
</style>
