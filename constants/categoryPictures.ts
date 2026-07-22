/**
 * Category artwork - local images from assets/topics/ only.
 * Categories without a bundled image resolve to null; UI shows MISSING.
 */

import type { ImageSource } from 'expo-image';

/** Shown in place of category art when no local image is mapped. */
export const MISSING_CATEGORY_PICTURE_LABEL = 'MISSING';

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
  g10: require('../assets/topics/super_mario_bros.png'),
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
  pc23: require('../assets/topics/star-wars.png'),
  pc24: require('../assets/topics/stranger-things.png'),
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
  gen5: require('../assets/topics/USA.png'),
  h14: require('../assets/topics/ww1.png'),
  h15: require('../assets/topics/ww2.png'),
  s11: require('../assets/topics/which_player.png'),
  gen6: require('../assets/topics/capitals_and_cities.png'),
  gen7: require('../assets/topics/famous_firsts.png'),
  gen9: require('../assets/topics/general_knowledge.png'),
  gen10: require('../assets/topics/which_decade.png'),
  gen12: require('../assets/topics/what_year.png'),
  gen13: require('../assets/topics/what_s_in_between.png'),
  gen14: require('../assets/topics/initials_only.png'),
  gen15: require('../assets/topics/invented_where.png'),
  gen16: require('../assets/topics/nicknames.png'),
  gen17: require('../assets/topics/famous_icons.png'),
  gen18: require('../assets/topics/odd_one_out.png'),
  gen19: require('../assets/topics/talabul-ilm.png'),
  gen20: require('../assets/topics/trump_quotes.png'),
  gen21: require('../assets/topics/what_came_next.png'),
  gen22: require('../assets/topics/whats_the_connection.png'),
  gen23: require('../assets/topics/Which_country.png'),
  gen24: require('../assets/topics/famous_quotes.png'),
  gen26: require('../assets/topics/before_they_were_famous.png'),
  gen27: require('../assets/topics/two_truths_and_a_lie.png'),
  h16: require('../assets/topics/european_christendom.png'),
  h17: require('../assets/topics/ertugral.png'),
  h18: require('../assets/topics/kurulus_osman.png'),
  pc31: require('../assets/topics/attack_on_titan.png'),
  pc32: require('../assets/topics/peaky_blinders.png'),
  pc33: require('../assets/topics/suits.png'),

};

export function getCategoryPictureSource(categoryId: string): ImageSource | null {
  return LOCAL[categoryId] ?? null;
}

/** Topic stripe colour (matches TriviaApp Games vs default blue). */
export function getCategoryBoardAccent(categoryId: string): string {
  return /^g\d+$/.test(categoryId) ? '#10b981' : '#3b82f6';
}
