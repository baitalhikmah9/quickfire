/**
 * Category artwork URLs from TriviaApp `src/constants/database.js` (THEMED_CATEGORIES).
 * Double Down uses the same `categoryId` values as `constants/questions.json`.
 */

import type { ImageSource } from 'expo-image';

const LOCAL_S9 = require('@/assets/capitals-and-cities.jpg');

export const CATEGORY_PICTURE_URIS: Record<string, string> = {
  h1: 'https://i.postimg.cc/d312mFb2/19th-century.png',
  h2: 'https://i.postimg.cc/9Fwgq3yZ/19th-century-europe.png',
  h3: 'https://i.postimg.cc/G2Z7XqCj/20th-century.png',
  h4: 'https://i.postimg.cc/7ZsNBm1n/21st-century.png',
  h5: 'https://i.postimg.cc/pVC5YyJn/ancient-civilisations.png',
  h6: 'https://i.postimg.cc/7YGkmWrV/arab-history.png',
  h7: 'https://i.postimg.cc/50B341zs/cold-war.png',
  h8: 'https://i.postimg.cc/j53zd52b/european-history.png',
  h9: 'https://i.postimg.cc/J7JNW18H/south-asian-history.png',
  h10: 'https://i.postimg.cc/j5yLBSfy/middle-ages-europe.png',
  h11: 'https://i.postimg.cc/htJ4HGWm/middle-eastern-history.png',
  h12: 'https://i.postimg.cc/dQHYwK9s/uk-history.png',
  h13: 'https://i.postimg.cc/rFB7wy07/us-history.png',
  h14: 'https://i.postimg.cc/261P51Gz/world-war-i.png',
  h15: 'https://i.postimg.cc/WprHfLfK/world-war-ii.png',
  g1: 'https://i.postimg.cc/dQpJGYTw/ark-survival-evolved.png',
  g2: 'https://i.postimg.cc/1z73TN4F/call-of-duty.png',
  g3: 'https://i.postimg.cc/3xn84DX0/dota.png',
  g4: 'https://i.postimg.cc/nhcZJcyc/grand-theft-auto.png',
  g5: 'https://i.postimg.cc/Xq3mks3J/halo.png',
  g6: 'https://i.postimg.cc/CM8MGpRG/league-of-legends.png',
  g7: 'https://i.postimg.cc/DywYfJzh/minecraft.jpg',
  g8: 'https://i.postimg.cc/63hYttJQ/overwatch.png',
  g9: 'https://i.postimg.cc/gJGHMQwt/red-dead-redemption.png',
  g10: 'https://i.postimg.cc/gjnRQWGs/super-mario-bros.png',
  g11: 'https://i.postimg.cc/HLYrFg2q/the-legend-of-zelda.png',
  g12: 'https://i.postimg.cc/x1SgZt47/the-witcher.png',
  g13: 'https://i.postimg.cc/9X6B4LCm/world-of-warcraft.png',
  pc1: 'https://i.postimg.cc/dtQGZpgw/avatar-the-last-airbender.png',
  pc2: 'https://i.postimg.cc/ryjrTgsQ/breaking-bad.png',
  pc3: 'https://i.postimg.cc/FzCzLWk8/dexter.png',
  pc4: 'https://i.postimg.cc/Dyty3bQV/dc.png',
  pc5: 'https://i.postimg.cc/rwNmGw4B/disney.png',
  pc6: 'https://i.postimg.cc/KzMhN0Vm/dragon-ball.png',
  pc7: 'https://i.postimg.cc/XqPFb7Ls/friends.png',
  pc8: 'https://i.postimg.cc/6q4qCVVd/game-of-thrones.png',
  pc9: 'https://i.postimg.cc/mDvzX6gP/harry-potter.png',
  pc10: 'https://i.postimg.cc/QCDNWLM6/how-i-met-your-mother.png',
  pc11: 'https://i.postimg.cc/ZnJZ5rf7/james-bond.png',
  pc12: 'https://i.postimg.cc/mDsWmYGw/jurassic-park.png',
  pc13: 'https://i.postimg.cc/yYQ3gTMR/marvel.png',
  pc14: 'https://i.postimg.cc/x1mjfyn9/naruto.png',
  pc15: 'https://i.postimg.cc/rsR31jh9/one-piece.png',
  pc16: 'https://i.postimg.cc/28DNdRDD/pirates-of-the-caribbean.png',
  pc17: 'https://i.postimg.cc/zGQdjKg0/pokemon.png',
  pc18: 'https://i.postimg.cc/7hgRf6tx/prison-break.png',
  pc20: 'https://i.postimg.cc/ZqxFBN49/spongebob-squarepants.png',
  pc21: 'https://i.postimg.cc/CKcnpsFx/squid-game.png',
  pc22: 'https://i.postimg.cc/T39c7s4w/star-trek.png',
  pc23: 'https://i.postimg.cc/Twq2grPb/star-wars.png',
  pc24: 'https://i.postimg.cc/k4jZ04YX/stranger-things.png',
  pc25: 'https://i.postimg.cc/63yJ5nvR/the-big-bang-theory.png',
  pc26: 'https://i.postimg.cc/HLKqPjrB/fast-furious.png',
  pc27: 'https://i.postimg.cc/X7KhWQzw/the-hunger-games.png',
  pc28: 'https://i.postimg.cc/7L5m5VKr/the-office-us.png',
  pc29: 'https://i.postimg.cc/BvPBSvvK/the-simpsons.png',
  pc30: 'https://i.postimg.cc/0jkSw59C/shakespeare.png',
  s2: 'https://i.postimg.cc/zBKmg504/cricket.png',
  s3: 'https://i.postimg.cc/8PyYsjT5/formula-1.png',
  s5: 'https://i.postimg.cc/W3brDbN0/nba.png',
  s6: 'https://i.postimg.cc/bY4T5kY6/nfl.png',
  s7: 'https://i.postimg.cc/4NzzF0St/premier-league.png',
  s8: 'https://i.postimg.cc/rwVtZw4Q/tennis.png',
  s10: 'https://i.postimg.cc/N0yFZ9jp/ufc.png',
  s11: 'https://i.postimg.cc/Pr3thXc4/which-player.png',
  s12: 'https://i.postimg.cc/C5vVF7v7/world-cup.png',
  gen1: 'https://i.postimg.cc/6QQbKKk0/corporations.png',
  gen2: 'https://i.postimg.cc/hjSwfxQ0/geography.png',
  gen3: 'https://i.postimg.cc/ncZkZZ7F/science.png',
  gen4: 'https://i.postimg.cc/65jGSNhw/uk.png',
  gen5: 'https://i.postimg.cc/PxTxJ6Mg/usa.png',
};

export function getCategoryPictureSource(categoryId: string): ImageSource | null {
  if (categoryId === 's9') {
    return LOCAL_S9;
  }
  const uri = CATEGORY_PICTURE_URIS[categoryId];
  return uri ? { uri } : null;
}

/** Topic stripe colour (matches TriviaApp Games vs default blue). */
export function getCategoryBoardAccent(categoryId: string): string {
  return /^g\d+$/.test(categoryId) ? '#10b981' : '#3b82f6';
}
