export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options";

export interface ApiInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
}

export interface ServerConfig {
  readonly baseUrl: string;
}

export interface Schema {
  readonly id: string;
  readonly type:
    | "object"
    | "array"
    | "string"
    | "integer"
    | "number"
    | "boolean";
  readonly description?: string;
  readonly nullable: boolean;
  readonly format?: string;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
  readonly examples?: readonly unknown[];
  readonly required?: readonly string[];
  readonly properties?: readonly SchemaProperty[];
  readonly items?: Schema;
}

export interface SchemaProperty {
  readonly name: string;
  readonly schema: Schema;
}

export interface Parameter {
  readonly name: string;
  readonly location: "path" | "query" | "header" | "cookie";
  readonly required: boolean;
  readonly description?: string;
  readonly schema: Schema;
}

export interface RequestBody {
  readonly required: boolean;
  readonly contentType: string;
  readonly schema: Schema;
}

export interface Response {
  readonly statusCode: string;
  readonly description?: string;
  readonly schema?: Schema;
}

export interface Authentication {
  readonly id: string;
  readonly type: "apiKey" | "bearer";
  readonly location: "header" | "query" | "cookie";
  readonly parameterName: string;
  readonly envVariable: string;
}

export interface Endpoint {
  readonly id: string;
  readonly name: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
  readonly authentication: readonly string[];
  readonly parameters: readonly Parameter[];
  readonly requestBody?: RequestBody;
  readonly responses: readonly Response[];
  readonly primaryResponse?: Response;
}

export interface ApiModel {
  readonly info: ApiInfo;
  readonly server: ServerConfig;
  readonly authentication: readonly Authentication[];
  readonly endpoints: readonly Endpoint[];
  readonly schemas: readonly Schema[];
}

export function freezeApiModel(model: ApiModel): Readonly<ApiModel> {
  return Object.freeze({
    info: Object.freeze({ ...model.info }),
    server: Object.freeze({ ...model.server }),
    authentication: Object.freeze([...model.authentication]),
    endpoints: Object.freeze([...model.endpoints]),
    schemas: Object.freeze([...model.schemas]),
  });
}
