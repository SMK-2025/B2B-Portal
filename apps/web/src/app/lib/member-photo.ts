/** Bound portrait uploads and strip file metadata before storing them in a profile. */
export async function readMemberPhoto(file:File):Promise<string>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10_000_000)throw new Error('Bitte PNG, JPG oder WebP mit maximal 10 MB auswählen.');
  const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('Dieses Foto konnte nicht gelesen werden. Bitte eine andere Bilddatei wählen.');});
  try{
    const scale=Math.min(1,384/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('Das Foto konnte nicht vorbereitet werden.');
    context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.85);if(data.length>200_000)throw new Error('Bitte ein kleineres Foto wählen.');return data;
  }finally{bitmap.close();}
}
