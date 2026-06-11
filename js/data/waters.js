/* ============================================================
   WATERS DATASET
   Seas, oceans, gulfs, bays and major lakes.
   The quiz shows the clue and asks you to identify the name.
   Each record: { name, type, region, clue }
   - region: bucket used for difficulty filtering. The five
     oceans (and Caspian-scale global features) sit in "Oceans".
   ============================================================ */
(function () {
  const W = (region, rows) =>
    rows.map(([name, type, clue]) => ({ name, type, region, clue }));

  const data = [].concat(
    W('Oceans', [
      ['Pacific Ocean', 'Ocean', 'The largest and deepest ocean on Earth.'],
      ['Atlantic Ocean', 'Ocean', 'The second-largest ocean, separating the Americas from Europe and Africa.'],
      ['Indian Ocean', 'Ocean', 'The third-largest ocean, bordered by Africa, Asia and Australia.'],
      ['Arctic Ocean', 'Ocean', 'The smallest and shallowest ocean, surrounding the North Pole.'],
      ['Southern Ocean', 'Ocean', 'The ocean encircling Antarctica.'],
    ]),

    W('Europe', [
      ['Mediterranean Sea', 'Sea', 'The sea between Southern Europe, North Africa and the Levant.'],
      ['Baltic Sea', 'Sea', 'A brackish inland sea of Northern Europe.'],
      ['North Sea', 'Sea', 'A sea of the Atlantic between Great Britain and Scandinavia.'],
      ['Black Sea', 'Sea', 'An inland sea between Europe and Asia, reached through the Bosphorus.'],
      ['Adriatic Sea', 'Sea', 'The arm of the Mediterranean between Italy and the Balkans.'],
      ['Aegean Sea', 'Sea', 'The island-studded Mediterranean arm between Greece and Turkey.'],
      ['Tyrrhenian Sea', 'Sea', 'The part of the Mediterranean west of Italy, ringed by Sardinia and Sicily.'],
      ['Irish Sea', 'Sea', 'The sea separating Ireland from Great Britain.'],
      ['Bay of Biscay', 'Bay', 'The Atlantic gulf along the west coast of France and northern Spain.'],
    ]),

    W('Asia', [
      ['Red Sea', 'Sea', 'The narrow sea between Africa and the Arabian Peninsula.'],
      ['Arabian Sea', 'Sea', 'The northwestern arm of the Indian Ocean, off the Arabian Peninsula.'],
      ['Bay of Bengal', 'Bay', 'The vast bay of the Indian Ocean east of India.'],
      ['South China Sea', 'Sea', 'A heavily contested marginal sea south of China.'],
      ['East China Sea', 'Sea', 'The sea between China and Japan’s Ryukyu Islands.'],
      ['Sea of Japan', 'Sea', 'The marginal sea between Japan and the Asian mainland.'],
      ['Yellow Sea', 'Sea', 'The marginal sea between China and the Korean Peninsula.'],
      ['Persian Gulf', 'Gulf', 'The gulf between Iran and the Arabian Peninsula.'],
      ['Sea of Okhotsk', 'Sea', 'The cold sea between the Kamchatka Peninsula and the Asian mainland.'],
      ['Caspian Sea', 'Lake', "The world's largest inland body of water, a salt lake bordered by five nations."],
      ['Aral Sea', 'Lake', 'A once-vast Central Asian lake that has largely dried up.'],
      ['Dead Sea', 'Lake', 'A hypersaline lake at the lowest land elevation on Earth.'],
      ['Lake Baikal', 'Lake', "The world's deepest and oldest freshwater lake, in Siberia."],
    ]),

    W('Africa', [
      ['Lake Victoria', 'Lake', "Africa's largest lake and a source of the White Nile."],
      ['Lake Tanganyika', 'Lake', "The world's second-deepest lake, in the East African Rift."],
      ['Lake Malawi', 'Lake', 'A long Rift Valley lake bordering Malawi, Mozambique and Tanzania.'],
      ['Lake Chad', 'Lake', 'A shrinking lake where four African nations meet.'],
      ['Gulf of Guinea', 'Gulf', 'The gulf of the Atlantic off the coast of West Africa.'],
      ['Mozambique Channel', 'Sea', 'The strait separating Madagascar from mainland Africa.'],
    ]),

    W('North America', [
      ['Gulf of Mexico', 'Gulf', 'The ocean basin bordered by the United States, Mexico and Cuba.'],
      ['Caribbean Sea', 'Sea', 'The tropical sea east of Central America, dotted with islands.'],
      ['Hudson Bay', 'Bay', 'A vast inland sea in northeastern Canada.'],
      ['Lake Superior', 'Lake', 'The largest of the Great Lakes by surface area.'],
      ['Great Salt Lake', 'Lake', 'A large saline lake in the US state of Utah.'],
      ['Gulf of Alaska', 'Gulf', 'The arm of the Pacific bordering southern Alaska.'],
    ]),

    W('South America', [
      ['Lake Titicaca', 'Lake', 'The highest navigable lake, on the Bolivia–Peru border.'],
      ['Lake Maracaibo', 'Lake', 'A large brackish inlet in northwestern Venezuela.'],
    ]),

    W('Oceania', [
      ['Coral Sea', 'Sea', 'The sea off northeastern Australia, home to the Great Barrier Reef.'],
      ['Tasman Sea', 'Sea', 'The sea between Australia and New Zealand.'],
      ['Great Australian Bight', 'Bay', "The open bay along Australia's southern coast."],
      ['Gulf of Carpentaria', 'Gulf', 'The large shallow gulf on Australia’s northern coast.'],
    ])
  );

  window.GEO_WATERS = data;
})();
