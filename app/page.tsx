export default function Home() {
  const installUrl = process.env.GITHUB_APP_SLUG
    ? `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`
    : "#setup";

  return <main>
    <section className="hero">
      <p className="eyebrow">AUTONOMOUS MAINTENANCE</p>
      <h1>Find. Fix. Test. Merge.</h1>
      <p className="lead">Connect only the repositories you choose. The agent scans twice daily, proposes one low-risk fix, and merges it only after your repository’s checks pass.</p>
      <a className="button" href={installUrl}>Connect GitHub repository</a>
      {!process.env.GITHUB_APP_SLUG && <p className="hint">Set <code>GITHUB_APP_SLUG</code> to enable repository connection.</p>}
    </section>
    <section className="rules">
      <div><strong>Scoped access</strong><span>GitHub App access is limited to repositories you select.</span></div>
      <div><strong>One PR/day</strong><span>Each repository gets one carefully evaluated change at most.</span></div>
      <div><strong>Safe merge gate</strong><span>No merge without completed, successful repository checks.</span></div>
    </section>
  </main>;
}