import * as d from '../../declarations';
import { hasError } from '../util';


export async function minifyStyle(config: d.Config, compilerCtx: d.CompilerCtx, diagnostics: d.Diagnostic[], styleText: string, filePath?: string) {
  if (typeof styleText !== 'string' || !styleText.length) {
    //  don't bother with invalid data
    return styleText;
  }

  const cacheKey = compilerCtx.cache.createKey('minifyStyle', '__BUILDID:MINIFYSTYLE__', styleText, MINIFY_CSS_PROD);
  const cachedContent = await compilerCtx.cache.get(cacheKey);
  if (cachedContent != null) {
    // let's use the cached data we already figured out
    return cachedContent;
  }

  const minifyResults = await config.sys.minifyCss(styleText, filePath, MINIFY_CSS_PROD);
  minifyResults.diagnostics.forEach(d => {
    // collect up any diagnostics from minifying
    diagnostics.push(d);
  });

  if (typeof minifyResults.output === 'string' && !hasError(diagnostics)) {
    // cool, we got valid minified output

    // only cache if we got a cache key, if not it probably has an @import
    await compilerCtx.cache.put(cacheKey, minifyResults.output);

    return minifyResults.output;
  }

  return styleText;
}


const MINIFY_CSS_PROD: any = {
  level: 2
};


export async function minifyInlineStyles(config: d.Config, compilerCtx: d.CompilerCtx, doc: Document, diagnostics: d.Diagnostic[]) {
  const styles = doc.querySelectorAll('style');
  const promises: Promise<any>[] = [];

  for (let i = 0; i < styles.length; i++) {
    promises.push(minifyInlineStyle(config, compilerCtx, diagnostics, styles[i]));
  }

  await Promise.all(promises);
}


async function minifyInlineStyle(config: d.Config, compilerCtx: d.CompilerCtx, diagnostics: d.Diagnostic[], style: HTMLStyleElement) {
  if (style.innerHTML.includes('  ') || style.innerHTML.includes('\t')) {
    style.innerHTML = await minifyStyle(config, compilerCtx, diagnostics, style.innerHTML);
  }
}
