import {test} from "node:test";
import assert from "node:assert/strict";
import {parseMonthlyContribution,contributionTotals,contributionRegistrationHref,validContributionCents} from "../src/app/lib/member-contribution.ts";
test("selected city contribution travels as exact integer cents, not an unchecked decimal",()=>{
 const url=new URL(contributionRegistrationHref("unternehmernetzwerkfrankfurtammain","25,00",true),"http://localhost");
 assert.equal(url.searchParams.get("selectedMonthlyNetCents"),"2500");
 assert.equal(url.searchParams.get("network"),"unternehmernetzwerkfrankfurtammain");
 assert.equal(url.searchParams.get("contributionPreview"),"1");
 assert.equal(contributionRegistrationHref("city","9,89"),null);
 for(const value of [null,"", "989", "2500.5", "1e4", "-1","100000001"]) assert.equal(validContributionCents(value),null);
 assert.equal(validContributionCents("2500"),2500);
});
test("decimal contribution input is exact and rejects below-minimum or malformed amounts",()=>{
  for(const [text,cents] of [["9,90",990],["9.90",990],["25",2500],["10,01",1001]]) assert.equal(parseMonthlyContribution(text,990),cents);
  for(const value of ["", "9,89", "-20", "1e3", "20,001", "1.000,00", "abc", "1000001"]) assert.equal(parseMonthlyContribution(value,990),null);
});
test("twelve-month totals reflect the freely chosen amount without changing the offer",()=>{
  const quote={monthlyNetCents:990,annualNetCents:11880,vatCents:2257,grossCents:14137,months:12,contribution:{minimumMonthlyNetCents:990,selectedMonthlyNetCents:990,version:"v1"}};
  assert.equal(contributionTotals(quote,2500).grossCents,35700);
  assert.equal(contributionTotals(quote,2500).contribution.selectedMonthlyNetCents,2500);
  assert.equal(quote.monthlyNetCents,990);
  assert.equal(contributionTotals(quote,null),quote);
});
