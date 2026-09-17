/* Osman Gourmet Beydağı — ortak menü verisi
   Fiyatlar 17.09.2026 tarihli basılı menüden alınmıştır.
   kcal değerleri YAKLAŞIKTIR ve restoran tarafından doğrulanmalıdır. */

window.VENUE = {
  name: "Osman Gourmet",
  name2: "Beydağı",
  since: "2008",
  tagline: { tr: "Meze · Kebap · Türk Pidesi", en: "Mezze · Kebab · Turkish Pita", ar: "مازة · كباب · فطير تركي", ru: "Мезе · Кебаб · Турецкая пита" },
  address: "Binbirdirek, Klodfarer Cd. No:27/B, 34122 Fatih / İstanbul",
  district: { tr: "Sultanahmet, Fatih", en: "Sultanahmet, Fatih", ar: "سلطان أحمد، الفاتح", ru: "Султанахмет, Фатих" },
  phone: "+90 212 638 34 44",
  phoneDisplay: "(0212) 638 34 44",
  whatsapp: "902126383444",
  maps: "https://www.google.com/maps/search/?api=1&query=Osman+Gourmet+Restaurant+Klodfarer+Cd+27B+Fatih+Istanbul",
  directions: "https://www.google.com/maps/dir/?api=1&destination=Osman+Gourmet+Restaurant+Klodfarer+Cd+27B+Fatih+Istanbul",
  reservation: "https://www.quandoo.com",
  rating: 4.7,
  reviews: 1250,
  hours: { tr: "Her gün 08:00 – 02:00", en: "Daily 08:00 – 02:00", ar: "يومياً ٠٨:٠٠ – ٠٢:٠٠", ru: "Ежедневно 08:00 – 02:00" },
  priceRange: "₺400 – ₺1.400"
};

window.LANGS = [
  { code: "tr", label: "Türkçe", short: "TR", dir: "ltr" },
  { code: "en", label: "English", short: "EN", dir: "ltr" },
  { code: "ar", label: "العربية", short: "AR", dir: "rtl" },
  { code: "ru", label: "Русский", short: "RU", dir: "ltr" }
];

window.UI = {
  tr: { menu: "Menü", search: "Menüde ara", searchShort: "Ara", all: "Tümü", info: "İletişim", call: "Ara", directions: "Yol tarifi", maps: "Haritada aç", whatsapp: "WhatsApp", reserve: "Rezervasyon", hours: "Çalışma saatleri", address: "Adres", phone: "Telefon", kcal: "kcal", approx: "yaklaşık", calNote: "Kalori değerleri yaklaşıktır.", allergens: "Alerjenler", noAllergen: "Bildirilen alerjen yok", close: "Kapat", empty: "Sonuç bulunamadı", items: "ürün", marketPrice: "Günün fiyatı", perPerson: "Kişi başı", reviews: "yorum", allergenNote: "Alerjiniz varsa lütfen servis ekibimize bildirin.", backToMenu: "Menüye dön", tapForDetail: "Detay için dokunun", langLabel: "Dil" },
  en: { menu: "Menu", search: "Search the menu", searchShort: "Search", all: "All", info: "Contact", call: "Call", directions: "Directions", maps: "Open in Maps", whatsapp: "WhatsApp", reserve: "Reserve", hours: "Opening hours", address: "Address", phone: "Phone", kcal: "kcal", approx: "approx.", calNote: "Calorie values are approximate.", allergens: "Allergens", noAllergen: "No declared allergens", close: "Close", empty: "No results", items: "items", marketPrice: "Market price", perPerson: "Per person", reviews: "reviews", allergenNote: "Please tell our team about any allergy.", backToMenu: "Back to menu", tapForDetail: "Tap for details", langLabel: "Language" },
  ar: { menu: "القائمة", search: "ابحث في القائمة", searchShort: "بحث", all: "الكل", info: "اتصال", call: "اتصل", directions: "الاتجاهات", maps: "افتح في الخرائط", whatsapp: "واتساب", reserve: "حجز", hours: "ساعات العمل", address: "العنوان", phone: "الهاتف", kcal: "سعرة", approx: "تقريباً", calNote: "قيم السعرات تقريبية.", allergens: "مسببات الحساسية", noAllergen: "لا توجد مسببات حساسية معلنة", close: "إغلاق", empty: "لا نتائج", items: "صنف", marketPrice: "سعر اليوم", perPerson: "للشخص", reviews: "تقييم", allergenNote: "يرجى إخبار فريقنا بأي حساسية.", backToMenu: "العودة للقائمة", tapForDetail: "اضغط للتفاصيل", langLabel: "اللغة" },
  ru: { menu: "Меню", search: "Поиск по меню", searchShort: "Поиск", all: "Все", info: "Контакты", call: "Позвонить", directions: "Маршрут", maps: "Открыть на карте", whatsapp: "WhatsApp", reserve: "Бронь", hours: "Часы работы", address: "Адрес", phone: "Телефон", kcal: "ккал", approx: "прибл.", calNote: "Калорийность указана приблизительно.", allergens: "Аллергены", noAllergen: "Аллергены не заявлены", close: "Закрыть", empty: "Ничего не найдено", items: "блюд", marketPrice: "Цена дня", perPerson: "На человека", reviews: "отзывов", allergenNote: "Сообщите официанту об аллергии.", backToMenu: "Назад в меню", tapForDetail: "Нажмите для деталей", langLabel: "Язык" }
};

window.TAGS = {
  spicy:  { tr: "Acılı", en: "Spicy", ar: "حار", ru: "Острое" },
  veg:    { tr: "Vejetaryen", en: "Vegetarian", ar: "نباتي", ru: "Вегетарианское" },
  vegan:  { tr: "Vegan", en: "Vegan", ar: "نباتي صرف", ru: "Веган" },
  chef:   { tr: "Şefin seçimi", en: "Chef's choice", ar: "اختيار الشيف", ru: "Выбор шефа" },
  two:    { tr: "2 kişilik", en: "Serves 2", ar: "لشخصين", ru: "На двоих" },
  alcohol:{ tr: "Alkollü", en: "Contains alcohol", ar: "يحتوي كحول", ru: "Алкоголь" }
};

window.ALLERGENS = {
  gluten:   { tr: "Gluten", en: "Gluten", ar: "غلوتين", ru: "Глютен" },
  dairy:    { tr: "Süt ürünü", en: "Dairy", ar: "ألبان", ru: "Молочное" },
  egg:      { tr: "Yumurta", en: "Egg", ar: "بيض", ru: "Яйцо" },
  nuts:     { tr: "Sert kabuklu", en: "Tree nuts", ar: "مكسرات", ru: "Орехи" },
  fish:     { tr: "Balık", en: "Fish", ar: "سمك", ru: "Рыба" },
  shellfish:{ tr: "Kabuklu deniz", en: "Shellfish", ar: "قشريات", ru: "Моллюски" },
  sesame:   { tr: "Susam", en: "Sesame", ar: "سمسم", ru: "Кунжут" }
};

/* i = isim, d = açıklama, p = fiyat (TL), k = yaklaşık kalori, t = etiketler, a = alerjenler */
window.MENU = [
{ id: "breakfast", icon: "sun",
  n: { tr: "Kahvaltı", en: "Breakfast", ar: "الفطور", ru: "Завтрак" },
  items: [
    { i: { tr: "Geleneksel Türk Kahvaltısı", en: "Traditional Turkish Breakfast", ar: "الفطور التركي التقليدي", ru: "Традиционный турецкий завтрак" },
      d: { tr: "Bal, tereyağı, reçel, üç çeşit peynir, jambon, domates, salatalık, zeytin, yumurta", en: "Honey, butter, jam, three cheeses, jambon, tomato, cucumber, olives, egg", ar: "عسل، زبدة، مربى، ثلاثة أنواع جبن، لحم، طماطم، خيار، زيتون، بيض", ru: "Мёд, масло, джем, три вида сыра, ветчина, помидор, огурец, оливки, яйцо" },
      p: 1380, k: 1150, t: ["two"], a: ["gluten","dairy","egg"] },
    { i: { tr: "Menemen", en: "Menemen", ar: "منمن", ru: "Менемен" },
      d: { tr: "Domates, biber ve yumurta", en: "Tomatoes, peppers and eggs", ar: "طماطم وفلفل وبيض", ru: "Помидоры, перец и яйца" },
      p: 410, k: 380, t: ["veg"], a: ["egg"] },
    { i: { tr: "Mantarlı Omlet", en: "Mushroom Omelette", ar: "أومليت بالفطر", ru: "Омлет с грибами" }, p: 395, k: 360, t: ["veg"], a: ["egg","dairy"] },
    { i: { tr: "Peynirli Omlet", en: "Cheese Omelette", ar: "أومليت بالجبن", ru: "Омлет с сыром" }, p: 395, k: 420, t: ["veg"], a: ["egg","dairy"] },
    { i: { tr: "Sade Omlet", en: "Plain Omelette", ar: "أومليت سادة", ru: "Омлет классический" }, p: 370, k: 300, t: ["veg"], a: ["egg"] }
  ]},

{ id: "salads", icon: "leaf",
  n: { tr: "Salatalar", en: "Salads", ar: "السلطات", ru: "Салаты" },
  items: [
    { i: { tr: "Çoban Salata", en: "Shepherd's Salad", ar: "سلطة الراعي", ru: "Салат «Чобан»" },
      d: { tr: "Domates, salatalık, maydanoz ve soğan", en: "Tomato, cucumber, parsley and onion", ar: "طماطم، خيار، بقدونس وبصل", ru: "Помидор, огурец, петрушка и лук" },
      p: 385, k: 180, t: ["vegan"], a: [] },
    { i: { tr: "Mevsim Salata", en: "Seasonal Salad", ar: "سلطة الموسم", ru: "Сезонный салат" },
      d: { tr: "Marul, havuç, Akdeniz yeşillikleri, domates, salatalık ve mısır", en: "Lettuce, carrot, mediterranean greens, tomato, cucumber and corn", ar: "خس، جزر، خضار متوسطية، طماطم، خيار وذرة", ru: "Салат, морковь, зелень, помидор, огурец и кукуруза" },
      p: 385, k: 210, t: ["vegan"], a: [] },
    { i: { tr: "Ton Balıklı Salata", en: "Tuna Salad", ar: "سلطة التونة", ru: "Салат с тунцом" },
      d: { tr: "Marul, domates, salatalık, soğan ve ton balığı", en: "Lettuce, tomato, cucumber, onion and tuna", ar: "خس، طماطم، خيار، بصل وتونة", ru: "Салат, помидор, огурец, лук и тунец" },
      p: 615, k: 390, t: [], a: ["fish"] },
    { i: { tr: "Tavuklu Salata", en: "Chicken Salad", ar: "سلطة الدجاج", ru: "Салат с курицей" },
      d: { tr: "Marul, domates, salatalık, ızgara tavuk ve hardal sos", en: "Lettuce, tomato, cucumber, grilled chicken and mustard sauce", ar: "خس، طماطم، خيار، دجاج مشوي وصلصة الخردل", ru: "Салат, помидор, огурец, курица гриль и горчичный соус" },
      p: 610, k: 450, t: [], a: ["egg"] },
    { i: { tr: "Deniz Mahsülleri Salata", en: "Mixed Seafood Salad", ar: "سلطة المأكولات البحرية", ru: "Салат с морепродуктами" },
      d: { tr: "Marul, domates, salatalık ve karışık deniz mahsulleri", en: "Lettuce, tomato, cucumber and mixed seafood", ar: "خس، طماطم، خيار ومأكولات بحرية مشكلة", ru: "Салат, помидор, огурец и морепродукты" },
      p: 785, k: 420, t: [], a: ["fish","shellfish"] }
  ]},

{ id: "kebab", icon: "flame",
  n: { tr: "Kebap ve Izgaralar", en: "Kebab & Grills", ar: "الكباب والمشاوي", ru: "Кебаб и гриль" },
  items: [
    { i: { tr: "Acılı Adana Kebap", en: "Hot Pepper Adana Kebab", ar: "كباب أضنة الحار", ru: "Острый Адана кебаб" },
      d: { tr: "Közlenmiş domates, biber, sumaklı soğan ve bulgur pilavı ile", en: "With grilled tomato, pepper, sumac onion and bulgur pilaf", ar: "مع طماطم وفلفل مشوي وبصل بالسماق وبرغل", ru: "С томатом, перцем гриль, луком с сумахом и булгуром" },
      p: 850, k: 780, t: ["spicy","chef"], a: ["gluten"] },
    { i: { tr: "Acısız Urfa Kebap", en: "Mild Urfa Kebab", ar: "كباب أورفة غير الحار", ru: "Урфа кебаб (неострый)" },
      d: { tr: "Közlenmiş domates, biber, sumaklı soğan ve bulgur pilavı ile", en: "With grilled tomato, pepper, sumac onion and bulgur pilaf", ar: "مع طماطم وفلفل مشوي وبصل بالسماق وبرغل", ru: "С томатом, перцем гриль, луком с сумахом и булгуром" },
      p: 850, k: 760, t: [], a: ["gluten"] },
    { i: { tr: "Izgara Köfte", en: "Grilled Meatballs", ar: "كفتة مشوية", ru: "Котлеты на гриле" },
      d: { tr: "Közlenmiş domates, biber, sumaklı soğan ve bulgur pilavı ile", en: "With grilled tomato, pepper, sumac onion and bulgur pilaf", ar: "مع طماطم وفلفل مشوي وبصل بالسماق وبرغل", ru: "С томатом, перцем гриль, луком с сумахом и булгуром" },
      p: 855, k: 720, t: [], a: ["gluten","egg"] },
    { i: { tr: "İskender Kebap", en: "İskender Kebab", ar: "إسكندر كباب", ru: "Искендер кебаб" },
      d: { tr: "Pide üzerinde döner, domates sos, tereyağı ve yoğurt", en: "Doner over pita bread with tomato sauce, butter and yoghurt", ar: "دونر على الخبز مع صلصة الطماطم والزبدة واللبن", ru: "Донер на пите с томатным соусом, маслом и йогуртом" },
      p: 915, k: 950, t: ["chef"], a: ["gluten","dairy"] },
    { i: { tr: "Fıstıklı Kebap", en: "Pistachio Kebab", ar: "كباب بالفستق", ru: "Кебаб с фисташками" },
      d: { tr: "Közlenmiş domates, biber, sumaklı soğan ve bulgur pilavı ile", en: "With grilled tomato, pepper, sumac onion and bulgur pilaf", ar: "مع طماطم وفلفل مشوي وبصل بالسماق وبرغل", ru: "С томатом, перцем гриль, луком с сумахом и булгуром" },
      p: 950, k: 890, t: [], a: ["gluten","nuts"] },
    { i: { tr: "Tavuk Kanat", en: "Chicken Wings", ar: "أجنحة الدجاج", ru: "Куриные крылья" },
      d: { tr: "Közlenmiş domates, biber, sumaklı soğan ve bulgur pilavı ile", en: "With grilled tomato, pepper, sumac onion and bulgur pilaf", ar: "مع طماطم وفلفل مشوي وبصل بالسماق وبرغل", ru: "С томатом, перцем гриль, луком с сумахом и булгуром" },
      p: 550, k: 640, t: [], a: ["gluten"] },
    { i: { tr: "Kuzu Şiş Kebap", en: "Lamb Shish Kebab", ar: "شيش كباب لحم الغنم", ru: "Шиш-кебаб из ягнёнка" }, p: 1200, k: 820, t: [], a: ["gluten"] },
    { i: { tr: "Tavuk Şiş Kebap", en: "Chicken Shish Kebab", ar: "شيش كباب دجاج", ru: "Куриный шиш-кебаб" }, p: 700, k: 610, t: [], a: ["gluten"] },
    { i: { tr: "Dana Şiş Kebap", en: "Beef Shish Kebab", ar: "شيش كباب لحم البقر", ru: "Шиш-кебаб из говядины" }, p: 1100, k: 780, t: [], a: ["gluten"] },
    { i: { tr: "Kuzu Pirzola", en: "Lamb Chops", ar: "ريش الغنم", ru: "Бараньи отбивные" }, p: 1800, k: 900, t: ["chef"], a: ["gluten"] },
    { i: { tr: "Kuzu Kaburga", en: "Lamb Ribs", ar: "ضلوع الغنم", ru: "Бараньи рёбра" }, p: 1800, k: 980, t: [], a: ["gluten"] },
    { i: { tr: "Ali Nazik", en: "Ali Nazik", ar: "علي نازك", ru: "Али Назик" },
      d: { tr: "Közlenmiş patlıcan püresi, yoğurt, sarımsak ve dana parçaları", en: "Roasted eggplant purée, yoghurt, garlic and beef pieces", ar: "هريس الباذنجان المشوي مع اللبن والثوم وقطع اللحم", ru: "Пюре из печёного баклажана, йогурт, чеснок и говядина" },
      p: 1215, k: 810, t: ["chef"], a: ["dairy"] },
    { i: { tr: "Beyti Kebap", en: "Beyti Kebab", ar: "بيتي كباب", ru: "Бейти кебаб" },
      d: { tr: "Lavaşa sarılmış kebap, domates sos, kaşar ve yoğurt", en: "Kebab wrapped in lavash with tomato sauce, cheese and yoghurt", ar: "كباب ملفوف بخبز اللافاش مع صلصة الطماطم والجبن واللبن", ru: "Кебаб в лаваше с томатным соусом, сыром и йогуртом" },
      p: 950, k: 930, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Patlıcan Kebap", en: "Eggplant Kebab", ar: "كباب الباذنجان", ru: "Кебаб с баклажаном" }, p: 950, k: 760, t: [], a: ["gluten"] },
    { i: { tr: "Karışık Kebap (2 Kişilik)", en: "Mixed Kebab (for 2)", ar: "كباب مشكل (لشخصين)", ru: "Ассорти кебаб (на двоих)" },
      d: { tr: "Acılı ve acısız Adana, tavuk şiş, tavuk kanat, kuzu şiş, patlıcan kebap, közlenmiş domates ve biber, sumaklı soğan, bulgur pilavı", en: "Hot and mild Adana, chicken shish, chicken wings, lamb shish, eggplant kebab, grilled tomato and pepper, sumac onion, bulgur pilaf", ar: "أضنة حار وغير حار، شيش دجاج، أجنحة، شيش غنم، كباب باذنجان، خضار مشوية، بصل بالسماق وبرغل", ru: "Адана острый и мягкий, куриный шиш, крылья, шиш из ягнёнка, кебаб с баклажаном, овощи гриль, лук с сумахом, булгур" },
      p: 3900, k: 2400, t: ["two","chef"], a: ["gluten"] }
  ]},

{ id: "ottoman", icon: "crown",
  n: { tr: "Osmanlı Mutfağı", en: "Ottoman Kitchen", ar: "المطبخ العثماني", ru: "Османская кухня" },
  items: [
    { i: { tr: "Hünkar Beğendi", en: "Hünkar Beğendi", ar: "حنكار بيندي", ru: "Хюнкар бегенди" },
      d: { tr: "Közlenmiş patlıcan püresi üzerinde dana güveç", en: "Beef stew over roasted eggplant purée", ar: "يخنة اللحم فوق هريس الباذنجان المشوي", ru: "Говядина на пюре из печёного баклажана" },
      p: 1100, k: 840, t: ["chef"], a: ["dairy","gluten"] },
    { i: { tr: "Sac Tava (Dana)", en: "Wok Steel Beef (Anatolian Kebab)", ar: "ساج تاوا باللحم", ru: "Сач-тава с говядиной" },
      d: { tr: "Domates, biber, soğan, dana parçaları ve pilav", en: "Tomatoes, peppers, onions, beef pieces and rice", ar: "طماطم، فلفل، بصل، قطع لحم وأرز", ru: "Помидоры, перец, лук, говядина и рис" },
      p: 1115, k: 880, t: [], a: [] },
    { i: { tr: "Kuzu İncik", en: "Lamb Shank", ar: "موزة الغنم", ru: "Голяшка ягнёнка" },
      d: { tr: "Patates püresi ve mevsim sebzeleri ile", en: "With mashed potatoes and seasonal vegetables", ar: "مع البطاطس المهروسة والخضار", ru: "С картофельным пюре и овощами" },
      p: 1590, k: 950, t: ["chef"], a: ["dairy"] },
    { i: { tr: "Musakka", en: "Moussaka", ar: "مسقعة", ru: "Мусака" },
      d: { tr: "Patlıcan, domates sos ve kıyma", en: "Eggplant, tomato sauce and minced meat", ar: "باذنجان وصلصة طماطم ولحم مفروم", ru: "Баклажан, томатный соус и фарш" },
      p: 905, k: 700, t: [], a: ["dairy"] },
    { i: { tr: "Kuzu Testi (2 Kişilik)", en: "Lamb Clay Pot (for 2)", ar: "طاجن الغنم (لشخصين)", ru: "Ягнёнок в горшочке (на двоих)" }, p: 2300, k: 1600, t: ["two","chef"], a: [] },
    { i: { tr: "Dana Testi (2 Kişilik)", en: "Veal Clay Pot (for 2)", ar: "طاجن لحم العجل (لشخصين)", ru: "Телятина в горшочке (на двоих)" }, p: 2300, k: 1580, t: ["two"], a: [] }
  ]},

{ id: "casserole", icon: "pot",
  n: { tr: "Tavuk ve Güveçler", en: "Chicken & Casseroles", ar: "الدجاج والطواجن", ru: "Курица и рагу" },
  items: [
    { i: { tr: "Tavuk Güveç", en: "Chicken Casserole", ar: "طاجن الدجاج", ru: "Рагу с курицей" },
      d: { tr: "Domates, biber, baharat ve tavuk parçaları", en: "Tomatoes, peppers, spices and chicken pieces", ar: "طماطم، فلفل، بهارات وقطع دجاج", ru: "Помидоры, перец, специи и курица" },
      p: 720, k: 620, t: [], a: ["dairy"] },
    { i: { tr: "Körili Tavuk", en: "Curry Chicken", ar: "دجاج بالكاري", ru: "Курица карри" },
      d: { tr: "Tavuk, krema, köri sos, pirinç ve sebzeler", en: "Chicken, cream, curry sauce, rice and vegetables", ar: "دجاج، كريمة، صلصة كاري، أرز وخضار", ru: "Курица, сливки, соус карри, рис и овощи" },
      p: 745, k: 730, t: [], a: ["dairy"] },
    { i: { tr: "Şef Usulü Tavuk Izgara", en: "Chef Style Grilled Chicken", ar: "دجاج مشوي على طريقة الشيف", ru: "Курица гриль по-шефски" },
      d: { tr: "Izgara tavuk göğsü, sebzeler ve özel sos", en: "Grilled chicken breast with vegetables and special sauce", ar: "صدر دجاج مشوي مع الخضار وصلصة خاصة", ru: "Куриная грудка гриль с овощами и фирменным соусом" },
      p: 805, k: 590, t: [], a: ["dairy"] },
    { i: { tr: "Tavuk Testi (2 Kişilik)", en: "Chicken Clay Pot (for 2)", ar: "طاجن الدجاج (لشخصين)", ru: "Курица в горшочке (на двоих)" }, p: 1990, k: 1400, t: ["two"], a: [] },
    { i: { tr: "Dana Güveç", en: "Beef Casserole", ar: "طاجن لحم البقر", ru: "Рагу с говядиной" },
      d: { tr: "Domates, biber, baharat ve dana parçaları", en: "Tomatoes, peppers, spices and beef pieces", ar: "طماطم، فلفل، بهارات وقطع لحم", ru: "Помидоры, перец, специи и говядина" },
      p: 930, k: 760, t: [], a: ["dairy"] },
    { i: { tr: "Kuzu Güveç", en: "Lamb Casserole", ar: "طاجن لحم الغنم", ru: "Рагу с ягнёнком" },
      d: { tr: "Domates, biber, baharat ve kuzu parçaları", en: "Tomatoes, peppers, spices and lamb pieces", ar: "طماطم، فلفل، بهارات وقطع غنم", ru: "Помидоры, перец, специи и ягнёнок" },
      p: 1100, k: 820, t: [], a: ["dairy"] }
  ]},

{ id: "steaks", icon: "steak",
  n: { tr: "Izgara Biftekler", en: "Grill Steaks", ar: "ستيك مشوي", ru: "Стейки" },
  items: [
    { i: { tr: "Biberli Biftek", en: "Pepper Steak", ar: "ستيك بالفلفل", ru: "Стейк с перцем" }, p: 2000, k: 880, t: [], a: ["dairy"] },
    { i: { tr: "Mantarlı Biftek", en: "Steak with Mushrooms", ar: "ستيك بالفطر", ru: "Стейк с грибами" }, p: 2000, k: 900, t: [], a: ["dairy"] },
    { i: { tr: "T-Bone", en: "T-Bone", ar: "تي بون", ru: "Ти-бон" }, p: 2200, k: 1100, t: [], a: [] },
    { i: { tr: "Şatobiryan (2 Kişilik)", en: "Chateaubriand (for 2)", ar: "شاتوبريان (لشخصين)", ru: "Шатобриан (на двоих)" }, p: 5400, k: 1900, t: ["two","chef"], a: ["dairy"] }
  ]},

{ id: "seafood", icon: "fish",
  n: { tr: "Deniz Mahsülleri", en: "Seafood", ar: "المأكولات البحرية", ru: "Морепродукты" },
  items: [
    { i: { tr: "Levrek Izgara", en: "Grilled Sea Bass", ar: "قاروص مشوي", ru: "Сибас на гриле" },
      d: { tr: "Yeşillik ve patates püresi ile", en: "With greens and mashed potatoes", ar: "مع الخضار والبطاطس المهروسة", ru: "С зеленью и картофельным пюре" },
      p: 970, k: 520, t: [], a: ["fish","dairy"] },
    { i: { tr: "Çupra Izgara", en: "Grilled Sea Bream", ar: "دنيس مشوي", ru: "Дорада на гриле" },
      d: { tr: "Yeşillik ve patates püresi ile", en: "With greens and mashed potatoes", ar: "مع الخضار والبطاطس المهروسة", ru: "С зеленью и картофельным пюре" },
      p: 970, k: 540, t: [], a: ["fish","dairy"] },
    { i: { tr: "Deniz Mahsülleri Güveç", en: "Seafood Casserole", ar: "طاجن المأكولات البحرية", ru: "Рагу из морепродуктов" },
      d: { tr: "Karides, ahtapot, kalamar, domates sos ve kaşar", en: "Shrimp, octopus, calamari, tomato sauce and cheese", ar: "روبيان، أخطبوط، كاليماري، صلصة طماطم وجبن", ru: "Креветки, осьминог, кальмар, томатный соус и сыр" },
      p: 1100, k: 680, t: [], a: ["fish","shellfish","dairy"] },
    { i: { tr: "Ahtapot Izgara", en: "Grilled Octopus", ar: "أخطبوط مشوي", ru: "Осьминог на гриле" }, p: 1550, k: 460, t: ["chef"], a: ["shellfish","dairy"] },
    { i: { tr: "Somon Izgara", en: "Grilled Salmon", ar: "سلمون مشوي", ru: "Лосось на гриле" }, p: 1500, k: 620, t: [], a: ["fish","dairy"] },
    { i: { tr: "Jumbo Karides", en: "Jumbo Shrimp", ar: "روبيان جامبو", ru: "Королевские креветки" }, p: 1600, k: 480, t: [], a: ["shellfish","dairy"] },
    { i: { tr: "Tuzda Levrek (1–1,5 kg, 2 Kişilik)", en: "Sea Bass in Salt (1–1.5 kg, for 2)", ar: "قاروص بالملح (لشخصين)", ru: "Сибас в соли (на двоих)" }, p: null, k: 1000, t: ["two","chef"], a: ["fish"] },
    { i: { tr: "Karışık Balık Tabağı (2 Kişilik)", en: "Mixed Fish Plate (for 2)", ar: "طبق سمك مشكل (لشخصين)", ru: "Рыбное ассорти (на двоих)" }, p: 5400, k: 1800, t: ["two"], a: ["fish","shellfish"] }
  ]},

{ id: "pide", icon: "pide",
  n: { tr: "Pide ve Pizza", en: "Turkish Pita & Pizza", ar: "الفطير والبيتزا", ru: "Пиде и пицца" },
  items: [
    { i: { tr: "Lahmacun", en: "Lahmacun", ar: "لحم بعجين", ru: "Лахмаджун" },
      d: { tr: "Domates, soğan, maydanoz, kıyma ve limon", en: "Tomato, onion, parsley, minced meat and lemon", ar: "طماطم، بصل، بقدونس، لحم مفروم وليمون", ru: "Помидор, лук, петрушка, фарш и лимон" },
      p: 550, k: 420, t: [], a: ["gluten"] },
    { i: { tr: "Peynirli Pide", en: "Cheese Pide", ar: "فطير بالجبن", ru: "Пиде с сыром" }, p: 600, k: 680, t: ["veg"], a: ["gluten","dairy"] },
    { i: { tr: "Kıymalı Pide", en: "Minced Meat Pide", ar: "فطير باللحم المفروم", ru: "Пиде с фаршем" }, p: 650, k: 720, t: [], a: ["gluten"] },
    { i: { tr: "Sucuklu ve Peynirli Pide", en: "Sausage & Cheese Pide", ar: "فطير بالسجق والجبن", ru: "Пиде с колбасой и сыром" }, p: 605, k: 790, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Sebzeli Pide", en: "Vegetable Pide", ar: "فطير بالخضار", ru: "Пиде с овощами" }, p: 620, k: 610, t: ["veg"], a: ["gluten","dairy"] },
    { i: { tr: "Karışık Pide", en: "Mixed Pide", ar: "فطير مشكل", ru: "Пиде ассорти" }, p: 650, k: 760, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Kaşarlı Pizza", en: "Cheese Pizza", ar: "بيتزا بالجبن", ru: "Пицца с сыром" }, p: 650, k: 820, t: ["veg"], a: ["gluten","dairy"] },
    { i: { tr: "Sebzeli Pizza", en: "Vegetarian Pizza", ar: "بيتزا نباتية", ru: "Вегетарианская пицца" },
      d: { tr: "Mantar, domates, kırmızı ve yeşil biber, peynir, özel sos", en: "Mushroom, tomato, red and green pepper, cheese, house sauce", ar: "فطر، طماطم، فلفل أحمر وأخضر، جبن وصلصة", ru: "Грибы, помидор, красный и зелёный перец, сыр, фирменный соус" },
      p: 650, k: 780, t: ["veg"], a: ["gluten","dairy"] },
    { i: { tr: "Tavuklu Pizza", en: "Chicken Pizza", ar: "بيتزا بالدجاج", ru: "Пицца с курицей" },
      d: { tr: "Tavuk, mantar, kırmızı ve yeşil biber, peynir, özel sos", en: "Chicken, mushroom, red and green pepper, cheese, house sauce", ar: "دجاج، فطر، فلفل أحمر وأخضر، جبن وصلصة", ru: "Курица, грибы, перец, сыр, фирменный соус" },
      p: 710, k: 860, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Karışık Pizza", en: "Mixed Pizza", ar: "بيتزا مشكلة", ru: "Пицца ассорти" },
      d: { tr: "Sucuk, peynir, yeşil ve kırmızı biber, domates, zeytin, yumurta", en: "Sausage, cheese, green and red pepper, tomato, olive, egg", ar: "سجق، جبن، فلفل، طماطم، زيتون وبيض", ru: "Колбаса, сыр, перец, помидор, оливки, яйцо" },
      p: 750, k: 920, t: [], a: ["gluten","dairy","egg"] }
  ]},

{ id: "wraps", icon: "wrap",
  n: { tr: "Dürümler", en: "Wraps", ar: "الشاورما واللفائف", ru: "Дюрюм" },
  items: [
    { i: { tr: "Dana Şavurma Dürüm", en: "Beef Shawarma Wrap", ar: "شاورما لحم", ru: "Дюрюм с говядиной" }, p: 550, k: 690, t: [], a: ["gluten"] },
    { i: { tr: "Tavuk Şavurma Dürüm", en: "Chicken Shawarma Wrap", ar: "شاورما دجاج", ru: "Дюрюм с курицей" }, p: 450, k: 620, t: [], a: ["gluten"] },
    { i: { tr: "Adana Kebap Dürüm", en: "Adana Kebab Wrap", ar: "لفائف كباب أضنة", ru: "Дюрюм Адана" }, p: 750, k: 740, t: ["spicy"], a: ["gluten"] },
    { i: { tr: "Tavuk Şiş Dürüm", en: "Chicken Shish Wrap", ar: "لفائف شيش الدجاج", ru: "Дюрюм с куриным шишем" }, p: 640, k: 640, t: [], a: ["gluten"] }
  ]},

{ id: "pasta", icon: "pasta",
  n: { tr: "Makarnalar", en: "Pastas", ar: "المعكرونة", ru: "Паста" },
  items: [
    { i: { tr: "Spagetti Napoliten", en: "Spaghetti Neapolitan", ar: "سباغيتي نابوليتان", ru: "Спагетти неаполитано" },
      d: { tr: "Domates sos ve peynir", en: "Tomato sauce and cheese", ar: "صلصة الطماطم والجبن", ru: "Томатный соус и сыр" },
      p: 490, k: 620, t: ["veg"], a: ["gluten","dairy"] },
    { i: { tr: "Spagetti Bolonez", en: "Spaghetti Bolognese", ar: "سباغيتي بولونيز", ru: "Спагетти болоньезе" },
      d: { tr: "Domates sos, kıyma ve peynir", en: "Tomato sauce, minced beef and cheese", ar: "صلصة طماطم، لحم مفروم وجبن", ru: "Томатный соус, фарш и сыр" },
      p: 560, k: 760, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Penne Alfredo", en: "Penne Alfredo", ar: "بيني ألفريدو", ru: "Пенне Альфредо" },
      d: { tr: "Tavuk, mantar, krema sos ve peynir", en: "Chicken, mushroom, cream sauce and cheese", ar: "دجاج، فطر، صلصة كريمة وجبن", ru: "Курица, грибы, сливочный соус и сыр" },
      p: 610, k: 880, t: [], a: ["gluten","dairy"] },
    { i: { tr: "Penne Arabiata", en: "Penne Arrabbiata", ar: "بيني أرابياتا", ru: "Пенне арраббьята" },
      d: { tr: "Acılı domates sos ve peynir", en: "Spicy tomato sauce and cheese", ar: "صلصة طماطم حارة وجبن", ru: "Острый томатный соус и сыр" },
      p: 490, k: 640, t: ["veg","spicy"], a: ["gluten","dairy"] },
    { i: { tr: "Fettuccine Deniz Mahsüllü", en: "Fettuccine with Seafood", ar: "فيتوتشيني بالمأكولات البحرية", ru: "Феттучини с морепродуктами" },
      d: { tr: "Deniz mahsulleri ve krema sos", en: "Seafood and cream sauce", ar: "مأكولات بحرية وصلصة كريمة", ru: "Морепродукты и сливочный соус" },
      p: 650, k: 790, t: [], a: ["gluten","dairy","fish","shellfish"] },
    { i: { tr: "Mantı", en: "Mantı (Turkish Ravioli)", ar: "مانتي", ru: "Манты по-турецки" },
      d: { tr: "Yoğurt ve domates sos ile", en: "With yoghurt and tomato sauce", ar: "مع اللبن وصلصة الطماطم", ru: "С йогуртом и томатным соусом" },
      p: 495, k: 700, t: ["chef"], a: ["gluten","dairy","egg"] }
  ]},

{ id: "desserts", icon: "dessert",
  n: { tr: "Tatlılar", en: "Desserts", ar: "الحلويات", ru: "Десерты" },
  items: [
    { i: { tr: "Baklava", en: "Baklava", ar: "بقلاوة", ru: "Пахлава" }, p: 450, k: 520, t: ["veg"], a: ["gluten","nuts","dairy"] },
    { i: { tr: "Künefe (Dondurmalı)", en: "Künefe with Ice Cream", ar: "كنافة مع البوظة", ru: "Кюнефе с мороженым" }, p: 550, k: 640, t: ["veg","chef"], a: ["gluten","dairy","nuts"] },
    { i: { tr: "Katmer (Dondurmalı)", en: "Katmer with Ice Cream", ar: "قطمر مع البوظة", ru: "Катмер с мороженым" }, p: 610, k: 700, t: ["veg"], a: ["gluten","dairy","nuts"] },
    { i: { tr: "Cevizli Kabak Tatlısı", en: "Pumpkin Dessert with Walnut", ar: "حلوى القرع بالجوز", ru: "Тыквенный десерт с орехом" }, p: 610, k: 450, t: ["veg"], a: ["nuts"] },
    { i: { tr: "Limonlu Cheesecake", en: "Lemon Cheesecake", ar: "تشيز كيك بالليمون", ru: "Лимонный чизкейк" }, p: 550, k: 480, t: ["veg"], a: ["gluten","dairy","egg"] }
  ]},

{ id: "hot", icon: "coffee",
  n: { tr: "Sıcak İçecekler", en: "Hot Drinks", ar: "المشروبات الساخنة", ru: "Горячие напитки" },
  items: [
    { i: { tr: "Çay", en: "Turkish Tea", ar: "شاي", ru: "Чай" }, p: 75, k: 2, t: ["vegan"], a: [] },
    { i: { tr: "Türk Kahvesi", en: "Turkish Coffee", ar: "قهوة تركية", ru: "Турецкий кофе" }, p: 180, k: 15, t: ["vegan"], a: [] },
    { i: { tr: "Americano", en: "Americano", ar: "أمريكانو", ru: "Американо" }, p: 180, k: 10, t: ["vegan"], a: [] },
    { i: { tr: "Espresso", en: "Espresso", ar: "إسبريسو", ru: "Эспрессо" }, p: 180, k: 5, t: ["vegan"], a: [] },
    { i: { tr: "Cappuccino", en: "Cappuccino", ar: "كابتشينو", ru: "Капучино" }, p: 180, k: 120, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Vanilyalı Cappuccino", en: "Vanilla Cappuccino", ar: "كابتشينو بالفانيلا", ru: "Капучино с ванилью" }, p: 180, k: 160, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Mocha Cappuccino", en: "Cappuccino Mocha", ar: "كابتشينو موكا", ru: "Капучино мокка" }, p: 180, k: 190, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Latte", en: "Latte", ar: "لاتيه", ru: "Латте" }, p: 180, k: 150, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Sıcak Çikolata", en: "Hot Chocolate", ar: "شوكولاتة ساخنة", ru: "Горячий шоколад" }, p: 180, k: 280, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Bitki Çayı (French Press)", en: "Herbal Tea (French Press)", ar: "شاي أعشاب", ru: "Травяной чай" }, p: 220, k: 5, t: ["vegan"], a: [] },
    { i: { tr: "Salep", en: "Salep", ar: "سحلب", ru: "Салеп" }, p: 250, k: 250, t: ["veg"], a: ["dairy"] }
  ]},

{ id: "soft", icon: "glass",
  n: { tr: "Soğuk İçecekler", en: "Soft Drinks", ar: "المشروبات الباردة", ru: "Прохладительные напитки" },
  items: [
    { i: { tr: "Coca-Cola", en: "Coca-Cola", ar: "كوكا كولا", ru: "Кока-кола" }, p: 190, k: 140, t: ["vegan"], a: [] },
    { i: { tr: "Fanta", en: "Fanta", ar: "فانتا", ru: "Фанта" }, p: 190, k: 150, t: ["vegan"], a: [] },
    { i: { tr: "Sprite", en: "Sprite", ar: "سبرايت", ru: "Спрайт" }, p: 190, k: 140, t: ["vegan"], a: [] },
    { i: { tr: "Ice Tea (Limon / Şeftali)", en: "Ice Tea (Lemon / Peach)", ar: "شاي مثلج (ليمون / خوخ)", ru: "Айс ти (лимон / персик)" }, p: 190, k: 120, t: ["vegan"], a: [] },
    { i: { tr: "Ayran", en: "Ayran", ar: "عيران", ru: "Айран" }, p: 190, k: 110, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Limonata", en: "Lemonade", ar: "ليموناضة", ru: "Лимонад" }, p: 240, k: 160, t: ["vegan"], a: [] },
    { i: { tr: "Sıkma Portakal Suyu", en: "Fresh Orange Juice", ar: "عصير برتقال طازج", ru: "Свежевыжатый апельсиновый сок" }, p: 300, k: 130, t: ["vegan","chef"], a: [] },
    { i: { tr: "Büyük Su", en: "Large Water", ar: "ماء كبير", ru: "Вода большая" }, p: 170, k: 0, t: ["vegan"], a: [] },
    { i: { tr: "Küçük Su", en: "Small Water", ar: "ماء صغير", ru: "Вода малая" }, p: 80, k: 0, t: ["vegan"], a: [] },
    { i: { tr: "Küçük Soda", en: "Small Soda", ar: "صودا صغيرة", ru: "Сода малая" }, p: 100, k: 0, t: ["vegan"], a: [] },
    { i: { tr: "Büyük Soda", en: "Large Soda", ar: "صودا كبيرة", ru: "Сода большая" }, p: 200, k: 0, t: ["vegan"], a: [] }
  ]},

{ id: "mocktails", icon: "mocktail",
  n: { tr: "Alkolsüz Kokteyller", en: "Non-Alcoholic Cocktails", ar: "كوكتيلات بدون كحول", ru: "Безалкогольные коктейли" },
  items: [
    { i: { tr: "Mojito", en: "Mojito", ar: "موهيتو", ru: "Мохито" },
      d: { tr: "Taze nane, misket limonu ve sprite", en: "Fresh mint, lime and sprite", ar: "نعناع طازج، ليمون وسبرايت", ru: "Свежая мята, лайм и спрайт" },
      p: 450, k: 180, t: ["vegan"], a: [] },
    { i: { tr: "Virgin Colada", en: "Virgin Colada", ar: "فيرجن كولادا", ru: "Вирджин колада" },
      d: { tr: "Ananas suyu, misket limonu, hindistan cevizi ve süt", en: "Pineapple juice, lime, coconut and milk", ar: "عصير أناناس، ليمون، جوز الهند وحليب", ru: "Ананасовый сок, лайм, кокос и молоко" },
      p: 500, k: 320, t: ["veg"], a: ["dairy"] },
    { i: { tr: "Mango Tango", en: "Mango Tango", ar: "مانجو تانغو", ru: "Манго танго" },
      d: { tr: "Mango suyu, ananas suyu ve soda", en: "Mango juice, pineapple juice and soda", ar: "عصير مانجو، عصير أناناس وصودا", ru: "Сок манго, ананасовый сок и сода" },
      p: 450, k: 210, t: ["vegan"], a: [] },
    { i: { tr: "Cinnamon", en: "Cinnamon", ar: "قرفة", ru: "Корица" },
      d: { tr: "Elma suyu, soda ve tarçın çubuğu", en: "Apple juice, soda and cinnamon stick", ar: "عصير تفاح، صودا وعود قرفة", ru: "Яблочный сок, сода и палочка корицы" },
      p: 450, k: 190, t: ["vegan"], a: [] }
  ]},

{ id: "cocktails", icon: "cocktail",
  n: { tr: "Kokteyller", en: "Cocktails", ar: "الكوكتيلات", ru: "Коктейли" },
  items: [
    { i: { tr: "Mojito", en: "Mojito", ar: "موهيتو", ru: "Мохито" },
      d: { tr: "Rom, taze limon, taze nane, şeker ve maden suyu", en: "Rum, fresh lemon, fresh mint, sugar and mineral water", ar: "روم، ليمون طازج، نعناع، سكر ومياه معدنية", ru: "Ром, лимон, мята, сахар и минеральная вода" },
      p: 750, k: 220, t: ["alcohol"], a: [] },
    { i: { tr: "Sex on the Beach", en: "Sex on the Beach", ar: "سكس أون ذا بيتش", ru: "Секс на пляже" },
      d: { tr: "Votka, şeftali likörü ve taze portakal suyu", en: "Vodka, peach liqueur and fresh orange juice", ar: "فودكا، مشروب الخوخ وعصير برتقال", ru: "Водка, персиковый ликёр и апельсиновый сок" },
      p: 850, k: 250, t: ["alcohol"], a: [] },
    { i: { tr: "Aperol Spritz", en: "Aperol Spritz", ar: "أبيرول سبريتز", ru: "Апероль шприц" },
      d: { tr: "Aperol, prosecco, soda ve taze portakal", en: "Aperol, prosecco, soda and fresh orange", ar: "أبيرول، بروسيكو، صودا وبرتقال", ru: "Апероль, просекко, сода и апельсин" },
      p: 900, k: 180, t: ["alcohol"], a: ["sesame"] },
    { i: { tr: "Long Island Ice Tea", en: "Long Island Ice Tea", ar: "لونغ آيلاند آيس تي", ru: "Лонг-Айленд айс ти" },
      d: { tr: "Rom, cin, votka, cointreau, limon suyu, ice tea, şeftali ve kola", en: "Rum, gin, vodka, cointreau, lemon juice, ice tea, peach and coke", ar: "روم، جن، فودكا، كوانترو، ليمون، شاي مثلج، خوخ وكولا", ru: "Ром, джин, водка, куантро, лимон, айс ти, персик и кола" },
      p: 1100, k: 420, t: ["alcohol"], a: [] },
    { i: { tr: "Osmanca (Şefin Özel Kokteyli)", en: "Osmanca (House Special)", ar: "عثمانجا (خاصة المطعم)", ru: "Османджа (фирменный)" }, p: 850, k: 260, t: ["alcohol","chef"], a: [] }
  ]},

{ id: "beer", icon: "beer",
  n: { tr: "Biralar", en: "Beers", ar: "البيرة", ru: "Пиво" },
  items: [
    { i: { tr: "Efes", en: "Efes", ar: "أفيس", ru: "Эфес" }, p: 400, k: 210, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Heineken", en: "Heineken", ar: "هاينكن", ru: "Хайнекен" }, p: 450, k: 200, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Corona", en: "Corona", ar: "كورونا", ru: "Корона" }, p: 450, k: 190, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Bomonti Filtresiz", en: "Bomonti Unfiltered", ar: "بومونتي غير مفلترة", ru: "Бомонти нефильтрованное" }, p: 380, k: 220, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Miller", en: "Miller", ar: "ميلر", ru: "Миллер" }, p: 450, k: 190, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Alkolsüz Bira", en: "Non-Alcoholic Beer", ar: "بيرة بدون كحول", ru: "Безалкогольное пиво" }, p: 400, k: 110, t: [], a: ["gluten"] }
  ]},

{ id: "spirits", icon: "bottle",
  n: { tr: "İthal Alkoller", en: "Spirits", ar: "المشروبات الروحية", ru: "Крепкий алкоголь" },
  items: [
    { i: { tr: "Rakı", en: "Rakı", ar: "راكي", ru: "Ракы" }, p: 450, k: 230, t: ["alcohol"], a: [] },
    { i: { tr: "Bira (33 cl)", en: "Beer (33 cl)", ar: "بيرة ٣٣ سل", ru: "Пиво (33 cl)" }, p: 290, k: 150, t: ["alcohol"], a: ["gluten"] },
    { i: { tr: "Votka", en: "Vodka", ar: "فودكا", ru: "Водка" }, p: 570, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Absolut", en: "Absolut", ar: "أبسولوت", ru: "Абсолют" }, p: 600, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Gin Gilbey's", en: "Gin Gilbey's", ar: "جن جيلبيز", ru: "Джин Gilbey's" }, p: 570, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Gordon's", en: "Gordon's", ar: "غوردونز", ru: "Гордонс" }, p: 600, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Jack Daniel's", en: "Jack Daniel's", ar: "جاك دانيلز", ru: "Джек Дэниелс" }, p: 750, k: 105, t: ["alcohol"], a: [] },
    { i: { tr: "Chivas Regal", en: "Chivas Regal", ar: "شيفاز ريغال", ru: "Чивас Ригал" }, p: 850, k: 105, t: ["alcohol"], a: [] },
    { i: { tr: "Tekila", en: "Tequila", ar: "تكيلا", ru: "Текила" }, p: 450, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Baileys", en: "Baileys", ar: "بيليز", ru: "Бейлиз" }, p: 800, k: 180, t: ["alcohol"], a: ["dairy"] },
    { i: { tr: "Bacardi", en: "Bacardi", ar: "باكاردي", ru: "Бакарди" }, p: 450, k: 100, t: ["alcohol"], a: [] },
    { i: { tr: "Malibu", en: "Malibu", ar: "ماليبو", ru: "Малибу" }, p: 830, k: 150, t: ["alcohol"], a: [] }
  ]}
];
