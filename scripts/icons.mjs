import sharp from 'sharp';
for (const [size, file] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  await sharp('public/favicon.svg').resize(size, size).png().toFile('public/' + file);
}
