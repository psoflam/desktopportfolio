export function mountAbout(){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:18px;">Colin Mays</h2>
    <p style="margin:0 0 10px;opacity:.9;">
      Full-stack developer focused on clean UX and reliable systems. I like building
      simple primitives (like this window manager) that feel great to use.
    </p>
    <ul style="padding-left:18px; margin:0 0 10px;">
      <li>JS/TS, React, Node</li>
      <li>Python (tools), SQL</li>
      <li>Docker, basic k8s, CI</li>
    </ul>
    <p style="opacity:.9;">Double-click the taskbar “About” anytime to bring me back.</p>
  `;
  return wrap;
}
