import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {generate} from '../scripts/generate.mjs';
const parameters={name:'validation-project',description:'Validation regression',argoCdVersion:'3.5.3',profile:'resource-tab'};
async function project() {
 const parent=await mkdtemp(path.join(tmpdir(),'argocd-validation-'));const dest=path.join(parent,'project');await generate(parameters,dest);
 const validation=await import(pathToFileURL(path.join(dest,'scripts/validate.mjs')));
 const evidence=await import(pathToFileURL(path.join(dest,'scripts/evidence.mjs')));
 return {dest,...validation,...evidence};
}
test('portable validation/evidence reject manifest edits to unsupported target or profile before checks',async()=>{
 const {dest,runValidation,identity,checkEvidence}=await project();const old=process.cwd();process.chdir(dest);
 try {
  await mkdir('dist/resources',{recursive:true});await writeFile('dist/resources/extension-validation-project.js','bundle');await writeFile('dist/validation-project.tar.gz','package');
  const manifest=JSON.parse(await readFile('extension-project.json','utf8'));
  for(const override of [{argoCdVersion:'3.6.0'},{profile:'global-page'}]) {
   await writeFile('extension-project.json',JSON.stringify({...manifest,...override}));
   let calls=0;const report=await runValidation({npmVersion:'11.19.0',runCheck:()=>{calls++;return {status:0};}});
   assert.equal(calls,0);assert.equal(report.configuration.status,'failed');assert(report.checks.every(c=>c.status==='not-run'));
   assert.equal(report.identity.project,'validation-project');assert.equal(report.identity.target,override.argoCdVersion??'3.5.3');
   const forged={...report,identity:await identity({validateConfiguration:false}),checks:report.checks.map(c=>({...c,status:'passed',exitCode:0}))};
   await assert.rejects(checkEvidence(forged),/must equal/);
  }
 } finally {process.chdir(old);}
});
test('failed-check report retains source/project/template identity and nullable unavailable artifacts',async()=>{
 const {dest,runValidation,sourceRevision}=await project();const old=process.cwd();process.chdir(dest);
 try {
  const manifest=JSON.parse(await readFile('extension-project.json','utf8'));let calls=0;
  const report=await runValidation({npmVersion:'11.19.0',runCheck:()=>{calls++;return {status:2};}});
  assert.equal(calls,1);assert.equal(report.configuration.status,'passed');assert.equal(report.checks[0].status,'failed');assert(report.checks.slice(1).every(c=>c.status==='not-run'));
  assert.equal(report.identity.project,manifest.name);assert.equal(report.identity.target,manifest.argoCdVersion);assert.equal(report.identity.templateVersion,manifest.templateVersion);assert.equal(report.identity.templateRevision,manifest.origin.templateSha256);assert.equal(report.identity.sourceRevision,await sourceRevision());
  assert.equal(report.identity.bundleSha256,null);assert.equal(report.identity.packageSha256,null);assert.equal(report.artifacts.status,'not-validated');assert.equal(report.releaseComplete,false);
  assert.deepEqual(JSON.parse(await readFile('validation-report.json','utf8')),report);
 } finally {process.chdir(old);}
});
