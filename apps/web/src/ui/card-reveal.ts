import {BOARD,CARDS} from '../../../../packages/core/board';
import type {Game} from '../../../../packages/core/types';
import {cardDesign,cardIllustration} from '../card-designs';
import {cardRules,pendingCardPresentation,type CardPresentation} from '../card-presentation';
import {esc,icon,signed} from './dom';

const DECK_NAME={chance:'Chance',community:'Community Chest'} as const;
const chest='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 28h44v24a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z" fill="currentColor" opacity=".9"/><path d="M10 28a22 14 0 0 1 44 0" fill="none" stroke="currentColor" stroke-width="4"/><rect x="27" y="30" width="10" height="11" rx="2" fill="#fff" opacity=".9"/></svg>';
const question='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M23 23a9 9 0 1 1 13 8c-3 1.6-4 3.6-4 6.5V40M32 49h.01" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';

export function cardBack(deck:'chance'|'community'){
 return `<div class="card-back deck-${deck}" aria-hidden="true"><span class="card-back-mark">${deck==='chance'?question:chest}</span><span class="card-back-name">${DECK_NAME[deck]}</span></div>`;
}

/** Printed face: title, illustration, exact instruction and the rules it applies. */
export function cardFace(card:Pick<CardPresentation,'deck'|'id'|'annotations'|'amount'>&{meta?:string},compact=false){
 const design=cardDesign(card.deck,card.id),text=CARDS[card.deck][card.id].text;
 return `<article class="card-face deck-${card.deck}${compact?' compact':''}" data-motion="${design.motion}"><header class="card-face-head"><span>${DECK_NAME[card.deck]}</span>${card.meta?`<small>${esc(card.meta)}</small>`:''}</header><div class="card-art">${cardIllustration(card.deck,card.id)}</div><h3 class="card-title">${esc(design.name)}</h3><p class="card-text">${esc(text)}</p>${card.amount!==undefined&&card.amount!==0?`<p class="card-amount ${card.amount<0?'neg':'pos'}">${signed(card.amount)}</p>`:''}${compact?'':`<ul class="card-notes">${card.annotations.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`}</article>`;
}

export interface CardRevealOptions {viewer:string|null;canResolve:boolean;canContinueBot:boolean;reduced:boolean}
export function cardReveal(g:Game,options:CardRevealOptions){
 const card=pendingCardPresentation(g);if(!card)return'';
 const pending=g.pendingCard!,mine=pending.player===options.viewer,drawer=g.players.find(p=>p.id===pending.player)!;
 const meta=`${mine?'You':drawer.name} · ${BOARD[card.source].name}`;
 if(!mine){
  return `<div class="card-stage observer${options.reduced?' reduced':''}" role="status" aria-live="polite" data-card-event="${pending.event}"><div class="card-flip deck-${card.deck}">${cardBack(card.deck)}${cardFace({...card,meta},true)}</div><div class="card-cta">${drawer.bot&&options.canContinueBot?`<button class="btn primary small" data-do="continue-observer-card">Continue</button>`:''}<button class="btn quiet small" data-do="hide-card">${icon('eye')}<span>Hide</span></button></div></div>`;
 }
 return `<div class="card-stage${options.reduced?' reduced':''}" role="dialog" aria-modal="true" aria-label="${DECK_NAME[card.deck]} card" data-card-event="${pending.event}"><div class="card-flip deck-${card.deck}">${cardBack(card.deck)}${cardFace({...card,meta})}</div><div class="card-cta"><button class="btn quiet" data-do="hide-card">${icon('eye')}<span>View board</span></button><button class="btn primary" data-action='{"type":"resolveCard"}' data-haptic="light" ${options.canResolve?'':'disabled'}>${icon('check')}<span>Continue</span></button></div></div>`;
}

/** Catalogue of both decks for the rules sheet. */
export function deckCatalog(){
 return (['chance','community'] as const).map(deck=>`<section class="catalog-deck"><h3>${DECK_NAME[deck]}</h3><div class="catalog-grid">${CARDS[deck].map((card,id)=>cardFace({deck,id,annotations:cardRules(card)})).join('')}</div></section>`).join('');
}
