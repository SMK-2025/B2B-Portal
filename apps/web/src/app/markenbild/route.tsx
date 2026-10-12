import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export async function GET() {
  const symbol = await readFile(join(process.cwd(), "public/icons/b2b-matching-symbol-brand.png"));
  return new ImageResponse(<div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f4faff,#eceaff)", color:"#292343", fontFamily:"sans-serif" }}><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><img alt="" src={`data:image/png;base64,${symbol.toString("base64")}`} width={245} height={216}/><div style={{display:"flex",fontSize:44,fontWeight:700,marginTop:28}}>B2B Matching</div><div style={{display:"flex",fontSize:32,marginTop:14,color:"#536780"}}>Partnerportal für Netzwerke</div></div></div>, { width:1200, height:630, headers:{"Cache-Control":"public, max-age=86400"} });
}
