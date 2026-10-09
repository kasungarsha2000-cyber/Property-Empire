export type CardDesign={name:string;motion:string;art:string;color:string};
const key='<circle cx="40" cy="40" r="16"/><path d="m52 52 27 27m-9-9 9-9m-17 1 9-9" fill="none" stroke="currentColor" stroke-width="9"/>';
const home='<path d="M18 46 60 14l42 32v43H18Z"/><path d="M47 89V59h26v30" fill="#fff7e6"/><path d="M30 47h13v15H30m48-15h13v15H78" fill="#fff7e6"/>';
const tower='<path d="M28 93V34h28V9h31v84Z"/><path d="M37 44h9m-9 16h9m-9 16h9M65 24h12m-12 17h12m-12 17h12m-12 17h12" stroke="#fff7e6" stroke-width="6"/>';
const train='<rect x="23" y="17" width="74" height="67" rx="16"/><path d="M34 29h21v24H34m31-24h21v24H65" fill="#fff7e6"/><circle cx="40" cy="69" r="5" fill="#fff7e6"/><circle cx="80" cy="69" r="5" fill="#fff7e6"/><path d="m36 84-9 12m57-12 9 12" stroke="currentColor" stroke-width="6"/>';
const coin='<circle cx="60" cy="54" r="35"/><circle cx="60" cy="54" r="27" fill="none" stroke="#fff7e6" stroke-width="3"/><text x="60" y="69" font-size="43" text-anchor="middle" fill="#fff7e6" font-family="Fredoka">$</text>';
const invoice='<path d="M30 12h60v82l-10-6-10 6-10-6-10 6-10-6-10 6Z"/><path d="M43 34h34m-34 15h25m-25 15h34" stroke="#fff7e6" stroke-width="5"/>';
const bars='<rect x="20" y="18" width="80" height="75" rx="9" fill="none" stroke="currentColor" stroke-width="7"/><path d="M40 21v69m20-69v69m20-69v69" stroke="currentColor" stroke-width="7"/>';
const leaf='<path d="M24 79C10 25 69 10 100 12 104 59 86 93 45 79Z"/><path d="m25 94 57-57m-22 23 2-27m-3 28 29 1" stroke="#fff7e6" stroke-width="5" fill="none"/>';
const cake='<path d="M23 59h74v31H23Z"/><path d="M23 58c8 15 15-12 24 0s17-12 26 0 16-12 24 0" stroke="#fff7e6" stroke-width="5" fill="none"/><path d="M43 56V37m17 19V31m17 25V37" stroke="currentColor" stroke-width="7"/><path d="M40 27q3-14 6 0m11-6q3-14 6 0m11 6q3-14 6 0" fill="#e5ad49"/>';
const people='<circle cx="60" cy="31" r="13"/><circle cx="27" cy="43" r="10"/><circle cx="93" cy="43" r="10"/><path d="M40 88V62q20-22 40 0v26M10 88V66q17-16 29 0m42 0q17-16 29 0v22" stroke="currentColor" stroke-width="7" fill="none"/>';
const tools='<path d="m28 90 54-56m-52-4 55 55" stroke="currentColor" stroke-width="12"/><path d="M66 12q-4 29 23 26l13-14-4 26-18 2-21-19ZM19 14l29 12-12 19-24-17Z"/>';
const briefcase='<rect x="17" y="36" width="86" height="57" rx="8"/><path d="M43 35V20h34v15M17 57h86" stroke="currentColor" stroke-width="7" fill="none"/><path d="M54 50h12v19H54" fill="#fff7e6"/>';
const definitions:Record<'chance'|'community',Array<[string,string,string,string]>>={
 chance:[
  ['City Hall favor','key-turn',key,'#947443'],['A new beginning','start-sun',home+'<circle cx="96" cy="20" r="10"/>','#568979'],
  ['The skyline calls','skyline-rise',tower,'#5d82a2'],['Opening night','curtain-open','<path d="M15 18h90v77H15Z" opacity=".2"/><path d="M15 18h43q-4 49-43 63Zm90 0H62q4 49 43 63Z"/><path d="m57 63 6-15 6 15 16 1-13 10 4 16-13-9-13 9 4-16-13-10Z"/>','#b27c9d'],
  ['Midtown meeting','meeting-settle',tower+'<circle cx="22" cy="29" r="8"/>','#b56d62'],['Catch the train','train-arrive',train,'#698697'],
  ['Express connection','express-pass',train+'<path d="M5 40h13m-13 13h13m-13 13h13" stroke="currentColor" stroke-width="4"/>','#537778'],
  ['Green infrastructure','energy-charge','<path d="m68 6-40 52h28l-4 39 40-54H65Z"/>','#769652'],
  ['The scenic route','scenic-rewind','<path d="m42 25-25 27 25 27m35-54L52 52l25 27" stroke="currentColor" stroke-width="9" fill="none"/>','#8c7cac'],
  ['Planning violation','bars-close',bars,'#aa7361'],['Street repairs','tools-cross',tools,'#997b55'],['Annual dividend','dividend-drop',coin,'#a38644'],
  ['Speeding fine','fine-stop','<path d="m60 13 46 79H14Z"/><path d="M60 37v24" stroke="#fff7e6" stroke-width="7"/><circle cx="60" cy="76" r="4" fill="#fff7e6"/>','#b66c59'],
  ['City council chair','council-fan',people,'#648c85'],['Successful investment','investment-climb','<path d="M20 93V66h19v27m13 0V43h19v50m13 0V20h19v73"/><path d="m18 44 38-19 19 7 28-25" fill="none" stroke="currentColor" stroke-width="5"/>','#679353'],
  ['Weekend getaway','getaway-swing',briefcase+'<path d="m98 16 9-9" stroke="currentColor" stroke-width="5"/>','#a28055']
 ],
 community:[
  ['Community advocate','advocate-unlock',key+'<path d="m17 81 11 11 22-25" stroke="currentColor" stroke-width="6" fill="none"/>','#6c907b'],
  ['Welcome home','welcome-bloom',home,'#668c80'],['City grant','grant-stamp',coin+'<path d="m40 13 9-8 10 7 10-7 10 8" fill="none" stroke="currentColor" stroke-width="4"/>','#a58a49'],
  ['Clinic bill','clinic-pulse','<rect x="22" y="18" width="76" height="75" rx="10"/><path d="M52 32h16v16h16v16H68v16H52V64H36V48h16Z" fill="#fff7e6"/>','#aa7971'],
  ['Garage sale','sale-flip','<path d="m16 30 50-13 39 40-43 37-44-37Z"/><circle cx="38" cy="39" r="7" fill="#fff7e6"/><text x="71" y="71" text-anchor="middle" fill="#fff7e6" font-size="35" font-family="Fredoka">$</text>','#89966b'],
  ['Administrative mistake','jail-stamp',bars+'<path d="m11 12 16 8" stroke="currentColor" stroke-width="5"/>','#a67768'],
  ['Holiday savings','savings-fill','<path d="M23 38q35-28 70 1l13 8v32H91l-6 15H72l-4-15H47l-4 15H30l-5-22Q9 48 23 38Z"/><path d="M45 25h29" stroke="currentColor" stroke-width="6"/><circle cx="84" cy="48" r="4" fill="#fff7e6"/>','#be8f80'],
  ['Tax refund','refund-return',invoice+'<path d="M14 38 4 52l10 14" fill="none" stroke="currentColor" stroke-width="5"/>','#628c83'],
  ['Birthday wishes','birthday-spark',cake,'#b6869a'],['Life insurance','shield-glow','<path d="M60 9 98 26v32q-4 28-38 39Q26 86 22 58V26Z"/><path d="m39 53 16 16 28-32" fill="none" stroke="#fff7e6" stroke-width="7"/>','#688b9f'],
  ['Hospital bill','hospital-drop','<path d="M21 91V21h78v70Z"/><path d="M53 29h14v12h12v14H67v12H53V55H41V41h12m7 50V78h14v13" fill="#fff7e6"/>','#aa7770'],
  ['Course tuition','book-open','<path d="M15 23q22-8 45 5 23-13 45-5v63q-22-8-45 5-23-13-45-5Z"/><path d="M60 29v61m-34-45 23 3m-23 12 23 3m22-15 23-3m-23 18 23-3" stroke="#fff7e6" stroke-width="4"/>','#877da3'],
  ['Consulting income','consulting-snap',briefcase,'#618d99'],['Neighborhood repairs','repair-build',tools+'<path d="M9 93h102" stroke="currentColor" stroke-width="3"/>','#a28660'],
  ['Garden award','garden-grow',leaf,'#6c965c'],['Family inheritance','family-gather',people+'<path d="M18 97h84" stroke="currentColor" stroke-width="3"/>','#ad9259']
 ]
};
export function cardDesign(deck:'chance'|'community',id:number):CardDesign{const [name,motion,art,color]=definitions[deck][id];return{name,motion,art,color};}
export function cardIllustration(deck:'chance'|'community',id:number){const design=cardDesign(deck,id);return`<svg viewBox="0 0 120 105" aria-hidden="true" style="color:${design.color}"><circle cx="60" cy="53" r="48" fill="currentColor" opacity=".08"/><g class="card-hero" fill="currentColor" style="--card-motion:${design.motion}">${design.art}</g><circle class="card-spark" cx="105" cy="20" r="3" fill="currentColor"/><circle class="card-spark" cx="12" cy="87" r="2" fill="currentColor"/></svg>`;}
