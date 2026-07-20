declare module "postgres" {
  export type Sql = {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    unsafe(query: string, parameters?: unknown[]): Promise<unknown[]>;
    begin<T>(callback: (sql: Sql) => Promise<T>): Promise<T>;
    end(options?: { timeout?: number }): Promise<void>;
  };
  export default function postgres(
    url: string,
    options?: Record<string, unknown>,
  ): Sql;
}
