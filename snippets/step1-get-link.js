/* ============================================================
 * 第一步：获取 pdf-viewer 完整链接
 * ------------------------------------------------------------
 * 用法：在「已打开 PDF 预览」的页面按 F12 → Console，
 *       粘贴运行下面这段，复制它返回的整串结果。
 * 说明：三段 || 为兜底逻辑，依次尝试
 *       data-src → iframe.src → 页面内所有 pdf-viewer 链接。
 * ============================================================ */

document.querySelector('#pdf-viewer').getAttribute('data-src') 
|| document.querySelector('iframe#pdf-viewer')?.src
|| [...document.querySelectorAll('a[href*="pdf-viewer"]')].map(a=>a.href)
