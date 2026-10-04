import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {contracts, normalize} from '../scripts/contract.mjs';
import {generate} from '../scripts/generate.mjs';

const profiles=['resource-tab','system-level','status-panel','top-bar-action','app-view'];
const synthetic={sourceKind:'official',tag:'v4.2.1',sources:['extensions-service.ts','index.tsx','package.json','pnpm-lock.yaml'].map(file=>`https://github.com/argoproj/argo-cd/blob/v4.2.1/ui/${file}`),profile:'resource-tab',method:'registerResourceExtension',signature:'registerResourceExtension(component, group, kind, tabTitle, opts?)',props:['application','resource','tree'],globals:['React','ReactDOM','ReactJSXRuntime'],jsxMode:'automatic',argumentMap:['component','registration.group','registration.kind','registration.tabTitle','registration.iconOptions']};
test('representative release contracts expose exact signatures, props, and globals',()=>{
  for(const version of ['3.0.0','3.5.1','3.5.3']) for(const profile of profiles){
    const project=normalize({name:'profile-test',description:'profile contract',argoCdVersion:version,profile});
    assert.equal(project.hostContract.tag,`v${version}`);
    assert(project.hostContract.sources.every(url=>url.includes(`/blob/v${version}/`)));
    assert.equal(project.hostContract.signature,contracts[version].methods[profile]);
    assert.deepEqual(project.hostContract.props,contracts[version].props[profile]);
    assert(project.hostContract.globals.includes('React'));
  }
  assert(!contracts['3.0.0'].globals.includes('ReactJSXRuntime'));
  assert(contracts['3.5.3'].globals.includes('ReactJSXRuntime'));
  assert.match(contracts['3.0.0'].methods['system-level'],/component, title, path, icon/);
  assert(!contracts['3.0.0'].methods['app-view'].includes('shouldDisplay'));
  assert(contracts['3.5.3'].methods['app-view'].includes('shouldDisplay'));
});
test('missing profile in an otherwise known release fails with alternatives before writing',async()=>{
  const version='9.9.9';contracts[version]={tag:'v9.9.9',sources:['extensions-service.ts'],globals:['React'],methods:{'resource-tab':'registerResourceExtension(component, group, kind, tabTitle)'},props:{'resource-tab':[]}};
  const parent=await mkdtemp(path.join(tmpdir(),'argocd-profile-'));
  try {await assert.rejects(generate({name:'missing-profile',description:'missing',argoCdVersion:version,profile:'app-view'},path.join(parent,'dest')),/unavailable.*Available profiles: resource-tab/);}
  finally {delete contracts[version];}
});
test('accepts an audited unbundled official tag and binds exact registration evidence',async()=>{
  const parent=await mkdtemp(path.join(tmpdir(),'argocd-custom-contract-'));
  const project=await generate({name:'synthetic-release',description:'unbundled audited release',argoCdVersion:'4.2.1',profile:'resource-tab',hostContract:synthetic},path.join(parent,'project'));
  const manifest=JSON.parse(await readFile(path.join(project.destination,'extension-project.json'),'utf8'));
  assert.deepEqual(manifest.hostContract,synthetic);
  assert.equal(manifest.compatibility.localBuild,'not-run');assert.deepEqual(manifest.compatibility.integrated,[]);
  const register=await readFile(path.join(project.destination,'src/argocd/register.ts'),'utf8');
  assert.match(register,/Reflect\.apply/);assert.doesNotMatch(register,/argoCdVersion ===/);
});
test('rejects custom contract tag, source, profile, method mapping, and JSX globals mismatches',()=>{
  const base={name:'synthetic-release',description:'custom tag',argoCdVersion:'4.2.1',profile:'resource-tab',hostContract:synthetic};
  assert.equal(normalize(base).hostContract.tag,'v4.2.1');
  for(const hostContract of [
    {...synthetic,tag:'v4.2.0'},
    {...synthetic,sources:synthetic.sources.map(url=>url.replace('v4.2.1','v4.2.0'))},
    {...synthetic,profile:'app-view'},
    {...synthetic,method:'registerAppViewExtension'},
    {...synthetic,argumentMap:['component']},
    {...synthetic,jsxMode:'automatic',globals:['React','ReactDOM']}
  ]) assert.throws(()=>normalize({...base,hostContract}),/hostContract|Host contract source|profile|signature|argumentMap|ReactJSXRuntime/);
  assert.throws(()=>normalize({...base,hostContract:undefined,argoCdVersion:'4.2.2'}),/Supply an audited hostContract/);
});
test('rejects top-bar optional arguments mapped to the wrong signature positions',()=>{
  const hostContract={...synthetic,profile:'top-bar-action',method:'registerTopBarActionMenuExt',signature:'registerTopBarActionMenuExt(component, title, id, flyout, shouldDisplay?, iconClassName?, isMiddle?)',argumentMap:['component','registration.title','registration.id','component.flyout','registration.isMiddle','registration.icon','callback.shouldDisplay']};
  assert.throws(()=>normalize({name:'synthetic-release',description:'misaligned arguments',argoCdVersion:'4.2.1',profile:'top-bar-action',hostContract}),/argumentMap\[4\].*shouldDisplay/);
});
test('accepts fork evidence only when explicitly labeled custom and retains that identity',()=>{
  const fork={...synthetic,sourceKind:'custom',tag:'fork-commit-a1b2c3',sources:['extensions-service.ts','index.tsx','package.json','pnpm-lock.yaml'].map(file=>`https://git.example.test/platform/argo-cd/blob/fork-commit-a1b2c3/ui/${file}`)};
  const project=normalize({name:'fork-extension',description:'custom host contract',argoCdVersion:'3.5.3',profile:'resource-tab',hostContract:fork});
  assert.equal(project.hostContract.sourceKind,'custom');assert.equal(project.hostContract.tag,'fork-commit-a1b2c3');
  assert.throws(()=>normalize({name:'fork-extension',description:'bad URL',argoCdVersion:'3.5.3',profile:'resource-tab',hostContract:{...fork,sources:fork.sources.map(url=>url.replace('https:','http:'))}}),/HTTPS source URL/);
});
test('all five UI profiles generate provenance for both audited contract versions',async()=>{
  const parent=await mkdtemp(path.join(tmpdir(),'argocd-five-profiles-'));
  for(const version of ['3.0.0','3.5.1','3.5.3']) for(const profile of profiles){
    const destination=path.join(parent,`${version}-${profile}`);
    await generate({name:'profile-test',description:'profile contract',argoCdVersion:version,profile},destination);
    const manifest=JSON.parse(await readFile(path.join(destination,'extension-project.json'),'utf8'));
    assert.equal(manifest.profile,profile);assert.equal(manifest.hostContract.tag,`v${version}`);
    assert.equal(manifest.hostContract.signature,contracts[version].methods[profile]);
    assert.deepEqual(manifest.compatibility.integrated,[]);
  }
});
