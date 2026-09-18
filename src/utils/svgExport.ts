export const downloadSvg = (svgElement: SVGSVGElement, fileName: string = 'tree') => {
  if (!svgElement) return;

  // Clone the SVG node so we can modify it for export
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  // Add namespaces if they don't exist
  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clonedSvg.getAttribute('xmlns:xhtml')) {
    clonedSvg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
  }

  // Ensure scalable viewBox
  const width = clonedSvg.getAttribute('width') || clonedSvg.clientWidth || 1000;
  const height = clonedSvg.getAttribute('height') || clonedSvg.clientHeight || 1000;
  
  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  clonedSvg.setAttribute('width', '100%');
  clonedSvg.setAttribute('height', '100%');

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
