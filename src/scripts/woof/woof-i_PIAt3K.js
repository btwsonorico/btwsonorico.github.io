import{a as e,c as t,i as n,l as r,n as i,o as a,r as o,s,t as c,u as l}from"./decoder-0TmyPaji.js";var u=`\\p{L}\\p{N}_`,d=`\\t-\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000`;function f(e,t=``){let n=``,r=!1;for(let t=0;t<e.length;t++){let i=e[t];if(i===`\\`){let i=e[++t];n+=i===`w`?r?u:`[${u}]`:i===`W`?`[^${u}]`:i===`d`?`\\p{Nd}`:i===`s`?r?d:`[${d}]`:i===`b`?`(?:(?<=[${u}])(?![${u}])|(?<![${u}])(?=[${u}]))`:`\\${i}`}else i===`[`&&!r?(r=!0,n+=i):i===`]`&&r?(r=!1,n+=i):n+=i===`$`&&!r?`(?=\\n?$)`:i}return new RegExp(n,`gu${t}`)}function p(e,t,n){return e.replace(t,(...e)=>{let t=e.length-3,r=e.slice(1,1+t);return n({0:e[0],g:t=>t===0?e[0]:r[t-1],offset:e[t+1],string:e[t+2]})})}var m=BigInt(0),h=BigInt(1),g=BigInt(10),_=BigInt(12),v=BigInt(20),y=BigInt(31),b=BigInt(100),x=BigInt(1e3),S=BigInt(2e3),C=BigInt(2009),w=e=>/^\p{Nd}$/u.test(e);function T(e){let t=e.codePointAt(0);if(t>=48&&t<=57)return t-48;let n=t;for(;w(String.fromCodePoint(n-1));)n--;return(t-n)%10}function E(e){let t=m;for(let n of e)t=t*g+BigInt(T(n));return t}var D=e=>e.length>0&&[...e].every(w),O=e=>e.length>0&&/^\p{L}+$/u.test(e),k=e=>/\p{Lowercase}/u.test(e)&&!/[\p{Uppercase}\p{Lt}]/u.test(e),A=e=>/\p{Uppercase}/u.test(e)&&!/[\p{Lowercase}\p{Lt}]/u.test(e),ee=e=>e&&e[0].toUpperCase()+e.slice(1).toLowerCase(),j=e=>e.replace(f(`^\\s+|\\s+(?![^]*[^${d}])`),``),M=e=>[...e].length,N=e=>e?String.fromCodePoint(e.codePointAt(0)):``,P=`zero one two three four five six seven eight nine`.split(` `);function F(e){return[...e].filter(w).map(e=>P[T(e)]).join(` `)}function I(e){let t=[];for(let n of e)w(n)?t.push(P[T(n)]):O(n)&&t.push(n.toUpperCase());return t.join(` `)}function L(e){return e=e.toLowerCase(),M(e)<4||!/[aeiouy]/u.test(e)||/[^aeiouy]{3,}/u.test(e)&&!/(str|sch|thr|chr|spr|scr|ght|nds|nts)/u.test(e)?!1:/^(?:(?:[^aeiouy]{0,3}[aeiouy]{1,2})+[^aeiouy]{0,3})$/u.test(e)}function R(e){let t=[];for(let n of e.split(/[-/]/u))n&&(D(n)?t.push(M(n)<=2&&N(n)!==`0`?n:F(n)):O(n)&&k(n)&&M(n)>3&&L(n)?t.push(n):O(n)&&L(n)?t.push(ee(n)):t.push(I(n)));return t.join(` `)}var te=[[String.raw`\bDr\.(?=\s+[A-Z])`,`Doctor`],[String.raw`\bMr\.`,`Mister`],[String.raw`\bMrs\.`,`Missus`],[String.raw`\bMs\.`,`Miz`],[String.raw`\bProf\.(?=\s+[A-Z])`,`Professor`],[String.raw`\bSt\.(?=\s+[A-Z])`,`Saint`],[String.raw`(?<=[a-z] )St\.`,`Street`],[String.raw`\bRd\.`,`Road`],[String.raw`\bAve\.`,`Avenue`],[String.raw`\bBlvd\.`,`Boulevard`],[String.raw`\bApt\.`,`Apartment`],[String.raw`\b[Aa]pprox\.`,`approximately`],[String.raw`\betc\.`,`et cetera`],[String.raw`\be\.g\.`,`for example`],[String.raw`\bi\.e\.`,`that is`],[String.raw`\bvs\.?(?=\s)`,`versus`],[String.raw`\bNo\.(?=\s*\d)`,`number`],[String.raw`\bdept\.`,`department`],[String.raw`\bext\.`,`extension`],[String.raw`\bmin\.`,`minutes`],[String.raw`\bhr?s?\.(?=\s)`,`hours`],[String.raw`\bSgt\.`,`Sergeant`],[String.raw`\bCapt\.`,`Captain`],[String.raw`\bLt\.`,`Lieutenant`],[String.raw`\bCol\.`,`Colonel`],[String.raw`\bGen\.(?=\s+[A-Z])`,`General`],[String.raw`\bGov\.`,`Governor`],[String.raw`\bSen\.`,`Senator`],[String.raw`\bRep\.(?=\s+[A-Z])`,`Representative`],[String.raw`\bRev\.`,`Reverend`],[String.raw`\bHon\.`,`Honorable`],[String.raw`\bJr\.`,`Junior`],[String.raw`\bSr\.`,`Senior`],[String.raw`\bLn\.`,`Lane`],[String.raw`\bDr\.(?=[\s,.]|$)`,`Drive`],[String.raw`\bCt\.`,`Court`],[String.raw`\bPl\.`,`Place`],[String.raw`\bSq\.`,`Square`],[String.raw`\bHwy\.`,`Highway`],[String.raw`\bPkwy\.`,`Parkway`],[String.raw`\bMt\.`,`Mount`],[String.raw`\bFt\.(?=\s+[A-Z])`,`Fort`],[String.raw`\bSte\.`,`Suite`],[String.raw`\bBldg\.`,`Building`],[String.raw`\bfl\.`,`floor`],[String.raw`\bFl\.`,`Floor`],[String.raw`\bRm\.`,`Room`],[String.raw`\bEst\.`,`Estimated`],[String.raw`\best\.`,`estimated`],[String.raw`\bInc\.`,`Incorporated`],[String.raw`\bLtd\.`,`Limited`],[String.raw`\bCo\.(?=\s)`,`Company`],[String.raw`\bCorp\.`,`Corporation`],[String.raw`\bDept\.`,`Department`],[String.raw`\bAssn\.`,`Association`],[String.raw`\bUniv\.`,`University`],[String.raw`\bqty\.?`,`quantity`],[String.raw`\bref\.`,`reference`],[String.raw`\btel\.`,`telephone`],[String.raw`\bTel\.`,`Telephone`],[String.raw`\bfig\.`,`figure`],[String.raw`\bvol\.`,`volume`],[String.raw`\bpp\.`,`pages`],[String.raw`\bp\.(?=\s*\d)`,`page`],[String.raw`\bwk\.`,`week`],[String.raw`\bmo\.`,`month`],[String.raw`\byr\.`,`year`],[String.raw`\bavg\.`,`average`],[String.raw`\bmax\.`,`maximum`]].map(([e,t])=>[f(e),t]),z={Mon:`Monday`,Tue:`Tuesday`,Tues:`Tuesday`,Wed:`Wednesday`,Thu:`Thursday`,Thur:`Thursday`,Thurs:`Thursday`,Fri:`Friday`,Sat:`Saturday`,Sun:`Sunday`},B=`January February March April May June July August September October November December`.split(` `),V=[[String.raw`\s*±\s*`,` plus or minus `],[String.raw`\s*≥\s*`,` greater than or equal to `],[String.raw`\s*≤\s*`,` less than or equal to `],[String.raw`\s*≠\s*`,` not equal to `],[String.raw`\s*≈\s*`,` approximately `],[String.raw`\s*÷\s*`,` divided by `],[String.raw`\s*→\s*`,` to `],[String.raw`\s*√\s*`,` square root of `],[String.raw`(?<=\d)\s*%`,` percent`],[String.raw`\s*‰`,` per mille`],[String.raw`\s+=\s+`,` equals `],[String.raw`(?<=\d)\s*<\s*(?=\d)`,` less than `],[String.raw`(?<=\d)\s*>\s*(?=\d)`,` greater than `],[String.raw`\s*&\s*`,` and `]].map(([e,t])=>[f(e),t]),H={km:`kilometers`,m:`meters`,cm:`centimeters`,mm:`millimeters`,kg:`kilograms`,g:`grams`,mg:`milligrams`,l:`liters`,L:`liters`,ml:`milliliters`,mL:`milliliters`,"km/h":`kilometers per hour`,mph:`miles per hour`,GB:`gigabytes`,MB:`megabytes`,TB:`terabytes`,kB:`kilobytes`,GHz:`gigahertz`,MHz:`megahertz`,kW:`kilowatts`,kWh:`kilowatt hours`,W:`watts`,V:`volts`,mAh:`milliamp hours`,ft:`feet`,in:`inches`,lb:`pounds`,lbs:`pounds`,oz:`ounces`,h:`hours`,min:`minutes`,s:`seconds`,ms:`milliseconds`},U=Object.keys(H).filter(e=>e!==`in`&&e!==`s`).sort((e,t)=>t.length-e.length),ne=e=>e.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`),re=e=>`${e}${e%100>=10&&e%100<=20?`th`:{1:`st`,2:`nd`,3:`rd`}[e%10]??`th`}`,W={email:f(String.raw`\b([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)\b`),http:f(String.raw`\bhttps?://`),www:f(String.raw`\bwww\.`),domain:f(String.raw`\b((?:[\w-]+\.)+)(com|org|net|io|ai|co|uk|dev|app|gov|edu|ly|me|tv|us|eu|de|fr|info|biz)\b`),file:f(String.raw`\b([\w-]+)\.(pdf|png|jpe?g|gif|docx?|xlsx?|csv|txt|zip|mp3|mp4|wav|json|py|js|html?)\b`),fname:f(String.raw`(?<![\w@])((?:/?[\w-]+/)*[\w-]*[a-z_][\w-]*)\.(conf|log|cfg|ini|yaml|yml|toml|md|sh|ts|tsx|css|xml|sql|db|bak|tmp|exe|dmg|apk|iso|tar|gz|rar|7z|svg|webp|heic|mov|avi|mkv|flac|ogg|m4a|key|pem|crt|env|lock|rs|go|java|kt|swift|rb|php|c|cpp|h)\b`),path:f(String.raw`(?<![\w])/((?:[\w.-]+/)*[\w.-]+)`),dayRange:f(String.raw`\b(`+Object.keys(z).join(`|`)+String.raw`)\.?\s*[-–]\s*(`+Object.keys(z).join(`|`)+String.raw`)\.?`),day:f(String.raw`\b(`+Object.keys(z).join(`|`)+String.raw`)\.(?=[\s,])`),month:f(String.raw`\b(`+B.join(`|`)+String.raw`)\.(?=\s*\d)`),iso:f(String.raw`\b(\d{4})-(\d{2})-(\d{2})\b`),dm:f(String.raw`(?<![\d/])\b(\d{1,2})/(\d{1,2})\b(?!/\d)`),dmAfter:f(String.raw`^\s*(stars?|points?|marks?|votes?)\b`),dmBefore:f(String.raw`(rated|scored?|rating|got)\s*$`),version:f(String.raw`\b(\d+(?:\.\d+){2,})(?:-(alpha|beta|rc\d*|preview))?\b`),score:f(String.raw`\b(\d{1,2}):(\d)\b(?!\d)`),ratio:f(String.raw`(?<=[Rr]atio of |[Rr]atio is )(\d{1,2}):(\d{1,2})\b`),letterCode:f(String.raw`\b[A-Z]{1,4}(?:-[A-Z0-9]{1,6})*-\d[A-Za-z0-9]*(?:-[A-Za-z0-9]+)*\b`),phone:f(String.raw`(?<![\w.,])\+?\(?\d{2,4}\)?(?:[\s.-]\(?\d{2,4}\)?){1,4}(?![\w.,]*\d)`),digitRun:f(String.raw`\d+`),service:f(String.raw`\b((?:[Cc]all|[Dd]ial|[Tt]ext|[Rr]ing)\s+)(\d{3,6})\b`),hash:f(String.raw`#(\d+)`),code:f(String.raw`\b(?=[A-Za-z0-9-]*\d)(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b`),capsCode:f(String.raw`\b(?=\w*\d)(?=\w*[A-Z])[A-Z0-9]{3,}\b`),mixedId:f(String.raw`\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{4,}\b`),notId:RegExp(`^(?:`+f(String.raw`\d+(?:st|nd|rd|th|am|pm|s|kg|km|mm|cm|ml|mg|gb|mb|tb|kb|ghz|mhz|kw|kwh|mah|hrs?|mins?|h|m|k|x|g|l|w|v)`).source+`)$`,`ui`),longDigits:f(String.raw`(?<![\d$€£.,])\b(\d{5,})\b(?![.,]\d)`),range:f(String.raw`(?<![\d/:.-])\b(\d{1,4})\s*[-–]\s*(\d{1,4})\b(?![/:.-]\d)`),hm:f(String.raw`\b(\d+)\s*h\s*(\d{1,2})\b`),hrs:f(String.raw`\b(\d+)\s*hrs?\b`),mins:f(String.raw`\b(\d+)\s*mins?\b`),units:f(String.raw`(\d(?:[\d.,]*\d)?)\s*(`+U.map(ne).join(`|`)+String.raw`)(?![\w/])`),times:f(String.raw`\s*×\s*`),x:f(String.raw`(?<=\d)\s+x\s+(?=\d)`),pence:f(String.raw`£(\d+)\.(\d{2})\b`),scaled:f(String.raw`([$€£])(\d+(?:\.\d+)?)(k|K|m|M|bn|b|B)\b`),spaces:f(String.raw`\s{2,}`)};function ie(e){e=p(e,W.email,e=>e.g(1).replaceAll(`.`,` dot `).replaceAll(`_`,` underscore `).replaceAll(`-`,` dash `)+` at `+e.g(2).replaceAll(`.`,` dot `).replaceAll(`-`,` dash `)),e=e.replace(W.http,``),e=e.replace(W.www,`w w w dot `),e=p(e,W.domain,e=>e.g(1).replaceAll(`.`,` dot `)+e.g(2)),e=p(e,W.file,e=>e.g(1).replaceAll(`_`,` underscore `)+` dot `+e.g(2)),e=p(e,W.fname,e=>e.g(1).replaceAll(`_`,` underscore `).replaceAll(`/`,` slash `).replaceAll(`-`,` dash `).replaceAll(`.`,` dot `)+` dot `+e.g(2)),e=p(e,W.path,e=>` slash `+e.g(1).replaceAll(`/`,` slash `)),e=p(e,W.dayRange,e=>z[e.g(1)]+` to `+z[e.g(2)]),e=p(e,W.day,e=>z[e.g(1)]),e=p(e,W.month,()=>{throw TypeError(`list indices must be integers or slices, not str`)});for(let[t,n]of te)e=e.replace(t,()=>n);e=p(e,W.iso,e=>{let t=E(e.g(2));return t>=h&&t<=_?`${B[Number(t)-1]} ${E(e.g(3))}, ${e.g(1)}`:e[0]}),e=p(e,W.dm,e=>{let t=Number(E(e.g(1))),n=Number(E(e.g(2))),r=e.offset+e[0].length,i=[...e.string.slice(r)].slice(0,12).join(``).toLowerCase(),a=[...e.string.slice(0,e.offset)].slice(-12).join(``).toLowerCase();return W.dmAfter.lastIndex=W.dmBefore.lastIndex=0,W.dmAfter.test(i)||W.dmBefore.test(a)?`${t} out of ${n}`:n>=1&&n<=12&&t>=1&&t<=31?`the ${re(t)} of ${B[n-1]}`:t>=1&&t<=12&&n>=1&&n<=31?`${B[t-1]} ${re(n)}`:e[0]}),e=p(e,W.version,e=>e.g(1).split(`.`).join(` point `)+(e.g(2)?` `+e.g(2):``)),e=p(e,W.score,e=>`${e.g(1)} to ${e.g(2)}`),e=p(e,W.ratio,e=>`${e.g(1)} to ${e.g(2)}`),e=p(e,W.letterCode,e=>R(e[0])),e=p(e,W.phone,e=>{let t=e[0];if([...t].filter(w).length<7)return t;let n=j(t).startsWith(`+`)?`plus `:``,r=t.match(W.digitRun)??[];return` `+n+r.map(F).join(`, `)+` `}),e=p(e,W.service,e=>e.g(1)+F(e.g(2))),e=p(e,W.hash,e=>`number `+(M(e.g(1))<=3?e.g(1):F(e.g(1)))),e=p(e,W.code,e=>R(e[0])),e=p(e,W.capsCode,e=>I(e[0])),e=p(e,W.mixedId,e=>W.notId.test(e[0])?e[0]:I(e[0])),e=p(e,W.longDigits,e=>F(e.g(1))),e=p(e,W.range,e=>`${e.g(1)} to ${e.g(2)}`),e=p(e,W.hm,e=>`${e.g(1)} hour${e.g(1)===`1`?``:`s`} ${e.g(2)}`),e=p(e,W.hrs,e=>`${e.g(1)} hour${e.g(1)===`1`?``:`s`}`),e=p(e,W.mins,e=>`${e.g(1)} minute${e.g(1)===`1`?``:`s`}`),e=p(e,W.units,e=>{let t=H[e.g(2)];return e.g(1)+` `+(e.g(1)===`1`&&t.endsWith(`s`)?t.slice(0,-1):t)}),e=e.replace(W.times,` by `),e=e.replace(W.x,` by `);for(let[t,n]of V)e=e.replace(t,()=>n);e=p(e,W.pence,e=>e.g(2)===`00`?`${e.g(1)} pounds`:`${e.g(1)} pounds ${E(e.g(2))}`);let t={k:`thousand`,K:`thousand`,m:`million`,M:`million`,bn:`billion`,b:`billion`,B:`billion`},n={$:`dollars`,"€":`euros`,"£":`pounds`};return e=p(e,W.scaled,e=>`${e.g(2)} ${t[e.g(3)]} ${n[e.g(1)]}`),j(e.replace(W.spaces,` `))}var G=`zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen`.split(` `),ae=`_ _ twenty thirty forty fifty sixty seventy eighty ninety`.split(` `),oe=[[BigInt(`1000000000000`),`trillion`],[BigInt(`1000000000`),`billion`],[BigInt(`1000000`),`million`],[x,`thousand`]],se={one:`first`,two:`second`,three:`third`,five:`fifth`,eight:`eighth`,nine:`ninth`,twelve:`twelfth`};function K(e){if(e<v)return G[Number(e)];if(e<b)return ae[Number(e/g)]+(e%g===m?``:` `+G[Number(e%g)]);if(e<x)return G[Number(e/b)]+` hundred`+(e%b===m?``:` and `+K(e%b));for(let[t,n]of oe)if(e>=t){let r=e%t,i=r===m?``:(r<b?` and `:` `)+K(r);return K(e/t)+` `+n+i}return String(e)}function q(e){let t=K(e).split(` `),n=t[t.length-1];return t[t.length-1]=se[n]??(n.endsWith(`y`)?n.slice(0,-1)+`ieth`:n+`th`),t.join(` `)}function ce(e){if(e>=S&&e<=C)return K(e);let t=e/b,n=e%b;return K(t)+(n===m?` hundred`:n<g?` oh `+G[Number(n)]:` `+K(n))}function le(e){e=e.replaceAll(`,`,``);let t=e.indexOf(`.`);if(t>=0){let n=e.slice(0,t),r=e.slice(t+1);return(n?K(E(n)):`zero`)+` point `+[...r].map(e=>G[T(e)]).join(` `)}return K(E(e))}var J={money:f(String.raw`([$€£])(\d[\d,]*)(?:\.(\d{2}))?\b`),clock:f(String.raw`\b(\d{1,2}):(\d{2})\s*([aApP]\.?[mM])?(?:\.(?=\s+[a-z]))?(?=\W|$)`),ampm:f(String.raw`\b(\d{1,2})\s*([aApP])\.?[mM](?:\.(?=\s+[a-z]))?(?=\W|$)`),date:f(String.raw`\b(\d{1,2})/(\d{1,2})/(\d{4}|\d{2})\b`),monthDay:f(String.raw`\b(`+B.join(`|`)+String.raw`)\.? (\d{1,2})\b(?!:)`),celsius:f(String.raw`(\d)\s?°\s?C\b`),fahrenheit:f(String.raw`(\d)\s?°\s?F\b`),degrees:f(String.raw`(\d)\s?°`),slash:f(String.raw`(?<=\w)/(?=\w)`),ordinal:f(String.raw`\b(\d+)(st|nd|rd|th)\b`),year:f(String.raw`\b(1[1-9]\d\d|20\d\d)\b(?![.,]\d)`),minus:f(String.raw`(?<![\w-])-(?=\d)`),letterDigit:f(String.raw`(?<=[A-Za-z])(?=\d)`),percent:f(String.raw`(\d+(?:\.\d+)?)\s?%`),number:f(String.raw`\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b`)};function ue(e){let t={$:[`dollar`,`dollars`,`cent`,`cents`],"€":[`euro`,`euros`,`cent`,`cents`],"£":[`pound`,`pounds`,`penny`,`pence`]};return e=p(e,J.money,e=>{let[n,r,i,a]=t[e.g(1)],o=E(e.g(2).replaceAll(`,`,``)),s=`${K(o)} ${o===h?n:r}`;if(e.g(3)&&E(e.g(3))){let t=E(e.g(3));s+=` ${K(t)} ${t===h?i:a}`}return s}),e=p(e,J.clock,e=>{let t=E(e.g(1)),n=E(e.g(2)),r=K(t)+(n===m?e.g(3)?``:` o'clock`:n<g?` o `+G[Number(n)]:` `+K(n));return e.g(3)&&(r+=` `+e.g(3).replaceAll(`.`,``).toUpperCase()),r}),e=p(e,J.ampm,e=>`${K(E(e.g(1)))} ${e.g(2).toUpperCase()}M`),e=p(e,J.date,e=>{let t=E(e.g(1)),n=E(e.g(2));if(!(t>=h&&t<=_&&n>=h&&n<=y))return e[0];let r=E(e.g(3))+(M(e.g(3))===2?S:m);return`${B[Number(t)-1]} ${q(n)} ${ce(r)}`}),e=p(e,J.monthDay,e=>`${e.g(1)} ${q(E(e.g(2)))}`),e=p(e,J.celsius,e=>`${e.g(1)} degrees Celsius`),e=p(e,J.fahrenheit,e=>`${e.g(1)} degrees Fahrenheit`),e=p(e,J.degrees,e=>`${e.g(1)} degrees`),e=e.replace(J.slash,` slash `),e=p(e,J.ordinal,e=>q(E(e.g(1)))),e=p(e,J.year,e=>ce(E(e.g(1)))),e=e.replace(J.minus,`minus `),e=e.replace(J.letterDigit,` `),e=p(e,J.percent,e=>le(e.g(1))+` percent`),e=p(e,J.number,e=>le(e[0])),e.replaceAll(`&`,` and `).replaceAll(`+`,` plus `).replaceAll(`=`,` equals `).replaceAll(`@`,` at `).replaceAll(`#`,` number `)}var de=f(String.raw`[0-9#%$€£@&/_+=<>±≥≤×°]`),fe=f(String.raw`\s+([.,!?;:])`);function pe(e){let t=ie(e);return de.lastIndex=0,de.test(t)&&(t=ue(t)),t=p(t,fe,e=>e.g(1)),t=j(t.replace(W.spaces,` `)),A(N(e))?N(t).toUpperCase()+t.slice(N(t).length):t}var me=64,Y=`
struct P { d: u32, xOff: u32, xStride: u32, yOff: u32, yStride: u32, eps: f32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read> w: array<f32>;
@group(0) @binding(3) var<storage, read_write> y: array<f32>;
var<workgroup> part: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let xr = p.xOff + wg.x * p.xStride;
  let yr = p.yOff + wg.x * p.yStride;
  var acc = 0.0;
  for (var i = li; i < p.d; i += 64u) { let v = x[xr + i]; acc += v * v; }
  part[li] = acc;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { part[li] += part[li + k]; } workgroupBarrier(); }
  let inv = inverseSqrt(part[0] / f32(p.d) + p.eps);
  for (var i = li; i < p.d; i += 64u) { y[yr + i] = x[xr + i] * inv * w[i]; }
}`,he=`
struct P { tokens: u32, heads: u32, hd: u32, d: u32, slot: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> qkv: array<f32>;
@group(0) @binding(2) var<storage, read> pos: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let half = p.hd / 2u;
  let per = p.heads * half;
  let i = gid.x;
  if (i >= p.tokens * per * 2u) { return; }
  let which = i / (p.tokens * per);
  let j = i % (p.tokens * per);
  let t = j / per;
  let h = (j % per) / half;
  let k = j % half;
  let inv = 1.0 / pow(10000.0, f32(2u * k) / f32(p.hd));
  let ang = f32(pos[p.slot] + t) * inv;
  let c = cos(ang);
  let s = sin(ang);
  let at = t * 3u * p.d + which * p.d + h * p.hd + 2u * k;
  let x1 = qkv[at];
  let x2 = qkv[at + 1u];
  qkv[at] = x1 * c - x2 * s;
  qkv[at + 1u] = x1 * s + x2 * c;
}`,ge=`
struct P { tokens: u32, heads: u32, hd: u32, d: u32, slot: u32, max: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> qkv: array<f32>;
@group(0) @binding(2) var<storage, read_write> kc: array<f32>;
@group(0) @binding(3) var<storage, read_write> vc: array<f32>;
@group(0) @binding(4) var<storage, read> pos: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.tokens * p.d) { return; }
  let t = i / p.d;
  let c = i % p.d;
  let h = c / p.hd;
  let e = c % p.hd;
  let dst = (h * p.max + pos[p.slot] + t) * p.hd + e;
  kc[dst] = qkv[t * 3u * p.d + p.d + c];
  vc[dst] = qkv[t * 3u * p.d + 2u * p.d + c];
}`,_e=1024,ve=`
struct P { tokens: u32, heads: u32, hd: u32, d: u32, slot: u32, max: u32, scale: f32, keep: u32, pOff: u32, layer: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> qkv: array<f32>;
@group(0) @binding(2) var<storage, read> kc: array<f32>;
@group(0) @binding(3) var<storage, read> vc: array<f32>;
@group(0) @binding(4) var<storage, read_write> out: array<f32>;
@group(0) @binding(5) var<storage, read> pos: array<u32>;
@group(0) @binding(6) var<storage, read_write> probs: array<f32>;
@group(0) @binding(7) var<storage, read> gain: array<f32>;
var<workgroup> sc: array<f32, ${_e}>;
var<workgroup> red: array<f32, 64>;
var<workgroup> q: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let t = wg.x;
  let h = wg.y;
  let n = pos[p.slot] + t + 1u;
  if (li < p.hd) { q[li] = qkv[t * 3u * p.d + h * p.hd + li]; }
  workgroupBarrier();
  var mx = -1e30;
  for (var j = li; j < n; j += 64u) {
    var s = 0.0;
    let kb = (h * p.max + j) * p.hd;
    for (var e = 0u; e < p.hd; e++) { s += q[e] * kc[kb + e]; }
    s *= p.scale;
    sc[j] = s;
    mx = max(mx, s);
  }
  red[li] = mx;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { red[li] = max(red[li], red[li + k]); } workgroupBarrier(); }
  let m = red[0];
  workgroupBarrier();
  var sum = 0.0;
  for (var j = li; j < n; j += 64u) { let e = exp(sc[j] - m); sc[j] = e; sum += e; }
  red[li] = sum;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { red[li] += red[li + k]; } workgroupBarrier(); }
  let total = red[0];
  if (li < p.hd) {
    var acc = 0.0;
    for (var j = 0u; j < n; j++) { acc += sc[j] * vc[(h * p.max + j) * p.hd + li]; }
    // (Each head's output times its gain: 0, the head muted.)
    out[t * p.d + h * p.hd + li] = acc / total * gain[p.layer * p.heads + h];
  }
  // (A frame's step: its attention kept, each head's over every position,
  // for looking at.)
  if (p.keep != 0u) {
    for (var j = li; j < n; j += 64u) { probs[p.pOff + h * p.max + j] = sc[j] / total; }
  }
}`,ye=`
struct P { n: u32, ff: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.n * p.ff) { return; }
  let t = i / p.ff;
  let c = i % p.ff;
  let g = x[t * 2u * p.ff + c];
  let u = x[t * 2u * p.ff + p.ff + c];
  y[i] = g / (1.0 + exp(-g)) * u;
}`,be=`
struct P { n: u32, sOff: u32, dOff: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> src: array<f32>;
@group(0) @binding(2) var<storage, read_write> dst: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < p.n) { dst[p.dOff + gid.x] = src[p.sOff + gid.x]; }
}`,xe=`
struct P { n: u32, bOff: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> a: array<f32>;
@group(0) @binding(2) var<storage, read> b: array<f32>;
@group(0) @binding(3) var<storage, read_write> y: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.n) { return; }
  let v = a[i] + b[p.bOff + i];
  y[i] = v / (1.0 + exp(-v));
}`,X=`
struct P { n: u32, shOff: u32, scOff: u32, eps: f32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read> mod_: array<f32>;
@group(0) @binding(3) var<storage, read_write> y: array<f32>;
var<workgroup> red: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(local_invocation_index) li: u32) {
  var s = 0.0;
  for (var i = li; i < p.n; i += 64u) { s += x[i]; }
  red[li] = s;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { red[li] += red[li + k]; } workgroupBarrier(); }
  let mean = red[0] / f32(p.n);
  workgroupBarrier();
  var v = 0.0;
  for (var i = li; i < p.n; i += 64u) { let e = x[i] - mean; v += e * e; }
  red[li] = v;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { red[li] += red[li + k]; } workgroupBarrier(); }
  let inv = inverseSqrt(red[0] / f32(p.n) + p.eps);
  for (var i = li; i < p.n; i += 64u) { y[i] = (x[i] - mean) * inv * (1.0 + mod_[p.scOff + i]) + mod_[p.shOff + i]; }
}`,Se=`
struct P { n: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> x: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < p.n) { let v = x[gid.x]; x[gid.x] = v / (1.0 + exp(-v)); }
}`,Ce=`
struct P { n: u32, gOff: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> g: array<f32>;
@group(0) @binding(2) var<storage, read> v: array<f32>;
@group(0) @binding(3) var<storage, read_write> h: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < p.n) { h[gid.x] += g[p.gOff + gid.x] * v[gid.x]; }
}`,we=`
struct P { n: u32, inv: f32, zOff: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> v: array<f32>;
@group(0) @binding(2) var<storage, read_write> z: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < p.n) { z[p.zOff + gid.x] += v[gid.x] * p.inv; }
}`,Te=`
struct P { d: u32, at: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> h: array<f32>;
@group(0) @binding(2) var<storage, read> w: array<f32>;
@group(0) @binding(3) var<storage, read> b: array<f32>;
@group(0) @binding(4) var<storage, read_write> out: array<f32>;
var<workgroup> red: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(local_invocation_index) li: u32) {
  var s = 0.0;
  for (var i = li; i < p.d; i += 64u) { s += h[i] * w[i]; }
  red[li] = s;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) { if (li < k) { red[li] += red[li + k]; } workgroupBarrier(); }
  if (li == 0u) { out[p.at] = red[0] + b[0]; }
}`,Ee=`
struct P { n: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> x: array<f32>;
@group(0) @binding(2) var<storage, read> voice: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < p.n) { x[gid.x] = voice[gid.x]; }
}`,Z=e=>Math.ceil(e/me),De=[Y,he,ge,ve,ye,be,xe,X,Se,Ce,we,Te,Ee],Oe=class{setHeadGains(e){this.gpu.write(this.gains,e)}setVoiceSource(e){if(e===this.voiceBuf)return;this.voiceBuf=e;let t=e?this.voiceOps.get(e):void 0;e&&!t&&this.voiceOps.set(e,t=this.gpu.op(`voiceFrom`,Ee,[[this.voice.length],this.x,e],[Z(this.voice.length)])),this.voiceOp=t??null}voiceVectors(){return this.voice}constructor(e,t,n,r,i,a=8){this.voiceBuf=null,this.voiceOp=null,this.voiceOps=new Map,this.rows=0,this.made=0,this.ended=!0,this.stepOps=new Map,this.prefixOps=new Map,this.refreshOps=new Map,this.gpu=e,this.w=t,this.cfg=i,this.batch=a,this.vocab=new Map(r.map((e,t)=>[e,t+3])),this.voice=n,this.textEmb=t.floats(`tts.text_emb.weight`),this.bos=t.floats(`tts.bos`);let{d:o,layers:s}=i,c=64*Math.round(8*o/3/64);this.maxLen=Math.min(_e,418+i.maxFrames),this.blocks=Array.from({length:s},(n,r)=>({n1:t.f32(`tts.blocks.${r}.n1.weight`),n2:t.f32(`tts.blocks.${r}.n2.weight`),qkv:t.q8(`tts.blocks.${r}.qkv.weight`),o:t.q8(`tts.blocks.${r}.o.weight`),ff1:t.q8(`tts.blocks.${r}.ff1.weight`),ff2:t.q8(`tts.blocks.${r}.ff2.weight`),k:e.f32(o*this.maxLen,`k${r}`),v:e.f32(o*this.maxLen,`v${r}`)})),this.normW=t.f32(`tts.norm.weight`);let l=i.headWidth;this.head={inp:t.q8(`tts.head.inp.weight`),inpB:t.f32(`tts.head.inp.bias`),cond:t.q8(`tts.head.cond.weight`),condB:t.f32(`tts.head.cond.bias`),temb:e.f32(this.timeEmbeddings(),`temb`),blocks:Array.from({length:i.headDepth},(e,n)=>({ada:t.q8(`tts.head.blocks.${n}.ada.weight`),adaB:t.f32(`tts.head.blocks.${n}.ada.bias`),fc1:t.q8(`tts.head.blocks.${n}.fc1.weight`),fc1B:t.f32(`tts.head.blocks.${n}.fc1.bias`),fc2:t.q8(`tts.head.blocks.${n}.fc2.weight`),fc2B:t.f32(`tts.head.blocks.${n}.fc2.bias`)})),outAda:t.q8(`tts.head.out_ada.weight`),outAdaB:t.f32(`tts.head.out_ada.bias`),out:t.q8(`tts.head.out.weight`),outB:t.f32(`tts.head.out.bias`)},this.latIn=t.q8(`tts.lat_in.weight`),this.latInB=t.f32(`tts.lat_in.bias`),this.eosW=t.f32(`tts.eos.weight`),this.eosB=t.f32(`tts.eos.bias`);let u=this.maxLen;this.x=e.f32(u*o,`x`),this.n=e.f32(u*o,`n`),this.qkvBuf=e.f32(u*3*o,`qkv`),this.att=e.f32(u*o,`att`),this.ff=e.f32(u*2*c,`ff`),this.ffAct=e.f32(u*c,`ffAct`),this.hBuf=e.f32(o,`h`),this.z=e.f32(a*i.latent,`z`),this.eosOut=e.f32(a,`eos`),this.probs=e.f32(a*i.layers*i.heads*this.maxLen,`attention`),this.raw=e.f32(this.maxLen*i.d,`prefix`),this.gains=e.f32(new Float32Array(i.layers*i.heads).fill(1),`headGains`),this.cond=e.f32(l,`cond`),this.s=e.f32(l,`s`),this.hh=e.f32(l,`hh`),this.nn=e.f32(l,`nn`),this.mod=e.f32(3*l,`mod`),this.f1=e.f32(2*l,`f1`),this.f2=e.f32(l,`f2`),this.vel=e.f32(i.latent,`vel`),this.pos=e.device.createBuffer({label:`pos`,size:Math.ceil((a+1)*4/16)*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),e.device.queue.writeBuffer(this.pos,0,new Uint32Array(a+1))}timeEmbeddings(){let{steps:e,headWidth:t}=this.cfg,n=this.w.floats(`tts.head.t_mlp.0.weight`),r=this.w.floats(`tts.head.t_mlp.0.bias`),i=this.w.floats(`tts.head.t_mlp.2.weight`),a=this.w.floats(`tts.head.t_mlp.2.bias`),o=new Float32Array(e*t),s=new Float32Array(128),c=new Float32Array(t);for(let l=0;l<e;l++){let u=l/e;for(let e=0;e<64;e++){let t=Math.exp(-Math.log(1e4)*e/64);s[e]=Math.sin(u*1e3*t),s[64+e]=Math.cos(u*1e3*t)}for(let e=0;e<t;e++){let t=r[e];for(let r=0;r<128;r++)t+=n[e*128+r]*s[r];c[e]=t/(1+Math.exp(-t))}for(let e=0;e<t;e++){let n=a[e];for(let r=0;r<t;r++)n+=i[e*t+r]*c[r];o[l*t+e]=n}}return o}encode(e){return[1,...[...e].map(e=>this.vocab.get(e)??2)]}transformer(e,t,r=!0){let i=this.gpu,{d:a,heads:o}=this.cfg,c=a/o,l=this.blocks[0].ff2.cols,u=1.1920928955078125e-7,d=[];for(let[r,f]of this.blocks.entries()){d.push(i.op(`n1`,Y,[[a,0,a,0,a,n.f(u)],this.x,f.n1,this.n],[e])),d.push(s(i,f.qkv,this.n,this.qkvBuf,{T:e,label:`qkv`})),d.push(i.op(`rope`,he,[[e,o,c,a,t],this.qkvBuf,this.pos],[Z(e*o*(c/2)*2)])),d.push(i.op(`cache`,ge,[[e,o,c,a,t,this.maxLen],this.qkvBuf,f.k,f.v,this.pos],[Z(e*a)]));let p=+(e===1),m=p*(t*this.blocks.length+r)*o*this.maxLen;d.push(i.op(`attend`,ve,[[e,o,c,a,t,this.maxLen,n.f(1/Math.sqrt(c)),p,m,r],this.qkvBuf,f.k,f.v,this.att,this.pos,this.probs,this.gains],[e,o])),d.push(s(i,f.o,this.att,this.x,{T:e,accumulate:!0,label:`o`})),d.push(i.op(`n2`,Y,[[a,0,a,0,a,n.f(u)],this.x,f.n2,this.n],[e])),d.push(s(i,f.ff1,this.n,this.ff,{T:e,label:`ff1`})),d.push(i.op(`swiglu`,ye,[[e,l],this.ff,this.ffAct],[Z(e*l)])),d.push(s(i,f.ff2,this.ffAct,this.x,{T:e,accumulate:!0,label:`ff2`}))}return r&&d.push(i.op(`norm`,Y,[[a,(e-1)*a,a,0,a,n.f(u)],this.x,this.normW,this.hBuf],[1])),d}frameOps(e){let t=this.stepOps.get(e);if(t)return t;let r=this.gpu,{latent:i,steps:a,headWidth:o}=this.cfg,c=this.head,l=e*i,u=[];u.push(r.op(`eos`,Te,[[this.cfg.d,e],this.hBuf,this.eosW,this.eosB,this.eosOut],[1])),u.push(s(r,c.cond,this.hBuf,this.cond,{bias:c.condB,label:`cond`}));for(let e=0;e<a;e++){u.push(r.op(`s`,xe,[[o,e*o],this.cond,c.temb,this.s],[Z(o)])),u.push(s(r,c.inp,this.z,this.hh,{bias:c.inpB,xOff:l,label:`inp`}));for(let e of c.blocks)u.push(s(r,e.ada,this.s,this.mod,{bias:e.adaB,label:`ada`})),u.push(r.op(`adanorm`,X,[[o,0,o,n.f(1e-5)],this.hh,this.mod,this.nn],[1])),u.push(s(r,e.fc1,this.nn,this.f1,{bias:e.fc1B,label:`fc1`})),u.push(r.op(`silu`,Se,[[2*o],this.f1],[Z(2*o)])),u.push(s(r,e.fc2,this.f1,this.f2,{bias:e.fc2B,label:`fc2`})),u.push(r.op(`gate`,Ce,[[o,2*o],this.mod,this.f2,this.hh],[Z(o)]));u.push(s(r,c.outAda,this.s,this.mod,{bias:c.outAdaB,label:`outada`})),u.push(r.op(`outnorm`,X,[[o,0,o,n.f(1e-5)],this.hh,this.mod,this.nn],[1])),u.push(s(r,c.out,this.nn,this.vel,{bias:c.outB,label:`out`})),u.push(r.op(`euler`,we,[[i,n.f(1/a),l],this.vel,this.z],[Z(i)]))}return u.push(s(r,this.latIn,this.z,this.x,{bias:this.latInB,xOff:l,label:`latin`})),u.push(...this.transformer(1,e)),this.stepOps.set(e,u),u}layout(e){let t=this.voice.length/this.cfg.d,n=t,r=this.encode(e).length;return{voice:t,text:n,textLen:r,start:n+r,frames:n+r+1}}prefix(e){let{d:t}=this.cfg,n=this.encode(e),r=this.voice.length/t+n.length+1,i=new Float32Array(r*t);return i.set(this.voice,0),n.forEach((e,n)=>i.set(this.textEmb.subarray(e*t,e*t+t),this.voice.length+n*t)),i.set(this.bos,(r-1)*t),{x:i,rows:r}}begin(e){let t=this.gpu,{x:n,rows:r}=this.prefix(e);if(r+this.cfg.maxFrames>this.maxLen)throw Error(`woof: too long (${r} tokens)`);t.write(this.raw,n),t.write(this.x,n),this.rows=r,this.made=0,this.ended=!1;let i=this.prefixOps.get(r);return i||this.prefixOps.set(r,i=this.transformer(r,this.batch)),t.run(this.voiceOp?[this.voiceOp,...i]:i),r}refreshPrefix(){if(this.ended||!this.rows)return;let e=this.gpu,t=this.refreshOps.get(this.rows);t||this.refreshOps.set(this.rows,t=this.transformer(this.rows,this.batch,!1));let n=e.device.createCommandEncoder();n.copyBufferToBuffer(this.raw,0,this.x,0,this.rows*this.cfg.d*4),e.encode(n,this.voiceOp?[this.voiceOp,...t]:t),e.device.queue.submit([n.finish()])}async step(e,t={}){let n=this.gpu,{latent:r,temperature:i,eosThreshold:a,maxFrames:o}=this.cfg,s=this.rows,c=this.made,l=Math.min(this.batch,e,o-c);if(this.ended||l<=0)return{latents:new Float32Array,count:0,done:!0};let u=t.noise??ke,d=new Float32Array(this.batch*r);for(let e=0;e<l;e++)d.set(u(c+e).map(e=>e*i),e*r);n.write(this.z,d);let f=new Uint32Array(this.batch+1);for(let e=0;e<this.batch;e++)f[e]=s+c+e;n.device.queue.writeBuffer(this.pos,0,f);let p=n.device.createCommandEncoder();for(let e=0;e<l;e++)n.encode(p,this.frameOps(e));n.device.queue.submit([p.finish()]);let[m,h]=await Promise.all([n.read(this.eosOut,l),n.read(this.z,l*r)]),g=l;for(let e=0;e<l;e++)if(c+e>3&&1/(1+Math.exp(-m[e]))>a){g=e,this.ended=!0;break}if(g&&t.attention){let e=this.cfg.layers*this.cfg.heads*this.maxLen,r=await n.read(this.probs,g*e);for(let t=0;t<g;t++){let n=s+c+t+1;for(let i=0;i<this.cfg.layers*this.cfg.heads;i++)r.fill(0,t*e+i*this.maxLen+n,t*e+(i+1)*this.maxLen)}t.attention(r,g,this.maxLen)}return this.made+=g,this.made>=o&&(this.ended=!0),{latents:h.subarray(0,g*r),count:g,done:this.ended}}async generate(e,t,n={}){let r=this.begin(e);n.trace&&await n.trace(`prefix`,this.x,r*this.cfg.d);let i=0;for(;!n.abort?.aborted;){let e=await this.step(this.batch,n);if(e.count&&await t(e.latents,e.count),i+=e.count,e.done||!e.count)break}return i}};function ke(){let e=new Float32Array(32);for(let t=0;t<32;t+=2){let n=1-Math.random(),r=Math.random(),i=Math.sqrt(-2*Math.log(n));e[t]=i*Math.cos(2*Math.PI*r),e[t+1]=i*Math.sin(2*Math.PI*r)}return e}var Q=e=>new Promise(t=>setTimeout(t,e)),$=null;async function Ae(a=`/woof/model`,s={},u=null){if(typeof navigator>`u`||!navigator.gpu)return null;let d=$?.base===a?$:null;$=null;let f=d?.small??Promise.all([fetch(`${a}/config.json`).then(e=>e.json()),Ne(`${a}/isla.safetensors`)]),p=d?.model??je(a),m=u;if(!m){let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});if(!e)return null;m=await e.requestDevice({requiredLimits:{maxStorageBufferBindingSize:e.limits.maxStorageBufferBindingSize,maxBufferSize:e.limits.maxBufferSize}}),m.lost.then(e=>console.error(`/escape: the GPU was lost`,e.message))}let h=new n(m),g=[e,...De,...c],_=0,v=0,y=()=>s.gpu?.(.25*_/g.length+.65*v),b=()=>{_++,y()},x=s.slow?(async()=>{for(let e of g)await h.precompile([e],b),await Q(s.slow*800/g.length)})():h.precompile(g,b),S=Me(h,await p,e=>s.download?.(e),e=>(v=e,y()),s.slow),[[C,w],T]=await Promise.all([f,S,x]);s.download?.(1);let E=r(t(w).get(`voice`)),D=C.tts,O=C.generation,k=new Oe(h,T,E,D.chars,{d:D.d,layers:D.layers,heads:D.heads,headWidth:D.head_width,headDepth:D.head_depth,latent:C.latent_dim,steps:O.steps,temperature:O.temperature,eosThreshold:O.eos_threshold,maxFrames:O.max_frames}),A=o(h,T);s.gpu?.(.9),s.slow&&await Q(s.slow*150);{let e=[],t=await k.generate(`Hi.`,t=>void e.push(t.slice())),n=new Float32Array(t*C.latent_dim);e.reduce((e,t)=>(n.set(t,e),e+t.length),0),t&&await A.decodeInside(n,t)}s.gpu?.(1);let ee=e=>{try{return pe(e)}catch{return e}},j=Promise.resolve(),M=l(),N=M?2:.35,P=/[?&](woofstats|mobilecoop)\b/.test(window.location.search),F=/[?&]woofcheck\b/.test(window.location.search),I=1920,L=(e,t,n)=>{let r=k.layout(n),{layers:i,heads:a}=k.cfg,o=r.frames+t,s=new Float32Array(t*i*a*o),c=0;for(let t of e)for(let e=0;e<t.count;e++,c++)for(let n=0;n<i*a;n++)s.set(t.probs.subarray((e*i*a+n)*t.stride,(e*i*a+n)*t.stride+o),(c*i*a+n)*o);return{data:s,frames:t,layers:i,heads:a,len:o,text:n,at:r}},R=k.voiceVectors().slice(),te=h.f32(R,`typist`),z=null,B={layer:`dec.seanet12`,attention:!1,inside:!1,live:!1,sameTake:!0,take:0,heads:new Float32Array(k.cfg.layers*k.cfg.heads).fill(1),headsChanged:0,solo:-1,muted:new Set},V=-1,H=e=>{if(!B.sameTake)return;let t=2166136261^B.take;for(let n=0;n<e.length;n++)t=Math.imul(t^e.charCodeAt(n),16777619);return e=>{let n=(t^Math.imul(e+1,2654435761))>>>0,r=()=>{n=n+1831565813>>>0;let e=n;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296},i=new Float32Array(32);for(let e=0;e<32;e+=2){let t=Math.sqrt(-2*Math.log(1-r())),n=2*Math.PI*r();i[e]=t*Math.cos(n),i[e+1]=t*Math.sin(n)}return i}},U=A.finalConv(),ne=e=>{let t=e.length/U.channels,n=new Float32Array(t).fill(U.b);for(let r=0;r<U.channels;r++)if(!(B.solo>=0?r!==B.solo:B.muted.has(r)))for(let i=0;i<U.k;i++){let a=U.w[r*U.k+i],o=i-(U.k-1);for(let i=Math.max(0,-o);i<t;i++){let s=e[r*t+i+o];n[i]+=a*(s>0?s:Math.expm1(s))}}for(let e=0;e<t;e++)n[e]=Math.max(-1,Math.min(1,n[e]));return n};return{inspect:B,finalConv:()=>U,voiceVectors:()=>k.voiceVectors(),typistVectors:()=>R,setVoiceSource:e=>void(z=e),rate:C.sample_rate,speak:(e,t,n,r,a=`typist`)=>{let o=j.then(async()=>{let o=C.latent_dim;for(let s of Pe(ee(e))){if(n.aborted)return;V!==B.headsChanged&&(k.setHeadGains(B.heads),V=B.headsChanged),k.setVoiceSource(a===`typist`?z??te:null),k.begin(s);let e=H(s),c=new Float32Array(C.generation.max_frames*o),l=[],u=0,d=0;A.stream.reset();let f=0,p=[],m={from:performance.now(),frames:0,decode:0,rest:0};for(;;){if(n.aborted)return;let a=await r?.(N)??0;if(n.aborted)return;let h=V!==B.headsChanged;h&&(k.setHeadGains(B.heads),V=B.headsChanged),(B.live||h)&&k.refreshPrefix();let g=performance.now(),_=await k.step(3,{noise:e,attention:B.attention?(e,t,n)=>void l.push({probs:e.slice(),count:t,stride:n}):void 0});c.set(_.latents,u*o),u+=_.count;let v=performance.now();if(m.frames+=v-g,u>d){let e=Math.max(0,u-128),n=Math.ceil((u-e)/8)*8,r=new Float32Array(n*o);r.set(c.subarray(e*o,u*o));let a=B.solo>=0||B.muted.size>0,m=i.some(e=>e.name===B.layer)?B.layer:`dec.seanet12`,h=(d-e)*I,g=(u-d)*I,_,v=null;if(!a&&!B.inside)f<d&&await A.stream.push(c.subarray(f*o,d*o),d-f),_=await A.stream.push(c.subarray(d*o,u*o),u-d),f=u,F&&p.push(_);else{let e=await A.decodeInside(r,n,a?`dec.seanet12`:m);_=(a?ne(e.inside):e.pcm).slice(h,h+g),B.inside&&(v=a&&m!==`dec.seanet12`?await A.decodeInside(r,n,m):e)}let y=new Float32Array;if(v){let t=Math.round(v.rate*.08),n=v.inside.length/v.channels;y=new Float32Array(v.channels*(u-d)*t);for(let r=0;r<v.channels;r++)y.set(v.inside.subarray(r*n+(d-e)*t,r*n+(u-e)*t),r*(u-d)*t)}t(_,{data:y,channels:v?v.channels:0,rate:v?v.rate:0,layer:m,attention:l.length?L(l,u,s):void 0,frame0:d}),d=u}if(m.decode+=performance.now()-v,M&&a>1){let e=performance.now()-g;m.rest+=e,await Q(e)}if(_.done||!_.count)break}if(F&&u&&u<=128&&f===u){let e=await A.decode(c.subarray(0,u*o),Math.ceil(u/8)*8,0),t=0,n=0,r=0,i=0;for(let a of p)for(let o=0;o<a.length;o++,t++){let s=a[o]-e[t];n=Math.max(n,Math.abs(s)),r+=s*s,i+=e[t]*e[t]}console.info(`/escape: woof streamed vs whole: ${t} samples, worst ${n.toExponential(2)}, SNR ${(10*Math.log10(i/Math.max(r,1e-30))).toFixed(1)} dB`)}if(P&&u){let e=u*.08,t=m.frames+m.decode;console.info(`/escape: woof ${u} frames (${e.toFixed(2)} s): frames ${(m.frames/u).toFixed(1)} ms each, decoding ${(m.decode/u).toFixed(1)} ms each, ${(e*1e3/t).toFixed(1)}x real time working, ${(e*1e3/(performance.now()-m.from)).toFixed(1)}x overall (rested ${(m.rest/1e3).toFixed(2)} s)`)}}});return j=o.catch(()=>{}),o}}}async function je(e){let t=await fetch(`${e}/model_int8.parts.json`);if(!t.ok)return new Response(null,{status:t.status});let{size:n,parts:r}=await t.json(),i=r.map(t=>fetch(`${e}/${t}`));for(let e of i)e.catch(()=>{});let a=new ReadableStream({async start(e){try{for(let t of i){let n=await t;if(!n.ok||!n.body)throw Error(`/escape: the weights: ${n.status} ${n.url}`);let r=n.body.getReader();for(;;){let{done:t,value:n}=await r.read();if(t)break;e.enqueue(n)}}e.close()}catch(t){e.error(t)}}});return new Response(a,{headers:{"content-length":String(n)}})}async function Me(e,n,r,i,o=0){if(!n.ok||!n.body)throw Error(`/escape: the weights: ${n.status}`);let s=Number(n.headers.get(`content-length`))||0;if(!s){let o=new a(e,t(await n.arrayBuffer()));for(let e of o.tensors.keys())o.upload(e);return r(1),i(1),o}let c=new Uint8Array(s),l=n.body.getReader(),u=performance.now(),d=0,f=null,p=[],m=0,h=0;for(;;){let{done:n,value:g}=await l.read();if(n)break;if(c.set(g,d),d+=g.length,r(d/s),!f&&d>=8){let n=8+Number(new DataView(c.buffer).getBigUint64(0,!0));d>=n&&(f=new a(e,t(c.buffer)),p=[...f.tensors].map(([e,t])=>({name:e,end:t.bytes.byteOffset+t.bytes.byteLength})).sort((e,t)=>e.end-t.end),m=p.reduce((e,t)=>e+f.tensors.get(t.name).bytes.length,0))}if(f){for(;p.length&&p[0].end<=d;)h+=f.upload(p.shift().name);i(h/m)}o&&await Q(d/s*o*1e3-(performance.now()-u))}if(!f||p.length)throw Error(`/escape: the weights ended early`);return f}async function Ne(e,t,n=0){let r=await fetch(e),i=performance.now();if(!r.ok||!r.body)throw Error(`/escape: ${e}: ${r.status}`);let a=Number(r.headers.get(`content-length`))||0;if(!t||!a)return r.arrayBuffer();let o=new Uint8Array(a),s=r.body.getReader(),c=0;for(;;){let{done:e,value:r}=await s.read();if(e)break;o.set(r,c),c+=r.length,t(c,a),n&&await Q(c/a*n*1e3-(performance.now()-i))}return o.buffer}function Pe(e,t=220){let n=[],r=``;for(let i of e.trim().split(/(?<=[.!?…])\s+/))for(let e of i.length>t?i.split(/(?<=[,;:])\s+/):[i])r&&r.length+e.length+1>t?(n.push(r),r=e):r=`${r} ${e}`.trim();return r&&n.push(r),n}export{Ae as loadWoof};