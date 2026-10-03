import type {ComponentType} from 'react';
// Readonly subset of v3.5.3 ExtensionComponentProps and shared/models.ts.
// Optional fields permit missing preview/context data without mutating host objects.
export interface Metadata {readonly name?: string; readonly namespace?: string; readonly labels?: Readonly<Record<string, string>>}
export interface Application {readonly metadata?: Metadata; readonly spec?: {readonly project?: string}; readonly status?: {readonly health?: {readonly status?: string}; readonly sync?: {readonly status?: string}}}
export interface ResourceState {readonly group?: string; readonly kind?: string; readonly metadata?: Metadata; readonly spec?: Readonly<Record<string, unknown>>; readonly status?: Readonly<Record<string, unknown>>}
export interface ResourceNode {readonly group?: string; readonly kind?: string; readonly name?: string; readonly namespace?: string; readonly uid?: string}
export interface ApplicationTree {readonly nodes?: readonly ResourceNode[]}
export interface ExtensionProps {readonly application?: Application; readonly resource?: ResourceState; readonly tree?: ApplicationTree}
export interface ExtensionsAPI {registerResourceExtension(component: ComponentType<ExtensionProps>, group: string, kind: string, tabTitle: string): void}
declare global {interface Window {extensionsAPI?: ExtensionsAPI}}
