const appUrl = import.meta.env.VITE_APP_URL ?? "http://localhost:5173";

function ArrowUpRight() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M5 3h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Spark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" fill="currentColor" /></svg>;
}

const capabilities = [
  ["Contexto que permanece", "Cada proyecto reúne conversaciones, archivos, agentes, modelos y decisiones en un único espacio de trabajo."],
  ["Ejecución con control", "Los agentes usan herramientas reales, mientras tus reglas definen qué acciones requieren una aprobación."],
  ["Equipos que se coordinan", "Crea especialistas, delega trabajo y sigue el avance sin perder el hilo de la conversación."],
];

export default function App() {
  return (
    <div className="site-shell">
      <div className="signal-grid" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Spaces, inicio">
          <span className="brand-mark">S</span>
          <span>Spaces</span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#how-it-works">Cómo funciona</a>
          <a href="#capabilities">Capacidades</a>
        </nav>
        <a className="header-cta" href={appUrl}>Abrir Spaces <ArrowUpRight /></a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="live-dot" /> Espacio de trabajo para equipos con IA</p>
            <h1>El trabajo de tus agentes.<br /><em>En el mismo lugar</em> que tus decisiones.</h1>
            <p className="hero-summary">Spaces reúne proyectos, sesiones y equipos de agentes para que puedas dirigir trabajo autónomo con el contexto y el control que importa.</p>
            <div className="hero-actions">
              <a className="button button-primary" href={appUrl}>Entrar al workspace <ArrowUpRight /></a>
              <a className="button button-quiet" href="#how-it-works">Ver el flujo <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-proof">
              <span>Proyectos</span><i />
              <span>Agentes</span><i />
              <span>Herramientas MCP</span><i />
              <span>Aprobaciones</span>
            </div>
          </div>

          <div className="workspace-preview" aria-label="Vista previa de una delegación en Spaces">
            <div className="preview-topbar">
              <div className="preview-title"><span className="preview-mark">S</span> Atlas / lanzamiento</div>
              <div className="preview-state"><span /> En ejecución</div>
            </div>
            <div className="preview-body">
              <aside className="preview-rail" aria-hidden="true"><span className="rail-active" /><span /><span /><span /></aside>
              <div className="preview-main">
                <div className="preview-context"><span>Proyecto activo</span><strong>Preparar el lanzamiento de v1.0</strong></div>
                <div className="handoff-label">Cadena de trabajo en vivo</div>
                <div className="handoff-flow">
                  <article className="flow-card flow-lead"><div className="agent-avatar">M</div><div><small>AGENTE LÍDER</small><strong>Marina</strong><p>Define el plan de entrega</p></div><b>01</b></article>
                  <div className="flow-connector"><span>delega</span><i /></div>
                  <article className="flow-card"><div className="agent-avatar agent-blue">R</div><div><small>IMPLEMENTACIÓN</small><strong>Rafael</strong><p>Prepara la versión candidata</p></div><b>02</b></article>
                  <div className="flow-connector"><span>solicita</span><i /></div>
                  <article className="flow-card flow-approval"><div className="agent-avatar agent-light"><Spark /></div><div><small>DECISIÓN HUMANA</small><strong>Aprobación requerida</strong><p>Publicar en producción</p></div><b>03</b></article>
                </div>
                <div className="preview-footer"><span><i /> 4 tareas completadas</span><span>Última actividad ahora</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="principle" id="how-it-works">
          <p className="eyebrow">Una interfaz para dirigir, no vigilar</p>
          <div><h2>La autonomía funciona mejor cuando el contexto, el trabajo y la responsabilidad se ven juntos.</h2><p>Spaces transforma sesiones aisladas en una operación comprensible: cada agente sabe dónde trabaja, cada delegación queda trazada y cada acción sensible llega a la persona correcta.</p></div>
        </section>

        <section className="capabilities" id="capabilities">
          <div className="section-head"><p className="eyebrow">Diseñado para el trabajo real</p><span>03 capacidades esenciales</span></div>
          <div className="capability-list">
            {capabilities.map(([title, description], index) => <article className="capability" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight /></article>)}
          </div>
        </section>

        <section className="closing">
          <p className="eyebrow">Tu próximo proyecto empieza aquí</p>
          <h2>Da a tu equipo de IA un lugar para trabajar.</h2>
          <a className="button button-primary" href={appUrl}>Abrir Spaces <ArrowUpRight /></a>
        </section>
      </main>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark">S</span><span>Spaces</span></a><p>Un espacio de trabajo para proyectos asistidos por IA.</p><span>© 2026</span></footer>
    </div>
  );
}
