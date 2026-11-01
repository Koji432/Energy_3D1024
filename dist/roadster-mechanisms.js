// Principle examples: component positions and ratios do not reproduce a vehicle.
const topic = (id, title, description) => Object.freeze({id, title, description});
export const mechanisms = Object.freeze({
  drive: topic('drive', '走行', '原理を示す模式図。電池の直流をインバーターが三相交流へ変え、固定されたコイルに回転磁界を作る。一般的なかご形回転子が磁界より少し遅く回り、固定内歯車の遊星減速機を通して後輪へ伝える。個別車両のモーター形式や減速比を再現していない。'),
  suction: topic('suction', '床下の吸引', '原理を示す模式図。4基の後部ファンがスカート下の隙間から入る空気を床下から後方へ排出する。床下の圧力が下がり、車体は地面へ押し付けられる。ファンによる浮上ではない。'),
  wing: topic('wing', '可動翼', '原理を示す模式図。モーターの回転をねじとナットが直線運動へ変え、ロッド、連結棒、支点を通して翼の角度を変える。一般的な連結機構であり、独自の実機内部構造を断定しない。'),
  thrust: topic('thrust', 'ガス噴射', '原理を示す模式図。制御基板の電気信号でバルブ用モーターが動き、弁を開く。タンクの圧縮ガスがノズルから下向きに出る間、車体に上向きの反作用が働く。弁を閉じると噴射は止まる。'),
});
const roles = Object.freeze({motor:'drive',fan:'suction',actuator:'wing',valve:'thrust',tank:'thrust',thruster:'thrust'});
const validId = id => Object.hasOwn(mechanisms,id) ? id : 'drive';
export function mechanismForRole(role,current='drive') {
  return Object.hasOwn(roles,role) ? roles[role] : validId(current);
}

// Pitch radii follow the tooth counts. Planet rotations are relative to carrier.
export const driveKinematics = Object.freeze({
  sunTeeth:24, planetTeeth:12, ringTeeth:48,
  sunRadius:36, planetRadius:18, ringRadius:72, orbitRadius:54,
  carrierRatio:1/3, planetRelativeRatio:-4/3, planetInitialAngle:15,
  fieldRotorSpeedRatio:1.08,
  motorCenter:Object.freeze({x:425,y:190}),
  gearCenter:Object.freeze({x:668,y:190}),
  wheelCenter:Object.freeze({x:890,y:190}),
  planetCenters:Object.freeze([
    Object.freeze({x:668,y:136}),
    Object.freeze({x:668+27*Math.sqrt(3),y:217}),
    Object.freeze({x:668-27*Math.sqrt(3),y:217}),
  ]),
});
const c = {ink:'#29455d',edge:'#7590a4',steel:'#b9cbd7',light:'#edf3f7',blue:'#299abd',amber:'#db9a36',green:'#4eaa8c',red:'#cf7764'};
const motion = (id,cx,cy,body,extra='') => `<g data-motion="${id}"${cx===null?'':` data-cx="${cx}" data-cy="${cy}"`} ${extra}>${body}</g>`;
function defs(p) {
  return `<defs>
    <linearGradient id="${p}-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f5f9fc"/><stop offset=".45" stop-color="#aac0ce"/><stop offset=".65" stop-color="#e4eef5"/><stop offset="1" stop-color="#88a5b9"/></linearGradient>
    <linearGradient id="${p}-jet" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4bb9d5" stop-opacity=".75"/><stop offset="1" stop-color="#a8e0ed" stop-opacity=".03"/></linearGradient>
    <marker id="${p}-air-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="${c.blue}"/></marker>
    <clipPath id="${p}-road-clip"><rect x="795" y="263" width="190" height="18" rx="3"/></clipPath>
  </defs>`;
}
function battery(x,y,w=76,h=104) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="#dfede3" stroke="#567f69" stroke-width="3"/><rect x="${x+w*.32}" y="${y-9}" width="${w*.36}" height="10" rx="3" fill="#91b29e"/>${[0,1,2].map(i=>`<rect class="mechanism-battery-cell" x="${x+13}" y="${y+18+i*25}" width="${w-26}" height="17" rx="4" fill="#91bf9f"/>`).join('')}`;
}
function chip(x,y,w=92,h=64) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#e4f0e9" stroke="#709a83" stroke-width="3"/><rect x="${x+w*.31}" y="${y+h*.26}" width="${w*.38}" height="${h*.48}" rx="3" fill="#608b74"/>${[.34,.5,.66].map(t=>`<path d="M${x+w*.2} ${y+h*t}H${x+w*.31}M${x+w*.69} ${y+h*t}H${x+w*.8}" stroke="#8cb19c" stroke-width="3"/>`).join('')}`;
}
function toothPath(cx,cy,r,n,internal=false) {
  const points=[];
  for(let tooth=0;tooth<n;tooth++) {
    const pitch=2*Math.PI/n;
    for(const [fraction,tip] of [[-.5,false],[-.29,false],[-.19,true],[.19,true],[.29,false],[.5,false]]) {
      const angle=(tooth+fraction)*pitch, radius=r+(internal?(tip?-3:3):(tip?3:-3));
      points.push(`${(cx+Math.cos(angle)*radius).toFixed(3)} ${(cy+Math.sin(angle)*radius).toFixed(3)}`);
    }
  }
  return `M${points.join('L')}Z`;
}
function gear(cx,cy,r,n,fill=c.steel) {
  return `<path d="${toothPath(cx,cy,r,n)}" fill="${fill}" stroke="${c.ink}" stroke-width="1.8"/><circle cx="${cx}" cy="${cy}" r="${r*.23}" fill="#f7fafc" stroke="#648298" stroke-width="2"/>`;
}
function fan(id,cx,cy,r=24) {
  return `<circle cx="${cx}" cy="${cy}" r="${r+4}" fill="#f7fbfd" stroke="#7897aa" stroke-width="3"/>${motion(id,cx,cy,`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"/>${[0,120,240].map(a=>`<path d="M${cx} ${cy-3}C${cx+4} ${cy-r} ${cx+r} ${cy-r} ${cx+r-2} ${cy-7}C${cx+r-3} ${cy+1} ${cx+7} ${cy+6} ${cx} ${cy+3}Z" transform="rotate(${a} ${cx} ${cy})" fill="#6d94af"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="5" fill="#29455d"/>`,'data-phase="mechanical"')}`;
}
function wheel(cx,cy,r=68,prefix='') {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#354951" stroke="#223c4b" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r-8}" fill="none" stroke="#657b83" stroke-width="4" stroke-dasharray="7 8"/><circle cx="${cx}" cy="${cy}" r="${r*.61}" fill="#d4e2eb" stroke="#819eaf" stroke-width="3"/>${[0,72,144,216,288].map(a=>`<path d="M${cx-5} ${cy-7}L${cx-7} ${cy-r*.52}H${cx+7}L${cx+5} ${cy-7}Z" transform="rotate(${a} ${cx} ${cy})" fill="#7898ad"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="${r*.15}" fill="#f1f7fa" stroke="#617f94" stroke-width="3"/>`;
}
function drive(p) {
  const phaseColors=[c.red,c.green,c.blue];
  const phaseWires=[`M290 166H327Q343 166 350 154L359 144`,`M290 190H340`,`M290 214H327Q343 214 350 226L359 236`];
  return `
    <g data-stage="battery">${battery(35,139)}<path d="M111 166H164M111 218H164" stroke="#a0b4c1" stroke-width="5"/>${motion('drive-electric',null,null,'<path class="mechanism-electric-flow" d="M112 166H163M112 218H163" stroke="#dda23b" stroke-width="4" stroke-dasharray="4 10"/>','data-phase="electric"')}</g>
    <g data-stage="inverter">
      <rect x="164" y="126" width="126" height="129" rx="13" fill="#e9eff5" stroke="#6f8ca2" stroke-width="3"/>
      <path d="M177 141H276M177 241H276" stroke="#8ea7b8" stroke-width="3"/>
      ${[190,226,262].map((x,i)=>`<g data-phase="${i}" class="mechanism-phase"><path d="M${x} 141V242" stroke="${phaseColors[i]}" stroke-width="3"/><rect x="${x-8}" y="155" width="16" height="24" rx="3" fill="#f8fbfc" stroke="${phaseColors[i]}" stroke-width="2"/><rect x="${x-8}" y="204" width="16" height="24" rx="3" fill="#f8fbfc" stroke="${phaseColors[i]}" stroke-width="2"/><path d="M${x-4} 173L${x+4} 161M${x-4} 222L${x+4} 210" stroke="${phaseColors[i]}" stroke-width="2.5"/></g>`).join('')}
      ${[190,226,262].map((x,i)=>`<circle cx="${x}" cy="190" r="3.5" fill="${phaseColors[i]}"/>`).join('')}
    </g>
    <g data-phase="electric">${phaseWires.map((d,i)=>`<path d="${d}" stroke="${phaseColors[i]}" stroke-width="3.5"/><path class="mechanism-phase-flow" data-phase="${i}" d="${d}" stroke="${phaseColors[i]}" stroke-width="5" stroke-dasharray="3 12"/>`).join('')}</g>
    <g data-fixed="stator" data-stage="motor">
      <circle cx="425" cy="190" r="82" fill="#e0eaf1" stroke="#69879d" stroke-width="4"/>
      <circle cx="425" cy="190" r="59" fill="#f9fcfd" stroke="#b1c4d2" stroke-width="3"/>
      ${Array.from({length:6},(_,i)=>`<g transform="rotate(${i*60} 425 190)"><rect x="411" y="117" width="28" height="25" rx="5" fill="${phaseColors[i%3]}" stroke="#7e6c51" stroke-width="1.4"/><path d="M417 121V138M425 121V138M433 121V138" stroke="#f7e2bf" stroke-width="2" opacity=".7"/><rect data-phase="${i%3}" class="mechanism-coil-phase" x="411" y="117" width="28" height="25" rx="5" fill="#ffcc6b" opacity="0"/></g>`).join('')}
    </g>
    ${motion('drive-field',425,190,`<circle cx="425" cy="190" r="50" stroke="#76b6c8" stroke-width="3" stroke-dasharray="20 11"/><path d="M382 181Q425 142 468 181M382 199Q425 238 468 199" stroke="#5eafc5" stroke-width="2.2"/><path d="M457 166L470 181 450 179Z" fill="#5eafc5"/>`,'data-phase="field"')}
    <rect x="462" y="181" width="131" height="18" rx="5" fill="url(#${p}-metal)" stroke="#6d899c" stroke-width="2"/>
    ${motion('drive-motor',425,190,`<circle cx="425" cy="190" r="38" fill="url(#${p}-metal)" stroke="#55758d" stroke-width="3"/><ellipse cx="425" cy="190" rx="27" ry="35" stroke="#c69656" stroke-width="4"/>${[-20,-10,0,10,20].map(x=>`<path d="M${425+x-4} ${190-Math.sqrt(31*31-x*x)}L${425+x+4} ${190+Math.sqrt(31*31-x*x)}" stroke="#849eac" stroke-width="3"/>`).join('')}<circle cx="425" cy="190" r="8" fill="#426980"/>`,'data-phase="mechanical"')}
    <g data-fixed="ring" data-stage="reduction">
      <circle cx="668" cy="190" r="83" fill="#d8e5ed" stroke="#68899e" stroke-width="3"/>
      <path d="${toothPath(668,190,72,48,true)}" fill="#f8fbfd" stroke="#647f93" stroke-width="1.8"/>
      ${[0,120,240].map(a=>`<circle cx="${668+79*Math.cos(a*Math.PI/180)}" cy="${190+79*Math.sin(a*Math.PI/180)}" r="3.5" fill="#7b95a7"/>`).join('')}
    </g>
    ${motion('drive-carrier',668,190,`<path d="M668 136 714.76537180436 217 621.23462819564 217Z" fill="#b7ccd9" fill-opacity=".55" stroke="#8da9bd" stroke-width="9"/>${driveKinematics.planetCenters.map((v,i)=>motion(`drive-planet-${i}`,v.x,v.y,gear(v.x,v.y,18,12),`transform="rotate(15 ${v.x} ${v.y})" data-initial-angle="15" data-relative-ratio="${driveKinematics.planetRelativeRatio}"`)).join('')}`,'data-phase="mechanical"')}
    ${motion('drive-sun',668,190,gear(668,190,36,24,'#ddb66d'),'data-phase="mechanical"')}
    <circle cx="668" cy="190" r="8" fill="#66869b"/>
    <rect x="750" y="181" width="75" height="18" rx="5" fill="url(#${p}-metal)" stroke="#6d899c" stroke-width="2"/>
    ${motion('drive-wheel',890,190,wheel(890,190,70),'data-phase="mechanical"')}
    <path d="M795 263H984" stroke="#9ab0c0" stroke-width="5"/>
    <g clip-path="url(#${p}-road-clip)"><path class="mechanism-road" data-motion="drive-road" d="M765 273H1020" stroke="#c2d0da" stroke-width="7" stroke-dasharray="22 21"/></g>
    <path d="M135 292H180M312 292H351M510 292H554M768 292H805" stroke="#d6a854" stroke-width="3"/>
    <path d="M180 286 192 292 180 298M351 286 363 292 351 298M554 286 566 292 554 298M805 286 817 292 805 298" fill="#d6a854"/>
  `;
}
function suction(p) {
  return `
    <path d="M45 302H962" stroke="#8fa9ba" stroke-width="5"/>
    <path d="M62 314H955" stroke="#dce5eb" stroke-width="13" stroke-dasharray="20 12"/>
    ${motion('suction-pressure',null,null,'<path d="M165 247H797V294H165Z" fill="#94cee3" fill-opacity=".35"/><path d="M191 277H615" stroke="#c3e5f0" stroke-width="17" stroke-linecap="round"/>','data-phase="air"')}
    ${motion('suction-body',null,null,`
      <path d="M95 224L124 184Q176 156 295 153L384 112Q408 101 438 105L539 111Q568 114 588 146L613 163L874 178Q921 183 941 216L931 248H100Z" fill="#e7eff5" stroke="#6b899f" stroke-width="3.5"/>
      <path d="M325 155L397 120H440L438 159ZM452 121L533 125L568 160L452 159Z" fill="#bdd5e5" stroke="#87a5b9" stroke-width="2"/>
      <path d="M145 215H640M153 241H802" stroke="#a5bac9" stroke-width="4"/>
      <path d="M162 247V278H178M790 247V278H774" stroke="#53768b" stroke-width="7"/>
      <path d="M645 249V144Q645 132 658 132H792Q806 132 806 146V231H829V252H774L752 273H620Z" fill="#d1e4ee" stroke="#7195ad" stroke-width="3"/>
      ${fan('suction-fan-0',687,162)}${fan('suction-fan-1',756,162)}${fan('suction-fan-2',687,221)}${fan('suction-fan-3',756,221)}
      <path d="M807 183H950V218H807" fill="#f5fafc" stroke="#7294a9" stroke-width="3"/>
    `,'data-travel="8" data-phase="mechanical"')}
    ${motion('suction-air',null,null,`<path class="mechanism-airflow" d="M79 292H193M293 292H600Q638 292 651 258L666 236" stroke="${c.blue}" stroke-width="4" stroke-dasharray="8 13" marker-end="url(#${p}-air-arrow)"/><path class="mechanism-airflow mechanism-side-inlet" d="M330 256Q350 276 383 288M490 254Q511 278 548 288" stroke="${c.blue}" stroke-width="3" stroke-dasharray="6 10" marker-end="url(#${p}-air-arrow)"/><path class="mechanism-airflow" d="M810 200H970" stroke="${c.blue}" stroke-width="5" stroke-dasharray="8 13" marker-end="url(#${p}-air-arrow)"/>`,'data-phase="air"')}
    <g data-fixed="wheels">${wheel(242,260,39)}${wheel(869,260,39)}</g>
    ${motion('suction-force',null,null,'<path d="M475 34H495V76H511L485 108 459 76H475Z" fill="#d89b3f"/><path d="M451 318H520" stroke="#c5d4de" stroke-width="7" stroke-linecap="round"/>','data-phase="force"')}
  `;
}
function wing(p) {
  const rodX=790-Math.sqrt(4000),threads=Array.from({length:24},(_,i)=>`M${230+i*15} 199l18 -29`).join('');
  return `
    <defs><clipPath id="${p}-thread-clip"><rect x="240" y="165" width="320" height="38" rx="5"/></clipPath></defs>
    <path d="M35 290H600M805 290H922" stroke="#d0dde6" stroke-width="8"/>
    <path d="M75 263V286M171 263V286M260 255V286M547 255V286" stroke="#9bb2c3" stroke-width="9"/>
    <g transform="translate(0 29)">
      <path d="M48 146Q48 131 63 131H181Q201 131 201 152V219Q201 237 181 237H63Q48 237 48 222Z" fill="#dce7ee" stroke="#6d8ba1" stroke-width="3"/>
      <path d="M63 145H180M63 224H180" stroke="#a8bfce" stroke-width="7"/>
      ${[74,100,126,152].map(x=>`<rect x="${x}" y="143" width="15" height="23" rx="3" fill="#d59a54"/><rect x="${x}" y="205" width="15" height="22" rx="3" fill="#d59a54"/>`).join('')}
      ${motion('wing-motor',125,186,'<circle cx="125" cy="186" r="29" fill="#f7fbfc" stroke="#5d829c" stroke-width="3"/><path d="M125 157V174M125 198V215M96 186H112M138 186H154" stroke="#7d9fb7" stroke-width="9"/><circle cx="125" cy="186" r="8" fill="#537b96"/>','data-phase="mechanical"')}
      <path d="M201 178H241V195H201" fill="url(#${p}-metal)" stroke="#7898af" stroke-width="2"/>
      <path d="M226 142H577V160H242V209H577V229H226Z" fill="#e3edf3" stroke="#7898ae" stroke-width="3"/>
      <rect x="241" y="174" width="323" height="21" rx="5" fill="url(#${p}-metal)" stroke="#6b8a9e" stroke-width="2"/>
      <g clip-path="url(#${p}-thread-clip)"><path data-motion="wing-thread" class="mechanism-thread" d="${threads}" stroke="#527c97" stroke-width="3"/></g>
      <rect x="561" y="162" width="28" height="48" rx="5" fill="#90aaba" stroke="#5f8198" stroke-width="2"/>
      ${motion('rod',null,null,`<rect x="451" y="155" width="60" height="61" rx="6" fill="#e3b769" stroke="#aa7d36" stroke-width="3"/><path d="M458 169H505M458 202H505" stroke="#b58a43" stroke-width="3"/><rect x="511" y="176" width="${rodX-511}" height="16" rx="5" fill="url(#${p}-metal)" stroke="#6d8fa6" stroke-width="2"/><circle cx="${rodX}" cy="184" r="9" fill="#b3c8d6" stroke="#688ba3" stroke-width="2.5"/>`,`data-reference-x="${rodX}" data-reference-y="213"`)}
    </g>
    ${motion('link',rodX,213,`<path d="M${rodX} 213L790 183" stroke="#8aa9bf" stroke-width="13"/><circle cx="${rodX}" cy="213" r="6" fill="#f7fafc" stroke="#577f9a" stroke-width="2"/>`,`data-reference-x="${rodX}" data-reference-y="213" data-length="70"`)}
    <path d="M846 213V282M815 282H891" stroke="#8daabf" stroke-width="13"/>
    ${motion('wing',846,213,'<path d="M846 213L790 183" stroke="#6a8fa9" stroke-width="13"/><circle cx="790" cy="183" r="8" fill="#dbad58" stroke="#846531" stroke-width="2"/><path d="M846 211V164" stroke="#577f9d" stroke-width="13"/><path d="M730 156Q788 121 892 138L956 156Q912 172 851 168L730 165Z" fill="#719bb8" stroke="#3c6582" stroke-width="3"/><path d="M747 155Q826 141 927 155" stroke="#bdd5e4" stroke-width="3"/><circle cx="846" cy="213" r="12" fill="#f5f9fb" stroke="#426c89" stroke-width="4"/>','data-phase="mechanical"')}
    <path d="M907 189Q928 212 909 235" stroke="#d39a3e" stroke-width="3"/><path d="M902 227 909 241 920 229Z" fill="#d39a3e"/>
  `;
}
function thrust(p) {
  return `
    <defs><clipPath id="${p}-ground-clip"><rect x="0" y="0" width="1000" height="328"/></clipPath></defs>
    <path d="M45 331H959" stroke="#9eb4c3" stroke-width="5"/><path d="M65 343H945" stroke="#d6e2ea" stroke-width="9" stroke-dasharray="17 14"/>
    <g clip-path="url(#${p}-ground-clip)">
    ${motion('thrust-body',null,null,`
      <path d="M65 244L94 186Q135 159 259 153L345 113Q372 102 406 105L511 114Q538 118 566 153L607 174L855 188Q904 191 931 234L921 275H74Z" fill="#edf3f7" fill-opacity=".72" stroke="#9bb2c3" stroke-width="3"/>
      <path d="M291 157L359 119H404L403 164ZM417 120L504 128L541 164H417Z" fill="#d4e3ed" stroke="#a1b9cb" stroke-width="2"/>
      <path d="M335 195H715Q750 195 750 227V246" stroke="#65879f" stroke-width="29"/><path d="M335 195H715Q750 195 750 227V246" stroke="#f7fbfd" stroke-width="21"/>
      <path d="M334 195H489" stroke="#9dcee1" stroke-width="9"/>
      <rect x="112" y="151" width="224" height="103" rx="49" fill="url(#${p}-metal)" stroke="#65869c" stroke-width="3"/>
      <path d="M157 162H291Q323 162 323 202Q323 243 291 243H157Q126 243 126 202Q126 162 157 162Z" fill="#afd4e5" fill-opacity=".7"/>
      <path d="M158 162V243M289 162V243M173 176H276" stroke="#dceef6" stroke-width="3"/>
      <rect x="331" y="181" width="20" height="27" rx="4" fill="#a1bbc9" stroke="#64859c" stroke-width="2"/>
      ${chip(346,45,95,65)}
      ${motion('thrust-electric',null,null,`<path class="mechanism-electric-flow" d="M441 78H476" stroke="${c.amber}" stroke-width="4" stroke-dasharray="4 9"/>`,'data-phase="electric"')}
      <circle cx="508" cy="92" r="32" fill="#e3edf3" stroke="#7290a5" stroke-width="3"/>
      ${motion('thrust-motor',508,92,'<circle cx="508" cy="92" r="21" fill="#d5a667" stroke="#a3783e" stroke-width="2.5"/><path d="M508 75V109M491 92H525" stroke="#9f763d" stroke-width="5"/><circle cx="508" cy="92" r="6" fill="#f7fafc"/>','data-phase="mechanical"')}
      <path d="M495 123H521V146H495Z" fill="url(#${p}-metal)" stroke="#7190a5" stroke-width="2"/>
      <path d="M449 148H569V238H449Z" fill="#dce9f1" stroke="#6b899e" stroke-width="3"/><path d="M449 178H569V211H449" fill="#f5fafc" stroke="#91b1c4" stroke-width="2"/>
      ${motion('thrust-valve',null,null,'<rect x="503" y="129" width="10" height="52" rx="3" fill="#8ca7b9"/><rect x="495" y="177" width="26" height="35" rx="3" fill="#c09a5d" stroke="#8c6d3a" stroke-width="2.5"/><path d="M500 184H516M500 205H516" stroke="#e4cfa8" stroke-width="2"/>','class="mechanism-valve" data-travel="-38"')}
      <path d="M735 239H766L789 286Q751 300 714 286Z" fill="url(#${p}-metal)" stroke="#577d99" stroke-width="3"/><path d="M744 244H758L775 282Q751 288 728 282Z" fill="#f2fafd" stroke="#90b6ca" stroke-width="2"/>
      ${motion('thrust-gas',null,null,`<path class="mechanism-airflow" d="M351 195H714Q750 195 750 228V275" stroke="${c.blue}" stroke-width="6" stroke-dasharray="9 12"/><path class="mechanism-jet" d="M733 290 713 357H789L770 290Z" fill="url(#${p}-jet)"/><path class="mechanism-airflow" d="M750 293V350M737 295 727 344M764 295 774 344" stroke="${c.blue}" stroke-width="4" stroke-dasharray="7 11"/>`,'data-phase="gas"')}
      <g data-fixed="vehicle-wheels">${wheel(204,295,32)}${wheel(854,295,32)}</g>
    `,'data-travel="-34" data-phase="force"')}
    </g>
    ${motion('thrust-force',null,null,'<path d="M906 282H888V226H874L897 196 920 226H906Z" fill="#d7a049"/>','data-phase="force"')}
  `;
}
const drawings={drive,suction,wing,thrust};
export function mechanismMarkup(id) {
  id=validId(id);
  const p=`roadster-mechanism-${id}`;
  return `<svg class="mechanism-svg mechanism-${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 360" role="img" aria-label="${mechanisms[id].title}の機構" aria-describedby="${p}-desc" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round"><desc id="${p}-desc">${mechanisms[id].description}</desc>${defs(p)}${drawings[id](p)}</svg>`;
}
const icon = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const mechanismIcons=Object.freeze({
  drive:icon('<rect x="4" y="20" width="17" height="25" rx="4"/><path d="M9 20v-4h7v4M21 32h9"/><circle cx="44" cy="32" r="15"/><circle cx="44" cy="32" r="7"/><path d="M44 17v8m15 7h-8M44 47v-8m-15-7h8M5 51h54"/>'),
  suction:icon('<path d="m5 36 7-11 15-3 8-7h10l8 13 7 6v9H5Z"/><circle cx="17" cy="43" r="6"/><circle cx="49" cy="43" r="6"/><path d="M32 2v14m-5-5 5 5 5-5M5 56h54m-35-8h15"/><circle cx="44" cy="31" r="5"/><path d="m41 28 6 6m-6 0 6-6"/>'),
  wing:icon('<path d="M5 43h19m-16-6 6 12m2-12 6 12M24 43l15-10m0 0 10 8m0 0v15M28 22q12-15 32-1-14 7-32 1Z"/><circle cx="39" cy="33" r="3"/><circle cx="49" cy="41" r="3"/><path d="M46 56h8M5 34h21v18H5Z"/>'),
  thrust:icon('<rect x="5" y="9" width="25" height="17" rx="8"/><path d="M30 18h8v14m-4 0h8l5 14H29l5-14ZM38 49v10m-8-10-3 8m19-8 3 8M55 39V15m-5 6 5-6 5 6"/><rect x="34" y="10" width="8" height="9" rx="2"/>'),
});
