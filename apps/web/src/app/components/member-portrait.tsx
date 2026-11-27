import '../member-portrait.css';
export function MemberPortrait({photo,name}:{photo?:string|null;name?:string}){
  return photo?<img className="memberPortrait" src={photo} alt={`Foto von ${name||'Ihrem Ansprechpartner'}`} width={64} height={64} loading="lazy" decoding="async"/>:null;
}
