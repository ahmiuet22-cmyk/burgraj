import fs from 'fs';
import path from 'path';

const srcDir = `C:/Users/Khadija'Laptop/.gemini/antigravity-ide/brain/69fc5c96-4bfc-4bfc-9227-e6dd19718577`;
const destDir = `c:/out/graj/website/assets`;

const files = [
  ['corolla_zinger_burger_1788876575501.jpg', 'corolla-zinger.jpg'],
  ['civic_grilled_burger_1788876610878.jpg', 'civic-grilled.jpg'],
  ['picanto_chapli_burger_1788876647024.jpg', 'picanto-chapli.jpg'],
  ['chicken_fillet_wrap_1788876687569.jpg', 'wheeler-wrap.jpg'],
  ['tikka_artisan_pizza_1788876730589.jpg', 'tikka-pizza.jpg'],
  ['pepperoni_gourmet_pizza_1788876785666.jpg', 'pepperoni-pizza.jpg'],
  ['signature_baked_calzone_1788876849361.jpg', 'baked-calzone.jpg'],
  ['crispy_chicken_wings_1788876921625.jpg', 'crispy-wings.jpg'],
  ['cold_fizzy_drinks_1788877011724.jpg', 'cold-drinks.jpg']
];

for (const [src, dest] of files) {
  const s = path.join(srcDir, src);
  const d = path.join(destDir, dest);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
    console.log('Successfully copied:', dest);
  } else {
    console.warn('File not found:', s);
  }
}
