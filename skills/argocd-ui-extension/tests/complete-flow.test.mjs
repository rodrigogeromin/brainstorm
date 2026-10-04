import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,mkdir,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generate} from '../scripts/generate.mjs';
import {auditHost} from '../scripts/audit-host.mjs';
import {migrateManifest} from '../scripts/migrate-manifest.mjs';
import {normalize,validateProject} from '../scripts/contract.mjs';
const base={name:'complete-flow',description:'Complete flow',argoCdVersion:'3.0.0',profile:'top-bar-action'};
test('real locks, exact runtime, flyout props and core resource group',()=>{
 const p=normalize(base);assert(p.hostContract.sources.some(s=>s.endsWith('/yarn.lock')));assert.equal(p.hostContract.runtime.react,'16.14.0');assert.deepEqual(p.hostContract.flyoutProps,['application','tree']);
 const core=normalize({...base,profile:'resource-tab',registration:{group:'',kind:'ConfigMap'}});assert.equal(core.registration.group,'');
 assert.equal(normalize({...base,argoCdVersion:'3.5.1'}).hostContract.runtime.react,'19.2.6');
 assert.throws(()=>normalize({...base,profile:'app-view',registration:{shouldDisplay:true}}),/not supported/);
});
test('auditor discovers yarn and records hashes without reviewing contract; failures leave no output',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-audit-'));
 const fetchSource=async url=>({ok:!url.endsWith('pnpm-lock.yaml'),status:url.endsWith('pnpm-lock.yaml')?404:200,text:async()=>url.endsWith('package.json')?'{"dependencies":{"react":"16.14.0"}}':'source'});
 const report=await auditHost('3.0.0',path.join(dir,'audit'),{fetchSource});assert.equal(report.contractReviewed,false);assert.equal(report.files.length,4);assert(report.files.every(f=>f.sha256.length===64));assert(report.files.some(f=>f.path==='ui/yarn.lock'));
 await assert.rejects(auditHost('3.0.0',path.join(dir,'audit'),{fetchSource}),/already exists/);
 await assert.rejects(auditHost('3.0.0',path.join(dir,'failed'),{fetchSource:async()=>({ok:false,status:404})}),/HTTP 404/);assert.deepEqual((await readdir(dir)).sort(),['audit']);
});
test('explicit migration preserves source/custom data and clears integration; alias conflicts reject',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-migrate-')),src=path.join(dir,'old.json'),dest=path.join(dir,'new.json');
 const old={...base,schemaVersion:1,templateVersion:'1.0.0',profile:'top-bar-action-menu',registration:{iconClassName:'fa-book'},custom:{keep:true},origin:{templateSha256:'old'},compatibility:{integrated:['3.0.0']}};
 await writeFile(src,JSON.stringify(old));const before=await readFile(src,'utf8');const migrated=await migrateManifest(src,dest,normalize(base).hostContract);assert.equal(await readFile(src,'utf8'),before);assert.equal(migrated.profile,'top-bar-action');assert.equal(migrated.registration.icon,'fa-book');assert.deepEqual(migrated.custom,old.custom);assert.deepEqual(migrated.compatibility.integrated,[]);assert.equal(migrated.origin.templateSha256,'old');assert.equal(migrated.templateVersion,'1.0.0');assert.equal(validateProject(migrated).templateVersion,'1.0.0');assert.equal(migrated.origin.adaptations.at(-1).validatorTemplate,normalize(base).templateVersion);
 await assert.rejects(migrateManifest(src,dest,normalize(base).hostContract),/already exists/);
 await assert.rejects(migrateManifest(src,path.join(dir,'absent.json')),/required/);
 await writeFile(src,JSON.stringify({...old,registration:{icon:'other',iconClassName:'fa-book'}}));await assert.rejects(migrateManifest(src,path.join(dir,'conflict.json'),normalize(base).hostContract),/Conflicting/);
});

test('project validation accepts reordered contract keys but rejects missing registration and argument reorder',()=>{
 const project=normalize(base);
 const reversed=Object.fromEntries(Object.entries(project.hostContract).reverse());
 reversed.runtime=Object.fromEntries(Object.entries(project.hostContract.runtime).reverse());
 assert.deepEqual(validateProject({...project,hostContract:reversed}),project);
 const registration={...project.registration};delete registration.id;
 assert.throws(()=>validateProject({...project,registration}),/registration must include normalized/);
 const argumentMap=[...project.hostContract.argumentMap];[argumentMap[1],argumentMap[2]]=[argumentMap[2],argumentMap[1]];
 assert.throws(()=>validateProject({...project,hostContract:{...project.hostContract,argumentMap}}),/argumentMap/);
});
test('migration upgrades a separately prepared target copy while preserving original and retarget history',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-retarget-'));
 const original=path.join(dir,'original.json'),prepared=path.join(dir,'prepared.json'),destination=path.join(dir,'migrated.json');
 const old={...base,schemaVersion:1,templateVersion:'1.0.0',origin:{templateSha256:'old',adaptations:[{kind:'custom-ui',detail:'keep'}]},custom:{keep:true}};
 await writeFile(original,JSON.stringify(old));const before=await readFile(original,'utf8');
 const retarget={kind:'retarget',from:'3.0.0',to:'3.5.1'};
 const copy={...old,argoCdVersion:'3.5.1',origin:{...old.origin,adaptations:[...old.origin.adaptations,retarget]}};
 await writeFile(prepared,JSON.stringify(copy));const copyBefore=await readFile(prepared,'utf8');
 const migrated=await migrateManifest(prepared,destination,normalize({...base,argoCdVersion:'3.5.1'}).hostContract);
 assert.equal(migrated.argoCdVersion,'3.5.1');assert.equal(migrated.hostContract.tag,'v3.5.1');assert.equal(migrated.hostContract.runtime.react,'19.2.6');
 assert.deepEqual(migrated.origin.adaptations.slice(0,2),copy.origin.adaptations);assert.deepEqual(migrated.custom,old.custom);
 assert.equal(await readFile(original,'utf8'),before);assert.equal(await readFile(prepared,'utf8'),copyBefore);assert.deepEqual(migrated.compatibility.integrated,[]);
});

test('template provenance does not force a schema-compatible project to migrate on every skill release',()=>{
 const project=normalize(base);
 for(const version of ['2.0.0','2.2.0','2.2.1'])assert.equal(validateProject({...project,templateVersion:version}).templateVersion,version);
 assert.throws(()=>validateProject({...project,schemaVersion:1}),/schema version/);
 assert.throws(()=>validateProject({...project,templateVersion:'invalid'}),/SemVer/);
 assert.throws(()=>validateProject({...project,templateVersion:'2.0.0',hostContract:{...project.hostContract,tag:'v3.5.1'}}),/tag/);
});


test('runtime setup adapts a custom project with React in devDependencies without replacing its tooling',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'argocd-dev-runtime-')),dest=path.join(root,'project'),bin=path.join(root,'bin');
 await generate({...base,argoCdVersion:'3.5.1'},dest);
 const pkg=JSON.parse(await readFile(path.join(dest,'package.json'),'utf8'));
 delete pkg.dependencies;Object.assign(pkg.devDependencies,{react:'19.0.0','react-dom':'19.0.0',jest:'30.5.2'});
 pkg.version='0.7.0';pkg.scripts.package='sh scripts/custom-package.sh';
 await writeFile(path.join(dest,'package.json'),JSON.stringify(pkg));
 await mkdir(bin);const npm=path.join(bin,'npm');
 // Only intercept the registry/lock update; execute the actual setup and file merges.
 await writeFile(npm,'#!/usr/bin/env node\nprocess.exit(0);\n');await chmod(npm,0o755);
 const run=spawnSync(process.execPath,['scripts/setup-runtime.mjs'],{cwd:dest,encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
 assert.equal(run.status,0,run.stdout+run.stderr);
 const after=JSON.parse(await readFile(path.join(dest,'package.json'),'utf8'));
 assert.equal(after.devDependencies.react,'19.2.6');assert.equal(after.devDependencies['react-dom'],'19.2.6');
 assert.equal(after.dependencies,undefined);assert.equal(after.devDependencies.jest,'30.5.2');
 assert.equal(after.version,'0.7.0');assert.equal(after.scripts.package,pkg.scripts.package);
});
