export const downloadSvg = (svgElement: SVGSVGElement, fileName: string = 'tree') => {
  if (!svgElement) return;

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clonedSvg.getAttribute('xmlns:xhtml')) {
    clonedSvg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
  }

  const zoomGroup = clonedSvg.querySelector(':scope > g') as SVGGElement | null;
  if (!zoomGroup) {
    throw new Error('ساختار درختواره برای تولید خروجی SVG معتبر نیست.');
  }
  zoomGroup.removeAttribute('transform');

  clonedSvg.style.position = 'fixed';
  clonedSvg.style.left = '-100000px';
  clonedSvg.style.top = '0';
  clonedSvg.style.visibility = 'hidden';
  document.body.appendChild(clonedSvg);
  let bounds: DOMRect;
  try {
    bounds = zoomGroup.getBBox();
  } finally {
    clonedSvg.remove();
  }
  clonedSvg.style.removeProperty('position');
  clonedSvg.style.removeProperty('left');
  clonedSvg.style.removeProperty('top');
  clonedSvg.style.removeProperty('visibility');
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error('ابعاد محتوای درختواره برای تولید خروجی SVG قابل محاسبه نیست.');
  }

  const padding = 40;
  const x = bounds.x - padding;
  const y = bounds.y - padding;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  clonedSvg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  clonedSvg.setAttribute('width', String(Math.ceil(width)));
  clonedSvg.setAttribute('height', String(Math.ceil(height)));

  // Ensure all foreignObjects have the proper xmlns on their first child
  const foreignObjects = clonedSvg.querySelectorAll('foreignObject');
  foreignObjects.forEach(fo => {
    const firstChild = fo.firstElementChild;
    if (firstChild && !firstChild.getAttribute('xmlns')) {
      firstChild.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    }
  });

  // Convert HTML elements inside SVG to valid XML string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clonedSvg);

  // Collect all stylesheets
  let styleText = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (const rule of Array.from(rules)) {
            styleText += rule.cssText + '\n';
          }
        }
      } catch (e) {
        // Ignore CORS errors for external stylesheets
      }
    }
  } catch (e) {
    console.warn('Error reading stylesheets', e);
  }

  // Inject styles safely using CDATA
  const styleTag = `<style type="text/css"><![CDATA[\n${styleText}\n]]></style>`;
  
  if (svgString.includes('<svg')) {
    svgString = svgString.replace(/(<svg[^>]*>)/, `$1${styleTag}`);
  }

  // Convert string to blob and download
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}-${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
