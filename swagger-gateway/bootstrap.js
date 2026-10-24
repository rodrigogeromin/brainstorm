// Paste in DevTools while signed in to Argo CD. Uses existing same-origin auth.
(async () => {
  const headers = {'Argocd-Application-Name': 'argocd:swagger-gateway', 'Argocd-Project-Name': 'appset'};
  async function get(path) {
    const response = await fetch(path, {headers, credentials: 'same-origin'});
    if (!response.ok) throw new Error(`Swagger gateway returned ${response.status}`);
    return response;
  }
  const {items} = await (await get('/extensions/swagger/api/v1/catalog')).json();
  document.getElementById('swagger-gateway-poc')?.remove();
  const panel = document.createElement('dialog');
  panel.id = 'swagger-gateway-poc';
  panel.style.cssText = 'width:95vw;height:92vh;padding:12px;border:1px solid #aaa';
  const select = document.createElement('select');
  for (const item of items) select.add(new Option(item.title, item.id));
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.onclick = () => panel.remove();
  const frame = document.createElement('iframe');
  frame.title = 'Swagger Gateway documentation';
  frame.style.cssText = 'display:block;width:100%;height:calc(100% - 36px);border:0;margin-top:10px';
  // srcdoc inherits the Argo CD origin, allowing authenticated spec requests.
  async function load() {
    try { frame.srcdoc = await (await get(items.find(item => item.id === select.value).uiUrl)).text(); }
    catch (error) { console.error(error); frame.srcdoc = '<p>Failed to load documentation. See console.</p>'; }
  }
  select.onchange = load;
  panel.append(select, close, frame);
  document.body.append(panel);
  panel.showModal();
  await load();
})();
