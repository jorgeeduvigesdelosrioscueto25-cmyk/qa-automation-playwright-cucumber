const path = require('node:path');
if (!process.env.QA_RUN_DIR || !process.env.QA_BROWSER) {
  throw new Error('Ejecute npm test: todas las modalidades pasan por scripts/runAutomation.ts');
}
const carpetaJson = path
  .relative(
    process.cwd(),
    path.join(process.env.QA_RUN_DIR, 'navegadores', process.env.QA_BROWSER, 'json'),
  )
  .split(path.sep)
  .join('/');
module.exports = {
  default: {
    paths: ['features/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
    parallel: Number(process.env.CUCUMBER_PARALLEL || 0),
    retry: 0,
    format: [
      'progress',
      `json:${path.join(carpetaJson, 'cucumber.json')}`,
      `message:${path.join(carpetaJson, 'cucumber-messages.ndjson')}`,
    ],
  },
};
