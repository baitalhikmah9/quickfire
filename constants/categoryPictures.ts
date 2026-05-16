/**
 * Category artwork — local images from assets/topics/ with remote URL fallbacks
 * for categories without a matching downloaded image.
 */

import type { ImageSource } from 'expo-image';

// ── Local images (require() for Metro bundler) ──────────────────────────

const LOCAL: Record<string, ImageSource> = {
  h1: require('../assets/topics/19th_cent.png'),
  h2: require('../assets/topics/19th_cent_eu.png'),
  h3: require('../assets/topics/20th_century.png'),
  h4: require('../assets/topics/21st_cent.png'),
  h5: require('../assets/topics/ancient_civilisations.png'),
  h7: require('../assets/topics/cold_war.png'),
  h8: require('../assets/topics/European_history.png'),
  h11: require('../assets/topics/modern_middle_east.png'),
  h12: require('../assets/topics/UK_history.png'),
  h13: require('../assets/topics/american_history.png'),
  g1: require('../assets/topics/ark-survival-evolved.png'),
  g3: require('../assets/topics/dota.png'),
  g5: require('../assets/topics/halo.png'),
  g6: require('../assets/topics/LoL.png'),
  g7: require('../assets/topics/minecraft.png'),
  g8: require('../assets/topics/overwatch.png'),
  g9: require('../assets/topics/RDR2.png'),
  g11: require('../assets/topics/the-legend-of-zelda.png'),
  pc1: require('../assets/topics/atla.png'),
  pc2: require('../assets/topics/breaking_bad.png'),
  pc3: require('../assets/topics/dexter.png'),
  pc4: require('../assets/topics/DC.png'),
  pc5: require('../assets/topics/disney.png'),
  pc6: require('../assets/topics/dragon_ball.png'),
  pc7: require('../assets/topics/friends.png'),
  pc8: require('../assets/topics/game_of_thrones.png'),
  pc9: require('../assets/topics/harry_potter.png'),
  pc10: require('../assets/topics/himym.png'),
  pc11: require('../assets/topics/James_bond.png'),
  pc13: require('../assets/topics/mcu.png'),
  pc14: require('../assets/topics/naruto.png'),
  pc15: require('../assets/topics/one_piece.png'),
  pc16: require('../assets/topics/PotC.png'),
  pc17: require('../assets/topics/pokemon.png'),
  pc18: require('../assets/topics/prison-break.png'),
  pc20: require('../assets/topics/spongebob.png'),
  pc23: require('../assets/topics/star wars.png'),
  pc24: require('../assets/topics/stranger things.png'),
  pc25: require('../assets/topics/big_bang_theory.png'),
  pc26: require('../assets/topics/fast_and_furious.png'),
  pc28: require('../assets/topics/the_office.png'),
  s2: require('../assets/topics/cricket.png'),
  s3: require('../assets/topics/f1.png'),
  s5: require('../assets/topics/NBA.png'),
  s7: require('../assets/topics/epl.png'),
  s9: require('../assets/topics/ucl.png'),
  s10: require('../assets/topics/UFC.png'),
  s12: require('../assets/topics/world_cup.png'),
  gen1: require('../assets/topics/corporations.png'),
  gen2: require('../assets/topics/geography.png'),
  gen3: require('../assets/topics/science.png'),
  gen4: require('../assets/topics/UK.png'),
};

// ── Remote URL fallbacks for categories without a local image ──────────

const FALLBACK_URIS: Record<string, string> = {
  h6: 'https://i.postimg.cc/7YGkmWrV/arab-history.png',
  h9: 'https://i.postimg.cc/J7JNW18H/south-asian-history.png',
  h10: 'https://i.postimg.cc/j5yLBSfy/middle-ages-europe.png',
  h14: 'https://i.postimg.cc/261P51Gz/world-war-i.png',
  h15: 'https://i.postimg.cc/WprHfLfK/world-war-ii.png',
  g2: 'https://i.postimg.cc/1z73TN4F/call-of-duty.png',
  g4: 'https://i.postimg.cc/nhcZJcyc/grand-theft-auto.png',
  g10: 'https://i.postimg.cc/gjnRQWGs/super-mario-bros.png',
  g12: 'https://i.postimg.cc/x1SgZt47/the-witcher.png',
  g13: 'https://i.postimg.cc/9X6B4LCm/world-of-warcraft.png',
  pc12: 'https://i.postimg.cc/mDsWmYGw/jurassic-park.png',
  pc21: 'https://i.postimg.cc/CKcnpsFx/squid-game.png',
  pc22: 'https://i.postimg.cc/T39c7s4w/star-trek.png',
  pc27: 'https://i.postimg.cc/X7KhWQzw/the-hunger-games.png',
  pc29: 'https://i.postimg.cc/BvPBSvvK/the-simpsons.png',
  pc30: 'https://i.postimg.cc/0jkSw59C/shakespeare.png',
  s6: 'https://i.postimg.cc/bY4T5kY6/nfl.png',
  s8: 'https://i.postimg.cc/rwVtZw4Q/tennis.png',
  s11: 'https://i.postimg.cc/Pr3thXc4/which-player.png',
  gen5: 'https://i.postimg.cc/PxTxJ6Mg/usa.png',
};

export function getCategoryPictureSource(categoryId: string): ImageSource | null {
  // Local image takes precedence
  if (LOCAL[categoryId]) return LOCAL[categoryId];

  // Remote fallback
  const uri = FALLBACK_URIS[categoryId];
  return uri ? { uri } : null;
}

/** Topic stripe colour (matches TriviaApp Games vs default blue). */
export function getCategoryBoardAccent(categoryId: string): string {
  return /^g\d+$/.test(categoryId) ? '#10b981' : '#3b82f6';
}
