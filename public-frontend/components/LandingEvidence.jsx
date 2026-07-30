import { getLandingEvidence } from "../data/landingEvidence";

export default function LandingEvidence({ slug }) {
  const evidence = getLandingEvidence(slug);

  if (!evidence) {
    return null;
  }

  return (
    <section
      className="landing-section landing-section-wide evidence-section"
      data-evidence-example={evidence.id}
    >
      <div className="evidence-heading">
        <div>
          <span className="eyebrow">Reviewable implementation evidence</span>
          <h2>{evidence.title}</h2>
          <p>{evidence.summary}</p>
        </div>
        <span className="evidence-status">Manual Studio verification required</span>
      </div>

      <div className="evidence-prompt">
        <strong>Prompt</strong>
        <p>{evidence.prompt}</p>
      </div>

      <div className="evidence-files">
        {evidence.files.map((file) => (
          <article className="evidence-file" key={`${file.label || ""}-${file.filename}`}>
            {file.label ? <h3>{file.label}</h3> : null}
            <dl className="evidence-file-meta">
              <div>
                <dt>Filename</dt>
                <dd><code>{file.filename}</code></dd>
              </div>
              <div>
                <dt>Class</dt>
                <dd><code>{file.className}</code></dd>
              </div>
              <div>
                <dt>Studio location</dt>
                <dd><code>{file.location}</code></dd>
              </div>
            </dl>
            <pre><code>{file.code}</code></pre>
          </article>
        ))}
      </div>

      <div className="evidence-checks">
        <div>
          <h3>Setup</h3>
          <ol>
            {evidence.setup.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <div>
          <h3>Verification checklist</h3>
          <ol>
            {evidence.verification.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <div>
          <h3>Expected result</h3>
          <p>{evidence.expectedResult}</p>
        </div>
        <div>
          <h3>Limitations</h3>
          <p>{evidence.limitations}</p>
        </div>
      </div>
    </section>
  );
}
