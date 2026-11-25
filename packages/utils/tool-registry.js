export const implementedModules = Object.freeze({ 'link-shortener': { name: 'URL Shortener' } });
export const hasModule = (key) => Object.hasOwn(implementedModules, key);
