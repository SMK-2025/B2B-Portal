import {BadRequestException} from '@nestjs/common';
import {decodePublicImage} from './homepage-media';
export function memberPhoto(value:unknown,previous?:string|null):string|null{
  if(value===undefined)return previous||null;
  if(value===null||value==='')return null;
  const image=decodePublicImage(value);
  if(!image||image.bytes.length>150_000)throw new BadRequestException('Das persönliche Foto muss ein PNG-, JPG- oder WebP-Bild bis 150 KB sein. Bitte die Foto-Uploadfunktion nutzen; sie verkleinert das Bild automatisch.');
  return value as string;
}
