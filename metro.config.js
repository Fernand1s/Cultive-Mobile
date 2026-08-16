// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// --- Suporte ao expo-sqlite no Expo Web ---
// No navegador o expo-sqlite roda sobre wa-sqlite (WebAssembly). Sem isso o
// bundle web quebra em "Unable to resolve ./wa-sqlite/wa-sqlite.wasm".
// O alvo do app é Android/iOS; isto serve só ao teste rápido pelo navegador.
config.resolver.assetExts.push('wasm');

// O wa-sqlite usa SharedArrayBuffer, que os navegadores só liberam em contexto
// isolado — daí os cabeçalhos COOP/COEP no servidor de desenvolvimento.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return middleware(req, res, next);
  };
};

module.exports = config;
