/* ============================================================
   TERRAIN DATASET
   Mountains and rivers. The quiz shows the clue and asks you
   to identify the feature by name.
   Each record: { name, type, region, clue }
   - type: 'Mountain' | 'River'
   - region: continent bucket used for difficulty filtering
   ============================================================ */
(function () {
  const F = (region, rows) =>
    rows.map(([name, type, clue]) => ({ name, type, region, clue }));

  const data = [].concat(
    // ---- Mountains ----
    F('Asia', [
      ['Mount Everest', 'Mountain', "Earth's highest peak above sea level, in the Himalayas."],
      ['K2', 'Mountain', "The world's second-highest mountain, in the Karakoram range."],
      ['Kangchenjunga', 'Mountain', 'The third-highest mountain, on the India–Nepal border.'],
      ['Mount Fuji', 'Mountain', "Japan's highest mountain, a symmetrical sacred volcano."],
    ]),
    F('Africa', [
      ['Mount Kilimanjaro', 'Mountain', "Africa's highest peak, a dormant volcano in Tanzania."],
      ['Mount Kenya', 'Mountain', 'The highest mountain in Kenya, the country’s namesake.'],
    ]),
    F('Europe', [
      ['Mont Blanc', 'Mountain', 'The highest peak in the Alps, on the France–Italy border.'],
      ['Mount Elbrus', 'Mountain', 'The highest peak in Europe, in the Caucasus of Russia.'],
      ['Matterhorn', 'Mountain', 'An iconic pyramidal Alpine peak on the Swiss–Italian border.'],
    ]),
    F('North America', [
      ['Denali', 'Mountain', 'The highest peak in North America, in Alaska.'],
      ['Mount Logan', 'Mountain', "Canada's highest mountain, in the Yukon."],
    ]),
    F('South America', [
      ['Aconcagua', 'Mountain', 'The highest peak in the Americas, in the Argentine Andes.'],
      ['Chimborazo', 'Mountain', "The Andean volcano whose summit is farthest from Earth's centre."],
    ]),
    F('Oceania', [
      ['Mount Kosciuszko', 'Mountain', 'The highest peak on the Australian mainland.'],
      ['Aoraki / Mount Cook', 'Mountain', "New Zealand's highest mountain."],
    ]),

    // ---- Rivers ----
    F('Africa', [
      ['Nile', 'River', 'The longest river in Africa, flowing north to the Mediterranean.'],
      ['Congo River', 'River', 'The deepest river in the world, crossing Central Africa.'],
      ['Niger River', 'River', 'West Africa’s principal river, with a great inland delta in Mali.'],
      ['Zambezi', 'River', 'The southern African river that plunges over Victoria Falls.'],
    ]),
    F('South America', [
      ['Amazon River', 'River', 'The river carrying the greatest volume of water on Earth.'],
      ['Paraná River', 'River', 'A major South American river feeding the Río de la Plata.'],
      ['Orinoco', 'River', 'A great river arcing through Venezuela and Colombia.'],
    ]),
    F('North America', [
      ['Mississippi River', 'River', "The principal river of North America's central basin."],
      ['Colorado River', 'River', 'The river that carved the Grand Canyon.'],
      ['Yukon River', 'River', 'A major river of Alaska and northwestern Canada.'],
    ]),
    F('Asia', [
      ['Yangtze', 'River', 'Asia’s longest river, flowing across China to Shanghai.'],
      ['Yellow River', 'River', "China's 'Mother River', the Huang He."],
      ['Ganges', 'River', 'The sacred river of the northern Indian plains.'],
      ['Mekong', 'River', 'Southeast Asia’s great river crossing six countries.'],
      ['Indus', 'River', 'The river that gave India its name, flowing through Pakistan.'],
    ]),
    F('Europe', [
      ['Volga', 'River', "Europe's longest river, flowing through Russia to the Caspian Sea."],
      ['Danube', 'River', 'The river flowing through ten countries to the Black Sea.'],
      ['Rhine', 'River', 'A major Western European river from the Alps to the North Sea.'],
    ]),
    F('Oceania', [
      ['Murray River', 'River', "Australia's longest river."],
      ['Darling River', 'River', 'A long river of inland eastern Australia, tributary of the Murray.'],
    ]),

    // ---- Lakes ----
    F('Asia', [
      ['Caspian Sea', 'Lake', "The world's largest inland body of water, a salt lake bordered by five nations."],
      ['Lake Baikal', 'Lake', "The world's deepest and oldest freshwater lake, in Siberia."],
      ['Aral Sea', 'Lake', 'A once-vast Central Asian lake that has largely dried up.'],
      ['Dead Sea', 'Lake', 'A hypersaline lake at the lowest land elevation on Earth.'],
    ]),
    F('Africa', [
      ['Lake Victoria', 'Lake', "Africa's largest lake and a source of the White Nile."],
      ['Lake Tanganyika', 'Lake', "The world's second-deepest lake, in the East African Rift."],
      ['Lake Malawi', 'Lake', 'A long Rift Valley lake bordering Malawi, Mozambique and Tanzania.'],
      ['Lake Chad', 'Lake', 'A shrinking lake where four African nations meet.'],
    ]),
    F('North America', [
      ['Lake Superior', 'Lake', 'The largest of the Great Lakes by surface area.'],
      ['Great Salt Lake', 'Lake', 'A large saline lake in the US state of Utah.'],
    ]),
    F('South America', [
      ['Lake Titicaca', 'Lake', 'The highest navigable lake, on the Bolivia–Peru border.'],
      ['Lake Maracaibo', 'Lake', 'A large brackish inlet in northwestern Venezuela.'],
    ])
  );

  window.GEO_TERRAIN = data;
})();
