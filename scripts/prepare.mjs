// Production-only installs and CI do not need local Git hooks.
if (process.env.CI || process.env.NODE_ENV === 'production' || process.env.HUSKY === '0') {
  process.exit(0);
}

const { default: husky } = await import('husky');
const result = husky();
if (result) console.error(result);
