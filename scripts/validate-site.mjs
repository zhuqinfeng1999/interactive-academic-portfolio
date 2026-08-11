import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const creditUrl = 'https://github.com/zhuqinfeng1999/interactive-academic-portfolio';
const expectedRoutes = [
  '/', '/research/', '/publications/', '/projects/', '/explorer/',
  '/projects/featured-project/', '/projects/medical-ai/', '/404.html'
];
const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const files = walk(root);
const fileSet = new Set(files.map(relative));
const caseMap = new Map(files.map((file) => [relative(file).toLowerCase(), relative(file)]));

function cleanTarget(raw) {
  return raw.trim().replace(/^['"]|['"]$/g, '').split('#')[0].split('?')[0];
}

function resolveTarget(sourceFile, raw) {
  const target = cleanTarget(raw);
  if (!target || target.startsWith('#') || target.startsWith('%') || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  let absolute = target.startsWith('/')
    ? path.join(root, target.slice(1))
    : path.resolve(path.dirname(sourceFile), target);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return { raw, absolute, outside: true };
  if (target.endsWith('/') || (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory())) absolute = path.join(absolute, 'index.html');
  return { raw, absolute };
}

function references(file, content) {
  const extension = path.extname(file).toLowerCase();
  const values = [];
  if (extension === '.html') for (const match of content.matchAll(/(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi)) values.push(match[1]);
  if (extension === '.css') for (const match of content.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) values.push(match[1]);
  if (['.js', '.mjs'].includes(extension)) for (const match of content.matchAll(/(?:fetch|import)\(\s*["']([^"']+)["']/g)) values.push(match[1]);
  if (extension === '.json') {
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (value && typeof value === 'object') return Object.values(value).forEach(visit);
      if (typeof value === 'string' && (value.startsWith('/') || value.startsWith('./') || value.startsWith('../'))) values.push(value);
    };
    visit(JSON.parse(content));
  }
  return values;
}

const missing = [];
const outside = [];
const caseMismatches = [];
const duplicateHtmlIds = [];
const missingCredit = [];

for (const file of files) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const raw of references(file, content)) {
    const target = resolveTarget(file, raw);
    if (!target) continue;
    const resolved = relative(target.absolute);
    const record = { source: relative(file), target: raw, resolved };
    if (target.outside) outside.push(record);
    else if (!fs.existsSync(target.absolute)) missing.push(record);
    else {
      const actual = caseMap.get(resolved.toLowerCase());
      if (actual && actual !== resolved) caseMismatches.push({ ...record, actual });
    }
  }
  if (file.endsWith('.html')) {
    const ids = [...content.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length) duplicateHtmlIds.push({ file: relative(file), ids: duplicates });
    if (!content.includes(creditUrl)) missingCredit.push(relative(file));
  }
}

const dataPath = path.join(root, 'assets/data/research.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const publicationIds = data.publications.map((item) => item.id);
const domainIds = data.domains.map((item) => item.id);
const projectIds = data.projects.map((item) => item.id);
const unknownPublicationIds = data.domains.flatMap((domain) => domain.publicationIds
  .filter((id) => !publicationIds.includes(id)).map((id) => ({ domain: domain.id, publication: id })));
const featuredWithoutImage = data.publications.filter((item) => item.featuredRank && !item.image).map((item) => item.id);
const routeStatus = Object.fromEntries(expectedRoutes.map((route) => {
  const target = resolveTarget(path.join(root, 'index.html'), route);
  return [route, Boolean(target && fs.existsSync(target.absolute))];
}));

const report = {
  files: files.length,
  routes: routeStatus,
  data: { domains: data.domains.length, publications: data.publications.length, projects: data.projects.length, news: data.news.length },
  missing,
  outside,
  caseMismatches,
  duplicateHtmlIds,
  missingCredit,
  duplicateDataIds: {
    domains: duplicateValues(domainIds), publications: duplicateValues(publicationIds), projects: duplicateValues(projectIds)
  },
  unknownPublicationIds,
  featuredWithoutImage
};

report.valid = Object.values(routeStatus).every(Boolean)
  && [missing, outside, caseMismatches, duplicateHtmlIds, missingCredit, unknownPublicationIds, featuredWithoutImage].every((items) => items.length === 0)
  && Object.values(report.duplicateDataIds).every((items) => items.length === 0);

console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
