
(function() {
  const debugBox = document.createElement('div');
  debugBox.style.position = 'fixed';
  debugBox.style.bottom = '10px';
  debugBox.style.right = '10px';
  debugBox.style.backgroundColor = 'rgba(0,0,0,0.8)';
  debugBox.style.color = '#0f0';
  debugBox.style.padding = '10px';
  debugBox.style.zIndex = '999999';
  debugBox.style.fontFamily = 'monospace';
  debugBox.style.fontSize = '12px';
  debugBox.style.pointerEvents = 'none';
  debugBox.style.maxWidth = '300px';
  debugBox.style.whiteSpace = 'pre-wrap';
  document.body.appendChild(debugBox);

  document.addEventListener('mousemove', (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      let info = `Element: <${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}">`;
      
      // Check z-index and position
      const style = window.getComputedStyle(el);
      info += `\nZ-Index: ${style.zIndex}`;
      info += `\nPosition: ${style.position}`;
      info += `\nPointerEvents: ${style.pointerEvents}`;
      
      // Check parent
      if (el.parentElement) {
        info += `\nParent: <${el.parentElement.tagName.toLowerCase()} id="${el.parentElement.id}">`;
      }

      debugBox.textContent = info;
    }
  });

  console.log('🔍 Debug overlay initialized');
})();
