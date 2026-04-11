/**
 * Categories derived from constants/questions.json.
 * Slug format matches scripts/normalize-questions.ts (slugify of name).
 * Used when Convex is not seeded.
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Unique categories from questions.json: id, slug (for selection), title (English display) */
const RAW_CATEGORIES: { id: string; name: string }[] = [
  { id: 'h1', name: '19th Century' },
  { id: 'h2', name: '19th Century Europe' },
  { id: 'h3', name: '20th Century' },
  { id: 'h4', name: '21st Century' },
  { id: 'h5', name: 'Ancient Civilisations' },
  { id: 'h6', name: 'Arab History' },
  { id: 'h7', name: 'Cold War' },
  { id: 'h8', name: 'European History' },
  { id: 'h9', name: 'South Asian History' },
  { id: 'h10', name: 'Middle Ages Europe' },
  { id: 'h11', name: 'Middle Eastern History' },
  { id: 'h12', name: 'UK History' },
  { id: 'h13', name: 'US History' },
  { id: 'h14', name: 'WW1' },
  { id: 'h15', name: 'WW2' },
  { id: 'g1', name: 'ARK: Survival Evolved' },
  { id: 'g2', name: 'Call of Duty' },
  { id: 'g3', name: 'DoTA' },
  { id: 'g4', name: 'Grand Theft Auto' },
  { id: 'g5', name: 'Halo' },
  { id: 'g6', name: 'League of Legends' },
  { id: 'g7', name: 'Minecraft' },
  { id: 'g8', name: 'Overwatch' },
  { id: 'g9', name: 'Red Dead Redemption' },
  { id: 'g10', name: 'Super Mario Bros' },
  { id: 'g11', name: 'The Legend of Zelda' },
  { id: 'g12', name: 'The Witcher' },
  { id: 'g13', name: 'World of Warcraft' },
  { id: 's2', name: 'Cricket' },
  { id: 's3', name: 'Formula 1' },
  { id: 's5', name: 'NBA' },
  { id: 's6', name: 'NFL' },
  { id: 's7', name: 'Premier League' },
  { id: 's8', name: 'Tennis' },
  { id: 's9', name: 'UEFA Champions League' },
  { id: 's10', name: 'UFC' },
  { id: 's11', name: 'Which Player?' },
  { id: 's12', name: 'World Cup' },
  { id: 'gen1', name: 'Corporations' },
  { id: 'gen2', name: 'Geography' },
  { id: 'gen3', name: 'Science' },
  { id: 'gen4', name: 'UK (General)' },
  { id: 'gen5', name: 'US (General)' },
  { id: 'pc1', name: 'Avatar: TLA' },
  { id: 'pc2', name: 'Breaking Bad' },
  { id: 'pc3', name: 'Dexter' },
  { id: 'pc4', name: 'DC' },
  { id: 'pc5', name: 'Disney' },
  { id: 'pc6', name: 'Dragon Ball' },
  { id: 'pc7', name: 'Friends' },
  { id: 'pc8', name: 'Game of Thrones' },
  { id: 'pc9', name: 'Harry Potter' },
  { id: 'pc10', name: 'How I Met Your Mother' },
  { id: 'pc11', name: 'James Bond' },
  { id: 'pc12', name: 'Jurassic Park' },
  { id: 'pc13', name: 'Marvel' },
  { id: 'pc14', name: 'Naruto' },
  { id: 'pc15', name: 'One Piece' },
  { id: 'pc16', name: 'Pirates of the Caribbean' },
  { id: 'pc17', name: 'Pokémon' },
  { id: 'pc18', name: 'Prison Break' },
  { id: 'pc20', name: 'SpongeBob SquarePants' },
  { id: 'pc21', name: 'Squid Game' },
  { id: 'pc22', name: 'Star Trek' },
  { id: 'pc23', name: 'Star Wars' },
  { id: 'pc24', name: 'Stranger Things' },
  { id: 'pc25', name: 'The Big Bang Theory' },
  { id: 'pc26', name: 'The Fast and the Furious' },
  { id: 'pc27', name: 'The Hunger Games' },
  { id: 'pc28', name: 'The Office (US)' },
  { id: 'pc29', name: 'The Simpsons' },
  { id: 'pc30', name: 'Shakespeare' },
];

export const FALLBACK_CATEGORIES = RAW_CATEGORIES.map((c) => ({
  id: c.id,
  slug: slugify(c.name),
  title: c.name,
}));
