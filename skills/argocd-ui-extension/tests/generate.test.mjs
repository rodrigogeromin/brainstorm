import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, symlink, readdir, cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {normalize} from '../scripts/contract.mjs';
import {generate, entries, templateRoot} from '../scripts/generate.mjs';
const base = {name:'context-inspector',description:'Read-only context',argoCdVersion:'3.5.3',profile:'resource-tab'};
test('unsupported parameters write no files', async () => {
 const parent=await mkdtemp(path.join(tmpdir(),'argocd-contract-'));
 for(const override of [{name:'Bad_Name'},{name:'../unsafe'},{description:''},{argoCdVersion:'3.6.0'},{argoCdVersion:'3.5.3-beta.1'},{profile:'global-page'},{registration:null},{registration:{path:'/bad'}},{registration:{flyout:false}},{dataSource:'secret'},{backend:{kind:'secret'}},{extra:'unknown'}]) {
  await assert.rejects(generate({...base,...override},path.join(parent,'new'))); assert.deepEqual(await readdir(parent),[]);
 }
 assert.equal(normalize(base).registration.group,'argoproj.io');
});
test('file and dangling symlink collisions are preserved',async()=>{
 const parent=await mkdtemp(path.join(tmpdir(),'argocd-collision-')); const dest=path.join(parent,'occupied');
 await writeFile(dest,'keep'); await assert.rejects(generate(base,dest),/already exists/); assert.equal(await readFile(dest,'utf8'),'keep');
 const link=path.join(parent,'link'); await symlink(path.join(parent,'missing'),link); await assert.rejects(generate(base,link),/already exists/);
});
test('deterministic and portable generation with independent names',async()=>{
 const parent=await mkdtemp(path.join(tmpdir(),'argocd-deterministic-')); const a=path.join(parent,'a'),b=path.join(parent,'b');
 await generate(base,a); await generate(base,b);
 for(const f of await entries(a)) assert.equal(await readFile(path.join(a,f),'utf8'),await readFile(path.join(b,f),'utf8'),f);
 const p=JSON.parse(await readFile(path.join(a,'extension-project.json'),'utf8')); assert.equal(p.origin.templateSha256.length,64);assert.deepEqual(p.compatibility.integrated,[]);assert(!JSON.stringify(p).includes(parent));
 const isolated=path.join(parent,'skill');await cp(path.resolve('skills/argocd-ui-extension'),isolated,{recursive:true});
 const params=path.join(parent,'params.json');await writeFile(params,JSON.stringify({...base,name:'second-project',description:'A "quoted" $() description'}));
 execFileSync(process.execPath,[path.join(isolated,'scripts/generate.mjs'),params,path.join(parent,'second')]);
 assert.equal(JSON.parse(await readFile(path.join(parent,'second/package-lock.json'),'utf8')).name,'second-project');
});
test('template has lock and no dependencies/output',async()=>{const files=await entries(templateRoot);assert(files.includes('package-lock.json'));assert(!files.some(f=>f.startsWith('node_modules/')||f.startsWith('dist/')));});
test('evidence refuses bundle/package/source/template changes and failed checks',async()=>{
 const parent=await mkdtemp(path.join(tmpdir(),'argocd-evidence-'));const dest=path.join(parent,'project');await generate(base,dest);
 const {mkdir}=await import('node:fs/promises');
 for(const [name,version] of [['react','19.2.6'],['react-dom','19.2.6'],['@types/react','19.2.14'],['@types/react-dom','19.2.3']]){await mkdir(path.join(dest,'node_modules',name),{recursive:true});await writeFile(path.join(dest,'node_modules',name,'package.json'),JSON.stringify({version}));}
 await mkdir(path.join(dest,'dist/resources'),{recursive:true});
 await writeFile(path.join(dest,'dist/resources/extension-context-inspector.js'),'bundle');await writeFile(path.join(dest,'dist/context-inspector.tar.gz'),'package');
 const {pathToFileURL}=await import('node:url');const {identity,checkEvidence}=await import(pathToFileURL(path.join(dest,'scripts/evidence.mjs')));
 const old=process.cwd();process.chdir(dest);
 try {
  const report={identity:await identity(),checks:['typecheck','lint','test','build','package','harness'].map(c=>({command:`npm run ${c}`,status:'passed',exitCode:0})),integration:{status:'not-run'},integratedVersions:[],releaseComplete:false};
  assert.equal(await checkEvidence(report),true);
  for(const file of ['dist/resources/extension-context-inspector.js','dist/context-inspector.tar.gz','src/app/Extension.tsx','extension-project.json']) {
   const before=await readFile(file);await writeFile(file,file==='extension-project.json'?JSON.stringify({...JSON.parse(before),origin:{templateSha256:'changed'}}):Buffer.concat([before,Buffer.from('\nchanged')]));
   await assert.rejects(checkEvidence(report),/Stale evidence/);await writeFile(file,before);
  }
  await assert.rejects(checkEvidence({...report,checks:report.checks.slice(1)}),/Missing/);
  await assert.rejects(checkEvidence({...report,checks:report.checks.map((c,i)=>i===0?{...c,status:'failed'}:c)}),/Failed/);
  await assert.rejects(checkEvidence({...report,integratedVersions:['3.5.3']}),/matrix/);
 } finally {process.chdir(old);}
});
