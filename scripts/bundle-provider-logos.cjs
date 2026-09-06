// Render the installed MIT-licensed Lobe icons into self-hosted SVGs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const providers = { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', deepseek: 'DeepSeek', xai: 'XAI', meta: 'Meta', mistral: 'Mistral', alibaba: 'Alibaba', cohere: 'Cohere', moonshotai: 'Moonshot', zai: 'ZAI' };
function load(file, title) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, require: (id) => {
    if (id === '../style') return { TITLE: title };
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), `${id}.js`), title);
    return require(id);
  } });
  return module.exports;
}
fs.mkdirSync('public/assets/providers', { recursive: true });
for (const [key, name] of Object.entries(providers)) {
  for (const [type, component] of [['mono', 'Mono'], ['color', 'Color']]) {
    let input = path.resolve('node_modules/@lobehub/icons/es', name, 'components', `${component}.js`);
    if (!fs.existsSync(input)) input = path.resolve('node_modules/@lobehub/icons/es', name, 'components/Mono.js');
    const svg = renderToStaticMarkup(React.createElement(load(input, name).default, {
      size: 24, xmlns: 'http://www.w3.org/2000/svg', style: { color: '#f4f1fa' },
    }));
    fs.writeFileSync(`public/assets/providers/${key}-${type}.svg`, svg);
  }
}
fs.copyFileSync('node_modules/@lobehub/icons/LICENSE', 'public/assets/providers/LICENSE');
console.log(`Bundled ${Object.keys(providers).length} provider logos`);
