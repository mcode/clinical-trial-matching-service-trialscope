/**
 * Mark URLs
 */
type URLString = string;

export interface BaseResource {
  resourceType: string;
  id?: string;
}

export interface BundleEntry {
  resource: Resource;
  fullUrl?: URLString;
}

export interface Bundle extends BaseResource {
  resourceType: 'Bundle';
  type: 'collection';
  entry: BundleEntry[];
}

export interface Parameters extends BaseResource {
  resourceType: 'Parameters';
  parameter: { name: string; valueString: string; }[];
}

export interface Code {
  coding: { system: URLString, code: string, display?: string }[];
  text?: string;
}

export interface Condition extends BaseResource {
  resourceType: 'Condition';
  code: Code;
}

export type Resource = Condition | Parameters;

export default Bundle;
