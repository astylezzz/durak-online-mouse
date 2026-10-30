export const SUITS = ['♠', '♥', '♣', '♦'];
export const RANKS = ['6','7','8','9','10','В','Д','К','Т'];
export function createGame(random = Math.random) {
  const deck = SUITS.flatMap(suit => RANKS.map((rank, value) => ({id: `${suit}${rank}`, suit, rank, value})));
  for (let i = deck.length-1; i>0; i--) { const j=Math.floor(random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  const trump = {...deck[0]};
  const hands=[[],[]];
  for(let n=0;n<6;n++) for(let p=0;p<2;p++) hands[p].push(deck.pop());
  const lowest = hands.map(h => Math.min(...h.filter(c=>c.suit===trump.suit).map(c=>c.value)));
  return {deck,trump,hands,attacker:lowest[1]<lowest[0]?1:0,table:[],limit:6,taking:false,discard:0,winner:null,round:1};
}
export function beats(card, other, trump) {
  return card.suit===other.suit ? card.value>other.value : card.suit===trump && other.suit!==trump;
}
export function act(state, player, action) {
  const s=structuredClone(state);
  if(s.winner!==null) throw Error('Партия уже закончилась.');
  const defender=1-s.attacker;
  if(action.type==='play') {
    const hand=s.hands[player], index=hand.findIndex(c=>c.id===action.card);
    if(index<0) throw Error('Этой карты нет в лапках.');
    const card=hand[index];
    if(player===s.attacker) {
      if(s.table.length>=s.limit) throw Error('Больше подкидывать нельзя.');
      if(s.table.length && !s.table.some(pair=>[pair.attack,pair.defense].some(c=>c?.rank===card.rank))) throw Error('Можно подкинуть только достоинство со стола.');
      s.table.push({attack:card,defense:null});
    } else {
      if(s.taking) throw Error('Вы уже решили взять карты.');
      const pair=s.table[action.target];
      if(!pair || pair.defense) throw Error('Выберите непокрытую карту на столе.');
      if(!beats(card,pair.attack,s.trump.suit)) throw Error('Нужна старшая карта той же масти или козырь.');
      pair.defense=card;
    }
    hand.splice(index,1);
  } else if(action.type==='take') {
    if(player!==defender || !s.table.length || s.taking || s.table.every(p=>p.defense)) throw Error('Сейчас нельзя взять карты.');
    s.taking=true;
  } else if(action.type==='finish') {
    if(player!==s.attacker || !s.table.length) throw Error('Завершить ход может атакующий.');
    if(!s.taking && s.table.some(p=>!p.defense)) throw Error('Сначала нужно покрыть все карты.');
    if(s.taking) s.hands[defender].push(...s.table.flatMap(p=>p.defense?[p.attack,p.defense]:[p.attack]));
    else s.discard+=s.table.length*2;
    for(const p of [s.attacker,defender]) while(s.hands[p].length<6 && s.deck.length) s.hands[p].push(s.deck.pop());
    if(!s.taking) s.attacker=defender;
    s.table=[];s.taking=false;s.round++;
    s.limit=Math.min(6,s.hands[1-s.attacker].length);
    if(!s.deck.length) {
      if(!s.hands[0].length && !s.hands[1].length) s.winner='draw';
      else if(!s.hands[0].length) s.winner=0;
      else if(!s.hands[1].length) s.winner=1;
    }
  } else throw Error('Неизвестное действие.');
  return s;
}
export function view(state, player) {
  return {...state,deck:state.deck.length,hands:undefined,hand:state.hands[player],opponentCount:state.hands[1-player].length,you:player};
}
