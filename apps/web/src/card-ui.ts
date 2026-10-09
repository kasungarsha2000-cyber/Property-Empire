import {cardDesign,cardIllustration} from './card-designs';
import {BOARD,CARDS} from '../../../packages/core/board';
import {cardRules,type CardPresentation} from './card-presentation';
import {escapeHTML as e} from './ui-components';
export function cardFaceMarkup(deck:'chance'|'community',id:number,annotations=cardRules(CARDS[deck][id]),meta='Deck card',amount?:number){
 const chance=deck==='chance',name=chance?'Chance':'Community Chest';
 const design=cardDesign(deck,id),illustration=cardIllustration(deck,id);
 return`<article class="deck-card deck-${deck}" data-card="${deck}-${id}" data-motion="${design.motion}"><div class="card-face-top"><span>${name}</span><small>${e(meta)}</small></div><div class="card-illustration">${illustration}</div><h3 class="card-scene-title">${e(design.name)}</h3><p class="card-instruction">${e(CARDS[deck][id].text)}</p>${amount!==undefined?`<div class="card-effect"><span>${amount<0?'Card obligation':'Card effect'}</span><strong>${amount<0?'−':'+'}$${Math.abs(amount).toLocaleString('en-US')}</strong></div>`:''}<ul class="card-annotations">${annotations.map(text=>`<li>${e(text)}</li>`).join('')}</ul></article>`;
}
export function drawnCardMarkup(card:CardPresentation){return cardFaceMarkup(card.deck,card.id,card.annotations,`${card.player} · ${BOARD[card.source].name}`,card.amount);}
