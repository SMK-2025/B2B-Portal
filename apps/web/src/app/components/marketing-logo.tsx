export function MarketingLogo({large=false}:{large?:boolean}) {
  return <img src="/images/optimized/brand-480.webp" srcSet="/images/optimized/brand-480.webp 480w, /images/optimized/brand-960.webp 960w" sizes={large?"(max-width: 700px) 90vw, 400px":"240px"} alt="B2B Matching" width="240" height="40" decoding="async"/>;
}
