import { createHash } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";

export type StoreCollections = Record<string, Map<string, any> | any[]>;
export interface StorageSql {
  unsafe(query: string, parameters?: any[]): Promise<any[]>;
  begin<T>(work: (tx: StorageSql) => Promise<T>): Promise<T>;
}
type Media = { hash: string; mime: string; bytes: Buffer };
type MediaRef = { path: string[]; hash: string };
type Encoded = { payload: string; refs: MediaRef[]; media: Media[] };
type Row = { collection: string; record_key: string; network_id: string | null;
  ordinal: number; payload: unknown; media_refs: MediaRef[]; media_hashes: string[]; fingerprint: string };
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Binary content is private database storage, never a public asset endpoint.
 * Existing access checks still govern every profile/document/chat response.
 * Deliberately single-writer: CAS prevents multi-instance lost updates.
 */
export class RecordPersistence {
  private baseline = new Map<string, string>();
  private knownMedia = new Set<string>();
  private mediaCache = new Map<string, Omit<Media,'bytes'> & {bytes?:Buffer}>();
  private encode(value: unknown): Encoded {
    const refs: MediaRef[] = [], media: Media[] = [];
    const visit = (v: any, path: string[]): any => {
      if (typeof v === "string" && v.length >= 512 && v.startsWith("data:")) {
        let item = this.mediaCache.get(v);
        if (!item) {
          const match = /^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(v);
          if (match) {
            const bytes = Buffer.from(match[2], "base64");
            if (bytes.length > 16_777_216) throw new Error("Upload exceeds storage limit");
            const hash=digest(match[1] + ":" + match[2]);
            item = {hash, mime: match[1], ...(!this.knownMedia.has(hash)?{bytes}:{})};
            if (this.mediaCache.size >= 2000) this.mediaCache.clear();
            this.mediaCache.set(v, item);
          }
        }
        if (item) {
          refs.push({path, hash:item.hash});
          if(!this.knownMedia.has(item.hash))media.push({...item,bytes:item.bytes||Buffer.from(v.slice(v.indexOf(',')+1),'base64')});
          return null;
        }
      }
      if (Array.isArray(v)) return v.map((item, i) => visit(item, [...path, String(i)]));
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k,item]) => [k,visit(item,[...path,k])]));
      return v;
    };
    return { payload: JSON.stringify(visit(value, [])), refs, media };
  }
  private rows(collections: StoreCollections) {
    const organizations = new Map<string, string>();
    for (const member of (collections.networkMemberships || []) as any[]) {
      if (member.organizationId && member.networkId && !organizations.has(member.organizationId))
        organizations.set(member.organizationId, member.networkId);
    }
    const result: Array<{row: Row; media: Media[]}> = [];
    for (const [collection, values] of Object.entries(collections)) {
      const entries = values instanceof Map ? [...values] : values.map((v,i) => [String(v?.id || i), v]);
      const seen = new Set<string>();
      entries.forEach(([key, value], ordinal) => {
        key = String(key);
        if (seen.has(key)) throw new Error(`Duplicate storage key in ${collection}`);
        seen.add(key);
        const encoded = this.encode(value);
        const network = value?.networkId || (collection === "networks" ? key : collection === "organizations" ? organizations.get(key) : null);
        const fingerprint = digest(JSON.stringify([ordinal, network || null, encoded.payload, encoded.refs]));
        result.push({row:{collection, record_key:key, network_id:network || null, ordinal,
          payload:JSON.parse(encoded.payload), media_refs:encoded.refs,
          media_hashes:[...new Set(encoded.refs.map(r=>r.hash))], fingerprint}, media:encoded.media});
      });
    }
    return result;
  }
  fingerprint(collections: StoreCollections): string {
    return digest(this.rows(collections).map(({row:r}) => `${r.collection}:${r.record_key}:${r.fingerprint}`).join("\n"));
  }
  async save(sql: StorageSql, revision: number, collections: StoreCollections): Promise<number> {
    const rows = this.rows(collections), current = new Map<string,string>();
    const changed: Row[] = [], media = new Map<string, Media>();
    for (const {row,media:files} of rows) {
      const key = JSON.stringify([row.collection,row.record_key]); current.set(key,row.fingerprint);
      if (this.baseline.get(key) !== row.fingerprint) changed.push(row);
      for (const file of files) if (!this.knownMedia.has(file.hash)) media.set(file.hash,file);
    }
    const removed = [...this.baseline.keys()].filter(k=>!current.has(k)).map(k=>{const [collection,record_key]=JSON.parse(k);return {collection,record_key};});
    const counts = Object.fromEntries(Object.entries(collections).map(([k,v])=>[k,v instanceof Map?v.size:v.length]));
    const networkHeaders = [...(collections.networks as Map<string,any> || new Map())].map(([id,n])=>[id,{settings:{
      launchPromotion:n.settings?.launchPromotion, memberBilling:n.settings?.memberBilling,
      memberPaymentModel:n.settings?.memberPaymentModel, billingMode:n.settings?.billingMode,
    }}]);
    const manifest = JSON.stringify({storageVersion:2, counts, networks:networkHeaders});
    const next = await sql.begin(async tx => {
      const barrier = await tx.unsafe(`INSERT INTO portal_state(id,payload,revision,updated_at)
        VALUES ('primary',$1::jsonb,1,now()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,
        revision=portal_state.revision+1,updated_at=now() WHERE portal_state.revision=$2 RETURNING revision`, [manifest,revision]);
      if (!barrier.length) throw new ServiceUnavailableException("Paralleler Datenbankzugriff erkannt. Bitte den Server neu verbinden.");
      for (const file of media.values()) await tx.unsafe("INSERT INTO portal_media(hash,mime_type,bytes) VALUES($1,$2,$3) ON CONFLICT(hash) DO NOTHING",[file.hash,file.mime,file.bytes]);
      for (let offset=0; offset<changed.length; offset+=100) await tx.unsafe(`INSERT INTO portal_records(collection,record_key,network_id,ordinal,payload,media_refs,media_hashes,fingerprint)
        SELECT collection,record_key,network_id,ordinal,payload,media_refs,media_hashes,fingerprint
        FROM jsonb_to_recordset($1::jsonb) AS x(collection text,record_key text,network_id text,ordinal integer,payload jsonb,media_refs jsonb,media_hashes text[],fingerprint text)
        ON CONFLICT(collection,record_key) DO UPDATE SET network_id=EXCLUDED.network_id,ordinal=EXCLUDED.ordinal,payload=EXCLUDED.payload,
        media_refs=EXCLUDED.media_refs,media_hashes=EXCLUDED.media_hashes,fingerprint=EXCLUDED.fingerprint,updated_at=now()`,[JSON.stringify(changed.slice(offset,offset+100))]);
      if (removed.length) await tx.unsafe(`DELETE FROM portal_records r USING jsonb_to_recordset($1::jsonb) AS x(collection text,record_key text)
        WHERE r.collection=x.collection AND r.record_key=x.record_key`,[JSON.stringify(removed)]);
      if (changed.length || removed.length) await tx.unsafe("DELETE FROM portal_media m WHERE NOT EXISTS(SELECT 1 FROM portal_records r WHERE r.media_hashes @> ARRAY[m.hash])");
      return Number(barrier[0].revision);
    });
    this.baseline=current;
    this.knownMedia = new Set(rows.flatMap(({row})=>row.media_hashes));
    for(const [value,item] of this.mediaCache){if(!this.knownMedia.has(item.hash))this.mediaCache.delete(value);else delete item.bytes;}
    return next;
  }
  async load(sql: StorageSql, manifest: any, templates: StoreCollections): Promise<Record<string,any>> {
    if (manifest.storageVersion !== 2) throw new Error("Unsupported storage version");
    const rows = await sql.unsafe("SELECT collection,record_key,network_id,ordinal,payload,media_refs,media_hashes,fingerprint FROM portal_records ORDER BY collection,ordinal");
    const files = await sql.unsafe("SELECT hash,mime_type,bytes FROM portal_media");
    const assets = new Map<string,string>();
    for (const f of files) {
      const bytes=Buffer.from(f.bytes), dataUrl=`data:${f.mime_type};base64,${bytes.toString('base64')}`;
      if (digest(f.mime_type+":"+bytes.toString('base64')) !== f.hash) throw new Error("Stored upload checksum mismatch");
      assets.set(f.hash,dataUrl);
    }
    const state: Record<string,any> = Object.fromEntries(Object.keys(templates).map(k=>[k,[]]));
    const baseline=new Map<string,string>();
    for (const row of rows as Row[]) {
      if (!(row.collection in templates)) throw new Error("Unknown stored collection");
      let value=row.payload;
      for (const ref of row.media_refs || []) {
        const asset=assets.get(ref.hash); if (!asset) throw new Error("Missing stored upload");
        if (!ref.path.length) {value=asset;continue;}
        let parent:any=value;
        for (const part of ref.path.slice(0,-1)) {
          if (["__proto__","constructor","prototype"].includes(part) || !Object.hasOwn(parent,part)) throw new Error("Invalid media path");
          parent=parent[part];
        }
        const key=ref.path.at(-1)!;
        if (["__proto__","constructor","prototype"].includes(key) || !Object.hasOwn(parent,key)) throw new Error("Invalid media path");
        parent[key]=asset;
      }
      state[row.collection].push(templates[row.collection] instanceof Map ? [row.record_key,value] : value);
      baseline.set(JSON.stringify([row.collection,row.record_key]),row.fingerprint);
    }
    for (const [name,entries] of Object.entries(state)) if (entries.length !== manifest.counts?.[name]) throw new Error(`Storage count mismatch: ${name}`);
    this.baseline=baseline; this.knownMedia=new Set(assets.keys());
    return state;
  }
}
