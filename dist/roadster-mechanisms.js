// These cutaways explain general mechanisms; their internal layout is schematic.
export const mechanisms = Object.freeze({
  drive: {
    id: 'drive', title: '走行',
    flow: ['電源', 'モーター', '減速歯車', '車輪'],
    caption: [
      '固定子の磁界が回転子を回し、減速歯車を通して後輪へ伝えます。',
      '回転を遅くし、後輪を回す力を大きくする模式図です。',
    ],
  },
  suction: {
    id: 'suction', title: '床下の吸引',
    flow: ['床下', 'ファン', '後方へ排気'],
    caption: [
      '床下の空気を4基のファンで後方へ排出します。',
      '床下の圧力が下がることで、車体を地面へ押し付けます。',
    ],
  },
  wing: {
    id: 'wing', title: '可動翼',
    flow: ['モーター', 'ねじ機構', 'ロッド', '翼'],
    caption: [
      'モーターの回転を、ねじとナットでロッドの直線運動に変えます。',
      'ロッドとリンクが翼の角度を変える、一般的な機構の模式図です。',
    ],
  },
  thrust: {
    id: 'thrust', title: 'ガス噴射',
    flow: ['タンク', 'バルブ', 'ノズル', '推力'],
    caption: [
      'モーターがバルブを開くと、タンクのガスがノズルへ流れます。',
      '下向きのガス噴射に対する反作用が、上向きの推力になります。',
    ],
  },
});

const roleMechanisms = Object.freeze({
  motor: 'drive', fan: 'suction', actuator: 'wing',
  valve: 'thrust', tank: 'thrust', thruster: 'thrust',
});

function validId(id) {
  return Object.hasOwn(mechanisms, id) ? id : 'drive';
}

export function mechanismForRole(role, current = 'drive') {
  return Object.hasOwn(roleMechanisms, role) ? roleMechanisms[role] : validId(current);
}

const colors = {
  ink: '#29455d', muted: '#6c8599', light: '#eaf0f5',
  steel: '#aebfca', copper: '#d8974c', blue: '#3297bd', amber: '#d6942e',
};
const text = (value, x, y, size = 24, anchor = 'middle', fill = colors.ink) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="650" fill="${fill}">${value}</text>`;
const leader = points => `<path d="${points}" fill="none" stroke="${colors.muted}" stroke-width="2"/>`;

function defs(prefix) {
  return `<defs>
    <linearGradient id="${prefix}-steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f8fb"/><stop offset=".42" stop-color="#b8c8d2"/>
      <stop offset=".65" stop-color="#e4edf2"/><stop offset="1" stop-color="#8da5b5"/>
    </linearGradient>
    <linearGradient id="${prefix}-air" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#53bed7" stop-opacity=".6"/><stop offset="1" stop-color="#a6e2ef" stop-opacity=".05"/>
    </linearGradient>
    <marker id="${prefix}-blue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${colors.blue}"/></marker>
    <marker id="${prefix}-amber-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${colors.amber}"/></marker>
    <marker id="${prefix}-ink-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${colors.ink}"/></marker>
  </defs>`;
}

function gearPath(cx, cy, radius, teeth, depth = 6, rotation = 0) {
  const points = [];
  for (let i = 0; i < teeth * 4; i++) {
    const angle = rotation + (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 === 0 || i % 4 === 3 ? radius - depth : radius;
    points.push(`${(cx + Math.cos(angle) * r).toFixed(2)} ${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

function gear(cx, cy, radius, teeth, className = 'mechanism-spin', fill = '#b5c6d0') {
  return `<g class="${className}">
    <path d="${gearPath(cx, cy, radius, teeth, Math.max(4, radius * .18))}" fill="${fill}" stroke="${colors.ink}" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cy}" r="${radius * .25}" fill="#fff" stroke="${colors.ink}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="2.5" fill="${colors.ink}"/>
  </g>`;
}

function fan(cx, cy, radius = 23) {
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="#fff" stroke="#7a94a6" stroke-width="3"/>
    <g class="mechanism-spin">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="none"/>
      ${[0, 120, 240].map(angle => `<path d="M${cx} ${cy - 3}C${cx + 3} ${cy - radius} ${cx + radius} ${cy - radius} ${cx + radius - 2} ${cy - 7}C${cx + radius - 3} ${cy + 1} ${cx + 7} ${cy + 6} ${cx} ${cy + 3}Z" transform="rotate(${angle} ${cx} ${cy})" fill="#7896aa"/>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="5" fill="#29455d"/>
    </g>
  </g>`;
}

function drive(prefix) {
  return `
    <path d="M130 187H173" stroke="${colors.amber}" stroke-width="6" marker-end="url(#${prefix}-amber-arrow)"/>
    <rect x="45" y="139" width="82" height="103" rx="12" fill="#dce9e0" stroke="${colors.ink}" stroke-width="3"/>
    <rect x="68" y="129" width="36" height="11" rx="3" fill="#849c8f"/>
    <path d="M69 163H101M85 147V179M70 218H100" stroke="#5a7b65" stroke-width="4"/>
    <rect x="55" y="186" width="62" height="13" rx="4" fill="#a5c7af"/>

    <path d="M189 131H337Q355 131 355 150V226Q355 245 337 245H189Q177 245 177 232V144Q177 131 189 131Z" fill="#e3ebf0" stroke="#6d879a" stroke-width="3"/>
    <path d="M184 151H345M184 225H345" stroke="#91a7b7" stroke-width="5"/>
    ${[199, 228, 257, 286, 315].map(x => `<rect x="${x}" y="138" width="18" height="23" rx="4" fill="#d8974c" stroke="#a66d33" stroke-width="1.5"/><rect x="${x}" y="217" width="18" height="22" rx="4" fill="#d8974c" stroke="#a66d33" stroke-width="1.5"/>`).join('')}
    <rect x="305" y="179" width="189" height="17" rx="5" fill="url(#${prefix}-steel)" stroke="#6c8599" stroke-width="2"/>
    <g class="mechanism-spin">
      <circle cx="269" cy="188" r="41" fill="#f8fbfd" stroke="#526f84" stroke-width="3"/>
      <path d="M269 151A37 37 0 0 1 269 225V204A16 16 0 0 0 269 172Z" fill="#c87965"/>
      <path d="M269 151A37 37 0 0 0 269 225V204A16 16 0 0 1 269 172Z" fill="#7198b5"/>
      <circle cx="269" cy="188" r="10" fill="#6c879a" stroke="#29455d" stroke-width="2"/>
    </g>
    ${text('固定子', 222, 92)}${leader('M222 101V123L235 144')}
    ${text('回転子', 335, 285)}${leader('M328 263L294 216')}

    <circle cx="570" cy="188" r="82" fill="#d9e4eb" stroke="#6c879a" stroke-width="3"/>
    <path d="${gearPath(570, 188, 71, 30, 5)}" fill="#f9fcfd" stroke="#6c879a" stroke-width="2"/>
    <g class="mechanism-carrier" style="transform-box:view-box;transform-origin:570px 188px">
      <path d="M570 145 607 210 533 210Z" fill="#c5d6df" fill-opacity=".6" stroke="#91a8b7" stroke-width="8" stroke-linejoin="round"/>
      ${gear(570, 145, 19, 10, 'mechanism-counter-spin')}
      ${gear(607, 210, 19, 10, 'mechanism-counter-spin')}
      ${gear(533, 210, 19, 10, 'mechanism-counter-spin')}
    </g>
    ${gear(570, 188, 26, 12, 'mechanism-spin', '#d7a353')}
    <circle cx="570" cy="188" r="7" fill="#5d798c"/>
    ${text('減速歯車（例）', 571, 88)}
    <rect x="649" y="179" width="192" height="18" rx="4" fill="url(#${prefix}-steel)" stroke="#6c8599" stroke-width="2"/>
    ${text('車軸', 737, 260)}${leader('M737 237V203')}

    <circle cx="880" cy="188" r="70" fill="#33434b" stroke="#1f333f" stroke-width="4"/>
    <circle cx="880" cy="188" r="61" fill="none" stroke="#56656a" stroke-width="4" stroke-dasharray="8 9"/>
    <g class="mechanism-spin-slow">
      <circle cx="880" cy="188" r="43" fill="#d7e1e6" stroke="#7a93a3" stroke-width="4"/>
      ${[0, 72, 144, 216, 288].map(a => `<path d="M880 182L874 149H887L886 182Z" transform="rotate(${a} 880 188)" fill="#7b95a6"/>`).join('')}
      <circle cx="880" cy="188" r="12" fill="#f1f5f7" stroke="#557386" stroke-width="3"/>
    </g>
    <path d="M819 269H942" stroke="#bdcbd4" stroke-width="3"/>
    ${text('電源', 86, 314)}${text('モーター', 265, 333)}${text('後輪', 880, 314)}
    <path d="M379 222Q409 254 442 222" fill="none" stroke="${colors.amber}" stroke-width="3" marker-end="url(#${prefix}-amber-arrow)"/>
    <path d="M678 219Q709 246 740 219" fill="none" stroke="${colors.amber}" stroke-width="3" marker-end="url(#${prefix}-amber-arrow)"/>
  `;
}

function suction(prefix) {
  return `
    <path d="M48 301H958" stroke="#91a8b9" stroke-width="5"/>
    <path d="M85 313L100 301M127 313L142 301M169 313L184 301M211 313L226 301M253 313L268 301M295 313L310 301M337 313L352 301M379 313L394 301M421 313L436 301M463 313L478 301M505 313L520 301M547 313L562 301M589 313L604 301M631 313L646 301M673 313L688 301M715 313L730 301M757 313L772 301M799 313L814 301M841 313L856 301M883 313L898 301" stroke="#d0dce4" stroke-width="2"/>
    <path d="M158 250H785V293H158Z" fill="#d9edf6" stroke="#a7cbdf" stroke-width="2" stroke-dasharray="7 6"/>
    <path d="M100 226L125 185Q168 160 294 155L386 113Q405 104 436 106L540 111Q563 113 586 147L611 166L874 179Q922 185 941 216L930 249H105Z" fill="#e9eff4" stroke="#6c879a" stroke-width="3.5"/>
    <path d="M323 156L397 121L441 120L438 160ZM452 120L534 125L568 161L452 160Z" fill="#c5d9e6" stroke="#87a2b5" stroke-width="2"/>
    <path d="M143 214H641M153 241H801" fill="none" stroke="#9cafbe" stroke-width="4"/>
    <path d="M161 249V285M789 247V285" fill="none" stroke="#536e80" stroke-width="8" stroke-linecap="round"/>
    <path d="M162 285H179M774 285H789" stroke="#536e80" stroke-width="5"/>
    <circle cx="242" cy="257" r="41" fill="#374955" stroke="#243e51" stroke-width="3"/>
    <circle cx="242" cy="257" r="22" fill="#c4d2dc" stroke="#7d98ab" stroke-width="4"/>
    <circle cx="870" cy="257" r="41" fill="#374955" stroke="#243e51" stroke-width="3"/>
    <circle cx="870" cy="257" r="22" fill="#c4d2dc" stroke="#7d98ab" stroke-width="4"/>
    <path d="M643 250V144Q643 133 655 133H793Q806 133 806 147V233H827V256H770L752 273H620Z" fill="#d2e3ec" fill-opacity=".9" stroke="#7190a5" stroke-width="3"/>
    ${fan(686, 163, 23)}${fan(755, 163, 23)}${fan(686, 221, 23)}${fan(755, 221, 23)}
    <path d="M807 182H949V219H807" fill="#f4f9fc" stroke="#7190a5" stroke-width="3"/>
    <path class="mechanism-airflow" d="M91 292H192M294 292H598Q635 292 649 255L665 236" fill="none" stroke="${colors.blue}" stroke-width="4" stroke-dasharray="10 13" marker-end="url(#${prefix}-blue-arrow)"/>
    <path class="mechanism-airflow" d="M800 200H966" fill="none" stroke="${colors.blue}" stroke-width="6" stroke-dasharray="10 13" marker-end="url(#${prefix}-blue-arrow)"/>
    <path d="M475 30H495V77H511L485 110 459 77H475Z" fill="${colors.amber}"/>
    ${text('下向きの力', 588, 65, 26, 'middle', '#a26d20')}
    ${text('吸引ファン ×4', 721, 103)}
    ${text('後方へ排気', 897, 150)}
    ${text('低圧', 478, 273, 26, 'middle', '#2a779c')}
    ${text('スカート', 123, 113)}${leader('M127 123V158L161 257')}
    ${text('床下の空気', 470, 339)}${text('地面', 922, 339)}
  `;
}

function wing(prefix) {
  const threads = Array.from({ length: 24 }, (_, i) => `M${230 + i * 15} 199l18 -29`).join('');
  const rodX = 790 - Math.sqrt(4000);
  return `
    <defs><clipPath id="${prefix}-thread-clip"><rect x="240" y="165" width="320" height="38" rx="5"/></clipPath></defs>
    <g transform="translate(0 29)">
    <path d="M48 146Q48 131 63 131H181Q201 131 201 152V219Q201 237 181 237H63Q48 237 48 222Z" fill="#dce5ec" stroke="#6c879a" stroke-width="3"/>
    <path d="M63 145H180M63 224H180" stroke="#aabcc8" stroke-width="7"/>
    ${[74, 100, 126, 152].map(x => `<rect x="${x}" y="143" width="15" height="23" rx="3" fill="#d59a54"/><rect x="${x}" y="205" width="15" height="22" rx="3" fill="#d59a54"/>`).join('')}
    <g class="mechanism-motor" data-motion="wing-motor">
      <circle cx="125" cy="186" r="29" fill="#f6f9fb" stroke="#597b92" stroke-width="3"/>
      <path d="M125 157V174M125 198V215M96 186H112M138 186H154" stroke="#7e9aaf" stroke-width="9"/>
      <circle cx="125" cy="186" r="8" fill="#54758b"/>
    </g>
    <path d="M201 178H241V195H201" fill="url(#${prefix}-steel)" stroke="#7893a5" stroke-width="2"/>
    <path d="M226 142H577V160H242V209H577V229H226Z" fill="#e4ebef" stroke="#7a94a5" stroke-width="3"/>
    <rect x="241" y="174" width="323" height="21" rx="5" fill="url(#${prefix}-steel)" stroke="#647f92" stroke-width="2"/>
    <g clip-path="url(#${prefix}-thread-clip)"><path class="mechanism-thread" data-motion="wing-thread" d="${threads}" stroke="#54758a" stroke-width="3" fill="none"/></g>
    <rect x="561" y="162" width="28" height="48" rx="5" fill="#899fae" stroke="#57788e" stroke-width="2"/>
    <g class="mechanism-rod" data-motion="rod" data-reference-x="${rodX}" data-reference-y="213">
      <rect x="451" y="155" width="60" height="61" rx="6" fill="#e3b86a" stroke="#aa7e37" stroke-width="3"/>
      <path d="M458 169H505M458 202H505" stroke="#b58a43" stroke-width="3"/>
      <rect x="511" y="176" width="${rodX - 511}" height="16" rx="5" fill="url(#${prefix}-steel)" stroke="#6b879a" stroke-width="2"/>
      <circle cx="${rodX}" cy="184" r="9" fill="#aabecb" stroke="#607f94" stroke-width="2.5"/>
    </g>
    </g>
    <g class="mechanism-link" data-motion="link" data-reference-x="${rodX}" data-reference-y="213" data-length="70">
      <path d="M${rodX} 213L790 183" stroke="#8da6b7" stroke-width="13"/>
      <circle cx="${rodX}" cy="213" r="6" fill="#f7fafc" stroke="#57798f" stroke-width="2"/>
    </g>
    <path d="M802 278H904L891 270H816Z" fill="#d4e0e8"/>
    <path d="M846 213V273" stroke="#88a2b4" stroke-width="14"/>
    <g class="mechanism-pivot" data-motion="wing">
      <path d="M846 213L790 183" stroke="#6b879b" stroke-width="13" stroke-linecap="round"/>
      <circle cx="790" cy="183" r="8" fill="#d4a954" stroke="#785d29" stroke-width="2"/>
      <path d="M846 211L846 164" stroke="#587b93" stroke-width="13"/>
      <path d="M730 156Q788 121 892 138L956 156Q912 172 851 168L730 165Z" fill="#678fa9" stroke="#355a74" stroke-width="3"/>
      <path d="M747 155Q826 141 927 155" fill="none" stroke="#b1cbdb" stroke-width="3"/>
      <circle cx="846" cy="213" r="12" fill="#f3f8fa" stroke="#3d6079" stroke-width="4"/>
    </g>
    <path d="M902 185Q923 211 904 237" fill="none" stroke="${colors.amber}" stroke-width="4" marker-end="url(#${prefix}-amber-arrow)"/>
    ${text('モーター', 126, 302)}
    ${text('ねじ', 347, 105)}${leader('M347 116V192')}
    ${text('ナット', 482, 282)}${leader('M482 259V251')}
    ${text('ロッド', 661, 282)}${leader('M661 258V232')}
    ${text('翼', 846, 96)}${leader('M846 105V135')}
    ${text('リンク', 742, 331)}${leader('M742 310L761 230V204')}
    ${text('支点', 921, 277)}${leader('M901 258L857 222')}
  `;
}

function thrust(prefix) {
  return `
    <path d="M271 190H745Q780 190 780 225V244" fill="none" stroke="#5f7f95" stroke-width="31" stroke-linejoin="round"/>
    <path d="M271 190H745Q780 190 780 225V244" fill="none" stroke="#f3f8fb" stroke-width="23" stroke-linejoin="round"/>
    <path d="M275 190H476" fill="none" stroke="#a0d0e3" stroke-width="11"/>
    <rect x="46" y="134" width="225" height="113" rx="54" fill="url(#${prefix}-steel)" stroke="#59798f" stroke-width="3.5"/>
    <path d="M92 145H226Q258 145 258 190T226 236H92Q61 236 61 190T92 145Z" fill="#b4d8e8" fill-opacity=".72"/>
    <path d="M92 145V236M226 145V236" stroke="#84a6b9" stroke-width="3"/>
    <path d="M103 161H210" stroke="#e5f5fb" stroke-width="5" stroke-linecap="round"/>
    <rect x="32" y="177" width="14" height="28" rx="4" fill="#617f92"/>
    <rect x="266" y="176" width="23" height="29" rx="5" fill="#91acbd" stroke="#4e718b" stroke-width="2"/>

    <rect x="330" y="52" width="101" height="69" rx="10" fill="#edf3ee" stroke="#6d8f7d" stroke-width="3"/>
    <rect x="360" y="70" width="40" height="31" rx="3" fill="#557b68"/>
    <path d="M351 75H360M351 85H360M351 95H360M400 75H410M400 85H410M400 95H410" stroke="#7fa18d" stroke-width="3"/>
    <path d="M431 85H474" fill="none" stroke="${colors.amber}" stroke-width="4" marker-end="url(#${prefix}-amber-arrow)"/>
    <circle cx="508" cy="94" r="32" fill="#e6edf2" stroke="#69869b" stroke-width="3"/>
    <circle cx="508" cy="94" r="20" fill="#dba266" stroke="#a37138" stroke-width="3"/>
    <path d="M508 78V110M492 94H524" stroke="#846438" stroke-width="5"/>
    <circle cx="508" cy="94" r="6" fill="#f4f8fa"/>
    <path d="M496 124H520V146H496Z" fill="url(#${prefix}-steel)" stroke="#648397" stroke-width="2"/>
    <path d="M448 145H569V234H448Z" fill="#dce7ee" stroke="#658296" stroke-width="3"/>
    <path d="M448 174H569V206H448" fill="#f6fafc" stroke="#82a4b9" stroke-width="2"/>
    <g class="mechanism-valve" style="--mechanism-valve-travel:-36px">
      <rect x="503" y="129" width="10" height="49" rx="3" fill="#7f98aa"/>
      <rect x="495" y="173" width="26" height="34" rx="3" fill="#b79150" stroke="#7e6133" stroke-width="2.5"/>
      <path d="M499 180H517M499 200H517" stroke="#dcc18f" stroke-width="2"/>
    </g>
    <path d="M765 236H795L816 282Q782 298 744 282Z" fill="url(#${prefix}-steel)" stroke="#4f728b" stroke-width="3"/>
    <path d="M773 240H787L803 279Q780 286 758 279Z" fill="#f2f9fc" stroke="#85aabd" stroke-width="2"/>
    <g class="mechanism-gas-flow">
      <path class="mechanism-airflow" d="M285 190H746Q780 190 780 225V270" fill="none" stroke="${colors.blue}" stroke-width="7" stroke-dasharray="10 11" marker-end="url(#${prefix}-blue-arrow)"/>
      <path class="mechanism-jet" d="M761 286 744 348H816L800 286Z" fill="url(#${prefix}-air)"/>
      <path class="mechanism-airflow" d="M780 290V345M766 293L758 336M795 293L803 336" fill="none" stroke="${colors.blue}" stroke-width="4" stroke-dasharray="8 9"/>
    </g>
    <path class="mechanism-reaction" d="M873 281V176" stroke="${colors.amber}" stroke-width="10" marker-end="url(#${prefix}-amber-arrow)"/>
    ${text('電気信号', 378, 34, 24, 'middle', '#a16e23')}
    ${text('制御基板', 245, 92, 22)}${leader('M292 85H326')}
    ${text('バルブ用モーター', 605, 48, 22)}${leader('M578 57L533 78')}
    ${text('ガス', 335, 169, 23, 'middle', '#2a799d')}
    ${text('タンク', 155, 291)}
    ${text('バルブ', 508, 278)}${leader('M508 254V239')}
    ${text('ノズル', 677, 274)}${leader('M716 266L751 259')}
    ${text('下向きに噴射', 648, 337, 24, 'middle', '#2a799d')}
    ${text('上向きの推力', 901, 143, 24, 'middle', '#a16e23')}
  `;
}

const drawings = { drive, suction, wing, thrust };
const descriptions = {
  drive: '電源から走行モーターへ電気を送り、固定子と回転子、減速歯車、車軸を通して後輪を回す断面模式図。後輪1系統を代表している。',
  suction: '4基のファンが床下の空気を後方へ排出し、スカートで囲まれた床下が低圧になる。車体に働く力は下向き。',
  wing: 'モーターがねじを回し、ナットとロッドを直線に動かす。リンクが支点の周りで翼の角度を変える一般的な機構の模式図。',
  thrust: '電気信号でモーターがバルブを開き、タンクのガスがノズルへ流れる。下向きの噴射に対して上向きの推力が生じる模式図。',
};

/** A self-contained SVG. Its CSS animation classes are controlled by the host. */
export function mechanismMarkup(id) {
  id = validId(id);
  const prefix = `roadster-mechanism-${id}`;
  return `<svg class="mechanism-svg mechanism-${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 360" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" preserveAspectRatio="xMidYMid meet" font-family="Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, sans-serif" stroke-linecap="round" stroke-linejoin="round">
    <title id="${prefix}-title">${mechanisms[id].title}の機構</title>
    <desc id="${prefix}-desc">${descriptions[id]}</desc>
    ${defs(prefix)}
    ${drawings[id](prefix)}
  </svg>`;
}
